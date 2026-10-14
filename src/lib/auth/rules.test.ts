import { describe, expect, it } from "vitest";
import { backOfficeGate, homePathFor, safeNextPath } from "./rules";

describe("homePathFor", () => {
  it("envoie l'admin et le facilitateur au back-office", () => {
    expect(homePathFor(["admin"])).toBe("/admin");
    expect(homePathFor(["facilitateur", "admin"])).toBe("/admin");
    expect(homePathFor(["facilitateur"])).toBe("/admin");
  });
  it("envoie l'expert à son espace", () => {
    expect(homePathFor(["expert"])).toBe("/expert");
  });
  it("envoie le dirigeant, ou un compte sans rôle, à Mon espace", () => {
    expect(homePathFor(["dirigeant"])).toBe("/espace");
    expect(homePathFor([])).toBe("/espace");
  });
});

describe("backOfficeGate", () => {
  it("refuse un compte sans rôle de back-office, même en 2FA", () => {
    expect(backOfficeGate(["dirigeant"], "aal2", "aal2")).toBe("forbidden");
    expect(backOfficeGate(["expert"], "aal2", "aal2")).toBe("forbidden");
  });
  it("exige l'enrôlement d'un admin sans facteur", () => {
    expect(backOfficeGate(["admin"], "aal1", "aal1")).toBe("enroll");
    expect(backOfficeGate(["facilitateur"], null, null)).toBe("enroll");
  });
  it("exige le code d'un admin enrôlé mais pas encore vérifié", () => {
    expect(backOfficeGate(["admin"], "aal1", "aal2")).toBe("verify");
  });
  it("laisse passer un admin ou un facilitateur en 2FA", () => {
    expect(backOfficeGate(["admin"], "aal2", "aal2")).toBe("ok");
    expect(backOfficeGate(["facilitateur"], "aal2", "aal2")).toBe("ok");
  });
});

describe("safeNextPath", () => {
  it("accepte un chemin interne", () => {
    expect(safeNextPath("/mot-de-passe")).toBe("/mot-de-passe");
  });
  it("refuse les redirections externes", () => {
    expect(safeNextPath("https://exemple.com")).toBe("/tableau");
    expect(safeNextPath("//exemple.com")).toBe("/tableau");
    expect(safeNextPath("/\\exemple.com")).toBe("/tableau");
    expect(safeNextPath(null)).toBe("/tableau");
  });
});
