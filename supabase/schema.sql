-- 在 Supabase 控制台 → SQL Editor 里整段运行一次。
-- 1) 数据表：每个用户每个 mochi-* 键一行（value 存原始字符串）
create table if not exists public.user_data (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_data enable row level security;

drop policy if exists "user_data own rows" on public.user_data;
create policy "user_data own rows" on public.user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 每次写入由服务器盖时间戳（同步靠它判断谁新）
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before insert or update on public.user_data
  for each row execute function public.touch_updated_at();

-- 2) 附件存储桶（私有）：每个用户只能读写自己 uid 文件夹里的文件
insert into storage.buckets (id, name, public) values ('hw-files', 'hw-files', false)
  on conflict (id) do nothing;

drop policy if exists "hw-files select" on storage.objects;
drop policy if exists "hw-files insert" on storage.objects;
drop policy if exists "hw-files update" on storage.objects;
drop policy if exists "hw-files delete" on storage.objects;
create policy "hw-files select" on storage.objects for select to authenticated
  using (bucket_id = 'hw-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hw-files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'hw-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hw-files update" on storage.objects for update to authenticated
  using (bucket_id = 'hw-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "hw-files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'hw-files' and (storage.foldername(name))[1] = auth.uid()::text);
