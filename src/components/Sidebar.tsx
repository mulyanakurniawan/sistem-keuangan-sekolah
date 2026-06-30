import {
  LayoutDashboard,
  Users,
  CreditCard,
  Layers,
  FileSpreadsheet,
  History,
  LogOut,
  UserCheck,
  Calendar,
  Wallet
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ user, currentView, setView, onLogout }: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['Admin', 'Bendahara', 'Kepala Sekolah']
    },
    {
      id: 'students',
      label: 'Data Siswa',
      icon: Users,
      roles: ['Admin', 'Bendahara', 'Kepala Sekolah']
    },
    {
      id: 'payments',
      label: 'Transaksi Pembayaran',
      icon: CreditCard,
      roles: ['Admin', 'Bendahara', 'Kepala Sekolah']
    },
    {
      id: 'payment-types',
      label: 'Jenis Pembayaran',
      icon: Layers,
      roles: ['Admin', 'Bendahara']
    },
    {
      id: 'reports',
      label: 'Rekap & Laporan',
      icon: FileSpreadsheet,
      roles: ['Admin', 'Bendahara', 'Kepala Sekolah']
    },
    {
      id: 'settings',
      label: 'Audit & Backup',
      icon: History,
      roles: ['Admin', 'Bendahara', 'Kepala Sekolah']
    }
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-800 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight">SI-KEU</h1>
          <p className="text-xs text-slate-400 font-medium">Finansial Sekolah</p>
        </div>
      </div>

      {/* Profile Widget */}
      <div className="p-4 mx-4 my-4 bg-slate-800/50 rounded-xl border border-slate-800/80 flex items-center gap-3">
        <div className="bg-slate-700 h-10 w-10 rounded-full flex items-center justify-center text-blue-400 font-semibold border border-slate-600">
          {user.nama_lengkap.substring(0, 2).toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold truncate text-slate-100">{user.nama_lengkap}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1">
        {filteredMenu.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Logout */}
      <div className="p-4 border-t border-slate-800 flex flex-col gap-2">
        <div className="text-[10px] text-slate-500 flex items-center justify-between px-2 font-mono">
          <span>Server: v1.0.0</span>
          <span>Online</span>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all duration-200"
        >
          <LogOut className="h-4 w-4" />
          Keluar Sistem
        </button>
      </div>
    </aside>
  );
}
