//! Finding opencode and joining the server it runs.
//!
//! opencode v2 keeps one background service per user account and every local
//! client shares it, including the user's own terminal. Keel therefore never
//! starts a server of its own and never stops the shared one: it asks the CLI
//! whether the service is up, starts it when it is not, and then reads the
//! connection details the service registers for its clients.

use std::env;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};

/// Windows would flash a console window for every CLI call without this.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// How long to wait for a service the CLI was just asked to start.
const START_TIMEOUT: Duration = Duration::from_secs(10);
const POLL_INTERVAL: Duration = Duration::from_millis(250);

/// What the frontend needs in order to reach a service.
///
/// Deliberately not `Debug`: the password must never reach a log line.
#[derive(Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum Connection {
    /// A service is listening and these are the credentials it registered.
    Ready {
        url: String,
        version: String,
        password: String,
    },
    /// No opencode on `PATH`; the frontend says how to install it.
    Missing,
    /// opencode is installed but could not be reached or started.
    Failed { message: String },
}

/// How a package manager installs opencode on each platform, paired with the
/// interpreter a shim needs. Windows' `CreateProcess` does not apply `PATHEXT`,
/// so the names npm writes have to be spelled out or a plain `opencode` lookup
/// finds nothing.
#[cfg(windows)]
const LAYOUT: &[(&str, &[&str])] = &[
    ("opencode.exe", &[]),
    ("opencode.cmd", &["cmd", "/c"]),
    ("opencode.bat", &["cmd", "/c"]),
    (
        "opencode.ps1",
        &[
            "powershell",
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
        ],
    ),
];
#[cfg(not(windows))]
const LAYOUT: &[(&str, &[&str])] = &[("opencode", &[])];

struct Launcher {
    program: PathBuf,
    /// The interpreter and flags a shim needs; empty for the native binary.
    prefix: &'static [&'static str],
}

/// Walks `PATH` the way a shell would: directory order first, extension order
/// second, so Keel runs the same opencode the user's terminal does.
fn launcher_in(path: &OsStr) -> Option<Launcher> {
    for directory in env::split_paths(path) {
        for (name, prefix) in LAYOUT {
            let program = directory.join(name);
            if program.is_file() {
                return Some(Launcher { program, prefix });
            }
        }
    }
    None
}

impl Launcher {
    fn command(&self) -> Command {
        let mut command = match self.prefix.split_first() {
            Some((interpreter, flags)) => {
                let mut command = Command::new(interpreter);
                command.args(flags).arg(&self.program);
                command
            }
            None => Command::new(&self.program),
        };
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }
        command
    }

    /// Runs opencode with arguments Keel owns; nothing the user types reaches
    /// them, so there is nothing to escape.
    fn run(&self, args: &[&str]) -> Result<String, String> {
        let output = self
            .command()
            .args(args)
            .output()
            .map_err(|err| format!("could not run opencode: {err}"))?;
        if !output.status.success() {
            return Err(format!(
                "opencode {} failed: {}",
                args.join(" "),
                output.status
            ));
        }
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
}

/// The record the shared service writes for its clients.
#[derive(Deserialize)]
struct Registration {
    url: String,
    password: String,
}

fn registration(path: &Path) -> Option<Registration> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str(&raw).ok()
}

/// The webview's content policy only lets it reach this machine, so a server
/// elsewhere is refused here with a readable message instead of a silent
/// content-policy violation in the console.
fn is_loopback(url: &str) -> bool {
    let after_scheme = url.split_once("://").map_or(url, |(_, rest)| rest);
    let authority = after_scheme.split(['/', '?', '#']).next().unwrap_or("");
    let host = authority
        .rsplit_once('@')
        .map_or(authority, |(_, host)| host);
    let host = match host.strip_prefix('[') {
        Some(rest) => rest.split_once(']').map_or("", |(host, _)| host),
        None => host.split(':').next().unwrap_or(""),
    };
    matches!(host, "127.0.0.1" | "localhost" | "::1")
}

/// Joins a server the user pointed Keel at instead of the shared one.
fn connect_to(url: &str) -> Connection {
    if !is_loopback(url) {
        return Connection::Failed {
            message:
                "Keel can only reach an opencode server on this machine. Use a localhost address."
                    .into(),
        };
    }
    Connection::Ready {
        url: url.trim_end_matches('/').to_string(),
        version: String::new(),
        password: String::new(),
    }
}

