# DOKUMENTASI ARSITEKTUR & DESAIN SISTEM KEUANGAN SEKOLAH
Sistem Manajemen Keuangan Sekolah berbasis Supabase PostgreSQL & React.

---

## TAHAP 1: DATABASE SCHEMA LENGKAP
Skema database PostgreSQL lengkap telah dibuat di file `/supabase/schema.sql` dengan tabel:
1. `public.users` (Admin, Bendahara, Kepala Sekolah)
2. `public.students` (Data Siswa lengkap)
3. `public.payment_types` (Master jenis pembayaran)
4. `public.payments` (Tagihan Utama)
5. `public.payment_installments` (Histori cicilan)
6. `public.activity_logs` (Audit Trail)

---

## TAHAP 2: RELASI ANTAR TABEL (ENTITY RELATIONSHIP DIAGRAM / ERD LOGIC)

```
  +-------------+                  +------------------+
  |    USERS    |                  |  PAYMENT_TYPES   |
  +-------------+                  +------------------+
         |                                  |
         | 1                                | 1
         |                                  |
         | 0..*                             | 0..*
  +-------------+                  +------------------+
  |  ACT_LOGS   |                  |     PAYMENTS     |<--+
  +-------------+                  +------------------+   | 1
         ^                                  |             |
         | 0..*                             | 1           |
         |                                  |             | 0..*
         | references                       | 0..*        |
  +-------------+                  +------------------+   |
  |  PAYMENTS   |                  |   INSTALLMENTS   |---+
  | (Created By)|                  +------------------+
  +-------------+                           ^
         ^                                  | 0..*
         | 0..*                             | references
         |                                  +-- (Created By)
  +-------------+
  |  STUDENTS   |
  +-------------+
```

### Aturan Relasi (Foreign Key Constraints) & Cascading:
1. **Students (1) -> Payments (N)**
   - Hubungan: Setiap siswa dapat memiliki banyak tagihan pembayaran.
   - Aturan: `ON DELETE CASCADE`. Jika data siswa dihapus, seluruh tagihan pembayaran milik siswa tersebut otomatis terhapus untuk mencegah data yatim (*orphan data*).
2. **Payment Types (1) -> Payments (N)**
   - Hubungan: Setiap jenis pembayaran (misal SPP) dapat dikenakan ke banyak siswa.
   - Aturan: `ON DELETE CASCADE`. Jika jenis pembayaran dihapus, semua tagihan terkait terhapus.
3. **Payments (1) -> Payment Installments (N)**
   - Hubungan: Satu tagihan dapat diangsur/dicicil beberapa kali.
   - Aturan: `ON DELETE CASCADE`. Menghapus tagihan utama otomatis menghapus detail cicilannya.
4. **Users (1) -> Payments / Installments / Logs (N)**
   - Hubungan: Pengguna (Bendahara) membuat transaksi pembayaran atau logging.
   - Aturan: `ON DELETE SET NULL`. Jika user dihapus, data transaksi tetap ada untuk audit keuangan, namun kolom `created_by` diset `NULL`. Username/Role juga di-cache di `activity_logs` untuk ketertelusuran historis.

---

## TAHAP 3: RANCANG API ENDPOINTS / SYSTEM FUNCTIONS

Sistem menggunakan API Router Express + Vite Middleware yang mensimulasikan Supabase PostgreSQL Client.

### Autentikasi (`/api/auth`)
* `POST /api/auth/login`: Autentikasi pengguna berdasarkan role (Admin, Bendahara, Kepala Sekolah).
* `POST /api/auth/logout`: Membersihkan session token.
* `GET /api/auth/me`: Mengambil info session user yang sedang login.

### Siswa (`/api/students`)
* `GET /api/students`: Mengambil data siswa dengan filter `kelas`, `jurusan`, `search` (nama/nis), dan `pagination`.
* `POST /api/students`: Tambah data siswa baru.
* `PUT /api/students/:id`: Edit data siswa.
* `DELETE /api/students/:id`: Hapus data siswa (Cascade).
* `POST /api/students/import`: Import data massal dari Excel/JSON.

### Master Pembayaran (`/api/payment-types`)
* `GET /api/payment-types`: Mengambil seluruh jenis pembayaran aktif.
* `POST /api/payment-types`: Tambah jenis pembayaran (SPP, Uang Gedung, dll).
* `PUT /api/payment-types/:id`: Update jenis pembayaran.
* `DELETE /api/payment-types/:id`: Hapus jenis pembayaran.

### Transaksi Pembayaran (`/api/payments`)
* `GET /api/payments`: List semua billing pembayaran dengan filter status (`Lunas`, `Cicilan`, `Belum Lunas`), siswa, dan periode.
* `POST /api/payments/generate`: Otomatis membuat tagihan baru untuk seluruh siswa aktif (contoh: SPP bulan baru).
* `POST /api/payments/:id/pay`: Input pembayaran/cicilan baru.
* `GET /api/payments/:id/invoice`: Generate data invoice PDF/Cetak lengkap dengan QR Code.
* `POST /api/payments/:id/upload-bukti`: Upload bukti pembayaran (reminder tunggakan / konfirmasi manual).

### Laporan & Dashboard (`/api/reports` & `/api/dashboard`)
* `GET /api/dashboard/stats`: KPI Dashboard (Pemasukan hari ini, bulan ini, total tunggakan, dll).
* `GET /api/dashboard/charts`: Data grafik bulanan dan status pembayaran.
* `GET /api/reports/rekap-bulanan`: Rekap otomatis per bulan/tahun, kelas, jurusan.
* `GET /api/reports/tunggakan`: Mengambil daftar siswa yang menunggak dan nominal tunggakan.

