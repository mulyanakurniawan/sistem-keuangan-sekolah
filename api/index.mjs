import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

if (supabaseUrl && supabaseKey) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const { data, error } = await supabase.from('users').select('*').ilike('username', username).eq('password_hash', password).single();
    if (error || !data) return res.status(401).json({ message: 'Username atau password salah!' });
    if (data.status !== 'aktif') return res.status(403).json({ message: 'Akun dinonaktifkan!' });
    try { await supabase.from('activity_logs').insert({ id: 'log-' + uid(), user_id: data.id, username: data.username, role: data.role, action: 'LOGIN', description: 'User ' + data.nama_lengkap + ' berhasil login.', created_at: new Date().toISOString() }); } catch (e) {}
    res.json({ id: data.id, username: data.username, nama_lengkap: data.nama_lengkap, role: data.role, status: data.status });
  });

  app.get('/api/students', async (req, res) => {
    const { search, kelas, jurusan, status, page = '1', limit = '10' } = req.query;
    const p = parseInt(page, 10), l = parseInt(limit, 10);
    let q = supabase.from('students').select('*', { count: 'exact' });
    if (search) q = q.or('nama_lengkap.ilike.%' + search + '%,nis.ilike.%' + search + '%,nama_wali.ilike.%' + search + '%');
    if (kelas) q = q.eq('kelas', kelas);
    if (jurusan) q = q.eq('jurusan', jurusan);
    if (status) q = q.eq('status', status);
    q = q.order('created_at', { ascending: false }).range((p - 1) * l, p * l - 1);
    const { data, error, count } = await q;
    if (error) return res.status(500).json({ message: error.message });
    res.json({ data: data || [], total: count || 0, page: p, limit: l, totalPages: Math.ceil((count || 0) / l) });
  });

  app.post('/api/students', async (req, res) => {
    const user = await auth(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return res.status(403).json({ message: 'Akses ditolak!' });
    const { nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status } = req.body;
    const { data: existing } = await supabase.from('students').select('id').eq('nis', nis).single();
    if (existing) return res.status(400).json({ message: 'NIS ' + nis + ' sudah terdaftar!' });
    const { data, error } = await supabase.from('students').insert({ id: 'std-' + uid(), nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status: status || 'aktif', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data);
  });

  app.put('/api/students/:id', async (req, res) => {
    const user = await auth(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return res.status(403).json({ message: 'Akses ditolak!' });
    const { id } = req.params;
    const { nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status } = req.body;
    const { data, error } = await supabase.from('students').update({ nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: 'Siswa tidak ditemukan!' });
    res.json(data);
  });

  app.delete('/api/students/:id', async (req, res) => {
    const user = await auth(req);
    if (!user || user.role !== 'Admin') return res.status(403).json({ message: 'Akses ditolak!' });
    const { id } = req.params;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: 'Siswa berhasil dihapus!' });
  });

  app.post('/api/students/import', async (req, res) => {
    const user = await auth(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return res.status(403).json({ message: 'Akses ditolak!' });
    const { students: data } = req.body;
    if (!Array.isArray(data) || data.length === 0) return res.status(400).json({ message: 'Format tidak valid!' });
    let imported = 0, skipped = 0;
    for (const s of data) {
      if (!s.nis || !s.nama_lengkap) { skipped++; continue; }
      const { data: existing } = await supabase.from('students').select('id').eq('nis', s.nis).single();
      if (existing) { skipped++; continue; }
      const { error } = await supabase.from('students').insert({ id: 'std-' + uid(), nis: String(s.nis), nama_lengkap: s.nama_lengkap, jenis_kelamin: s.jenis_kelamin || 'Laki-laki', kelas: s.kelas || 'X', jurusan: s.jurusan || 'Umum', tahun_ajaran: s.tahun_ajaran || '2025/2026', nama_wali: s.nama_wali || '-', no_hp_wali: s.no_hp_wali || '-', alamat: s.alamat || '-', status: 'aktif', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (!error) imported++; else skipped++;
    }
    res.json({ message: 'Import selesai!', importedCount: imported, skippedCount: skipped });
  });

  app.get('/api/payment-types', async (req, res) => {
    const { data, error } = await supabase.from('payment_types').select('*').order('created_at');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  });

  app.post('/api/payment-types', async (req, res) => {
    const user = await auth(req);
    if (!user || user.role !== 'Admin') return res.status(403).json({ message: 'Akses ditolak!' });
    const { nama_pembayaran, nominal, deskripsi } = req.body;
    const { data, error } = await supabase.from('payment_types').insert({ id: 'pay-type-' + uid(), nama_pembayaran, nominal: parseFloat(nominal) || 0, deskripsi: deskripsi || '', status: 'aktif', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (error) return res.status(500).json({ message: error.message });
    res.status(201).json(data);
  });

  app.put('/api/payment-types/:id', async (req, res) => {
    const user = await auth(req);
    if (!user || user.role !== 'Admin') return res.status(403).json({ message: 'Akses ditolak!' });
    const { id } = req.params;
    const { nama_pembayaran, nominal, deskripsi, status } = req.body;
    const { data, error } = await supabase.from('payment_types').update({ nama_pembayaran, nominal: parseFloat(nominal) || 0, deskripsi, status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: 'Tidak ditemukan!' });
    res.json(data);
  });

  app.delete('/api/payment-types/:id', async (req, res) => {
    const user = await auth(req);
    if (!user || user.role !== 'Admin') return res.status(403).json({ message: 'Akses ditolak!' });
    const { id } = req.params;
    const { error } = await supabase.from('payment_types').delete().eq('id', id);
    if (error) return res.status(500).json({ message: error.message });
    res.json({ message: 'Berhasil dihapus!' });
  });

  app.get('/api/payments', async (req, res) => {
    const { status, student_id, payment_type_id, bulan, tahun, search } = req.query;
    let q = supabase.from('payments').select('*, student:students(nis, nama_lengkap, kelas, jurusan, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)').order('created_at', { ascending: false });
    if (status) q = q.eq('status', status);
    if (student_id) q = q.eq('student_id', student_id);
    if (payment_type_id) q = q.eq('payment_type_id', payment_type_id);
    if (bulan) q = q.eq('bulan', bulan);
    if (tahun) q = q.eq('tahun', parseInt(tahun, 10));
    const { data, error } = await q;
    if (error) return res.status(500).json({ message: error.message });
    let list = data || [];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(p => p.student && (p.student.nama_lengkap.toLowerCase().includes(s) || p.student.nis.includes(s)));
    }
    res.json(list);
  });

  app.post('/api/payments/generate', async (req, res) => {
    const user = await auth(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return res.status(403).json({ message: 'Akses ditolak!' });
    const { payment_type_id, bulan, tahun } = req.body;
    const { data: payType } = await supabase.from('payment_types').select('*').eq('id', payment_type_id).single();
    if (!payType) return res.status(404).json({ message: 'Jenis Pembayaran tidak ditemukan!' });
    const { data: aktif } = await supabase.from('students').select('id').eq('status', 'aktif');
    if (!aktif || aktif.length === 0) return res.json({ message: 'Tidak ada siswa aktif!', generatedCount: 0, skippedCount: 0 });
    let gen = 0, skip = 0;
    for (const s of aktif) {
      const { data: exists } = await supabase.from('payments').select('id').eq('student_id', s.id).eq('payment_type_id', payment_type_id).eq('bulan', bulan).eq('tahun', parseInt(tahun, 10)).single();
      if (exists) { skip++; continue; }
      const { error } = await supabase.from('payments').insert({ id: 'pm-' + uid(), student_id: s.id, payment_type_id, bulan, tahun: parseInt(tahun, 10), nominal_tagihan: payType.nominal, nominal_bayar: 0, sisa_tagihan: payType.nominal, status: 'Belum Lunas', created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      if (!error) gen++; else skip++;
    }
    res.json({ message: 'Generate selesai!', generatedCount: gen, skippedCount: skip });
  });

  app.post('/api/payments/:id/pay', async (req, res) => {
    const user = await auth(req);
    if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return res.status(403).json({ message: 'Akses ditolak!' });
    const { id } = req.params;
    const { nominal_bayar, metode_pembayaran, catatan } = req.body;
    const amount = parseFloat(nominal_bayar);
    if (isNaN(amount) || amount <= 0) return res.status(400).json({ message: 'Nominal tidak valid!' });
    const { data: payment } = await supabase.from('payments').select('*').eq('id', id).single();
    if (!payment) return res.status(404).json({ message: 'Tagihan tidak ditemukan!' });
    if (payment.status === 'Lunas') return res.status(400).json({ message: 'Sudah lunas!' });
    if (amount > payment.sisa_tagihan) return res.status(400).json({ message: 'Melebihi sisa tagihan!' });
    const nb = payment.nominal_bayar + amount;
    const sisa = payment.nominal_tagihan - nb;
    let st = 'Belum Lunas';
    if (sisa <= 0) st = 'Lunas';
    else if (nb > 0) st = 'Cicilan';
    const { data: updated } = await supabase.from('payments').update({ nominal_bayar: nb, sisa_tagihan: sisa, status: st, tanggal_bayar: new Date().toISOString(), metode_pembayaran: metode_pembayaran || 'Tunai', catatan: catatan || payment.catatan, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    await supabase.from('payment_installments').insert({ id: 'inst-' + uid(), payment_id: id, tanggal_bayar: new Date().toISOString(), nominal_bayar: amount, metode_pembayaran: metode_pembayaran || 'Tunai', catatan: catatan || '', created_by: user.id, created_at: new Date().toISOString() });
    res.json({ message: 'Pembayaran berhasil!', payment: updated });
  });

  app.get('/api/payments/:id/installments', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase.from('payment_installments').select('*').eq('payment_id', id).order('created_at');
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  });

  app.post('/api/payments/:id/upload-bukti', async (req, res) => {
    const { id } = req.params;
    const { bukti_pembayaran_url } = req.body;
    const { data, error } = await supabase.from('payments').update({ bukti_pembayaran_url, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return res.status(500).json({ message: error.message });
    if (!data) return res.status(404).json({ message: 'Tidak ditemukan!' });
    res.json({ message: 'Bukti berhasil disimpan!', payment: data });
  });

  app.get('/api/dashboard/stats', async (req, res) => {
    const now = new Date(), today = now.toISOString().substring(0, 10);
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const m = months[now.getMonth()], y = now.getFullYear();
    const sm = y + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01T00:00:00.000Z';
    const sy = y + '-01-01T00:00:00.000Z';
    const [s, t, td, tm, ty] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact' }).eq('status', 'aktif'),
      supabase.from('payments').select('sisa_tagihan'),
      supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', today + 'T00:00:00.000Z').lt('tanggal_bayar', today + 'T23:59:59.999Z'),
      supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', sm),
      supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', sy)
    ]);
    res.json({
      totalSiswaAktif: s.count || 0,
      totalTunggakanAktif: (t.data||[]).reduce((a, p) => a + (p.sisa_tagihan||0), 0),
      totalPemasukanHariIni: (td.data||[]).reduce((a, i) => a + i.nominal_bayar, 0),
      totalPemasukanBulanIni: (tm.data||[]).reduce((a, i) => a + i.nominal_bayar, 0),
      totalPemasukanTahunIni: (ty.data||[]).reduce((a, i) => a + i.nominal_bayar, 0),
      currentMonth: m, currentYear: y
    });
  });

  app.get('/api/dashboard/charts', async (req, res) => {
    const y = new Date().getFullYear();
    const [inst, pays, studs] = await Promise.all([
      supabase.from('payment_installments').select('tanggal_bayar, nominal_bayar').gte('tanggal_bayar', y + '-01-01T00:00:00.000Z'),
      supabase.from('payments').select('status, sisa_tagihan, nominal_bayar, student_id'),
      supabase.from('students').select('id, kelas')
    ]);
    const installments = inst.data || [], payments = pays.data || [], students = studs.data || [];
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const monthlyRevenue = months.map((name, i) => ({
      name, nominal: installments.filter(x => new Date(x.tanggal_bayar).getMonth() === i).reduce((a, x) => a + x.nominal_bayar, 0)
    }));
    res.json({
      monthlyRevenue,
      paymentStatusDist: [
        { name: 'Lunas', value: payments.filter(p => p.status === 'Lunas').length, color: '#10B981' },
        { name: 'Cicilan', value: payments.filter(p => p.status === 'Cicilan').length, color: '#F59E0B' },
        { name: 'Belum Lunas', value: payments.filter(p => p.status === 'Belum Lunas').length, color: '#EF4444' }
      ],
      revenueByClass: ['X','XI','XII'].map(c => {
        const ids = students.filter(s => s.kelas === c).map(s => s.id);
        return { class: 'Kelas ' + c, Pemasukan: payments.filter(p => ids.includes(p.student_id)).reduce((a, p) => a + p.nominal_bayar, 0), Tunggakan: payments.filter(p => ids.includes(p.student_id)).reduce((a, p) => a + p.sisa_tagihan, 0) };
      })
    });
  });

  app.get('/api/reports/rekap-bulanan', async (req, res) => {
    const { bulan, tahun, kelas, jurusan } = req.query;
    let q = supabase.from('payments').select('*, student:students(kelas, jurusan, nama_lengkap, nis, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)');
    if (bulan) q = q.eq('bulan', bulan);
    if (tahun) q = q.eq('tahun', parseInt(tahun, 10));
    const { data, error } = await q;
    if (error) return res.status(500).json({ message: error.message });
    let fp = data || [];
    if (kelas) fp = fp.filter(p => p.student && p.student.kelas === kelas);
    if (jurusan) fp = fp.filter(p => p.student && p.student.jurusan === jurusan);
    const tagihan = fp.reduce((a, p) => a + p.nominal_tagihan, 0);
    const bayar = fp.reduce((a, p) => a + p.nominal_bayar, 0);
    res.json({
      summary: {
        totalSiswaTertagih: new Set(fp.map(p => p.student_id)).size,
        totalTagihanKotor: tagihan, totalPembayaranMasuk: bayar,
        totalTunggakan: fp.reduce((a, p) => a + p.sisa_tagihan, 0),
        totalSiswaLunas: fp.filter(p => p.status === 'Lunas').length,
        totalSiswaCicilan: fp.filter(p => p.status === 'Cicilan').length,
        totalSiswaBelumBayar: fp.filter(p => p.status === 'Belum Lunas').length,
        persentasePembayaran: tagihan > 0 ? parseFloat(((bayar / tagihan) * 100).toFixed(2)) : 0
      },
      details: fp
    });
  });

  app.get('/api/reports/tunggakan', async (req, res) => {
    const { kelas, jurusan } = req.query;
    let q = supabase.from('payments').select('*, student:students(kelas, jurusan, nama_lengkap, nis, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)').neq('status', 'Lunas');
    const { data, error } = await q;
    if (error) return res.status(500).json({ message: error.message });
    let list = (data || []).map(p => ({ ...p, paymentType: p.paymentType ? p.paymentType.nama_pembayaran : 'Tagihan' }));
    if (kelas) list = list.filter(p => p.student && p.student.kelas === kelas);
    if (jurusan) list = list.filter(p => p.student && p.student.jurusan === jurusan);
    res.json(list);
  });

  app.get('/api/system/logs', async (req, res) => {
    const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data || []);
  });

  app.get('/api/system/backup', async (req, res) => {
    const user = await auth(req);
    if (!user || user.role !== 'Admin') return res.status(403).json({ message: 'Akses ditolak!' });
    const [u, s, pt, p, i, al] = await Promise.all([
      supabase.from('users').select('*'),
      supabase.from('students').select('*'),
      supabase.from('payment_types').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('payment_installments').select('*'),
      supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500)
    ]);
    res.setHeader('Content-disposition', 'attachment; filename=backup.json');
    res.setHeader('Content-type', 'application/json');
    res.json({ users: u.data, students: s.data, payment_types: pt.data, payments: p.data, installments: i.data, activity_logs: al.data });
  });

  app.post('/api/system/restore', async (req, res) => {
    const user = await auth(req);
    if (!user || user.role !== 'Admin') return res.status(403).json({ message: 'Akses ditolak!' });
    res.status(501).json({ message: 'Restore via dashboard Supabase saja.' });
  });

  async function auth(req) {
    const uid = req.headers['x-user-id'];
    if (!uid) return null;
    const { data } = await supabase.from('users').select('*').eq('id', uid).eq('status', 'aktif').single();
    return data || null;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, supabase: !!(supabaseUrl && supabaseKey) });
});

export default app;
