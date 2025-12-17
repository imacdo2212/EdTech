import crypto from "node:crypto";
import { stableStringify } from "./stableJson.js";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function hashOfObject(obj: unknown): string {
  return sha256Hex(stableStringify(obj));
}
