import { z } from "zod";

/**
 * The wire contract between Keel on the PC, the relay Worker and the phone.
 * Both ends refuse any other version, so a phone that is one release behind
 * fails with a sentence instead of half-working.
 */
export const PROTOCOL_VERSION = 1;

/** A code is scanned or typed, so its alphabet drops the lookalikes. */
export const PAIRING_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PAIRING_CODE_LENGTH = 8;

/** Long enough to walk to the phone and scan, short enough to guess-proof. */
export const PAIRING_CODE_TTL_MS = 5 * 60 * 1000;

/** Device tokens are 32 random bytes, base64url, stored hashed on the relay. */
export const DEVICE_TOKEN_BYTES = 32;

/** A file waits in R2 for a day, then expires on its own. */
export const FILE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const version = z.literal(PROTOCOL_VERSION);
const id = z.uuid();
const name = z.string().trim().min(1).max(120);
const pairingCode = z
  .string()
  .regex(
    new RegExp(`^[${PAIRING_CODE_ALPHABET}]{${PAIRING_CODE_LENGTH}}$`),
    "Not a pairing code",
  );
const deviceToken = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Not a device token");

/** Every frame carries the version and an id the other side can ack. */
const envelope = { v: version, id };

/** The PC reports a finished session; the relay pushes it to every phone. */
export const notifyFrame = z.strictObject({
  ...envelope,
  type: z.literal("notify"),
  title: z.string().trim().min(1).max(120),
  body: z.string().max(300),
  /** Collapses repeats of the same kind in the phone's tray. */
  tag: z.string().max(64).optional(),
});

/** The PC offers a file it has uploaded; the phone fetches it by id. */
export const fileOfferFrame = z.strictObject({
  ...envelope,
  type: z.literal("file.offer"),
  fileId: id,
  name,
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  mime: z.string().min(1).max(120),
});

/** The relay tells the PC that a phone uploaded a file for it. */
export const fileReceivedFrame = z.strictObject({
  ...envelope,
  type: z.literal("file.received"),
  fileId: id,
  name,
  size: z.number().int().positive().max(MAX_FILE_BYTES),
  mime: z.string().min(1).max(120),
  uploadedAt: z.number().int().nonnegative(),
});

/** A phone finished pairing, so the PC can refresh its device list. */
export const devicePairedFrame = z.strictObject({
  ...envelope,
  type: z.literal("device.paired"),
  deviceId: id,
  deviceName: name,
  pairedAt: z.number().int().nonnegative(),
});

/** A phone dropped itself, or its token expired, so the PC forgets it. */
export const deviceRevokedFrame = z.strictObject({
  ...envelope,
  type: z.literal("device.revoked"),
  deviceId: id,
});

/** An answer to any frame that asked for one. */
export const ackFrame = z.strictObject({
  ...envelope,
  type: z.literal("ack"),
  ref: z.string().min(1).max(64),
  ok: z.boolean(),
  /** Present only when ok is false. */
  error: z.string().max(200).optional(),
});

/** Everything that may cross the socket, in either direction. */
export const relayFrame = z.discriminatedUnion("type", [
  notifyFrame,
  fileOfferFrame,
  fileReceivedFrame,
  devicePairedFrame,
  deviceRevokedFrame,
  ackFrame,
]);

export type NotifyFrame = z.infer<typeof notifyFrame>;
export type FileOfferFrame = z.infer<typeof fileOfferFrame>;
export type FileReceivedFrame = z.infer<typeof fileReceivedFrame>;
export type DevicePairedFrame = z.infer<typeof devicePairedFrame>;
export type DeviceRevokedFrame = z.infer<typeof deviceRevokedFrame>;
export type AckFrame = z.infer<typeof ackFrame>;
export type RelayFrame = z.infer<typeof relayFrame>;

/** The phone posts the code it scanned and the name it wants to be known by. */
export const pairRequest = z.strictObject({
  v: version,
  code: pairingCode,
  deviceName: name,
});

/** The token is shown once; the phone keeps it, the relay keeps only its hash. */
export const pairResponse = z.strictObject({
  v: version,
  deviceId: id,
  deviceName: name,
  token: deviceToken,
  /** Which PC this phone now belongs to, for the phone's own header. */
  pcName: name,
});

/** What the PC shows as a QR code. */
export const pairingCodeResponse = z.strictObject({
  v: version,
  code: pairingCode,
  expiresAt: z.number().int().nonnegative(),
});

/** Every refused HTTP call answers with one plain sentence. */
export const relayError = z.strictObject({
  v: version,
  message: z.string().max(200),
});

export type PairRequest = z.infer<typeof pairRequest>;
export type PairResponse = z.infer<typeof pairResponse>;
export type PairingCodeResponse = z.infer<typeof pairingCodeResponse>;
export type RelayError = z.infer<typeof relayError>;
