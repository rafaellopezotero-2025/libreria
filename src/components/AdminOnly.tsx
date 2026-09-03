import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
        <ShieldAlert className="mx-auto size-8 text-warning" />
        <h2 className="mt-3 text-lg font-semibold">Acceso restringido</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta sección está disponible solo para usuarios con rol administrador.
        </p>
      </div>
    );
  return <>{children}</>;
}
