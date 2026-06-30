export interface User {
  id: string;
  username: string;
  nama_lengkap: string;
  role: 'Admin' | 'Bendahara' | 'Kepala Sekolah';
  status: 'aktif' | 'nonaktif';
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
  student?: {
    nis: string;
    nama_lengkap: string;
    kelas: string;
    jurusan: string;
  } | null;
  paymentType?: {
    nama_pembayaran: string;
  } | null;
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

export interface DashboardStats {
  totalSiswaAktif: number;
  totalTunggakanAktif: number;
  totalPemasukanHariIni: number;
  totalPemasukanBulanIni: number;
  totalPemasukanTahunIni: number;
  currentMonth: string;
  currentYear: number;
}
