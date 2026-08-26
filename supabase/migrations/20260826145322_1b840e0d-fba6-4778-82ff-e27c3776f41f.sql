-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','vendedor');
CREATE TYPE public.tipo_item AS ENUM ('producto','insumo');
CREATE TYPE public.estado_venta AS ENUM ('confirmada','anulada');
CREATE TYPE public.clase_servicio AS ENUM ('fotocopia','impresion');
CREATE TYPE public.tipo_mov_stock AS ENUM ('entrada','salida','ajuste','venta','anulacion','compra');
CREATE TYPE public.tipo_mov_caja AS ENUM ('apertura','venta','ingreso','retiro','gasto','ajuste');
CREATE TYPE public.metodo_pago AS ENUM ('efectivo','transferencia','debito','credito','mercadopago','otro');
CREATE TYPE public.estado_compra AS ENUM ('borrador','confirmada','anulada');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  apellido text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  ultimo_acceso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin());
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  cuit text,
  telefono text,
  email text,
  direccion text,
  contacto text,
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.tipo_item NOT NULL DEFAULT 'producto',
  sku text NOT NULL UNIQUE,
  codigo_barras text,
  nombre text NOT NULL,
  descripcion text,
  categoria_id uuid REFERENCES public.categorias(id),
  marca text,
  proveedor_id uuid REFERENCES public.proveedores(id),
  precio_costo numeric(12,2) NOT NULL DEFAULT 0,
  precio_venta numeric(12,2) NOT NULL DEFAULT 0,
  stock_actual numeric(12,2) NOT NULL DEFAULT 0,
  stock_minimo numeric(12,2) NOT NULL DEFAULT 0,
  punto_reposicion numeric(12,2) NOT NULL DEFAULT 0,
  stock_objetivo numeric(12,2) NOT NULL DEFAULT 0,
  unidad text NOT NULL DEFAULT 'unidad',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_productos_nombre ON public.productos (lower(nombre));
CREATE INDEX idx_productos_sku ON public.productos (sku);

CREATE TABLE public.productos_proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  proveedor_id uuid NOT NULL REFERENCES public.proveedores(id) ON DELETE CASCADE,
  costo numeric(12,2),
  UNIQUE (producto_id, proveedor_id)
);

CREATE TABLE public.servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clase public.clase_servicio NOT NULL,
  nombre text NOT NULL,
  tipo_papel text,
  tamano text NOT NULL DEFAULT 'A4',
  color boolean NOT NULL DEFAULT false,
  doble_faz boolean NOT NULL DEFAULT false,
  precio_unitario numeric(12,2) NOT NULL DEFAULT 0,
  insumo_id uuid REFERENCES public.productos(id),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cajas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  abierta_por uuid REFERENCES auth.users(id),
  cerrada_por uuid REFERENCES auth.users(id),
  monto_inicial numeric(12,2) NOT NULL DEFAULT 0,
  monto_contado numeric(12,2),
  total_esperado numeric(12,2),
  diferencia numeric(12,2),
  abierta_at timestamptz NOT NULL DEFAULT now(),
  cerrada_at timestamptz,
  estado text NOT NULL DEFAULT 'abierta',
  observaciones text
);

CREATE SEQUENCE public.venta_numero_seq;
CREATE TABLE public.ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  usuario_id uuid REFERENCES auth.users(id),
  caja_id uuid REFERENCES public.cajas(id),
  fecha timestamptz NOT NULL DEFAULT now(),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  descuento numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  metodo_pago public.metodo_pago NOT NULL DEFAULT 'efectivo',
  estado public.estado_venta NOT NULL DEFAULT 'confirmada',
  observaciones text,
  anulada_at timestamptz,
  anulada_por uuid REFERENCES auth.users(id),
  motivo_anulacion text
);
CREATE INDEX idx_ventas_fecha ON public.ventas (fecha);

CREATE TABLE public.detalle_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id uuid NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES public.productos(id),
  servicio_id uuid REFERENCES public.servicios(id),
  descripcion text NOT NULL,
  categoria_id uuid REFERENCES public.categorias(id),
  cantidad numeric(12,2) NOT NULL,
  precio_unitario numeric(12,2) NOT NULL,
  costo_unitario numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL
);
CREATE INDEX idx_detalle_ventas_venta ON public.detalle_ventas (venta_id);

