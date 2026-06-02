
REVOKE EXECUTE ON FUNCTION public.expire_outdated_ads() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_old_analytics() FROM PUBLIC, anon, authenticated;
