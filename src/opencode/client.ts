/**
 * The one place Keel builds an opencode client.
 *
 * The SDK is imported on demand: the launcher window has to open in well under
 * 100 ms, and the main window should not carry a bridge it may never use.
 */

import type { OpenCodeClient } from "@opencode/client";
import { invoke } from "@tauri-apps/api/core";

/** What Rust found when it went looking for opencode. */
export type Connection =
  | { status: "ready"; url: string; version: string; password: string }
  | { status: "missing" }
  | { status: "failed"; message: string };

export type Connected =
  | { ok: true; client: OpenCodeClient; version: string }
  | { ok: false; message: string };

/** The install command comes from the opencode v2 docs. */
export const MISSING_OPENCODE =
  "opencode is not installed. Install it with npm install -g @opencode/cli, then try again.";

/**
 * The service wants HTTP basic auth with the username `opencode`. `btoa` takes
 * latin-1, which covers the ASCII password the service generates.
 */
const basicAuth = (password: string) => `Basic ${btoa(`opencode:${password}`)}`;

let client: OpenCodeClient | null = null;
let version = "";
let connectedTo: string | null = null;

async function connect(serverUrl: string): Promise<Connected> {
  const connection = await invoke<Connection>("opencode_connect", {
    serverUrl: serverUrl || null,
  });
  if (connection.status === "missing") {
    return { ok: false, message: MISSING_OPENCODE };
  }
  if (connection.status === "failed") {
    return { ok: false, message: connection.message };
  }

  const { OpenCode } = await import("@opencode/client");
  return {
    ok: true,
    version: connection.version,
    client: OpenCode.make({
      baseUrl: connection.url,
      headers: connection.password
        ? { authorization: basicAuth(connection.password) }
        : undefined,
    }),
  };
}

/**
 * The opencode client for this window, connecting on first use. The address is
 * part of the cache because Settings can point Keel at another server.
 */
export async function opencode(serverUrl = ""): Promise<Connected> {
  if (client && connectedTo === serverUrl) return { ok: true, client, version };

  const result = await connect(serverUrl);
  if (result.ok) {
    client = result.client;
    version = result.version;
    connectedTo = serverUrl;
  }
  return result;
}

/** Drops the cached client, so the next call connects from scratch. */
export function forgetOpenCode(): void {
  client = null;
  version = "";
  connectedTo = null;
}
