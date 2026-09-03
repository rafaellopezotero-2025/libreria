import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/AdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/proveedores")({
  head: () => ({
    meta: [
      { title: "Proveedores — Gestión de Librería" },
      { name: "description", content: "Alta y edición de proveedores con datos de contacto y CUIT." },
      { property: "og:title", content: "Proveedores — Gestión de Librería" },
      { property: "og:description", content: "Administración de proveedores de la librería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <Proveedores />
    </AdminOnly>
  ),
});

type Proveedor = {
  id: string;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  contacto: string | null;
  observaciones: string | null;
  activo: boolean;
};

const vacio = {
  nombre: "",
  cuit: "",
  telefono: "",
  email: "",
  direccion: "",
  contacto: "",
  observaciones: "",
  activo: true,
};

function Proveedores() {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...vacio });

  const q = useQuery({
    queryKey: ["proveedores_full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("proveedores").select("*").order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Proveedor[];
    },
  });

  const guardar = useMutation({
    mutationFn: async () => {
      const payload = {
        nombre: form.nombre.trim(),
        cuit: form.cuit.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        direccion: form.direccion.trim() || null,
        contacto: form.contacto.trim() || null,
        observaciones: form.observaciones.trim() || null,
        activo: form.activo,
      };
      const { error } = editId
        ? await supabase.from("proveedores").update(payload).eq("id", editId)
        : await supabase.from("proveedores").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editId ? "Proveedor actualizado" : "Proveedor creado");
      setAbierto(false);
      void qc.invalidateQueries({ queryKey: ["proveedores_full"] });
      void qc.invalidateQueries({ queryKey: ["proveedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Proveedor>[] = [
    {
      key: "nombre",
      header: "Proveedor",
      sortValue: (r) => r.nombre.toLowerCase(),
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nombre}</p>
          <p className="text-xs text-muted-foreground">{r.cuit ?? "sin CUIT"}</p>
        </div>
      ),
    },
    { key: "contacto", header: "Contacto", cell: (r) => r.contacto ?? "-" },
    { key: "tel", header: "Teléfono", cell: (r) => r.telefono ?? "-" },
    { key: "email", header: "Email", cell: (r) => r.email ?? "-" },
    { key: "dir", header: "Dirección", cell: (r) => r.direccion ?? "-" },
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
            setEditId(r.id);
            setForm({
              nombre: r.nombre,
              cuit: r.cuit ?? "",
              telefono: r.telefono ?? "",
              email: r.email ?? "",
              direccion: r.direccion ?? "",
              contacto: r.contacto ?? "",
              observaciones: r.observaciones ?? "",
              activo: r.activo,
            });
            setAbierto(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Proveedores"
        description="Datos de contacto y estado de cada proveedor."
        actions={
          <Button
            onClick={() => {
              setEditId(null);
              setForm({ ...vacio });
              setAbierto(true);
            }}
          >
            <Plus className="size-4" /> Nuevo proveedor
          </Button>
        }
      />

      <DataTable
        rows={q.data ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.nombre} ${r.cuit ?? ""} ${r.contacto ?? ""} ${r.email ?? ""}`}
        empty={q.isLoading ? "Cargando..." : "Sin proveedores"}
      />

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <Label>CUIT</Label>
              <Input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
            </div>
            <div>
              <Label>Contacto</Label>
              <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observaciones</Label>
              <Textarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
              <Label>Proveedor activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button disabled={!form.nombre.trim() || guardar.isPending} onClick={() => guardar.mutate()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
