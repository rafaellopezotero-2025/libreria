import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminOnly } from "@/components/AdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, num, fecha, isoDay } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras a proveedores — Gestión de Librería" },
      { name: "description", content: "Registro de compras, confirmación e ingreso automático de stock." },
      { property: "og:title", content: "Compras a proveedores — Gestión de Librería" },
      { property: "og:description", content: "Compras, comprobantes y actualización de inventario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <Compras />
    </AdminOnly>
  ),
});

type Compra = {
  id: string;
  numero: string;
  fecha: string;
  comprobante: string | null;
  subtotal: number;
  descuento: number;
  total: number;
  estado: "borrador" | "confirmada" | "anulada";
  observaciones: string | null;
  proveedores: { nombre: string } | null;
};

type Linea = { producto_id: string; nombre: string; cantidad: number; precio_costo: number };

function Compras() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [nueva, setNueva] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState("");
  const [comprobante, setComprobante] = useState("");
  const [fechaCompra, setFechaCompra] = useState(isoDay(new Date()));
  const [descuento, setDescuento] = useState("0");
  const [observaciones, setObservaciones] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [prodSel, setProdSel] = useState("");

  const comprasQ = useQuery({
    queryKey: ["compras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compras")
        .select("*,proveedores(nombre)")
        .order("fecha", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Compra[];
    },
  });

  const proveedoresQ = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proveedores")
        .select("id,nombre")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const productosQ = useQuery({
    queryKey: ["productos_compra"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id,nombre,sku,precio_costo")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const detalleQ = useQuery({
    queryKey: ["detalle_compra", detalleId],
    enabled: !!detalleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detalle_compras")
        .select("id,cantidad,precio_costo,subtotal,productos(nombre,sku)")
        .eq("compra_id", detalleId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const subtotal = lineas.reduce((a, l) => a + l.cantidad * l.precio_costo, 0);
  const total = Math.max(0, subtotal - (Number(descuento) || 0));

  const crear = useMutation({
    mutationFn: async () => {
      const numero = `C-${Date.now().toString().slice(-8)}`;
      const { data, error } = await supabase
        .from("compras")
        .insert({
          numero,
          proveedor_id: proveedorId || null,
          usuario_id: user!.id,
          fecha: fechaCompra,
          comprobante: comprobante.trim() || null,
          subtotal,
          descuento: Number(descuento) || 0,
          total,
          observaciones: observaciones.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("detalle_compras").insert(
        lineas.map((l) => ({
          compra_id: data.id,
          producto_id: l.producto_id,
          cantidad: l.cantidad,
          precio_costo: l.precio_costo,
          subtotal: l.cantidad * l.precio_costo,
        })),
      );
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Compra registrada como borrador");
      setNueva(false);
      setLineas([]);
      setComprobante("");
      setDescuento("0");
      setObservaciones("");
      void qc.invalidateQueries({ queryKey: ["compras"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("confirmar_compra", { p_compra_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Compra confirmada, stock actualizado");
      void qc.invalidateQueries({ queryKey: ["compras"] });
      void qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const agregarLinea = () => {
    const p = productosQ.data?.find((x) => x.id === prodSel);
    if (!p) return;
    setLineas((prev) =>
      prev.some((l) => l.producto_id === p.id)
        ? prev.map((l) => (l.producto_id === p.id ? { ...l, cantidad: l.cantidad + 1 } : l))
        : [...prev, { producto_id: p.id, nombre: p.nombre, cantidad: 1, precio_costo: Number(p.precio_costo) }],
    );
    setProdSel("");
  };

  const columns: Column<Compra>[] = [
    { key: "numero", header: "N°", sortValue: (r) => r.numero, cell: (r) => r.numero },
    { key: "fecha", header: "Fecha", sortValue: (r) => r.fecha, cell: (r) => fecha(r.fecha) },
    { key: "prov", header: "Proveedor", cell: (r) => r.proveedores?.nombre ?? "-" },
    { key: "comp", header: "Comprobante", cell: (r) => r.comprobante ?? "-" },
    { key: "total", header: "Total", className: "tabular", sortValue: (r) => Number(r.total), cell: (r) => money(r.total) },
    {
      key: "estado",
      header: "Estado",
      cell: (r) => (
        <Badge
          variant="outline"
          className={
            r.estado === "confirmada"
              ? "border-success/30 text-success"
              : r.estado === "anulada"
                ? "border-destructive/30 text-destructive"
                : ""
          }
        >
          {r.estado}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      cell: (r) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setDetalleId(r.id)}>
            <Eye className="size-4" />
          </Button>
          {r.estado === "borrador" && (
            <Button variant="ghost" size="sm" onClick={() => confirmar.mutate(r.id)} disabled={confirmar.isPending}>
              <Check className="size-4 text-success" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Compras"
        description="Cargá compras como borrador y confirmalas para ingresar el stock automáticamente."
        actions={
          <Button onClick={() => setNueva(true)}>
            <Plus className="size-4" /> Nueva compra
          </Button>
        }
      />

      <DataTable
        rows={comprasQ.data ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.numero} ${r.proveedores?.nombre ?? ""} ${r.comprobante ?? ""}`}
        empty={comprasQ.isLoading ? "Cargando..." : "Sin compras registradas"}
      />

      <Dialog open={nueva} onOpenChange={setNueva}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Proveedor</Label>
              <Select value={proveedorId} onValueChange={setProveedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir" />
                </SelectTrigger>
                <SelectContent>
                  {proveedoresQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} />
            </div>
            <div>
              <Label>Comprobante</Label>
              <Input value={comprobante} onChange={(e) => setComprobante(e.target.value)} placeholder="FC A 0001-..." />
            </div>
          </div>

          <div className="mt-2 flex items-end gap-2">
            <div className="flex-1">
              <Label>Agregar producto</Label>
              <Select value={prodSel} onValueChange={setProdSel}>
                <SelectTrigger>
                  <SelectValue placeholder="Buscar producto" />
                </SelectTrigger>
                <SelectContent>
                  {productosQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={agregarLinea} disabled={!prodSel}>
              <Plus className="size-4" /> Agregar
            </Button>
          </div>

          <div className="mt-2 space-y-2">
            {lineas.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Todavía no agregaste productos.</p>
            )}
            {lineas.map((l) => (
              <div key={l.producto_id} className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
                <span className="min-w-40 flex-1 text-sm font-medium">{l.nombre}</span>
                <Input
                  type="number"
                  className="w-24"
                  value={l.cantidad}
                  onChange={(e) =>
                    setLineas((prev) =>
                      prev.map((x) =>
                        x.producto_id === l.producto_id ? { ...x, cantidad: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <Input
                  type="number"
                  className="w-28"
                  value={l.precio_costo}
                  onChange={(e) =>
                    setLineas((prev) =>
                      prev.map((x) =>
                        x.producto_id === l.producto_id ? { ...x, precio_costo: Number(e.target.value) } : x,
                      ),
                    )
                  }
                />
                <span className="tabular w-28 text-right text-sm font-semibold">
                  {money(l.cantidad * l.precio_costo)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLineas((prev) => prev.filter((x) => x.producto_id !== l.producto_id))}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Descuento</Label>
              <Input type="number" value={descuento} onChange={(e) => setDescuento(e.target.value)} />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
            <span className="text-sm text-muted-foreground">Subtotal {money(subtotal)}</span>
            <span className="tabular text-lg font-semibold">Total {money(total)}</span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNueva(false)}>
              Cancelar
            </Button>
            <Button disabled={lineas.length === 0 || crear.isPending} onClick={() => crear.mutate()}>
              Guardar borrador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detalleId} onOpenChange={(o) => !o && setDetalleId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {(detalleQ.data ?? []).map((d) => (
              <div key={d.id as string} className="flex items-center justify-between border-b py-2 text-sm">
                <span>{(d.productos as { nombre?: string } | null)?.nombre ?? "-"}</span>
                <span className="tabular text-muted-foreground">
                  {num(d.cantidad as number, 2)} × {money(d.precio_costo as number)} ={" "}
                  <span className="font-semibold text-foreground">{money(d.subtotal as number)}</span>
                </span>
              </div>
            ))}
            {detalleQ.data?.length === 0 && <p className="text-sm text-muted-foreground">Sin ítems.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
