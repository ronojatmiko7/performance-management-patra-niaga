import { useState } from 'react'
import { api } from '../api.js'
import { useSection, useWorkbook, arr } from '../store.jsx'
import { Sheet, Field, Area, Note } from '../ui.jsx'
import { EVAL_GROUPS, EVAL_ITEMS, SHEET } from '../data.js'
import { PersonalTag } from './common.jsx'

export function Komitmen() {
  const c = SHEET.komitmen
  const [data, set] = useSection('komitmen')
  const items = arr(data, 'minggu', 4, () => ({ rencana: '', selesai: false }))
  const put = (i, patch) => set((d) => {
    const a = arr(d, 'minggu', 4, () => ({ rencana: '', selesai: false }))
    a[i] = { ...a[i], ...patch }
    return { ...d, minggu: a }
  })
  return (
    <Sheet c={c} scopeLine={<PersonalTag />}>
      <div className="weeks">
        {items.slice(0, 4).map((it, i) => (
          <section key={i} className={`week ${it.selesai ? 'done' : ''}`}>
            <div className="week-head">
              <b>Minggu {i + 1}</b>
              <label className="check">
                <input type="checkbox" checked={!!it.selesai} onChange={(e) => put(i, { selesai: e.target.checked })} />
                Selesai
              </label>
            </div>
            <p className="week-task">{c.weeks[i]}</p>
            <Area value={it.rencana} onChange={(v) => put(i, { rencana: v })} placeholder="Langkah saya: apa, dengan siapa, kapan" rows={3} />
          </section>
        ))}
      </div>
    </Sheet>
  )
}

export function Evaluasi() {
  const { session, evaluation, setEvaluation } = useWorkbook()
  const [ratings, setRatings] = useState(evaluation?.ratings || {})
  const [best, setBest] = useState(evaluation?.comment_best || '')
  const [improve, setImprove] = useState(evaluation?.comment_improve || '')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const answered = EVAL_ITEMS.filter((_, i) => ratings[`q${i + 1}`]).length

  async function submit() {
    if (answered < EVAL_ITEMS.length) {
      setMsg({ tone: 'bad', text: `Masih ada ${EVAL_ITEMS.length - answered} pernyataan yang belum dinilai.` })
      return
    }
    setBusy(true); setMsg(null)
    try {
      await api.submitEval(session, ratings, best, improve)
      setEvaluation({ ratings, comment_best: best, comment_improve: improve })
      setMsg({ tone: 'ok', text: 'Terima kasih. Evaluasi Anda sudah tersimpan. Anda masih bisa mengubahnya dan mengirim ulang.' })
    } catch (e) {
      setMsg({ tone: 'bad', text: `Gagal mengirim: ${e.message}` })
    } finally {
      setBusy(false)
    }
  }

  let n = 0
  return (
    <Sheet c={SHEET.evaluasi} scopeLine={<PersonalTag />}>
      {EVAL_GROUPS.map((g) => (
        <section key={g.title} className="ratings">
          <h2 className="ratings-title">{g.title}</h2>
          {g.items.map((text) => {
            n += 1
            const k = `q${n}`
            const num = n
            return (
              <div key={k} className="rating-row">
                <p><span className="muted">{num}.</span> {text}</p>
                <div className="scale" role="radiogroup" aria-label={text}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      type="button" key={v} role="radio" aria-checked={ratings[k] === v}
                      className={ratings[k] === v ? 'active' : ''}
                      onClick={() => setRatings((r) => ({ ...r, [k]: v }))}
                    >{v}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </section>
      ))}
      <div className="grid-2">
        <Field label="Apa yang paling bermanfaat bagi Anda?"><Area value={best} onChange={setBest} rows={3} /></Field>
        <Field label="Apa yang perlu diperbaiki?"><Area value={improve} onChange={setImprove} rows={3} /></Field>
      </div>
      {msg && <Note tone={msg.tone}>{msg.text}</Note>}
      <div className="submit-bar">
        <span className="muted">{answered} dari {EVAL_ITEMS.length} dinilai</span>
        <button type="button" className="btn" disabled={busy} onClick={submit}>{busy ? 'Mengirim…' : evaluation ? 'Kirim ulang evaluasi' : 'Kirim evaluasi'}</button>
      </div>
    </Sheet>
  )
}
