import { describe, expect, it } from "vitest";
import { createFruitfyItem, isValidCpf, toCents } from "@/lib/fruitfy";
import { specs } from "@/components/produto/data";
describe("fruitfy", () => {
  it("R$48,90 vira 4890 centavos", () => expect(toCents(48.9)).toBe(4890));
  it("R$137,90 vira 13790 centavos", () => expect(toCents(137.9)).toBe(13790));
  it("CPF válido passa", () => expect(isValidCpf("529.982.247-25")).toBe(true));
  it("CPF repetido falha", () => expect(isValidCpf("111.111.111-11")).toBe(false));
  it("a opção de R$137,90 cobra 13790 centavos com o mesmo ID de produto", () => {
    const variation = specs.find((item) => item.id === "2");
    if (!variation) throw new Error("Variação 2 ausente");
    expect(createFruitfyItem(variation.price, 1)).toEqual({
      id: "a32e191e-0e17-4b25-8ce1-71f49aae8526", value: 13790, quantity: 1,
    });
    expect(createFruitfyItem(48.9, 1).id).toBe(createFruitfyItem(variation.price, 1).id);
  });
});
