import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "../index.css";
import "./launcher.css";
import { applyAppearance } from "../lib/appearance";
import { Launcher } from "./Launcher";

// The saved theme lives in SQLite, so paint the system one first: this is the
// default setting and it keeps a dark machine from flashing white.
applyAppearance("system", "indigo");

// Second React root: the launcher window, separate from the main window's.
createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Launcher />
  </React.StrictMode>,
);
