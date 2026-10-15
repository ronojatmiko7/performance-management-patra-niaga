import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import Shell from './Shell.jsx'
import { Note } from './ui.jsx'
import { EVAL_GROUPS, EVAL_ITEMS, KATEGORI, GROUP_SECTIONS, SHEET } from './data.js'
import { unflatten } from './store.jsx'
import Summary from './sections/Summary.jsx'
import { PlenoView } from './sections/Pleno.jsx'
import { QuadrantGrid, quadrantOf } from './sections/Sesi2.jsx'

const PIN_KEY = 'pmf_patra_pin'
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const f1 = (n) => (n == null ? '–' : n.toLocaleString('id-ID', { maximumFractionDigits: 1 }))
const PERSONAL_SECTIONS = ['s1_tantangan', 's1_refleksi', 'komitmen']

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

const TABS = [
  ['peserta', 'Peserta'],
  ['tantangan', `Peta tantangan · slide ${SHEET.s1_tantangan.pleno.slide}`],
  ['kuadran', `Matriks kuadran · slide ${SHEET.s2_kuadran.slide}`],
  ['pleno', `Pleno · slide ${SHEET.pleno.slide}`],
  ['evaluasi', 'Evaluasi L1'],
]

export default function Facilitator() {
  const [pin, setPin] = useState(() => { try { return sessionStorage.getItem(PIN_KEY) || '' } catch { return '' } })
  const [input, setInput] = useState('')
  const [batch, setBatch] = useState('')
  const [report, setReport] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('peserta')
  const [open, setOpen] = useState(null)
  const [plenoIdx, setPlenoIdx] = useState(0)
  const [screen, setScreen] = useState(false)

  const load = useCallback(async (p = pin, b = batch) => {
    if (!p) return false
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
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 8000)
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

  const groups = useMemo(() => {
    const map = {}
    for (const p of people) {
      const key = `${p.batch}|${p.company}`
      ;(map[key] ||= { key, batch: p.batch, company: p.company, members: [], g: {} }).members.push({ id: p.id, name: p.full_name, unit: p.unit })
    }
    for (const gr of report?.groups || []) {
      const key = `${gr.batch}|${gr.company}`
      const target = (map[key] ||= { key, batch: gr.batch, company: gr.company, members: [], g: {} })
      for (const [s, flat] of Object.entries(gr.sheets || {})) target.g[s] = unflatten(flat)
    }
    return Object.values(map).sort((a, b) => a.company.localeCompare(b.company))
  }, [people, report])

  const stats = useMemo(() => {
    const pre = people.filter((p) => p.pre != null).map((p) => p.pre)
    const post = people.filter((p) => p.post != null).map((p) => p.post)
    const paired = people.filter((p) => p.pre != null && p.post != null)
    const evals = people.filter((p) => p.evaluation)
    const items = EVAL_ITEMS.map((_, i) => avg(evals.map((p) => Number(p.evaluation.ratings?.[`q${i + 1}`])).filter((n) => n >= 1)))
    return {
      n: people.length, total: people[0]?.total || 10,
      preAvg: avg(pre), postAvg: avg(post), preN: pre.length, postN: post.length,
      gain: avg(paired.map((p) => p.post - p.pre)), pairedN: paired.length,
      evalN: evals.length, items, overall: avg(items.filter((x) => x != null)),
    }
  }, [people])

  function exportCsv() {
    const head = ['Nama', 'Perusahaan', 'Unit', 'Batch', 'Pre-test', 'Post-test', 'Selisih',
      ...EVAL_ITEMS.map((t, i) => `E${i + 1} ${t}`), 'Paling bermanfaat', 'Perlu diperbaiki']
    const rows = people.map((p) => [
      p.full_name, p.company, p.unit, p.batch, p.pre, p.post, p.pre != null && p.post != null ? p.post - p.pre : '',
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

  const pg = groups[Math.min(plenoIdx, Math.max(0, groups.length - 1))]

  return (
    <Shell right={<div className="topbar-right"><span className="save save-ok"><i />Diperbarui tiap 8 detik</span></div>}>
      <main className={`admin ${screen ? 'screen-mode' : ''}`}>
        {!screen && (
          <>
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
              <div className="kpi"><span>Peserta</span><b>{stats.n}</b><em>{groups.length} kelompok</em></div>
              <div className="kpi"><span>Rata-rata pre-test</span><b>{f1(stats.preAvg)}</b><em>{stats.preN} peserta · skala {stats.total}</em></div>
              <div className="kpi"><span>Rata-rata post-test</span><b>{f1(stats.postAvg)}</b><em>{stats.postN} peserta</em></div>
              <div className="kpi"><span>Kenaikan rata-rata (L2)</span><b>{stats.gain == null ? '–' : `${stats.gain >= 0 ? '+' : ''}${f1(stats.gain)}`}</b><em>{stats.pairedN} pasangan pre–post</em></div>
              <div className="kpi"><span>Kepuasan (L1)</span><b>{f1(stats.overall)}</b><em>{stats.evalN} evaluasi · skala 5</em></div>
            </div>
          </>
        )}

        <div className="tabs">
          {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}
          {['tantangan', 'kuadran', 'pleno'].includes(tab) && (
            <button className="tab-right" onClick={() => setScreen((s) => !s)}>{screen ? 'Keluar mode layar' : 'Mode layar'}</button>
          )}
        </div>

        {tab === 'peserta' && (
          <>
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Kelompok</th><th>Anggota</th>{GROUP_SECTIONS.map((s) => <th key={s}>{SHEET[s].label}</th>)}</tr></thead>
                <tbody>
                  {groups.map((gr) => (
                    <tr key={gr.key}>
                      <td><b>{gr.company}</b><br /><span className="small muted">{gr.batch}</span></td>
                      <td>{gr.members.length}</td>
                      {GROUP_SECTIONS.map((s) => <td key={s}>{filled(gr.g[s]) ? '✓' : '–'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-wrap">
              <table className="admin-table">
                <thead><tr><th>Nama</th><th>Perusahaan</th><th>Unit</th><th>Pre</th><th>Post</th><th>Δ</th><th>Lembar pribadi</th><th>Eval</th><th /></tr></thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.full_name}</b><br /><span className="small muted">{p.batch}</span></td>
                      <td>{p.company}</td><td>{p.unit}</td>
                      <td>{p.pre ?? '–'}</td><td>{p.post ?? '–'}</td>
                      <td>{p.pre != null && p.post != null ? `${p.post - p.pre >= 0 ? '+' : ''}${p.post - p.pre}` : '–'}</td>
                      <td>{PERSONAL_SECTIONS.filter((s) => filled(p.responses?.[s])).length}/{PERSONAL_SECTIONS.length}</td>
                      <td>{p.evaluation ? '✓' : '–'}</td>
                      <td><button className="link-btn" onClick={() => setOpen(p)}>Lihat</button></td>
                    </tr>
                  ))}
                  {!people.length && <tr><td colSpan={9} className="muted">Belum ada peserta.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'tantangan' && <ChallengeBoard people={people} />}

        {tab === 'kuadran' && (
          <div className="board">
            <QuadrantGrid
              active=""
              chips={groups.reduce((acc, gr) => {
                const k = gr.g.s2_kuadran
                if (k?.eksternal && k?.internal) (acc[`${k.eksternal}-${k.internal}`] ||= []).push(gr.company)
                return acc
              }, {})}
            />
            <div className="gs-list">
              {groups.map((gr) => {
                const q = quadrantOf(gr.g.s2_kuadran)
                return (
                  <p key={gr.key}><b>{gr.company}</b>{q ? <> · <span className="tag tag-info">{q.name}</span> {gr.g.s2_kuadran?.grand_strategy}</> : <span className="muted"> · belum memilih</span>}</p>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'pleno' && (
          <div className="board">
            <div className="pleno-nav">
              <button className="btn-ghost" disabled={plenoIdx <= 0} onClick={() => setPlenoIdx((i) => Math.max(0, i - 1))}>←</button>
              <select value={plenoIdx} onChange={(e) => setPlenoIdx(Number(e.target.value))} aria-label="Kelompok">
                {groups.map((gr, i) => <option key={gr.key} value={i}>{gr.company} ({gr.batch})</option>)}
              </select>
              <button className="btn-ghost" disabled={plenoIdx >= groups.length - 1} onClick={() => setPlenoIdx((i) => Math.min(groups.length - 1, i + 1))}>→</button>
            </div>
            {pg ? <PlenoView g={pg.g} company={pg.company} members={pg.members} big /> : <p className="muted">Belum ada kelompok.</p>}
          </div>
        )}

        {tab === 'evaluasi' && (
          <div className="evalgrid">
            <div className="bars">
              {(() => {
                let n = 0
                return EVAL_GROUPS.map((g) => (
                  <div key={g.title} className="stack-sm">
                    <h3 className="ratings-title">{g.title}</h3>
                    {g.items.map((t) => {
                      const i = n++
                      return (
                        <div key={i} className="bar-row">
                          <p>{i + 1}. {t}</p>
                          <div className="bar"><i style={{ width: `${((stats.items[i] || 0) / 5) * 100}%` }} /></div>
                          <b>{f1(stats.items[i])}</b>
                        </div>
                      )
                    })}
                  </div>
                ))
              })()}
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
            {(() => {
              const gr = groups.find((x) => x.batch === open.batch && x.company === open.company)
              return (
                <Summary
                  responses={open.responses} participant={open}
                  tests={{ pre: open.pre != null ? { score: open.pre } : null, post: open.post != null ? { score: open.post } : null }}
                  g={gr?.g || {}} members={gr?.members || []} company={open.company}
                />
              )
            })()}
          </div>
        </div>
      )}
    </Shell>
  )
}

function ChallengeBoard({ people }) {
  const items = []
  for (const p of people) {
    const tan = p.responses?.s1_tantangan || {}
    for (const f of ['perusahaan', 'pekerjaan']) {
      for (const x of tan[f] || []) {
        if (x?.teks?.trim()) items.push({ ...x, who: p.full_name, company: p.company, f })
      }
    }
  }
  const starred = items.filter((x) => x.terpilih)
  const shown = starred.length ? starred : items
  const unlabeled = shown.filter((x) => !x.kategori).length
  return (
    <div className="board">
      <p className="muted">
        {starred.length ? `${starred.length} tantangan terpilih (★) dari ${items.length} yang ditulis.` : `${items.length} tantangan ditulis; belum ada yang ditandai ★.`}
        {unlabeled > 0 && ` ${unlabeled} belum diberi kotak.`}
      </p>
      <div className="ch-board">
        {KATEGORI.map((k) => {
          const list = shown.filter((x) => x.kategori === k.value)
          return (
            <section key={k.value} className="ch-col">
              <h3>{k.label} <span>{list.length}</span></h3>
              {k.hint && <p className="small muted">{k.hint}</p>}
              {list.map((x, i) => <p key={i} className="ch-note">{x.teks}<span>{x.company}</span></p>)}
            </section>
          )
        })}
      </div>
    </div>
  )
}
