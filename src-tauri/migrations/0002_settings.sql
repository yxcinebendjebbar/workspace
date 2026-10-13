-- App settings as a flat key/value store. Values are JSON so a setting can be a
-- string, a number, or a boolean without a column per key.
CREATE TABLE settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

-- Launcher shortcut, read by Rust at startup so the key works before any
-- webview has loaded.
INSERT INTO settings (key, value) VALUES ('launcherShortcut', '"Ctrl+Space"');
