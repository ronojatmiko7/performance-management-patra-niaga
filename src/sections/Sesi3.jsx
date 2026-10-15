import { useGroup, useWorkbook, arr } from '../store.jsx'
import { Sheet, Block, Field, Text, Area, Choice, Note, Badge, capaian, statusOf, fmtPct, parseNum } from '../ui.jsx'
import { MONTHS, PERSPECTIVES, SHEET } from '../data.js'
import { GroupTag } from './common.jsx'
import { starredSasaran } from './Sesi2.jsx'

const POLARITAS = [
  { value: 'tinggi', label: 'Makin tinggi makin baik' },
  { value: 'rendah', label: 'Makin rendah makin baik' },
  { value: 'rentang', label: 'Harus dalam rentang' },
]

/** Baris per anggota kelompok, disimpan dengan id anggota agar tidak saling timpa. */
function MemberRows({ data, base, set, fields }) {
  const { groupInfo, session } = useWorkbook()
  const members = groupInfo?.members || []
  const rows = data?.[base] || {}
  return (
    <div className="contrib">
      <div className="contrib-head" style={{ '--cols': `minmax(0,.8fr) ${fields.map(() => 'minmax(0,1.1fr)').join(' ')}` }}>
        <span>Anggota</span>{fields.map((f) => <span key={f.key}>{f.label}</span>)}
      </div>
      {members.map((m) => (
        <div key={m.id} className={`contrib-row ${m.id === session.id ? 'is-me' : ''}`} style={{ '--cols': `minmax(0,.8fr) ${fields.map(() => 'minmax(0,1.1fr)').join(' ')}` }}>
          <p className="who"><b>{m.id === session.id ? 'Saya' : m.name}</b>{m.unit && <span className="small muted"> · {m.unit}</span>}</p>
          {fields.map((f) => (
            <Text key={f.key} value={rows[m.id]?.[f.key]} onChange={(v) => set(`${base}.${m.id}.${f.key}`, v)} aria-label={`${f.label} ${m.name}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function Kartu() {
  const [data, set] = useGroup('s3_kartu')
  const [peta] = useGroup('s2_peta')
  const star = starredSasaran(peta)
  const sasaranOpts = PERSPECTIVES.flatMap((p) => arr(peta, p.key, 2).map((s) => s.trim()).filter(Boolean).map((s) => `${p.label}: ${s}`))
  const f = (k) => ({ value: data[k], onChange: (v) => set(k, v) })
  return (
    <Sheet c={SHEET.s3_kartu} scopeLine={<GroupTag section="s3_kartu" />}>
      <Block title="Kartu KPI unit" hint="Elemen yang tidak diketahui siapa pun dibiarkan kosong, lalu dibawa sebagai pertanyaan untuk atasan.">
        <div className="kpi-card">
          <Field label="1 · Nama" hint="Dalam kata yang dipahami semua orang"><Text {...f('nama')} /></Field>
          <Field label="2 · Definisi" hint="Apa persisnya yang diukur, dan apa yang tidak ikut diukur"><Area {...f('definisi')} /></Field>
          <Field label="3 · Formula" hint="Bagaimana angkanya dihitung"><Area {...f('formula')} /></Field>
          <Field label="4 · Polaritas" group>
            <Choice small options={POLARITAS} value={data.polaritas} onChange={(v) => set('polaritas', v)} />
          </Field>
          <Field label="5 · Target" hint="Berapa angkanya, dan untuk periode apa"><Text {...f('target')} placeholder="Contoh: 95% per bulan" /></Field>
          <Field label="6 · Sumber data" hint="Dari sistem atau dokumen mana"><Text {...f('sumber')} /></Field>
          <Field label="7 · Periode" hint="Seberapa sering diukur dan dilaporkan"><Text {...f('periode')} placeholder="Bulanan" /></Field>
          <Field label="8 · Bobot" hint="Porsinya dalam penilaian kinerja unit"><Text {...f('bobot')} placeholder="Contoh: 20%" /></Field>
        </div>
        <div className="grid-2">
          <Field label="Sasaran di strategy map yang didukung" hint={star ? `★ dari strategy map: ${star}` : undefined}>
            <datalist id="sasaran-kartu">{sasaranOpts.map((s) => <option key={s} value={s} />)}</datalist>
            <Text value={data.sasaran ?? star} onChange={(v) => set('sasaran', v)} list="sasaran-kartu" />
          </Field>
          <Field label="Cascading" group hint="Dibagi: KPI yang sama dipecah ke unit. Didukung: KPI berbeda yang mendorong KPI di atasnya.">
            <Choice small options={[{ value: 'dibagi', label: 'Dibagi' }, { value: 'didukung', label: 'Didukung' }]} value={data.cascading} onChange={(v) => set('cascading', v)} />
          </Field>
        </div>
      </Block>
      <Block title="Lead indicator" hint="Penggerak yang bisa dipantau mingguan">
        <Text {...f('lead')} placeholder="Contoh: rata-rata waktu tunggu muat di terminal" />
      </Block>
      <Block title="Kontribusi setiap anggota" hint="Kontribusi Anda adalah lead indicator yang berada di zona kendali Anda sendiri.">
        <MemberRows data={data} base="kontribusi" set={set} fields={[{ key: 'kontribusi', label: 'Kontribusi saya' }, { key: 'ukuran', label: 'Cara saya mengukurnya' }]} />
      </Block>
    </Sheet>
  )
}

export function trackerRows(tracker, kartu) {
  const polaritas = kartu?.polaritas === 'rendah' ? 'rendah' : 'tinggi'
  const hijau = parseNum(tracker?.ambang_hijau) ?? 100
  const merah = parseNum(tracker?.ambang_merah) ?? 90
  return arr(tracker, 'bulan', 12, () => ({ target: '', realisasi: '', catatan: '' })).slice(0, 12).map((r, i) => {
    const c = capaian(r.target, r.realisasi, polaritas)
    return { ...r, m: MONTHS[i], c, s: statusOf(c, hijau, merah) }
  })
}

export function trendOf(rows) {
  const filled = rows.filter((r) => r.c != null)
  if (filled.length < 2) return { last: filled[filled.length - 1], text: '' }
  const cs = filled.map((r) => r.c)
  let down = 0; let up = 0
  for (let i = cs.length - 1; i > 0 && cs[i] < cs[i - 1]; i--) down++
  for (let i = cs.length - 1; i > 0 && cs[i] > cs[i - 1]; i--) up++
  let text = 'Sama dengan periode sebelumnya.'
  if (down >= 2) text = `Turun ${down} periode berturut-turut.`
  else if (down === 1) text = 'Turun dibanding periode sebelumnya.'
  else if (up >= 2) text = `Naik ${up} periode berturut-turut.`
  else if (up === 1) text = 'Naik dibanding periode sebelumnya.'
  return { last: filled[filled.length - 1], text }
}

export const SUMBER_GAP = {
  input: 'Input: data, alat, bahan, anggaran',
  proses: 'Proses: alur, SOP, serah-terima',
  kapabilitas: 'Kapabilitas: keterampilan, kemauan',
}

export function Tracker() {
  const [data, set] = useGroup('s3_tracker')
  const [kartu] = useGroup('s3_kartu')
  const rows = trackerRows(data, kartu)
  const { last, text } = trendOf(rows)
  const lastNonGreen = [...rows].reverse().find((r) => r.s && r.s !== 'hijau')
  const copyTarget = () => {
    const first = rows.find((r) => r.target.trim())
    if (!first) return
    rows.forEach((r, i) => { if (!r.target.trim()) set(`bulan.${i}.target`, first.target) })
  }
  return (
    <Sheet c={SHEET.s3_tracker} scopeLine={<GroupTag section="s3_tracker" />}>
      <Note>
        <b>KPI:</b> {kartu.nama?.trim() || <i>belum diisi di lembar Kartu KPI</i>}
        {' · '}<b>Polaritas:</b> {kartu.polaritas === 'rendah' ? 'makin rendah makin baik (capaian = target ÷ realisasi)' : 'makin tinggi makin baik (capaian = realisasi ÷ target)'}
      </Note>
      <div className="thresholds">
        <span><Badge status="hijau" /> capaian ≥</span>
        <input className="mini" value={data.ambang_hijau ?? '100'} onChange={(e) => set('ambang_hijau', e.target.value)} aria-label="Ambang hijau" />%
        <span><Badge status="kuning" /> ≥</span>
        <input className="mini" value={data.ambang_merah ?? '90'} onChange={(e) => set('ambang_merah', e.target.value)} aria-label="Ambang kuning" />%
        <span><Badge status="merah" /> di bawahnya</span>
        <span className="muted small">Pakai ambang yang berlaku di perusahaan Anda.</span>
      </div>
      <div className="tracker">
        <div className="tracker-head"><span>Bulan</span><span>Target</span><span>Realisasi</span><span>Capaian</span><span>Status</span><span>Catatan singkat</span></div>
        {rows.map((r, i) => (
          <div className="tracker-row" key={i}>
            <span className="m">{r.m}</span>
            <input value={r.target} onChange={(e) => set(`bulan.${i}.target`, e.target.value)} inputMode="decimal" aria-label={`Target ${r.m}`} />
            <input value={r.realisasi} onChange={(e) => set(`bulan.${i}.realisasi`, e.target.value)} inputMode="decimal" aria-label={`Realisasi ${r.m}`} />
            <span className="c">{fmtPct(r.c)}</span>
            <span><Badge status={r.s} /></span>
            <input value={r.catatan} onChange={(e) => set(`bulan.${i}.catatan`, e.target.value)} aria-label={`Catatan ${r.m}`} maxLength={300} />
          </div>
        ))}
      </div>
      <div className="row-actions">
        <button type="button" className="btn-ghost" onClick={copyTarget}>Salin target bulan pertama ke bulan kosong</button>
      </div>
      {last && (
        <Note tone={last.s === 'hijau' ? 'ok' : last.s === 'merah' ? 'bad' : 'warn'}>
          <b>Arah tren:</b> {last.m} {fmtPct(last.c)}, status {last.s}. {text}
        </Note>
      )}
      <Block title="Sumber gap" hint={lastNonGreen ? `Bulan terakhir yang tidak hijau: ${lastNonGreen.m} (${fmtPct(lastNonGreen.c)}).` : 'Sebelum menyalahkan, cek tiga sumber gap.'}>
        <Choice options={Object.entries(SUMBER_GAP).map(([value, label]) => ({ value, label }))} value={data.sumber_gap} onChange={(v) => set('sumber_gap', v)} />
      </Block>
    </Sheet>
  )
}

const emptyTuas = () => ({ tuas: '', dampak: '', kendali: '' })
export const TUAS_QUAD = {
  'tinggi-tinggi': { label: 'Kerjakan sekarang', tone: 'ok' },
  'tinggi-rendah': { label: 'Ajukan ke atasan', tone: 'info' },
  'rendah-tinggi': { label: 'Kerjakan bila sempat', tone: 'muted' },
  'rendah-rendah': { label: 'Lepaskan', tone: 'muted' },
}

export function Perbaikan() {
  const [data, set] = useGroup('s3_perbaikan')
  const [kartu] = useGroup('s3_kartu')
  const [tracker] = useGroup('s3_tracker')
  const tuas = arr(data, 'tuas', 4, emptyTuas)
  const now = tuas.filter((t) => t.tuas.trim() && t.dampak === 'tinggi' && t.kendali === 'tinggi')
  const f = (k) => ({ value: data[k], onChange: (v) => set(k, v) })
  return (
    <Sheet c={SHEET.s3_perbaikan} scopeLine={<GroupTag section="s3_perbaikan" />}>
      <Block title="1 · Pilih satu tuas, bukan sepuluh" hint="Dampak terhadap angka KPI, dan seberapa besar kendali Anda untuk memulainya minggu ini.">
        <div className="stack">
          {tuas.slice(0, Math.max(4, tuas.length)).map((t, i) => {
            const q = t.dampak && t.kendali ? TUAS_QUAD[`${t.dampak}-${t.kendali}`] : null
            const chosen = data.tuas_dipilih && data.tuas_dipilih === t.tuas && t.tuas.trim()
            return (
              <div key={i} className={`tuas-row ${chosen ? 'is-chosen' : ''}`}>
                <Text value={t.tuas} onChange={(v) => set(`tuas.${i}.tuas`, v)} placeholder={`Ide perbaikan ${i + 1}`} />
                <div className="tuas-pick">
                  <span className="small muted">Dampak</span>
                  <Choice small options={[{ value: 'tinggi', label: 'Tinggi' }, { value: 'rendah', label: 'Rendah' }]} value={t.dampak} onChange={(v) => set(`tuas.${i}.dampak`, v)} />
                </div>
                <div className="tuas-pick">
                  <span className="small muted">Kendali</span>
                  <Choice small options={[{ value: 'tinggi', label: 'Tinggi' }, { value: 'rendah', label: 'Rendah' }]} value={t.kendali} onChange={(v) => set(`tuas.${i}.kendali`, v)} />
                </div>
                {q?.label === 'Kerjakan sekarang'
                  ? <button type="button" className={`tag tag-ok pick ${chosen ? 'on' : ''}`} onClick={() => set('tuas_dipilih', chosen ? '' : t.tuas)}>{chosen ? '✓ Dipilih' : 'Kerjakan sekarang · pilih'}</button>
                  : <span className={`tag tag-${q?.tone || 'empty'}`}>{q?.label || '–'}</span>}
              </div>
            )
          })}
        </div>
        <div className="row-actions"><button type="button" className="btn-ghost" onClick={() => set(`tuas.${tuas.length}.tuas`, '')}>+ Tambah ide</button></div>
        {!now.length && <p className="small muted">Belum ada ide di “Kerjakan sekarang”.</p>}
      </Block>
      <Block title="2 · Rencana perbaikan satu halaman" hint={kartu.nama ? `KPI: ${kartu.nama}` : undefined}>
        <div className="plan">
          <Field label="Gap" hint="Angka, target, dan arah tren"><Area {...f('gap')} placeholder="Contoh: Juni 92% terhadap target 95%, turun tiga bulan berturut-turut" /></Field>
          <Field label="Sumber gap" hint={tracker.sumber_gap ? `Dari tracker: ${SUMBER_GAP[tracker.sumber_gap]}` : undefined}><Area {...f('sumber')} placeholder="Contoh: Proses, antrean muat di terminal pada jam sibuk pagi" /></Field>
          <Field label="Tuas yang dipilih"><Area value={data.tuas_dipilih} onChange={(v) => set('tuas_dipilih', v)} /></Field>
          <Field label="Aksi dan waktu"><Area {...f('aksi')} placeholder="Apa, kapan mulai, berapa lama uji coba" /></Field>
          <Field label="Bantuan yang dibutuhkan"><Area {...f('bantuan')} placeholder="Dari siapa, dalam bentuk apa" /></Field>
          <Field label="Lead indicator"><Area value={data.lead ?? kartu.lead ?? ''} onChange={(v) => set('lead', v)} placeholder="Dipantau mingguan" /></Field>
        </div>
      </Block>
      <Block title="3 · Kontribusi setiap anggota dalam rencana ini">
        <MemberRows data={data} base="kontribusi" set={set} fields={[{ key: 'kontribusi', label: 'Kontribusi saya' }]} />
      </Block>
      <Block title="4 · Laporan tiga kalimat" tone="navy">
        <div className="three">
          <Field label="1 · Status" hint="Angka, target, dan arah tren"><Area {...f('lap_status')} /></Field>
          <Field label="2 · Penyebab" hint="Satu penyebab utama, dengan data"><Area {...f('lap_penyebab')} /></Field>
          <Field label="3 · Langkah berikut" hint="Aksi Anda dan bantuan yang diminta"><Area {...f('lap_langkah')} /></Field>
        </div>
        {(data.lap_status || data.lap_penyebab || data.lap_langkah) && (
          <blockquote className="quote">“{[data.lap_status, data.lap_penyebab, data.lap_langkah].filter((s) => s?.trim()).map((s) => s.trim()).join(' ')}”</blockquote>
        )}
        <p className="small on-dark">Hindari: “Pak, KPI saya agak turun. Banyak faktor di lapangan. Nanti saya usahakan.”</p>
      </Block>
    </Sheet>
  )
}
