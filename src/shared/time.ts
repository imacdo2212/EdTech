// Determinism rule: time may be injected only via explicit ts fields.
// This helper exists only to validate provided timestamps.
export function isIsoDateTimeZ(s: string): boolean {
  // simple, deterministic check
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(s);
}
