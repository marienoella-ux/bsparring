import { describe, expect, it } from "vitest";
import { formatPhone } from "./credits";

describe("formatPhone", () => {
  it("formate un numéro camerounais", () => {
    expect(formatPhone("+237659989910")).toBe("+237 6 59 98 99 10");
  });
  it("laisse les autres numéros inchangés", () => {
    expect(formatPhone("+33612345678")).toBe("+33612345678");
  });
});
