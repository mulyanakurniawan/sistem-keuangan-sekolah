import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  RefreshCw,
  QrCode,
  DollarSign,
  User,
  X,
  FileText,
  AlertCircle
} from 'lucide-react';
import { User as AuthUser, Payment, PaymentType, Student } from '../types';

interface PaymentsViewProps {
  user: AuthUser;
  token: string;
}

export default function PaymentsView({ user, token }: PaymentsViewProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  // Modals state
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Generate Bill State
  const [genTypeId, setGenTypeId] = useState('');
  const [genBulan, setGenBulan] = useState('Januari');
  const [genTahun, setGenTahun] = useState('2026');

  // Input Payment State
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Lainnya'>('Tunai');
  const [payNote, setPayNote] = useState('');

  // Invoice / QR State
  const [invoicePayment, setInvoicePayment] = useState<Payment | null>(null);
  const [installments, setInstallments] = useState<any[]>([]);

  // Feedback Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Static options
  const bulanList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Tahunan'
  ];
  const tahunList = ['2025', '2026', '2027'];

  async function fetchData() {
    try {
      setLoading(true);
      setErrorMsg('');

      // Fetch payments with filters
      const qParams = new URLSearchParams();
      if (search) qParams.append('search', search);
      if (filterStatus) qParams.append('status', filterStatus);
      if (filterType) qParams.append('payment_type_id', filterType);
      if (filterBulan) qParams.append('bulan', filterBulan);
      if (filterTahun) qParams.append('tahun', filterTahun);

      const res = await fetch(`/api/payments?${qParams.toString()}`);
      if (!res.ok) throw new Error('Gagal memuat data tagihan');
      const data = await res.json();
      setPayments(data);

      // Fetch payment types for dropdown
      const typesRes = await fetch('/api/payment-types');
      const typesData = await typesRes.json();
      setPaymentTypes(typesData.filter((pt: PaymentType) => pt.status === 'aktif'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterType, filterBulan, filterTahun]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterType('');
    setFilterBulan('');
    setFilterTahun('');
    fetchData();
  };

  // Open pay modal
  const handlePayClick = (p: Payment) => {
    setSelectedPayment(p);
    // Set default payment to exact sisa_tagihan
    setPayAmount(p.sisa_tagihan.toString());
    setPayMethod('Tunai');
    setPayNote('');
    setErrorMsg('');
    setIsPayOpen(true);
  };

  // Submit payment / installment transaction
  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedPayment) return;

    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Masukkan nominal pembayaran yang valid!');
      return;
    }

    if (parsedAmount > selectedPayment.sisa_tagihan) {
      setErrorMsg(`Nominal bayar melebihi sisa tagihan (Maks: Rp ${selectedPayment.sisa_tagihan.toLocaleString('id-ID')})`);
      return;
    }

    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': token
        },
        body: JSON.stringify({
          nominal_bayar: parsedAmount,
          metode_pembayaran: payMethod,
          catatan: payNote
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Gagal memproses pembayaran');

      setSuccessMsg('Transaksi pembayaran berhasil dibukukan!');
      setIsPayOpen(false);
      fetchData();

      // Open Invoice Modal right after success for immediate print!
      handleInvoiceClick(resData.payment);

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    }
  };

  // Generate automated billing SPP for all active students
  const handleGenerateBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!genTypeId) {
      setErrorMsg('Pilih jenis pembayaran tagihan yang ingin digenerate!');
      return;
    }

    try {
      const res = await fetch('/api/payments/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': token
        },
        body: JSON.stringify({
          payment_type_id: genTypeId,
          bulan: genBulan,
          tahun: genTahun
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Generate gagal');

      setSuccessMsg(`Berhasil men-generate ${resData.generatedCount} tagihan baru! (Dilewati: ${resData.skippedCount})`);
      setIsGenerateOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    }
  };

  // Open invoice preview and load installments history
  const handleInvoiceClick = async (p: Payment) => {
    setInvoicePayment(p);
    try {
      const res = await fetch(`/api/payments/${p.id}/installments`);
      const data = await res.json();
      setInstallments(data);
      setIsInvoiceOpen(true);
    } catch (err) {
      console.error('Error fetching installments detail', err);
    }
  };

  // Trigger browser print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="payments-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Transaksi Pembayaran Siswa</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola penagihan komponen SPP/Uang Gedung, proses cicilan, dan kuitansi.</p>
        </div>

        {(user.role === 'Admin' || user.role === 'Bendahara') && (
          <button
            onClick={() => {
              setGenTypeId(paymentTypes[0]?.id || '');
              setIsGenerateOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 self-start sm:self-auto transition"
          >
            <Plus className="h-4 w-4" />
            Generate Tagihan Bulanan
          </button>
        )}
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium shadow-sm animate-fade-in">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-500 inline mr-2 align-middle shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filter Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
          {/* Quick Search */}
          <div className="md:col-span-4">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Pencarian Siswa</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama siswa atau NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-9 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Cicilan">Cicilan</option>
              <option value="Belum Lunas">Belum Lunas</option>
            </select>
          </div>

          {/* Type Component */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Komponen</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Komponen</option>
              {paymentTypes.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.nama_pembayaran}</option>
              ))}
            </select>
          </div>

          {/* Periode Bulan */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Bulan</label>
            <select
              value={filterBulan}
              onChange={(e) => setFilterBulan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Bulan</option>
              {bulanList.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Buttons */}
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-slate-800 text-white font-bold hover:bg-slate-900 px-3 py-2 rounded-xl text-xs transition h-9 flex items-center justify-center gap-1.5 shadow-sm"
            >
              Cari
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 p-2 rounded-xl transition h-9 flex items-center justify-center"
              title="Reset Filter"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Grid Table of Payments */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden" id="payments-table-container">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-xs text-slate-500">Menghubungkan ke tabel transaksi keuangan...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-20 text-center">
            <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Tidak ada data tagihan ditemukan.</p>
            <p className="text-slate-400 text-xs mt-1">Gunakan tombol 'Generate' atau daftarkan jenis pembayaran baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">Siswa (Kelas)</th>
                  <th className="py-3 px-5">Komponen / Periode</th>
                  <th className="py-3 px-5 text-right">Tagihan</th>
                  <th className="py-3 px-5 text-right">Terbayar</th>
                  <th className="py-3 px-5 text-right">Sisa Piutang</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-5">
                      {p.student ? (
                        <div>
                          <p className="font-bold text-slate-800">{p.student.nama_lengkap}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {p.student.nis} • Kelas {p.student.kelas}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Siswa terhapus</p>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-700">{p.paymentType ? p.paymentType.nama_pembayaran : 'Komponen'}</p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">{p.bulan} {p.tahun}</p>
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-slate-600 font-mono">
                      Rp {p.nominal_tagihan.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-600 font-mono">
                      Rp {p.nominal_bayar.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-5 text-right font-extrabold text-rose-600 font-mono">
                      Rp {p.sisa_tagihan.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold ${
                        p.status === 'Lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        p.status === 'Cicilan' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {p.status === 'Lunas' ? <CheckCircle className="h-3 w-3" /> :
                         p.status === 'Cicilan' ? <Clock className="h-3 w-3" /> :
                         <AlertTriangle className="h-3 w-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {p.status !== 'Lunas' && (user.role === 'Admin' || user.role === 'Bendahara') && (
                          <button
                            onClick={() => handlePayClick(p)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[10px] shadow-xs transition"
                          >
                            Input Bayar
                          </button>
                        )}
                        <button
                          onClick={() => handleInvoiceClick(p)}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 p-1.5 rounded-lg transition"
                          title="Cetak Bukti Pembayaran / Invoice"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAY / CICILAN MODAL */}
      {isPayOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Input Pembayaran Siswa</h3>
                  <p className="text-[11px] text-slate-500">Proses pelunasan atau angsuran tagihan siswa.</p>
                </div>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePaySubmit}>
              <div className="p-6 space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                {/* Bill details */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Nama Siswa:</span>
                    <span className="font-bold text-slate-800">{selectedPayment.student?.nama_lengkap}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Tagihan:</span>
                    <span className="font-bold text-slate-700">{selectedPayment.paymentType?.nama_pembayaran} ({selectedPayment.bulan})</span>
                  </div>
                  <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between">
                    <span className="text-slate-400 font-medium">Sisa Tagihan Sekarang:</span>
                    <span className="font-extrabold text-rose-600 font-mono text-sm">Rp {selectedPayment.sisa_tagihan.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* Input Nominal */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Nominal Bayar (Rupiah) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      max={selectedPayment.sisa_tagihan}
                      placeholder={`Max: ${selectedPayment.sisa_tagihan}`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:border-blue-500 focus:bg-white transition font-mono font-bold"
                    />
                  </div>
                  {/* Realtime automatic sisa tagihan calculation helper */}
                  {payAmount && parseFloat(payAmount) > 0 && (
                    <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">
                      Sisa tagihan setelah pembayaran ini: <span className="text-emerald-600 font-bold font-mono">Rp {(selectedPayment.sisa_tagihan - parseFloat(payAmount)).toLocaleString('id-ID')}</span>
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Metode Pembayaran *</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="Tunai">Tunai / Cash</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="E-Wallet">E-Wallet (Gopay/OVO/Dana)</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Catatan Pembayaran</label>
                  <textarea
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder="Contoh: Diterima oleh Bendahara, lunas..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-600 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md shadow-emerald-500/10 transition"
                >
                  Konfirmasi Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE BULK BILLING MODAL */}
      {isGenerateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 font-sans">Generate Tagihan Bulanan</h3>
                  <p className="text-[11px] text-slate-500">Buat tagihan untuk seluruh siswa aktif sekaligus.</p>
                </div>
              </div>
              <button onClick={() => setIsGenerateOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerateBilling}>
              <div className="p-6 space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Pilih Komponen Pembayaran *</label>
                  <select
                    value={genTypeId}
                    onChange={(e) => setGenTypeId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="">-- Pilih Komponen --</option>
                    {paymentTypes.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.nama_pembayaran} (Rp {pt.nominal.toLocaleString('id-ID')})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Bulan Penagihan *</label>
                    <select
                      value={genBulan}
                      onChange={(e) => setGenBulan(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      {bulanList.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Tahun Penagihan *</label>
                    <select
                      value={genTahun}
                      onChange={(e) => setGenTahun(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      {tahunList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                  <p className="font-semibold mb-1">💡 Otomatisasi Sistem</p>
                  Sistem akan mengidentifikasi seluruh siswa berstatus <span className="font-semibold">Aktif</span> dan membuat satu tagihan per siswa. Siswa yang sudah memiliki tagihan serupa pada periode tersebut otomatis akan dilewati.
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGenerateOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-600 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/10 transition"
                >
                  Generate Tagihan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE / RECEIPTS PREVIEW MODAL */}
      {isInvoiceOpen && invoicePayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-scale-up max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Kuitansi Pembayaran Resmi</h3>
                  <p className="text-[11px] text-slate-500">Pratinjau kuitansi kasir sekolah untuk dicetak.</p>
                </div>
              </div>
              <button onClick={() => setIsInvoiceOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6 print:p-0" id="receipt-print-area">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-900 p-2.5 rounded-xl text-white">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Kuitansi Pembayaran Sekolah</h2>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase">SMA PLUS BABUSSALAM</p>
                    <p className="text-[9px] text-slate-400">Jl. Raya Kebayoran No. 45, Kebayoran Lama, Jakarta Selatan</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    invoicePayment.status === 'Lunas' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {invoicePayment.status}
                  </span>
                  <p className="text-[10px] font-bold text-slate-600 font-mono mt-2">NO: INV-{invoicePayment.id.substring(0, 8).toUpperCase()}</p>
                  <p className="text-[9px] text-slate-400 font-medium">Tanggal: {new Date(invoicePayment.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[9px]">Siswa Penerima</p>
                  <p className="font-extrabold text-slate-800 mt-1 text-sm">{invoicePayment.student?.nama_lengkap}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIS: {invoicePayment.student?.nis} • Kelas {invoicePayment.student?.kelas}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold uppercase text-[9px]">Komponen Tagihan</p>
                  <p className="font-extrabold text-slate-800 mt-1 text-sm">{invoicePayment.paymentType?.nama_pembayaran}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">Periode: {invoicePayment.bulan} {invoicePayment.tahun}</p>
                </div>
              </div>

              {/* Billing Breakdowns */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-xs border-b pb-2">Rincian Pembayaran Komponen</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                    <span className="text-slate-500">Nominal Tagihan Awal</span>
                    <span className="font-bold text-slate-700 font-mono">Rp {invoicePayment.nominal_tagihan.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-dashed border-slate-100">
                    <span className="text-slate-500 text-emerald-600 font-bold">Total Terbayar</span>
                    <span className="font-extrabold text-emerald-600 font-mono">Rp {invoicePayment.nominal_bayar.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 text-rose-600 font-bold">Sisa Piutang</span>
                    <span className="font-extrabold text-rose-600 font-mono">Rp {invoicePayment.sisa_tagihan.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Installments History */}
              {installments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-[10px] uppercase tracking-wider border-b pb-2">Riwayat Pembayaran Cicilan</h4>
                  <div className="bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 text-[10px]">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-100/80 font-bold text-slate-500">
                          <th className="p-2">Tanggal</th>
                          <th className="p-2">Metode</th>
                          <th className="p-2 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/50">
                        {installments.map((inst: any, idx: number) => (
                          <tr key={inst.id}>
                            <td className="p-2">{new Date(inst.tanggal_bayar).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                            <td className="p-2">{inst.metode_pembayaran}</td>
                            <td className="p-2 text-right font-bold font-mono">Rp {inst.nominal_bayar.toLocaleString('id-ID')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* QR Code and Signatures */}
              <div className="flex items-end justify-between pt-6 border-t border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-250 flex items-center justify-center">
                    {/* Generates a stylized visual QR code simulator */}
                    <QrCode className="h-14 w-14 text-slate-800" />
                  </div>
                  <div className="max-w-[200px]">
                    <p className="text-[10px] font-bold text-slate-800">Bukti Bayar Elektronik</p>
                    <p className="text-[8px] text-slate-500 mt-1">Scan QR code untuk memvalidasi nomor kuitansi INV-{invoicePayment.id.substring(0, 8).toUpperCase()} pada database keuangan sekolah.</p>
                  </div>
                </div>
                
                <div className="text-center w-40 text-xs">
                  <p className="text-slate-400 font-semibold uppercase text-[9px] mb-12">Petugas Penerima (Bendahara)</p>
                  <p className="font-bold text-slate-800 border-b border-slate-400 pb-1">Ibu Siti Nurhaliza</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">NIP: 198205122009022001</p>
                </div>
              </div>
            </div>

            {/* Print Footer Panel */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
              <span className="text-[10px] text-slate-400 font-medium font-sans">Saran: Cetak kuitansi menggunakan kertas A5 atau Thermal</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-600 text-xs transition"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-slate-900/10 transition"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Kuitansi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
