import { describe, expect, it } from "vitest";
import {
  ackFrame,
  MAX_FILE_BYTES,
  PAIRING_CODE_ALPHABET,
  PROTOCOL_VERSION,
  pairingCodeResponse,
  pairRequest,
  pairResponse,
  relayFrame,
} from "./protocol";

const id = "3f0c5c0e-7f4f-4a3e-9b0e-5f4b2c1d0a9e";
const token = "A".repeat(43);
const file = { name: "notes.pdf", size: 2048, mime: "application/pdf" };

/** One valid frame of every type, so the union is exercised end to end. */
const frames: { type: string; [key: string]: unknown }[] = [
  {
    v: PROTOCOL_VERSION,
    id,
    type: "notify",
    title: "opencode finished",
    body: "Session one is done.",
    tag: "opencode",
  },
  { v: PROTOCOL_VERSION, id, type: "file.offer", fileId: id, ...file },
  {
    v: PROTOCOL_VERSION,
    id,
    type: "file.received",
    fileId: id,
    ...file,
    uploadedAt: 1_700_000_000_000,
  },
  {
    v: PROTOCOL_VERSION,
    id,
    type: "device.paired",
    deviceId: id,
    deviceName: "Pixel",
    pairedAt: 1_700_000_000_000,
  },
  { v: PROTOCOL_VERSION, id, type: "device.revoked", deviceId: id },
  { v: PROTOCOL_VERSION, id, type: "ack", ref: id, ok: true },
];

describe("relay frames", () => {
  it("accepts every type", () => {
    for (const frame of frames) {
      const parsed = relayFrame.safeParse(frame);
      expect(parsed.success, frame.type).toBe(true);
    }
  });

  it("refuses a frame from another version", () => {
    const result = relayFrame.safeParse({ ...frames[0], v: 2 });

    expect(result.success).toBe(false);
  });

  it("refuses a type it does not know", () => {
    const result = relayFrame.safeParse({
      v: PROTOCOL_VERSION,
      id,
      type: "delete.everything",
    });

    expect(result.success).toBe(false);
  });

  it("refuses fields it does not expect", () => {
    const result = relayFrame.safeParse({ ...frames[0], admin: true });

    expect(result.success).toBe(false);
  });

  it("holds a file to the size limit", () => {
    const atLimit = relayFrame.safeParse({
      ...frames[1],
      size: MAX_FILE_BYTES,
    });
    const overLimit = relayFrame.safeParse({
      ...frames[1],
      size: MAX_FILE_BYTES + 1,
    });

    expect(atLimit.success).toBe(true);
    expect(overLimit.success).toBe(false);
  });

  it("wants an ack to name the frame it answers", () => {
    const result = ackFrame.safeParse({
      v: PROTOCOL_VERSION,
      id,
      type: "ack",
      ok: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("pairing", () => {
  it("builds codes without lookalikes", () => {
    expect(PAIRING_CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("accepts a code and a name from the phone", () => {
    const result = pairRequest.safeParse({
      v: PROTOCOL_VERSION,
      code: "ABCDEFGH",
      deviceName: "Pixel",
    });

    expect(result.success).toBe(true);
  });

  it("refuses a code with a character people confuse", () => {
    for (const code of ["abcdefgh", "ABCDEFGI", "ABCDEFG0"]) {
      const result = pairRequest.safeParse({
        v: PROTOCOL_VERSION,
        code,
        deviceName: "Pixel",
      });
      expect(result.success, code).toBe(false);
    }
  });

  it("sends a full-length token to the phone", () => {
    const result = pairResponse.safeParse({
      v: PROTOCOL_VERSION,
      deviceId: id,
      deviceName: "Pixel",
      token,
      pcName: "Desktop",
    });
    const short = pairResponse.safeParse({
      v: PROTOCOL_VERSION,
      deviceId: id,
      deviceName: "Pixel",
      token: token.slice(1),
      pcName: "Desktop",
    });

    expect(result.success).toBe(true);
    expect(short.success).toBe(false);
  });

  it("describes the code the PC shows", () => {
    const result = pairingCodeResponse.safeParse({
      v: PROTOCOL_VERSION,
      code: "ABCDEFGH",
      expiresAt: 1_700_000_000_000,
    });

    expect(result.success).toBe(true);
  });
});
