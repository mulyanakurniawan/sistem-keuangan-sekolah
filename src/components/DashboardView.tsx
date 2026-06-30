import { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Users,
  Wallet,
  Calendar,
  CheckCircle,
  Clock,
  ArrowRightLeft,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { User, DashboardStats } from '../types';

interface DashboardViewProps {
  user: User;
  token: string;
}

export default function DashboardView({ user, token }: DashboardViewProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch stats
        const statsRes = await fetch('/api/dashboard/stats', {
          headers: { 'X-User-ID': token }
        });
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch charts
        const chartsRes = await fetch('/api/dashboard/charts', {
          headers: { 'X-User-ID': token }
        });
        const chartsData = await chartsRes.json();
        setCharts(chartsData);

        // Fetch logs (for quick feed)
        const logsRes = await fetch('/api/system/logs', {
          headers: { 'X-User-ID': token }
        });
        const logsData = await logsRes.json();
        setLogs(logsData.slice(0, 5)); // get top 5 logs
      } catch (err) {
        console.error('Error fetching dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-slate-500">Memuat analisis keuangan...</p>
        </div>
      </div>
    );
  }

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  // KPI Card Config
  const kpis = [
    {
      title: 'Pemasukan Hari Ini',
      value: stats ? formatRupiah(stats.totalPemasukanHariIni) : 'Rp 0',
      description: 'Total transaksi masuk hari ini',
      icon: Wallet,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20'
    },
    {
      title: `Pemasukan Bulan Ini (${stats?.currentMonth || ''})`,
      value: stats ? formatRupiah(stats.totalPemasukanBulanIni) : 'Rp 0',
      description: 'Pemasukan terkumpul bulan ini',
      icon: TrendingUp,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-500/20'
    },
    {
      title: `Pemasukan Tahun Ini (${stats?.currentYear || ''})`,
      value: stats ? formatRupiah(stats.totalPemasukanTahunIni) : 'Rp 0',
      description: 'Akumulasi tahun ajaran berjalan',
      icon: DollarSign,
      color: 'from-purple-500/10 to-pink-500/10 text-purple-600 border-purple-500/20'
    },
    {
      title: 'Total Tunggakan Aktif',
      value: stats ? formatRupiah(stats.totalTunggakanAktif) : 'Rp 0',
      description: 'Piutang tagihan belum lunas',
      icon: AlertTriangle,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-500/20'
    }
  ];

  return (
    <div className="space-y-6" id="dashboard-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Statistik</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Selamat datang kembali, <span className="font-semibold text-slate-700">{user.nama_lengkap}</span>. Berikut ikhtisar kondisi keuangan sekolah saat ini.
          </p>
        </div>
        <div className="bg-slate-100/80 px-4 py-2 rounded-xl border border-slate-200/80 flex items-center gap-2 self-start md:self-auto text-xs text-slate-600 font-semibold font-mono">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span>Tahun Ajaran: 2025/2026</span>
        </div>
      </div>

      {/* Grid KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`bg-white p-5 rounded-2xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden`}
              id={`kpi-card-${idx}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{kpi.title}</p>
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900 mt-2">{kpi.value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                <Clock className="h-3 w-3 text-slate-400" />
                {kpi.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between" id="monthly-revenue-chart">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Grafik Pemasukan Bulanan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Analisis tren pembayaran SPP & tagihan lain tahun {stats?.currentYear}</p>
          </div>
          <div className="h-72 mt-6">
            {charts?.monthlyRevenue && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyRevenue} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(tick) => `Rp ${tick >= 1000000 ? (tick / 1000000) + 'jt' : tick.toLocaleString('id-ID')}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatRupiah(value as number), 'Total Masuk']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="nominal" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNominal)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Payment Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between" id="payment-status-chart">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Status Pembayaran Tagihan</h3>
            <p className="text-xs text-slate-500 mt-0.5">Rasio Lunas, Cicilan, & Belum Lunas seluruh siswa</p>
          </div>
          <div className="h-56 flex items-center justify-center relative mt-4">
            {charts?.paymentStatusDist && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.paymentStatusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {charts.paymentStatusDist.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} tagihan`, 'Total']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Pie Chart Legend with labels */}
          <div className="space-y-2 mt-4">
            {charts?.paymentStatusDist?.map((entry: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="font-medium text-slate-600">{entry.name}</span>
                </div>
                <span className="font-bold text-slate-800">{entry.value} Transaksi</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Base Revenue & Due Breakdown */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm" id="class-breakdown-chart">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Realisasi Keuangan per Kelas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Perbandingan Pemasukan (Lunas/Cicil) dan Sisa Piutang (Tunggakan)</p>
          </div>
          <div className="h-64 mt-6">
            {charts?.revenueByClass && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.revenueByClass} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="class" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(tick) => `Rp ${tick >= 1000000 ? (tick / 1000000) + 'jt' : tick.toLocaleString('id-ID')}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatRupiah(value as number)]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Tunggakan" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Audit Trail Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between" id="dashboard-audit-logs">
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Aktivitas Sistem Terkini</h3>
            <p className="text-xs text-slate-500 mt-0.5">Jejak audit 5 peristiwa terakhir</p>
          </div>
          <div className="mt-4 flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[250px] pr-2">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Belum ada aktivitas terekam.</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      {log.action}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{log.description}</p>
                  <p className="text-[9px] text-slate-400 font-semibold mt-1">Oleh: {log.username} ({log.role})</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
