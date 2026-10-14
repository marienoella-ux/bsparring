import fr from "./fr.json";

// Interface en français en V1. Pour ajouter l'anglais : créer en.json avec
// les mêmes clés, puis choisir le dictionnaire selon profiles.locale.
export const t = fr;
export type Messages = typeof fr;
