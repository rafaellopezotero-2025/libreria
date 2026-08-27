export type EstadoStock = "sin_stock" | "critico" | "reponer" | "normal";

export type ProductoStock = {
  stock_actual: number;
  stock_minimo: number;
  punto_reposicion: number;
  stock_objetivo: number;
};

export function estadoStock(p: ProductoStock): EstadoStock {
  const actual = Number(p.stock_actual);
  if (actual <= 0) return "sin_stock";
  if (actual <= Number(p.stock_minimo)) return "critico";
  if (actual <= Number(p.punto_reposicion)) return "reponer";
  return "normal";
}

export const ESTADO_LABEL: Record<EstadoStock, string> = {
  sin_stock: "🔴 Sin stock",
  critico: "🟠 Stock crítico",
  reponer: "🟡 Reponer próximamente",
  normal: "🟢 Stock normal",
};

export const ESTADO_CLASS: Record<EstadoStock, string> = {
  sin_stock: "bg-destructive/10 text-destructive border-destructive/20",
  critico: "bg-warning/15 text-warning-foreground border-warning/30",
  reponer: "bg-info/10 text-info border-info/25",
  normal: "bg-success/10 text-success border-success/25",
};

export function cantidadSugerida(p: ProductoStock): number {
  return Math.max(0, Number(p.stock_objetivo) - Number(p.stock_actual));
}

export function necesitaReposicion(p: ProductoStock): boolean {
  return estadoStock(p) !== "normal";
}
