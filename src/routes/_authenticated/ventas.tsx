import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, fechaHora, labelMetodo, isoDay } from "@/lib/format";
import { calcularRango, RANGOS, type RangoKey } from "@/lib/rango";
import { exportarCSV } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/ventas")({
  head: () => ({
    meta: [
      { title: "Historial de ventas — Gestión de Librería" },
      { name: "description", content: "Consultá, filtrá y anulá ventas registradas en el sistema." },
      { property: "og:title", content: "Historial de ventas — Gestión de Librería" },
      { property: "og:description", content: "Consultá, filtrá y anulá ventas registradas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ventas,
});

type Venta = {
  id: string;
  numero: string;
  fecha: string;
  total: number;
  subtotal: number;
  descuento: number;
  metodo_pago: string;
  estado: string;
  observaciones: string | null;
  motivo_anulacion: string | null;
  profiles: { nombre: string; apellido: string } | null;
};

function Ventas() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [rango, setRango] = useState<RangoKey>("30dias");
  const [desdeStr, setDesdeStr] = useState(isoDay(new Date()));
  const [hastaStr, setHastaStr] = useState(isoDay(new Date()));
  const { desde, hasta } = calcularRango(rango, desdeStr, hastaStr);
  const [detalle, setDetalle] = useState<Venta | null>(null);
  const [anular, setAnular] = useState<Venta | null>(null);
  const [motivo, setMotivo] = useState("");

  const ventasQ = useQuery({
    queryKey: ["ventas", desde.toISOString(), hasta.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventas")
        .select("id,numero,fecha,total,subtotal,descuento,metodo_pago,estado,observaciones,motivo_anulacion,usuario_id")
        .gte("fecha", desde.toISOString())
        .lte("fecha", hasta.toISOString())
        .order("fecha", { ascending: false });
      if (error) throw error;
      const { data: perfiles } = await supabase.from("profiles").select("id,nombre,apellido");
      const map = new Map((perfiles ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((v) => ({
        ...v,
        profiles: map.get(v.usuario_id ?? "") ?? null,
      })) as unknown as Venta[];
    },
  });

  const detalleQ = useQuery({
    queryKey: ["venta-detalle", detalle?.id],
    enabled: !!detalle,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detalle_ventas")
        .select("id,descripcion,cantidad,precio_unitario,subtotal")
        .eq("venta_id", detalle!.id);
      if (error) throw error;
      return data;
    },
  });

  const ventas = ventasQ.data ?? [];
  const totalOk = ventas.filter((v) => v.estado === "confirmada").reduce((a, v) => a + Number(v.total), 0);

  const confirmarAnulacion = async () => {
    if (!anular || motivo.trim().length < 3) {
      toast.error("Ingresá un motivo de al menos 3 caracteres.");
      return;
    }
    const { error } = await supabase.rpc("anular_venta", { p_venta_id: anular.id, p_motivo: motivo.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Venta ${anular.numero} anulada`);
    setAnular(null);
    setMotivo("");
    void qc.invalidateQueries();
  };

  const columns: Column<Venta>[] = [
    { key: "numero", header: "Número", cell: (v) => <span className="font-medium">{v.numero}</span>, sortValue: (v) => v.numero },
    { key: "fecha", header: "Fecha", cell: (v) => fechaHora(v.fecha), sortValue: (v) => v.fecha },
    {
      key: "usuario",
      header: "Vendedor",
      cell: (v) => (v.profiles ? `${v.profiles.nombre} ${v.profiles.apellido}`.trim() || "-" : "-"),
    },
    { key: "metodo", header: "Pago", cell: (v) => labelMetodo(v.metodo_pago) },
    { key: "total", header: "Total", cell: (v) => <span className="tabular">{money(v.total)}</span>, sortValue: (v) => Number(v.total), className: "text-right" },
    {
      key: "estado",
      header: "Estado",
      cell: (v) => (
        <Badge variant={v.estado === "anulada" ? "destructive" : "secondary"} className="capitalize">
          {v.estado}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "",
      cell: (v) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label="Ver detalle" onClick={() => setDetalle(v)}>
            <Eye className="size-4" />
          </Button>
          {isAdmin && v.estado === "confirmada" && (
            <Button variant="ghost" size="icon" aria-label="Anular" onClick={() => setAnular(v)}>
              <Ban className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Ventas"
        description={`Total confirmado del período: ${money(totalOk)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={rango} onValueChange={(v) => setRango(v as RangoKey)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGOS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rango === "personalizado" && (
              <>
                <Input type="date" value={desdeStr} onChange={(e) => setDesdeStr(e.target.value)} className="w-40" />
                <Input type="date" value={hastaStr} onChange={(e) => setHastaStr(e.target.value)} className="w-40" />
              </>
            )}
            <Button
              variant="outline"
              onClick={() =>
                exportarCSV(
                  "ventas",
                  ventas.map((v) => ({
                    numero: v.numero,
                    fecha: fechaHora(v.fecha),
                    metodo: labelMetodo(v.metodo_pago),
                    subtotal: v.subtotal,
                    descuento: v.descuento,
                    total: v.total,
                    estado: v.estado,
                  })),
                )
              }
            >
              <Download className="size-4" /> CSV
            </Button>
          </div>
        }
      />

      <DataTable
        rows={ventas}
        columns={columns}
        rowKey={(v) => v.id}
        searchText={(v) => `${v.numero} ${v.metodo_pago} ${v.estado}`}
        empty="No hay ventas en el período."
      />

      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Venta {detalle?.numero}</DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {fechaHora(detalle.fecha)} · {labelMetodo(detalle.metodo_pago)} · {detalle.estado}
              </p>
              <div className="divide-y rounded-lg border">
                {(detalleQ.data ?? []).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 p-2">
                    <span>
                      {Number(d.cantidad)} × {d.descripcion}
                    </span>
                    <span className="tabular">{money(d.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular">{money(detalle.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span className="tabular">{money(detalle.descuento)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular">{money(detalle.total)}</span>
              </div>
              {detalle.observaciones && <p className="text-muted-foreground">Obs.: {detalle.observaciones}</p>}
              {detalle.motivo_anulacion && (
                <p className="text-destructive">Anulada: {detalle.motivo_anulacion}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!anular} onOpenChange={(o) => !o && setAnular(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular venta {anular?.numero}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El stock de los productos vuelve a su valor anterior y se registra un ajuste en caja.
          </p>
          <Textarea placeholder="Motivo de la anulación" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnular(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void confirmarAnulacion()}>
              Anular venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
