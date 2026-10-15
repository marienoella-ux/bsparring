// Montants : le paiement est toujours en FCFA. L'euro n'est qu'un affichage
// indicatif, à parité fixe (1 € = 655,957 FCFA), activable en back-office.

export const FCFA_PER_EUR = 655.957;

export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount))} FCFA`;
}

// Prix par session, arrondi à l'unité.
export function pricePerSession(priceFcfa: number, credits: number): number {
  return Math.round(priceFcfa / credits);
}

export function fcfaToEur(amountFcfa: number): number {
  return Math.round(amountFcfa / FCFA_PER_EUR);
}

export function formatEur(amountEur: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amountEur)} €`;
}

// « environ 183 € » : toujours présenté comme un équivalent, jamais comme le prix.
export function formatEurEquivalent(amountFcfa: number): string {
  return `environ ${formatEur(fcfaToEur(amountFcfa))}`;
}
