import { describe, expect, it } from "vitest";
import { fcfaToEur, formatEurEquivalent, formatFcfa, pricePerSession } from "./money";

// Intl insère des espaces insécables : on les normalise pour comparer.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("prix des packs", () => {
  it("calcule le prix par session des packs de départ", () => {
    expect(pricePerSession(135000, 1)).toBe(135000);
    expect(pricePerSession(600000, 5)).toBe(120000);
    expect(pricePerSession(1000000, 10)).toBe(100000);
  });
  it("formate en FCFA", () => {
    expect(plain(formatFcfa(600000))).toBe("600 000 FCFA");
  });
});

describe("équivalent en euros (parité fixe)", () => {
  it("convertit 655 957 FCFA en 1 000 €", () => {
    expect(fcfaToEur(655957)).toBe(1000);
  });
  it("présente l'euro comme un équivalent", () => {
    expect(plain(formatEurEquivalent(120000))).toBe("environ 183 €");
  });
});
