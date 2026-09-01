import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/format";
import { estadoStock } from "@/lib/stock";
import { Carrito, useCatalogo, type ItemCarrito } from "@/components/Carrito";

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
