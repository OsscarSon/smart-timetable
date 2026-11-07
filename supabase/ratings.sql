-- Mochi v9.0：应用评分统计。在 Supabase 控制台 → SQL Editor 里整段运行一次（可重复运行）。
-- 设计：表本身锁死（开了 RLS 又不建任何策略 = 前端不能直接读写），只能通过下面两个函数访问：
--   rating_stats()    → 返回 { total, avg, d:[1星数,2星数,3星数,4星数,5星数] }，任何人可调用
--   submit_rating()   → 每台设备一票（device_id 是 App 随机生成的，不含任何个人信息），重复提交 = 更新原来那一票，返回最新统计
-- 局限：设备 ID 存在本机，清除数据后可再投一票；这是“轻量统计”，不是防刷票系统。

create table if not exists public.app_ratings (
  device_id  text primary key check (char_length(device_id) between 16 and 64),
  stars      smallint not null check (stars between 1 and 5),
  platform   text check (char_length(platform) <= 12),
  version    text check (char_length(version) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.app_ratings enable row level security;   -- 不建策略：anon / authenticated 都不能直接访问这张表

create or replace function public.rating_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total', count(*),
    'avg',   coalesce(round(avg(stars)::numeric, 2), 0),
    'd',     json_build_array(
               count(*) filter (where stars = 1), count(*) filter (where stars = 2),
               count(*) filter (where stars = 3), count(*) filter (where stars = 4),
               count(*) filter (where stars = 5)))
  from public.app_ratings
$$;

create or replace function public.submit_rating(p_device text, p_stars int, p_platform text default null, p_version text default null)
returns json language plpgsql security definer set search_path = public as $$
begin
  if p_device is null or char_length(p_device) not between 16 and 64 then raise exception 'bad device'; end if;
  if p_stars is null or p_stars not between 1 and 5 then raise exception 'bad stars'; end if;
  insert into public.app_ratings (device_id, stars, platform, version)
  values (p_device, p_stars, left(p_platform, 12), left(p_version, 20))
  on conflict (device_id) do update
    set stars = excluded.stars, platform = excluded.platform, version = excluded.version, updated_at = now();
  return public.rating_stats();
end $$;

revoke all on function public.rating_stats() from public;
revoke all on function public.submit_rating(text, int, text, text) from public;
grant execute on function public.rating_stats() to anon, authenticated;
grant execute on function public.submit_rating(text, int, text, text) to anon, authenticated;
