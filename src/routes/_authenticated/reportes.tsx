import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/AdminOnly";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, num, labelMetodo, isoDay } from "@/lib/format";
import { calcularRango, RANGOS, type RangoKey } from "@/lib/rango";
import { exportarCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes de gestión — Gestión de Librería" },
      { name: "description", content: "Ventas, rentabilidad, medios de pago y ranking de productos por período." },
      { property: "og:title", content: "Reportes de gestión — Gestión de Librería" },
      { property: "og:description", content: "Análisis de ventas y rentabilidad de la librería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <Reportes />
    </AdminOnly>
  ),
});

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

type Detalle = {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  subtotal: number;
  categorias: { nombre: string } | null;
  ventas: { fecha: string; estado: string; metodo_pago: string } | null;
};

function Reportes() {
  const [rango, setRango] = useState<RangoKey>("30dias");
  const [desdeStr, setDesdeStr] = useState(isoDay(new Date()));
  const [hastaStr, setHastaStr] = useState(isoDay(new Date()));
  const { desde, hasta } = calcularRango(rango, desdeStr, hastaStr);

  const q = useQuery({
    queryKey: ["reportes", desde.toISOString(), hasta.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detalle_ventas")
        .select(
          "descripcion,cantidad,precio_unitario,costo_unitario,subtotal,categorias(nombre),ventas!inner(fecha,estado,metodo_pago)",
        )
        .gte("ventas.fecha", desde.toISOString())
        .lte("ventas.fecha", hasta.toISOString())
        .eq("ventas.estado", "confirmada");
      if (error) throw error;
      return (data ?? []) as unknown as Detalle[];
    },
  });

  const filas = q.data ?? [];
  const ingresos = filas.reduce((a, f) => a + Number(f.subtotal), 0);
  const costos = filas.reduce((a, f) => a + Number(f.costo_unitario) * Number(f.cantidad), 0);
  const ganancia = ingresos - costos;
  const margen = ingresos > 0 ? (ganancia / ingresos) * 100 : 0;
  const unidades = filas.reduce((a, f) => a + Number(f.cantidad), 0);

  const porCategoria = Object.values(
    filas.reduce<Record<string, { nombre: string; total: number }>>((acc, f) => {
      const nombre = f.categorias?.nombre ?? "Servicios / sin categoría";
      acc[nombre] = { nombre, total: (acc[nombre]?.total ?? 0) + Number(f.subtotal) };
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const porMetodo = Object.values(
    filas.reduce<Record<string, { nombre: string; total: number }>>((acc, f) => {
      const nombre = labelMetodo(f.ventas?.metodo_pago ?? "otro");
      acc[nombre] = { nombre, total: (acc[nombre]?.total ?? 0) + Number(f.subtotal) };
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  const ranking = Object.values(
    filas.reduce<
      Record<string, { nombre: string; cantidad: number; total: number; ganancia: number }>
    >((acc, f) => {
      const prev = acc[f.descripcion] ?? { nombre: f.descripcion, cantidad: 0, total: 0, ganancia: 0 };
      acc[f.descripcion] = {
        nombre: f.descripcion,
        cantidad: prev.cantidad + Number(f.cantidad),
        total: prev.total + Number(f.subtotal),
        ganancia: prev.ganancia + (Number(f.subtotal) - Number(f.costo_unitario) * Number(f.cantidad)),
      };
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Ingresos, costos y rentabilidad del período seleccionado."
        actions={
          <Button
            variant="outline"
            disabled={ranking.length === 0}
            onClick={() =>
              exportarCSV(
                "reporte-ventas",
                ranking.map((r) => ({
                  producto: r.nombre,
                  unidades: r.cantidad,
                  facturado: r.total.toFixed(2),
                  ganancia: r.ganancia.toFixed(2),
                })),
              )
            }
          >
            <Download className="size-4" /> Exportar
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select value={rango} onValueChange={(v) => setRango(v as RangoKey)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGOS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {rango === "personalizado" && (
          <>
            <Input type="date" className="w-44" value={desdeStr} onChange={(e) => setDesdeStr(e.target.value)} />
            <Input type="date" className="w-44" value={hastaStr} onChange={(e) => setHastaStr(e.target.value)} />
          </>
        )}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facturado" value={money(ingresos)} tone="success" />
        <StatCard label="Costo de lo vendido" value={money(costos)} />
        <StatCard label="Ganancia bruta" value={money(ganancia)} tone="info" hint={`Margen ${num(margen, 1)}%`} />
        <StatCard label="Unidades vendidas" value={num(unidades, 2)} />
      </div>

      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Por categoría</TabsTrigger>
          <TabsTrigger value="medios">Medios de pago</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-4">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porCategoria}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="total" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="medios" className="mt-4">
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={porMetodo} dataKey="total" nameKey="nombre" outerRadius={110} label>
                    {porMetodo.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ranking" className="mt-4">
          <DataTable
            rows={ranking}
            rowKey={(r) => r.nombre}
            searchText={(r) => r.nombre}
            empty={q.isLoading ? "Cargando..." : "Sin ventas en el período"}
            columns={[
              { key: "nombre", header: "Producto / servicio", cell: (r) => r.nombre },
              {
                key: "cant",
                header: "Unidades",
                className: "tabular",
                sortValue: (r) => r.cantidad,
                cell: (r) => num(r.cantidad, 2),
              },
              {
                key: "total",
                header: "Facturado",
                className: "tabular",
                sortValue: (r) => r.total,
                cell: (r) => money(r.total),
              },
              {
                key: "gan",
                header: "Ganancia",
                className: "tabular",
                sortValue: (r) => r.ganancia,
                cell: (r) => <span className="text-success">{money(r.ganancia)}</span>,
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
