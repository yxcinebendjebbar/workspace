import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/geist";
import "./index.css";
import App from "./App";
import { applyAppearance } from "./lib/appearance";

// The saved theme lives in SQLite, so paint the system one first: this is the
// default setting and it keeps a dark machine from flashing white.
applyAppearance("system", "indigo");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
