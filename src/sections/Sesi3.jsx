import { useSection, arr } from '../store.jsx'
import { Sheet, Block, Field, Text, Area, Choice, Note, Badge, capaian, statusOf, fmtPct, parseNum } from '../ui.jsx'
import { MONTHS, PERSPECTIVES } from '../data.js'

const POLARITAS = [
  { value: 'tinggi', label: 'Makin tinggi makin baik' },
  { value: 'rendah', label: 'Makin rendah makin baik' },
  { value: 'rentang', label: 'Harus dalam rentang' },
]

const emptyKontribusi = () => ({ nama: '', kontribusi: '', ukuran: '' })

export function Kartu() {
  const [data, set] = useSection('s3_kartu')
  const [peta] = useSection('s2_peta')
  const sasaranOpts = PERSPECTIVES.flatMap((p) => arr(peta, p.key, 2).map((s) => s.trim()).filter(Boolean).map((s) => `${p.label}: ${s}`))
  const putK = (i, patch) => set((d) => {
    const a = arr(d, 'kontribusi', 5, emptyKontribusi)
    a[i] = { ...a[i], ...patch }
    return { ...d, kontribusi: a }
  })
  const f = (k) => ({ value: data[k], onChange: (v) => set({ [k]: v }) })
  return (
    <Sheet
      kicker="Latihan Sesi 3 · 12 menit"
      title="Bedah KPI unit Anda"
      steps={[
        'Pilih satu KPI unit dengan bobot terbesar.',
        'Isi delapan elemen Kartu KPI, plus sasaran di strategy map yang didukung.',
        'Tambahkan satu lead indicator untuk KPI itu.',
        'Setiap anggota menulis satu baris: kontribusi saya, dan cara mengukurnya.',
      ]}
      result="Satu Kartu KPI unit, lengkap dengan kontribusi setiap anggota."
    >
      <Block title="Anatomi KPI" hint="Kosongkan elemen yang belum Anda ketahui. Itu temuan penting untuk ditanyakan ke atasan.">
        <div className="kpi-card">
          <Field label="1 · Nama KPI" hint="Dalam kata yang dipahami semua orang"><Text {...f('nama')} /></Field>
          <Field label="2 · Definisi" hint="Apa persisnya yang diukur, dan apa yang tidak"><Area {...f('definisi')} /></Field>
          <Field label="3 · Formula" hint="Bagaimana angkanya dihitung"><Area {...f('formula')} /></Field>
          <Field label="4 · Polaritas" group>
            <Choice small options={POLARITAS} value={data.polaritas} onChange={(v) => set({ polaritas: v })} />
          </Field>
          <Field label="5 · Target" hint="Angka dan periodenya"><Text {...f('target')} placeholder="Contoh: 95% per bulan" /></Field>
          <Field label="6 · Sumber data" hint="Sistem atau dokumen asal angka"><Text {...f('sumber')} /></Field>
          <Field label="7 · Periode" hint="Seberapa sering diukur dan dilaporkan"><Text {...f('periode')} placeholder="Bulanan" /></Field>
          <Field label="8 · Bobot" hint="Porsinya dalam penilaian kinerja unit"><Text {...f('bobot')} placeholder="Contoh: 20%" /></Field>
        </div>
      </Block>
      <Block title="Hubungan dengan strategy map">
        <div className="grid-2">
          <Field label="Sasaran yang didukung">
            <datalist id="sasaran-kartu">{sasaranOpts.map((s) => <option key={s} value={s} />)}</datalist>
            <Text {...f('sasaran')} list="sasaran-kartu" placeholder={sasaranOpts.length ? 'Pilih atau ketik sasaran' : 'Ketik sasaran dari strategy map'} />
          </Field>
          <Field label="Jenis cascading" group hint="Dibagi: KPI sama dipecah ke unit. Didukung: KPI berbeda yang mendorong KPI di atasnya.">
            <Choice small options={[{ value: 'dibagi', label: 'Dibagi' }, { value: 'didukung', label: 'Didukung' }]} value={data.cascading} onChange={(v) => set({ cascading: v })} />
          </Field>
        </div>
        <Field label="Lead indicator" hint="Penggerak yang bisa dipantau mingguan" wide>
          <Text {...f('lead')} placeholder="Contoh: rata-rata waktu tunggu muat di terminal" />
        </Field>
      </Block>
      <Block title="Kontribusi setiap anggota" hint="Kontribusi Anda adalah lead indicator di zona kendali Anda sendiri.">
        <div className="contrib">
          <div className="contrib-head"><span>Nama / peran</span><span>Kontribusi saya</span><span>Cara saya mengukurnya</span></div>
          {arr(data, 'kontribusi', 5, emptyKontribusi).map((k, i) => (
            <div className="contrib-row" key={i}>
              <Text value={k.nama} onChange={(v) => putK(i, { nama: v })} placeholder={i === 0 ? 'Saya' : 'Anggota'} aria-label="Nama atau peran" />
              <Text value={k.kontribusi} onChange={(v) => putK(i, { kontribusi: v })} aria-label="Kontribusi" />
              <Text value={k.ukuran} onChange={(v) => putK(i, { ukuran: v })} aria-label="Cara mengukur" />
            </div>
          ))}
        </div>
      </Block>
      <Block title="Debrief" hint="Elemen mana yang tidak diketahui siapa pun di kelompok?">
        <Area {...f('debrief')} />
      </Block>
    </Sheet>
  )
}

