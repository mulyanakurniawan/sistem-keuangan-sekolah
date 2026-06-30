import fs from 'fs';
import path from 'path';

// Define TS Types reflecting our PostgreSQL Schema (Tahap 1)

export interface User {
  id: string;
  username: string;
  password_hash: string;
  nama_lengkap: string;
  role: 'Admin' | 'Bendahara' | 'Kepala Sekolah';
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  nis: string;
  nama_lengkap: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  kelas: string;
  jurusan: string;
  tahun_ajaran: string;
  nama_wali: string;
  no_hp_wali: string;
  alamat: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
}

export interface PaymentType {
  id: string;
  nama_pembayaran: string;
  nominal: number;
  deskripsi: string;
  status: 'aktif' | 'nonaktif';
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  payment_type_id: string;
  bulan: string;
  tahun: number;
  nominal_tagihan: number;
  nominal_bayar: number;
  sisa_tagihan: number;
  tanggal_bayar?: string;
  metode_pembayaran?: 'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Lainnya';
  status: 'Lunas' | 'Cicilan' | 'Belum Lunas';
  catatan?: string;
  bukti_pembayaran_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstallment {
  id: string;
  payment_id: string;
  tanggal_bayar: string;
  nominal_bayar: number;
  metode_pembayaran: 'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Lainnya';
  bukti_pembayaran_url?: string;
  catatan?: string;
  created_by?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id?: string;
  username?: string;
  role?: string;
  action: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface DBStore {
  users: User[];
  students: Student[];
  payment_types: PaymentType[];
  payments: Payment[];
  installments: PaymentInstallment[];
  activity_logs: ActivityLog[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'supabase', 'db.json');

// Initial seed data for the Database
const INITIAL_DB: DBStore = {
  users: [
    {
      id: 'usr-admin-1111',
      username: 'admin',
      password_hash: 'admin', // Simple cleartext comparison for demo simplicity
      nama_lengkap: 'Pak Ahmad (Admin)',
      role: 'Admin',
      status: 'aktif',
      created_at: new Date('2026-01-01T08:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T08:00:00Z').toISOString()
    },
    {
      id: 'usr-bendahara-2222',
      username: 'bendahara',
      password_hash: 'bendahara',
      nama_lengkap: 'Ibu Siti (Bendahara)',
      role: 'Bendahara',
      status: 'aktif',
      created_at: new Date('2026-01-01T08:30:00Z').toISOString(),
      updated_at: new Date('2026-01-01T08:30:00Z').toISOString()
    },
    {
      id: 'usr-kepsek-3333',
      username: 'kepsek',
      password_hash: 'kepsek',
      nama_lengkap: 'Drs. H. Mulyadi, M.Pd',
      role: 'Kepala Sekolah',
      status: 'aktif',
      created_at: new Date('2026-01-01T09:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T09:00:00Z').toISOString()
    }
  ],
  students: [
    {
      id: 'std-1',
      nis: '20261001',
      nama_lengkap: 'Muhammad Fadhil',
      jenis_kelamin: 'Laki-laki',
      kelas: 'XII',
      jurusan: 'IPA',
      tahun_ajaran: '2025/2026',
      nama_wali: 'Bambang Hartono',
      no_hp_wali: '081234567890',
      alamat: 'Jl. Pemuda No. 45, Jakarta',
      status: 'aktif',
      created_at: new Date('2025-07-10T10:00:00Z').toISOString(),
      updated_at: new Date('2025-07-10T10:00:00Z').toISOString()
    },
    {
      id: 'std-2',
      nis: '20261002',
      nama_lengkap: 'Siti Nurhaliza',
      jenis_kelamin: 'Perempuan',
      kelas: 'XII',
      jurusan: 'IPA',
      tahun_ajaran: '2025/2026',
      nama_wali: 'Ahmad Zakaria',
      no_hp_wali: '081398765432',
      alamat: 'Perum Gading Indah Blok C/12, Jakarta',
      status: 'aktif',
      created_at: new Date('2025-07-10T10:15:00Z').toISOString(),
      updated_at: new Date('2025-07-10T10:15:00Z').toISOString()
    },
    {
      id: 'std-3',
      nis: '20261003',
      nama_lengkap: 'Arya Wiguna',
      jenis_kelamin: 'Laki-laki',
      kelas: 'XI',
      jurusan: 'IPS',
      tahun_ajaran: '2025/2026',
      nama_wali: 'Herman Wiguna',
      no_hp_wali: '085712345678',
      alamat: 'Jl. Melati No. 89, Bogor',
      status: 'aktif',
      created_at: new Date('2025-07-11T11:00:00Z').toISOString(),
      updated_at: new Date('2025-07-11T11:00:00Z').toISOString()
    },
    {
      id: 'std-4',
      nis: '20261004',
      nama_lengkap: 'Keysha Amalia',
      jenis_kelamin: 'Perempuan',
      kelas: 'XI',
      jurusan: 'IPS',
      tahun_ajaran: '2025/2026',
      nama_wali: 'Rudi Amalia',
      no_hp_wali: '082188887777',
      alamat: 'Jl. Merdeka Gg. 5 No. 2, Tangerang',
      status: 'aktif',
      created_at: new Date('2025-07-12T09:30:00Z').toISOString(),
      updated_at: new Date('2025-07-12T09:30:00Z').toISOString()
    },
    {
      id: 'std-5',
      nis: '20261005',
      nama_lengkap: 'Rian Hidayat',
      jenis_kelamin: 'Laki-laki',
      kelas: 'X',
      jurusan: 'Umum',
      tahun_ajaran: '2025/2026',
      nama_wali: 'Syarif Hidayat',
      no_hp_wali: '081922334455',
      alamat: 'Komp. Keuangan Blok A/3, Bekasi',
      status: 'aktif',
      created_at: new Date('2025-07-15T14:20:00Z').toISOString(),
      updated_at: new Date('2025-07-15T14:20:00Z').toISOString()
    }
  ],
  payment_types: [
    {
      id: 'pay-type-spp',
      nama_pembayaran: 'SPP Bulanan',
      nominal: 250000,
      deskripsi: 'Sumbangan Pembinaan Pendidikan Bulanan Siswa',
      status: 'aktif',
      created_at: new Date('2025-07-01T08:00:00Z').toISOString(),
      updated_at: new Date('2025-07-01T08:00:00Z').toISOString()
    },
    {
      id: 'pay-type-gedung',
      nama_pembayaran: 'Uang Gedung',
      nominal: 1500000,
      deskripsi: 'Uang Pembangunan Sarana dan Prasarana (Satu Kali)',
      status: 'aktif',
      created_at: new Date('2025-07-01T08:00:00Z').toISOString(),
      updated_at: new Date('2025-07-01T08:00:00Z').toISOString()
    },
    {
      id: 'pay-type-ujian',
      nama_pembayaran: 'Uang Ujian Semester',
      nominal: 150000,
      deskripsi: 'Uang Pelaksanaan Ujian Mid/Final Semester',
      status: 'aktif',
      created_at: new Date('2025-07-01T08:00:00Z').toISOString(),
      updated_at: new Date('2025-07-01T08:00:00Z').toISOString()
    },
    {
      id: 'pay-type-seragam',
      nama_pembayaran: 'Seragam Sekolah',
      nominal: 600000,
      deskripsi: 'Uang Pembelian Paket Seragam Lengkap',
      status: 'aktif',
      created_at: new Date('2025-07-01T08:00:00Z').toISOString(),
      updated_at: new Date('2025-07-01T08:00:00Z').toISOString()
    }
  ],
  payments: [
    // Muhammad Fadhil Payments
    {
      id: 'pm-1',
      student_id: 'std-1',
      payment_type_id: 'pay-type-spp',
      bulan: 'Januari',
      tahun: 2026,
      nominal_tagihan: 250000,
      nominal_bayar: 250000,
      sisa_tagihan: 0,
      tanggal_bayar: new Date('2026-01-05T10:00:00Z').toISOString(),
      metode_pembayaran: 'Transfer Bank',
      status: 'Lunas',
      catatan: 'Lunas Bayar SPP Januari',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-05T10:00:00Z').toISOString()
    },
    {
      id: 'pm-2',
      student_id: 'std-1',
      payment_type_id: 'pay-type-spp',
      bulan: 'Februari',
      tahun: 2026,
      nominal_tagihan: 250000,
      nominal_bayar: 150000,
      sisa_tagihan: 100000,
      tanggal_bayar: new Date('2026-02-10T11:00:00Z').toISOString(),
      metode_pembayaran: 'Tunai',
      status: 'Cicilan',
      catatan: 'Dicicil 150rb dulu',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-02-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-02-10T11:00:00Z').toISOString()
    },
    {
      id: 'pm-3',
      student_id: 'std-1',
      payment_type_id: 'pay-type-gedung',
      bulan: 'Tahunan',
      tahun: 2026,
      nominal_tagihan: 1500000,
      nominal_bayar: 1500000,
      sisa_tagihan: 0,
      tanggal_bayar: new Date('2026-01-15T09:30:00Z').toISOString(),
      metode_pembayaran: 'Transfer Bank',
      status: 'Lunas',
      catatan: 'Uang gedung lunas dari transfer wali murid',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-15T09:30:00Z').toISOString()
    },
    // Siti Nurhaliza Payments
    {
      id: 'pm-4',
      student_id: 'std-2',
      payment_type_id: 'pay-type-spp',
      bulan: 'Januari',
      tahun: 2026,
      nominal_tagihan: 250000,
      nominal_bayar: 250000,
      sisa_tagihan: 0,
      tanggal_bayar: new Date('2026-01-08T09:15:00Z').toISOString(),
      metode_pembayaran: 'E-Wallet',
      status: 'Lunas',
      catatan: 'Lunas via Gopay',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-08T09:15:00Z').toISOString()
    },
    {
      id: 'pm-5',
      student_id: 'std-2',
      payment_type_id: 'pay-type-spp',
      bulan: 'Februari',
      tahun: 2026,
      nominal_tagihan: 250000,
      nominal_bayar: 0,
      sisa_tagihan: 250000,
      status: 'Belum Lunas',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-02-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-02-01T00:00:00Z').toISOString()
    },
    // Arya Wiguna Payments
    {
      id: 'pm-6',
      student_id: 'std-3',
      payment_type_id: 'pay-type-spp',
      bulan: 'Januari',
      tahun: 2026,
      nominal_tagihan: 250000,
      nominal_bayar: 0,
      sisa_tagihan: 250000,
      status: 'Belum Lunas',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-01T00:00:00Z').toISOString()
    },
    {
      id: 'pm-7',
      student_id: 'std-4',
      payment_type_id: 'pay-type-spp',
      bulan: 'Januari',
      tahun: 2026,
      nominal_tagihan: 250000,
      nominal_bayar: 250000,
      sisa_tagihan: 0,
      tanggal_bayar: new Date('2026-01-12T14:30:00Z').toISOString(),
      metode_pembayaran: 'Tunai',
      status: 'Lunas',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
      updated_at: new Date('2026-01-12T14:30:00Z').toISOString()
    }
  ],
  installments: [
    {
      id: 'inst-1',
      payment_id: 'pm-1',
      tanggal_bayar: new Date('2026-01-05T10:00:00Z').toISOString(),
      nominal_bayar: 250000,
      metode_pembayaran: 'Transfer Bank',
      catatan: 'Pembayaran SPP Januari',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-05T10:00:00Z').toISOString()
    },
    {
      id: 'inst-2',
      payment_id: 'pm-2',
      tanggal_bayar: new Date('2026-02-10T11:00:00Z').toISOString(),
      nominal_bayar: 150000,
      metode_pembayaran: 'Tunai',
      catatan: 'Cicilan 1',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-02-10T11:00:00Z').toISOString()
    },
    {
      id: 'inst-3',
      payment_id: 'pm-3',
      tanggal_bayar: new Date('2026-01-15T09:30:00Z').toISOString(),
      nominal_bayar: 1500000,
      metode_pembayaran: 'Transfer Bank',
      catatan: 'Lunas Uang Gedung',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-15T09:30:00Z').toISOString()
    },
    {
      id: 'inst-4',
      payment_id: 'pm-4',
      tanggal_bayar: new Date('2026-01-08T09:15:00Z').toISOString(),
      nominal_bayar: 250000,
      metode_pembayaran: 'E-Wallet',
      catatan: 'SPP Januari Lunas via Gopay',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-08T09:15:00Z').toISOString()
    },
    {
      id: 'inst-5',
      payment_id: 'pm-7',
      tanggal_bayar: new Date('2026-01-12T14:30:00Z').toISOString(),
      nominal_bayar: 250000,
      metode_pembayaran: 'Tunai',
      catatan: 'SPP Januari Lunas tunai',
      created_by: 'usr-bendahara-2222',
      created_at: new Date('2026-01-12T14:30:00Z').toISOString()
    }
  ],
  activity_logs: [
    {
      id: 'log-1',
      user_id: 'usr-admin-1111',
      username: 'admin',
      role: 'Admin',
      action: 'INIT_DB',
      description: 'Inisialisasi sistem database keuangan sekolah.',
      created_at: new Date('2026-01-01T08:00:00Z').toISOString()
    },
    {
      id: 'log-2',
      user_id: 'usr-bendahara-2222',
      username: 'bendahara',
      role: 'Bendahara',
      action: 'LOGIN',
      description: 'Bendahara Ibu Siti login ke sistem.',
      created_at: new Date('2026-06-29T10:00:00Z').toISOString()
    }
  ]
};

// Ensure directory exists
const dir = path.dirname(DB_FILE_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Global variable for live in-memory store
let dbStore: DBStore;

export function loadDB(): DBStore {
  if (dbStore) return dbStore;

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      dbStore = JSON.parse(data);
      
      // Basic schema validations (ensure fields exist)
      if (!dbStore.users) dbStore.users = [];
      if (!dbStore.students) dbStore.students = [];
      if (!dbStore.payment_types) dbStore.payment_types = [];
      if (!dbStore.payments) dbStore.payments = [];
      if (!dbStore.installments) dbStore.installments = [];
      if (!dbStore.activity_logs) dbStore.activity_logs = [];
    } catch (e) {
      console.error('Error loading database file, re-initializing seed data', e);
      dbStore = JSON.parse(JSON.stringify(INITIAL_DB));
      saveDB();
    }
  } else {
    dbStore = JSON.parse(JSON.stringify(INITIAL_DB));
    saveDB();
  }

  return dbStore;
}

export function saveDB(): void {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbStore, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database file', e);
  }
}

// Generate unique ID helper
export function uuid(): string {
  return Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
}

// Audit logger helper
export function logActivity(
  userId: string | undefined,
  username: string | undefined,
  role: string | undefined,
  action: string,
  description: string,
  req?: any
): void {
  const store = loadDB();
  const newLog: ActivityLog = {
    id: 'log-' + uuid(),
    user_id: userId,
    username: username,
    role: role,
    action,
    description,
    ip_address: req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : '127.0.0.1',
    user_agent: req ? req.headers['user-agent'] : 'System',
    created_at: new Date().toISOString()
  };
  store.activity_logs.unshift(newLog); // Put latest logs first
  saveDB();
}