---

## TAHAP 4: BUSINESS LOGIC PEMBAYARAN

Alur perhitungan keuangan transaksi:
1. **Inisiasi Tagihan**:
   - `nominal_tagihan` disalin dari `payment_types.nominal`.
   - `nominal_bayar` diset ke `0.00`.
   - `sisa_tagihan` = `nominal_tagihan` - `nominal_bayar`.
   - `status` = `'Belum Lunas'`.

2. **Proses Pembayaran (Cicilan/Lunas)**:
   - Ketika ada transaksi cicilan sebesar $X$:
     - `nominal_bayar_baru` = `nominal_bayar_lama` + $X$
     - `sisa_tagihan_baru` = `nominal_tagihan` - `nominal_bayar_baru`
     - Jika `sisa_tagihan_baru` <= 0:
       - `status` = `'Lunas'`
       - `sisa_tagihan` = `0`
     - Jika `sisa_tagihan_baru` > 0 dan `nominal_bayar_baru` > 0:
       - `status` = `'Cicilan'`
       - `sisa_tagihan` = `sisa_tagihan_baru`
     - Catat riwayat di tabel `payment_installments`.
     - Buat log di `activity_logs`.

---

## TAHAP 5: QUERY REKAP BULANAN (POSTGRESQL AGGREGATION)

Sistem menggunakan query agregasi yang dioptimalkan untuk merekap transaksi:

```sql
SELECT 
    COUNT(DISTINCT student_id) as total_siswa_tertagih,
    SUM(nominal_tagihan) as total_tagihan_kotor,
    SUM(nominal_bayar) as total_pembayaran_masuk,
    SUM(sisa_tagihan) as total_tunggakan,
    COUNT(CASE WHEN status = 'Lunas' THEN 1 END) as total_siswa_lunas,
    COUNT(CASE WHEN status = 'Belum Lunas' THEN 1 END) as total_siswa_belum_bayar,
    COUNT(CASE WHEN status = 'Cicilan' THEN 1 END) as total_siswa_mencicil,
    ROUND((SUM(nominal_bayar) / NULLIF(SUM(nominal_tagihan), 0)) * 100, 2) as persentase_pembayaran
FROM public.payments p
JOIN public.students s ON p.student_id = s.id
WHERE 
    p.bulan = :bulan 
    AND p.tahun = :tahun
    AND (:kelas IS NULL OR s.kelas = :kelas)
    AND (:jurusan IS NULL OR s.jurusan = :jurusan);
```

---

## TAHAP 6: STRUKTUR UI DASHBOARD & BACKOFFICE (REACT + TAILWIND)

* **Layout Utama**: Responsive Admin Panel dengan sidebar navigasi yang dinamis sesuai role:
  - **Kepala Sekolah**: Hanya melihat Dashboard, Laporan Keuangan, dan Audit Logs.
  - **Bendahara**: Dashboard, Data Siswa, Transaksi Pembayaran, Rekap Bulanan, Laporan.
  - **Admin**: Akses Penuh, Manajemen User, Master Data, Backup & Restore, Audit Logs.
* **Halaman Dashboard**:
  - Grid KPI metrics (pemasukan hari ini, bulan ini, tahun ini, total tunggakan).
  - Recharts Chart: Grafik Area/Bar Pemasukan Bulanan, Pie Chart Status Pembayaran, Bar Chart Tunggakan per Kelas.
* **Halaman Data Siswa**: Data grid dengan pencarian, filter kelas & jurusan, pagination, tombol tambah/edit/hapus, serta import/export CSV.
* **Halaman Jenis Pembayaran**: Kelola tarif SPP, uang gedung, seragam, kegiatan.
* **Halaman Transaksi Pembayaran**: Pencarian siswa cepat, form bayar cepat/cicilan, daftar tagihan, cetak kuitansi thermal/invoice.
* **Halaman Rekap & Laporan**: Filter laporan interaktif, cetak laporan langsung, download Excel/PDF.
* **Halaman Pengaturan / Audit Logs**: Jejak aktivitas lengkap dan tombol backup/restore.

---

## TAHAP 7: FLOW SISTEM END-TO-END

```
[Bulan Baru / Tahun Ajaran Baru]
            │
            ▼
┌──────────────────────────────────────────────┐
│  Admin/Bendahara menggenerate Tagihan SPP    │
│  (Sistem menyalin nominal tarif ke payments)  │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│  Siswa menerima invoice / tagihan            │
│  (Sistem menghitung status: Belum Lunas)     │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│  Siswa membayar ke Bendahara (Cash/Transfer) │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│  Bendahara menginput Pembayaran di Panel     │
│  - Memasukkan nominal bayar                  │
│  - Memilih metode pembayaran & upload bukti  │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│  Sistem memperbarui saldo secara otomatis:   │
│  - Sisa Tagihan berkurang                    │
│  - Status berubah (Lunas / Cicilan)          │
│  - Cetak Bukti Bayar / Kuitansi & QR Code     │
│  - Log aktivitas tercatat                    │
└─────────────────────┬────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│  Kepala Sekolah & Bendahara memantau real-time│
│  - Grafik & Rekap Bulanan terupdate otomatis │
│  - Laporan siap dicetak/diexport             │
└──────────────────────────────────────────────┘
```
