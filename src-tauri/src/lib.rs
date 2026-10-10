use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

const MAIN_LABEL: &str = "main";
const LAUNCHER_LABEL: &str = "launcher";

/// First key to try. `Alt+Space` is out: the Windows system menu owns it.
const PRIMARY_SHORTCUT: &str = "Ctrl+Space";
/// Tried when the OS or another app already owns [`PRIMARY_SHORTCUT`].
const FALLBACK_SHORTCUT: &str = "Alt+Shift+Space";

/// A `Focused(false)` that lands this soon after a show belongs to the show
/// itself (focus hand-off between the two windows), not to the user leaving.
const FOCUS_GRACE: Duration = Duration::from_millis(250);

/// When the launcher was last shown; see [`launcher_blur_is_stale`].
static LAST_SHOWN: Mutex<Option<Instant>> = Mutex::new(None);
/// Set while we are waiting for the launcher to report it has focus.
static PENDING_FOCUS: AtomicBool = AtomicBool::new(false);

fn webview_window(app: &tauri::AppHandle, label: &str) -> Option<tauri::WebviewWindow> {
    app.get_webview_window(label)
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(win) = webview_window(app, MAIN_LABEL) {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

/// Invoked by the launcher UI on Escape and after a command succeeds.
#[tauri::command]
fn hide_launcher(app: tauri::AppHandle) {
    if let Some(win) = webview_window(&app, LAUNCHER_LABEL) {
        let _ = win.hide();
    }
}

fn toggle_launcher(app: &tauri::AppHandle) {
    let Some(win) = webview_window(app, LAUNCHER_LABEL) else {
        eprintln!("launcher window is missing");
        return;
    };

    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
        return;
    }

    // Record the show before making the window visible so the window events it
    // generates can be told apart from a real blur.
    PENDING_FOCUS.store(true, Ordering::SeqCst);
    if let Ok(mut last) = LAST_SHOWN.lock() {
        *last = Some(Instant::now());
    }

    let _ = win.center();
    let _ = win.show();
    let _ = win.set_focus();
    // Lets the launcher clear and refocus its input on every open.
    let _ = win.emit("launcher-opened", ());
}

/// Decides whether a launcher blur is just noise from the show.
fn launcher_blur_is_stale() -> bool {
    if PENDING_FOCUS.load(Ordering::SeqCst) {
        return true;
    }
    let last = LAST_SHOWN.lock().ok().and_then(|guard| *guard);
    last.is_some_and(|shown| shown.elapsed() < FOCUS_GRACE)
}

/// Register the launcher shortcut, falling back to a second key when another
/// app already owns the first one.
fn register_shortcut(app: &tauri::AppHandle) {
    for key in [PRIMARY_SHORTCUT, FALLBACK_SHORTCUT] {
        match app.global_shortcut().register(key) {
            Ok(()) => {
                println!("launcher shortcut: {key}");
                return;
            }
            Err(err) => eprintln!("could not register {key}: {err}"),
        }
    }
    eprintln!("no launcher shortcut available, {PRIMARY_SHORTCUT} and {FALLBACK_SHORTCUT} are taken");
}

/// Closing the windows would take the process (and the shortcut) with it, so the
/// app lives in the tray and only the "Quit" item ends it.
fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;

    let mut builder = TrayIconBuilder::with_id("main")
        .tooltip("workspace")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show_main(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick {
                button: MouseButton::Left,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
    }

    // Dropping the handle is safe: the app's resource table keeps the icon alive.
    let _tray = builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "init",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            SqlBuilder::default()
                .add_migrations("sqlite:workspace.db", migrations)
                .build(),
        )
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_launcher(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![hide_launcher])
        .setup(|app| {
            register_shortcut(app.handle());
            setup_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // Hide instead of closing, for both windows: a closed last window
                // ends the process and takes the shortcut with it.
                api.prevent_close();
                let _ = window.hide();
            }
            tauri::WindowEvent::Focused(true) if window.label() == LAUNCHER_LABEL => {
                PENDING_FOCUS.store(false, Ordering::SeqCst);
            }
            tauri::WindowEvent::Focused(false) if window.label() == LAUNCHER_LABEL => {
                if !launcher_blur_is_stale() {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
