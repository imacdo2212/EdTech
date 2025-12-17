export type Consent = {
  status: "granted" | "revoked" | "limited";
  scopes: string[];
  timestamp: string; // ISO Z preferred (PK treats as opaque string)
};

export type CDM = {
  pk_version: "1.0";
  learner_id: string;
  consent: Consent;

  identity?: {
    display_name?: string;
    locale?: string;
    timezone?: string;
    education_level?: "KS3" | "KS4" | "KS5" | "Adult" | "Other" | string;
  };

  preferences?: {
    style?: "brief" | "detailed";
    tone?: "neutral" | "friendly" | "formal" | "playful";
    accessibility?: { dyslexia_mode?: boolean; font_scale?: number };
    slang_mode?: "none" | "mild" | "regional";
  };

  capabilities?: {
    languages?: string[];
    instruments?: string[];
    sports?: string[];
    tech_stack?: string[];
  };

  supports?: {
    sen?: { has_plan?: boolean; notes?: string };
    wellbeing?: { check_ins_enabled?: boolean };
  };

  curriculum?: {
    subjects?: Array<{
      code?: string;
      level?: string;
      targets?: string[];
      exam_board?: string;
    }>;
  };

  topic_states?: Record<string, any>;

  audit?: { created_at?: string; updated_at?: string };
};

export type DeltaScope = "profile" | "session";

export type DeltaRequest = {
  sk_code: string;
  ts: string; // delta timestamp (external input)
  payload: any;
  scope: DeltaScope;
};

export type DeltaResponse =
  | { ok: true; status: "applied" | "skipped"; reasons: string[]; profile: CDM }
  | { ok: false; termination: string; cause: string; next_steps: string[] };

export type ViewResponse =
  | { ok: true; profile: any }
  | { ok: false; termination: string; cause: string; next_steps: string[] };

export type PK1State = {
  // Canonical profile (CDM). This is the only persisted learner profile object.
  profile: CDM;

  // Internal merge meta (allowed inside PK1). Not exported in responses.
  // Tracks per-field confidence & last-ts for deterministic non-destructive merges.
  field_meta: Record<string, { confidence: number; ts: string }>;
};
