create or replace function public.safe_scan_alexa_link_status(p_household_key uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.alexa_links
    where household_key = p_household_key
      and linked_at is not null
  );
$$;

revoke all on function public.safe_scan_alexa_link_status(uuid) from public, anon, authenticated;
grant execute on function public.safe_scan_alexa_link_status(uuid) to anon, authenticated;
