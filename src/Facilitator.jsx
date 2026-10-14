import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import Shell from './Shell.jsx'
import { Note } from './ui.jsx'
import { EVAL_ITEMS, QUADRANTS, SECTION_IDS } from './data.js'
import Summary from './sections/Summary.jsx'

const PIN_KEY = 'pmf_patra_pin'
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const f1 = (n) => (n == null ? '–' : n.toLocaleString('id-ID', { maximumFractionDigits: 1 }))
const WORK_SECTIONS = SECTION_IDS.filter((s) => !['pretest', 'posttest', 'evaluasi', 'ringkasan'].includes(s))

function filled(v) {
  if (v == null) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.some(filled)
  if (typeof v === 'object') return Object.values(v).some(filled)
  return typeof v === 'number' || v === true
}

function csvEscape(v) {
  const s = v == null ? '' : String(v)
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function download(name, content, type) {
  const blob = new Blob([content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export default function Facilitator() {
  const [pin, setPin] = useState(() => { try { return sessionStorage.getItem(PIN_KEY) || '' } catch { return '' } })
  const [input, setInput] = useState('')
  const [batch, setBatch] = useState('')
  const [report, setReport] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('ringkas')
  const [open, setOpen] = useState(null)

  const load = useCallback(async (p = pin, b = batch) => {
    if (!p) return
    try {
      const r = await api.adminReport(p, b)
      setReport(r); setErr('')
      try { sessionStorage.setItem(PIN_KEY, p) } catch { /* abaikan */ }
      return true
    } catch (e) {
      if (/unauthorized/.test(e.message)) {
        setPin(''); setReport(null); setErr('PIN salah.')
        try { sessionStorage.removeItem(PIN_KEY) } catch { /* abaikan */ }
      } else setErr(e.message)
      return false
    }
  }, [pin, batch])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!report) return
    const t = setInterval(() => load(), 20000)
    return () => clearInterval(t)
  }, [report, load])

  async function login(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await load(input.trim(), batch)
    if (ok) setPin(input.trim())
    setBusy(false)
  }

  async function togglePost() {
    setBusy(true)
    try {
      await api.adminSetPostOpen(pin, !report.post_open)
      await load()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const people = report?.participants || []
  const stats = useMemo(() => {
    const pre = people.filter((p) => p.pre != null).map((p) => p.pre)
    const post = people.filter((p) => p.post != null).map((p) => p.post)
    const paired = people.filter((p) => p.pre != null && p.post != null)
    const evals = people.filter((p) => p.evaluation)
    const items = EVAL_ITEMS.map((_, i) => avg(evals.map((p) => Number(p.evaluation.ratings?.[`q${i + 1}`])).filter((n) => n >= 1)))
    const companies = {}
    for (const p of people) {
      const c = (companies[p.company] ||= { n: 0, pre: [], post: [] })
      c.n++
      if (p.pre != null) c.pre.push(p.pre)
      if (p.post != null) c.post.push(p.post)
    }
    return {
      n: people.length, total: people[0]?.total || 10,
      preAvg: avg(pre), postAvg: avg(post), preN: pre.length, postN: post.length,
      gain: avg(paired.map((p) => p.post - p.pre)), pairedN: paired.length,
      evalN: evals.length, items, overall: avg(items.filter((x) => x != null)),
      companies,
    }
  }, [people])

  function exportCsv() {
    const head = ['Nama', 'Perusahaan', 'Unit', 'Batch', 'Pre-test', 'Post-test', 'Selisih', 'Lembar terisi',
      ...EVAL_ITEMS.map((_, i) => `Evaluasi ${i + 1}`), 'Paling bermanfaat', 'Perlu diperbaiki']
    const rows = people.map((p) => [
      p.full_name, p.company, p.unit, p.batch, p.pre, p.post, p.pre != null && p.post != null ? p.post - p.pre : '',
      WORK_SECTIONS.filter((s) => filled(p.responses?.[s])).length,
      ...EVAL_ITEMS.map((_, i) => p.evaluation?.ratings?.[`q${i + 1}`] ?? ''),
      p.evaluation?.comment_best, p.evaluation?.comment_improve,
    ])
    const csv = '﻿' + [head, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
    download(`pmf-patra-niaga-${batch || 'semua'}.csv`, csv, 'text/csv;charset=utf-8')
  }

  function exportJson() {
    download(`pmf-patra-niaga-${batch || 'semua'}.json`, JSON.stringify(report, null, 2), 'application/json')
  }

  if (!pin || !report) {
    return (
      <Shell>
        <main className="center">
          <form className="register-form narrow" onSubmit={login}>
            <h2>Halaman fasilitator</h2>
            <label className="field"><span className="field-label">PIN</span>
              <input type="password" value={input} onChange={(e) => setInput(e.target.value)} autoFocus autoComplete="current-password" />
            </label>
            {err && <Note tone="bad">{err}</Note>}
            <button className="btn btn-block" disabled={busy || !input}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
          </form>
        </main>
      </Shell>
    )
  }

  const groups = Object.entries(
    people.reduce((acc, p) => { (acc[p.company] ||= []).push(p); return acc }, {}),
  )

  return (
    <Shell right={<div className="topbar-right"><span className="save save-ok"><i />Diperbarui otomatis</span></div>}>
      <main className="admin">
        <div className="admin-bar">
          <div>
            <p className="kicker">Fasilitator</p>
            <h1>Dashboard pelatihan</h1>
          </div>
          <div className="admin-controls">
            <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch">
              <option value="">Semua batch</option>
              {(report.batches || []).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <button className={`btn ${report.post_open ? 'btn-danger' : ''}`} onClick={togglePost} disabled={busy}>
              {report.post_open ? 'Tutup post-test' : 'Buka post-test'}
            </button>
            <button className="btn-ghost" onClick={exportCsv}>Unduh CSV</button>
            <button className="btn-ghost" onClick={exportJson}>Unduh JSON</button>
            <button className="btn-ghost" onClick={() => { try { sessionStorage.removeItem(PIN_KEY) } catch { /* */ } setPin(''); setReport(null); setInput('') }}>Keluar</button>
          </div>
        </div>
        {err && <Note tone="bad">{err}</Note>}
        <Note tone={report.post_open ? 'ok' : 'muted'}>
          Post-test saat ini <b>{report.post_open ? 'TERBUKA' : 'TERKUNCI'}</b> untuk semua peserta.
        </Note>

        <div className="kpis">
          <div className="kpi"><span>Peserta</span><b>{stats.n}</b></div>
          <div className="kpi"><span>Rata-rata pre-test</span><b>{f1(stats.preAvg)}</b><em>{stats.preN} peserta · skala {stats.total}</em></div>
          <div className="kpi"><span>Rata-rata post-test</span><b>{f1(stats.postAvg)}</b><em>{stats.postN} peserta</em></div>
          <div className="kpi"><span>Kenaikan rata-rata (L2)</span><b>{stats.gain == null ? '–' : `${stats.gain >= 0 ? '+' : ''}${f1(stats.gain)}`}</b><em>{stats.pairedN} pasangan pre–post</em></div>
          <div className="kpi"><span>Kepuasan (L1)</span><b>{f1(stats.overall)}</b><em>{stats.evalN} evaluasi · skala 5</em></div>
        </div>

        <div className="tabs">
          {[['ringkas', 'Peserta'], ['kelompok', 'Bahan pleno per perusahaan'], ['evaluasi', 'Evaluasi L1']].map(([k, l]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>

        {tab === 'ringkas' && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead><tr><th>Nama</th><th>Perusahaan</th><th>Unit</th><th>Pre</th><th>Post</th><th>Δ</th><th>Lembar</th><th>Eval</th><th /></tr></thead>
              <tbody>
                {people.map((p) => {
                  const n = WORK_SECTIONS.filter((s) => filled(p.responses?.[s])).length
                  return (
                    <tr key={p.id}>
                      <td><b>{p.full_name}</b><br /><span className="small muted">{p.batch}</span></td>
                      <td>{p.company}</td><td>{p.unit}</td>
                      <td>{p.pre ?? '–'}</td><td>{p.post ?? '–'}</td>
                      <td>{p.pre != null && p.post != null ? `${p.post - p.pre >= 0 ? '+' : ''}${p.post - p.pre}` : '–'}</td>
                      <td>{n}/{WORK_SECTIONS.length}</td>
                      <td>{p.evaluation ? '✓' : '–'}</td>
                      <td><button className="link-btn" onClick={() => setOpen(p)}>Lihat</button></td>
                    </tr>
                  )
                })}
                {!people.length && <tr><td colSpan={9} className="muted">Belum ada peserta.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'kelompok' && (
          <div className="groups">
            {groups.map(([company, ps]) => {
              const c = stats.companies[company]
              return (
                <section key={company} className="group">
                  <h2>{company}</h2>
                  <p className="small muted">{ps.length} peserta · pre {f1(avg(c.pre))} → post {f1(avg(c.post))}</p>
                  {ps.map((p) => {
                    const k = p.responses?.s2_kuadran || {}
                    const q = k.eksternal && k.internal ? QUADRANTS[`${k.eksternal}-${k.internal}`]?.name : null
                    const kpi = p.responses?.s3_kartu?.nama
                    const per = p.responses?.s3_perbaikan || {}
                    const lap = [per.lap_status, per.lap_penyebab, per.lap_langkah].filter((s) => s?.trim()).join(' ')
                    return (
                      <div key={p.id} className="group-p">
                        <b>{p.full_name}</b> <span className="muted small">{p.unit}</span>
                        {q && <p><span className="tag tag-info">{q}</span> {k.grand_strategy}</p>}
                        {kpi && <p><span className="muted small">KPI unit:</span> {kpi}</p>}
                        {lap && <blockquote className="quote light">“{lap}”</blockquote>}
                        <button className="link-btn" onClick={() => setOpen(p)}>Buka workbook</button>
                      </div>
                    )
                  })}
                </section>
              )
            })}
            {!groups.length && <p className="muted">Belum ada data.</p>}
          </div>
        )}

        {tab === 'evaluasi' && (
          <div className="evalgrid">
            <div className="bars">
              {EVAL_ITEMS.map((t, i) => (
                <div key={i} className="bar-row">
                  <p>{i + 1}. {t}</p>
                  <div className="bar"><i style={{ width: `${((stats.items[i] || 0) / 5) * 100}%` }} /></div>
                  <b>{f1(stats.items[i])}</b>
                </div>
              ))}
            </div>
            <div className="comments">
              <h3>Paling bermanfaat</h3>
              <ul>{people.filter((p) => p.evaluation?.comment_best?.trim()).map((p) => <li key={p.id}>{p.evaluation.comment_best}</li>)}</ul>
              <h3>Perlu diperbaiki</h3>
              <ul>{people.filter((p) => p.evaluation?.comment_improve?.trim()).map((p) => <li key={p.id}>{p.evaluation.comment_improve}</li>)}</ul>
            </div>
          </div>
        )}
      </main>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
            <div className="row-actions end"><button className="btn-ghost" onClick={() => setOpen(null)}>Tutup</button></div>
            <Summary responses={open.responses} participant={open} />
          </div>
        </div>
      )}
    </Shell>
  )
}
