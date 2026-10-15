import fr from "./fr.json";

// Interface en français en V1. Pour ajouter l'anglais : créer en.json avec
// les mêmes clés, puis choisir le dictionnaire selon profiles.locale.
export const t = fr;
export type Messages = typeof fr;

// Remplace les {variables} d'un texte : fill("Valables jusqu'au {date}", { date }).
export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

// Traduit une erreur levée par une fonction de la base (raise exception 'code').
export function dbError(message: string | undefined, dictionary: Record<string, string>, fallback: string): string {
  if (!message) return fallback;
  const key = Object.keys(dictionary).find((k) => message.includes(k));
  return key ? dictionary[key] : fallback;
}
