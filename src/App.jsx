import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, configured, loadSession, storeSession, clearSession, resumeLink } from './api.js'
import { WorkbookProvider, useWorkbook, unflatten } from './store.jsx'
import { NAV, SECTION_IDS, COMPANIES, GROUP_SECTIONS, SHEET } from './data.js'
import { Note, useScrollTop } from './ui.jsx'
import { Tantangan, Customer, Refleksi } from './sections/Sesi1.jsx'
import { Swot, Kuadran, Rkap, Peta } from './sections/Sesi2.jsx'
import { Kartu, Tracker, Perbaikan } from './sections/Sesi3.jsx'
import { Komitmen, Evaluasi } from './sections/Penutup.jsx'
import Test from './sections/Test.jsx'
import Summary from './sections/Summary.jsx'
import Pleno from './sections/Pleno.jsx'
import Facilitator from './Facilitator.jsx'
import Shell from './Shell.jsx'

function useHash() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash.replace(/^#\/?/, '')
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function App() {
  const route = useHash()

  // Tautan pribadi: #/r/<id>.<token>
  if (route.startsWith('r/')) {
    const [id, token] = route.slice(2).split('.')
    if (UUID.test(id || '') && UUID.test(token || '')) {
      storeSession({ id, token })
    }
    window.location.replace(`${window.location.pathname}${window.location.search}#/`)
    return null
  }

  if (!configured) {
    return <Shell><Note tone="bad">Aplikasi belum dikonfigurasi: VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi.</Note></Shell>
  }

  if (route.startsWith('fasilitator')) return <Facilitator />
  return <Participant route={route} />
}

function Participant({ route }) {
  const [session, setSession] = useState(loadSession)
  const [state, setState] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    let alive = true
    setError('')
    api.state(session)
      .then((s) => { if (alive) setState(s) })
      .catch((e) => {
        if (!alive) return
        if (/unauthorized/.test(e.message)) { clearSession(); setSession(null) }
        else setError(e.message)
      })
    return () => { alive = false }
  }, [session])

  if (!session) {
    return <Register onDone={(s, st) => { storeSession(s); setState(st); setSession(s) }} />
  }
  if (error) {
    return (
      <Shell>
        <main className="center">
          <Note tone="bad">Tidak bisa memuat workbook: {error}</Note>
          <button className="btn" onClick={() => window.location.reload()}>Muat ulang</button>
        </main>
      </Shell>
    )
  }
  if (!state) return <Shell><main className="center"><p className="muted">Memuat workbook…</p></main></Shell>

  return (
    <WorkbookProvider session={session} initial={state}>
      <Workbook route={route} onLogout={() => { clearSession(); setSession(null); setState(null) }} />
    </WorkbookProvider>
  )
}

