// Validation des formulaires, côté serveur. Fonctions pures, testées dans validation.test.ts.
import { t } from "@/i18n";

export const PASSWORD_MIN = 12;

export type FieldErrors = Partial<Record<string, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function isEmail(v: string) {
  return EMAIL_RE.test(v) && v.length <= 254;
}

// Numéro international : « + » puis 8 à 15 chiffres (espaces, points et tirets tolérés).
export function normalizePhone(v: string): string | null {
  const compact = v.replace(/[\s.\-()]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export type SignupInput = {
  full_name: string;
  job_title: string;
  organization_name: string;
  sector: string;
  country: string;
  whatsapp_phone: string;
  email: string;
  password: string;
  terms: boolean;
  confidentiality: boolean;
};

export function readSignup(form: FormData): SignupInput {
  return {
    full_name: str(form, "full_name"),
    job_title: str(form, "job_title"),
    organization_name: str(form, "organization_name"),
    sector: str(form, "sector"),
    country: str(form, "country"),
    whatsapp_phone: str(form, "whatsapp_phone"),
    email: str(form, "email").toLowerCase(),
    password: typeof form.get("password") === "string" ? (form.get("password") as string) : "",
    terms: form.get("terms") === "on",
    confidentiality: form.get("confidentiality") === "on",
  };
}

export function validateSignup(input: SignupInput): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of ["full_name", "job_title", "organization_name", "sector", "country"] as const) {
    if (!input[key]) errors[key] = t.signup.required;
    else if (input[key].length > 200) errors[key] = t.signup.required;
  }
  if (!normalizePhone(input.whatsapp_phone)) errors.whatsapp_phone = t.signup.phoneInvalid;
  if (!isEmail(input.email)) errors.email = t.signup.emailInvalid;
  if (input.password.length < PASSWORD_MIN) errors.password = t.auth.passwordTooShort;
  if (!input.terms || !input.confidentiality) errors.accept = t.signup.mustAccept;
  return errors;
}

export const DOMAINS = ["strategie", "gestion_projet", "innovation", "rh"] as const;
export type Domain = (typeof DOMAINS)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type ExpertInput = {
  full_name: string;
  email: string;
  domains: Domain[];
  experience: string;
  fee: number | null;
  nda_signed: boolean;
  nda_signed_at: string | null;
  conflicts: string[];
  active: boolean;
};

export function readExpert(form: FormData): ExpertInput & { feeRaw: string } {
  const feeRaw = str(form, "fee").replace(/\s/g, "");
  return {
    full_name: str(form, "full_name"),
    email: str(form, "email").toLowerCase(),
    domains: form.getAll("domains").filter((d): d is Domain => DOMAINS.includes(d as Domain)),
    experience: str(form, "experience"),
    feeRaw,
    fee: feeRaw === "" ? null : Number(feeRaw),
    nda_signed: form.get("nda_signed") === "on",
    nda_signed_at: str(form, "nda_signed_at") || null,
    conflicts: form.getAll("conflicts").filter((c): c is string => typeof c === "string" && UUID_RE.test(c)),
    active: form.get("active") === "on",
  };
}

export function validateExpert(input: ExpertInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.full_name || input.full_name.length > 200) errors.full_name = t.signup.required;
  if (!isEmail(input.email)) errors.email = t.signup.emailInvalid;
  if (input.domains.length === 0) errors.domains = t.admin.domainsRequired;
  if (input.fee !== null && (!Number.isInteger(input.fee) || input.fee < 0)) errors.fee = t.signup.required;
  if (input.nda_signed && (!input.nda_signed_at || !DATE_RE.test(input.nda_signed_at))) {
    errors.nda_signed_at = t.admin.ndaDateRequired;
  }
  return errors;
}
