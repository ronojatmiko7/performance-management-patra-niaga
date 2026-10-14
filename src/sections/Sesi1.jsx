import { useSection, arr } from '../store.jsx'
import { Sheet, Block, Field, Text, Area, Choice, Note } from '../ui.jsx'
import { PERSPECTIVES } from '../data.js'

const KATEGORI = [
  { value: 'finansial', label: 'Keuangan & biaya' },
  { value: 'pelanggan', label: 'Pelanggan & pasar' },
  { value: 'proses', label: 'Proses & operasional' },
  { value: 'pembelajaran', label: 'Orang, sistem & budaya' },
  { value: 'lainnya', label: 'Lainnya' },
]

function ChallengeList({ data, set, field, title, hint }) {
  const items = arr(data, field, 3, () => ({ teks: '', kategori: '' }))
  const put = (i, patch) => set((d) => {
    const a = arr(d, field, 3, () => ({ teks: '', kategori: '' }))
    a[i] = { ...a[i], ...patch }
    return { ...d, [field]: a }
  })
  return (
    <Block title={title} hint={hint}>
      <div className="stack">
        {items.map((it, i) => (
          <div className="row-card" key={i}>
            <span className="num">{i + 1}</span>
            <div className="grow stack-sm">
              <Area value={it.teks} onChange={(v) => put(i, { teks: v })} placeholder="Tulis satu tantangan, sekonkret mungkin" />
              <Choice small options={KATEGORI} value={it.kategori} onChange={(v) => put(i, { kategori: v })} />
            </div>
          </div>
        ))}
      </div>
    </Block>
  )
}

export function Tantangan() {
  const [data, set] = useSection('s1_tantangan')
  return (
    <Sheet
      kicker="Sesi 1 · Diskusi kelompok · 15 menit"
      title="Tantangan apa yang sedang Anda hadapi?"
      intro="Apa tantangan yang sedang dihadapi oleh perusahaan Anda secara umum, dan pekerjaan Anda secara khusus?"
      steps={[
        'Tulis tantangan Anda sendiri dulu, satu tantangan per baris.',
        'Pilih tiga yang terbesar di tiap kolom untuk dibawa ke pleno.',
        'Saat pleno, tandai kotak mana yang paling cocok untuk setiap tantangan.',
      ]}
    >
      <div className="grid-2">
        <ChallengeList data={data} set={set} field="perusahaan" title="Perusahaan saya" hint="Tantangan anak perusahaan secara umum" />
        <ChallengeList data={data} set={set} field="pekerjaan" title="Pekerjaan saya" hint="Tantangan di meja kerja Anda sendiri" />
      </div>
      <Block title="Catatan pleno" hint="Pola apa yang muncul ketika semua tantangan ditempel di dinding?">
        <Area value={data.pola} onChange={(v) => set({ pola: v })} placeholder="Misalnya: banyak tantangan di Proses, sedikit di Pelanggan" rows={3} />
      </Block>
    </Sheet>
  )
}

export function Customer() {
  const [data, set] = useSection('s1_customer')
  const rows = arr(data, 'rows', 3, () => ({ customer: '', kebutuhan: '', cara: '' }))
  const put = (i, k, v) => set((d) => {
    const a = arr(d, 'rows', 3, () => ({ customer: '', kebutuhan: '', cara: '' }))
    a[i] = { ...a[i], [k]: v }
    return { ...d, rows: a }
  })
  return (
    <Sheet
      kicker="Sesi 1 · Diskusi kelompok + pleno · 20 menit"
      title="Siapa customer Anda, dan apa yang Anda selesaikan?"
      intro="Bisnis adalah kendaraan untuk meraih keuntungan, dengan cara memenuhi kebutuhan atau menyelesaikan permasalahan customer."
      steps={[
        'Berkumpul per anak perusahaan.',
        'Isi tabel ini untuk maksimal tiga customer utama.',
        'Satu juru bicara, dua menit di pleno.',
      ]}
    >
      <Note>
        <b>Contoh, SPBU:</b> customer-nya pengendara pribadi dan armada niaga · kebutuhannya BBM selalu tersedia,
        layanan cepat, takaran tepat · cara memenuhinya jaringan SPBU, standar layanan, pembayaran non-tunai.
      </Note>
      <div className="table-cards">
        {rows.map((r, i) => (
          <Block key={i} title={`Customer ${i + 1}`}>
            <div className="grid-3">
              <Field label="Siapa customer-nya?"><Area value={r.customer} onChange={(v) => put(i, 'customer', v)} /></Field>
              <Field label="Kebutuhan atau masalah mereka"><Area value={r.kebutuhan} onChange={(v) => put(i, 'kebutuhan', v)} /></Field>
              <Field label="Cara kami memenuhinya"><Area value={r.cara} onChange={(v) => put(i, 'cara', v)} /></Field>
            </div>
          </Block>
        ))}
      </div>
    </Sheet>
  )
}

export function Refleksi() {
  const [data, set] = useSection('s1_refleksi')
  return (
    <Sheet
      kicker="Sesi 1 · Rangkuman"
      title="Kembali ke Why"
      intro="Bisnis ada untuk meraih keuntungan dengan cara memenuhi kebutuhan customer. Balanced Scorecard menjaga kedua hasil itu lewat proses inti serta learning and growth. OKR mempercepat perbaikan di titik yang paling lemah."
    >
      <Block title="Di perspektif mana pekerjaan Anda paling banyak berkontribusi?">
        <Field label="Perspektif" group>
          <Choice options={PERSPECTIVES.map((p) => ({ value: p.key, label: p.label }))} value={data.perspektif} onChange={(v) => set({ perspektif: v })} />
        </Field>
        <Field label="Contoh nyata dari pekerjaan Anda" wide>
          <Area value={data.alasan} onChange={(v) => set({ alasan: v })} placeholder="Apa yang Anda kerjakan, dan bagaimana itu menggerakkan perspektif tersebut?" rows={3} />
        </Field>
      </Block>
      <Block title="Satu ide OKR (opsional)" hint="Bila unit Anda boleh memilih satu terobosan untuk kuartal depan, apa itu?">
        <div className="grid-2">
          <Field label="Objective"><Area value={data.okr_objective} onChange={(v) => set({ okr_objective: v })} placeholder="Kalimat kualitatif yang memotivasi" /></Field>
          <Field label="Key result"><Area value={data.okr_kr} onChange={(v) => set({ okr_kr: v })} placeholder="Angka yang membuktikan objective tercapai" /></Field>
        </div>
      </Block>
    </Sheet>
  )
}
