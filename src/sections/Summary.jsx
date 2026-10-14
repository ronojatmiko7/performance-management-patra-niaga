import { PERSPECTIVES, QUADRANTS, MONTHS } from '../data.js'
import { arr } from '../store.jsx'
import { capaian, statusOf, fmtPct, parseNum, Badge } from '../ui.jsx'

const t = (s) => (typeof s === 'string' ? s.trim() : '')
const has = (...xs) => xs.some((x) => t(x))

function Item({ label, value }) {
  if (!t(value)) return null
  return <div className="sum-item"><span>{label}</span><p>{value}</p></div>
}

/** Ringkasan seluruh lembar kerja seorang peserta (dipakai peserta dan fasilitator). */
export default function Summary({ responses = {}, participant }) {
  const r = (k) => responses[k] || {}
  const tan = r('s1_tantangan'); const cus = r('s1_customer'); const ref = r('s1_refleksi')
  const swot = r('s2_swot'); const kua = r('s2_kuadran'); const rk = r('s2_rkap'); const peta = r('s2_peta')
  const kar = r('s3_kartu'); const tr = r('s3_tracker'); const per = r('s3_perbaikan'); const kom = r('komitmen')
  const quad = kua.eksternal && kua.internal ? QUADRANTS[`${kua.eksternal}-${kua.internal}`] : null
  const pol = kar.polaritas === 'rendah' ? 'rendah' : 'tinggi'
  const hijau = parseNum(tr.ambang_hijau) ?? 100
  const merah = parseNum(tr.ambang_merah) ?? 90
  const bulan = arr(tr, 'bulan', 12, () => ({})).map((b, i) => {
    const c = capaian(b.target, b.realisasi, pol)
    return { ...b, m: MONTHS[i], c, s: statusOf(c, hijau, merah) }
  }).filter((b) => has(b.target, b.realisasi, b.catatan))
  const perspLabel = Object.fromEntries(PERSPECTIVES.map((p) => [p.key, p.label]))

  return (
    <div className="summary">
      {participant && (
        <div className="sum-id">
          <h2>{participant.full_name}</h2>
          <p>{participant.company}{participant.unit ? ` · ${participant.unit}` : ''}</p>
        </div>
      )}

      <section className="sum-sec">
        <h3>Sesi 1 · Start With Why</h3>
        {['perusahaan', 'pekerjaan'].map((k) => {
          const items = (tan[k] || []).filter((x) => t(x?.teks))
          if (!items.length) return null
          return (
            <div key={k} className="sum-item">
              <span>Tantangan {k === 'perusahaan' ? 'perusahaan' : 'pekerjaan saya'}</span>
              <ul>{items.map((x, i) => <li key={i}>{x.teks}{x.kategori && <em> · {perspLabel[x.kategori] || 'Lainnya'}</em>}</li>)}</ul>
            </div>
          )
        })}
        {(cus.rows || []).some((x) => has(x?.customer, x?.kebutuhan, x?.cara)) && (
          <table className="sum-table">
            <thead><tr><th>Customer</th><th>Kebutuhan / masalah</th><th>Cara kami memenuhinya</th></tr></thead>
            <tbody>{cus.rows.filter((x) => has(x?.customer, x?.kebutuhan, x?.cara)).map((x, i) => (
              <tr key={i}><td>{x.customer}</td><td>{x.kebutuhan}</td><td>{x.cara}</td></tr>
            ))}</tbody>
          </table>
        )}
        <Item label="Perspektif kontribusi saya" value={ref.perspektif ? `${perspLabel[ref.perspektif]}${t(ref.alasan) ? ` · ${ref.alasan}` : ''}` : ''} />
        <Item label="Ide OKR" value={has(ref.okr_objective, ref.okr_kr) ? `O: ${t(ref.okr_objective)} · KR: ${t(ref.okr_kr)}` : ''} />
      </section>

      <section className="sum-sec">
        <h3>Sesi 2 · Strategi</h3>
        {['S', 'W', 'O', 'T'].some((k) => (swot[k] || []).some((p) => t(p?.poin))) && (
          <div className="sum-swot">
            {[['S', 'Kekuatan'], ['W', 'Kelemahan'], ['O', 'Peluang'], ['T', 'Ancaman']].map(([k, l]) => (
              <div key={k}>
                <b>{l}</b>
                <ul>{(swot[k] || []).filter((p) => t(p?.poin)).map((p, i) => (
                  <li key={i} className={p.utama ? 'main' : ''}>{p.poin}{t(p.bukti) && <em> · {p.bukti}</em>}</li>
                ))}</ul>
              </div>
            ))}
          </div>
        )}
        <Item label="Kuadran" value={quad ? quad.name : ''} />
        <Item label="Grand strategy" value={kua.grand_strategy} />
        <Item label="Alasan" value={kua.alasan} />
        {(rk.rows || []).some((x) => t(x?.target)) && (
          <table className="sum-table">
            <thead><tr><th>Target / program RKAP</th><th>Sejalan?</th><th>Catatan</th></tr></thead>
            <tbody>{rk.rows.filter((x) => t(x?.target)).map((x, i) => (
              <tr key={i}><td>{x.target}</td><td>{x.sejalan || '–'}</td><td>{x.catatan}</td></tr>
            ))}</tbody>
          </table>
        )}
        <Item label="Kesimpulan RKAP" value={rk.kesimpulan} />
        {PERSPECTIVES.some((p) => (peta[p.key] || []).some(t)) && (
          <div className="sum-map">
            {t(peta.grand_strategy) && <p className="sum-map-gs">{peta.grand_strategy}</p>}
            {PERSPECTIVES.map((p) => (
              <div key={p.key} className="sum-map-row">
                <span>{p.label}</span>
                <div>{(peta[p.key] || []).filter(t).map((s, i) => <p key={i}>{s}</p>)}</div>
              </div>
            ))}
            {(peta.panah || []).filter((a) => t(a?.dari) && t(a?.ke)).map((a, i) => (
              <p key={i} className="small">{a.dari} → {a.ke}{t(a.sehingga) && <em> · {a.sehingga}</em>}</p>
            ))}
          </div>
        )}
        <Item label="Sasaran yang paling bergantung pada unit saya" value={peta.unit} />
      </section>

      <section className="sum-sec">
        <h3>Sesi 3 · KPI unit</h3>
        {t(kar.nama) && (
          <table className="sum-table sum-kv">
            <tbody>
              {[['Nama KPI', kar.nama], ['Definisi', kar.definisi], ['Formula', kar.formula],
                ['Polaritas', { tinggi: 'Makin tinggi makin baik', rendah: 'Makin rendah makin baik', rentang: 'Harus dalam rentang' }[kar.polaritas]],
                ['Target', kar.target], ['Sumber data', kar.sumber], ['Periode', kar.periode], ['Bobot', kar.bobot],
                ['Sasaran didukung', kar.sasaran], ['Cascading', kar.cascading], ['Lead indicator', kar.lead]]
                .map(([k, v]) => <tr key={k}><th>{k}</th><td>{v || <i className="muted">belum diketahui</i>}</td></tr>)}
            </tbody>
          </table>
        )}
        {(kar.kontribusi || []).some((x) => t(x?.kontribusi)) && (
          <table className="sum-table">
            <thead><tr><th>Nama / peran</th><th>Kontribusi</th><th>Cara mengukur</th></tr></thead>
            <tbody>{kar.kontribusi.filter((x) => t(x?.kontribusi)).map((x, i) => (
              <tr key={i}><td>{x.nama}</td><td>{x.kontribusi}</td><td>{x.ukuran}</td></tr>
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
        <Item label="Sumber gap" value={tr.sumber_gap ? `${tr.sumber_gap}${t(tr.bukti_gap) ? ` · ${tr.bukti_gap}` : ''}` : ''} />
        {has(per.gap, per.aksi, per.tuas_dipilih) && (
          <table className="sum-table sum-kv">
            <tbody>
              {[['Gap', per.gap], ['Sumber gap', per.sumber], ['Tuas', per.tuas_dipilih], ['Aksi dan waktu', per.aksi],
                ['Bantuan', per.bantuan], ['Lead indicator', per.lead], ['Kontribusi anggota', per.kontribusi]]
                .filter(([, v]) => t(v)).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
            </tbody>
          </table>
        )}
        {has(per.lap_status, per.lap_penyebab, per.lap_langkah) && (
          <blockquote className="quote light">“{[per.lap_status, per.lap_penyebab, per.lap_langkah].filter(t).map(t).join(' ')}”</blockquote>
        )}
      </section>

      {(kom.minggu || []).some((m) => t(m?.rencana)) && (
        <section className="sum-sec">
          <h3>Komitmen 30 hari</h3>
          <ol className="sum-weeks">{kom.minggu.map((m, i) => t(m?.rencana) && (
            <li key={i}><b>Minggu {i + 1}{m.selesai ? ' ✓' : ''}:</b> {m.rencana}</li>
          ))}</ol>
          <Item label="Akan berbicara dengan" value={kom.atasan} />
        </section>
      )}
    </div>
  )
}