const emptyMonth = () => ({ target: '', realisasi: '', catatan: '' })

export function Tracker() {
  const [data, set] = useSection('s3_tracker')
  const [kartu] = useSection('s3_kartu')
  const polaritas = kartu.polaritas === 'rendah' ? 'rendah' : 'tinggi'
  const hijau = parseNum(data.ambang_hijau) ?? 100
  const merah = parseNum(data.ambang_merah) ?? 90
  const rows = arr(data, 'bulan', 12, emptyMonth)
  const put = (i, patch) => set((d) => {
    const a = arr(d, 'bulan', 12, emptyMonth)
    a[i] = { ...a[i], ...patch }
    return { ...d, bulan: a }
  })
  const computed = rows.map((r) => {
    const c = capaian(r.target, r.realisasi, polaritas)
    return { ...r, c, s: statusOf(c, hijau, merah) }
  })
  const filled = computed.filter((r) => r.c != null)
  const last = filled[filled.length - 1]
  const lastNonGreen = [...computed].reverse().find((r) => r.s && r.s !== 'hijau')
  let trend = ''
  if (filled.length >= 2) {
    const cs = filled.map((r) => r.c)
    let down = 0; let up = 0
    for (let i = cs.length - 1; i > 0 && cs[i] < cs[i - 1]; i--) down++
    for (let i = cs.length - 1; i > 0 && cs[i] > cs[i - 1]; i--) up++
    if (down >= 2) trend = `Turun ${down} periode berturut-turut. Tanda awal yang perlu dibicarakan sekarang.`
    else if (down === 1) trend = 'Turun dibanding periode sebelumnya.'
    else if (up >= 2) trend = `Naik ${up} periode berturut-turut.`
    else if (up === 1) trend = 'Naik dibanding periode sebelumnya.'
    else trend = 'Sama dengan periode sebelumnya.'
  }
  const copyTarget = () => set((d) => {
    const a = arr(d, 'bulan', 12, emptyMonth)
    const first = a.find((r) => r.target?.trim())
    if (!first) return d
    return { ...d, bulan: a.map((r) => ({ ...r, target: r.target?.trim() ? r.target : first.target })) }
  })
  return (
    <Sheet
      kicker="Latihan Sesi 3 · 12 menit"
      title="Baca tren KPI unit Anda"
      steps={[
        'Ambil KPI dari Kartu KPI unit yang baru Anda isi.',
        'Isi tracker untuk bulan-bulan yang sudah berjalan tahun ini. Persen saja cukup.',
        'Status hijau, kuning, merah dihitung otomatis. Baca arah trennya.',
        'Untuk bulan terakhir yang tidak hijau, tentukan sumber gap: input, proses, atau kapabilitas.',
      ]}
      result="Tracker satu KPI unit dan dugaan sumber gap terbesarnya."
    >
      <Note>
        <b>KPI:</b> {kartu.nama?.trim() || <i>belum diisi di Kartu KPI</i>}
        {' · '}<b>Polaritas:</b> {polaritas === 'rendah' ? 'makin rendah makin baik (capaian = target ÷ realisasi)' : 'makin tinggi makin baik (capaian = realisasi ÷ target)'}
        {kartu.polaritas === 'rentang' && ' · KPI rentang dihitung seperti makin tinggi makin baik; nilai status secara manual di catatan.'}
      </Note>
      <div className="thresholds">
        <span><Badge status="hijau" /> capaian ≥</span>
        <input className="mini" value={data.ambang_hijau ?? '100'} onChange={(e) => set({ ambang_hijau: e.target.value })} aria-label="Ambang hijau" />%
        <span><Badge status="kuning" /> ≥</span>
        <input className="mini" value={data.ambang_merah ?? '90'} onChange={(e) => set({ ambang_merah: e.target.value })} aria-label="Ambang kuning" />%
        <span><Badge status="merah" /> di bawahnya</span>
        <span className="muted small">Pakai ambang yang berlaku di perusahaan Anda.</span>
      </div>
      <div className="tracker">
        <div className="tracker-head">
          <span>Bulan</span><span>Target</span><span>Realisasi</span><span>Capaian</span><span>Status</span><span>Catatan singkat</span>
        </div>
        {computed.map((r, i) => (
          <div className="tracker-row" key={i}>
            <span className="m">{MONTHS[i]}</span>
            <input value={r.target} onChange={(e) => put(i, { target: e.target.value })} inputMode="decimal" aria-label={`Target ${MONTHS[i]}`} />
            <input value={r.realisasi} onChange={(e) => put(i, { realisasi: e.target.value })} inputMode="decimal" aria-label={`Realisasi ${MONTHS[i]}`} />
            <span className="c">{fmtPct(r.c)}</span>
            <span><Badge status={r.s} /></span>
            <input value={r.catatan} onChange={(e) => put(i, { catatan: e.target.value })} aria-label={`Catatan ${MONTHS[i]}`} maxLength={300} />
          </div>
        ))}
      </div>
      <div className="row-actions">
        <button type="button" className="btn-ghost" onClick={copyTarget}>Salin target Januari ke bulan kosong</button>
      </div>
      {filled.length > 0 && (
        <Note tone={last?.s === 'hijau' ? 'ok' : last?.s === 'merah' ? 'bad' : 'warn'}>
          <b>Terakhir ({MONTHS[computed.indexOf(last)]}):</b> {fmtPct(last.c)}, status {last.s}. {trend}
        </Note>
      )}
      <Block title="Sumber gap" hint={lastNonGreen ? `Bulan terakhir yang tidak hijau: ${MONTHS[computed.indexOf(lastNonGreen)]} (${fmtPct(lastNonGreen.c)}).` : 'Sebelum menyalahkan, cek tiga sumber gap.'}>
        <Field label="Sumber gap terbesar" group>
          <Choice options={[
            { value: 'input', label: 'Input: data, alat, bahan, anggaran' },
            { value: 'proses', label: 'Proses: alur, SOP, serah-terima' },
            { value: 'kapabilitas', label: 'Kapabilitas: keterampilan, kemauan' },
          ]} value={data.sumber_gap} onChange={(v) => set({ sumber_gap: v })} />
        </Field>
        <Field label="Buktinya" wide>
          <Area value={data.bukti_gap} onChange={(v) => set({ bukti_gap: v })} placeholder="Contoh: waktu tunggu muat naik dari 25 ke 40 menit karena antrean pagi di terminal" />
        </Field>
      </Block>
    </Sheet>
  )
}

