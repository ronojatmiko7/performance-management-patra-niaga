-- Workbook Digital · Performance Management Fundamental · PT Pertamina Patra Niaga
-- Schema pmf_patra di project Supabase PerfOS (edodmmedehuuemnnmdri).
--
-- Sudah diterapkan ke database. File ini disimpan sebagai referensi
-- (disusun ulang dari definisi yang berjalan di database).
--
-- Desain keamanan:
--   * Schema pmf_patra TIDAK diekspos ke PostgREST; anon/authenticated tidak punya hak apa pun.
--   * RLS aktif di semua tabel tanpa policy (deny-all) sebagai lapisan kedua.
--   * Semua akses lewat fungsi public.pmf_* (SECURITY DEFINER, search_path = '').
--   * Peserta: id + token (uuid) yang hanya diketahui browser peserta.
--   * Fasilitator: PIN yang di-hash bcrypt di pmf_patra.settings.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists pmf_patra;
revoke all on schema pmf_patra from public, anon, authenticated;

create table pmf_patra.participants (
  id         uuid primary key default gen_random_uuid(),
  token      uuid not null default gen_random_uuid(),
  full_name  text not null check (char_length(full_name) between 2 and 120),
  company    text not null check (char_length(company) between 2 and 120),
  unit       text check (unit is null or char_length(unit) <= 120),
  batch      text not null default 'batch-1' check (char_length(batch) <= 40),
  created_at timestamptz not null default now()
);

create table pmf_patra.responses (
  participant_id uuid not null references pmf_patra.participants(id) on delete cascade,
  section        text not null check (section ~ '^[a-z0-9_]{1,40}$'),
  data           jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now(),
  primary key (participant_id, section)
);

create table pmf_patra.test_questions (
  no       int primary key,
  question text not null,
  options  jsonb not null,
  answer   int not null            -- indeks opsi benar, mulai dari 0
);

create table pmf_patra.test_results (
  participant_id uuid not null references pmf_patra.participants(id) on delete cascade,
  kind           text not null check (kind in ('pre','post')),
  answers        jsonb not null,
  score          int not null,
  total          int not null,
  submitted_at   timestamptz not null default now(),
  primary key (participant_id, kind)
);

create table pmf_patra.evaluations (
  participant_id  uuid primary key references pmf_patra.participants(id) on delete cascade,
  ratings         jsonb not null,
  comment_best    text,
  comment_improve text,
  submitted_at    timestamptz not null default now()
);

create table pmf_patra.settings (
  key   text primary key,
  value text not null
);

alter table pmf_patra.participants   enable row level security;
alter table pmf_patra.responses      enable row level security;
alter table pmf_patra.test_questions enable row level security;
alter table pmf_patra.test_results   enable row level security;
alter table pmf_patra.evaluations    enable row level security;
alter table pmf_patra.settings       enable row level security;
revoke all on all tables in schema pmf_patra from public, anon, authenticated;

insert into pmf_patra.settings (key, value) values ('post_open', 'false');
-- PIN fasilitator (ganti '<PIN>' dengan PIN baru):
-- insert into pmf_patra.settings (key, value)
--   values ('admin_pin_hash', extensions.crypt('<PIN>', extensions.gen_salt('bf')))
--   on conflict (key) do update set value = excluded.value;

-- ---------------------------------------------------------------------------
-- Bank soal pre-test / post-test (10 soal)
-- ---------------------------------------------------------------------------
insert into pmf_patra.test_questions (no, question, options, answer) values
(1, 'Menurut definisi yang dipakai di pelatihan ini, bisnis meraih keuntungan dengan cara...',
 '["Menekan biaya serendah mungkin","Menambah jumlah produk sebanyak mungkin","Memenuhi kebutuhan atau menyelesaikan masalah customer","Mengikuti langkah pesaing"]', 2),
(2, 'Empat perspektif Balanced Scorecard adalah...',
 '["Finansial, Pelanggan, Proses Internal, Pembelajaran & Pertumbuhan","Finansial, Pemasaran, Produksi, SDM","Visi, Misi, Strategi, KPI","Input, Proses, Output, Outcome"]', 0),
(3, 'Dalam rantai sebab-akibat Balanced Scorecard, perspektif yang menjadi penggerak paling dasar adalah...',
 '["Finansial","Pelanggan","Proses Internal","Pembelajaran & Pertumbuhan"]', 3),
