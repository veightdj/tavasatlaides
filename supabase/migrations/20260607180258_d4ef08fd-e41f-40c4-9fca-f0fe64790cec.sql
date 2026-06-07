
ALTER FUNCTION public.haversine_m(double precision,double precision,double precision,double precision) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.notify_new_deal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.haversine_m(double precision,double precision,double precision,double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.haversine_m(double precision,double precision,double precision,double precision) TO authenticated, service_role;