/// Asks the CLI to start the shared service and waits for it to register.
fn start(launcher: &Launcher, registration: &Path, version: &str) -> Result<Connection, String> {
    launcher.run(&["service", "start"])?;
    for _ in 0..START_TIMEOUT.as_millis() / POLL_INTERVAL.as_millis() {
        if service_is_up(launcher) {
            return read(registration, version);
        }
        thread::sleep(POLL_INTERVAL);
    }
    Err(
        "The opencode service did not start. Run opencode service status in a terminal to see why."
            .into(),
    )
}

/// `service status` prints the service URL while it is up and nothing while it
/// is not, which is the health check opencode documents for its own daemon.
fn service_is_up(launcher: &Launcher) -> bool {
    launcher
        .run(&["service", "status"])
        .is_ok_and(|output| !output.is_empty())
}

fn read(registration_path: &Path, version: &str) -> Result<Connection, String> {
    let state = registration(registration_path).ok_or_else(|| {
        format!(
            "opencode is running but did not write {}. Check the service with opencode service status.",
            registration_path.display()
        )
    })?;
    Ok(Connection::Ready {
        url: state.url,
        version: version.to_string(),
        password: state.password,
    })
}

/// `opencode --version` answers with a banner around the number, for example
/// `opencode v2.0.29`; only the number is worth showing.
fn version_number(reported: &str) -> String {
    reported
        .split_whitespace()
        .next_back()
        .unwrap_or_default()
        .trim_start_matches('v')
        .to_string()
}

fn join(launcher: &Launcher) -> Result<Connection, String> {
    let version = version_number(&launcher.run(&["--version"])?);
    let state = launcher.run(&["debug", "paths", "state"])?;
    let registration_path = Path::new(&state).join("service.json");

    if service_is_up(launcher) {
        return read(&registration_path, &version);
    }
    start(launcher, &registration_path, &version)
}

/// Finds opencode, makes sure the shared service is running, and returns what
/// the frontend needs to talk to it.
pub fn connect(server_url: Option<String>) -> Connection {
    if let Some(url) = server_url.filter(|url| !url.trim().is_empty()) {
        return connect_to(url.trim());
    }

    let Some(launcher) = launcher_in(env::var_os("PATH").as_deref().unwrap_or(OsStr::new("")))
    else {
        return Connection::Missing;
    };
    join(&launcher).unwrap_or_else(|message| Connection::Failed { message })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;

    fn scratch(name: &str) -> PathBuf {
        let directory = env::temp_dir().join(format!("keel-opencode-{name}"));
        let _ = fs::remove_dir_all(&directory);
        fs::create_dir_all(&directory).expect("scratch directory");
        directory
    }

    fn touch(directory: &Path, name: &str) {
        File::create(directory.join(name)).expect("shim file");
    }

    #[test]
    fn launcher_prefers_the_native_binary_over_the_shims() {
        let directory = scratch("layout");
        touch(&directory, "opencode.cmd");
        touch(&directory, "opencode.exe");

        let launcher = launcher_in(directory.as_os_str()).expect("a launcher");

        assert_eq!(launcher.program, directory.join("opencode.exe"));
    }

    #[test]
    fn launcher_follows_path_order() {
        let first = scratch("order-first");
        let second = scratch("order-second");
        touch(&second, "opencode.exe");
        touch(&first, "opencode.exe");

        let path = env::join_paths([&first, &second]).expect("joined paths");
        let launcher = launcher_in(&path).expect("a launcher");

        assert_eq!(launcher.program, first.join("opencode.exe"));
    }

    #[test]
    fn launcher_ignores_unrelated_directories() {
        let directory = scratch("empty");

        assert!(launcher_in(directory.as_os_str()).is_none());
    }

    #[test]
    fn version_number_drops_the_banner() {
        assert_eq!(version_number("opencode v2.0.29"), "2.0.29");
        assert_eq!(version_number("opencode 1.19.3"), "1.19.3");
        assert_eq!(version_number(""), "");
    }

    #[test]
    fn loopback_covers_the_forms_a_local_server_takes() {
        for url in [
            "http://127.0.0.1:49374",
            "http://localhost:4096/",
            "http://[::1]:4096",
            "https://localhost",
        ] {
            assert!(is_loopback(url), "{url} should be local");
        }
    }

    #[test]
    fn loopback_rejects_servers_elsewhere() {
        for url in [
            "https://opencode.example.com",
            "http://192.168.1.10:4096",
            "http://127.0.0.1.example.com:4096",
            "http://user:secret@opencode.example.com",
        ] {
            assert!(!is_loopback(url), "{url} should not be local");
        }
    }
}