CREATE SEQUENCE public.compra_numero_seq;
CREATE TABLE public.compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE,
  proveedor_id uuid REFERENCES public.proveedores(id),
  usuario_id uuid REFERENCES auth.users(id),
  fecha date NOT NULL DEFAULT current_date,
  comprobante text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  descuento numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  estado public.estado_compra NOT NULL DEFAULT 'borrador',
  observaciones text,
  confirmada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.detalle_compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  cantidad numeric(12,2) NOT NULL,
  precio_costo numeric(12,2) NOT NULL DEFAULT 0,
  subtotal numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE public.movimientos_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id uuid NOT NULL REFERENCES public.productos(id),
  usuario_id uuid REFERENCES auth.users(id),
  tipo public.tipo_mov_stock NOT NULL,
  cantidad numeric(12,2) NOT NULL,
  stock_resultante numeric(12,2),
  motivo text,
  referencia_id uuid,
  fecha timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mov_stock_prod ON public.movimientos_stock (producto_id, fecha);

CREATE TABLE public.movimientos_caja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id uuid REFERENCES public.cajas(id),
  usuario_id uuid REFERENCES auth.users(id),
  tipo public.tipo_mov_caja NOT NULL,
  concepto text NOT NULL,
  metodo_pago public.metodo_pago NOT NULL DEFAULT 'efectivo',
  importe numeric(12,2) NOT NULL,
  venta_id uuid REFERENCES public.ventas(id),
  fecha timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid REFERENCES auth.users(id),
  accion text NOT NULL,
  modulo text NOT NULL,
  registro_id uuid,
  descripcion text NOT NULL,
  fecha timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auditoria_fecha ON public.auditoria (fecha);

CREATE TABLE public.configuracion (
  clave text PRIMARY KEY,
  valor text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias, public.proveedores, public.productos,
  public.productos_proveedores, public.servicios, public.cajas, public.ventas, public.detalle_ventas,
  public.compras, public.detalle_compras, public.movimientos_stock, public.movimientos_caja,
  public.auditoria, public.configuracion TO authenticated;
GRANT ALL ON public.categorias, public.proveedores, public.productos, public.productos_proveedores,
  public.servicios, public.cajas, public.ventas, public.detalle_ventas, public.compras,
  public.detalle_compras, public.movimientos_stock, public.movimientos_caja, public.auditoria,
  public.configuracion TO service_role;
GRANT USAGE ON SEQUENCE public.venta_numero_seq, public.compra_numero_seq TO authenticated, service_role;

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cajas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_select" ON public.categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "prov_select" ON public.proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "prod_select" ON public.productos FOR SELECT TO authenticated USING (true);
CREATE POLICY "pp_select" ON public.productos_proveedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "serv_select" ON public.servicios FOR SELECT TO authenticated USING (true);
CREATE POLICY "cajas_select" ON public.cajas FOR SELECT TO authenticated USING (true);
CREATE POLICY "ventas_select" ON public.ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "dv_select" ON public.detalle_ventas FOR SELECT TO authenticated USING (true);
CREATE POLICY "compras_select" ON public.compras FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "dc_select" ON public.detalle_compras FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "ms_select" ON public.movimientos_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "mc_select" ON public.movimientos_caja FOR SELECT TO authenticated USING (true);
CREATE POLICY "aud_select" ON public.auditoria FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "conf_select" ON public.configuracion FOR SELECT TO authenticated USING (true);

CREATE POLICY "cat_admin" ON public.categorias FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "prov_admin" ON public.proveedores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "prod_admin" ON public.productos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "pp_admin" ON public.productos_proveedores FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "serv_admin" ON public.servicios FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "compras_admin" ON public.compras FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "dc_admin" ON public.detalle_compras FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "conf_admin" ON public.configuracion FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "cajas_insert" ON public.cajas FOR INSERT TO authenticated WITH CHECK (abierta_por = auth.uid());
CREATE POLICY "cajas_update" ON public.cajas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "mc_insert" ON public.movimientos_caja FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());