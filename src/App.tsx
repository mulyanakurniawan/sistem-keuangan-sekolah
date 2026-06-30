import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ShieldAlert,
  Sun,
  Moon,
  Lock,
  User,
  CheckCircle,
  HelpCircle,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import StudentsView from './components/StudentsView';
import PaymentTypesView from './components/PaymentTypesView';
import PaymentsView from './components/PaymentsView';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import { User as AuthUser } from './types';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string>(''); // Holds user.id as session identifier
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Layout states
  const [currentView, setView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Restore session on load
  useEffect(() => {
    const savedSession = localStorage.getItem('school_fin_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setCurrentUser(parsed);
        setToken(parsed.id);
      } catch (e) {
        localStorage.removeItem('school_fin_session');
      }
    }

    // Toggle body background
    document.body.className = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  }, [darkMode]);

  // Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle manual login form
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!loginUsername || !loginPassword) {
      setAuthError('Isi seluruh kolom username dan password!');
      return;
    }

    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login gagal!');
      }

      // Success
      setCurrentUser(data);
      setToken(data.id);
      localStorage.setItem('school_fin_session', JSON.stringify(data));
      setView('dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Koneksi ke server gagal!');
    } finally {
      setAuthLoading(false);
    }
  };

  // Quick Login pre-filler helper for easy evaluation!
  const handleQuickLogin = (role: 'Admin' | 'Bendahara' | 'Kepala Sekolah') => {
    setAuthError('');
    if (role === 'Admin') {
      setLoginUsername('admin');
      setLoginPassword('admin');
    } else if (role === 'Bendahara') {
      setLoginUsername('bendahara');
      setLoginPassword('bendahara');
    } else {
      setLoginUsername('kepsek');
      setLoginPassword('kepsek');
    }
  };

  // Perform logout
  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari sistem keuangan sekolah?')) {
      setCurrentUser(null);
      setToken('');
      localStorage.removeItem('school_fin_session');
      setView('dashboard');
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Renders correct main backoffice screen based on state routing
  const renderMainContent = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case 'dashboard':
        return <DashboardView user={currentUser} token={token} />;
      case 'students':
        return <StudentsView user={currentUser} token={token} />;
      case 'payment-types':
        return <PaymentTypesView user={currentUser} token={token} />;
      case 'payments':
        return <PaymentsView user={currentUser} token={token} />;
      case 'reports':
        return <ReportsView user={currentUser} token={token} />;
      case 'settings':
        return (
          <SettingsView
            user={currentUser}
            token={token}
            darkMode={darkMode}
            toggleDarkMode={toggleDarkMode}
            onDbRestoreSuccess={() => setView('dashboard')}
          />
        );
      default:
        return <DashboardView user={currentUser} token={token} />;
    }
  };

  // ==========================================
  // VIEW 1: LOGIN PAGE (UNAUTHENTICATED)
  // ==========================================
  if (!currentUser) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 transition-all duration-300 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/60 text-slate-800'
      }`}>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800/80">
          
          {/* Left panel: Info Illustration Box */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl"></div>

            <div className="flex items-center gap-2.5 z-10">
              <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md">
                <Wallet className="h-6 w-6 text-blue-200" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg leading-tight">SI-KEU</h1>
                <p className="text-[10px] text-blue-200 uppercase tracking-widest font-semibold">Keuangan Sekolah</p>
              </div>
            </div>

            <div className="space-y-4 my-12 z-10">
              <h2 className="text-2xl font-bold leading-tight">Sistem Manajemen Keuangan Sekolah Modern</h2>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Kelola pembayaran SPP bulanan, uang gedung, ujian semester, serta penyusunan laporan keuangan otomatis dan reminder tunggakan terintegrasi.
              </p>
            </div>

            <div className="border-t border-white/10 pt-6 z-10 text-[10px] text-blue-200/80 flex justify-between items-center font-mono">
              <span>Demo Versi: 1.0.0</span>
              <span>Supabase Engine</span>
            </div>
          </div>

          {/* Right panel: Login & Quick Access Forms */}
          <div className="lg:col-span-7 p-8 lg:p-12 flex flex-col justify-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Masuk ke Sistem</h2>
              <p className="text-slate-500 text-xs mt-1">Masukkan ID akses Anda untuk masuk ke sistem backoffice keuangan.</p>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-center gap-2.5 font-medium">
                <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-xs">
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1.5">Username Akses</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: admin, bendahara"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 pl-10 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                </div>
              </div>

              <div className="text-xs">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="font-bold text-slate-600 dark:text-slate-300">Kata Sandi (Password)</label>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 pl-10 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                  <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-500/10 transition flex items-center justify-center gap-2"
              >
                {authLoading ? 'Memvalidasi akses...' : 'Masuk Sistem'}
              </button>
            </form>

            {/* Quick Access Sandbox Logins Box */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-3">Akun Akses Cepat Simulator</span>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('Admin')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition flex flex-col items-center text-center gap-1"
                >
                  <span className="text-[10px] text-blue-600 font-extrabold uppercase">Admin</span>
                  <span className="text-[9px] text-slate-400 font-medium">Full Access</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('Bendahara')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition flex flex-col items-center text-center gap-1"
                >
                  <span className="text-[10px] text-emerald-600 font-extrabold uppercase">Bendahara</span>
                  <span className="text-[9px] text-slate-400 font-medium">Billing & Input</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('Kepala Sekolah')}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition flex flex-col items-center text-center gap-1"
                >
                  <span className="text-[10px] text-purple-600 font-extrabold uppercase">Kepsek</span>
                  <span className="text-[9px] text-slate-400 font-medium">Read Only</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MAIN PANEL LAYOUT (AUTHENTICATED)
  // ==========================================
  const viewTitles: Record<string, string> = {
    dashboard: 'Dasbor Analisis Finansial',
    students: 'Kelola Arsip Siswa',
    'payment-types': 'Komponen Tarif Keuangan',
    payments: 'Loket Transaksi Kasir',
    reports: 'Laporan & Buku Kas Bulanan',
    settings: 'Pengaturan Sistem & Audit'
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-200 ${
      darkMode ? 'bg-slate-950 text-slate-100 dark' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Left Sidebar navigation */}
      <Sidebar user={currentUser} currentView={currentView} setView={setView} onLogout={handleLogout} />

      {/* Right Core Workspace Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Header Panel (Hidden in print to save space!) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800/80 px-8 flex items-center justify-between shrink-0 print:hidden transition">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">{viewTitles[currentView] || 'Aplikasi'}</h2>
            <span className="inline-block h-4 w-px bg-slate-200 dark:border-slate-800"></span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick stats component */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 rounded-lg text-[10px] font-bold border border-blue-100 dark:border-blue-900/30">
              <Calendar className="h-3.5 w-3.5" />
              <span>SMA PLUS BABUSSALAM</span>
            </div>

            {/* Dark Mode toggler */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition"
              title="Beralih tema warna"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Core dynamic body workspace panel */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}
