import { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Filter,
  RefreshCw,
  Send,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Copy,
  Users,
  Clock,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { User, Payment, PaymentType } from '../types';

interface ReportsViewProps {
  user: User;
  token: string;
}

export default function ReportsView({ user, token }: ReportsViewProps) {
  // Report states
  const [summary, setSummary] = useState<any>(null);
  const [details, setDetails] = useState<Payment[]>([]);
  const [tunggakanList, setTunggakanList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterBulan, setFilterBulan] = useState('Januari');
  const [filterTahun, setFilterTahun] = useState('2026');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'rekap' | 'tunggakan'>('rekap');

  // Flash clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const tahunList = ['2025', '2026', '2027'];
  const kelasOptions = ['X', 'XI', 'XII'];
  const jurusanOptions = [
    'IPA',
    'IPS',
    'Umum'
  ];

  async function fetchReportData() {
    try {
      setLoading(true);
      const qParams = new URLSearchParams({
        bulan: filterBulan,
        tahun: filterTahun,
        kelas: filterKelas,
        jurusan: filterJurusan
      });

      // Fetch summary & details
      const res = await fetch(`/api/reports/rekap-bulanan?${qParams.toString()}`);
      const data = await res.json();
      setSummary(data.summary);
      setDetails(data.details);

      // Fetch overdue/arrears list
      const tunggakanRes = await fetch(`/api/reports/tunggakan?kelas=${filterKelas}&jurusan=${filterJurusan}`);
      const tunggakanData = await tunggakanRes.json();
      setTunggakanList(tunggakanData);
    } catch (err) {
      console.error('Error loading financial reports', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReportData();
  }, [filterBulan, filterTahun, filterKelas, filterJurusan]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // WhatsApp Reminder message copy logic
  const copyWhatsAppReminder = (p: any) => {
    const parentName = p.student?.nama_wali || 'Bapak/Ibu Wali Murid';
    const studentName = p.student?.nama_lengkap || 'Siswa';
    const nis = p.student?.nis || '';
    const paymentName = p.paymentType || 'SPP';
    const period = `${p.bulan} ${p.tahun}`;
    const amount = formatRupiah(p.sisa_tagihan);

    const text = `Yth. ${parentName},\nWali murid dari ananda *${studentName}* (NIS: ${nis}).\n\nKami dari bagian Administrasi Keuangan Sekolah ingin menginformasikan mengenai sisa tunggakan pembayaran *${paymentName}* periode *${period}* sebesar *${amount}*.\n\nMohon kerja samanya untuk dapat segera menyelesaikan pembayaran tersebut di loket Bendahara Sekolah pada hari kerja atau melakukan transfer bank.\n\nJika Bapak/Ibu sudah melakukan pembayaran, mohon abaikan pesan ini dan kirimkan bukti pembayaran untuk verifikasi.\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu.\n_-- Bendahara Sekolah SMA Plus Babussalam --_`;

    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Client-side export to CSV/Excel simulator
  const exportToExcel = () => {
    if (details.length === 0) {
      alert('Tidak ada data untuk diexport!');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `REKAPITULASI LAPORAN KEUANGAN SEKOLAH PERIODE ${filterBulan.toUpperCase()} ${filterTahun}\n\n`;
    csvContent += 'NIS,Nama Siswa,Kelas,Jurusan,Komponen Pembayaran,Nominal Tagihan,Terbayar,Sisa Tunggakan,Status,Tanggal Bayar\n';

    details.forEach(p => {
      const row = [
        p.student?.nis || '',
        `"${p.student?.nama_lengkap || ''}"`,
        p.student?.kelas || '',
        `"${p.student?.jurusan || ''}"`,
        `"${p.paymentType?.nama_pembayaran || ''}"`,
        p.nominal_tagihan,
        p.nominal_bayar,
        p.sisa_tagihan,
        p.status,
        p.tanggal_bayar ? p.tanggal_bayar.substring(0, 10) : '-'
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_laporan_keuangan_${filterBulan}_${filterTahun}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="reports-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Rekap & Laporan Keuangan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Otomatisasi pengolahan arus kas masuk, pengeluaran invoice, dan reminder tunggakan.</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            <Download className="h-4 w-4" />
            Export Excel (CSV)
          </button>
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold shadow-md shadow-slate-900/10 transition"
          >
            <Printer className="h-4 w-4" />
            Cetak Laporan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 print:hidden">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all duration-200 ${
            activeTab === 'rekap'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Rekapitulasi Bulanan
        </button>
        <button
          onClick={() => setActiveTab('tunggakan')}
          className={`px-5 py-3 text-xs font-bold border-b-2 transition-all duration-200 ${
            activeTab === 'tunggakan'
              ? 'border-blue-600 text-blue-600 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Monitoring Tunggakan & Reminders ({tunggakanList.length})
        </button>
      </div>

      {/* Interactive Filters (Hidden in print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Filter Bulan */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Bulan Rekap</label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              {bulanList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Filter Tahun */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tahun</label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Kelas</label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Kelas</option>
              {kelasOptions.map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>

          {/* Filter Jurusan */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Jurusan</label>
            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Jurusan</option>
              {jurusanOptions.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-xs text-slate-500">Menghitung agregasi data laporan keuangan...</p>
        </div>
      ) : activeTab === 'rekap' ? (
        /* ==================== TAB REKAPULASI ==================== */
        <div className="space-y-6">
          {/* Printable Report Header */}
          <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4">
            <h1 className="text-xl font-bold uppercase">Laporan Rekapitulasi Pembayaran Keuangan Sekolah</h1>
            <p className="text-xs font-bold text-slate-600">Periode: {filterBulan} {filterTahun} • Kelas: {filterKelas || 'Semua'} • Jurusan: {filterJurusan || 'Semua'}</p>
            <p className="text-[10px] text-slate-400 mt-1">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
          </div>

          {/* KPI Mini Row */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Siswa Tertagih</p>
                  <p className="text-xl font-extrabold text-slate-800 mt-1">{summary.totalSiswaTertagih} Orang</p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Pembayaran Masuk</p>
                  <p className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">{formatRupiah(summary.totalPembayaranMasuk)}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Tunggakan Aktif</p>
                  <p className="text-xl font-extrabold text-rose-600 mt-1 font-mono">{formatRupiah(summary.totalTunggakan)}</p>
                </div>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Rasio Realisasi</p>
                  <p className="text-xl font-extrabold text-blue-600 mt-1">{summary.persentasePembayaran}%</p>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}

          {/* Details Table */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between print:hidden">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Daftar Log Aliran Arus Kas Periode Ini</h3>
              <span className="text-[10px] font-semibold text-slate-400">{details.length} Transaksi Tercatat</span>
            </div>
            {details.length === 0 ? (
              <p className="py-20 text-center text-slate-400 font-medium">Tidak ada transaksi terekam pada periode filter ini.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">NIS</th>
                      <th className="py-3 px-5">Nama Siswa</th>
                      <th className="py-3 px-5">Kelas</th>
                      <th className="py-3 px-5">Komponen</th>
                      <th className="py-3 px-5 text-right">Tagihan</th>
                      <th className="py-3 px-5 text-right">Terbayar</th>
                      <th className="py-3 px-5 text-right">Sisa</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 print:hidden">Metode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {details.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/20">
                        <td className="py-3 px-5 font-bold font-mono text-slate-600">{p.student?.nis}</td>
                        <td className="py-3 px-5 font-semibold text-slate-800">{p.student?.nama_lengkap}</td>
                        <td className="py-3 px-5 font-medium text-slate-500">{p.student?.kelas} - {p.student?.jurusan.split(' ')[0]}</td>
                        <td className="py-3 px-5 font-medium text-slate-700">{p.paymentType ? p.paymentType.nama_pembayaran : 'Tagihan'}</td>
                        <td className="py-3 px-5 text-right font-semibold font-mono text-slate-600">Rp {p.nominal_tagihan.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-5 text-right font-semibold font-mono text-emerald-600">Rp {p.nominal_bayar.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-5 text-right font-bold font-mono text-rose-600">Rp {p.sisa_tagihan.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            p.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700' :
                            p.status === 'Cicilan' ? 'bg-amber-50 text-amber-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-medium text-slate-500 print:hidden">{p.metode_pembayaran || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==================== TAB MONITORING TUNGGAKAN ==================== */
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Monitoring & Reminder Otomatisasi Tunggakan Wali Murid</p>
              <p className="mt-1">Berikut adalah daftar siswa yang memiliki piutang sisa tagihan aktif. Anda dapat mengklik tombol <span className="font-bold">Kirim WA Reminder</span> untuk menyalin draf pesan WhatsApp resmi siap kirim ke clipboard Anda.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            {tunggakanList.length === 0 ? (
              <p className="py-20 text-center text-slate-400 font-medium">Hebat! Seluruh siswa telah melunasi tagihan mereka.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">Siswa (Kelas)</th>
                      <th className="py-3 px-5">Wali (No HP)</th>
                      <th className="py-3 px-5">Komponen / Periode</th>
                      <th className="py-3 px-5 text-right">Tunggakan</th>
                      <th className="py-3 px-5 text-center">Status</th>
                      <th className="py-3 px-5 text-center print:hidden">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tunggakanList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/20">
                        <td className="py-3 px-5">
                          <p className="font-bold text-slate-800">{p.student?.nama_lengkap}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {p.student?.nis} • Kelas {p.student?.kelas}</p>
                        </td>
                        <td className="py-3 px-5">
                          <p className="font-semibold text-slate-700">{p.student?.nama_wali}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-bold">{p.student?.no_hp_wali}</p>
                        </td>
                        <td className="py-3 px-5">
                          <p className="font-semibold text-slate-700">{p.paymentType}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{p.bulan} {p.tahun}</p>
                        </td>
                        <td className="py-3 px-5 text-right font-extrabold text-rose-600 font-mono">
                          Rp {p.sisa_tagihan.toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${
                            p.status === 'Cicilan' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            Overdue / {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-center print:hidden">
                          <button
                            onClick={() => copyWhatsAppReminder(p)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition ${
                              copiedId === p.id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {copiedId === p.id ? (
                              <>
                                <CheckCircle className="h-3.5 w-3.5" />
                                Tersalin!
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                                Salin WA Reminder
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
