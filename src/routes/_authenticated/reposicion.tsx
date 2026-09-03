import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { money, num } from "@/lib/format";
import { ESTADO_CLASS, ESTADO_LABEL, cantidadSugerida, estadoStock, necesitaReposicion } from "@/lib/stock";
import { exportarCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/reposicion")({
  head: () => ({
    meta: [
      { title: "Sugerencias de reposición — Gestión de Librería" },
      { name: "description", content: "Listado de productos a reponer con cantidad sugerida y proveedor habitual." },
      { property: "og:title", content: "Sugerencias de reposición — Gestión de Librería" },
      { property: "og:description", content: "Qué comprar, cuánto y a qué proveedor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reposicion,
});

type Row = {
  id: string;
  nombre: string;
  sku: string;
  unidad: string;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  punto_reposicion: number;
  stock_objetivo: number;
  proveedores: { nombre: string } | null;
};

function Reposicion() {
  const q = useQuery({
    queryKey: ["reposicion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select(
          "id,nombre,sku,unidad,precio_costo,stock_actual,stock_minimo,punto_reposicion,stock_objetivo,proveedores(nombre)",
        )
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = (q.data ?? []).filter(necesitaReposicion);
  const costoTotal = rows.reduce((a, r) => a + cantidadSugerida(r) * Number(r.precio_costo), 0);

  const columns: Column<Row>[] = [
    {
      key: "nombre",
      header: "Producto",
      sortValue: (r) => r.nombre.toLowerCase(),
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nombre}</p>
          <p className="text-xs text-muted-foreground">{r.sku}</p>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      sortValue: (r) => estadoStock(r),
      cell: (r) => (
        <Badge variant="outline" className={ESTADO_CLASS[estadoStock(r)]}>
          {ESTADO_LABEL[estadoStock(r)]}
        </Badge>
      ),
    },
    { key: "actual", header: "Actual", className: "tabular", cell: (r) => num(r.stock_actual, 2) },
    { key: "objetivo", header: "Objetivo", className: "tabular", cell: (r) => num(r.stock_objetivo, 2) },
    {
      key: "sugerido",
      header: "Comprar",
      className: "tabular font-semibold",
      sortValue: (r) => cantidadSugerida(r),
      cell: (r) => `${num(cantidadSugerida(r), 2)} ${r.unidad}`,
    },
    {
      key: "costo",
      header: "Costo estimado",
      className: "tabular",
      sortValue: (r) => cantidadSugerida(r) * Number(r.precio_costo),
      cell: (r) => money(cantidadSugerida(r) * Number(r.precio_costo)),
    },
    { key: "prov", header: "Proveedor", cell: (r) => r.proveedores?.nombre ?? "-" },
  ];

  return (
    <>
      <PageHeader
        title="Sugerencias de reposición"
        description="Productos por debajo del punto de reposición con la cantidad necesaria para volver al objetivo."
        actions={
          <Button
            variant="outline"
            disabled={rows.length === 0}
            onClick={() =>
              exportarCSV(
                "reposicion",
                rows.map((r) => ({
                  sku: r.sku,
                  nombre: r.nombre,
                  estado: ESTADO_LABEL[estadoStock(r)],
                  stock: r.stock_actual,
                  objetivo: r.stock_objetivo,
                  comprar: cantidadSugerida(r),
                  costo_estimado: (cantidadSugerida(r) * Number(r.precio_costo)).toFixed(2),
                  proveedor: r.proveedores?.nombre ?? "",
                })),
              )
            }
          >
            <Download className="size-4" /> Exportar orden
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Productos a reponer" value={String(rows.length)} tone="warning" />
        <StatCard
          label="Unidades a comprar"
          value={num(
            rows.reduce((a, r) => a + cantidadSugerida(r), 0),
            2,
          )}
        />
        <StatCard label="Inversión estimada" value={money(costoTotal)} tone="info" />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.nombre} ${r.sku} ${r.proveedores?.nombre ?? ""}`}
        empty={q.isLoading ? "Cargando..." : "Todo el stock está en niveles normales"}
      />
    </>
  );
}
