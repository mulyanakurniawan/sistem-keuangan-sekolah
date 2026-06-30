import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function uid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve) => {
    if (req.method === 'GET' || req.method === 'DELETE') return resolve({});
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => {
      try { resolve(d ? JSON.parse(d) : {}); }
      catch { resolve({}); }
    });
  });
}

async function auth(req) {
  const uid_ = req.headers['x-user-id'];
  if (!uid_ || !supabase) return null;
  const { data } = await supabase.from('users').select('*').eq('id', uid_).eq('status', 'aktif').single();
  return data || null;
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  if (method === 'OPTIONS') return res.writeHead(204).end();

  if (!supabase) {
    return json(res, 500, { message: 'Supabase not configured' });
  }

  const body = await getBody(req);

  try {
    // Auth
    if (path === '/api/auth/login' && method === 'POST') {
      const { username, password } = body;
      const { data: user, error } = await supabase.from('users').select('*').ilike('username', username).eq('password_hash', password).single();
      if (error || !user) return json(res, 401, { message: 'Username atau password salah!' });
      if (user.status !== 'aktif') return json(res, 403, { message: 'Akun dinonaktifkan!' });
      try {
        await supabase.from('activity_logs').insert({
          id: 'log-' + uid(), user_id: user.id, username: user.username, role: user.role,
          action: 'LOGIN', description: 'User ' + user.nama_lengkap + ' berhasil login.',
          created_at: new Date().toISOString()
        });
      } catch (e) {}
      return json(res, 200, { id: user.id, username: user.username, nama_lengkap: user.nama_lengkap, role: user.role, status: user.status });
    }

    // Dashboard stats
    if (path === '/api/dashboard/stats' && method === 'GET') {
      const now = new Date(), today = now.toISOString().substring(0, 10);
      const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
      const m = months[now.getMonth()], y = now.getFullYear();
      const sm = y + '-' + String(now.getMonth()+1).padStart(2,'0') + '-01T00:00:00.000Z';
      const sy = y + '-01-01T00:00:00.000Z';
      const [s, t, td, tm, ty_] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }).eq('status', 'aktif'),
        supabase.from('payments').select('sisa_tagihan'),
        supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', today + 'T00:00:00.000Z').lt('tanggal_bayar', today + 'T23:59:59.999Z'),
        supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', sm),
        supabase.from('payment_installments').select('nominal_bayar').gte('tanggal_bayar', sy)
      ]);
      return json(res, 200, {
        totalSiswaAktif: s.count || 0,
        totalTunggakanAktif: (t.data||[]).reduce((a, p) => a + (p.sisa_tagihan||0), 0),
        totalPemasukanHariIni: (td.data||[]).reduce((a, i) => a + i.nominal_bayar, 0),
        totalPemasukanBulanIni: (tm.data||[]).reduce((a, i) => a + i.nominal_bayar, 0),
        totalPemasukanTahunIni: (ty_.data||[]).reduce((a, i) => a + i.nominal_bayar, 0),
        currentMonth: m, currentYear: y
      });
    }

    // Dashboard charts
    if (path === '/api/dashboard/charts' && method === 'GET') {
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
      return json(res, 200, {
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
    }

    // Students
    if (path === '/api/students' && method === 'GET') {
      const search = url.searchParams.get('search');
      const kelas = url.searchParams.get('kelas');
      const jurusan = url.searchParams.get('jurusan');
      const status = url.searchParams.get('status');
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      let q = supabase.from('students').select('*', { count: 'exact' });
      if (search) q = q.or('nama_lengkap.ilike.%' + search + '%,nis.ilike.%' + search + '%,nama_wali.ilike.%' + search + '%');
      if (kelas) q = q.eq('kelas', kelas);
      if (jurusan) q = q.eq('jurusan', jurusan);
      if (status) q = q.eq('status', status);
      q = q.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
      const { data, error, count } = await q;
      if (error) return json(res, 500, { message: error.message });
      return json(res, 200, { data: data || [], total: count || 0, page, limit, totalPages: Math.ceil((count || 0) / limit) });
    }

    if (path === '/api/students' && method === 'POST') {
      const user = await auth(req);
      if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return json(res, 403, { message: 'Akses ditolak!' });
      const { nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status } = body;
      const { data: existing } = await supabase.from('students').select('id').eq('nis', nis).single();
      if (existing) return json(res, 400, { message: 'NIS ' + nis + ' sudah terdaftar!' });
      const { data, error } = await supabase.from('students').insert({ id: 'std-' + uid(), nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status: status || 'aktif', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
      if (error) return json(res, 500, { message: error.message });
      return json(res, 201, data);
    }

    // Student by ID pattern: /api/students/:id
    const studentMatch = path.match(/^\/api\/students\/([^/]+)$/);
    if (studentMatch) {
      const id = studentMatch[1];

      if (method === 'PUT') {
        const user = await auth(req);
        if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return json(res, 403, { message: 'Akses ditolak!' });
        const { nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status } = body;
        const { data, error } = await supabase.from('students').update({ nis, nama_lengkap, jenis_kelamin, kelas, jurusan, tahun_ajaran, nama_wali, no_hp_wali, alamat, status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) return json(res, 500, { message: error.message });
        if (!data) return json(res, 404, { message: 'Siswa tidak ditemukan!' });
        return json(res, 200, data);
      }

      if (method === 'DELETE') {
        const user = await auth(req);
        if (!user || user.role !== 'Admin') return json(res, 403, { message: 'Akses ditolak!' });
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) return json(res, 500, { message: error.message });
        return json(res, 200, { message: 'Siswa berhasil dihapus!' });
      }
    }

    // Students import
    if (path === '/api/students/import' && method === 'POST') {
      const user = await auth(req);
      if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return json(res, 403, { message: 'Akses ditolak!' });
      const { students: data } = body;
      if (!Array.isArray(data) || data.length === 0) return json(res, 400, { message: 'Format tidak valid!' });
      let imported = 0, skipped = 0;
      for (const s of data) {
        if (!s.nis || !s.nama_lengkap) { skipped++; continue; }
        const { data: existing } = await supabase.from('students').select('id').eq('nis', s.nis).single();
        if (existing) { skipped++; continue; }
        const { error } = await supabase.from('students').insert({ id: 'std-' + uid(), nis: String(s.nis), nama_lengkap: s.nama_lengkap, jenis_kelamin: s.jenis_kelamin || 'Laki-laki', kelas: s.kelas || 'X', jurusan: s.jurusan || 'Umum', tahun_ajaran: s.tahun_ajaran || '2025/2026', nama_wali: s.nama_wali || '-', no_hp_wali: s.no_hp_wali || '-', alamat: s.alamat || '-', status: 'aktif', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (!error) imported++; else skipped++;
      }
      return json(res, 200, { message: 'Import selesai!', importedCount: imported, skippedCount: skipped });
    }

    // Payment types
    if (path === '/api/payment-types' && method === 'GET') {
      const { data, error } = await supabase.from('payment_types').select('*').order('created_at');
      if (error) return json(res, 500, { message: error.message });
      return json(res, 200, data || []);
    }

    if (path === '/api/payment-types' && method === 'POST') {
      const user = await auth(req);
      if (!user || user.role !== 'Admin') return json(res, 403, { message: 'Akses ditolak!' });
      const { nama_pembayaran, nominal, deskripsi } = body;
      const { data, error } = await supabase.from('payment_types').insert({ id: 'pay-type-' + uid(), nama_pembayaran, nominal: parseFloat(nominal) || 0, deskripsi: deskripsi || '', status: 'aktif', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
      if (error) return json(res, 500, { message: error.message });
      return json(res, 201, data);
    }

    // Payment type by ID
    const ptMatch = path.match(/^\/api\/payment-types\/([^/]+)$/);
    if (ptMatch) {
      const id = ptMatch[1];

      if (method === 'PUT') {
        const user = await auth(req);
        if (!user || user.role !== 'Admin') return json(res, 403, { message: 'Akses ditolak!' });
        const { nama_pembayaran, nominal, deskripsi, status } = body;
        const { data, error } = await supabase.from('payment_types').update({ nama_pembayaran, nominal: parseFloat(nominal) || 0, deskripsi, status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        if (error) return json(res, 500, { message: error.message });
        if (!data) return json(res, 404, { message: 'Tidak ditemukan!' });
        return json(res, 200, data);
      }

      if (method === 'DELETE') {
        const user = await auth(req);
        if (!user || user.role !== 'Admin') return json(res, 403, { message: 'Akses ditolak!' });
        const { error } = await supabase.from('payment_types').delete().eq('id', id);
        if (error) return json(res, 500, { message: error.message });
        return json(res, 200, { message: 'Berhasil dihapus!' });
      }
    }

    // Payments
    if (path === '/api/payments' && method === 'GET') {
      const status = url.searchParams.get('status');
      const student_id = url.searchParams.get('student_id');
      const payment_type_id = url.searchParams.get('payment_type_id');
      const bulan = url.searchParams.get('bulan');
      const tahun = url.searchParams.get('tahun');
      const search = url.searchParams.get('search');
      let q = supabase.from('payments').select('*, student:students(nis, nama_lengkap, kelas, jurusan, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)').order('created_at', { ascending: false });
      if (status) q = q.eq('status', status);
      if (student_id) q = q.eq('student_id', student_id);
      if (payment_type_id) q = q.eq('payment_type_id', payment_type_id);
      if (bulan) q = q.eq('bulan', bulan);
      if (tahun) q = q.eq('tahun', parseInt(tahun, 10));
      const { data, error } = await q;
      if (error) return json(res, 500, { message: error.message });
      let list = data || [];
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(p => p.student && (p.student.nama_lengkap.toLowerCase().includes(s) || p.student.nis.includes(s)));
      }
      return json(res, 200, list);
    }

    // Payments generate
    if (path === '/api/payments/generate' && method === 'POST') {
      const user = await auth(req);
      if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return json(res, 403, { message: 'Akses ditolak!' });
      const { payment_type_id, bulan, tahun } = body;
      const { data: payType } = await supabase.from('payment_types').select('*').eq('id', payment_type_id).single();
      if (!payType) return json(res, 404, { message: 'Jenis Pembayaran tidak ditemukan!' });
      const { data: aktif } = await supabase.from('students').select('id').eq('status', 'aktif');
      if (!aktif || aktif.length === 0) return json(res, 200, { message: 'Tidak ada siswa aktif!', generatedCount: 0, skippedCount: 0 });
      let gen = 0, skip = 0;
      for (const s of aktif) {
        const { data: exists } = await supabase.from('payments').select('id').eq('student_id', s.id).eq('payment_type_id', payment_type_id).eq('bulan', bulan).eq('tahun', parseInt(tahun, 10)).single();
        if (exists) { skip++; continue; }
        const { error } = await supabase.from('payments').insert({ id: 'pm-' + uid(), student_id: s.id, payment_type_id, bulan, tahun: parseInt(tahun, 10), nominal_tagihan: payType.nominal, nominal_bayar: 0, sisa_tagihan: payType.nominal, status: 'Belum Lunas', created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        if (!error) gen++; else skip++;
      }
      return json(res, 200, { message: 'Generate selesai!', generatedCount: gen, skippedCount: skip });
    }

    // Payment by ID
    const pmMatch = path.match(/^\/api\/payments\/([^/]+)\/(.+)$/);
    const pmSimpleMatch = path.match(/^\/api\/payments\/([^/]+)$/);
    const pmId = pmMatch ? pmMatch[1] : (pmSimpleMatch ? pmSimpleMatch[1] : null);
    const pmSub = pmMatch ? pmMatch[2] : null;

    if (pmId && pmSub === 'pay' && method === 'POST') {
      const user = await auth(req);
      if (!user || (user.role !== 'Admin' && user.role !== 'Bendahara')) return json(res, 403, { message: 'Akses ditolak!' });
      const { nominal_bayar, metode_pembayaran, catatan } = body;
      const amount = parseFloat(nominal_bayar);
      if (isNaN(amount) || amount <= 0) return json(res, 400, { message: 'Nominal tidak valid!' });
      const { data: payment } = await supabase.from('payments').select('*').eq('id', pmId).single();
      if (!payment) return json(res, 404, { message: 'Tagihan tidak ditemukan!' });
      if (payment.status === 'Lunas') return json(res, 400, { message: 'Sudah lunas!' });
      if (amount > payment.sisa_tagihan) return json(res, 400, { message: 'Melebihi sisa tagihan!' });
      const nb = payment.nominal_bayar + amount;
      const sisa = payment.nominal_tagihan - nb;
      let st = 'Belum Lunas';
      if (sisa <= 0) st = 'Lunas';
      else if (nb > 0) st = 'Cicilan';
      const { data: updated } = await supabase.from('payments').update({ nominal_bayar: nb, sisa_tagihan: sisa, status: st, tanggal_bayar: new Date().toISOString(), metode_pembayaran: metode_pembayaran || 'Tunai', catatan: catatan || payment.catatan, updated_at: new Date().toISOString() }).eq('id', pmId).select().single();
      await supabase.from('payment_installments').insert({ id: 'inst-' + uid(), payment_id: pmId, tanggal_bayar: new Date().toISOString(), nominal_bayar: amount, metode_pembayaran: metode_pembayaran || 'Tunai', catatan: catatan || '', created_by: user.id, created_at: new Date().toISOString() });
      return json(res, 200, { message: 'Pembayaran berhasil!', payment: updated });
    }

    if (pmId && pmSub === 'installments' && method === 'GET') {
      const { data, error } = await supabase.from('payment_installments').select('*').eq('payment_id', pmId).order('created_at');
      if (error) return json(res, 500, { message: error.message });
      return json(res, 200, data || []);
    }

    if (pmId && pmSub === 'upload-bukti' && method === 'POST') {
      const { bukti_pembayaran_url } = body;
      const { data, error } = await supabase.from('payments').update({ bukti_pembayaran_url, updated_at: new Date().toISOString() }).eq('id', pmId).select().single();
      if (error) return json(res, 500, { message: error.message });
      if (!data) return json(res, 404, { message: 'Tidak ditemukan!' });
      return json(res, 200, { message: 'Bukti berhasil disimpan!', payment: data });
    }

    // Reports
    if (path === '/api/reports/rekap-bulanan' && method === 'GET') {
      const bulan = url.searchParams.get('bulan');
      const tahun = url.searchParams.get('tahun');
      const kelas = url.searchParams.get('kelas');
      const jurusan = url.searchParams.get('jurusan');
      let q = supabase.from('payments').select('*, student:students(kelas, jurusan, nama_lengkap, nis, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)');
      if (bulan) q = q.eq('bulan', bulan);
      if (tahun) q = q.eq('tahun', parseInt(tahun, 10));
      const { data, error } = await q;
      if (error) return json(res, 500, { message: error.message });
      let fp = data || [];
      if (kelas) fp = fp.filter(p => p.student && p.student.kelas === kelas);
      if (jurusan) fp = fp.filter(p => p.student && p.student.jurusan === jurusan);
      const tagihan = fp.reduce((a, p) => a + p.nominal_tagihan, 0);
      const bayar = fp.reduce((a, p) => a + p.nominal_bayar, 0);
      return json(res, 200, {
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
    }

    if (path === '/api/reports/tunggakan' && method === 'GET') {
      const kelas = url.searchParams.get('kelas');
      const jurusan = url.searchParams.get('jurusan');
      let q = supabase.from('payments').select('*, student:students(kelas, jurusan, nama_lengkap, nis, nama_wali, no_hp_wali), paymentType:payment_types(nama_pembayaran)').neq('status', 'Lunas');
      const { data, error } = await q;
      if (error) return json(res, 500, { message: error.message });
      let list = (data || []).map(p => ({ ...p, paymentType: p.paymentType ? p.paymentType.nama_pembayaran : 'Tagihan' }));
      if (kelas) list = list.filter(p => p.student && p.student.kelas === kelas);
      if (jurusan) list = list.filter(p => p.student && p.student.jurusan === jurusan);
      return json(res, 200, list);
    }

    // System
    if (path === '/api/system/logs' && method === 'GET') {
      const { data, error } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
      if (error) return json(res, 500, { message: error.message });
      return json(res, 200, data || []);
    }

    if (path === '/api/system/backup' && method === 'GET') {
      const user = await auth(req);
      if (!user || user.role !== 'Admin') return json(res, 403, { message: 'Akses ditolak!' });
      const [u, s, pt, p, i, al] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('students').select('*'),
        supabase.from('payment_types').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('payment_installments').select('*'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500)
      ]);
      res.setHeader('Content-disposition', 'attachment; filename=backup.json');
      return json(res, 200, { users: u.data, students: s.data, payment_types: pt.data, payments: p.data, installments: i.data, activity_logs: al.data });
    }

    if (path === '/api/system/restore' && method === 'POST') {
      const user = await auth(req);
      if (!user || user.role !== 'Admin') return json(res, 403, { message: 'Akses ditolak!' });
      return json(res, 501, { message: 'Restore via dashboard Supabase saja.' });
    }

    // 404
    return json(res, 404, { message: 'Route not found' });
  } catch (err) {
    return json(res, 500, { message: err.message });
  }
}
