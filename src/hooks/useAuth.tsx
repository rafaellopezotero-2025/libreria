import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "vendedor";

export type Perfil = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  activo: boolean;
};

type AuthState = {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  rol: AppRole | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [rol, setRol] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarDatos = async (userId: string, meta: Record<string, unknown>, email: string) => {
    await supabase.rpc("bootstrap_usuario", {
      p_nombre: (meta["nombre"] as string) ?? "",
      p_apellido: (meta["apellido"] as string) ?? "",
      p_email: email,
    });
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id,nombre,apellido,email,activo").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    ]);
    setPerfil((p as Perfil) ?? null);
    setRol((r?.role as AppRole) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setPerfil(null);
        setRol(null);
        setLoading(false);
        return;
      }
      setTimeout(() => {
        void cargarDatos(s.user.id, s.user.user_metadata ?? {}, s.user.email ?? "").finally(() =>
          setLoading(false),
        );
      }, 0);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    perfil,
    rol,
    isAdmin: rol === "admin",
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refresh: async () => {
      if (session) await cargarDatos(session.user.id, session.user.user_metadata ?? {}, session.user.email ?? "");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
