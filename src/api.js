import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configured = Boolean(url && key)

const supabase = configured
  ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  : null

async function rpc(fn, args) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) {
    const err = new Error(error.message || 'Terjadi kesalahan')
    err.code = error.code
    throw err
  }
  return data
}

export const api = {
  register: (full_name, company, unit, batch) =>
    rpc('pmf_register', { p_full_name: full_name, p_company: company, p_unit: unit, p_batch: batch }),
  config: () => rpc('pmf_get_config'),
  questions: () => rpc('pmf_get_questions'),
  state: (s) => rpc('pmf_get_state', { p_id: s.id, p_token: s.token }),
  save: (s, section, data) =>
    rpc('pmf_save_section', { p_id: s.id, p_token: s.token, p_section: section, p_data: data }),
  submitTest: (s, kind, answers) =>
    rpc('pmf_submit_test', { p_id: s.id, p_token: s.token, p_kind: kind, p_answers: answers }),
  submitEval: (s, ratings, best, improve) =>
    rpc('pmf_submit_eval', {
      p_id: s.id, p_token: s.token, p_ratings: ratings, p_comment_best: best, p_comment_improve: improve,
    }),
  adminReport: (pin, batch) => rpc('pmf_admin_report', { p_pin: pin, p_batch: batch || null }),
  adminSetPostOpen: (pin, open) => rpc('pmf_admin_set_post_open', { p_pin: pin, p_open: open }),
}

// ---- Sesi peserta di browser -------------------------------------------------
const LS_KEY = 'pmf_patra_session_v1'

export function loadSession() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return s && s.id && s.token ? s : null
  } catch {
    return null
  }
}

export function storeSession(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)) } catch { /* abaikan */ }
}

export function clearSession() {
  try { localStorage.removeItem(LS_KEY) } catch { /* abaikan */ }
}

export function resumeLink(s) {
  return `${window.location.origin}${window.location.pathname}#/r/${s.id}.${s.token}`
}
