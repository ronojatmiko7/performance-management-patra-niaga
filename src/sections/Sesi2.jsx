import { useSection, useWorkbook, arr } from '../store.jsx'
import { Sheet, Block, Field, Text, Area, Choice, Note } from '../ui.jsx'
import { PERSPECTIVES, QUADRANTS } from '../data.js'

const SWOT = [
  { key: 'S', label: 'Kekuatan', sub: 'Internal · positif', tone: 'blue' },
  { key: 'W', label: 'Kelemahan', sub: 'Internal · negatif', tone: 'navy' },
  { key: 'O', label: 'Peluang', sub: 'Eksternal · positif', tone: 'blue' },
  { key: 'T', label: 'Ancaman', sub: 'Eksternal · negatif', tone: 'navy' },
]
const emptyPoint = () => ({ poin: '', bukti: '', utama: false })

export function Swot() {
  const [data, set] = useSection('s2_swot')
  const put = (k, i, patch) => set((d) => {
    const a = arr(d, k, 4, emptyPoint)
    a[i] = { ...a[i], ...patch }
    return { ...d, [k]: a }
  })
  return (
    <Sheet
      kicker="Latihan Sesi 2 · 20 menit"
      title="SWOT anak perusahaan Anda"
      steps={[
        'Berkelompok per anak perusahaan.',
        'Isi empat kotak SWOT, maksimal empat poin per kotak.',
        'Untuk setiap poin, tulis buktinya: data, kejadian, atau pengamatan dari meja kerja Anda.',
        'Tandai dua poin terkuat di setiap kotak.',
      ]}
      result="SWOT satu halaman, dengan bukti untuk setiap poin."
    >
      <div className="swot">
        {SWOT.map((q) => (
          <section key={q.key} className={`swot-box swot-${q.tone}`}>
            <div className="swot-head">
              <span className="swot-letter">{q.key}</span>
              <div><h2>{q.label}</h2><p>{q.sub}</p></div>
            </div>
            <div className="stack-sm">
              {arr(data, q.key, 4, emptyPoint).map((p, i) => (
                <div key={i} className={`swot-item ${p.utama ? 'is-main' : ''}`}>
                  <div className="swot-item-row">
                    <Text value={p.poin} onChange={(v) => put(q.key, i, { poin: v })} placeholder={`Poin ${i + 1}`} />
                    <button
                      type="button"
                      className={`star ${p.utama ? 'on' : ''}`}
                      title="Tandai sebagai poin terkuat"
                      aria-pressed={p.utama}
                      onClick={() => put(q.key, i, { utama: !p.utama })}
                    >★</button>
                  </div>
                  <Text value={p.bukti} onChange={(v) => put(q.key, i, { bukti: v })} placeholder="Bukti: data, kejadian, pengamatan" className="sub-input" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <Block title="Debrief" hint="Kotak mana yang paling sulit diisi? Mengapa?">
        <Area value={data.debrief} onChange={(v) => set({ debrief: v })} />
      </Block>
    </Sheet>
  )
}

export function quadrantOf(k) {
  if (!k?.eksternal || !k?.internal) return null
  return QUADRANTS[`${k.eksternal}-${k.internal}`] || null
}

export function Kuadran() {
  const [data, set] = useSection('s2_kuadran')
  const q = quadrantOf(data)
  const cell = (eks, int) => {
    const key = `${eks}-${int}`
    const active = data.eksternal === eks && data.internal === int
    return (
      <button type="button" className={`quad ${active ? 'active' : ''}`} onClick={() => set({ eksternal: eks, internal: int })}>
        <b>{QUADRANTS[key].name}</b>
        <span>{eks === 'peluang' ? 'Peluang' : 'Ancaman'} + {int === 'kekuatan' ? 'Kekuatan' : 'Kelemahan'}</span>
      </button>
    )
  }
  return (
    <Sheet
      kicker="Latihan Sesi 2 · 15 menit"
      title="Di kuadran mana perusahaan Anda?"
      steps={[
        'Dari SWOT kelompok: mana yang lebih besar, peluang atau ancaman?',
        'Mana yang lebih besar, kekuatan atau kelemahan?',
        'Lihat kuadran yang terbentuk.',
        'Tulis grand strategy kelompok dalam satu kalimat, lengkap dengan alasannya.',
      ]}
      result="Satu kuadran, satu grand strategy, dan satu kalimat alasan."
    >
      <div className="grid-2">
        <Block title="Lingkungan eksternal">
          <Choice options={[{ value: 'peluang', label: 'Peluang lebih besar' }, { value: 'ancaman', label: 'Ancaman lebih besar' }]} value={data.eksternal} onChange={(v) => set({ eksternal: v })} />
        </Block>
        <Block title="Kondisi internal">
          <Choice options={[{ value: 'kekuatan', label: 'Kekuatan lebih besar' }, { value: 'kelemahan', label: 'Kelemahan lebih besar' }]} value={data.internal} onChange={(v) => set({ internal: v })} />
        </Block>
      </div>
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
      {q && <Note><b>Kuadran {q.name}.</b> {q.desc}</Note>}
      <Block title="Grand strategy kelompok">
        <Field label="Grand strategy dalam satu kalimat" wide>
          <Area value={data.grand_strategy} onChange={(v) => set({ grand_strategy: v })} placeholder="Contoh: Membenahi keandalan armada agar bisa merebut permintaan B2B yang sedang tumbuh" />
        </Field>
        <Field label="Alasan (dari SWOT)" wide>
          <Area value={data.alasan} onChange={(v) => set({ alasan: v })} />
        </Field>
      </Block>
      <Note tone="muted">Ini hipotesis kelompok untuk belajar, bukan penilaian resmi atas perusahaan.</Note>
    </Sheet>
  )
}

const emptyRkap = () => ({ target: '', sejalan: '', catatan: '' })

export function Rkap() {
  const [data, set] = useSection('s2_rkap')
  const [kuadran] = useSection('s2_kuadran')
  const rows = arr(data, 'rows', 5, emptyRkap)
  const put = (i, patch) => set((d) => {
    const a = arr(d, 'rows', 5, emptyRkap)
    a[i] = { ...a[i], ...patch }
    return { ...d, rows: a }
  })
  const filled = rows.filter((r) => r.target.trim())
  const tidak = filled.filter((r) => r.sejalan === 'tidak').length
  return (
    <Sheet
      kicker="Latihan Sesi 2 · 15 menit"
      title="Cocokkan grand strategy dengan RKAP"
      intro="RKAP (Rencana Kerja dan Anggaran Perusahaan) berisi target dan program tahunan yang disahkan pemegang saham. Di sinilah strategi berubah menjadi angka."
      steps={[
        'Tulis 3–5 target atau program utama di RKAP perusahaan Anda.',
        'Tandai setiap target: sejalan atau tidak dengan grand strategy kelompok?',
        'Banyak yang tidak sejalan? Diskusikan: kuadran kita yang keliru, atau ada yang belum kita lihat?',
      ]}
    >
      <Note>
        <b>Grand strategy kelompok:</b>{' '}
        {kuadran.grand_strategy?.trim() || <i>belum diisi di lembar Kuadran.</i>}
      </Note>
      <div className="stack">
        {rows.map((r, i) => (
          <div className="row-card" key={i}>
            <span className="num">{i + 1}</span>
            <div className="grow grid-rkap">
              <Field label="Target atau program RKAP"><Area value={r.target} onChange={(v) => put(i, { target: v })} /></Field>
              <Field label="Sejalan?" group>
                <Choice small options={[{ value: 'ya', label: 'Sejalan' }, { value: 'sebagian', label: 'Sebagian' }, { value: 'tidak', label: 'Tidak' }]} value={r.sejalan} onChange={(v) => put(i, { sejalan: v })} />
              </Field>
              <Field label="Catatan"><Area value={r.catatan} onChange={(v) => put(i, { catatan: v })} /></Field>
            </div>
          </div>
        ))}
      </div>
      {tidak >= 2 && <Note tone="warn">{tidak} target tidak sejalan. Cek lagi: kuadran kelompok yang keliru, atau ada konteks RKAP yang belum terlihat?</Note>}
      <Block title="Kesimpulan diskusi">
        <Area value={data.kesimpulan} onChange={(v) => set({ kesimpulan: v })} rows={3} />
      </Block>
    </Sheet>
  )
}

const emptyArrow = () => ({ dari: '', ke: '', sehingga: '' })

export function Peta() {
  const [data, set] = useSection('s2_peta')
  const [kuadran] = useSection('s2_kuadran')
  const putSasaran = (k, i, v) => set((d) => {
    const a = arr(d, k, 2)
    a[i] = v
    return { ...d, [k]: a }
  })
  const putArrow = (i, patch) => set((d) => {
    const a = arr(d, 'panah', 4, emptyArrow)
    a[i] = { ...a[i], ...patch }
    return { ...d, panah: a }
  })
  const allSasaran = PERSPECTIVES.flatMap((p) => arr(data, p.key, 2).map((s) => s.trim()).filter(Boolean))
  return (
    <Sheet
      kicker="Latihan Sesi 2 · 20 menit"
      title="Susun strategy map anak perusahaan Anda"
      steps={[
        'Tulis grand strategy kelompok di bagian paling atas.',
        'Letakkan target RKAP utama di Finansial dan Pelanggan.',
        'Isi Proses dan Pembelajaran: apa yang harus benar agar target itu tercapai?',
        'Tarik panah sebab-akibat. Maksimal dua sasaran per perspektif.',
      ]}
      result="Strategy map satu halaman. Dipakai lagi di Sesi 3 dan di pleno sore."
    >
      <Block title="Grand strategy">
        <Area
          value={data.grand_strategy ?? kuadran.grand_strategy ?? ''}
          onChange={(v) => set({ grand_strategy: v })}
          placeholder="Diambil dari lembar Kuadran; boleh dipertajam"
        />
      </Block>
      <div className="map">
        {PERSPECTIVES.map((p, idx) => (
          <div key={p.key} className={`map-row map-${idx}`}>
            <div className="map-label"><b>{p.label}</b><span>{p.hint}</span></div>
            <div className="map-cells">
              {arr(data, p.key, 2).map((s, i) => (
                <Area key={i} value={s} onChange={(v) => putSasaran(p.key, i, v)} placeholder={`Sasaran ${i + 1} (tulis sebagai hasil)`} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Note tone="muted">
        Tulis sasaran sebagai <b>hasil</b> (“operator menguasai standar layanan”), bukan kegiatan (“mengadakan pelatihan”).
      </Note>
      <Block title="Panah sebab-akibat" hint="Jelaskan setiap panah dengan kata “sehingga”.">
        <datalist id="sasaran-list">{allSasaran.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="stack">
          {arr(data, 'panah', 4, emptyArrow).map((a, i) => (
            <div key={i} className="arrow-row">
              <Text value={a.dari} onChange={(v) => putArrow(i, { dari: v })} placeholder="Sasaran penyebab" list="sasaran-list" />
              <span className="arrow">→</span>
              <Text value={a.ke} onChange={(v) => putArrow(i, { ke: v })} placeholder="Sasaran akibat" list="sasaran-list" />
              <Text value={a.sehingga} onChange={(v) => putArrow(i, { sehingga: v })} placeholder="…sehingga…" />
            </div>
          ))}
        </div>
      </Block>
      <Block title="Debrief" hint="Sasaran mana yang paling bergantung pada unit Anda?">
        <Area value={data.unit} onChange={(v) => set({ unit: v })} />
      </Block>
    </Sheet>
  )
}
