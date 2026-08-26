REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

CREATE OR REPLACE FUNCTION public.log_auditoria(_accion text, _modulo text, _registro uuid, _descripcion text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.auditoria (usuario_id, accion, modulo, registro_id, descripcion)
  VALUES (auth.uid(), _accion, _modulo, _registro, _descripcion);
$$;
REVOKE EXECUTE ON FUNCTION public.log_auditoria(text, text, uuid, text) FROM anon;

CREATE OR REPLACE FUNCTION public.caja_abierta_actual()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.cajas WHERE estado = 'abierta' ORDER BY abierta_at DESC LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.caja_abierta_actual() FROM anon;

-- items: [{producto_id, servicio_id, descripcion, cantidad, precio_unitario}]
CREATE OR REPLACE FUNCTION public.crear_venta(
  p_items jsonb,
  p_metodo public.metodo_pago,
  p_descuento numeric DEFAULT 0,
  p_observaciones text DEFAULT NULL
) RETURNS public.ventas
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venta public.ventas;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_numero text;
  v_prod public.productos;
  v_cant numeric;
  v_precio numeric;
  v_permitir_negativo boolean;
  v_nombre text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'La venta no tiene items'; END IF;

  SELECT COALESCE((SELECT valor = 'true' FROM public.configuracion WHERE clave = 'permitir_stock_negativo'), false)
  INTO v_permitir_negativo;

  v_numero := 'VENTA-' || lpad(nextval('public.venta_numero_seq')::text, 6, '0');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_cant := (v_item->>'cantidad')::numeric;
    v_precio := (v_item->>'precio_unitario')::numeric;
    IF v_cant IS NULL OR v_cant <= 0 THEN RAISE EXCEPTION 'Cantidad inválida'; END IF;
    v_subtotal := v_subtotal + (v_cant * v_precio);
  END LOOP;

  INSERT INTO public.ventas (numero, usuario_id, caja_id, subtotal, descuento, total, metodo_pago, observaciones)
  VALUES (v_numero, auth.uid(), public.caja_abierta_actual(), v_subtotal, COALESCE(p_descuento,0),
          v_subtotal - COALESCE(p_descuento,0), p_metodo, p_observaciones)
  RETURNING * INTO v_venta;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_cant := (v_item->>'cantidad')::numeric;
    v_precio := (v_item->>'precio_unitario')::numeric;

    IF (v_item->>'producto_id') IS NOT NULL THEN
      SELECT * INTO v_prod FROM public.productos WHERE id = (v_item->>'producto_id')::uuid FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Producto inexistente'; END IF;
      IF NOT v_permitir_negativo AND v_prod.stock_actual < v_cant THEN
        RAISE EXCEPTION 'Stock insuficiente de %: disponible %', v_prod.nombre, v_prod.stock_actual;
      END IF;

      INSERT INTO public.detalle_ventas (venta_id, producto_id, descripcion, categoria_id, cantidad, precio_unitario, costo_unitario, subtotal)
      VALUES (v_venta.id, v_prod.id, v_prod.nombre, v_prod.categoria_id, v_cant, v_precio, v_prod.precio_costo, v_cant * v_precio);

      UPDATE public.productos SET stock_actual = stock_actual - v_cant, updated_at = now() WHERE id = v_prod.id;

      INSERT INTO public.movimientos_stock (producto_id, usuario_id, tipo, cantidad, stock_resultante, motivo, referencia_id)
      VALUES (v_prod.id, auth.uid(), 'venta', -v_cant, v_prod.stock_actual - v_cant, 'Venta ' || v_numero, v_venta.id);
    ELSE
      SELECT nombre INTO v_nombre FROM public.servicios WHERE id = (v_item->>'servicio_id')::uuid;
      INSERT INTO public.detalle_ventas (venta_id, servicio_id, descripcion, cantidad, precio_unitario, subtotal)
      VALUES (v_venta.id, (v_item->>'servicio_id')::uuid,
              COALESCE(v_item->>'descripcion', v_nombre, 'Servicio'), v_cant, v_precio, v_cant * v_precio);
    END IF;
  END LOOP;

  INSERT INTO public.movimientos_caja (caja_id, usuario_id, tipo, concepto, metodo_pago, importe, venta_id)
  VALUES (v_venta.caja_id, auth.uid(), 'venta', 'Venta ' || v_numero, p_metodo, v_venta.total, v_venta.id);

  PERFORM public.log_auditoria('crear', 'ventas', v_venta.id, 'Registró la venta ' || v_numero || ' por $' || v_venta.total);

  RETURN v_venta;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.crear_venta(jsonb, public.metodo_pago, numeric, text) FROM anon;

CREATE OR REPLACE FUNCTION public.anular_venta(p_venta_id uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_venta public.ventas;
  v_det record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo un administrador puede anular ventas'; END IF;
  SELECT * INTO v_venta FROM public.ventas WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venta inexistente'; END IF;
  IF v_venta.estado = 'anulada' THEN RAISE EXCEPTION 'La venta ya está anulada'; END IF;

  FOR v_det IN SELECT * FROM public.detalle_ventas WHERE venta_id = p_venta_id AND producto_id IS NOT NULL LOOP
    UPDATE public.productos SET stock_actual = stock_actual + v_det.cantidad, updated_at = now()
    WHERE id = v_det.producto_id;
    INSERT INTO public.movimientos_stock (producto_id, usuario_id, tipo, cantidad, stock_resultante, motivo, referencia_id)
    SELECT v_det.producto_id, auth.uid(), 'anulacion', v_det.cantidad, p.stock_actual,
           'Anulación de ' || v_venta.numero, v_venta.id
    FROM public.productos p WHERE p.id = v_det.producto_id;
  END LOOP;

  UPDATE public.ventas SET estado = 'anulada', anulada_at = now(), anulada_por = auth.uid(), motivo_anulacion = p_motivo
  WHERE id = p_venta_id;

  INSERT INTO public.movimientos_caja (caja_id, usuario_id, tipo, concepto, metodo_pago, importe, venta_id)
  VALUES (v_venta.caja_id, auth.uid(), 'ajuste', 'Anulación ' || v_venta.numero, v_venta.metodo_pago, -v_venta.total, v_venta.id);

  PERFORM public.log_auditoria('anular', 'ventas', p_venta_id, 'Anuló la venta ' || v_venta.numero || '. Motivo: ' || COALESCE(p_motivo,'-'));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.anular_venta(uuid, text) FROM anon;

CREATE OR REPLACE FUNCTION public.confirmar_compra(p_compra_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_compra public.compras;
  v_det record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo un administrador puede confirmar compras'; END IF;
  SELECT * INTO v_compra FROM public.compras WHERE id = p_compra_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra inexistente'; END IF;
  IF v_compra.estado <> 'borrador' THEN RAISE EXCEPTION 'La compra no está en borrador'; END IF;

  FOR v_det IN SELECT * FROM public.detalle_compras WHERE compra_id = p_compra_id LOOP
    UPDATE public.productos
    SET stock_actual = stock_actual + v_det.cantidad,
        precio_costo = CASE WHEN v_det.precio_costo > 0 THEN v_det.precio_costo ELSE precio_costo END,
        updated_at = now()
    WHERE id = v_det.producto_id;
    INSERT INTO public.movimientos_stock (producto_id, usuario_id, tipo, cantidad, stock_resultante, motivo, referencia_id)
    SELECT v_det.producto_id, auth.uid(), 'compra', v_det.cantidad, p.stock_actual,
           'Compra ' || v_compra.numero, v_compra.id
    FROM public.productos p WHERE p.id = v_det.producto_id;
  END LOOP;

  UPDATE public.compras SET estado = 'confirmada', confirmada_at = now() WHERE id = p_compra_id;
  PERFORM public.log_auditoria('confirmar', 'compras', p_compra_id, 'Confirmó la compra ' || v_compra.numero);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirmar_compra(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.registrar_movimiento_stock(
  p_producto_id uuid, p_tipo public.tipo_mov_stock, p_cantidad numeric, p_motivo text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_delta numeric; v_stock numeric; v_nombre text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Solo un administrador puede ajustar stock'; END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) = 0 THEN RAISE EXCEPTION 'El motivo es obligatorio'; END IF;

  IF p_tipo = 'entrada' THEN v_delta := abs(p_cantidad);
  ELSIF p_tipo = 'salida' THEN v_delta := -abs(p_cantidad);
  ELSE v_delta := p_cantidad; END IF;

  IF p_tipo = 'ajuste' THEN
    UPDATE public.productos SET stock_actual = p_cantidad, updated_at = now() WHERE id = p_producto_id
      RETURNING stock_actual, nombre INTO v_stock, v_nombre;
  ELSE
    UPDATE public.productos SET stock_actual = stock_actual + v_delta, updated_at = now() WHERE id = p_producto_id
      RETURNING stock_actual, nombre INTO v_stock, v_nombre;
  END IF;

  INSERT INTO public.movimientos_stock (producto_id, usuario_id, tipo, cantidad, stock_resultante, motivo)
  VALUES (p_producto_id, auth.uid(), p_tipo, v_delta, v_stock, p_motivo);

  PERFORM public.log_auditoria(p_tipo::text, 'stock', p_producto_id,
    'Movimiento de stock (' || p_tipo || ') de ' || v_nombre || ': ' || p_cantidad || '. Motivo: ' || p_motivo);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.registrar_movimiento_stock(uuid, public.tipo_mov_stock, numeric, text) FROM anon;

CREATE OR REPLACE FUNCTION public.cerrar_caja(p_caja_id uuid, p_monto_contado numeric, p_observaciones text DEFAULT NULL)
RETURNS public.cajas LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caja public.cajas; v_esperado numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT * INTO v_caja FROM public.cajas WHERE id = p_caja_id FOR UPDATE;
  IF NOT FOUND OR v_caja.estado <> 'abierta' THEN RAISE EXCEPTION 'La caja no está abierta'; END IF;

  SELECT v_caja.monto_inicial + COALESCE(SUM(importe), 0) INTO v_esperado
  FROM public.movimientos_caja WHERE caja_id = p_caja_id AND metodo_pago = 'efectivo' AND tipo <> 'apertura';

  UPDATE public.cajas SET estado = 'cerrada', cerrada_at = now(), cerrada_por = auth.uid(),
    monto_contado = p_monto_contado, total_esperado = v_esperado,
    diferencia = p_monto_contado - v_esperado, observaciones = p_observaciones
  WHERE id = p_caja_id RETURNING * INTO v_caja;

  PERFORM public.log_auditoria('cerrar', 'caja', p_caja_id, 'Cerró la caja. Diferencia: $' || v_caja.diferencia);
  RETURN v_caja;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cerrar_caja(uuid, numeric, text) FROM anon;