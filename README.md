# Workbook Digital · Performance Management Fundamental

Workbook digital untuk pelatihan satu hari **Performance Management Fundamental**
bagi staf anak perusahaan PT Pertamina Patra Niaga, oleh PT Performa International Indonesia.

Peserta mengisi seluruh latihan di satu tempat: pre-test, latihan Sesi 1–3,
komitmen 30 hari, post-test, dan evaluasi Level 1. Jawaban tersimpan otomatis.
Fasilitator memantau semuanya dari satu dashboard.

## Isi workbook

Teks setiap lembar (kicker, judul, langkah, hasil, debrief, nomor slide) diambil dari
`src/content.json`, dan slide latihan di deck memakai teks yang sama persis. Ubah teks di
`content.json` lalu samakan slide-nya, jangan hanya salah satunya.

Ada dua jenis lembar:

- **Lembar pribadi** (pre-test, tantangan, refleksi, komitmen, post-test, evaluasi): diisi masing-masing peserta.
- **Lembar kelompok** (customer, SWOT, kuadran, RKAP, strategy map, Kartu KPI, tracker, rencana perbaikan):
  satu lembar per anak perusahaan dalam satu batch. Semua anggota melihat dan bisa mengisi bersamaan;
  perubahan tersinkron tiap 4 detik dan digabung per field, jadi dua orang yang mengisi kotak berbeda tidak saling menimpa.

| Bagian | Lembar |
|---|---|
| Pembuka | Pre-test (10 soal, dinilai di server) |
| Sesi 1 · Start With Why | Tantangan kita · Customer & kebutuhannya · Refleksi (perspektif BSC, ide OKR) |
| Sesi 2 · Strategi | SWOT dengan bukti · Kuadran & grand strategy · Cek RKAP · Strategy map 4 perspektif + panah sebab-akibat |
| Sesi 3 · KPI Unit | Kartu KPI unit (8 elemen, cascading, lead indicator, kontribusi anggota) · Tracker bulanan dengan status hijau/kuning/merah otomatis sesuai polaritas · Rencana perbaikan + laporan tiga kalimat |
| Penutup | Komitmen 30 hari · Post-test (dibuka fasilitator) · Evaluasi Level 1 · Ringkasan yang bisa dicetak/PDF |

## Alamat

| Untuk | Alamat |
|---|---|
| Peserta | `https://<domain>/` atau `https://<domain>/?batch=batch-2` untuk batch lain |
| Melanjutkan di perangkat lain | Menu **Tautan pribadi** → `https://<domain>/#/r/<id>.<token>` |
| Fasilitator | `https://<domain>/#/fasilitator` (PIN) |

## Alur fasilitator di hari pelatihan

1. Tampilkan QR ke alamat peserta di slide pre-test (08.00).
2. Pantau jumlah peserta dan nilai pre-test di dashboard.
3. Tampilkan papan di layar dengan **Mode layar**: *Peta tantangan* (slide 10 dan 20), *Matriks kuadran* (slide 31), dan *Pleno* per kelompok (slide 59).
4. Pukul 16.00 tekan **Buka post-test**. Peserta yang sudah di halaman post-test akan melihatnya terbuka dalam 15 detik.
5. Setelah evaluasi selesai, **Unduh CSV** (nilai + evaluasi) atau **Unduh JSON** (seluruh isian) untuk laporan.

## Arsitektur

- **Frontend:** Vite + React, tanpa router (hash route), di-deploy ke Vercel.
- **Backend:** Supabase project PerfOS, schema terpisah `pmf_patra` (lihat `supabase/schema.sql`).
  - Lembar kelompok ada di `pmf_patra.group_responses` (lihat `supabase/group_sheets.sql`).
  - Schema tidak diekspos ke API; RLS aktif tanpa policy.
  - Semua akses lewat fungsi `public.pmf_*` (SECURITY DEFINER).
  - Peserta diautentikasi dengan pasangan `id + token` acak yang disimpan di browser.
  - Fasilitator diautentikasi dengan PIN (bcrypt di `pmf_patra.settings`).
  - Nilai tes dihitung di server; kunci jawaban tidak pernah dikirim ke browser sebelum post-test dikirim.

## Pengembangan lokal

```bash
cp .env.example .env.local
npm install
npm run dev
```

Variabel lingkungan (juga diisi di Vercel):

```
VITE_SUPABASE_URL=https://edodmmedehuuemnnmdri.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key project PerfOS>
```

## Operasional di database

```sql
-- Ganti PIN fasilitator
update pmf_patra.settings
   set value = extensions.crypt('<PIN-BARU>', extensions.gen_salt('bf'))
 where key = 'admin_pin_hash';

-- Kunci kembali post-test untuk batch berikutnya
update pmf_patra.settings set value = 'false' where key = 'post_open';

-- Hapus data uji coba
delete from pmf_patra.participants where batch = 'uji';
```
