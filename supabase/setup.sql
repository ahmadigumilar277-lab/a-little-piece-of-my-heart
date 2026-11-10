-- 1) Create the owner account in Supabase Auth first, then replace OWNER_USER_UUID below
-- with that account's UUID from Authentication > Users.
-- 2) Run this entire script in Supabase SQL Editor.

create table if not exists public.site_content (
  id text primary key check (id = 'main'),
  owner_id uuid not null,
  is_published boolean not null default true,
  content jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select (id, is_published, content, updated_at) on public.site_content to anon;
grant select on public.site_content to authenticated;
grant insert, update, delete on public.site_content to authenticated;

drop policy if exists "Public can read published content" on public.site_content;
create policy "Public can read published content"
  on public.site_content for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Owner can read all content" on public.site_content;
create policy "Owner can read all content"
  on public.site_content for select to authenticated
  using (auth.uid() = 'OWNER_USER_UUID'::uuid);

drop policy if exists "Owner can create content" on public.site_content;
create policy "Owner can create content"
  on public.site_content for insert to authenticated
  with check (auth.uid() = 'OWNER_USER_UUID'::uuid and owner_id = auth.uid());

drop policy if exists "Owner can update content" on public.site_content;
create policy "Owner can update content"
  on public.site_content for update to authenticated
  using (auth.uid() = 'OWNER_USER_UUID'::uuid)
  with check (auth.uid() = 'OWNER_USER_UUID'::uuid and owner_id = auth.uid());

drop policy if exists "Owner can delete content" on public.site_content;
create policy "Owner can delete content"
  on public.site_content for delete to authenticated
  using (auth.uid() = 'OWNER_USER_UUID'::uuid);

insert into public.site_content (id, owner_id, is_published, content)
values (
  'main',
  'OWNER_USER_UUID'::uuid,
  true,
  '{
    "girlfriendName": "[Nama Dia]",
    "websiteTitle": "a little piece of my heart",
    "introSubtitle": "I have something special for you...",
    "yourName": "[Nama Kamu]",
    "closingMessage": "If I had to choose again, I''d still choose you.",
    "personalDate": "[Tanggal spesial, opsional]",
    "letter": [
      "Aku cuma ingin kamu tahu, kehadiranmu membuat hal-hal sederhana terasa lebih berarti.",
      "Thank you for being exactly who you are. Semoga kamu selalu ingat betapa berharganya dirimu, bukan hanya bagiku, tapi juga bagi dunia kecil yang kamu sentuh setiap hari.",
      "This little corner of the internet is just a reminder: you are loved, deeply and gently, in all the ordinary moments and all the extraordinary ones."
    ],
    "memories": [
      {"date":"[Tanggal / momen pertama]","title":"[Awal cerita kita]","caption":"[Ganti dengan kenangan kecil]","note":"[Tulis satu kalimat tentang momen ini]","image":"","imagePath":""},
      {"date":"[Tanggal / momen berikutnya]","title":"[Momen yang disimpan]","caption":"[Senyum yang ingin diingat]","note":"[Apa yang membuat hari ini terasa istimewa?]","image":"","imagePath":""},
      {"date":"[Tanggal / momen favorit]","title":"[Satu hari yang hangat]","caption":"[Cerita kecil kita]","note":"[Tambahkan cerita pendekmu di sini]","image":"","imagePath":""}
    ],
    "reasons": [
      {"title":"Your kind heart","message":"Cara kamu peduli pada hal-hal kecil membuat dunia terasa lebih lembut."},
      {"title":"The way you laugh","message":"Tawamu punya cara sendiri untuk membuat hari biasa terasa istimewa."},
      {"title":"Simply being you","message":"Kamu tidak perlu menjadi siapa-siapa selain dirimu sendiri untuk dicintai."},
      {"title":"Your quiet strength","message":"Ada banyak keberanian dalam caramu terus melangkah, bahkan pelan-pelan."},
      {"title":"The little things","message":"Hal-hal sederhana tentangmu selalu punya tempat paling besar di hatiku."},
      {"title":"There is no end","message":"Daftar ini tidak akan pernah cukup panjang untuk semua alasan yang ada."}
    ],
    "musicUrl": "",
    "musicPath": ""
  }'::jsonb
)
on conflict (id) do nothing;

-- Public media URLs are needed to display the published memories and music.
-- Supabase Storage access is public-read for this bucket, while all writes/deletes
-- are restricted to the owner UUID above. Never upload private files here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 52428800, array[
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
  'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm'
])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site media" on storage.objects;
create policy "Public can view site media"
  on storage.objects for select to public
  using (bucket_id = 'site-media');

drop policy if exists "Owner can upload site media" on storage.objects;
create policy "Owner can upload site media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and auth.uid() = 'OWNER_USER_UUID'::uuid);

drop policy if exists "Owner can update site media" on storage.objects;
create policy "Owner can update site media"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-media' and auth.uid() = 'OWNER_USER_UUID'::uuid)
  with check (bucket_id = 'site-media' and auth.uid() = 'OWNER_USER_UUID'::uuid);

drop policy if exists "Owner can delete site media" on storage.objects;
create policy "Owner can delete site media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and auth.uid() = 'OWNER_USER_UUID'::uuid);
