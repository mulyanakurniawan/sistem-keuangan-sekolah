import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  X,
  FileText,
  DollarSign
} from 'lucide-react';
import { User, PaymentType } from '../types';

interface PaymentTypesViewProps {
  user: User;
  token: string;
}

export default function PaymentTypesView({ user, token }: PaymentTypesViewProps) {
  const [types, setTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [namaPembayaran, setNamaPembayaran] = useState('');
  const [nominal, setNominal] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function fetchPaymentTypes() {
    try {
      setLoading(true);
      const res = await fetch('/api/payment-types');
      if (!res.ok) throw new Error('Gagal mengambil master jenis pembayaran');
      const data = await res.json();
      setTypes(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPaymentTypes();
  }, []);

  const handleAddClick = () => {
    setEditingType(null);
    setNamaPembayaran('');
    setNominal('');
    setDeskripsi('');
    setStatus('aktif');
    setErrorMsg('');
    setIsOpen(true);
  };

  const handleEditClick = (pt: PaymentType) => {
    setEditingType(pt);
    setNamaPembayaran(pt.nama_pembayaran);
    setNominal(pt.nominal.toString());
    setDeskripsi(pt.deskripsi);
    setStatus(pt.status);
    setErrorMsg('');
    setIsOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!namaPembayaran || !nominal) {
      setErrorMsg('Nama Pembayaran dan Nominal wajib diisi!');
      return;
    }

    const payload = {
      nama_pembayaran: namaPembayaran,
      nominal: parseFloat(nominal),
      deskripsi,
      status
    };

    try {
      let res;
      if (editingType) {
        res = await fetch(`/api/payment-types/${editingType.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': token
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/payment-types', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': token
          },
          body: JSON.stringify(payload)
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Gagal menyimpan jenis pembayaran');
      }

      setSuccessMsg(editingType ? 'Master jenis pembayaran diperbarui!' : 'Jenis pembayaran baru dibuat!');
      setIsOpen(false);
      fetchPaymentTypes();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data');
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (!window.confirm(`PERINGATAN KRITIKAL:\nApakah Anda yakin ingin menghapus master jenis pembayaran "${name}"?\nMenghapus ini akan otomatis menghapus SEMUA tagihan & cicilan terkait item ini di seluruh siswa secara permanen!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/payment-types/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-ID': token }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus');

      setSuccessMsg('Master jenis pembayaran & seluruh tagihan turunannya berhasil dihapus!');
      fetchPaymentTypes();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus');
    }
  };

  return (
    <div className="space-y-6" id="payment-types-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Master Tarif & Jenis Pembayaran</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola konfigurasi komponen pembayaran siswa, besar tagihan, dan deskripsinya.</p>
        </div>
        {user.role === 'Admin' && (
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 self-start sm:self-auto transition"
          >
            <Plus className="h-4 w-4" />
            Tambah Komponen
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

      {/* Table Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-xs text-slate-500">Menghubungkan ke tabel tarif pembayaran...</p>
          </div>
        ) : types.length === 0 ? (
          <div className="py-20 text-center">
            <Layers className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Belum ada komponen pembayaran terdaftar.</p>
            {user.role === 'Admin' && (
              <button
                onClick={handleAddClick}
                className="text-xs text-blue-600 font-bold hover:underline mt-1"
              >
                Buat komponen pertama Anda sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Nama Pembayaran</th>
                  <th className="py-3.5 px-6">Besar Nominal</th>
                  <th className="py-3.5 px-6">Keterangan / Deskripsi</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  {user.role === 'Admin' && <th className="py-3.5 px-6 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {types.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <span className="font-bold text-slate-800">{pt.nama_pembayaran}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-extrabold text-slate-900 font-mono">
                      Rp {pt.nominal.toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-6 text-slate-500 max-w-sm truncate" title={pt.deskripsi}>
                      {pt.deskripsi || '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        pt.status === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pt.status === 'aktif' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {pt.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {user.role === 'Admin' && (
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(pt)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Komponen"
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(pt.id, pt.nama_pembayaran)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus Komponen"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FORM MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">{editingType ? 'Edit Jenis Pembayaran' : 'Tambah Jenis Pembayaran'}</h3>
                  <p className="text-[11px] text-slate-500">Konfigurasi besar tarif wajib per item bayaran.</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Nama Pembayaran *</label>
                  <input
                    type="text"
                    required
                    value={namaPembayaran}
                    onChange={(e) => setNamaPembayaran(e.target.value)}
                    placeholder="Contoh: SPP Bulanan, Seragam Sekolah"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Besar Nominal (Rupiah) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      required
                      value={nominal}
                      onChange={(e) => setNominal(e.target.value)}
                      placeholder="Contoh: 250000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Deskripsi / Keterangan</label>
                  <textarea
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Tulis rincian atau kegunaan tarif pembayaran..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Status Aktif</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    <option value="aktif">Aktif (Dapat Diterapkan)</option>
                    <option value="nonaktif">Nonaktif (Diarsipkan)</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl font-semibold text-slate-600 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/10 transition"
                >
                  Simpan Tarif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
