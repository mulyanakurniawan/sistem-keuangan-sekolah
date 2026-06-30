-- ==========================================
-- TAHAP 1: RANCANG DATABASE SCHEMA LENGKAP
-- SISTEM MANAJEMEN KEUANGAN SEKOLAH
-- DBMS: Supabase PostgreSQL (Free Tier Optimized)
-- Catatan: Menggunakan TEXT untuk ID agar kompatibel
--          dengan format ID aplikasi (std-xxx, pm-xxx, dst.)
-- ==========================================

-- ==========================================
-- RESET: Hapus tabel lama sebelum membuat ulang
-- (pastikan tipe kolom id diperbarui ke TEXT)
-- ==========================================
drop table if exists public.activity_logs cascade;
drop table if exists public.payment_installments cascade;
drop table if exists public.payments cascade;
drop table if exists public.payment_types cascade;
drop table if exists public.students cascade;
drop table if exists public.users cascade;

-- Enable UUID Extension (untuk fungsi lain jika dibutuhkan)
create extension if not exists "uuid-ossp";

-- 1. TABEL USERS (Autentikasi & Role-based Access Control)
create table if not exists public.users (
    id text primary key,
    username varchar(50) unique not null,
    password_hash varchar(255) not null,
    nama_lengkap varchar(100) not null,
    role varchar(20) not null check (role in ('Admin', 'Bendahara', 'Kepala Sekolah')),
    status varchar(20) default 'aktif' check (status in ('aktif', 'nonaktif')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABEL STUDENTS (Siswa & Data Wali)
create table if not exists public.students (
    id text primary key,
    nis varchar(20) unique not null,
    nama_lengkap varchar(100) not null,
    jenis_kelamin varchar(15) not null check (jenis_kelamin in ('Laki-laki', 'Perempuan')),
    kelas varchar(20) not null,                 -- Contoh: 'X', 'XI', 'XII'
    jurusan varchar(50) not null,               -- Contoh: 'IPA', 'IPS', 'Umum'
    tahun_ajaran varchar(9) not null,           -- Contoh: '2025/2026'
    nama_wali varchar(100) not null,
    no_hp_wali varchar(20) not null,
    alamat text not null,
    status varchar(20) default 'aktif' check (status in ('aktif', 'nonaktif')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABEL PAYMENT_TYPES (Master Jenis Pembayaran & Tarif)
create table if not exists public.payment_types (
    id text primary key,
    nama_pembayaran varchar(100) not null,      -- Contoh: 'SPP', 'Uang Gedung', 'Uang Ujian'
    nominal decimal(12,2) not null check (nominal >= 0),
    deskripsi text,
    status varchar(20) default 'aktif' check (status in ('aktif', 'nonaktif')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABEL PAYMENTS (Billing Header - Tagihan Utama per Siswa)
create table if not exists public.payments (
    id text primary key,
    student_id text not null references public.students(id) on delete cascade,
    payment_type_id text not null references public.payment_types(id) on delete cascade,
    bulan varchar(20) not null,                 -- Contoh: 'Januari', 'Februari', dst.
    tahun integer not null check (tahun > 2000),
    nominal_tagihan decimal(12,2) not null check (nominal_tagihan >= 0),
    nominal_bayar decimal(12,2) default 0.00 check (nominal_bayar >= 0),
    sisa_tagihan decimal(12,2) not null check (sisa_tagihan >= 0),
    tanggal_bayar timestamp with time zone,
    metode_pembayaran varchar(50) check (metode_pembayaran in ('Tunai', 'Transfer Bank', 'E-Wallet', 'Lainnya')),
    status varchar(20) default 'Belum Lunas' check (status in ('Lunas', 'Cicilan', 'Belum Lunas')),
    catatan text,
    bukti_pembayaran_url text,                  -- Untuk upload bukti transfer siswa
    created_by text references public.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

    -- Constraint: Siswa tidak boleh punya tagihan ganda untuk jenis pembayaran, bulan, dan tahun yang sama
    constraint unique_student_payment_period unique (student_id, payment_type_id, bulan, tahun)
);

-- 5. TABEL PAYMENT_INSTALLMENTS (Histori Cicilan Pembayaran Detail)
create table if not exists public.payment_installments (
    id text primary key,
    payment_id text not null references public.payments(id) on delete cascade,
    tanggal_bayar timestamp with time zone default timezone('utc'::text, now()) not null,
    nominal_bayar decimal(12,2) not null check (nominal_bayar > 0),
    metode_pembayaran varchar(50) not null check (metode_pembayaran in ('Tunai', 'Transfer Bank', 'E-Wallet', 'Lainnya')),
    bukti_pembayaran_url text,
    catatan text,
    created_by text references public.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. TABEL ACTIVITY_LOGS (Audit Trail Aktivitas Sistem)
create table if not exists public.activity_logs (
    id text primary key,
    user_id text references public.users(id) on delete set null,
    username varchar(100),                      -- Backup username jika data user terhapus
    role varchar(50),                           -- Backup role jika data user terhapus
    action varchar(100) not null,               -- Contoh: 'LOGIN', 'CREATE_STUDENT', 'PAYMENT_INSTALLMENT'
    description text not null,
    ip_address varchar(45),
    user_agent text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- INDEXING UNTUK OPTIMALISASI KINERJA (SUPABASE FREE TIER)
-- ==========================================
create index if not exists idx_students_nis on public.students(nis);
create index if not exists idx_students_nama_lengkap on public.students(nama_lengkap);
create index if not exists idx_students_kelas_jurusan on public.students(kelas, jurusan);
create index if not exists idx_payments_student_id on public.payments(student_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_period on public.payments(tahun, bulan);
create index if not exists idx_installments_payment_id on public.payment_installments(payment_id);
create index if not exists idx_logs_created_at on public.activity_logs(created_at);

-- ==========================================
-- AUTOMATIC TIMESTAMPS TRIGGER (UPDATED_AT)
-- ==========================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_users_updated_at on public.users;
create trigger trigger_update_users_updated_at
    before update on public.users
    for each row execute function public.update_updated_at_column();

drop trigger if exists trigger_update_students_updated_at on public.students;
create trigger trigger_update_students_updated_at
    before update on public.students
    for each row execute function public.update_updated_at_column();

drop trigger if exists trigger_update_payment_types_updated_at on public.payment_types;
create trigger trigger_update_payment_types_updated_at
    before update on public.payment_types
    for each row execute function public.update_updated_at_column();

drop trigger if exists trigger_update_payments_updated_at on public.payments;
create trigger trigger_update_payments_updated_at
    before update on public.payments
    for each row execute function public.update_updated_at_column();
