import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminOnly } from "@/components/AdminOnly";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fechaHora } from "@/lib/format";
import { exportarCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — Gestión de Librería" },
      { name: "description", content: "Registro de acciones realizadas por los usuarios en cada módulo." },
      { property: "og:title", content: "Auditoría — Gestión de Librería" },
      { property: "og:description", content: "Trazabilidad de operaciones del sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AdminOnly>
      <Auditoria />
    </AdminOnly>
  ),
});

type Row = {
  id: string;
  accion: string;
  modulo: string;
  descripcion: string;
  fecha: string;
  usuario_id: string | null;
};

function Auditoria() {
  const q = useQuery({
    queryKey: ["auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auditoria")
        .select("id,accion,modulo,descripcion,fecha,usuario_id")
        .order("fecha", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const perfilesQ = useQuery({
    queryKey: ["perfiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,nombre,apellido,email");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nombre = (id: string | null) => {
    const p = perfilesQ.data?.find((x) => x.id === id);
    return p ? `${p.nombre} ${p.apellido}`.trim() || p.email : "Sistema";
  };

  const rows = q.data ?? [];

  return (
    <>
      <PageHeader
        title="Auditoría"
        description="Últimas 500 acciones registradas en el sistema."
        actions={
          <Button
            variant="outline"
            disabled={rows.length === 0}
            onClick={() =>
              exportarCSV(
                "auditoria",
                rows.map((r) => ({
                  fecha: fechaHora(r.fecha),
                  usuario: nombre(r.usuario_id),
                  modulo: r.modulo,
                  accion: r.accion,
                  descripcion: r.descripcion,
                })),
              )
            }
          >
            <Download className="size-4" /> Exportar
          </Button>
        }
      />

      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        searchText={(r) => `${r.modulo} ${r.accion} ${r.descripcion} ${nombre(r.usuario_id)}`}
        empty={q.isLoading ? "Cargando..." : "Sin registros de auditoría"}
        columns={[
          { key: "fecha", header: "Fecha", sortValue: (r) => r.fecha, cell: (r) => fechaHora(r.fecha) },
          { key: "usuario", header: "Usuario", cell: (r) => nombre(r.usuario_id) },
          { key: "modulo", header: "Módulo", cell: (r) => <Badge variant="outline">{r.modulo}</Badge> },
          { key: "accion", header: "Acción", cell: (r) => r.accion },
          { key: "desc", header: "Descripción", cell: (r) => r.descripcion },
        ]}
      />
    </>
  );
}
