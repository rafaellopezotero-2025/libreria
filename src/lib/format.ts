export const money = (n: number | string | null | undefined) => {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(v);
};

export const num = (n: number | string | null | undefined, dec = 0) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec }).format(Number(n ?? 0));

export const fecha = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

export const fechaHora = (d: string | Date | null | undefined) =>
  d
    ? new Date(d).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const METODOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "debito", label: "Tarjeta de débito" },
  { value: "credito", label: "Tarjeta de crédito" },
  { value: "mercadopago", label: "Mercado Pago" },
  { value: "otro", label: "Otro" },
] as const;

export const labelMetodo = (v: string) => METODOS_PAGO.find((m) => m.value === v)?.label ?? v;
