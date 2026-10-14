import { useState } from 'react'
import { api } from '../api.js'
import { useSection, useWorkbook, arr } from '../store.jsx'
import { Sheet, Block, Field, Area, Text, Note } from '../ui.jsx'
import { EVAL_ITEMS } from '../data.js'

const MINGGU = [
  'Lengkapi tracker KPI unit bersama tim, dari sumber datanya.',
  'Diskusikan strategy map dan Kartu KPI unit dengan atasan.',
  'Jalankan satu tuas dari rencana perbaikan.',
  'Laporkan hasilnya dengan format tiga kalimat.',
]

export function Komitmen() {
  const [data, set] = useSection('komitmen')
  const items = arr(data, 'minggu', 4, () => ({ rencana: '', selesai: false }))
  const put = (i, patch) => set((d) => {
    const a = arr(d, 'minggu', 4, () => ({ rencana: '', selesai: false }))
    a[i] = { ...a[i], ...patch }
    return { ...d, minggu: a }
  })
  return (
    <Sheet
      kicker="Pleno · Penutup"
      title="Komitmen 30 hari"
      intro="Tulis langkah konkret Anda untuk setiap minggu. Kembali ke halaman ini lewat tautan pribadi Anda dan centang yang sudah selesai."
    >
      <div className="weeks">
        {items.map((it, i) => (
          <section key={i} className={`week ${it.selesai ? 'done' : ''}`}>
            <div className="week-head">
              <b>Minggu {i + 1}</b>
              <label className="check">
                <input type="checkbox" checked={!!it.selesai} onChange={(e) => put(i, { selesai: e.target.checked })} />
                Selesai
              </label>
            </div>
            <p className="small muted">{MINGGU[i]}</p>
            <Area value={it.rencana} onChange={(v) => put(i, { rencana: v })} placeholder="Langkah saya: apa, dengan siapa, kapan" rows={3} />
          </section>
        ))}
      </div>
      <Block title="Siapa yang akan Anda ajak bicara tentang KPI unit minggu ini?">
        <Text value={data.atasan} onChange={(v) => set({ atasan: v })} placeholder="Nama atau jabatan" />
      </Block>
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

  return (
    <Sheet
      kicker="Evaluasi Level 1 · 10 menit"
      title="Evaluasi pelatihan"
      intro="Nilai setiap pernyataan: 1 = sangat tidak setuju, 5 = sangat setuju. Jawaban Anda membantu kami memperbaiki pelatihan berikutnya."
    >
      <div className="ratings">
        {EVAL_ITEMS.map((t, i) => {
          const k = `q${i + 1}`
          return (
            <div key={k} className="rating-row">
              <p><span className="muted">{i + 1}.</span> {t}</p>
              <div className="scale" role="radiogroup" aria-label={t}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button" key={n} role="radio" aria-checked={ratings[k] === n}
                    className={ratings[k] === n ? 'active' : ''}
                    onClick={() => setRatings((r) => ({ ...r, [k]: n }))}
                  >{n}</button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
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
