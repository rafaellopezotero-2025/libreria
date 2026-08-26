REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.log_auditoria(text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.caja_abierta_actual() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crear_venta(jsonb, public.metodo_pago, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.anular_venta(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirmar_compra(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_movimiento_stock(uuid, public.tipo_mov_stock, numeric, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cerrar_caja(uuid, numeric, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.crear_venta(jsonb, public.metodo_pago, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_venta(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_compra(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_movimiento_stock(uuid, public.tipo_mov_stock, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cerrar_caja(uuid, numeric, text) TO authenticated;