
REVOKE EXECUTE ON FUNCTION public.expire_outdated_ads() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_outdated_ads() TO postgres, service_role;
