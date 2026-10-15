-- Lembar kelompok: satu lembar per (batch, anak perusahaan) untuk latihan kelompok.
-- Data disimpan sebagai peta datar { "path.ke.field": nilai } agar beberapa anggota
-- bisa mengisi bersamaan tanpa saling menimpa (merge per field).

create table if not exists pmf_patra.group_responses (
  batch       text not null,
  company     text not null,
  section     text not null check (section in
                ('s1_customer','s2_swot','s2_kuadran','s2_rkap','s2_peta','s3_kartu','s3_tracker','s3_perbaikan')),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (batch, company, section)
);
alter table pmf_patra.group_responses enable row level security;
revoke all on pmf_patra.group_responses from public, anon, authenticated;

create or replace function public.pmf_save_group(p_id uuid, p_token uuid, p_section text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_p record; v_row record;
begin
  perform pmf_patra.check_token(p_id, p_token);
  if jsonb_typeof(p_patch) <> 'object' then raise exception 'invalid patch'; end if;
  if pg_column_size(p_patch) > 20000 then raise exception 'data too large'; end if;
  select batch, company, full_name into v_p from pmf_patra.participants where id = p_id;
  insert into pmf_patra.group_responses as g (batch, company, section, data, updated_at, updated_by)
  values (v_p.batch, v_p.company, p_section, jsonb_strip_nulls(p_patch), now(), v_p.full_name)
  on conflict (batch, company, section) do update
    set data = jsonb_strip_nulls(g.data || p_patch),
        updated_at = now(), updated_by = v_p.full_name
  returning data, updated_at into v_row;
  if pg_column_size(v_row.data) > 120000 then raise exception 'data too large'; end if;
  return jsonb_build_object('updated_at', v_row.updated_at);
end $$;

create or replace function public.pmf_get_group(p_id uuid, p_token uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_p record; res jsonb;
begin
  perform pmf_patra.check_token(p_id, p_token);
  select batch, company into v_p from pmf_patra.participants where id = p_id;
  select jsonb_build_object(
    'batch', v_p.batch,
    'company', v_p.company,
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', full_name, 'unit', unit) order by created_at)
                 from pmf_patra.participants where batch = v_p.batch and company = v_p.company), '[]'::jsonb),
    'sheets', coalesce((select jsonb_object_agg(section, jsonb_build_object('data', data, 'updated_at', updated_at, 'updated_by', updated_by))
                 from pmf_patra.group_responses where batch = v_p.batch and company = v_p.company), '{}'::jsonb),
    'now', now()
  ) into res;
  return res;
end $$;

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
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object('batch', g.batch, 'company', g.company, 'sheets', g.sheets) order by g.company)
      from (
        select batch, company, jsonb_object_agg(section, data) as sheets
        from pmf_patra.group_responses
        where p_batch is null or batch = p_batch
        group by batch, company
      ) g
    ), '[]'::jsonb)
  ) into res;
  return res;
end $$;

grant execute on function
  public.pmf_save_group(uuid, uuid, text, jsonb),
  public.pmf_get_group(uuid, uuid)
to anon, authenticated;
