import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "../index.css";
import "./launcher.css";
import { Launcher } from "./Launcher";

// Second React root: the launcher window, separate from the main window's.
createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Launcher />
  </React.StrictMode>,
);
