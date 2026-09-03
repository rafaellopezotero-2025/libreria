import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, num, fechaHora } from "@/lib/format";
import { ESTADO_CLASS, ESTADO_LABEL, estadoStock } from "@/lib/stock";
import { exportarCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/stock")({
  head: () => ({
    meta: [
      { title: "Control de stock — Gestión de Librería" },
      { name: "description", content: "Estado de stock, alertas por punto de reposición y ajustes de inventario." },
      { property: "og:title", content: "Control de stock — Gestión de Librería" },
      { property: "og:description", content: "Alertas de stock y movimientos de inventario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stock,
});

type Prod = {
  id: string;
  nombre: string;
  sku: string;
  unidad: string;
  precio_costo: number;
  stock_actual: number;
  stock_minimo: number;
  punto_reposicion: number;
  stock_objetivo: number;
  activo: boolean;
};

function Stock() {
  const qc = useQueryClient();
  const [ajuste, setAjuste] = useState<Prod | null>(null);
  const [tipo, setTipo] = useState<"entrada" | "salida" | "ajuste">("entrada");
  const [cantidad, setCantidad] = useState("1");
  const [motivo, setMotivo] = useState("");

  const productosQ = useQuery({
    queryKey: ["productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id,nombre,sku,unidad,precio_costo,stock_actual,stock_minimo,punto_reposicion,stock_objetivo,activo")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Prod[];
    },
  });

  const movimientosQ = useQuery({
    queryKey: ["movimientos_stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos_stock")
        .select("id,tipo,cantidad,stock_resultante,motivo,fecha,productos(nombre,sku)")
        .order("fecha", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const registrar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("registrar_movimiento_stock", {
        p_producto_id: ajuste!.id,
        p_tipo: tipo,
        p_cantidad: Number(cantidad),
        p_motivo: motivo.trim() || "Ajuste manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento registrado");
      setAjuste(null);
      setMotivo("");
      setCantidad("1");
      void qc.invalidateQueries({ queryKey: ["productos"] });
      void qc.invalidateQueries({ queryKey: ["movimientos_stock"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = productosQ.data ?? [];
  const sinStock = rows.filter((r) => estadoStock(r) === "sin_stock").length;
  const criticos = rows.filter((r) => estadoStock(r) === "critico").length;
  const reponer = rows.filter((r) => estadoStock(r) === "reponer").length;
  const valorizado = rows.reduce((a, r) => a + Number(r.stock_actual) * Number(r.precio_costo), 0);

  const columns: Column<Prod>[] = [
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
      key: "stock",
      header: "Actual",
      className: "tabular",
      sortValue: (r) => Number(r.stock_actual),
      cell: (r) => `${num(r.stock_actual, 2)} ${r.unidad}`,
    },
    { key: "min", header: "Mínimo", className: "tabular", cell: (r) => num(r.stock_minimo, 2) },
    { key: "rep", header: "Reposición", className: "tabular", cell: (r) => num(r.punto_reposicion, 2) },
    { key: "obj", header: "Objetivo", className: "tabular", cell: (r) => num(r.stock_objetivo, 2) },
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
    {
      key: "acciones",
      header: "",
      cell: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setAjuste(r)}>
          <SlidersHorizontal className="size-4" /> Ajustar
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Control de stock"
        description="Alertas por punto de reposición, ajustes manuales e historial de movimientos."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              exportarCSV(
                "stock",
                rows.map((r) => ({
                  sku: r.sku,
                  nombre: r.nombre,
                  stock: r.stock_actual,
                  minimo: r.stock_minimo,
                  reposicion: r.punto_reposicion,
                  objetivo: r.stock_objetivo,
                  estado: ESTADO_LABEL[estadoStock(r)],
                })),
              )
            }
          >
            <Download className="size-4" /> Exportar
          </Button>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sin stock" value={String(sinStock)} tone="danger" />
        <StatCard label="Stock crítico" value={String(criticos)} tone="warning" />
        <StatCard label="A reponer" value={String(reponer)} tone="info" />
        <StatCard label="Inventario valorizado" value={money(valorizado)} hint="A precio de costo" />
      </div>

      <Tabs defaultValue="productos">
        <TabsList>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
        </TabsList>
        <TabsContent value="productos" className="mt-4">
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.nombre} ${r.sku}`}
            empty={productosQ.isLoading ? "Cargando..." : "Sin productos"}
          />
        </TabsContent>
        <TabsContent value="movimientos" className="mt-4">
          <DataTable
            rows={movimientosQ.data ?? []}
            rowKey={(r) => r.id as string}
            searchText={(r) => `${(r.productos as { nombre?: string } | null)?.nombre ?? ""} ${r.motivo ?? ""}`}
            empty={movimientosQ.isLoading ? "Cargando..." : "Sin movimientos"}
            columns={[
              { key: "fecha", header: "Fecha", cell: (r) => fechaHora(r.fecha as string) },
              {
                key: "producto",
                header: "Producto",
                cell: (r) => (r.productos as { nombre?: string } | null)?.nombre ?? "-",
              },
              { key: "tipo", header: "Tipo", cell: (r) => <Badge variant="outline">{String(r.tipo)}</Badge> },
              { key: "cant", header: "Cantidad", className: "tabular", cell: (r) => num(r.cantidad as number, 2) },
              {
                key: "resultante",
                header: "Stock resultante",
                className: "tabular",
                cell: (r) => (r.stock_resultante === null ? "-" : num(r.stock_resultante as number, 2)),
              },
              { key: "motivo", header: "Motivo", cell: (r) => (r.motivo as string) ?? "-" },
            ]}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={!!ajuste} onOpenChange={(o) => !o && setAjuste(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock · {ajuste?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Stock actual: <span className="tabular font-medium">{num(ajuste?.stock_actual ?? 0, 2)}</span>
            </p>
            <div>
              <Label>Tipo de movimiento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (suma)</SelectItem>
                  <SelectItem value="salida">Salida (resta)</SelectItem>
                  <SelectItem value="ajuste">Ajuste (fija el valor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: recuento físico, rotura, faltante"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjuste(null)}>
              Cancelar
            </Button>
            <Button disabled={registrar.isPending || !cantidad} onClick={() => registrar.mutate()}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
