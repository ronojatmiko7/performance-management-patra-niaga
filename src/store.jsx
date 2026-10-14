import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const WorkbookCtx = createContext(null)

const SAVE_DELAY = 900

export function WorkbookProvider({ session, initial, children }) {
  const [responses, setResponses] = useState(initial.responses || {})
  const [tests, setTests] = useState(initial.tests || {})
  const [evaluation, setEvaluation] = useState(initial.evaluation || null)
  const [status, setStatus] = useState({ state: 'idle', at: null, error: null })
  const pending = useRef({}) // section -> data
  const timer = useRef(null)
  const inflight = useRef(false)

  const arm = (ms, fn) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { timer.current = null; fn() }, ms)
  }

  const flush = useCallback(async () => {
    if (inflight.current) return
    const entries = Object.entries(pending.current)
    if (!entries.length) return
    pending.current = {}
    inflight.current = true
    setStatus((s) => ({ ...s, state: 'saving', error: null }))
    try {
      for (const [section, data] of entries) {
        await api.save(session, section, data)
      }
      setStatus({ state: 'saved', at: new Date(), error: null })
    } catch (e) {
      // kembalikan ke antrean agar dicoba lagi
      for (const [section, data] of entries) {
        if (!(section in pending.current)) pending.current[section] = data
      }
      setStatus({ state: 'error', at: null, error: e.message })
      arm(5000, flush)
    } finally {
      inflight.current = false
      if (Object.keys(pending.current).length && !timer.current) arm(SAVE_DELAY, flush)
    }
  }, [session])

  const schedule = useCallback(() => {
    arm(SAVE_DELAY, flush)
    setStatus((s) => (s.state === 'saving' ? s : { ...s, state: 'dirty' }))
  }, [flush])

  const update = useCallback((section, updater) => {
    setResponses((prev) => {
      const cur = prev[section] || {}
      const next = typeof updater === 'function' ? updater(cur) : { ...cur, ...updater }
      pending.current[section] = next
      return { ...prev, [section]: next }
    })
    schedule()
  }, [schedule])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    const onUnload = (e) => {
      if (Object.keys(pending.current).length) { flush(); e.preventDefault(); e.returnValue = '' }
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [flush])

  const value = {
    session, participant: initial.participant, responses, update, status, flush,
    tests, setTests, evaluation, setEvaluation,
  }
  return <WorkbookCtx.Provider value={value}>{children}</WorkbookCtx.Provider>
}

export function useWorkbook() {
  return useContext(WorkbookCtx)
}

/** Data satu lembar kerja + setter (patch objek atau fungsi). */
export function useSection(id) {
  const { responses, update } = useWorkbook()
  const data = responses[id] || {}
  const set = useCallback((u) => update(id, u), [id, update])
  return [data, set]
}

/** Utilitas untuk array dalam data lembar kerja. */
export function arr(data, key, n, make = () => '') {
  const a = Array.isArray(data[key]) ? data[key].slice() : []
  while (a.length < n) a.push(make())
  return a
}
