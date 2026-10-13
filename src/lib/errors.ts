/** Turns a caught value into one plain line for a user-facing message. */
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
