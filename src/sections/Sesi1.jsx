import { useSection, useGroup, arr } from '../store.jsx'
import { Sheet, Block, Field, Text, Area, Choice, Note } from '../ui.jsx'
import { PERSPECTIVES, KATEGORI, SHEET } from '../data.js'
import { GroupTag, PersonalTag, Star } from './common.jsx'

const emptyCh = () => ({ teks: '', terpilih: false, kategori: '' })

export function Tantangan() {
  const c = SHEET.s1_tantangan
  const [data, set] = useSection('s1_tantangan')
  const put = (field, i, patch) => set((d) => {
    const a = arr(d, field, 3, emptyCh)
    a[i] = { ...a[i], ...patch }
    return { ...d, [field]: a }
  })
  const cols = [['perusahaan', 'Perusahaan'], ['pekerjaan', 'Pekerjaan saya']]
  const filled = cols.flatMap(([f, l]) => arr(data, f, 3, emptyCh).map((x, i) => ({ ...x, f, i, l })).filter((x) => x.teks.trim()))
  return (
    <Sheet c={c} scopeLine={<PersonalTag />}>
      <div className="grid-2">
        {cols.map(([field, label]) => (
          <Block key={field} title={label}>
            <div className="stack">
              {arr(data, field, 3, emptyCh).map((it, i) => (
                <div className="row-card" key={i}>
                  <span className="num">{i + 1}</span>
                  <div className="grow"><Area value={it.teks} onChange={(v) => put(field, i, { teks: v })} placeholder="Satu tantangan, sekonkret mungkin" /></div>
                  <Star on={it.terpilih} title="Terpilih sebagai tiga terbesar di meja" onClick={() => put(field, i, { terpilih: !it.terpilih })} />
                </div>
              ))}
            </div>
          </Block>
        ))}
      </div>
      <Block tone="tint" title={`Pleno · Slide ${c.pleno.slide}`} hint={c.pleno.text}>
        {!filled.length && <p className="muted small">Tulis tantangan Anda di atas dulu.</p>}
        <div className="stack">
          {filled.map((x) => (
            <div key={`${x.f}${x.i}`} className="pleno-row">
              <p>{x.terpilih && <b className="gold">★ </b>}{x.teks} <span className="muted small">· {x.l}</span></p>
              <Choice small options={KATEGORI} value={x.kategori} onChange={(v) => put(x.f, x.i, { kategori: v })} />
            </div>
          ))}
        </div>
      </Block>
    </Sheet>
  )
}

export function Customer() {
  const c = SHEET.s1_customer
  const [data, set] = useGroup('s1_customer')
  const rows = arr(data, 'rows', 3, () => ({ customer: '', kebutuhan: '', cara: '' }))
  return (
    <Sheet c={c} scopeLine={<GroupTag section="s1_customer" />}>
      <div className="cust">
        <div className="cust-head"><span>Siapa customer-nya?</span><span>Kebutuhan atau masalah mereka</span><span>Cara kami memenuhinya</span></div>
        <div className="cust-row example">
          <p>Contoh SPBU: pengendara pribadi dan armada niaga</p>
          <p>BBM selalu tersedia, layanan cepat, takaran tepat</p>
          <p>Jaringan SPBU, standar layanan, pembayaran non-tunai</p>
        </div>
        {rows.map((r, i) => (
          <div className="cust-row" key={i}>
            <Area value={r.customer} onChange={(v) => set(`rows.${i}.customer`, v)} placeholder={`Customer ${i + 1}`} aria-label="Siapa customer-nya" />
            <Area value={r.kebutuhan} onChange={(v) => set(`rows.${i}.kebutuhan`, v)} aria-label="Kebutuhan atau masalah mereka" />
            <Area value={r.cara} onChange={(v) => set(`rows.${i}.cara`, v)} aria-label="Cara kami memenuhinya" />
          </div>
        ))}
      </div>
    </Sheet>
  )
}

export function Refleksi() {
  const c = SHEET.s1_refleksi
  const [data, set] = useSection('s1_refleksi')
  return (
    <Sheet c={c} scopeLine={<PersonalTag />}>
      <Block>
        <Field label="Perspektif" group>
          <Choice options={PERSPECTIVES.map((p) => ({ value: p.key, label: p.label }))} value={data.perspektif} onChange={(v) => set({ perspektif: v })} />
        </Field>
        <Field label="Contohnya dari pekerjaan Anda" wide>
          <Area value={data.alasan} onChange={(v) => set({ alasan: v })} rows={2} />
        </Field>
      </Block>
      {data.perspektif && <Note tone="muted">Jawaban ini dipakai lagi di Sesi 3, saat Anda membedah KPI unit.</Note>}
    </Sheet>
  )
}
