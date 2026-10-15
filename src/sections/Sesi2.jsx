import { useGroup, arr } from '../store.jsx'
import { Sheet, Block, Field, Text, Area, Choice, Note } from '../ui.jsx'
import { PERSPECTIVES, QUADRANTS, SHEET } from '../data.js'
import { GroupTag, Star } from './common.jsx'

const SWOT = [
  { key: 'S', label: 'Kekuatan', sub: 'Internal · positif', tone: 'blue' },
  { key: 'W', label: 'Kelemahan', sub: 'Internal · negatif', tone: 'navy' },
  { key: 'O', label: 'Peluang', sub: 'Eksternal · positif', tone: 'blue' },
  { key: 'T', label: 'Ancaman', sub: 'Eksternal · negatif', tone: 'navy' },
]
const emptyPoint = () => ({ poin: '', bukti: '', utama: false })

export function Swot() {
  const [data, set] = useGroup('s2_swot')
  return (
    <Sheet c={SHEET.s2_swot} scopeLine={<GroupTag section="s2_swot" />}>
      <div className="swot">
        {SWOT.map((q) => {
          const pts = arr(data, q.key, 4, emptyPoint)
          const stars = pts.filter((p) => p.utama).length
          return (
            <section key={q.key} className={`swot-box swot-${q.tone}`}>
              <div className="swot-head">
                <span className="swot-letter">{q.key}</span>
                <div className="grow"><h2>{q.label}</h2><p>{q.sub}</p></div>
                <span className={`small ${stars > 2 ? 'warn-text' : 'muted'}`}>★ {stars}/2</span>
              </div>
              <div className="stack-sm">
                {pts.slice(0, 4).map((p, i) => (
                  <div key={i} className={`swot-item ${p.utama ? 'is-main' : ''}`}>
                    <div className="swot-item-row">
                      <Text value={p.poin} onChange={(v) => set(`${q.key}.${i}.poin`, v)} placeholder={`Poin ${i + 1}`} />
                      <Star on={p.utama} title="Poin terkuat" onClick={() => set(`${q.key}.${i}.utama`, !p.utama)} />
                    </div>
                    <Text value={p.bukti} onChange={(v) => set(`${q.key}.${i}.bukti`, v)} placeholder="Bukti: data, kejadian, pengamatan" className="sub-input" />
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </Sheet>
  )
}

export function quadrantOf(k) {
  if (!k?.eksternal || !k?.internal) return null
  return QUADRANTS[`${k.eksternal}-${k.internal}`] || null
}

export function QuadrantGrid({ active, onPick, chips }) {
  const cell = (eks, int) => {
    const key = `${eks}-${int}`
    const on = active === key
    const Tag = onPick ? 'button' : 'div'
    return (
      <Tag type={onPick ? 'button' : undefined} className={`quad ${on ? 'active' : ''}`} onClick={onPick ? () => onPick(eks, int) : undefined}>
        <b>{QUADRANTS[key].name}</b>
        <span>{eks === 'peluang' ? 'Peluang' : 'Ancaman'} + {int === 'kekuatan' ? 'Kekuatan' : 'Kelemahan'}</span>
        {chips?.[key]?.length > 0 && <div className="quad-chips">{chips[key].map((c) => <i key={c}>{c}</i>)}</div>}
      </Tag>
    )
  }
  return (
    <div className="quad-wrap">
      <div className="quad-axis-y"><span>Peluang</span><span>Ancaman</span></div>
      <div>
        <div className="quad-grid">
          {cell('peluang', 'kelemahan')}
          {cell('peluang', 'kekuatan')}
          {cell('ancaman', 'kelemahan')}
          {cell('ancaman', 'kekuatan')}
        </div>
        <div className="quad-axis-x"><span>Kelemahan</span><span>Kekuatan</span></div>
      </div>
    </div>
  )
}

export function Kuadran() {
  const [data, set] = useGroup('s2_kuadran')
  const q = quadrantOf(data)
  return (
    <Sheet c={SHEET.s2_kuadran} scopeLine={<GroupTag section="s2_kuadran" />}>
      <div className="grid-2">
        <Block title="1 · Lingkungan eksternal">
          <Choice options={[{ value: 'peluang', label: 'Peluang lebih besar' }, { value: 'ancaman', label: 'Ancaman lebih besar' }]} value={data.eksternal} onChange={(v) => set('eksternal', v)} />
        </Block>
        <Block title="2 · Kondisi internal">
          <Choice options={[{ value: 'kekuatan', label: 'Kekuatan lebih besar' }, { value: 'kelemahan', label: 'Kelemahan lebih besar' }]} value={data.internal} onChange={(v) => set('internal', v)} />
        </Block>
      </div>
      <QuadrantGrid active={data.eksternal && data.internal ? `${data.eksternal}-${data.internal}` : ''} onPick={(e, i) => { set('eksternal', e); set('internal', i) }} />
      {q && <Note><b>3 · Kuadran {q.name}.</b> {q.desc}</Note>}
      <Block title="4 · Grand strategy kelompok">
        <Field label="Grand strategy dalam satu kalimat" wide>
          <Area value={data.grand_strategy} onChange={(v) => set('grand_strategy', v)} placeholder="Contoh: Membenahi keandalan armada agar bisa merebut permintaan B2B yang sedang tumbuh" />
        </Field>
        <Field label="Alasannya" wide>
          <Area value={data.alasan} onChange={(v) => set('alasan', v)} />
        </Field>
      </Block>
    </Sheet>
  )
}

export function Rkap() {
  const [data, set] = useGroup('s2_rkap')
  const [kuadran] = useGroup('s2_kuadran')
  const rows = arr(data, 'rows', 5, () => ({ target: '', sejalan: '' }))
  const tidak = rows.filter((r) => r.target.trim() && r.sejalan === 'tidak').length
  return (
    <Sheet c={SHEET.s2_rkap} scopeLine={<GroupTag section="s2_rkap" />}>
      <Note>
        <b>Grand strategy kelompok:</b>{' '}
        {kuadran.grand_strategy?.trim() || <i>belum diisi di lembar Kuadran.</i>}
      </Note>
      <div className="stack">
        {rows.slice(0, 5).map((r, i) => (
          <div className="row-card" key={i}>
            <span className="num">{i + 1}</span>
            <div className="grow"><Area value={r.target} onChange={(v) => set(`rows.${i}.target`, v)} placeholder="Target atau program RKAP" /></div>
            <Choice small options={[{ value: 'ya', label: 'Sejalan' }, { value: 'tidak', label: 'Tidak' }]} value={r.sejalan} onChange={(v) => set(`rows.${i}.sejalan`, v)} />
          </div>
        ))}
      </div>
      {tidak >= 2 && <Note tone="warn">{tidak} target tidak sejalan. Diskusikan: kuadran kita yang keliru, atau ada yang belum kita lihat?</Note>}
    </Sheet>
  )
}

const emptyArrow = () => ({ dari: '', ke: '', sehingga: '' })

export function Peta() {
  const c = SHEET.s2_peta
  const [data, set] = useGroup('s2_peta')
  const [kuadran] = useGroup('s2_kuadran')
  const allSasaran = PERSPECTIVES.flatMap((p) => arr(data, p.key, 2).map((s) => s.trim()).filter(Boolean))
  return (
    <Sheet c={c} scopeLine={<GroupTag section="s2_peta" />}>
      <div className="map-gs">
        <span>Grand strategy</span>
        <p>{kuadran.grand_strategy?.trim() || <i>Isi dulu di lembar Kuadran.</i>}</p>
        <a href="#/s2_kuadran" className="small">ubah</a>
      </div>
      <div className="map">
        {PERSPECTIVES.map((p, idx) => (
          <div key={p.key} className={`map-row map-${idx}`}>
            <div className="map-label"><b>{p.label}</b><span>{p.hint}</span></div>
            <div className="map-cells">
              {arr(data, p.key, 2).slice(0, 2).map((s, i) => {
                const id = `${p.key}.${i}`
                const on = data.unit_star === id
                return (
                  <div key={i} className={`map-cell ${on ? 'is-star' : ''}`}>
                    <Area value={s} onChange={(v) => set(`${p.key}.${i}`, v)} placeholder={`Sasaran ${i + 1}, ditulis sebagai hasil`} />
                    <Star on={on} title="Paling digerakkan unit kami" onClick={() => set('unit_star', on ? null : id)} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <Note tone="muted">Tulis sasaran sebagai <b>hasil</b> (“operator menguasai standar layanan”), bukan kegiatan (“mengadakan pelatihan”).</Note>
      <Block title="Panah sebab-akibat">
        <datalist id="sasaran-list">{allSasaran.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="stack">
          {arr(data, 'panah', 4, emptyArrow).slice(0, 4).map((a, i) => (
            <div key={i} className="arrow-row">
              <Text value={a.dari} onChange={(v) => set(`panah.${i}.dari`, v)} placeholder="Sasaran penyebab" list="sasaran-list" />
              <span className="arrow">→</span>
              <Text value={a.ke} onChange={(v) => set(`panah.${i}.ke`, v)} placeholder="Sasaran akibat" list="sasaran-list" />
              <Text value={a.sehingga} onChange={(v) => set(`panah.${i}.sehingga`, v)} placeholder="…sehingga…" />
            </div>
          ))}
        </div>
      </Block>
      <Block tone="tint" title={`Sebelum ISHOMA · Slide ${c.after.slide}`} hint={c.after.text}>
        <p>{data.unit_star
          ? <><b className="gold">★</b> {(arr(data, data.unit_star.split('.')[0], 2)[Number(data.unit_star.split('.')[1])] || '').trim() || <i>sasaran yang ditandai masih kosong</i>}</>
          : <span className="muted">Belum ada sasaran yang ditandai ★.</span>}</p>
      </Block>
    </Sheet>
  )
}

/** Teks sasaran yang ditandai ★ di strategy map. */
export function starredSasaran(peta) {
  if (!peta?.unit_star) return ''
  const [k, i] = peta.unit_star.split('.')
  const p = PERSPECTIVES.find((x) => x.key === k)
  const t = (arr(peta, k, 2)[Number(i)] || '').trim()
  return t ? `${p?.label}: ${t}` : ''
}
