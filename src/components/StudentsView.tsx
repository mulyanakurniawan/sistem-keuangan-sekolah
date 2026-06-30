import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Upload,
  Download,
  AlertCircle,
  X,
  Check,
  Filter,
  RefreshCw,
  MoreVertical,
  HelpCircle
} from 'lucide-react';
import { User, Student } from '../types';

interface StudentsViewProps {
  user: User;
  token: string;
}

export default function StudentsView({ user, token }: StudentsViewProps) {
  // Student list state
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('');
  const [filterJurusan, setFilterJurusan] = useState('');
  const [filterStatus, setFilterStatus] = useState('aktif');

  // Modal open/close state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form inputs state
  const [nis, setNis] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [kelas, setKelas] = useState('X');
  const [jurusan, setJurusan] = useState('IPA');
  const [tahunAjaran, setTahunAjaran] = useState('2025/2026');
  const [namaWali, setNamaWali] = useState('');
  const [noHpWali, setNoHpWali] = useState('');
  const [alamat, setAlamat] = useState('');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');

  // Feedback states
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Bulk Import textarea state
  const [bulkData, setBulkData] = useState('');

  // Dropdown list variables for filters
  const kelasOptions = ['X', 'XI', 'XII'];
  const jurusanOptions = [
    'IPA',
    'IPS',
    'Umum'
  ];

  // Fetch Students from API
  async function fetchStudents() {
    try {
      setLoading(true);
      setErrorMsg('');
      const queryParams = new URLSearchParams({
        search,
        kelas: filterKelas,
        jurusan: filterJurusan,
        status: filterStatus,
        page: page.toString(),
        limit: '8' // Keep 8 for better vertical space fit in iframes
      });

      const res = await fetch(`/api/students?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error('Gagal mengambil data siswa');
      }

      const resData = await res.json();
      setStudents(resData.data);
      setTotal(resData.total);
      setTotalPages(resData.totalPages);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStudents();
  }, [page, filterKelas, filterJurusan, filterStatus]);

  // Handle Search Trigger (debounced or click triggered)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setFilterKelas('');
    setFilterJurusan('');
    setFilterStatus('aktif');
    setPage(1);
  };

  // Open Form for Adding New Student
  const handleAddClick = () => {
    setEditingStudent(null);
    setNis('');
    setNamaLengkap('');
    setJenisKelamin('Laki-laki');
    setKelas('X');
    setJurusan('IPA');
    setTahunAjaran('2025/2026');
    setNamaWali('');
    setNoHpWali('');
    setAlamat('');
    setStatus('aktif');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // Open Form for Editing Student
  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setNis(student.nis);
    setNamaLengkap(student.nama_lengkap);
    setJenisKelamin(student.jenis_kelamin);
    setKelas(student.kelas);
    setJurusan(student.jurusan);
    setTahunAjaran(student.tahun_ajaran);
    setNamaWali(student.nama_wali);
    setNoHpWali(student.no_hp_wali);
    setAlamat(student.alamat);
    setStatus(student.status);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  // Submit Student Form (Create or Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Client validation
    if (!nis || !namaLengkap || !namaWali || !noHpWali || !alamat) {
      setErrorMsg('Semua kolom bertanda * wajib diisi!');
      return;
    }

    const payload = {
      nis,
      nama_lengkap: namaLengkap,
      jenis_kelamin: jenisKelamin,
      kelas,
      jurusan,
      tahun_ajaran: tahunAjaran,
      nama_wali: namaWali,
      no_hp_wali: noHpWali,
      alamat,
      status
    };

    try {
      let res;
      if (editingStudent) {
        // Edit student
        res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': token
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create student
        res = await fetch('/api/students', {
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
        throw new Error(resData.message || 'Gagal menyimpan data siswa');
      }

      setSuccessMsg(editingStudent ? 'Siswa berhasil diperbarui!' : 'Siswa baru berhasil ditambahkan!');
      setIsFormOpen(false);
      fetchStudents();

      // Clear flash message after 3 seconds
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data siswa');
    }
  };

  // Delete Student
  const handleDeleteClick = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus siswa "${name}"?\nSemua tagihan & histori transaksi pembayaran terkait siswa ini akan ikut terhapus permanen!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': token
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghapus siswa');
      }

      setSuccessMsg('Siswa berhasil dihapus dari basis data!');
      fetchStudents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghapus siswa');
    }
  };

  // Bulk Import handler
  const handleBulkImport = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const parsed = JSON.parse(bulkData);
      if (!Array.isArray(parsed)) {
        throw new Error('Data harus berupa Array of Object!');
      }

      const res = await fetch('/api/students/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': token
        },
        body: JSON.stringify({ students: parsed })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Import data gagal');
      }

      setSuccessMsg(`Berhasil mengimpor ${resData.importedCount} data siswa! (Dilewati: ${resData.skippedCount})`);
      setIsImportOpen(false);
      setBulkData('');
      fetchStudents();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg('Gagal mengimpor data! Pastikan format JSON valid. Error: ' + err.message);
    }
  };

  // Load Prefilled Sandbox Data into textarea for easy demo import
  const loadSandboxData = () => {
    const sandbox = [
      {
        nis: '20261006',
        nama_lengkap: 'Ahmad Risyad',
        jenis_kelamin: 'Laki-laki',
        kelas: 'XII',
        jurusan: 'IPA',
        tahun_ajaran: '2025/2026',
        nama_wali: 'Ridwan Risyad',
        no_hp_wali: '081211112222',
        alamat: 'Jl. Jenderal Sudirman No. 120, Bandung'
      },
      {
        nis: '20261007',
        nama_lengkap: 'Clara Bella',
        jenis_kelamin: 'Perempuan',
        kelas: 'XI',
        jurusan: 'IPS',
        tahun_ajaran: '2025/2026',
        nama_wali: 'Sutrisno Bella',
        no_hp_wali: '081344445555',
        alamat: 'Ruko Pesona Indah No. 5, Depok'
      },
      {
        nis: '20261008',
        nama_lengkap: 'Dani Ramadhan',
        jenis_kelamin: 'Laki-laki',
        kelas: 'X',
        jurusan: 'Umum',
        tahun_ajaran: '2025/2026',
        nama_wali: 'Idris Ramadhan',
        no_hp_wali: '081299998888',
        alamat: 'Kp. Baru RT 02/RW 04, Bogor'
      }
    ];
    setBulkData(JSON.stringify(sandbox, null, 2));
  };

  // Export to CSV client-side generator
  const exportToCSV = () => {
    if (students.length === 0) {
      alert('Tidak ada data siswa untuk diexport!');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'NIS,Nama Lengkap,Jenis Kelamin,Kelas,Jurusan,Tahun Ajaran,Nama Wali,No HP Wali,Alamat,Status\n';

    students.forEach(s => {
      const row = [
        s.nis,
        `"${s.nama_lengkap}"`,
        s.jenis_kelamin,
        s.kelas,
        `"${s.jurusan}"`,
        s.tahun_ajaran,
        `"${s.nama_wali}"`,
        `"${s.no_hp_wali}"`,
        `"${s.alamat.replace(/\n/g, ' ')}"`,
        s.status
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `data_siswa_ekspor_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="students-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Data Siswa</h2>
          <p className="text-sm text-slate-500 mt-0.5">Kelola, import, dan ekspor data siswa aktif maupun alumni.</p>
        </div>
        
        {/* Actions bar */}
        {(user.role === 'Admin' || user.role === 'Bendahara') && (
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
              title="Ekspor daftar ini ke format CSV"
            >
              <Download className="h-4 w-4" />
              Ekspor CSV
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
            >
              <Upload className="h-4 w-4" />
              Impor Massal
            </button>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/10 transition"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </button>
          </div>
        )}
      </div>

      {/* Alert Feed */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2.5 animate-fade-in shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Filters Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Search Box */}
          <div className="md:col-span-5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Pencarian Siswa</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari NIS, nama siswa, atau wali..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Filter Kelas */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Kelas</label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Kelas</option>
              {kelasOptions.map(k => <option key={k} value={k}>Kelas {k}</option>)}
            </select>
          </div>

          {/* Filter Jurusan */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Jurusan</label>
            <select
              value={filterJurusan}
              onChange={(e) => setFilterJurusan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
            >
              <option value="">Semua Jurusan</option>
              {jurusanOptions.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>

          {/* Filter Status */}
          <div className="md:col-span-2 flex gap-2">
            <div className="w-full">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition"
              >
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif / Alumni</option>
              </select>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 p-2.5 rounded-xl transition self-end"
              title="Reset Filter"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden" id="students-table-container">
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-xs text-slate-500">Menghubungkan ke basis data siswa...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 text-sm font-medium">Tidak ada data siswa ditemukan.</p>
            <p className="text-slate-400 text-xs mt-1">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-5">NIS</th>
                  <th className="py-3 px-5">Nama Lengkap</th>
                  <th className="py-3 px-5">L/P</th>
                  <th className="py-3 px-5">Kelas & Jurusan</th>
                  <th className="py-3 px-5">Nama Wali (HP)</th>
                  <th className="py-3 px-5">Alamat</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  {(user.role === 'Admin' || user.role === 'Bendahara') && (
                    <th className="py-3 px-5 text-center">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-5 font-bold font-mono text-slate-700">{student.nis}</td>
                    <td className="py-3 px-5 font-semibold text-slate-800">{student.nama_lengkap}</td>
                    <td className="py-3 px-5 text-slate-500">{student.jenis_kelamin === 'Laki-laki' ? 'L' : 'P'}</td>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-700">Kelas {student.kelas}</div>
                      <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{student.jurusan}</div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-slate-700">{student.nama_wali}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold">{student.no_hp_wali}</div>
                    </td>
                    <td className="py-3 px-5 text-slate-500 max-w-[150px] truncate" title={student.alamat}>
                      {student.alamat}
                    </td>
                    <td className="py-3 px-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        student.status === 'aktif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${student.status === 'aktif' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {student.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {(user.role === 'Admin' || user.role === 'Bendahara') && (
                      <td className="py-3 px-5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditClick(student)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit Data Siswa"
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </button>
                          {user.role === 'Admin' && (
                            <button
                              onClick={() => handleDeleteClick(student.id, student.nama_lengkap)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus Siswa (Cascade)"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && total > 0 && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Menampilkan {students.length} dari {total} data siswa</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>Halaman {page} dari {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}</h3>
                  <p className="text-[11px] text-slate-500">Lengkapi isian informasi siswa di bawah ini.</p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 max-h-[450px] overflow-y-auto space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 bg-rose-50 text-rose-800 border border-rose-100 rounded-xl flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Nomor Induk Siswa (NIS) *</label>
                    <input
                      type="text"
                      required
                      value={nis}
                      onChange={(e) => setNis(e.target.value)}
                      placeholder="Contoh: 20261006"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Nama Lengkap Siswa *</label>
                    <input
                      type="text"
                      required
                      value={namaLengkap}
                      onChange={(e) => setNamaLengkap(e.target.value)}
                      placeholder="Contoh: Muhammad Rafli"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Jenis Kelamin *</label>
                    <select
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Kelas *</label>
                    <select
                      value={kelas}
                      onChange={(e) => setKelas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      {kelasOptions.map(k => <option key={k} value={k}>Kelas {k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Tahun Ajaran *</label>
                    <input
                      type="text"
                      required
                      value={tahunAjaran}
                      onChange={(e) => setTahunAjaran(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Kompetensi Keahlian / Jurusan *</label>
                  <select
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  >
                    {jurusanOptions.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Nama Wali Murid *</label>
                    <input
                      type="text"
                      required
                      value={namaWali}
                      onChange={(e) => setNamaWali(e.target.value)}
                      placeholder="Contoh: Heri Saputra"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">No HP Wali Murid (WhatsApp) *</label>
                    <input
                      type="text"
                      required
                      value={noHpWali}
                      onChange={(e) => setNoHpWali(e.target.value)}
                      placeholder="Contoh: 0812XXXXXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1.5">Alamat Tempat Tinggal *</label>
                  <textarea
                    required
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    placeholder="Tulis alamat rumah lengkap..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>

                {editingStudent && (
                  <div>
                    <label className="font-bold text-slate-600 block mb-1.5">Status Siswa</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="nonaktif">Nonaktif / Alumni</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/10 transition"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT MASSAL MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-slate-200 animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">Impor Massal Data Siswa</h3>
                  <p className="text-[11px] text-slate-500">Gunakan format JSON standar untuk mengimpor banyak siswa sekaligus.</p>
                </div>
              </div>
              <button
                onClick={() => setIsImportOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 flex flex-col gap-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-blue-600" />
                  Bagaimana cara melakukan impor?
                </p>
                <p>Tempel data JSON berisi array of object siswa yang memiliki kolom wajib berikut: <span className="font-semibold font-mono bg-blue-100/60 px-1 py-0.5 rounded text-blue-900">nis</span> dan <span className="font-semibold font-mono bg-blue-100/60 px-1 py-0.5 rounded text-blue-900">nama_lengkap</span>.</p>
                <button
                  type="button"
                  onClick={loadSandboxData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg self-start font-bold mt-1 shadow-sm transition"
                >
                  Masukkan Template Dummy Simulator
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-2">Tempel Kode JSON di Sini:</label>
                <textarea
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  placeholder="Paste JSON array..."
                  rows={8}
                  className="w-full font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsImportOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!bulkData}
                onClick={handleBulkImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-blue-500/10 transition"
              >
                Lakukan Impor Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
