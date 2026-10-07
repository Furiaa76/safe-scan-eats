-- Analytics data is inaccessible to public browser/database roles.
create table public.app_statistics_events (
 visitor_hash text not null check (visitor_hash ~ '^[0-9a-f]{64}$'),
 day date not null default (now() at time zone 'UTC')::date,
 category text not null check(category in ('open','scan','recipes','shopping','search','installed')),
 source text not null check(source in ('facebook','instagram','tiktok','direct')),
 primary key(visitor_hash,day,category)
);
create index app_statistics_day_idx on public.app_statistics_events(day);
create table public.app_statistics_feedback (
 token_hash text primary key check(token_hash ~ '^[0-9a-f]{64}$'),
 day date not null default (now() at time zone 'UTC')::date,
 rating text not null check(rating in ('useful','improve','not_useful')),
 reason text not null check(reason in ('none','products','recipes','difficult','other'))
);
create table public.app_statistics_admin (id boolean primary key default true check(id), password_hash text not null);
alter table public.app_statistics_events enable row level security;
alter table public.app_statistics_feedback enable row level security;
alter table public.app_statistics_admin enable row level security;
revoke all on public.app_statistics_events,public.app_statistics_feedback,public.app_statistics_admin from public,anon,authenticated;
grant all on public.app_statistics_events,public.app_statistics_feedback,public.app_statistics_admin to service_role;
create function public.app_statistics_report() returns jsonb language sql security invoker set search_path = '' as $$
 with people as (
 select visitor_hash,min(day) first_day, max(day) last_day,
 (array_agg(source order by day,category))[1] source,
 bool_or(category='installed') installed
 from public.app_statistics_events group by visitor_hash
 ), cohorts as (
 select p.*,
 exists(select 1 from public.app_statistics_events e where e.visitor_hash=p.visitor_hash and e.day between p.first_day+7 and p.first_day+13) returned7,
 exists(select 1 from public.app_statistics_events e where e.visitor_hash=p.visitor_hash and e.day between p.first_day+30 and p.first_day+36) returned30
 from people p
 )
 select jsonb_build_object(
 'browsers',(select count(*) from people),
 'active7',(select count(*) from people where last_day >= current_date-6),
 'active30',(select count(*) from people where last_day >= current_date-29),
 'standalone',(select count(*) from people where installed),
 'eligible7',(select count(*) from cohorts where first_day<=current_date-13),
 'returned7',(select count(*) from cohorts where first_day<=current_date-13 and returned7),
 'eligible30',(select count(*) from cohorts where first_day<=current_date-36),
 'returned30',(select count(*) from cohorts where first_day<=current_date-36 and returned30),
 'sources',coalesce((select jsonb_object_agg(source,n) from (select source,count(*) n from people group by source) s),'{}'),
 'features',coalesce((select jsonb_object_agg(category,n) from (select category,count(distinct visitor_hash) n from public.app_statistics_events group by category) s),'{}'),
 'ratings',coalesce((select jsonb_object_agg(rating,n) from (select rating,count(*) n from public.app_statistics_feedback group by rating) s),'{}'),
 'reasons',coalesce((select jsonb_object_agg(reason,n) from (select reason,count(*) n from public.app_statistics_feedback where reason<>'none' group by reason) s),'{}'),
 'daily',coalesce((select jsonb_agg(s order by day) from (select day,count(distinct visitor_hash) browsers from public.app_statistics_events where day>=current_date-29 group by day) s),'[]'),
 'generatedAt',now()
 );
$$;
revoke all on function public.app_statistics_report() from public,anon,authenticated;
grant execute on function public.app_statistics_report() to service_role;
-- Daily retention, independent of application traffic.
create extension if not exists pg_cron;
select cron.schedule('safe_scan_statistics_retention','15 2 * * *',
 $$delete from public.app_statistics_events where day < current_date-179;
 delete from public.app_statistics_feedback where day < current_date-179;$$);
