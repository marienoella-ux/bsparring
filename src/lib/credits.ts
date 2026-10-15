import type { SupabaseClient } from "@supabase/supabase-js";

export type PurchaseConfig = {
  manual_payment_enabled: boolean;
  eur_display_enabled: boolean;
  pioneer_offer_available: boolean;
  pioneer_bonus_credits: number;
  credit_validity_months: number;
  credit_expiry_alert_days: number;
  validation_delay_text: string;
};

export type Pack = { id: string; name: string; credits: number; price_fcfa: number; pioneer_eligible: boolean };
export type PaymentMethod = { operator: "orange_money" | "mtn_momo"; label: string; phone: string; beneficiary: string; ussd_code: string };

export async function getPurchaseConfig(supabase: SupabaseClient): Promise<PurchaseConfig | null> {
  const { data } = await supabase.rpc("purchase_config");
  return (data as PurchaseConfig | null) ?? null;
}

// +237659989910 → +237 6 59 98 99 10 (numéros camerounais) ; sinon inchangé.
export function formatPhone(phone: string): string {
  const m = phone.replace(/\s/g, "").match(/^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/);
  return m ? `+237 ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : phone;
}
