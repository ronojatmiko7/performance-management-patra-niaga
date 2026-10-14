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

export const QUADRANTS = {
  'peluang-kekuatan': { name: 'Agresif', desc: 'Peluang eksternal dan kekuatan internal dominan. Manfaatkan kekuatan untuk merebut peluang: ekspansi, pertumbuhan pasar, penetrasi.' },
  'peluang-kelemahan': { name: 'Turnaround', desc: 'Peluang eksternal dominan, tetapi kelemahan internal menghambat. Benahi kelemahan dulu agar peluang bisa diambil.' },
  'ancaman-kekuatan': { name: 'Diversifikasi', desc: 'Ancaman eksternal dominan, kekuatan internal masih besar. Pakai kekuatan untuk masuk ke produk, pasar, atau layanan baru.' },
  'ancaman-kelemahan': { name: 'Defensif', desc: 'Ancaman eksternal dan kelemahan internal dominan. Lindungi posisi, efisiensi, fokus pada inti bisnis.' },
}

export const EVAL_ITEMS = [
  'Materi relevan dengan pekerjaan saya sehari-hari.',
  'Materi disampaikan secara runtut dan mudah dipahami.',
  'Latihan membantu saya memahami KPI unit saya.',
  'Fasilitator menguasai materi.',
  'Fasilitator menyampaikan materi dengan jelas dan melibatkan peserta.',
  'Alokasi waktu setiap sesi memadai.',
  'Workbook dan bahan pendukung membantu proses belajar.',
  'Saya akan menerapkan hasil pelatihan ini di unit saya.',
]

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export const NAV = [
  { group: 'Pembuka', items: [
    { id: 'pretest', label: 'Pre-test', time: '08.00' },
  ] },
  { group: 'Sesi 1 · Start With Why', items: [
    { id: 's1_tantangan', label: 'Tantangan kita', time: '08.25' },
    { id: 's1_customer', label: 'Customer & kebutuhannya', time: '09.00' },
    { id: 's1_refleksi', label: 'Refleksi Sesi 1', time: '09.55' },
  ] },
  { group: 'Sesi 2 · Strategi', items: [
    { id: 's2_swot', label: 'SWOT', time: '10.25' },
    { id: 's2_kuadran', label: 'Kuadran & grand strategy', time: '10.55' },
    { id: 's2_rkap', label: 'Cek RKAP', time: '11.10' },
    { id: 's2_peta', label: 'Strategy map', time: '11.35' },
  ] },
  { group: 'Sesi 3 · KPI Unit', items: [
    { id: 's3_kartu', label: 'Kartu KPI unit', time: '14.00' },
    { id: 's3_tracker', label: 'Tracker & sumber gap', time: '14.20' },
    { id: 's3_perbaikan', label: 'Rencana perbaikan', time: '14.45' },
  ] },
  { group: 'Penutup', items: [
    { id: 'komitmen', label: 'Komitmen 30 hari', time: '15.55' },
    { id: 'posttest', label: 'Post-test', time: '16.00' },
    { id: 'evaluasi', label: 'Evaluasi pelatihan', time: '16.15' },
    { id: 'ringkasan', label: 'Ringkasan & cetak', time: '' },
  ] },
]

export const SECTION_IDS = NAV.flatMap((g) => g.items.map((i) => i.id))
