import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useWorkbook } from '../store.jsx'
import { Sheet, Note } from '../ui.jsx'

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export default function Test({ kind, questions, config, refreshConfig }) {
  const { session, tests, setTests } = useWorkbook()
  const done = tests[kind]
  const draftKey = `pmf_patra_draft_${kind}_${session.id}`
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(draftKey)) || {} } catch { return {} }
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [key, setKey] = useState(null)
  const isPost = kind === 'post'
  const closed = isPost && !config?.post_open && !done

  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify(answers)) } catch { /* abaikan */ }
  }, [answers, draftKey])

  useEffect(() => {
    if (!closed) return
    const t = setInterval(refreshConfig, 15000)
    return () => clearInterval(t)
  }, [closed, refreshConfig])

  const answered = Object.keys(answers).length
  const total = questions.length

  async function submit() {
    if (answered < total) {
      setErr(`Masih ada ${total - answered} soal yang belum dijawab.`)
      return
    }
    setBusy(true); setErr('')
    try {
      const res = await api.submitTest(session, kind, answers)
      setTests((t) => ({ ...t, [kind]: { score: res.score, total: res.total, answers, submitted_at: new Date().toISOString() } }))
      if (res.key) setKey(res.key)
      try { localStorage.removeItem(draftKey) } catch { /* abaikan */ }
    } catch (e) {
      if (/post_test_closed/.test(e.message)) {
        setErr('Post-test belum dibuka oleh fasilitator.')
        refreshConfig()
      } else setErr(`Gagal mengirim: ${e.message}. Coba lagi.`)
    } finally {
      setBusy(false)
    }
  }

  const title = isPost ? 'Post-test' : 'Pre-test'
  const intro = isPost
    ? 'Soal yang sama dengan pre-test pagi tadi. Jawab sendiri. Selisih nilai pre-test dan post-test menjadi ukuran Level 2 di laporan pelatihan.'
    : 'Sepuluh soal pilihan ganda, sekitar 10 menit. Jawab sendiri, tanpa membuka bahan. Belum tahu jawabannya? Tidak apa-apa: inilah titik awal Anda.'

  if (closed) {
    return (
      <Sheet kicker="Evaluasi Level 2" title={title} intro={intro}>
        <Note tone="muted">Post-test akan dibuka oleh fasilitator pukul 16.00. Halaman ini memeriksa ulang secara otomatis.</Note>
        <button type="button" className="btn" onClick={refreshConfig}>Periksa sekarang</button>
      </Sheet>
    )
  }

  if (done) {
    const pre = tests.pre
    const shownAnswers = done.answers || answers
    return (
      <Sheet kicker="Evaluasi Level 2" title={title}>
        <div className="score">
          <div><span className="score-num">{done.score}</span><span className="score-of">/ {done.total}</span></div>
          <p>{isPost ? 'Nilai post-test Anda.' : 'Nilai pre-test Anda. Kita bandingkan dengan post-test sore nanti.'}</p>
          {isPost && pre && (
            <p className="delta">Pre-test {pre.score} → post-test {done.score} ({done.score - pre.score >= 0 ? '+' : ''}{done.score - pre.score})</p>
          )}
        </div>
        {isPost && key && (
          <div className="review">
            {questions.map((q) => {
              const mine = shownAnswers[String(q.no)]
              const right = key[String(q.no)]
              return (
                <div key={q.no} className={`review-q ${mine === right ? 'ok' : 'bad'}`}>
                  <p><b>{q.no}.</b> {q.question}</p>
                  <p className="small">Jawaban Anda: {LETTERS[mine]}. {q.options[mine]}</p>
                  {mine !== right && <p className="small">Jawaban benar: {LETTERS[right]}. {q.options[right]}</p>}
                </div>
              )
            })}
          </div>
        )}
      </Sheet>
    )
  }

  return (
    <Sheet kicker="Evaluasi Level 2" title={title} intro={intro}>
      <ol className="questions">
        {questions.map((q) => (
          <li key={q.no} className="question">
            <p className="q-text"><span>{q.no}</span>{q.question}</p>
            <div className="options">
              {q.options.map((o, i) => (
                <label key={i} className={`option ${answers[String(q.no)] === i ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name={`q${q.no}`}
                    checked={answers[String(q.no)] === i}
                    onChange={() => setAnswers((a) => ({ ...a, [String(q.no)]: i }))}
                  />
                  <span className="opt-letter">{LETTERS[i]}</span>
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {err && <Note tone="bad">{err}</Note>}
      <div className="submit-bar">
        <span className="muted">{answered} dari {total} soal terjawab</span>
        <button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'Mengirim…' : `Kirim ${title.toLowerCase()}`}</button>
      </div>
      <p className="small muted">Jawaban hanya bisa dikirim satu kali.</p>
    </Sheet>
  )
}
