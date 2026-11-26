import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock3, Copy, Loader2, ShieldCheck, Smartphone, ArrowLeft, CircleAlert } from "lucide-react";
import { getOrderStatus } from "@/lib/fruitfy.functions";
import type { PixChargeResult } from "@/lib/fruitfy";

const PAID = ["paid", "approved", "completed"];

type PixPaymentProps = {
  charge: PixChargeResult;
  amount?: number;
};

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function PixPayment({ charge, amount }: PixPaymentProps) {
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  useEffect(() => {
    if (!charge.orderId || paid) return;
    let active = true;
    const check = async () => {
      const result = await getOrderStatus({ data: { orderId: charge.orderId! } }).catch(() => null);
      if (active && result?.ok && (PAID.includes((result.status ?? "").toLowerCase()) || result.paidAt)) {
        setPaid(true);
      }
    };
    void check();
    const timer = window.setInterval(check, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [charge.orderId, paid]);

  const copy = async () => {
    if (!charge.pixCode) return;
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(charge.pixCode);
      setCopied(true);
    } catch {
      const field = document.createElement("textarea");
      field.value = charge.pixCode;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const success = document.execCommand("copy");
      field.remove();
      setCopied(success);
      setCopyError(!success);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_32px_rgba(22,24,35,0.07)]">
      <div className="border-b border-gray-100 px-5 py-4 sm:px-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">Pagamento seguro</p>
            <h1 className="mt-1 text-lg font-extrabold text-[#161823]">Finalize seu pedido</h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf8f1] px-3 py-1.5 text-[10px] font-bold text-[#15966b]">
            <ShieldCheck className="size-3.5" /> Ambiente protegido
          </span>
        </div>
      </div>

      {paid ? (
        <div className="px-6 py-12 text-center sm:px-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#e8f8ef]">
            <CheckCircle2 className="size-9 text-[#15966b]" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-[#161823]">Pagamento confirmado!</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500">Recebemos a confirmação do seu Pix. Seu pedido já está em processamento.</p>
          <a href="/" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-[#fe2c55] px-7 text-sm font-bold text-white">Voltar à loja</a>
        </div>
      ) : (
        <div className="px-5 py-5 sm:px-7 sm:py-7">
          <div className="rounded-xl bg-[#f7f7f8] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-gray-500">Valor total do pedido</p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#161823]">{typeof amount === "number" ? money(amount) : typeof charge.amountCents === "number" ? money(charge.amountCents / 100) : "Pix gerado"}</p>
              </div>
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#15966b] shadow-sm">
                <span className="text-sm font-black">PIX</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3 text-[11px] text-gray-500">
              <Clock3 className="size-3.5" /> Aguardando pagamento
            </div>
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-base font-extrabold text-[#161823]">Escaneie o QR Code para pagar</h2>
            <p className="mt-1 text-xs text-gray-500">Abra o aplicativo do seu banco e escolha pagar com Pix.</p>
            <div className="mx-auto mt-4 grid min-h-[236px] w-full max-w-[264px] place-items-center rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_3px_14px_rgba(0,0,0,0.04)]">
              {charge.qrCodeImage ? (
                <img
                  alt="QR Code Pix para pagamento"
                  className="size-52 object-contain"
                  src={charge.qrCodeImage.startsWith("data:") ? charge.qrCodeImage : `data:image/png;base64,${charge.qrCodeImage}`}
                />
              ) : charge.pixCode ? (
                <QRCodeSVG value={charge.pixCode} size={208} level="M" includeMargin />
              ) : (
                <div className="px-3 text-center text-xs text-amber-700">
                  <CircleAlert className="mx-auto mb-2 size-6" />
                  O QR Code não foi retornado. Entre em contato com o suporte antes de tentar pagar novamente.
                </div>
              )}
            </div>
          </div>

          {charge.pixCode && (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-[#161823]">
                <Smartphone className="size-4 text-[#fe2c55]" /> Ou pague com Pix Copia e Cola
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="max-h-16 overflow-hidden break-all text-[10px] leading-relaxed text-gray-500">{charge.pixCode}</p>
                <button
                  type="button"
                  onClick={copy}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#fe2c55] px-4 text-xs font-extrabold text-white transition hover:bg-[#e9274d] active:scale-[0.99]"
                >
                  <Copy className="size-4" /> {copied ? "Código copiado!" : "Copiar código Pix"}
                </button>
                {copyError && <p role="alert" className="mt-2 text-center text-[11px] text-red-600">Não foi possível copiar automaticamente. Selecione e copie o código acima.</p>}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-xl border border-[#d9efe4] bg-[#f2fbf6] p-3.5">
            <div className="flex items-start gap-2.5">
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-[#15966b]" />
              <div>
                <p className="text-xs font-bold text-[#176b4d]">Estamos aguardando a confirmação</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#4d806b]">Esta página atualiza automaticamente assim que o pagamento for aprovado pelo banco.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-[11px] leading-relaxed text-gray-500">
            <p className="font-bold text-[#161823]">Como pagar:</p>
            <p>1. Abra o aplicativo do seu banco.</p>
            <p>2. Escolha Pix e leia o QR Code ou cole o código.</p>
            <p>3. Confira o valor e confirme o pagamento.</p>
          </div>
        </div>
      )}
      <div className="border-t border-gray-100 bg-[#fafafa] px-5 py-3 text-center text-[10px] text-gray-400 sm:px-7">
        Compra protegida • Não feche esta página até concluir o pagamento
      </div>
    </section>
  );
}
