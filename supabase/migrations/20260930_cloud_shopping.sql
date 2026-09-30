-- Safe Scan Eats cloud shopping list
-- The browser never reads the table directly: it uses RPC functions keyed by
-- a random household UUID stored only on the user's device.

create extension if not exists pgcrypto;

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_key uuid not null,
  name text not null,
  quantity text not null default '1 pz',
  recipe text,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shopping_items_household_idx
  on public.shopping_items (household_key, checked, created_at);

alter table public.shopping_items enable row level security;

revoke all on public.shopping_items from anon, authenticated;

create or replace function public.safe_scan_get_shopping(p_household_key uuid)
returns table (
  id uuid,
  name text,
  quantity text,
  recipe text,
  checked boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.quantity, s.recipe, s.checked, s.created_at
  from public.shopping_items s
  where s.household_key = p_household_key
  order by s.checked asc, s.created_at asc;
$$;

create or replace function public.safe_scan_replace_shopping(
  p_household_key uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_household_key is null then
    raise exception 'household key required';
  end if;

  delete from public.shopping_items
  where household_key = p_household_key;

  insert into public.shopping_items (
    id, household_key, name, quantity, recipe, checked, created_at, updated_at
  )
  select
    coalesce(nullif(item->>'id','')::uuid, gen_random_uuid()),
    p_household_key,
    left(coalesce(item->>'name',''), 200),
    left(coalesce(item->>'quantity','1 pz'), 80),
    nullif(left(coalesce(item->>'recipe',''), 200), ''),
    coalesce((item->>'checked')::boolean, false),
    coalesce(nullif(item->>'createdAt','')::timestamptz, now()),
    now()
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as item
  where length(trim(coalesce(item->>'name',''))) > 0;
end;
$$;

grant execute on function public.safe_scan_get_shopping(uuid) to anon, authenticated;
grant execute on function public.safe_scan_replace_shopping(uuid, jsonb) to anon, authenticated;
