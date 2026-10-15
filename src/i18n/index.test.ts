import { describe, expect, it } from "vitest";
import { dbError, fill } from "./index";

describe("fill", () => {
  it("remplace les variables connues et garde les autres", () => {
    expect(fill("{a} et {b}", { a: 1 })).toBe("1 et {b}");
  });
});

describe("dbError", () => {
  it("traduit le code d'erreur de la base", () => {
    expect(dbError("reference_deja_utilisee", { reference_deja_utilisee: "Déjà déclarée." }, "Erreur")).toBe("Déjà déclarée.");
  });
  it("renvoie le message par défaut pour une erreur inconnue", () => {
    expect(dbError("boom", {}, "Erreur")).toBe("Erreur");
  });
});
