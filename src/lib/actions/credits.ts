"use server";

import { redirect } from "next/navigation";
import { dbError, t } from "@/i18n";
import { requireRole } from "@/lib/auth/session";
import { str } from "@/lib/validation";
import type { FormState } from "./auth";

const OPERATORS = ["orange_money", "mtn_momo"] as const;

// Le dirigeant déclare son paiement. Aucun crédit n'est créé ici :
// seule la validation par l'admin (ou un webhook vérifié) en crée.
export async function declarePayment(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireRole("dirigeant");
  const packId = str(form, "pack_id");
  const operator = str(form, "operator");
  const reference = str(form, "reference");
  const values = { reference };

  if (!OPERATORS.includes(operator as (typeof OPERATORS)[number])) {
    return { error: t.purchase.errors.moyen_indisponible, values };
  }
  if (reference.replace(/\s/g, "").length < 4) {
    return { errors: { reference: t.purchase.errors.reference_invalide }, values };
  }

  const { error } = await supabase.rpc("declare_payment", {
    p_pack_id: packId,
    p_operator: operator,
    p_reference: reference,
  });
  if (error) {
    const message = dbError(error.message, t.purchase.errors, t.auth.genericError);
    if (error.message.includes("reference_")) return { errors: { reference: message }, values };
    return { error: message, values };
  }
  redirect("/espace?paiement=declare");
}
