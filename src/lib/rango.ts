export type RangoKey =
  | "hoy"
  | "ayer"
  | "7dias"
  | "30dias"
  | "este_mes"
  | "mes_anterior"
  | "personalizado";

export const RANGOS: { value: RangoKey; label: string }[] = [
  { value: "hoy", label: "Hoy" },
  { value: "ayer", label: "Ayer" },
  { value: "7dias", label: "Últimos 7 días" },
  { value: "30dias", label: "Últimos 30 días" },
  { value: "este_mes", label: "Este mes" },
  { value: "mes_anterior", label: "Mes anterior" },
  { value: "personalizado", label: "Rango personalizado" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export function calcularRango(key: RangoKey, desdeStr?: string, hastaStr?: string) {
  const hoy = new Date();
  switch (key) {
    case "hoy":
      return { desde: startOfDay(hoy), hasta: endOfDay(hoy) };
    case "ayer": {
      const a = new Date(hoy);
      a.setDate(a.getDate() - 1);
      return { desde: startOfDay(a), hasta: endOfDay(a) };
    }
    case "7dias": {
      const a = new Date(hoy);
      a.setDate(a.getDate() - 6);
      return { desde: startOfDay(a), hasta: endOfDay(hoy) };
    }
    case "30dias": {
      const a = new Date(hoy);
      a.setDate(a.getDate() - 29);
      return { desde: startOfDay(a), hasta: endOfDay(hoy) };
    }
    case "este_mes":
      return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: endOfDay(hoy) };
    case "mes_anterior": {
      const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
      const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
      return { desde, hasta };
    }
    default: {
      const desde = desdeStr ? startOfDay(new Date(desdeStr + "T00:00:00")) : startOfDay(hoy);
      const hasta = hastaStr ? endOfDay(new Date(hastaStr + "T00:00:00")) : endOfDay(hoy);
      return { desde, hasta };
    }
  }
}
