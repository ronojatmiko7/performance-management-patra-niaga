import { PERSPECTIVES, KATEGORI } from '../data.js'
import { arr } from '../store.jsx'
import { Badge, fmtPct } from '../ui.jsx'
import { PlenoView } from './Pleno.jsx'
import { trackerRows } from './Sesi3.jsx'

const t = (s) => (typeof s === 'string' ? s.trim() : '')
const has = (...xs) => xs.some((x) => t(x))

function Item({ label, value }) {
  if (!t(value)) return null
  return <div className="sum-item"><span>{label}</span><p>{value}</p></div>
}

/**
 * Ringkasan: isian pribadi + lembar kelompok.
 * `g` = lembar kelompok bersarang ({s2_swot: {...}, ...}); boleh kosong.
 */
export default function Summary({ responses = {}, participant, g = {}, members = [], company, tests }) {
  const r = (k) => responses[k] || {}
  const tan = r('s1_tantangan'); const ref = r('s1_refleksi'); const kom = r('komitmen')
  const kat = Object.fromEntries(KATEGORI.map((k) => [k.value, k.label]))
  const persp = Object.fromEntries(PERSPECTIVES.map((p) => [p.key, p.label]))
  const cus = g.s1_customer || {}; const swot = g.s2_swot || {}; const rk = g.s2_rkap || {}
  const bulan = trackerRows(g.s3_tracker || {}, g.s3_kartu || {}).filter((b) => has(b.target, b.realisasi, b.catatan))

  return (
    <div className="summary">
      {participant && (
        <div className="sum-id">
          <h2>{participant.full_name}</h2>
          <p>{participant.company}{participant.unit ? ` · ${participant.unit}` : ''}</p>
          {tests && (tests.pre || tests.post) && (
            <p className="small">Pre-test {tests.pre?.score ?? '–'} · Post-test {tests.post?.score ?? '–'}</p>
          )}
        </div>
      )}

      <section className="sum-sec">
        <h3>Isian pribadi</h3>
        {['perusahaan', 'pekerjaan'].map((k) => {
          const items = (tan[k] || []).filter((x) => t(x?.teks))
          if (!items.length) return null
          return (
            <div key={k} className="sum-item">
              <span>Tantangan {k === 'perusahaan' ? 'perusahaan' : 'pekerjaan saya'}</span>
              <ul>{items.map((x, i) => <li key={i}>{x.terpilih && '★ '}{x.teks}{x.kategori && <em> · {kat[x.kategori]}</em>}</li>)}</ul>
            </div>
          )
        })}
        <Item label="Perspektif kontribusi saya" value={ref.perspektif ? `${persp[ref.perspektif]}${t(ref.alasan) ? ` · ${ref.alasan}` : ''}` : ''} />
        {(kom.minggu || []).some((m) => t(m?.rencana)) && (
          <div className="sum-item">
            <span>Komitmen 30 hari</span>
            <ol className="sum-weeks">{kom.minggu.map((m, i) => t(m?.rencana) && (
              <li key={i}><b>Minggu {i + 1}{m.selesai ? ' ✓' : ''}:</b> {m.rencana}</li>
            ))}</ol>
          </div>
        )}
      </section>

      <section className="sum-sec">
        <h3>Lembar kelompok{company ? ` · ${company}` : ''}</h3>
        <PlenoView g={g} members={members} />
        {(cus.rows || []).some((x) => has(x?.customer, x?.kebutuhan, x?.cara)) && (
          <table className="sum-table">
            <thead><tr><th>Customer</th><th>Kebutuhan / masalah</th><th>Cara kami memenuhinya</th></tr></thead>
            <tbody>{cus.rows.filter((x) => has(x?.customer, x?.kebutuhan, x?.cara)).map((x, i) => (
              <tr key={i}><td>{x.customer}</td><td>{x.kebutuhan}</td><td>{x.cara}</td></tr>
            ))}</tbody>
          </table>
        )}
        {['S', 'W', 'O', 'T'].some((k) => arr(swot, k, 0, () => ({ poin: '' })).some((p) => t(p.poin))) && (
          <div className="sum-swot">
            {[['S', 'Kekuatan'], ['W', 'Kelemahan'], ['O', 'Peluang'], ['T', 'Ancaman']].map(([k, l]) => (
              <div key={k}>
                <b>{l}</b>
                <ul>{arr(swot, k, 0, () => ({ poin: '', bukti: '', utama: false })).filter((p) => t(p.poin)).map((p, i) => (
                  <li key={i} className={p.utama ? 'main' : ''}>{p.utama && '★ '}{p.poin}{t(p.bukti) && <em> · {p.bukti}</em>}</li>
                ))}</ul>
              </div>
            ))}
          </div>
        )}
        {arr(rk, 'rows', 0, () => ({ target: '', sejalan: '' })).some((x) => t(x.target)) && (
          <table className="sum-table">
            <thead><tr><th>Target / program RKAP</th><th>Sejalan?</th></tr></thead>
            <tbody>{arr(rk, 'rows', 0, () => ({ target: '', sejalan: '' })).filter((x) => t(x.target)).map((x, i) => (
              <tr key={i}><td>{x.target}</td><td>{x.sejalan === 'ya' ? 'Sejalan' : x.sejalan === 'tidak' ? 'Tidak' : '–'}</td></tr>
            ))}</tbody>
          </table>
        )}
        {bulan.length > 0 && (
          <table className="sum-table">
            <thead><tr><th>Bulan</th><th>Target</th><th>Realisasi</th><th>Capaian</th><th>Status</th><th>Catatan</th></tr></thead>
            <tbody>{bulan.map((b) => (
              <tr key={b.m}><td>{b.m}</td><td>{b.target}</td><td>{b.realisasi}</td><td>{fmtPct(b.c)}</td><td><Badge status={b.s} /></td><td>{b.catatan}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  )
}