const emptyTuas = () => ({ tuas: '', dampak: '', kendali: '' })
const TUAS_QUAD = {
  'tinggi-tinggi': { label: 'Kerjakan sekarang', tone: 'ok' },
  'tinggi-rendah': { label: 'Ajukan ke atasan', tone: 'info' },
  'rendah-tinggi': { label: 'Kerjakan bila sempat', tone: 'muted' },
  'rendah-rendah': { label: 'Lepaskan', tone: 'muted' },
}

export function Perbaikan() {
  const [data, set] = useSection('s3_perbaikan')
  const [kartu] = useSection('s3_kartu')
  const [tracker] = useSection('s3_tracker')
  const tuas = arr(data, 'tuas', 4, emptyTuas)
  const putT = (i, patch) => set((d) => {
    const a = arr(d, 'tuas', 4, emptyTuas)
    a[i] = { ...a[i], ...patch }
    return { ...d, tuas: a }
  })
  const f = (k) => ({ value: data[k], onChange: (v) => set({ [k]: v }) })
  const now = tuas.filter((t) => t.tuas.trim() && t.dampak === 'tinggi' && t.kendali === 'tinggi')
  const SUMBER = { input: 'Input', proses: 'Proses', kapabilitas: 'Kapabilitas' }
  return (
    <Sheet
      kicker="Latihan Sesi 3 · 15 menit"
      title="Satu rencana perbaikan untuk KPI unit"
      steps={[
        'Daftar beberapa tuas, lalu nilai dampak dan kendalinya. Pilih satu dari “Kerjakan sekarang”.',
        'Isi rencana perbaikan satu halaman, keenam barisnya.',
        'Tambahkan satu baris: apa kontribusi setiap anggota dalam rencana ini?',
        'Tulis laporan tiga kalimatnya.',
      ]}
      result="Rencana perbaikan dan laporan tiga kalimat, siap dibawa ke pleno."
    >
      <Block title="Pilih satu tuas, bukan sepuluh" hint="Dampak terhadap angka KPI, dan seberapa besar kendali Anda untuk memulainya minggu ini.">
        <div className="stack">
          {tuas.map((t, i) => {
            const q = t.dampak && t.kendali ? TUAS_QUAD[`${t.dampak}-${t.kendali}`] : null
            return (
              <div key={i} className="tuas-row">
                <Text value={t.tuas} onChange={(v) => putT(i, { tuas: v })} placeholder={`Tuas ${i + 1}`} />
                <div className="tuas-pick">
                  <span className="small muted">Dampak</span>
                  <Choice small options={[{ value: 'tinggi', label: 'Tinggi' }, { value: 'rendah', label: 'Rendah' }]} value={t.dampak} onChange={(v) => putT(i, { dampak: v })} />
                </div>
                <div className="tuas-pick">
                  <span className="small muted">Kendali</span>
                  <Choice small options={[{ value: 'tinggi', label: 'Tinggi' }, { value: 'rendah', label: 'Rendah' }]} value={t.kendali} onChange={(v) => putT(i, { kendali: v })} />
                </div>
                <span className={`tag tag-${q?.tone || 'empty'}`}>{q?.label || '–'}</span>
              </div>
            )
          })}
        </div>
      </Block>
      <Block title="Rencana perbaikan satu halaman" hint={kartu.nama ? `KPI: ${kartu.nama}` : undefined}>
        <div className="plan">
          <Field label="Gap" hint="Angka, target, dan arah tren"><Area {...f('gap')} placeholder="Contoh: Juni 92% terhadap target 95%, turun tiga bulan berturut-turut" /></Field>
          <Field label="Sumber gap" hint={tracker.sumber_gap ? `Dari tracker: ${SUMBER[tracker.sumber_gap]}` : undefined}><Area {...f('sumber')} placeholder={tracker.bukti_gap || ''} /></Field>
          <Field label="Tuas yang dipilih">
            <datalist id="tuas-list">{now.map((t) => <option key={t.tuas} value={t.tuas} />)}</datalist>
            <Text {...f('tuas_dipilih')} list="tuas-list" placeholder={now[0]?.tuas || ''} />
          </Field>
          <Field label="Aksi dan waktu"><Area {...f('aksi')} placeholder="Apa, kapan mulai, berapa lama uji coba" /></Field>
          <Field label="Bantuan yang dibutuhkan"><Area {...f('bantuan')} placeholder="Dari siapa, dalam bentuk apa" /></Field>
          <Field label="Lead indicator"><Text {...f('lead')} placeholder={kartu.lead || 'Dipantau mingguan'} /></Field>
          <Field label="Kontribusi setiap anggota" wide><Area {...f('kontribusi')} rows={3} /></Field>
        </div>
      </Block>
      <Block title="Laporan tiga kalimat" tone="navy">
        <div className="three">
          <Field label="1 · Status" hint="Angka, target, dan arah tren"><Area {...f('lap_status')} /></Field>
          <Field label="2 · Penyebab" hint="Satu penyebab utama, dengan data"><Area {...f('lap_penyebab')} /></Field>
          <Field label="3 · Langkah berikut" hint="Aksi Anda dan bantuan yang diminta"><Area {...f('lap_langkah')} /></Field>
        </div>
        {(data.lap_status || data.lap_penyebab || data.lap_langkah) && (
          <blockquote className="quote">“{[data.lap_status, data.lap_penyebab, data.lap_langkah].filter((s) => s?.trim()).map((s) => s.trim()).join(' ')}”</blockquote>
        )}
        <p className="small muted on-dark">Hindari: “Pak, KPI saya agak turun. Banyak faktor di lapangan. Nanti saya usahakan.”</p>
      </Block>
    </Sheet>
  )
}
