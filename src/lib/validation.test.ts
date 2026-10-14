import { describe, expect, it } from "vitest";
import { normalizePhone, validateSignup, type SignupInput } from "./validation";

const valid: SignupInput = {
  full_name: "Awa Ndiaye",
  job_title: "Directrice générale",
  organization_name: "Société A",
  sector: "Agroalimentaire",
  country: "Cameroun",
  whatsapp_phone: "+237 6 99 00 00 00",
  email: "awa@exemple.cm",
  password: "un-mot-de-passe-long",
  terms: true,
  confidentiality: true,
};

describe("normalizePhone", () => {
  it("accepte un numéro camerounais avec espaces", () => {
    expect(normalizePhone("+237 6 99 00 00 00")).toBe("+237699000000");
  });
  it("refuse un numéro sans indicatif", () => {
    expect(normalizePhone("699000000")).toBeNull();
  });
});

describe("validateSignup", () => {
  it("accepte une inscription complète", () => {
    expect(validateSignup(valid)).toEqual({});
  });
  it("exige l'acceptation des conditions ET de la confidentialité", () => {
    expect(validateSignup({ ...valid, confidentiality: false }).accept).toBeDefined();
    expect(validateSignup({ ...valid, terms: false }).accept).toBeDefined();
  });
  it("exige un mot de passe de 12 caractères", () => {
    expect(validateSignup({ ...valid, password: "court" }).password).toBeDefined();
  });
  it("signale les champs manquants", () => {
    const errors = validateSignup({ ...valid, organization_name: "", email: "pas-un-email" });
    expect(errors.organization_name).toBeDefined();
    expect(errors.email).toBeDefined();
  });
});

import { validateExpert, type ExpertInput } from "./validation";

describe("validateExpert", () => {
  const expert: ExpertInput = {
    full_name: "Expert Un",
    email: "expert@exemple.cm",
    domains: ["strategie"],
    experience: "",
    fee: 50000,
    nda_signed: true,
    nda_signed_at: "2026-10-01",
    conflicts: [],
    active: true,
  };
  it("accepte une fiche complète", () => {
    expect(validateExpert(expert)).toEqual({});
  });
  it("exige la date quand le NDA est signé", () => {
    expect(validateExpert({ ...expert, nda_signed_at: null }).nda_signed_at).toBeDefined();
  });
  it("accepte un expert sans NDA (il ne pourra pas être assigné)", () => {
    expect(validateExpert({ ...expert, nda_signed: false, nda_signed_at: null })).toEqual({});
  });
  it("exige au moins un domaine et un tarif entier positif", () => {
    const errors = validateExpert({ ...expert, domains: [], fee: -5 });
    expect(errors.domains).toBeDefined();
    expect(errors.fee).toBeDefined();
  });
});