function Register({ onDone }) {
  const params = new URLSearchParams(window.location.search)
  const batch = (params.get('batch') || 'batch-1').slice(0, 40)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [other, setOther] = useState('')
  const [unit, setUnit] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    const comp = company === '__other' ? other.trim() : company
    if (name.trim().length < 2) return setErr('Isi nama lengkap Anda.')
    if (!comp || comp.length < 2) return setErr('Pilih atau tulis anak perusahaan Anda.')
    if (!unit.trim()) return setErr('Isi unit kerja Anda.')
    setBusy(true); setErr('')
    try {
      const s = await api.register(name.trim(), comp, unit.trim(), batch)
      const st = await api.state(s)
      onDone(s, st)
      window.location.hash = '#/pretest'
    } catch (e2) {
      setErr(`Pendaftaran gagal: ${e2.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Shell>
      <main className="register">
        <div className="register-hero">
          <p className="kicker light">Workbook digital</p>
          <h1>Performance Management Fundamental</h1>
          <p>Satu tempat untuk pre-test, semua latihan kelompok, rencana perbaikan KPI unit, post-test, dan evaluasi. Jawaban tersimpan otomatis.</p>
        </div>
        <form className="register-form" onSubmit={submit}>
          <h2>Mulai</h2>
          <label className="field"><span className="field-label">Nama lengkap</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
          </label>
          <label className="field"><span className="field-label">Anak perusahaan</span>
            <select value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">Pilih…</option>
              {COMPANIES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="__other">Lainnya…</option>
            </select>
          </label>
          {company === '__other' && (
            <label className="field"><span className="field-label">Nama perusahaan</span>
              <input value={other} onChange={(e) => setOther(e.target.value)} maxLength={120} />
            </label>
          )}
          <label className="field"><span className="field-label">Unit kerja</span>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Contoh: Distribusi Wilayah Jawa Bagian Barat" maxLength={120} />
          </label>
          {err && <Note tone="bad">{err}</Note>}
          <button className="btn btn-block" disabled={busy}>{busy ? 'Menyiapkan workbook…' : 'Buka workbook'}</button>
          <p className="small muted">Sudah pernah mendaftar di perangkat lain? Buka tautan pribadi Anda dari perangkat itu (menu “Tautan pribadi”).</p>
        </form>
      </main>
    </Shell>
  )
}

function hasContent(v) {
  if (v == null) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (typeof v === 'number') return true
  if (typeof v === 'boolean') return v
  if (Array.isArray(v)) return v.some(hasContent)
  if (typeof v === 'object') return Object.values(v).some(hasContent)
  return false
}

function SaveStatus() {
  const { status } = useWorkbook()
  const map = {
    idle: ['', 'Tersimpan otomatis'],
    dirty: ['pending', 'Menyimpan…'],
    saving: ['pending', 'Menyimpan…'],
    saved: ['ok', 'Tersimpan'],
    error: ['bad', 'Gagal menyimpan, mencoba lagi'],
  }
  const [tone, label] = map[status.state] || map.idle
  return <span className={`save save-${tone}`} title={status.error || ''}><i />{label}</span>
}

function Workbook({ route, onLogout }) {
  const { participant, responses, tests, evaluation, session, groupView, groupVersion, groupInfo } = useWorkbook()
  const [questions, setQuestions] = useState([])
  const [config, setConfig] = useState({ post_open: false })
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const current = SECTION_IDS.includes(route) ? route : (tests.pre ? 's1_tantangan' : 'pretest')
  useScrollTop(current)

  const refreshConfig = useCallback(() => { api.config().then(setConfig).catch(() => {}) }, [])
  useEffect(() => {
    api.questions().then(setQuestions).catch(() => {})
    refreshConfig()
  }, [refreshConfig])
  useEffect(() => { setMenuOpen(false) }, [current])

  const done = useMemo(() => {
    const d = {}
    for (const id of SECTION_IDS) d[id] = hasContent(responses[id])
    d.pretest = !!tests.pre
    d.posttest = !!tests.post
    d.evaluasi = !!evaluation
    for (const id of GROUP_SECTIONS) d[id] = hasContent(groupView(id))
    d.pleno = !!groupView('s3_perbaikan').lap_status
    return d
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responses, tests, evaluation, groupVersion])

  const idx = SECTION_IDS.indexOf(current)
  const prev = SECTION_IDS[idx - 1]
  const next = SECTION_IDS[idx + 1]
  const labelOf = (id) => NAV.flatMap((g) => g.items).find((i) => i.id === id)?.label

  let body
  switch (current) {
    case 'pretest': body = <Test kind="pre" questions={questions} config={config} refreshConfig={refreshConfig} />; break
    case 's1_tantangan': body = <Tantangan />; break
    case 's1_customer': body = <Customer />; break
    case 's1_refleksi': body = <Refleksi />; break
    case 's2_swot': body = <Swot />; break
    case 's2_kuadran': body = <Kuadran />; break
    case 's2_rkap': body = <Rkap />; break
    case 's2_peta': body = <Peta />; break
    case 's3_kartu': body = <Kartu />; break
    case 's3_tracker': body = <Tracker />; break
    case 's3_perbaikan': body = <Perbaikan />; break
    case 'pleno': body = <Pleno />; break
    case 'komitmen': body = <Komitmen />; break
    case 'posttest': body = <Test kind="post" questions={questions} config={config} refreshConfig={refreshConfig} />; break
    case 'evaluasi': body = <Evaluasi />; break
    case 'ringkasan': body = (
      <article className="sheet">
        <header className="sheet-head no-print">
          <p className="kicker">{SHEET.ringkasan.kicker}</p>
          <h1>{SHEET.ringkasan.title}</h1>
          <p className="intro">{SHEET.ringkasan.intro}</p>
          <button className="btn" onClick={() => window.print()}>Cetak / simpan PDF</button>
          {SHEET.ringkasan.download && (
            <div className="download-card">
              <div>
                <b>{SHEET.ringkasan.download.title}</b>
                <p>{SHEET.ringkasan.download.desc}</p>
              </div>
              <a className="btn" href={SHEET.ringkasan.download.url} target="_blank" rel="noopener noreferrer">{SHEET.ringkasan.download.label}</a>
            </div>
          )}
        </header>
        <Summary
          responses={responses} participant={participant} tests={tests}
          g={Object.fromEntries(GROUP_SECTIONS.map((id) => [id, unflatten(groupView(id))]))}
          members={groupInfo?.members} company={groupInfo?.company}
        />
      </article>
    ); break
    default: body = null
  }

  const total = SECTION_IDS.length - 1 // tanpa ringkasan
  const doneCount = SECTION_IDS.filter((id) => id !== 'ringkasan' && done[id]).length

  return (
    <Shell right={
      <div className="topbar-right">
        <SaveStatus />
        <button className="btn-top" onClick={() => setLinkOpen(true)}>Tautan pribadi</button>
        <button className="btn-top menu-btn" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen}>Daftar isi</button>
      </div>
    }>
      <div className="layout">
        <nav className={`sidebar ${menuOpen ? 'open' : ''}`}>
          <div className="me">
            <b>{participant.full_name}</b>
            <span>{participant.company}{participant.unit ? ` · ${participant.unit}` : ''}</span>
            <div className="progress"><i style={{ width: `${(doneCount / total) * 100}%` }} /></div>
            <span className="small">{doneCount} dari {total} lembar terisi</span>
            <span className="small legend"><b className="grp">K</b> lembar kelompok, diisi bersama</span>
          </div>
          {NAV.map((g) => (
            <div key={g.group} className="nav-group">
              <p>{g.group}</p>
              {g.items.map((it) => (
                <a key={it.id} href={`#/${it.id}`} className={`${current === it.id ? 'active' : ''} ${done[it.id] ? 'done' : ''}`}>
                  <i className="dot" />
                  <span className="grow">{it.label}{it.scope === 'group' && <b className="grp" title="Lembar kelompok">K</b>}</span>
                  {it.id === 'posttest' && !config.post_open && !tests.post ? <em>terkunci</em> : <em>{it.time}</em>}
                </a>
              ))}
            </div>
          ))}
          <button className="link-btn" onClick={() => { if (window.confirm('Keluar dari workbook di perangkat ini? Simpan dulu tautan pribadi Anda agar bisa kembali.')) onLogout() }}>Keluar dari perangkat ini</button>
        </nav>
        <main className="content">
          {body}
          {current !== 'ringkasan' && (
            <div className="pager no-print">
              {prev ? <a href={`#/${prev}`} className="btn-ghost">← {labelOf(prev)}</a> : <span />}
              {next ? <a href={`#/${next}`} className="btn">{labelOf(next)} →</a> : <span />}
            </div>
          )}
        </main>
      </div>
      {linkOpen && <LinkDialog link={resumeLink(session)} onClose={() => setLinkOpen(false)} />}
    </Shell>
  )
}

function LinkDialog({ link, onClose }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { setCopied(false) }
  }
  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>Tautan pribadi Anda</h2>
        <p>Buka tautan ini untuk melanjutkan workbook di perangkat lain, atau setelah pelatihan untuk mengisi komitmen 30 hari. Jangan bagikan ke orang lain.</p>
        <input readOnly value={link} onFocus={(e) => e.target.select()} />
        <div className="row-actions">
          <button className="btn" onClick={copy}>{copied ? 'Tersalin' : 'Salin tautan'}</button>
          <a className="btn-ghost" href={`mailto:?subject=${encodeURIComponent('Workbook Performance Management Fundamental')}&body=${encodeURIComponent(link)}`}>Kirim ke email saya</a>
          <button className="btn-ghost" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  )
}
