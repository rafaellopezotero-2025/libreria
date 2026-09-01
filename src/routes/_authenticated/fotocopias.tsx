import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/format";
import { Carrito, useCatalogo, type ItemCarrito } from "@/components/Carrito";

export const Route = createFileRoute("/_authenticated/fotocopias")({
  head: () => ({
    meta: [
      { title: "Fotocopias e impresiones — Gestión de Librería" },
      { name: "description", content: "Cobro rápido de fotocopias e impresiones por tamaño, color y faz." },
      { property: "og:title", content: "Fotocopias e impresiones — Gestión de Librería" },
      { property: "og:description", content: "Cobro rápido de fotocopias e impresiones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Fotocopias,
});

const ATAJOS = [1, 5, 10, 20, 50, 100];

function Fotocopias() {
  const { serviciosQ } = useCatalogo();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const servicios = serviciosQ.data ?? [];

  const agregar = (s: (typeof servicios)[number], cantidad: number) =>
    setItems((prev) => {
      const found = prev.find((i) => i.servicio_id === s.id);
      if (found)
        return prev.map((i) => (i.servicio_id === s.id ? { ...i, cantidad: i.cantidad + cantidad } : i));
      return [
        ...prev,
        {
          key: `s-${s.id}`,
          producto_id: null,
          servicio_id: s.id,
          descripcion: s.nombre,
          cantidad,
          precio_unitario: Number(s.precio_unitario),
        },
      ];
    });

  const grupo = (clase: string) => servicios.filter((s) => s.clase === clase);

  const grilla = (clase: string) => (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {grupo(clase).map((s) => (
        <div key={s.id} className="rounded-xl border bg-card p-3 shadow-card">
          <p className="text-sm font-medium">{s.nombre}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.tamano} · {s.color ? "Color" : "Blanco y negro"}
            {s.doble_faz ? " · doble faz" : " · simple faz"}
          </p>
          <p className="mt-2 font-semibold tabular">{money(s.precio_unitario)}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {ATAJOS.map((n) => (
              <button
                key={n}
                onClick={() => agregar(s, n)}
                className="rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5"
              >
                +{n}
              </button>
            ))}
          </div>
        </div>
      ))}
      {grupo(clase).length === 0 && (
        <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
          No hay servicios cargados. Un administrador puede crearlos en Configuración.
        </p>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Fotocopias e impresiones"
        description="Elegí el servicio y sumá copias con los atajos de cantidad."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Tabs defaultValue="fotocopia">
          <TabsList>
            <TabsTrigger value="fotocopia">Fotocopias</TabsTrigger>
            <TabsTrigger value="impresion">Impresiones</TabsTrigger>
          </TabsList>
          <TabsContent value="fotocopia" className="mt-3">
            {grilla("fotocopia")}
          </TabsContent>
          <TabsContent value="impresion" className="mt-3">
            {grilla("impresion")}
          </TabsContent>
        </Tabs>
        <Carrito items={items} setItems={setItems} titulo="Ticket de copiado" />
      </div>
    </div>
  );
}
