import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/AdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Gestión de Librería" },
      { name: "description", content: "Datos del comercio, categorías y precios de fotocopias e impresiones." },
      { property: "og:title", content: "Configuración — Gestión de Librería" },
      { property: "og:description", content: "Parámetros generales del sistema de gestión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <Configuracion />
    </AdminOnly>
  ),
});

type Servicio = {
  id: string;
  clase: "fotocopia" | "impresion";
  nombre: string;
  tipo_papel: string | null;
  tamano: string;
  color: boolean;
  doble_faz: boolean;
  precio_unitario: number;
  activo: boolean;
};

type Categoria = { id: string; nombre: string; descripcion: string | null; activo: boolean };

const CLAVES = [
  { clave: "nombre_comercio", label: "Nombre del comercio" },
  { clave: "direccion", label: "Dirección" },
  { clave: "telefono", label: "Teléfono" },
  { clave: "cuit", label: "CUIT" },
  { clave: "leyenda_ticket", label: "Leyenda del ticket" },
];

function Configuracion() {
  const qc = useQueryClient();

  const configQ = useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion").select("clave,valor");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [valores, setValores] = useState<Record<string, string>>({});
  useEffect(() => {
    if (configQ.data) {
      const map: Record<string, string> = {};
      for (const c of configQ.data) map[c.clave] = c.valor ?? "";
      setValores(map);
    }
  }, [configQ.data]);

  const guardarConfig = useMutation({
    mutationFn: async () => {
      const filas = CLAVES.map((c) => ({ clave: c.clave, valor: valores[c.clave] ?? "" }));
      const { error } = await supabase.from("configuracion").upsert(filas, { onConflict: "clave" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración guardada");
      void qc.invalidateQueries({ queryKey: ["configuracion"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ----- servicios -----
  const serviciosQ = useQuery({
    queryKey: ["servicios_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("servicios").select("*").order("clase").order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Servicio[];
    },
  });

  const servVacio = {
    clase: "fotocopia",
    nombre: "",
    tipo_papel: "",
    tamano: "A4",
    color: false,
    doble_faz: false,
    precio_unitario: "0",
    activo: true,
  };
  const [servOpen, setServOpen] = useState(false);
  const [servId, setServId] = useState<string | null>(null);
  const [servForm, setServForm] = useState({ ...servVacio });

  const guardarServicio = useMutation({
    mutationFn: async () => {
      const payload = {
        clase: servForm.clase as "fotocopia" | "impresion",
        nombre: servForm.nombre.trim(),
        tipo_papel: servForm.tipo_papel.trim() || null,
        tamano: servForm.tamano.trim() || "A4",
        color: servForm.color,
        doble_faz: servForm.doble_faz,
        precio_unitario: Number(servForm.precio_unitario) || 0,
        activo: servForm.activo,
      };
      const { error } = servId
        ? await supabase.from("servicios").update(payload).eq("id", servId)
        : await supabase.from("servicios").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Servicio guardado");
      setServOpen(false);
      void qc.invalidateQueries({ queryKey: ["servicios_admin"] });
      void qc.invalidateQueries({ queryKey: ["servicios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ----- categorías -----
  const categoriasQ = useQuery({
    queryKey: ["categorias_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categorias").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Categoria[];
    },
  });

  const [catOpen, setCatOpen] = useState(false);
  const [catId, setCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ nombre: "", descripcion: "", activo: true });

  const guardarCategoria = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: catForm.nombre.trim(),
        descripcion: catForm.descripcion.trim() || null,
        activo: catForm.activo,
      };
      const { error } = catId
        ? await supabase.from("categorias").update(payload).eq("id", catId)
        : await supabase.from("categorias").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoría guardada");
      setCatOpen(false);
      void qc.invalidateQueries({ queryKey: ["categorias_admin"] });
      void qc.invalidateQueries({ queryKey: ["categorias"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const servColumns: Column<Servicio>[] = [
    {
      key: "nombre",
      header: "Servicio",
      sortValue: (r) => r.nombre.toLowerCase(),
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {r.clase} · {r.tamano} · {r.color ? "color" : "B/N"} · {r.doble_faz ? "doble faz" : "simple faz"}
          </p>
        </div>
      ),
    },
    {
      key: "precio",
      header: "Precio",
      className: "tabular",
      sortValue: (r) => Number(r.precio_unitario),
      cell: (r) => money(r.precio_unitario),
    },
    {
      key: "activo",
      header: "Activo",
      cell: (r) => (r.activo ? <Badge variant="outline">Sí</Badge> : <Badge variant="secondary">No</Badge>),
    },
    {
      key: "acciones",
      header: "",
      cell: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setServId(r.id);
            setServForm({
              clase: r.clase,
              nombre: r.nombre,
              tipo_papel: r.tipo_papel ?? "",
              tamano: r.tamano,
              color: r.color,
              doble_faz: r.doble_faz,
              precio_unitario: String(r.precio_unitario),
              activo: r.activo,
            });
            setServOpen(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Configuración" description="Datos del comercio, precios de servicios y categorías." />

      <Tabs defaultValue="comercio">
        <TabsList>
          <TabsTrigger value="comercio">Comercio</TabsTrigger>
          <TabsTrigger value="servicios">Fotocopias e impresiones</TabsTrigger>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
        </TabsList>

        <TabsContent value="comercio" className="mt-4">
          <div className="max-w-xl space-y-4 rounded-xl border bg-card p-5 shadow-card">
            {CLAVES.map((c) => (
              <div key={c.clave}>
                <Label>{c.label}</Label>
                <Input
                  value={valores[c.clave] ?? ""}
                  onChange={(e) => setValores({ ...valores, [c.clave]: e.target.value })}
                />
              </div>
            ))}
            <Button disabled={guardarConfig.isPending} onClick={() => guardarConfig.mutate()}>
              <Save className="size-4" /> Guardar cambios
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="servicios" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setServId(null);
                setServForm({ ...servVacio });
                setServOpen(true);
              }}
            >
              <Plus className="size-4" /> Nuevo servicio
            </Button>
          </div>
          <DataTable
            rows={serviciosQ.data ?? []}
            columns={servColumns}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.nombre} ${r.clase} ${r.tamano}`}
            empty={serviciosQ.isLoading ? "Cargando..." : "Sin servicios cargados"}
          />
        </TabsContent>

        <TabsContent value="categorias" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setCatId(null);
                setCatForm({ nombre: "", descripcion: "", activo: true });
                setCatOpen(true);
              }}
            >
              <Plus className="size-4" /> Nueva categoría
            </Button>
          </div>
          <DataTable
            rows={categoriasQ.data ?? []}
            rowKey={(r) => r.id}
            searchText={(r) => r.nombre}
            empty={categoriasQ.isLoading ? "Cargando..." : "Sin categorías"}
            columns={[
              { key: "nombre", header: "Categoría", sortValue: (r) => r.nombre.toLowerCase(), cell: (r) => r.nombre },
              { key: "desc", header: "Descripción", cell: (r) => r.descripcion ?? "-" },
              {
                key: "activo",
                header: "Activa",
                cell: (r) => (r.activo ? <Badge variant="outline">Sí</Badge> : <Badge variant="secondary">No</Badge>),
              },
              {
                key: "acciones",
                header: "",
                cell: (r) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCatId(r.id);
                      setCatForm({ nombre: r.nombre, descripcion: r.descripcion ?? "", activo: r.activo });
                      setCatOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={servOpen} onOpenChange={setServOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{servId ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={servForm.nombre} onChange={(e) => setServForm({ ...servForm, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Clase</Label>
              <Select value={servForm.clase} onValueChange={(v) => setServForm({ ...servForm, clase: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fotocopia">Fotocopia</SelectItem>
                  <SelectItem value="impresion">Impresión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tamaño</Label>
              <Input value={servForm.tamano} onChange={(e) => setServForm({ ...servForm, tamano: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de papel</Label>
              <Input
                value={servForm.tipo_papel}
                onChange={(e) => setServForm({ ...servForm, tipo_papel: e.target.value })}
              />
            </div>
            <div>
              <Label>Precio unitario</Label>
              <Input
                type="number"
                value={servForm.precio_unitario}
                onChange={(e) => setServForm({ ...servForm, precio_unitario: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={servForm.color} onCheckedChange={(v) => setServForm({ ...servForm, color: v })} />
              <Label>Color</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={servForm.doble_faz}
                onCheckedChange={(v) => setServForm({ ...servForm, doble_faz: v })}
              />
              <Label>Doble faz</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={servForm.activo} onCheckedChange={(v) => setServForm({ ...servForm, activo: v })} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!servForm.nombre.trim() || guardarServicio.isPending}
              onClick={() => guardarServicio.mutate()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catId ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={catForm.nombre} onChange={(e) => setCatForm({ ...catForm, nombre: e.target.value })} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input
                value={catForm.descripcion}
                onChange={(e) => setCatForm({ ...catForm, descripcion: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={catForm.activo} onCheckedChange={(v) => setCatForm({ ...catForm, activo: v })} />
              <Label>Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!catForm.nombre.trim() || guardarCategoria.isPending}
              onClick={() => guardarCategoria.mutate()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
