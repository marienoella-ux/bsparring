"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { str } from "@/lib/validation";

// Toutes ces actions passent par le client de l'admin connecté : la base
// vérifie elle-même le rôle admin et la double authentification.
// Le résultat est signalé par l'URL (?ok=… ou ?erreur=code), traduit par la page.

function back(path: string, params: Record<string, string>): never {
  revalidatePath(path);
  redirect(`${path}?${new URLSearchParams(params)}`);
}

function errorCode(message: string | undefined): string {
  const known = [
    "paiement_deja_traite", "motif_obligatoire", "credits_insuffisants", "quantite_invalide",
    "dirigeant_introuvable", "acces_refuse", "active_requires_details",
  ];
  return known.find((k) => message?.includes(k)) ?? "inconnue";
}

// ----- Paiements -----

export async function confirmPayment(form: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("confirm_payment", { p_payment_id: str(form, "payment_id") });
  back("/admin/paiements", error ? { erreur: errorCode(error.message) } : { ok: "valide" });
}

export async function rejectPayment(form: FormData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("reject_payment", {
    p_payment_id: str(form, "payment_id"),
    p_reason: str(form, "reason"),
  });
  back("/admin/paiements", error ? { erreur: errorCode(error.message) } : { ok: "refuse" });
}

// ----- Ajustements -----

export async function adjustCredits(form: FormData) {
  const { supabase } = await requireAdmin();
  const delta = Number(str(form, "delta"));
  if (!Number.isInteger(delta) || delta === 0) back("/admin/credits", { erreur: "quantite_invalide" });
  const { error } = await supabase.rpc("adjust_credits", {
    p_dirigeant: str(form, "dirigeant_id"),
    p_delta: delta,
    p_reason: str(form, "reason"),
  });
  back("/admin/credits", error ? { erreur: errorCode(error.message) } : { ok: "ajuste" });
}

// ----- Paramètres -----

function intIn(form: FormData, key: string, min: number, max: number): number | null {
  const n = Number(str(form, key).replace(/\s/g, ""));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export async function savePack(form: FormData) {
  const { supabase } = await requireAdmin();
  const name = str(form, "name");
  const credits = intIn(form, "credits", 1, 100);
  const price = intIn(form, "price_fcfa", 1, 100_000_000);
  if (!name || name.length > 80 || credits === null || price === null) back("/admin/parametres", { erreur: "valeur" });
  const values = {
    name,
    credits: credits!,
    price_fcfa: price!,
    pioneer_eligible: form.get("pioneer_eligible") === "on",
    active: form.get("active") === "on",
  };
  const id = str(form, "id");
  const { error } = id
    ? await supabase.from("packs").update(values).eq("id", id)
    : await supabase.from("packs").insert({ ...values, sort_order: 99 });
  if (!error) await supabase.rpc("log_audit", { p_action: id ? "pack_modifie" : "pack_cree", p_object_type: "pack", p_object_id: id || null, p_details: values });
  back("/admin/parametres", error ? { erreur: errorCode(error.message) } : { ok: "enregistre" });
}

export async function savePaymentMethod(form: FormData) {
  const { supabase } = await requireAdmin();
  const phone = str(form, "phone").replace(/[\s.\-]/g, "");
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) back("/admin/parametres", { erreur: "valeur" });
  const values = { phone, beneficiary: str(form, "beneficiary").slice(0, 120), active: form.get("active") === "on" };
  const operator = str(form, "operator");
  const { error } = await supabase.from("payment_methods").update(values).eq("operator", operator);
  if (!error) await supabase.rpc("log_audit", { p_action: "moyen_paiement_modifie", p_object_type: "payment_method", p_object_id: operator, p_details: values });
  back("/admin/parametres", error ? { erreur: errorCode(error.message) } : { ok: "enregistre" });
}

export async function saveSettings(form: FormData) {
  const { supabase, user } = await requireAdmin();
  const validity = intIn(form, "credit_validity_months", 6, 12);
  const cancel = intIn(form, "cancellation_threshold_hours", 1, 168);
  const limit = intIn(form, "pioneer_offer_limit", 0, 1000);
  const bonus = intIn(form, "pioneer_bonus_credits", 1, 10);
  const delay = str(form, "payment_validation_delay_text").slice(0, 80);
  if (validity === null || cancel === null || limit === null || bonus === null || !delay) {
    back("/admin/parametres", { erreur: "valeur" });
  }
  const values: Record<string, unknown> = {
    credit_validity_months: validity,
    cancellation_threshold_hours: cancel,
    pioneer_offer_enabled: form.get("pioneer_offer_enabled") === "on",
    pioneer_offer_limit: limit,
    pioneer_bonus_credits: bonus,
    eur_display_enabled: form.get("eur_display_enabled") === "on",
    manual_payment_enabled: form.get("manual_payment_enabled") === "on",
    payment_validation_delay_text: delay,
  };
  for (const [key, value] of Object.entries(values)) {
    const { error } = await supabase.from("settings").update({ value, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key);
    if (error) back("/admin/parametres", { erreur: errorCode(error.message) });
  }
  await supabase.rpc("log_audit", { p_action: "parametres_modifies", p_object_type: "settings", p_details: values });
  back("/admin/parametres", { ok: "enregistre" });
}
