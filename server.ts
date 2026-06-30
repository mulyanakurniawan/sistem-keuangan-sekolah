import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  User,
  Student,
  PaymentType,
  Payment,
  PaymentInstallment
} from './supabase/db_manager';

dotenv.config();

// ==========================================
// SUPABASE CLIENT INITIALIZATION
// ==========================================
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[ERROR] SUPABASE_URL dan SUPABASE_ANON_KEY harus didefinisikan di file .env!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// HELPER: UUID & ACTIVITY LOG
// ==========================================
function uuid(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function logActivity(
  userId: string | undefined,
  username: string | undefined,
  role: string | undefined,
  action: string,
  description: string,
  req?: express.Request
) {
  try {
    await supabase.from('activity_logs').insert({
      id: 'log-' + uuid(),
      user_id: userId || null,
      username: username || null,
      role: role || null,
      action,
      description,
      ip_address: req ? (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || null) : null,
      user_agent: req ? (req.headers['user-agent'] || null) : null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Activity Log Error]', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper: get authenticated user from X-User-ID header
  async function getAuthenticatedUser(req: express.Request): Promise<User | null> {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return null;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('status', 'aktif')
      .single();
    if (error || !data) return null;
    return data as User;
  }

  // ==========================================
  // AUTHENTICATION ENDPOINTS
  // ==========================================
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', username)
      .eq('password_hash', password)
      .single();

    if (error || !data) {
      return res.status(401).json({ message: 'Username atau password salah!' });
    }

    const user = data as User;

    if (user.status !== 'aktif') {
      return res.status(403).json({ message: 'Akun Anda dinonaktifkan!' });
    }

    await logActivity(user.id, user.username, user.role, 'LOGIN', `User ${user.nama_lengkap} berhasil login.`, req);

    res.json({
      id: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      status: user.status
    });
  });

  // ==========================================
  // DATA SISWA (CRUD)
  // ==========================================
  app.get('/api/students', async (req, res) => {
    const { search, kelas, jurusan, status, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    let query = supabase.from('students').select('*', { count: 'exact' });

    if (search) {
      const q = (search as string);
      query = query.or(`nama_lengkap.ilike.%${q}%,nis.ilike.%${q}%,nama_wali.ilike.%${q}%`);
    }
    if (kelas) query = query.eq('kelas', kelas);
    if (jurusan) query = query.eq('jurusan', jurusan);
    if (status) query = query.eq('status', status);

    query = query
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * limitNum, pageNum * limitNum - 1);

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ message: error.message });

    res.json({
      data: data || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil((count || 0) / limitNum)
    });
  });

  app.post('/api/students', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) {
      return res.status(403).json({ message: 'Akses ditolak! Hanya Admin/Bendahara yang diijinkan.' });
    }

    const { nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status } = req.body;

    // Check duplicate NIS
    const { data: existing } = await supabase.from('students').select('id').eq('nis', nis).single();
    if (existing) {
      return res.status(400).json({ message: `Siswa dengan NIS ${nis} sudah terdaftar!` });
    }

    const newStudent = {
      id: 'std-' + uuid(),
      nis,
      nama_lengkap,
      jenis_kelamin,
      kelas,
      jurusan,
      tahun_ajaran,
      nama_wali,
      no_hp_wali,
      alamat,
      status: status || 'aktif',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('students').insert(newStudent).select().single();
    if (error) return res.status(500).json({ message: error.message });

    await logActivity(user.id, user.username, user.role, 'CREATE_STUDENT', `Menambahkan siswa baru: ${nama_lengkap} (NIS: ${nis})`, req);

    res.status(201).json(data);
  });

  app.put('/api/students/:id', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) {
      return res.status(403).json({ message: 'Akses ditolak!' });
    }

    const { id } = req.params;
    const { nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status } = req.body;

    // Check duplicate NIS (other than self)
    const { data: dupCheck } = await supabase.from('students').select('id').eq('nis', nis).neq('id', id).single();
    if (dupCheck) {
      return res.status(400).json({ message: `Siswa dengan NIS ${nis} sudah digunakan oleh siswa lain!` });
    }

    const { data, error } = await supabase
      .from('students')
      .update({ nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: 'Siswa tidak ditemukan!' });

    await logActivity(user.id, user.username, user.role, 'UPDATE_STUDENT', `Mengubah data siswa: ${nama_lengkap} (NIS: ${nis})`, req);

    res.json(data);
  });

  app.delete('/api/students/:id', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ message: 'Akses ditolak! Hanya Admin yang boleh menghapus data siswa.' });
    }

    const { id } = req.params;

    const { data: student } = await supabase.from('students').select('nama_lengkap, nis').eq('id', id).single();

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) return res.status(500).json({ message: error.message });

    await logActivity(user.id, user.username, user.role, 'DELETE_STUDENT', `Menghapus siswa: ${student?.nama_lengkap} (NIS: ${student?.nis}) beserta seluruh data tagihan/pembayarannya.`, req);

    res.json({ message: 'Siswa berhasil dihapus!' });
  });

  // IMPORT DATA SISWA (BULK)
  app.post('/api/students/import', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) {
      return res.status(403).json({ message: 'Akses ditolak!' });
    }

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Format data import tidak valid atau kosong!' });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const s of students) {
      if (!s.nis || !s.nama_lengkap) { skippedCount++; continue; }
      const { data: existing } = await supabase.from('students').select('id').eq('nis', s.nis).single();
      if (existing) { skippedCount++; continue; }

      const { error } = await supabase.from('students').insert({
        id: 'std-' + uuid(),
        nis: s.nis.toString(),
        nama_lengkap: s.nama_lengkap,
        jenis_kelamin: s.jenis_kelamin || 'Laki-laki',
        kelas: s.kelas || 'X',
        jurusan: s.jurusan || 'Umum',
        tahun_ajaran: s.tahun_ajaran || '2025/2026',
        nama_wali: s.nama_wali || '-',
        no_hp_wali: s.no_hp_wali || '-',
        alamat: s.alamat || '-',
        status: 'aktif',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (!error) importedCount++;
      else skippedCount++;
    }

    if (importedCount > 0) {
      await logActivity(user.id, user.username, user.role, 'IMPORT_STUDENTS', `Mengimport ${importedCount} data siswa baru. (Dilewati: ${skippedCount})`, req);
    }

    res.json({ message: 'Import selesai!', importedCount, skippedCount });
  });

  // ==========================================
  // MASTER JENIS PEMBAYARAN (CRUD)
  // ==========================================
  app.get('/api/payment-types', async (req, res) => {
    const { data, error } = await supabase.from('payment_types').select('*').order('created_at');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  });

  app.post('/api/payment-types', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ message: 'Akses ditolak! Hanya Admin yang boleh mengatur Jenis Pembayaran.' });
    }

    const { nama_pembayaran, nominal, deskripsi } = req.body;
    const newPaymentType = {
      id: 'pay-type-' + uuid(),
      nama_pembayaran,
      nominal: parseFloat(nominal) || 0,
      deskripsi: deskripsi || '',
      status: 'aktif',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('payment_types').insert(newPaymentType).select().single();
    if (error) return res.status(500).json({ message: error.message });

    await logActivity(user.id, user.username, user.role, 'CREATE_PAYMENT_TYPE', `Membuat jenis pembayaran baru: ${nama_pembayaran} (Tarif: Rp ${parseFloat(nominal).toLocaleString('id-ID')})`, req);

    res.status(201).json(data);
  });

  app.put('/api/payment-types/:id', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ message: 'Akses ditolak!' });
    }

    const { id } = req.params;
    const { nama_pembayaran, nominal, deskripsi, status } = req.body;

    const { data, error } = await supabase
      .from('payment_types')
      .update({ nama_pembayaran, nominal: parseFloat(nominal) || 0, deskripsi, status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: 'Jenis pembayaran tidak ditemukan!' });

    await logActivity(user.id, user.username, user.role, 'UPDATE_PAYMENT_TYPE', `Mengubah jenis pembayaran: ${nama_pembayaran} (Tarif Baru: Rp ${parseFloat(nominal).toLocaleString('id-ID')})`, req);

    res.json(data);
  });

  app.delete('/api/payment-types/:id', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ message: 'Akses ditolak!' });
    }

    const { id } = req.params;

    const { data: pt } = await supabase.from('payment_types').select('nama_pembayaran').eq('id', id).single();

    const { error } = await supabase.from('payment_types').delete().eq('id', id);
    if (error) return res.status(500).json({ message: error.message });

    await logActivity(user.id, user.username, user.role, 'DELETE_PAYMENT_TYPE', `Menghapus jenis pembayaran: ${pt?.nama_pembayaran} beserta tagihan dan cicilan terkait.`, req);

    res.json({ message: 'Jenis pembayaran berhasil dihapus!' });
  });

  // ==========================================
  // TRANSAKSI PEMBAYARAN & BILLING
  // ==========================================
  app.get('/api/payments', async (req, res) => {
    const { status, student_id, payment_type_id, bulan, tahun, search } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        student:students(nis, nama_lengkap, kelas, jurusan, nama_wali, no_hp_wali),
        paymentType:payment_types(nama_pembayaran)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (student_id) query = query.eq('student_id', student_id);
    if (payment_type_id) query = query.eq('payment_type_id', payment_type_id);
    if (bulan) query = query.eq('bulan', bulan);
    if (tahun) query = query.eq('tahun', parseInt(tahun as string, 10));

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    let list = data || [];

    if (search) {
      const q = (search as string).toLowerCase();
      list = list.filter((p: any) =>
        p.student && (
          p.student.nama_lengkap.toLowerCase().includes(q) ||
          p.student.nis.includes(q)
        )
      );
    }

    res.json(list);
  });

  // GENERATE BILLING UNTUK SEMUA SISWA AKTIF
  app.post('/api/payments/generate', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) {
      return res.status(403).json({ message: 'Akses ditolak!' });
    }

    const { payment_type_id, bulan, tahun } = req.body;

    const { data: payType } = await supabase.from('payment_types').select('*').eq('id', payment_type_id).single();
    if (!payType) return res.status(404).json({ message: 'Jenis Pembayaran master tidak ditemukan!' });

    const { data: activeStudents } = await supabase.from('students').select('id').eq('status', 'aktif');
    if (!activeStudents || activeStudents.length === 0) {
      return res.json({ message: 'Tidak ada siswa aktif!', generatedCount: 0, skippedCount: 0 });
    }

    let generatedCount = 0;
    let skippedCount = 0;

    for (const student of activeStudents) {
      const { data: exists } = await supabase
        .from('payments')
        .select('id')
        .eq('student_id', student.id)
        .eq('payment_type_id', payment_type_id)
        .eq('bulan', bulan)
        .eq('tahun', parseInt(tahun, 10))
        .single();

      if (exists) { skippedCount++; continue; }

      const { error } = await supabase.from('payments').insert({
        id: 'pm-' + uuid(),
        student_id: student.id,
        payment_type_id,
        bulan,
        tahun: parseInt(tahun, 10),
        nominal_tagihan: payType.nominal,
        nominal_bayar: 0,
        sisa_tagihan: payType.nominal,
        status: 'Belum Lunas',
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (!error) generatedCount++;
      else skippedCount++;
    }

    if (generatedCount > 0) {
      await logActivity(user.id, user.username, user.role, 'GENERATE_BILLING', `Men-generate tagihan: ${payType.nama_pembayaran} Periode: ${bulan} ${tahun} untuk ${generatedCount} siswa aktif. (Dilewati: ${skippedCount})`, req);
    }

    res.json({ message: 'Proses generate selesai!', generatedCount, skippedCount });
  });

  // INPUT PEMBAYARAN / CICILAN SISWA
  app.post('/api/payments/:id/pay', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) {
      return res.status(403).json({ message: 'Akses ditolak! Hanya Bendahara dan Admin yang boleh menginput transaksi.' });
    }

    const { id } = req.params;
    const { nominal_bayar, metode_pembayaran, catatan, bukti_pembayaran_url } = req.body;

    const payAmount = parseFloat(nominal_bayar);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ message: 'Nominal pembayaran tidak valid! Harus lebih besar dari 0.' });
    }

    const { data: payment } = await supabase.from('payments').select('*').eq('id', id).single();
    if (!payment) return res.status(404).json({ message: 'Tagihan pembayaran tidak ditemukan!' });

    if (payment.status === 'Lunas') {
      return res.status(400).json({ message: 'Transaksi ini sudah lunas sebelumnya!' });
    }

    if (payAmount > payment.sisa_tagihan) {
      return res.status(400).json({
        message: `Nominal bayar (Rp ${payAmount.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${payment.sisa_tagihan.toLocaleString('id-ID')})!`
      });
    }

    const nominalBayarBaru = payment.nominal_bayar + payAmount;
    const sisaTagihanBaru = payment.nominal_tagihan - nominalBayarBaru;

    let statusBaru: 'Lunas' | 'Cicilan' | 'Belum Lunas' = 'Belum Lunas';
    if (sisaTagihanBaru <= 0) statusBaru = 'Lunas';
    else if (nominalBayarBaru > 0) statusBaru = 'Cicilan';

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        nominal_bayar: nominalBayarBaru,
        sisa_tagihan: sisaTagihanBaru,
        status: statusBaru,
        tanggal_bayar: new Date().toISOString(),
        metode_pembayaran: metode_pembayaran || 'Tunai',
        bukti_pembayaran_url: bukti_pembayaran_url || payment.bukti_pembayaran_url,
        catatan: catatan || payment.catatan,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) return res.status(500).json({ message: updateError.message });

    const installmentData = {
      id: 'inst-' + uuid(),
      payment_id: id,
      tanggal_bayar: new Date().toISOString(),
      nominal_bayar: payAmount,
      metode_pembayaran: metode_pembayaran || 'Tunai',
      bukti_pembayaran_url: bukti_pembayaran_url || '',
      catatan: catatan || '',
      created_by: user.id,
      created_at: new Date().toISOString()
    };

    const { data: installment, error: instError } = await supabase.from('payment_installments').insert(installmentData).select().single();
    if (instError) return res.status(500).json({ message: instError.message });

    // Get student & payment type for log
    const { data: student } = await supabase.from('students').select('nama_lengkap').eq('id', payment.student_id).single();
    const { data: payType } = await supabase.from('payment_types').select('nama_pembayaran').eq('id', payment.payment_type_id).single();

    await logActivity(
      user.id, user.username, user.role,
      'PAYMENT_INSTALLMENT',
      `Menerima pembayaran Rp ${payAmount.toLocaleString('id-ID')} untuk ${payType?.nama_pembayaran} (${payment.bulan} ${payment.tahun}) siswa ${student?.nama_lengkap}. Status: ${statusBaru}, Sisa: Rp ${sisaTagihanBaru.toLocaleString('id-ID')}`,
      req
    );

    res.json({ message: 'Pembayaran berhasil dimasukkan!', payment: updatedPayment, installment });
  });

  // GET INSTALLMENTS FOR A PAYMENT
  app.get('/api/payments/:id/installments', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('payment_installments')
      .select('*')
      .eq('payment_id', id)
      .order('created_at');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  });

  // UPLOAD BUKTI PEMBAYARAN
  app.post('/api/payments/:id/upload-bukti', async (req, res) => {
    const { id } = req.params;
    const { bukti_pembayaran_url } = req.body;

    const { data, error } = await supabase
      .from('payments')
      .update({ bukti_pembayaran_url, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: 'Tagihan tidak ditemukan!' });

    res.json({ message: 'Bukti transfer berhasil diupload/disimpan!', payment: data });
  });

  // ==========================================
  // DASHBOARD STATISTICS
  // ==========================================
  app.get('/api/dashboard/stats', async (req, res) => {
    const nowStr = new Date().toISOString().substring(0, 10);
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const indonesianMonths = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const currMonthName = indonesianMonths[thisMonth];

    const startOfMonth = `${thisYear}-${String(thisMonth + 1).padStart(2, '0')}-01T00:00:00.000Z`;
    const startOfYear = `${thisYear}-01-01T00:00:00.000Z`;

    const [studentsRes, tunggakanRes, todayRes, monthRes, yearRes] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact' }).eq('status', 'aktif'),
      supabase.from('payments').select('sisa_tagihan'),
      supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', nowStr + 'T00:00:00.000Z').lt('tanggal_bayar', nowStr + 'T23:59:59.999Z'),
      supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', startOfMonth),
      supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', startOfYear)
    ]);

    const totalSiswaAktif = studentsRes.count || 0;
    const totalTunggakanAktif = (tunggakanRes.data || []).reduce((a: number, p: any) => a + (p.sisa_tagihan || 0), 0);
    const totalPemasukanHariIni = (todayRes.data || []).reduce((a: number, i: any) => a + i.nominal_bayar, 0);
    const totalPemasukanBulanIni = (monthRes.data || []).reduce((a: number, i: any) => a + i.nominal_bayar, 0);
    const totalPemasukanTahunIni = (yearRes.data || []).reduce((a: number, i: any) => a + i.nominal_bayar, 0);

    res.json({ totalSiswaAktif, totalTunggakanAktif, totalPemasukanHariIni, totalPemasukanBulanIni, totalPemasukanTahunIni, currentMonth: currMonthName, currentYear: thisYear });
  });

  // CHARTS DATA
  app.get('/api/dashboard/charts', async (req, res) => {
    const thisYear = new Date().getFullYear();
    const indonesianMonths = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    const [installmentsRes, paymentsRes, studentsRes] = await Promise.all([
      supabase.from('payment_installments').select('tanggal_bayar, nominal_bayar').gte('tanggal_bayar', `${thisYear}-01-01T00:00:00.000Z`),
      supabase.from('payments').select('status, sisa_tagihan, nominal_bayar, student_id'),
      supabase.from('students').select('id, kelas')
    ]);

    const installments = installmentsRes.data || [];
    const payments = paymentsRes.data || [];
    const students = studentsRes.data || [];

    const monthlyRevenue = indonesianMonths.map((m, index) => {
      const rev = installments
        .filter(inst => new Date(inst.tanggal_bayar).getMonth() === index)
        .reduce((acc, inst) => acc + inst.nominal_bayar, 0);
      return { name: m.substring(0, 3), nominal: rev };
    });

    const paymentStatusDist = [
      { name: 'Lunas', value: payments.filter(p => p.status === 'Lunas').length, color: '#10B981' },
      { name: 'Cicilan', value: payments.filter(p => p.status === 'Cicilan').length, color: '#F59E0B' },
      { name: 'Belum Lunas', value: payments.filter(p => p.status === 'Belum Lunas').length, color: '#EF4444' }
    ];

    const revenueByClass = ['X', 'XI', 'XII'].map(c => {
      const classStdIds = students.filter(s => s.kelas === c).map(s => s.id);
      const rev = payments.filter(p => classStdIds.includes(p.student_id)).reduce((acc, p) => acc + p.nominal_bayar, 0);
      const due = payments.filter(p => classStdIds.includes(p.student_id)).reduce((acc, p) => acc + p.sisa_tagihan, 0);
      return { class: `Kelas ${c}`, Pemasukan: rev, Tunggakan: due };
    });

    res.json({ monthlyRevenue, paymentStatusDist, revenueByClass });
  });

  // ==========================================
  // REKAP BULANAN & LAPORAN
  // ==========================================
  app.get('/api/reports/rekap-bulanan', async (req, res) => {
    const { bulan, tahun, kelas, jurusan } = req.query;

    let query = supabase
      .from('payments')
      .select('*, student:students(kelas, jurusan, nama_lengkap, nis, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)');

    if (bulan) query = query.eq('bulan', bulan);
    if (tahun) query = query.eq('tahun', parseInt(tahun as string, 10));

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    let filteredPayments = data || [];
    if (kelas) filteredPayments = filteredPayments.filter((p: any) => p.student?.kelas === kelas);
    if (jurusan) filteredPayments = filteredPayments.filter((p: any) => p.student?.jurusan === jurusan);

    const totalSiswaTertagih = new Set(filteredPayments.map((p: any) => p.student_id)).size;
    const totalTagihanKotor = filteredPayments.reduce((acc: number, p: any) => acc + p.nominal_tagihan, 0);
    const totalPembayaranMasuk = filteredPayments.reduce((acc: number, p: any) => acc + p.nominal_bayar, 0);
    const totalTunggakan = filteredPayments.reduce((acc: number, p: any) => acc + p.sisa_tagihan, 0);
    const totalSiswaLunas = filteredPayments.filter((p: any) => p.status === 'Lunas').length;
    const totalSiswaCicilan = filteredPayments.filter((p: any) => p.status === 'Cicilan').length;
    const totalSiswaBelumBayar = filteredPayments.filter((p: any) => p.status === 'Belum Lunas').length;
    const persentasePembayaran = totalTagihanKotor > 0
      ? parseFloat(((totalPembayaranMasuk / totalTagihanKotor) * 100).toFixed(2))
      : 0;

    res.json({
      summary: { totalSiswaTertagih, totalTagihanKotor, totalPembayaranMasuk, totalTunggakan, totalSiswaLunas, totalSiswaCicilan, totalSiswaBelumBayar, persentasePembayaran },
      details: filteredPayments
    });
  });

  // REKAP TUNGGAKAN
  app.get('/api/reports/tunggakan', async (req, res) => {
    const { kelas, jurusan } = req.query;

    let query = supabase
      .from('payments')
      .select('*, student:students(kelas, jurusan, nama_lengkap, nis, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)')
      .neq('status', 'Lunas');

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: error.message });

    let list = (data || []).map((p: any) => ({ ...p, paymentType: p.paymentType?.nama_pembayaran || 'Tagihan' }));
    if (kelas) list = list.filter((p: any) => p.student?.kelas === kelas);
    if (jurusan) list = list.filter((p: any) => p.student?.jurusan === jurusan);

    res.json(list);
  });

  // ==========================================
  // SYSTEM: AUDIT LOGS & BACKUP
  // ==========================================
  app.get('/api/system/logs', async (req, res) => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  });

  app.get('/api/system/backup', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ message: 'Akses ditolak! Hanya Admin yang boleh mendownload backup database.' });
    }

    const [users, students, payment_types, payments, installments, activity_logs] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('students').select('*'),
      supabase.from('payment_types').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('payment_installments').select('*'),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500)
    ]);

    const backup = {
      users: users.data || [],
      students: students.data || [],
      payment_types: payment_types.data || [],
      payments: payments.data || [],
      installments: installments.data || [],
      activity_logs: activity_logs.data || []
    };

    await logActivity(user.id, user.username, user.role, 'BACKUP_DB', 'Mengekspor backup basis data sistem.', req);

    res.setHeader('Content-disposition', 'attachment; filename=sekolah_keuangan_backup.json');
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backup, null, 2));
    res.end();
  });

  app.post('/api/system/restore', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user || user.role !== 'Admin') {
      return res.status(403).json({ message: 'Akses ditolak! Hanya Admin yang boleh me-restore database.' });
    }

    const { backupData } = req.body;
    if (!backupData || !backupData.users || !backupData.students || !backupData.payments) {
      return res.status(400).json({ message: 'Format file backup tidak valid!' });
    }

    // Restore is a complex operation - not supported via anon key due to RLS
    return res.status(501).json({ message: 'Fitur restore membutuhkan akses Service Role Key. Silakan import data langsung melalui Supabase Dashboard.' });
  });

  // ==========================================
  // VITE DEVELOPMENT ENVIRONMENT / SPA STATIC FILES
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Express Server] Running at http://localhost:${PORT}`);
    console.log(`[Supabase] Connected to: ${SUPABASE_URL}`);
  });
}

startServer().catch(err => {
  console.error('[Express Server] Startup failed:', err);
});
