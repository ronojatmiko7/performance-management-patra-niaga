import { useWorkbook, unflatten, arr } from '../store.jsx'
import { Sheet, Badge, fmtPct } from '../ui.jsx'
import { SHEET, PERSPECTIVES, GROUP_SECTIONS } from '../data.js'
import { GroupTag } from './common.jsx'
import { quadrantOf, starredSasaran } from './Sesi2.jsx'
import { trackerRows, trendOf, SUMBER_GAP } from './Sesi3.jsx'

const t = (s) => (typeof s === 'string' ? s.trim() : '')

/**
 * Satu halaman, satu cerita (slide 59): lima bagian yang sama persis dengan slide.
 * `g` = objek lembar kelompok (sudah bersarang), `members` = anggota.
 */
export function PlenoView({ g, company, members = [], big }) {
  const kua = g.s2_kuadran || {}; const peta = g.s2_peta || {}; const kar = g.s3_kartu || {}
  const tr = g.s3_tracker || {}; const per = g.s3_perbaikan || {}
  const q = quadrantOf(kua)
  const rows = trackerRows(tr, kar)
  const { last, text } = trendOf(rows)
  const nameOf = (id) => members.find((m) => m.id === id)?.name || 'Anggota'
  const kontrib = Object.entries(kar.kontribusi || {}).filter(([, v]) => t(v?.kontribusi))
  const lap = [per.lap_status, per.lap_penyebab, per.lap_langkah].map(t).filter(Boolean).join(' ')
  const empty = <i className="muted">belum diisi</i>
  return (
    <div className={`pleno ${big ? 'pleno-big' : ''}`}>
      {company && <h2 className="pleno-company">{company}</h2>}
      <section>
        <span className="pleno-num">1</span>
        <div>
          <h3>Grand strategy</h3>
          <p className="pleno-sub">Kuadran pilihan dan alasannya</p>
          {q ? <p><b>{q.name}.</b> {t(kua.grand_strategy) || empty}</p> : <p>{empty}</p>}
          {t(kua.alasan) && <p className="muted">Alasan: {kua.alasan}</p>}
        </div>
      </section>
      <section>
        <span className="pleno-num">2</span>
        <div>
          <h3>Strategy map</h3>
          <p className="pleno-sub">Sasaran yang digerakkan unit kami</p>
          <p>{starredSasaran(peta) ? <><b className="gold">★</b> {starredSasaran(peta)}</> : empty}</p>
          <div className="pleno-map">
            {PERSPECTIVES.map((p) => {
              const s = arr(peta, p.key, 2).map(t).filter(Boolean)
              return <p key={p.key}><span>{p.label}</span>{s.length ? s.join(' · ') : '–'}</p>
            })}
          </div>
        </div>
      </section>
      <section>
        <span className="pleno-num">3</span>
        <div>
          <h3>KPI unit</h3>
          <p className="pleno-sub">Kartu KPI dan kontribusi anggota</p>
          <p><b>{t(kar.nama) || 'KPI belum diisi'}</b>{t(kar.target) && ` · target ${kar.target}`}{kar.cascading && ` · ${kar.cascading}`}{t(kar.lead) && ` · lead: ${kar.lead}`}</p>
          {kontrib.length > 0 && <ul>{kontrib.map(([id, v]) => <li key={id}><b>{nameOf(id)}:</b> {v.kontribusi}{t(v.ukuran) && <span className="muted"> ({v.ukuran})</span>}</li>)}</ul>}
        </div>
      </section>
      <section>
        <span className="pleno-num">4</span>
        <div>
          <h3>Status</h3>
          <p className="pleno-sub">Arah tren dan sumber gap</p>
          {last ? <p>{last.m}: {fmtPct(last.c)} <Badge status={last.s} /> {text}</p> : <p>{empty}</p>}
          {tr.sumber_gap && <p>Sumber gap: <b>{SUMBER_GAP[tr.sumber_gap]}</b></p>}
        </div>
      </section>
      <section>
        <span className="pleno-num">5</span>
        <div>
          <h3>Perbaikan</h3>
          <p className="pleno-sub">Satu tuas dan laporan tiga kalimat</p>
          <p><b>Tuas:</b> {t(per.tuas_dipilih) || empty}</p>
          {lap && <blockquote className="quote light">“{lap}”</blockquote>}
        </div>
      </section>
    </div>
  )
}

export default function Pleno() {
  const { groupView, groupInfo, groupVersion } = useWorkbook()
  void groupVersion
  const g = Object.fromEntries(GROUP_SECTIONS.map((s) => [s, unflatten(groupView(s))]))
  return (
    <Sheet c={{ ...SHEET.pleno, points: undefined }} scopeLine={<GroupTag section="s3_perbaikan" />}>
      <PlenoView g={g} members={groupInfo?.members} />
    </Sheet>
  )
}