(4, 'Pernyataan yang paling tepat tentang Balanced Scorecard dan OKR adalah...',
 '["OKR menggantikan Balanced Scorecard","Keduanya sama, hanya berbeda nama","OKR hanya cocok untuk perusahaan teknologi","BSC menjaga keseimbangan strategi tahunan; OKR mendorong terobosan jangka pendek, umumnya per kuartal"]', 3),
(5, 'Dalam SWOT, "armada mobil tangki sudah tua" termasuk...',
 '["Kekuatan","Kelemahan","Peluang","Ancaman"]', 1),
(6, 'Perusahaan dengan peluang eksternal dominan tetapi kelemahan internal dominan paling tepat memilih grand strategy...',
 '["Agresif","Turnaround","Diversifikasi","Defensif"]', 1),
(7, 'Manakah sasaran strategis yang ditulis dengan benar?',
 '["Mengadakan pelatihan operator","Melaksanakan rapat koordinasi bulanan","Operator menguasai standar layanan","Membeli aplikasi baru"]', 2),
(8, 'KPI unit yang berbeda jenisnya dengan KPI di atasnya, tetapi mendorong pencapaiannya, termasuk cascading jenis...',
 '["Dibagi","Didukung","Dihapus","Diulang"]', 1),
(9, 'KPI "losses BBM" berpolaritas makin rendah makin baik. Jika target 0,25% dan realisasi 0,20%, capaiannya adalah...',
 '["80%","100%","125%","45%"]', 2),
(10, 'KPI unit Anda berstatus kuning dua bulan berturut-turut. Langkah yang paling tepat adalah...',
 '["Mencari sumber gap (input, proses, atau kapabilitas), lalu membicarakannya dengan atasan beserta usulan","Menunggu sampai akhir tahun","Meminta KPI tersebut diganti","Menjelaskan bahwa penyebabnya unit lain"]', 0);

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------
create or replace function pmf_patra.check_token(p_id uuid, p_token uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from pmf_patra.participants where id = p_id and token = p_token) then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
end $$;

create or replace function pmf_patra.check_pin(p_pin text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare h text;
begin
  select value into h from pmf_patra.settings where key = 'admin_pin_hash';
  if h is null or p_pin is null or extensions.crypt(p_pin, h) <> h then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RPC untuk peserta
-- ---------------------------------------------------------------------------
create or replace function public.pmf_register(p_full_name text, p_company text, p_unit text, p_batch text default 'batch-1')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  insert into pmf_patra.participants (full_name, company, unit, batch)
  values (btrim(p_full_name), btrim(p_company), nullif(btrim(coalesce(p_unit, '')), ''), coalesce(nullif(btrim(p_batch), ''), 'batch-1'))
  returning id, token into r;
  return jsonb_build_object('id', r.id, 'token', r.token);
end $$;

create or replace function public.pmf_get_config()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('post_open', coalesce((select value from pmf_patra.settings where key = 'post_open'), 'false') = 'true');
$$;

create or replace function public.pmf_get_questions()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('no', no, 'question', question, 'options', options) order by no), '[]'::jsonb)
  from pmf_patra.test_questions;
$$;

