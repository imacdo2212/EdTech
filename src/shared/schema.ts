import { refusal, type Refusal } from "./errors.js";

export type JsonSchema = Record<string, any>;

export function validateNoUnknownFields(schema: JsonSchema, payload: any): Refusal | null {
  // Minimal JSON Schema validator supporting:
  // - type: object
  // - properties
  // - required
  // - additionalProperties: false
  // - maxLength (for strings)
  // - maxItems (for arrays)
  // - enum (for strings)
  if (schema.type !== "object" || typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return refusal("PK-REF-SCHEMA", "Payload must be an object.", ["Fix payload shape."]);
  }

  const props: Record<string, JsonSchema> = schema.properties ?? {};
  const required: string[] = schema.required ?? [];

  for (const r of required) {
    if (!(r in payload)) return refusal("PK-REF-SCHEMA", `Missing required field: ${r}`, ["Add required fields."]);
  }

  const additional = schema.additionalProperties;
  if (additional === false) {
    for (const k of Object.keys(payload)) {
      if (!(k in props)) return refusal("PK-REF-SCHEMA", `Unknown field not allowed: ${k}`, ["Remove unknown fields."]);
    }
  }

  for (const [k, subschema] of Object.entries(props)) {
    if (!(k in payload)) continue;
    const v = (payload as any)[k];
    const err = validateValue(subschema, v, k);
    if (err) return err;
  }
  return null;
}

function validateValue(schema: JsonSchema, value: any, path: string): Refusal | null {
  if (schema.type) {
    const t = schema.type;
    if (t === "string" && typeof value !== "string") return refusal("PK-REF-SCHEMA", `${path} must be string.`, ["Fix field types."]);
    if (t === "number" && typeof value !== "number") return refusal("PK-REF-SCHEMA", `${path} must be number.`, ["Fix field types."]);
    if (t === "boolean" && typeof value !== "boolean") return refusal("PK-REF-SCHEMA", `${path} must be boolean.`, ["Fix field types."]);
    if (t === "array" && !Array.isArray(value)) return refusal("PK-REF-SCHEMA", `${path} must be array.`, ["Fix field types."]);
    if (t === "object" && (typeof value !== "object" || value === null || Array.isArray(value)))
      return refusal("PK-REF-SCHEMA", `${path} must be object.`, ["Fix field types."]);
  }
  if (schema.enum && typeof value === "string") {
    if (!schema.enum.includes(value)) return refusal("PK-REF-SCHEMA", `${path} must be one of enum values.`, ["Use allowed enums."]);
  }
  if (schema.maxLength && typeof value === "string") {
    if (value.length > schema.maxLength) return refusal("PK-REF-SCHEMA", `${path} too long.`, ["Shorten the string."]);
  }
  if (schema.maxItems && Array.isArray(value)) {
    if (value.length > schema.maxItems) return refusal("PK-REF-SCHEMA", `${path} too many items.`, ["Reduce items."]);
  }
  if (schema.additionalProperties === false && schema.type === "object") {
    const props: Record<string, JsonSchema> = schema.properties ?? {};
    for (const k of Object.keys(value)) {
      if (!(k in props)) return refusal("PK-REF-SCHEMA", `Unknown field not allowed: ${path}.${k}`, ["Remove unknown fields."]);
    }
  }
  // shallow nested objects validation (properties only)
  if (schema.type === "object" && schema.properties) {
    const req: string[] = schema.required ?? [];
    for (const r of req) {
      if (!(r in value)) return refusal("PK-REF-SCHEMA", `Missing required field: ${path}.${r}`, ["Add required fields."]);
    }
    for (const [k, s] of Object.entries(schema.properties)) {
      if (!(k in value)) continue;
      const err = validateValue(s as any, (value as any)[k], `${path}.${k}`);
      if (err) return err;
    }
  }
  // arrays of strings support
  if (schema.type === "array" && schema.items?.type === "string") {
    for (let i = 0; i < value.length; i++) {
      if (typeof value[i] !== "string") return refusal("PK-REF-SCHEMA", `${path}[${i}] must be string.`, ["Fix array item types."]);
    }
  }
  return null;
}
