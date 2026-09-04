import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/AdminOnly";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fechaHora } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios y roles — Gestión de Librería" },
      { name: "description", content: "Administración de usuarios, roles (admin/vendedor) y estado de acceso." },
      { property: "og:title", content: "Usuarios y roles — Gestión de Librería" },
      { property: "og:description", content: "Gestión de accesos del equipo de la librería." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <Usuarios />
    </AdminOnly>
  ),
});

type Perfil = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
  ultimo_acceso: string | null;
  created_at: string;
};

function Usuarios() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const perfilesQ = useQuery({
    queryKey: ["perfiles_admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at");
      if (error) throw error;
      return (data ?? []) as unknown as Perfil[];
    },
  });

  const rolesQ = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("id,user_id,role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const cambiarRol = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "vendedor" }) => {
      const existente = rolesQ.data?.find((r) => r.user_id === userId);
      const { error } = existente
        ? await supabase.from("user_roles").update({ role }).eq("id", existente.id)
        : await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      void qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cambiarActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase.from("profiles").update({ activo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuario actualizado");
      void qc.invalidateQueries({ queryKey: ["perfiles_admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rolDe = (id: string) => rolesQ.data?.find((r) => r.user_id === id)?.role ?? "vendedor";

  const columns: Column<Perfil>[] = [
    {
      key: "nombre",
      header: "Usuario",
      sortValue: (r) => r.email,
      cell: (r) => (
        <div>
          <p className="font-medium">
            {`${r.nombre} ${r.apellido}`.trim() || r.email}
            {r.id === user?.id && <Badge className="ml-2" variant="secondary">vos</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (r) => (
        <Select
          value={rolDe(r.id)}
          onValueChange={(v) => cambiarRol.mutate({ userId: r.id, role: v as "admin" | "vendedor" })}
          disabled={r.id === user?.id}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="vendedor">Vendedor</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "activo",
      header: "Activo",
      cell: (r) => (
        <Switch
          checked={r.activo}
          disabled={r.id === user?.id}
          onCheckedChange={(v) => cambiarActivo.mutate({ id: r.id, activo: v })}
        />
      ),
    },
    { key: "alta", header: "Alta", cell: (r) => fechaHora(r.created_at) },
    { key: "acceso", header: "Último acceso", cell: (r) => fechaHora(r.ultimo_acceso) },
  ];

  return (
    <>
      <PageHeader
        title="Usuarios y roles"
        description="Asigná el rol de cada persona del equipo y controlá su acceso al sistema."
      />
      <DataTable
        rows={perfilesQ.data ?? []}
        columns={columns}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.nombre} ${r.apellido} ${r.email}`}
        empty={perfilesQ.isLoading ? "Cargando..." : "Sin usuarios"}
      />
      <p className="mt-4 text-xs text-muted-foreground">
        Los usuarios nuevos se registran desde la pantalla de ingreso. El primer usuario del sistema queda como
        administrador y el resto como vendedor hasta que se cambie el rol acá.
      </p>
    </>
  );
}
