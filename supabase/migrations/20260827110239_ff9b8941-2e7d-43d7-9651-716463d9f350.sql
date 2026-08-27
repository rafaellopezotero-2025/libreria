CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE OR REPLACE FUNCTION public.bootstrap_usuario(p_nombre text, p_apellido text, p_email text)
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role public.app_role;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

  INSERT INTO public.profiles (id, nombre, apellido, email, ultimo_acceso)
  VALUES (auth.uid(), COALESCE(p_nombre,''), COALESCE(p_apellido,''), COALESCE(p_email,''), now())
  ON CONFLICT (id) DO UPDATE SET ultimo_acceso = now();

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
  IF v_role IS NOT NULL THEN RETURN v_role; END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    v_role := 'vendedor';
  ELSE
    v_role := 'admin';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), v_role)
  ON CONFLICT DO NOTHING;
  RETURN v_role;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bootstrap_usuario(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_usuario(text, text, text) TO authenticated;