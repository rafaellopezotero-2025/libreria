import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, num } from "@/lib/format";
import { ESTADO_CLASS, ESTADO_LABEL, estadoStock } from "@/lib/stock";
import { exportarCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/productos")({
  head: () => ({
    meta: [
      { title: "Productos e insumos — Gestión de Librería" },
      { name: "description", content: "Catálogo de productos e insumos: precios, costos, stock y categorías." },
      { property: "og:title", content: "Productos e insumos — Gestión de Librería" },
      { property: "og:description", content: "Catálogo de productos e insumos de la librería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Productos,
});

type Producto = {
  id: string;
  tipo: "producto" | "insumo";
  sku: string;
  codigo_barras: string | null;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  marca: string | null;
  proveedor_id: string | null;
  precio_costo: number;
  precio_venta: number;
  stock_actual: number;
  stock_minimo: number;
  punto_reposicion: number;
  stock_objetivo: number;
  unidad: string;
  activo: boolean;
};

const vacio = {
  tipo: "producto",
  sku: "",
  codigo_barras: "",
  nombre: "",
  descripcion: "",
  categoria_id: "",
  marca: "",
  proveedor_id: "",
  precio_costo: "0",
  precio_venta: "0",
  stock_actual: "0",
  stock_minimo: "0",
  punto_reposicion: "0",
  stock_objetivo: "0",
  unidad: "unidad",
  activo: true,
};

function Productos() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...vacio });

  const productosQ = useQuery({
    queryKey: ["productos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("productos").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Producto[];
    },
  });
  const categoriasQ = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("id,nombre").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });
  const proveedoresQ = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proveedores").select("id,nombre").order("nombre");
      if (error) throw error;
      return data ?? [];
    },
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        tipo: form.tipo as "producto" | "insumo",
        sku: form.sku.trim(),
        codigo_barras: form.codigo_barras.trim() || null,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria_id: form.categoria_id || null,
        marca: form.marca.trim() || null,
        proveedor_id: form.proveedor_id || null,
        precio_costo: Number(form.precio_costo) || 0,
        precio_venta: Number(form.precio_venta) || 0,
        stock_minimo: Number(form.stock_minimo) || 0,
        punto_reposicion: Number(form.punto_reposicion) || 0,
        stock_objetivo: Number(form.stock_objetivo) || 0,
        unidad: form.unidad.trim() || "unidad",
        activo: form.activo,
      };
      if (editId) {
        const { error } = await supabase.from("productos").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("productos")
          .insert({ ...payload, stock_actual: Number(form.stock_actual) || 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Producto actualizado" : "Producto creado");
      setAbierto(false);
      void qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nuevo = () => {
    setEditId(null);
    setForm({ ...vacio });
    setAbierto(true);
  };

  const editar = (p: Producto) => {
    setEditId(p.id);
    setForm({
      tipo: p.tipo,
      sku: p.sku,
      codigo_barras: p.codigo_barras ?? "",
      nombre: p.nombre,
      descripcion: p.descripcion ?? "",
      categoria_id: p.categoria_id ?? "",
      marca: p.marca ?? "",
      proveedor_id: p.proveedor_id ?? "",
      precio_costo: String(p.precio_costo),
      precio_venta: String(p.precio_venta),
      stock_actual: String(p.stock_actual),
      stock_minimo: String(p.stock_minimo),
      punto_reposicion: String(p.punto_reposicion),
      stock_objetivo: String(p.stock_objetivo),
      unidad: p.unidad,
      activo: p.activo,
    });
    setAbierto(true);
  };

  const rows = productosQ.data ?? [];
  const catNombre = (id: string | null) => categoriasQ.data?.find((c) => c.id === id)?.nombre ?? "-";

  const columns: Column<Producto>[] = [
    {
      key: "nombre",
      header: "Producto",
      sortValue: (r) => r.nombre.toLowerCase(),
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {r.sku} · {catNombre(r.categoria_id)}
            {r.tipo === "insumo" ? " · insumo" : ""}
          </p>
        </div>
      ),
    },
    {
      key: "precio",
      header: "Precio",
      className: "tabular",
      sortValue: (r) => Number(r.precio_venta),
      cell: (r) => money(r.precio_venta),
    },
    {
      key: "costo",
      header: "Costo",
      className: "tabular",
      sortValue: (r) => Number(r.precio_costo),
      cell: (r) => money(r.precio_costo),
    },
    {
      key: "stock",
      header: "Stock",
      className: "tabular",
      sortValue: (r) => Number(r.stock_actual),
      cell: (r) => `${num(r.stock_actual, 2)} ${r.unidad}`,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (r) => (
        <Badge variant="outline" className={ESTADO_CLASS[estadoStock(r)]}>
          {ESTADO_LABEL[estadoStock(r)]}
        </Badge>
      ),
    },
    {
      key: "activo",
      header: "Activo",
      cell: (r) => (r.activo ? <Badge variant="outline">Sí</Badge> : <Badge variant="secondary">No</Badge>),
    },
    ...(isAdmin
      ? [
          {
            key: "acciones",
            header: "",
            cell: (r: Producto) => (
              <Button variant="ghost" size="sm" onClick={() => editar(r)}>
                <Pencil className="size-4" />
              </Button>
            ),
          } as Column<Producto>,
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Productos e insumos"
        description="Catálogo completo con precios, costos y parámetros de stock."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() =>
                exportarCSV(
                  "productos",
                  rows.map((r) => ({
                    sku: r.sku,
                    nombre: r.nombre,
                    categoria: catNombre(r.categoria_id),
                    tipo: r.tipo,
                    costo: r.precio_costo,
                    precio: r.precio_venta,
                    stock: r.stock_actual,
                    minimo: r.stock_minimo,
                    reposicion: r.punto_reposicion,
                    objetivo: r.stock_objetivo,
                    activo: r.activo ? "sí" : "no",
                  })),
                )
              }
            >
              <Download className="size-4" /> Exportar
            </Button>
            {isAdmin && (
              <Button onClick={nuevo}>
                <Plus className="size-4" /> Nuevo producto
              </Button>
            )}
          </>
        }
      />

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.nombre} ${r.sku} ${r.marca ?? ""} ${r.codigo_barras ?? ""}`}
        empty={productosQ.isLoading ? "Cargando..." : "Sin productos cargados"}
      />

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <Label>SKU</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Código de barras</Label>
              <Input
                value={form.codigo_barras}
                onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="producto">Producto</SelectItem>
                  <SelectItem value="insumo">Insumo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={form.categoria_id || "none"}
                onValueChange={(v) => setForm({ ...form, categoria_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categoriasQ.data?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Marca</Label>
              <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Select
                value={form.proveedor_id || "none"}
                onValueChange={(v) => setForm({ ...form, proveedor_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                  {proveedoresQ.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Precio de costo</Label>
              <Input
                type="number"
                value={form.precio_costo}
                onChange={(e) => setForm({ ...form, precio_costo: e.target.value })}
              />
            </div>
            <div>
              <Label>Precio de venta</Label>
              <Input
                type="number"
                value={form.precio_venta}
                onChange={(e) => setForm({ ...form, precio_venta: e.target.value })}
              />
            </div>
            {!editId && (
              <div>
                <Label>Stock inicial</Label>
                <Input
                  type="number"
                  value={form.stock_actual}
                  onChange={(e) => setForm({ ...form, stock_actual: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Stock mínimo</Label>
              <Input
                type="number"
                value={form.stock_minimo}
                onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })}
              />
            </div>
            <div>
              <Label>Punto de reposición</Label>
              <Input
                type="number"
                value={form.punto_reposicion}
                onChange={(e) => setForm({ ...form, punto_reposicion: e.target.value })}
              />
            </div>
            <div>
              <Label>Stock objetivo</Label>
              <Input
                type="number"
                value={form.stock_objetivo}
                onChange={(e) => setForm({ ...form, stock_objetivo: e.target.value })}
              />
            </div>
            <div>
              <Label>Unidad</Label>
              <Input value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
              <Label>Producto activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!form.nombre.trim() || !form.sku.trim() || guardar.isPending}
              onClick={() => guardar.mutate()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
