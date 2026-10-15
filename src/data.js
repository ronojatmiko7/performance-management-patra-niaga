import content from './content.json'

export const COMPANIES = [
  'Pertamina Lubricants',
  'Pertamina Retail',
  'Pertamina Petrochemical Trading',
  'Trading & Services',
  'Pertamina Maintenance & Construction',
  'Patra SK',
  'Pertamina International Timor SA',
  'Pertamina Patra Logistik',
  'Pertamina International Marketing & Distribution',
]

export const PERSPECTIVES = [
  { key: 'finansial', label: 'Finansial', hint: 'Hasil keuangan yang ingin dicapai' },
  { key: 'pelanggan', label: 'Pelanggan', hint: 'Nilai yang dirasakan customer' },
  { key: 'proses', label: 'Proses Internal', hint: 'Proses inti yang harus unggul' },
  { key: 'pembelajaran', label: 'Pembelajaran & Pertumbuhan', hint: 'Orang, sistem, dan budaya penggerak' },
]

/** Kotak pleno tantangan (slide 10), urutannya sengaja mengikuti empat perspektif BSC. */
export const KATEGORI = [
  { value: 'finansial', label: 'Keuangan & biaya', hint: 'Margin, biaya operasi, efisiensi, anggaran' },
  { value: 'pelanggan', label: 'Pelanggan & pasar', hint: 'Kepuasan, keluhan, persaingan, permintaan' },
  { value: 'proses', label: 'Proses & operasional', hint: 'Keterlambatan, koordinasi, SOP, serah-terima' },
  { value: 'pembelajaran', label: 'Orang, sistem & budaya', hint: 'Kompetensi, data, beban kerja, perubahan' },
  { value: 'lainnya', label: 'Lainnya', hint: '' },
]

export const QUADRANTS = {
  'peluang-kekuatan': { name: 'Agresif', desc: 'Peluang eksternal dan kekuatan internal dominan. Manfaatkan kekuatan untuk merebut peluang: ekspansi, pertumbuhan pasar, penetrasi.' },
  'peluang-kelemahan': { name: 'Turnaround', desc: 'Peluang eksternal dominan, tetapi kelemahan internal menghambat. Benahi kelemahan dulu agar peluang bisa diambil.' },
  'ancaman-kekuatan': { name: 'Diversifikasi', desc: 'Ancaman eksternal dominan, kekuatan internal masih besar. Pakai kekuatan untuk masuk ke produk, pasar, atau layanan baru.' },
  'ancaman-kelemahan': { name: 'Defensif', desc: 'Ancaman eksternal dan kelemahan internal dominan. Lindungi posisi, efisiensi, fokus pada inti bisnis.' },
}

/** Evaluasi Level 1 dikelompokkan sesuai slide 61: materi, fasilitator, dan penyelenggaraan. */
export const EVAL_GROUPS = [
  { title: 'Materi', items: [
    'Materi relevan dengan pekerjaan saya sehari-hari.',
    'Materi disampaikan secara runtut dan mudah dipahami.',
    'Latihan membantu saya memahami KPI unit saya.',
    'Saya akan menerapkan hasil pelatihan ini di unit saya.',
  ] },
  { title: 'Fasilitator', items: [
    'Fasilitator menguasai materi.',
    'Fasilitator menyampaikan materi dengan jelas dan melibatkan peserta.',
  ] },
  { title: 'Penyelenggaraan', items: [
    'Alokasi waktu setiap sesi memadai.',
    'Workbook dan bahan pendukung membantu proses belajar.',
  ] },
]
export const EVAL_ITEMS = EVAL_GROUPS.flatMap((g) => g.items)

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const SHEETS = content.sheets
export const SHEET = Object.fromEntries(content.sheets.map((s) => [s.id, s]))
export const GROUP_SECTIONS = content.sheets.filter((s) => s.scope === 'group' && s.id !== 'pleno').map((s) => s.id)

export const NAV = content.sheets.reduce((acc, s) => {
  let g = acc.find((x) => x.group === s.group)
  if (!g) { g = { group: s.group, items: [] }; acc.push(g) }
  g.items.push({ id: s.id, label: s.label, time: s.time, scope: s.scope, slide: s.slide })
  return acc
}, [])

export const SECTION_IDS = content.sheets.map((s) => s.id)
