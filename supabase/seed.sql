-- ==========================================
-- SEED DATA UNTUK DATABASE KEUANGAN SEKOLAH
-- DBMS: Supabase PostgreSQL (SQL Editor Friendly)
-- Catatan: ID menggunakan TEXT, bukan UUID
-- ==========================================

-- 1. Seed data untuk tabel USERS
INSERT INTO public.users (id, username, password_hash, nama_lengkap, role, status, created_at, updated_at) VALUES
('usr-admin-1111', 'admin', 'admin', 'Pak Ahmad (Admin)', 'Admin', 'aktif', '2026-01-01 08:00:00+00', '2026-01-01 08:00:00+00'),
('usr-bendahara-2222', 'bendahara', 'bendahara', 'Ibu Siti (Bendahara)', 'Bendahara', 'aktif', '2026-01-01 08:30:00+00', '2026-01-01 08:30:00+00'),
('usr-kepsek-3333', 'kepsek', 'kepsek', 'Drs. H. Mulyadi, M.Pd', 'Kepala Sekolah', 'aktif', '2026-01-01 09:00:00+00', '2026-01-01 09:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed data untuk tabel STUDENTS
INSERT INTO public.students (id, nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status, created_at, updated_at) VALUES
('std-1', '20261001', 'Muhammad Fadhil', 'Laki-laki', 'XII', 'IPA', '2025/2026', 'Bambang Hartono', '081234567890', 'Jl. Pemuda No. 45, Jakarta', 'aktif', '2025-07-10 10:00:00+00', '2025-07-10 10:00:00+00'),
('std-2', '20261002', 'Siti Nurhaliza', 'Perempuan', 'XII', 'IPA', '2025/2026', 'Ahmad Zakaria', '081398765432', 'Perum Gading Indah Blok C/12, Jakarta', 'aktif', '2025-07-10 10:15:00+00', '2025-07-10 10:15:00+00'),
('std-3', '20261003', 'Arya Wiguna', 'Laki-laki', 'XI', 'IPS', '2025/2026', 'Herman Wiguna', '085712345678', 'Jl. Melati No. 89, Bogor', 'aktif', '2025-07-11 11:00:00+00', '2025-07-11 11:00:00+00'),
('std-4', '20261004', 'Keysha Amalia', 'Perempuan', 'XI', 'IPS', '2025/2026', 'Rudi Amalia', '082188887777', 'Jl. Merdeka Gg. 5 No. 2, Tangerang', 'aktif', '2025-07-12 09:30:00+00', '2025-07-12 09:30:00+00'),
('std-5', '20261005', 'Rian Hidayat', 'Laki-laki', 'X', 'Umum', '2025/2026', 'Syarif Hidayat', '081922334455', 'Komp. Keuangan Blok A/3, Bekasi', 'aktif', '2025-07-15 14:20:00+00', '2025-07-15 14:20:00+00')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed data untuk tabel PAYMENT_TYPES
INSERT INTO public.payment_types (id, nama_pembayaran, nominal, deskripsi, status, created_at, updated_at) VALUES
('pay-type-spp', 'SPP Bulanan', 250000.00, 'Sumbangan Pembinaan Pendidikan Bulanan Siswa', 'aktif', '2025-07-01 08:00:00+00', '2025-07-01 08:00:00+00'),
('pay-type-gedung', 'Uang Gedung', 1500000.00, 'Uang Pembangunan Sarana dan Prasarana (Satu Kali)', 'aktif', '2025-07-01 08:00:00+00', '2025-07-01 08:00:00+00'),
('pay-type-ujian', 'Uang Ujian Semester', 150000.00, 'Uang Pelaksanaan Ujian Mid/Final Semester', 'aktif', '2025-07-01 08:00:00+00', '2025-07-01 08:00:00+00'),
('pay-type-seragam', 'Seragam Sekolah', 600000.00, 'Uang Pembelian Paket Seragam Lengkap', 'aktif', '2025-07-01 08:00:00+00', '2025-07-01 08:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed data untuk tabel PAYMENTS
INSERT INTO public.payments (id, student_id, payment_type_id, bulan, tahun, nominal_tagihan, nominal_bayar, sisa_tagihan, tanggal_bayar, metode_pembayaran, status, catatan, created_by, created_at, updated_at) VALUES
('pm-1', 'std-1', 'pay-type-spp', 'Januari', 2026, 250000.00, 250000.00, 0.00, '2026-01-05 10:00:00+00', 'Transfer Bank', 'Lunas', 'Lunas Bayar SPP Januari', 'usr-bendahara-2222', '2026-01-01 00:00:00+00', '2026-01-05 10:00:00+00'),
('pm-2', 'std-1', 'pay-type-spp', 'Februari', 2026, 250000.00, 150000.00, 100000.00, '2026-02-10 11:00:00+00', 'Tunai', 'Cicilan', 'Dicicil 150rb dulu', 'usr-bendahara-2222', '2026-02-01 00:00:00+00', '2026-02-10 11:00:00+00'),
('pm-3', 'std-1', 'pay-type-gedung', 'Tahunan', 2026, 1500000.00, 1500000.00, 0.00, '2026-01-15 09:30:00+00', 'Transfer Bank', 'Lunas', 'Uang gedung lunas dari transfer wali murid', 'usr-bendahara-2222', '2026-01-01 00:00:00+00', '2026-01-15 09:30:00+00'),
('pm-4', 'std-2', 'pay-type-spp', 'Januari', 2026, 250000.00, 250000.00, 0.00, '2026-01-08 09:15:00+00', 'E-Wallet', 'Lunas', 'Lunas via Gopay', 'usr-bendahara-2222', '2026-01-01 00:00:00+00', '2026-01-08 09:15:00+00'),
('pm-5', 'std-2', 'pay-type-spp', 'Februari', 2026, 250000.00, 0.00, 250000.00, NULL, NULL, 'Belum Lunas', NULL, 'usr-bendahara-2222', '2026-02-01 00:00:00+00', '2026-02-01 00:00:00+00'),
('pm-6', 'std-3', 'pay-type-spp', 'Januari', 2026, 250000.00, 0.00, 250000.00, NULL, NULL, 'Belum Lunas', NULL, 'usr-bendahara-2222', '2026-01-01 00:00:00+00', '2026-01-01 00:00:00+00'),
('pm-7', 'std-4', 'pay-type-spp', 'Januari', 2026, 250000.00, 250000.00, 0.00, '2026-01-12 14:30:00+00', 'Tunai', 'Lunas', NULL, 'usr-bendahara-2222', '2026-01-01 00:00:00+00', '2026-01-12 14:30:00+00')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed data untuk tabel PAYMENT_INSTALLMENTS
INSERT INTO public.payment_installments (id, payment_id, tanggal_bayar, nominal_bayar, metode_pembayaran, catatan, created_by, created_at) VALUES
('inst-1', 'pm-1', '2026-01-05 10:00:00+00', 250000.00, 'Transfer Bank', 'Pembayaran SPP Januari', 'usr-bendahara-2222', '2026-01-05 10:00:00+00'),
('inst-2', 'pm-2', '2026-02-10 11:00:00+00', 150000.00, 'Tunai', 'Cicilan 1', 'usr-bendahara-2222', '2026-02-10 11:00:00+00'),
('inst-3', 'pm-3', '2026-01-15 09:30:00+00', 1500000.00, 'Transfer Bank', 'Lunas Uang Gedung', 'usr-bendahara-2222', '2026-01-15 09:30:00+00'),
('inst-4', 'pm-4', '2026-01-08 09:15:00+00', 250000.00, 'E-Wallet', 'SPP Januari Lunas via Gopay', 'usr-bendahara-2222', '2026-01-08 09:15:00+00'),
('inst-5', 'pm-7', '2026-01-12 14:30:00+00', 250000.00, 'Tunai', 'SPP Januari Lunas tunai', 'usr-bendahara-2222', '2026-01-12 14:30:00+00')
ON CONFLICT (id) DO NOTHING;

-- 6. Seed data untuk tabel ACTIVITY_LOGS
INSERT INTO public.activity_logs (id, user_id, username, role, action, description, created_at) VALUES
('log-1', 'usr-admin-1111', 'admin', 'Admin', 'INIT_DB', 'Inisialisasi sistem database keuangan sekolah.', '2026-01-01 08:00:00+00'),
('log-2', 'usr-bendahara-2222', 'bendahara', 'Bendahara', 'LOGIN', 'Bendahara Ibu Siti login ke sistem.', '2026-06-29 10:00:00+00')
ON CONFLICT (id) DO NOTHING;