create or replace function public.pmf_get_state(p_id uuid, p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb;
begin
  perform pmf_patra.check_token(p_id, p_token);
  select jsonb_build_object(
    'participant', (select jsonb_build_object('full_name', full_name, 'company', company, 'unit', unit, 'batch', batch) from pmf_patra.participants where id = p_id),
    'responses', coalesce((select jsonb_object_agg(section, data) from pmf_patra.responses where participant_id = p_id), '{}'::jsonb),
    'tests', coalesce((select jsonb_object_agg(kind, jsonb_build_object('score', score, 'total', total, 'answers', answers, 'submitted_at', submitted_at)) from pmf_patra.test_results where participant_id = p_id), '{}'::jsonb),
    'evaluation', (select jsonb_build_object('ratings', ratings, 'comment_best', comment_best, 'comment_improve', comment_improve) from pmf_patra.evaluations where participant_id = p_id)
  ) into res;
  return res;
end $$;

create or replace function public.pmf_save_section(p_id uuid, p_token uuid, p_section text, p_data jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare ts timestamptz := now();
begin
  perform pmf_patra.check_token(p_id, p_token);
  if p_section !~ '^[a-z0-9_]{1,40}$' then raise exception 'invalid section'; end if;
  if pg_column_size(p_data) > 60000 then raise exception 'data too large'; end if;
  insert into pmf_patra.responses (participant_id, section, data, updated_at)
  values (p_id, p_section, coalesce(p_data, '{}'::jsonb), ts)
  on conflict (participant_id, section) do update set data = excluded.data, updated_at = excluded.updated_at;
  return ts;
end $$;

create or replace function public.pmf_submit_test(p_id uuid, p_token uuid, p_kind text, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_score int; v_total int; existing record; v_correct jsonb;
begin
  perform pmf_patra.check_token(p_id, p_token);
  if p_kind not in ('pre','post') then raise exception 'invalid kind'; end if;
  if p_kind = 'post' and coalesce((select value from pmf_patra.settings where key = 'post_open'), 'false') <> 'true' then
    raise exception 'post_test_closed';
  end if;
  select * into existing from pmf_patra.test_results where participant_id = p_id and kind = p_kind;
  if found then
    return jsonb_build_object('score', existing.score, 'total', existing.total, 'already', true);
  end if;
  select count(*) filter (where (p_answers ->> q.no::text) = q.answer::text), count(*)
    into v_score, v_total from pmf_patra.test_questions q;
  insert into pmf_patra.test_results (participant_id, kind, answers, score, total)
  values (p_id, p_kind, coalesce(p_answers, '{}'::jsonb), v_score, v_total);
  if p_kind = 'post' then
    select jsonb_object_agg(no::text, answer) into v_correct from pmf_patra.test_questions;
  end if;
  return jsonb_build_object('score', v_score, 'total', v_total, 'key', v_correct);
end $$;

create or replace function public.pmf_submit_eval(p_id uuid, p_token uuid, p_ratings jsonb, p_comment_best text, p_comment_improve text)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare ts timestamptz := now();
begin
  perform pmf_patra.check_token(p_id, p_token);
  if pg_column_size(p_ratings) > 4000 then raise exception 'data too large'; end if;
  insert into pmf_patra.evaluations (participant_id, ratings, comment_best, comment_improve, submitted_at)
  values (p_id, p_ratings, left(p_comment_best, 2000), left(p_comment_improve, 2000), ts)
  on conflict (participant_id) do update set ratings = excluded.ratings, comment_best = excluded.comment_best,
    comment_improve = excluded.comment_improve, submitted_at = excluded.submitted_at;
  return ts;
end $$;

-- ---------------------------------------------------------------------------
-- RPC untuk fasilitator (dilindungi PIN)
-- ---------------------------------------------------------------------------
create or replace function public.pmf_admin_report(p_pin text, p_batch text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare res jsonb;
begin
  perform pmf_patra.check_pin(p_pin);
  select jsonb_build_object(
    'post_open', coalesce((select value from pmf_patra.settings where key = 'post_open'), 'false') = 'true',
    'batches', coalesce((select jsonb_agg(distinct batch) from pmf_patra.participants), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'full_name', p.full_name, 'company', p.company, 'unit', p.unit, 'batch', p.batch, 'created_at', p.created_at,
        'pre', (select score from pmf_patra.test_results t where t.participant_id = p.id and kind = 'pre'),
        'post', (select score from pmf_patra.test_results t where t.participant_id = p.id and kind = 'post'),
        'total', (select count(*) from pmf_patra.test_questions),
        'evaluation', (select jsonb_build_object('ratings', ratings, 'comment_best', comment_best, 'comment_improve', comment_improve) from pmf_patra.evaluations e where e.participant_id = p.id),
        'responses', coalesce((select jsonb_object_agg(section, data) from pmf_patra.responses r where r.participant_id = p.id), '{}'::jsonb)
      ) order by p.company, p.full_name)
      from pmf_patra.participants p where p_batch is null or p.batch = p_batch
    ), '[]'::jsonb)
  ) into res;
  return res;
end $$;

create or replace function public.pmf_admin_set_post_open(p_pin text, p_open boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform pmf_patra.check_pin(p_pin);
  update pmf_patra.settings set value = case when p_open then 'true' else 'false' end where key = 'post_open';
  return p_open;
end $$;

-- Hak eksekusi: helper tertutup, RPC publik terbuka untuk anon.
revoke all on function pmf_patra.check_token(uuid, uuid) from public, anon, authenticated;
revoke all on function pmf_patra.check_pin(text) from public, anon, authenticated;
grant execute on function
  public.pmf_register(text, text, text, text),
  public.pmf_get_config(),
  public.pmf_get_questions(),
  public.pmf_get_state(uuid, uuid),
  public.pmf_save_section(uuid, uuid, text, jsonb),
  public.pmf_submit_test(uuid, uuid, text, jsonb),
  public.pmf_submit_eval(uuid, uuid, jsonb, text, text),
  public.pmf_admin_report(text, text),
  public.pmf_admin_set_post_open(text, boolean)
to anon, authenticated;
