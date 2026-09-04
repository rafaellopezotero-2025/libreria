import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, Plus, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader, StatCard } from "@/components/PageHeader";
import { DataTable, type Column } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, fechaHora, labelMetodo, METODOS_PAGO } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/caja")({
  head: () => ({
    meta: [
      { title: "Caja diaria — Gestión de Librería" },
      { name: "description", content: "Apertura, movimientos, arqueo y cierre de la caja diaria." },
      { property: "og:title", content: "Caja diaria — Gestión de Librería" },
      { property: "og:description", content: "Control de caja: ingresos, retiros, gastos y cierre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Caja,
});

type Caja = {
  id: string;
  monto_inicial: number;
  monto_contado: number | null;
  total_esperado: number | null;
  diferencia: number | null;
  abierta_at: string;
  cerrada_at: string | null;
  estado: string;
  observaciones: string | null;
};

type Mov = {
  id: string;
  tipo: string;
  concepto: string;
  metodo_pago: string;
  importe: number;
  fecha: string;
};

function Caja() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [montoInicial, setMontoInicial] = useState("0");
  const [mov, setMov] = useState({ tipo: "ingreso", concepto: "", metodo: "efectivo", importe: "" });
  const [contado, setContado] = useState("");
  const [obsCierre, setObsCierre] = useState("");

  const cajasQ = useQuery({
    queryKey: ["cajas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cajas")
        .select("*")
        .order("abierta_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Caja[];
    },
  });

  const actual = cajasQ.data?.find((c) => c.estado === "abierta") ?? null;

  const movsQ = useQuery({
    queryKey: ["movimientos_caja", actual?.id],
    enabled: !!actual,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos_caja")
        .select("id,tipo,concepto,metodo_pago,importe,fecha")
        .eq("caja_id", actual!.id)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Mov[];
    },
  });

  const movimientos = movsQ.data ?? [];
  const efectivo = movimientos
    .filter((m) => m.metodo_pago === "efectivo")
    .reduce((a, m) => a + Number(m.importe), 0);
  const otros = movimientos
    .filter((m) => m.metodo_pago !== "efectivo")
    .reduce((a, m) => a + Number(m.importe), 0);
  const ventasTotal = movimientos.filter((m) => m.tipo === "venta").reduce((a, m) => a + Number(m.importe), 0);
  const esperado = Number(actual?.monto_inicial ?? 0) + efectivo;

  const invalidar = () => {
    void qc.invalidateQueries({ queryKey: ["cajas"] });
    void qc.invalidateQueries({ queryKey: ["movimientos_caja"] });
  };

  const abrir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("cajas")
        .insert({ abierta_por: user!.id, monto_inicial: Number(montoInicial) || 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caja abierta");
      setAbrirOpen(false);
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const registrarMov = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("movimientos_caja").insert({
        caja_id: actual!.id,
        usuario_id: user!.id,
        tipo: mov.tipo as "ingreso" | "retiro" | "gasto" | "ajuste",
        concepto: mov.concepto.trim(),
        metodo_pago: mov.metodo as "efectivo",
        importe: mov.tipo === "ingreso" ? Math.abs(Number(mov.importe)) : -Math.abs(Number(mov.importe)),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimiento registrado");
      setMovOpen(false);
      setMov({ tipo: "ingreso", concepto: "", metodo: "efectivo", importe: "" });
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cerrar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("cerrar_caja", {
        p_caja_id: actual!.id,
        p_monto_contado: Number(contado) || 0,
        p_observaciones: obsCierre.trim() || "",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Caja cerrada");
      setCerrarOpen(false);
      setContado("");
      setObsCierre("");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const histColumns: Column<Caja>[] = [
    { key: "apertura", header: "Apertura", cell: (r) => fechaHora(r.abierta_at) },
    { key: "cierre", header: "Cierre", cell: (r) => (r.cerrada_at ? fechaHora(r.cerrada_at) : "-") },
    { key: "inicial", header: "Inicial", className: "tabular", cell: (r) => money(r.monto_inicial) },
    {
      key: "esperado",
      header: "Esperado",
      className: "tabular",
      cell: (r) => (r.total_esperado === null ? "-" : money(r.total_esperado)),
    },
    {
      key: "contado",
      header: "Contado",
      className: "tabular",
      cell: (r) => (r.monto_contado === null ? "-" : money(r.monto_contado)),
    },
    {
      key: "dif",
      header: "Diferencia",
      className: "tabular",
      cell: (r) =>
        r.diferencia === null ? (
          "-"
        ) : (
          <span className={Number(r.diferencia) === 0 ? "text-success" : "text-destructive"}>
            {money(r.diferencia)}
          </span>
        ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (r) => (
        <Badge variant="outline" className={r.estado === "abierta" ? "border-success/30 text-success" : ""}>
          {r.estado}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Caja diaria"
        description="Apertura, movimientos de efectivo, arqueo y cierre con diferencia."
        actions={
          actual ? (
            <>
              <Button variant="outline" onClick={() => setMovOpen(true)}>
                <Plus className="size-4" /> Movimiento
              </Button>
              <Button onClick={() => setCerrarOpen(true)}>
                <LockKeyhole className="size-4" /> Cerrar caja
              </Button>
            </>
          ) : (
            <Button onClick={() => setAbrirOpen(true)}>
              <Unlock className="size-4" /> Abrir caja
            </Button>
          )
        }
      />

      {actual ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Monto inicial" value={money(actual.monto_inicial)} hint={fechaHora(actual.abierta_at)} />
          <StatCard label="Ventas de la caja" value={money(ventasTotal)} tone="success" />
          <StatCard label="Otros medios" value={money(otros)} tone="info" hint="No suman al efectivo" />
          <StatCard label="Efectivo esperado" value={money(esperado)} tone="warning" />
        </div>
      ) : (
        <div className="mb-6 rounded-xl border bg-card p-6 text-sm text-muted-foreground shadow-card">
          No hay una caja abierta. Abrí la caja para poder registrar ventas en efectivo y movimientos.
        </div>
      )}

      <Tabs defaultValue="movimientos">
        <TabsList>
          <TabsTrigger value="movimientos">Movimientos de hoy</TabsTrigger>
          <TabsTrigger value="historial">Historial de cajas</TabsTrigger>
        </TabsList>
        <TabsContent value="movimientos" className="mt-4">
          <DataTable
            rows={movimientos}
            rowKey={(r) => r.id}
            searchText={(r) => `${r.concepto} ${r.tipo}`}
            empty={actual ? "Sin movimientos registrados" : "Abrí una caja para ver movimientos"}
            columns={[
              { key: "fecha", header: "Hora", cell: (r) => fechaHora(r.fecha) },
              { key: "tipo", header: "Tipo", cell: (r) => <Badge variant="outline">{r.tipo}</Badge> },
              { key: "concepto", header: "Concepto", cell: (r) => r.concepto },
              { key: "metodo", header: "Medio", cell: (r) => labelMetodo(r.metodo_pago) },
              {
                key: "importe",
                header: "Importe",
                className: "tabular",
                sortValue: (r) => Number(r.importe),
                cell: (r) => (
                  <span className={Number(r.importe) < 0 ? "text-destructive" : "text-success"}>
                    {money(r.importe)}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="historial" className="mt-4">
          <DataTable
            rows={cajasQ.data ?? []}
            columns={histColumns}
            rowKey={(r) => r.id}
            empty={cajasQ.isLoading ? "Cargando..." : "Sin cajas registradas"}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={abrirOpen} onOpenChange={setAbrirOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir caja</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Monto inicial en efectivo</Label>
            <Input type="number" value={montoInicial} onChange={(e) => setMontoInicial(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbrirOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={abrir.isPending} onClick={() => abrir.mutate()}>
              Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movOpen} onOpenChange={setMovOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo movimiento de caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={mov.tipo} onValueChange={(v) => setMov({ ...mov, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="retiro">Retiro</SelectItem>
                  <SelectItem value="gasto">Gasto</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Medio de pago</Label>
              <Select value={mov.metodo} onValueChange={(v) => setMov({ ...mov, metodo: v })}>
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
            </div>
            <div>
              <Label>Concepto</Label>
              <Input value={mov.concepto} onChange={(e) => setMov({ ...mov, concepto: e.target.value })} />
            </div>
            <div>
              <Label>Importe</Label>
              <Input
                type="number"
                value={mov.importe}
                onChange={(e) => setMov({ ...mov, importe: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!mov.concepto.trim() || !mov.importe || registrarMov.isPending}
              onClick={() => registrarMov.mutate()}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cerrarOpen} onOpenChange={setCerrarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Efectivo esperado: <span className="tabular font-semibold text-foreground">{money(esperado)}</span>
            </p>
            <div>
              <Label>Efectivo contado</Label>
              <Input type="number" value={contado} onChange={(e) => setContado(e.target.value)} />
            </div>
            {contado !== "" && (
              <p className="text-sm">
                Diferencia:{" "}
                <span
                  className={`tabular font-semibold ${
                    Number(contado) - esperado === 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {money(Number(contado) - esperado)}
                </span>
              </p>
            )}
            <div>
              <Label>Observaciones</Label>
              <Textarea value={obsCierre} onChange={(e) => setObsCierre(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCerrarOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={contado === "" || cerrar.isPending} onClick={() => cerrar.mutate()}>
              Cerrar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
