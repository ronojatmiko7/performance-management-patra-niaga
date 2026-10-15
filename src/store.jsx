import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from './api.js'

const WorkbookCtx = createContext(null)

const SAVE_DELAY = 900
const GROUP_SAVE_DELAY = 500
const POLL_MS = 4000

// ---------------------------------------------------------------------------
// Peta datar <-> objek bersarang. Lembar kelompok disimpan datar
// ({"rows.0.customer": "..."}) agar anggota bisa mengisi bersamaan.
// ---------------------------------------------------------------------------
export function unflatten(flat) {
  const root = {}
  for (const [path, value] of Object.entries(flat || {})) {
    const keys = path.split('.')
    let cur = root
    keys.forEach((k, i) => {
      if (i === keys.length - 1) cur[k] = value
      else {
        if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
        cur = cur[k]
      }
    })
  }
  const toArrays = (o) => {
    if (o == null || typeof o !== 'object') return o
    const keys = Object.keys(o)
    for (const k of keys) o[k] = toArrays(o[k])
    if (keys.length && keys.every((k) => /^\d+$/.test(k))) {
      const a = []
      for (const k of keys) a[Number(k)] = o[k]
      return a
    }
    return o
  }
  return toArrays(root)
}

export function WorkbookProvider({ session, initial, children }) {
  // ---- Lembar pribadi --------------------------------------------------------
  const [responses, setResponses] = useState(initial.responses || {})
  const [tests, setTests] = useState(initial.tests || {})
  const [evaluation, setEvaluation] = useState(initial.evaluation || null)
  const [status, setStatus] = useState({ state: 'idle', at: null, error: null })
  const pending = useRef({})
  const timer = useRef(null)
  const inflight = useRef(false)

  const arm = (ref, ms, fn) => {
    clearTimeout(ref.current)
    ref.current = setTimeout(() => { ref.current = null; fn() }, ms)
  }

  const flush = useCallback(async () => {
    if (inflight.current) return
    const entries = Object.entries(pending.current)
    if (!entries.length) return
    pending.current = {}
    inflight.current = true
    setStatus((s) => ({ ...s, state: 'saving', error: null }))
    try {
      for (const [section, data] of entries) await api.save(session, section, data)
      setStatus({ state: 'saved', at: new Date(), error: null })
    } catch (e) {
      for (const [section, data] of entries) {
        if (!(section in pending.current)) pending.current[section] = data
      }
      setStatus({ state: 'error', at: null, error: e.message })
      arm(timer, 5000, flush)
    } finally {
      inflight.current = false
      if (Object.keys(pending.current).length && !timer.current) arm(timer, SAVE_DELAY, flush)
    }
  }, [session])

  const update = useCallback((section, updater) => {
    setResponses((prev) => {
      const cur = prev[section] || {}
      const next = typeof updater === 'function' ? updater(cur) : { ...cur, ...updater }
      pending.current[section] = next
      return { ...prev, [section]: next }
    })
    arm(timer, SAVE_DELAY, flush)
    setStatus((s) => (s.state === 'saving' ? s : { ...s, state: 'dirty' }))
  }, [flush])

  // ---- Lembar kelompok -------------------------------------------------------
  // per section: remote (versi server), inflight (terkirim, belum dikonfirmasi),
  // pending (belum terkirim). Tampilan = remote + inflight + pending.
  const groupRef = useRef({ sheets: {}, meta: {} })
  const [groupInfo, setGroupInfo] = useState(null)
  const [groupVersion, setGroupVersion] = useState(0)
  const gTimer = useRef(null)
  const gInflight = useRef(false)
  const ackSeq = useRef(0)
  const ackLog = useRef([])
  const bump = () => setGroupVersion((v) => v + 1)

  const sheet = (section) => {
    const s = groupRef.current.sheets
    if (!s[section]) s[section] = { remote: {}, inflight: {}, pending: {} }
    return s[section]
  }

  const poll = useCallback(async () => {
    const seq = ackSeq.current
    try {
      const g = await api.group(session)
      setGroupInfo({ batch: g.batch, company: g.company, members: g.members || [] })
      // Simpanan yang dikonfirmasi selama poll berjalan ditimpakan lagi di atas respons.
      const late = ackLog.current.filter((x) => x.seq > seq)
      for (const [section, info] of Object.entries(g.sheets || {})) {
        let remote = { ...(info.data || {}) }
        for (const x of late) if (x.section === section) remote = { ...remote, ...x.patch }
        for (const k of Object.keys(remote)) if (remote[k] === null) delete remote[k]
        sheet(section).remote = remote
        groupRef.current.meta[section] = { updated_at: info.updated_at, updated_by: info.updated_by }
      }
      ackLog.current = ackLog.current.filter((x) => x.seq > ackSeq.current - 50)
      bump()
    } catch { /* coba lagi di putaran berikutnya */ }
  }, [session])

  const gFlush = useCallback(async () => {
    if (gInflight.current) return
    const sheets = groupRef.current.sheets
    const todo = Object.entries(sheets).filter(([, s]) => Object.keys(s.pending).length)
    if (!todo.length) return
    gInflight.current = true
    setStatus((s) => ({ ...s, state: 'saving', error: null }))
    let failed = false
    for (const [section, s] of todo) {
      s.inflight = s.pending
      s.pending = {}
      try {
        const res = await api.saveGroup(session, section, s.inflight)
        s.remote = { ...s.remote, ...s.inflight }
        for (const [k, v] of Object.entries(s.inflight)) if (v === null) delete s.remote[k]
        groupRef.current.meta[section] = { updated_at: res.updated_at, updated_by: null }
        ackSeq.current++
        ackLog.current.push({ seq: ackSeq.current, section, patch: s.inflight })
        s.inflight = {}
      } catch (e) {
        s.pending = { ...s.inflight, ...s.pending }
        s.inflight = {}
        failed = e.message
      }
    }
    gInflight.current = false
    bump()
    if (failed) {
      setStatus({ state: 'error', at: null, error: failed })
      arm(gTimer, 4000, gFlush)
    } else {
      setStatus({ state: 'saved', at: new Date(), error: null })
      if (Object.values(groupRef.current.sheets).some((s) => Object.keys(s.pending).length)) arm(gTimer, GROUP_SAVE_DELAY, gFlush)
    }
  }, [session])

  const setGroupField = useCallback((section, path, value) => {
    sheet(section).pending[path] = value === '' ? '' : value
    bump()
    arm(gTimer, GROUP_SAVE_DELAY, gFlush)
    setStatus((s) => (s.state === 'saving' ? s : { ...s, state: 'dirty' }))
  }, [gFlush])

  const groupView = useCallback((section) => {
    const s = groupRef.current.sheets[section]
    if (!s) return {}
    const v = { ...s.remote, ...s.inflight, ...s.pending }
    for (const k of Object.keys(v)) if (v[k] === null) delete v[k]
    return v
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupVersion])

  useEffect(() => {
    poll()
    const t = setInterval(() => { if (document.visibilityState === 'visible') poll() }, POLL_MS)
    return () => clearInterval(t)
  }, [poll])

  // ---- Simpan saat halaman ditutup ------------------------------------------
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') { flush(); gFlush() } }
    const onUnload = (e) => {
      const groupPending = Object.values(groupRef.current.sheets).some((s) => Object.keys(s.pending).length)
      if (Object.keys(pending.current).length || groupPending) { flush(); gFlush(); e.preventDefault(); e.returnValue = '' }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [flush, gFlush])

  const value = {
    session, participant: initial.participant, responses, update, status, flush,
    tests, setTests, evaluation, setEvaluation,
    groupInfo, groupVersion, groupView, setGroupField, groupMeta: groupRef.current.meta, pollGroup: poll,
  }
  return <WorkbookCtx.Provider value={value}>{children}</WorkbookCtx.Provider>
}

export function useWorkbook() {
  return useContext(WorkbookCtx)
}

/** Lembar pribadi: data + setter (patch objek atau fungsi). */
export function useSection(id) {
  const { responses, update } = useWorkbook()
  const data = responses[id] || {}
  const set = useCallback((u) => update(id, u), [id, update])
  return [data, set]
}

/** Lembar kelompok: data bersarang + setter per path ("rows.0.customer"). */
export function useGroup(id) {
  const { groupView, setGroupField, groupVersion } = useWorkbook()
  const flat = groupView(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => unflatten(flat), [groupVersion, id])
  const set = useCallback((path, value) => setGroupField(id, path, value), [id, setGroupField])
  return [data, set]
}

/** Utilitas: array berpanjang minimal n; lubang dan field kosong diisi bawaan. */
export function arr(data, key, n, make = () => '') {
  const src = Array.isArray(data?.[key]) ? data[key] : []
  const len = Math.max(n, src.length)
  const out = []
  for (let i = 0; i < len; i++) {
    const base = make()
    const v = src[i]
    if (base !== null && typeof base === 'object') out.push({ ...base, ...(v && typeof v === 'object' ? v : {}) })
    else out.push(v ?? base)
  }
  return out
}
