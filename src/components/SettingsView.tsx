import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Upload,
  Moon,
  Sun,
  Database,
  RefreshCw,
  Clock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { User, ActivityLog } from '../types';

interface SettingsViewProps {
  user: User;
  token: string;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onDbRestoreSuccess: () => void;
}

export default function SettingsView({
  user,
  token,
  darkMode,
  toggleDarkMode,
  onDbRestoreSuccess
}: SettingsViewProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Restore file input holder
  const [restoreFileContent, setRestoreFileContent] = useState<string>('');

  async function fetchLogs() {
    try {
      setLoading(true);
      const res = await fetch('/api/system/logs', {
        headers: { 'X-User-ID': token }
      });
      if (!res.ok) throw new Error('Gagal mengambil audit logs');
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat log');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [token]);

  // Download DB Backup File
  const handleDownloadBackup = async () => {
    try {
      setErrorMsg('');
      setSuccessMsg('');

      const response = await fetch('/api/system/backup', {
        headers: { 'X-User-ID': token }
      });

      if (!response.ok) {
        throw new Error('Gagal mengunduh backup, pastikan Anda memiliki akses Admin');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SistemKeuangan_DB_Backup_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg('Ekspor file backup database sukses terunduh!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan ekspor.');
    }
  };

  // Upload/Restore file handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setRestoreFileContent(result);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreBackupSubmit = async () => {
    if (!restoreFileContent) {
      alert('Pilih file backup (.json) terlebih dahulu!');
      return;
    }

    if (!window.confirm('PERINGATAN SANGAT KRITIS:\nProses pemulihan ini akan TIMPA SELURUH DATA SISTEM saat ini (User, Siswa, Komponen, & Transaksi Pembayaran) dengan data baru dari file backup!\n\nApakah Anda yakin ingin melanjutkan?')) {
      return;
    }

    try {
      setErrorMsg('');
      setSuccessMsg('');

      const parsed = JSON.parse(restoreFileContent);

      const res = await fetch('/api/system/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': token
        },
        body: JSON.stringify({ backupData: parsed })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.message || 'Pemulihan gagal');

      setSuccessMsg('Database sistem berhasil dipulihkan dari data cadangan secara sukses!');
      setRestoreFileContent('');
      onDbRestoreSuccess(); // Refresh global app context
      fetchLogs();
    } catch (err: any) {
      setErrorMsg('Pemulihan gagal! Format berkas backup tidak didukung atau rusak. Error: ' + err.message);
    }
  };

  return (
    <div className="space-y-6" id="settings-view">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Audit Trail & Keamanan Sistem</h2>
        <p className="text-sm text-slate-500 mt-0.5">Kelola keandalan basis data keuangan sekolah, unduh cadangan, dan amati riwayat akses masuk.</p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium shadow-sm animate-fade-in">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-medium shadow-sm">
          <AlertCircle className="h-4.5 w-4.5 text-rose-500 inline mr-2 align-middle shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Quick Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Restore */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between" id="backup-card">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Backup & Restore Cadangan Database</h3>
                <p className="text-xs text-slate-400 mt-0.5">Supabase PostgreSQL Sandbox Free-Tier Engine</p>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">Penyimpanan basis data dikompresi ke format JSON portable untuk fleksibilitas migrasi data atau pencadangan eksternal berkala.</p>

              {user.role === 'Admin' ? (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {/* Download */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-700">Ekspor Salinan Database</p>
                      <p className="text-[10px] text-slate-400">Unduh berkas .json enkripsi data sekolah lengkap.</p>
                    </div>
                    <button
                      onClick={handleDownloadBackup}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Backup
                    </button>
                  </div>

                  {/* Upload */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-dashed border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-700">Pulihkan dari File Backup</p>
                      <p className="text-[10px] text-slate-400">Unggah berkas cadangan .json untuk ditimpa kembali.</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        className="flex-1 bg-slate-50 border border-slate-200 text-[10px] py-1 px-2 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={handleRestoreBackupSubmit}
                        disabled={!restoreFileContent}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Restore
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border rounded-xl flex items-center gap-2.5 text-slate-500 pt-3 mt-2 font-medium">
                  <Lock className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                  <span>Akses Backup & Restore dikunci! Hanya role Admin yang diijinkan mengelola database cadangan.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visual Styling Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between" id="visual-settings-card">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sun className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Tema Antarmuka & Personal</h3>
                <p className="text-xs text-slate-400 mt-0.5">Atur tampilan visual dashboard sistem.</p>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <p className="text-slate-500 leading-relaxed">Aktifkan mode malam untuk kenyamanan mata saat mencatat transaksi di malam hari atau kurangi kelelahan mata.</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  <p className="font-semibold text-slate-700">Mode Malam (Dark Theme)</p>
                  <p className="text-[10px] text-slate-400">Beralih dari tema putih bersih ke slate gelap.</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    darkMode ? 'bg-slate-900' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      darkMode ? 'translate-x-5 text-slate-900' : 'translate-x-0 text-amber-500'
                    }`}
                  >
                    {darkMode ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM ACTIVITY LOGS / AUDIT TRAILS */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm" id="audit-logs-panel">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900">Jejak Aktivitas & Audit Trail Sistem</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">Merekam riwayat login, input transaksi, pemulihan data, & modifikasi siswa.</p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            title="Refresh Logs Feed"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-xs text-slate-500">Membuka lemari arsip logging audit...</p>
          </div>
        ) : logs.length === 0 ? (
          <p className="py-20 text-center text-slate-400">Belum ada aktivitas tercatat pada sistem ini.</p>
        ) : (
          <div className="overflow-y-auto max-h-[400px] divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition flex items-start justify-between gap-6 text-xs">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium">{log.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-semibold font-mono">
                    <span className="flex items-center gap-1 text-slate-500">
                      <UserCheck className="h-3.5 w-3.5 text-blue-500" />
                      {log.username} ({log.role})
                    </span>
                    <span>IP: {log.ip_address}</span>
                  </div>
                </div>
                <div className="text-right hidden sm:block max-w-[200px] truncate font-mono text-[9px] text-slate-400" title={log.user_agent}>
                  {log.user_agent}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
