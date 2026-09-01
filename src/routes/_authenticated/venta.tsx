import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money, METODOS_PAGO } from "@/lib/format";
import { estadoStock } from "@/lib/stock";

export const Route = createFileRoute("/_authenticated/venta")({
  head: () => ({
    meta: [
      { title: "Nueva venta — Gestión de Librería" },
      { name: "description", content: "Punto de venta rápido para productos y servicios de copiado." },
      { property: "og:title", content: "Nueva venta — Gestión de Librería" },
      { property: "og:description", content: "Punto de venta rápido para productos y servicios de copiado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuevaVenta,
});

export type ItemCarrito = {
  key: string;
  producto_id: string | null;
  servicio_id: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  stock?: number;
};

export function useCatalogo() {
  const productosQ = useQuery({
    queryKey: ["catalogo-productos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("productos")
        .select("id,nombre,sku,codigo_barras,precio_venta,stock_actual,stock_minimo,punto_reposicion,stock_objetivo,categoria_id,categorias(nombre)")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  const serviciosQ = useQuery({
    queryKey: ["catalogo-servicios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("servicios")
        .select("id,nombre,clase,tamano,color,doble_faz,precio_unitario")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });

  return { productosQ, serviciosQ };
}

export function Carrito({
  items,
  setItems,
  titulo = "Carrito",
}: {
  items: ItemCarrito[];
  setItems: (fn: (prev: ItemCarrito[]) => ItemCarrito[]) => void;
  titulo?: string;
}) {
  const qc = useQueryClient();
  const [metodo, setMetodo] = useState<string>("efectivo");
  const [descuento, setDescuento] = useState("0");
  const [obs, setObs] = useState("");
  const [guardando, setGuardando] = useState(false);

  const subtotal = items.reduce((a, i) => a + i.cantidad * i.precio_unitario, 0);
  const desc = Math.max(0, Number(descuento) || 0);
  const total = Math.max(0, subtotal - desc);

  const cambiar = (key: string, delta: number) =>
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.key !== key) return [i];
        const c = i.cantidad + delta;
        return c <= 0 ? [] : [{ ...i, cantidad: c }];
      }),
    );

  const confirmar = async () => {
    if (!items.length) return;
    setGuardando(true);
    const { data, error } = await supabase.rpc("crear_venta", {
      p_items: items.map((i) => ({
        producto_id: i.producto_id,
        servicio_id: i.servicio_id,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
      })),
      p_metodo: metodo as never,
      p_descuento: desc,
      p_observaciones: obs || undefined,
    });
    setGuardando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const venta = data as unknown as { numero: string; total: number };
    toast.success(`Venta ${venta.numero} registrada por ${money(venta.total)}`);
    setItems(() => []);
    setDescuento("0");
    setObs("");
    void qc.invalidateQueries();
  };

  return (
    <Card className="lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="size-4" /> {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Agregá productos o servicios.</p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.key} className="rounded-lg border p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{i.descripcion}</p>
                  <button
                    aria-label="Quitar"
                    onClick={() => setItems((prev) => prev.filter((x) => x.key !== i.key))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="size-7" onClick={() => cambiar(i.key, -1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-10 text-center text-sm tabular">{i.cantidad}</span>
                    <Button variant="outline" size="icon" className="size-7" onClick={() => cambiar(i.key, 1)}>
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <span className="text-sm font-semibold tabular">{money(i.cantidad * i.precio_unitario)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t pt-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular">{money(subtotal)}</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-2">
            <Label htmlFor="descuento" className="text-sm text-muted-foreground">
              Descuento
            </Label>
            <Input
              id="descuento"
              type="number"
              min="0"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
              className="h-8 text-right"
            />
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="tabular">{money(total)}</span>
          </div>
          <Select value={metodo} onValueChange={setMetodo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METODOS_PAGO.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Observaciones (opcional)"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            rows={2}
          />
          <Button className="w-full" disabled={!items.length || guardando} onClick={() => void confirmar()}>
            {guardando ? "Registrando..." : "Confirmar venta"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NuevaVenta() {
  const { productosQ, serviciosQ } = useCatalogo();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [q, setQ] = useState("");

  const productos = productosQ.data ?? [];
  const servicios = serviciosQ.data ?? [];

  const filtrados = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return productos.slice(0, 60);
    return productos
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(n) ||
          p.sku.toLowerCase().includes(n) ||
          (p.codigo_barras ?? "").toLowerCase().includes(n),
      )
      .slice(0, 60);
  }, [productos, q]);

  const agregarProducto = (p: (typeof productos)[number]) =>
    setItems((prev) => {
      const found = prev.find((i) => i.producto_id === p.id);
      if (found) return prev.map((i) => (i.producto_id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [
        ...prev,
        {
          key: `p-${p.id}`,
          producto_id: p.id,
          servicio_id: null,
          descripcion: p.nombre,
          cantidad: 1,
          precio_unitario: Number(p.precio_venta),
          stock: Number(p.stock_actual),
        },
      ];
    });

  const agregarServicio = (s: (typeof servicios)[number]) =>
    setItems((prev) => {
      const found = prev.find((i) => i.servicio_id === s.id);
      if (found) return prev.map((i) => (i.servicio_id === s.id ? { ...i, cantidad: i.cantidad + 1 } : i));
      return [
        ...prev,
        {
          key: `s-${s.id}`,
          producto_id: null,
          servicio_id: s.id,
          descripcion: s.nombre,
          cantidad: 1,
          precio_unitario: Number(s.precio_unitario),
        },
      ];
    });

  return (
    <div>
      <PageHeader title="Nueva venta" description="Buscá por nombre, SKU o código de barras y armá el ticket." />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          <Tabs defaultValue="productos">
            <TabsList>
              <TabsTrigger value="productos">Productos</TabsTrigger>
              <TabsTrigger value="servicios">Servicios</TabsTrigger>
            </TabsList>

            <TabsContent value="productos" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-9"
                  placeholder="Buscar producto..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filtrados.map((p) => {
                  const est = estadoStock(p);
                  return (
                    <button
                      key={p.id}
                      onClick={() => agregarProducto(p)}
                      className="rounded-xl border bg-card p-3 text-left shadow-card transition-colors hover:border-primary"
                    >
                      <p className="line-clamp-2 text-sm font-medium">{p.nombre}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{p.sku}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-semibold tabular">{money(p.precio_venta)}</span>
                        <span
                          className={
                            est === "sin_stock"
                              ? "text-xs text-destructive"
                              : est === "normal"
                                ? "text-xs text-muted-foreground"
                                : "text-xs text-warning"
                          }
                        >
                          stock {Number(p.stock_actual)}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filtrados.length === 0 && (
                  <p className="col-span-full py-8 text-center text-sm text-muted-foreground">Sin coincidencias.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="servicios" className="mt-3">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {servicios.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => agregarServicio(s)}
                    className="rounded-xl border bg-card p-3 text-left shadow-card transition-colors hover:border-primary"
                  >
                    <p className="text-sm font-medium">{s.nombre}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">
                      {s.clase} · {s.tamano} · {s.color ? "color" : "B/N"}
                      {s.doble_faz ? " · doble faz" : ""}
                    </p>
                    <p className="mt-2 font-semibold tabular">{money(s.precio_unitario)}</p>
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <Carrito items={items} setItems={setItems} />
      </div>
    </div>
  );
}
