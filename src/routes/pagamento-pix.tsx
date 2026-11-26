import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, ShoppingBag } from "lucide-react";
import { PixPayment } from "@/components/produto/PixPayment";
import type { PixChargeResult } from "@/lib/fruitfy";

type StoredPayment = {
  charge: PixChargeResult;
  amount: number;
  createdAt: number;
};

export const Route = createFileRoute("/pagamento-pix")({
  head: () => ({
    meta: [
      { title: "Pagamento Pix – Escova Elétrica 9 em 1" },
      { name: "description", content: "Conclua seu pedido com pagamento Pix seguro." },
      { property: "og:title", content: "Pagamento Pix – Escova Elétrica 9 em 1" },
      { property: "og:description", content: "Finalize seu pedido com Pix." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PixCheckoutPage,
});

function PixCheckoutPage() {
  const [payment, setPayment] = useState<StoredPayment | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("pendingPixPayment");
      if (raw) {
        const parsed = JSON.parse(raw) as StoredPayment;
        if (
          parsed?.charge?.ok === true &&
          typeof parsed.amount === "number" &&
          Number.isFinite(parsed.amount) &&
          parsed.amount >= 0
        ) {
          setPayment(parsed);
        }
      }
    } catch {
      setPayment(null);
    } finally {
      setReady(true);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f5f6] pb-10 text-[#161823]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-3 px-4 sm:px-6">
          <a
            href="/checkout"
            aria-label="Voltar ao checkout"
            className="grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-gray-100"
          >
            <ArrowLeft className="size-5" />
          </a>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-[#161823] text-white">
              <ShoppingBag className="size-4" />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-tight">TikTok Shop</p>
              <p className="text-[10px] text-gray-500">Pagamento do pedido</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#15966b]">
            <ShieldCheck className="size-4" /> Seguro
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-3 py-5 sm:px-5 sm:py-8">
        {!ready ? (
          <div className="rounded-2xl bg-white p-10 text-center text-sm text-gray-500">Carregando pagamento...</div>
        ) : payment ? (
          <PixPayment charge={payment.charge} amount={payment.amount} />
        ) : (
          <section className="rounded-2xl border border-gray-100 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#fff0f2] text-[#fe2c55]">
              <ShoppingBag className="size-6" />
            </div>
            <h1 className="mt-4 text-lg font-extrabold">Nenhum Pix pendente encontrado</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
              Para visualizar o QR Code, volte ao checkout e gere seu pagamento novamente.
            </p>
            <a href="/checkout" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-[#fe2c55] px-7 text-sm font-bold text-white transition hover:bg-[#e9274d]">
              Voltar ao checkout
            </a>
          </section>
        )}
        <p className="mt-5 text-center text-[10px] text-gray-400">Escova Elétrica 9 em 1 • Atendimento ao cliente</p>
      </div>
    </main>
  );
}
