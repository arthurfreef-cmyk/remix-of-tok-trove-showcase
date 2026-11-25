import { describe, expect, it } from "vitest";
import { isValidCpf, toCents } from "@/lib/fruitfy";
describe("fruitfy", () => {
  it("R$48,90 vira 4890 centavos", () => expect(toCents(48.9)).toBe(4890));
  it("R$137,90 vira 13790 centavos", () => expect(toCents(137.9)).toBe(13790));
  it("CPF válido passa", () => expect(isValidCpf("529.982.247-25")).toBe(true));
  it("CPF repetido falha", () => expect(isValidCpf("111.111.111-11")).toBe(false));
});
