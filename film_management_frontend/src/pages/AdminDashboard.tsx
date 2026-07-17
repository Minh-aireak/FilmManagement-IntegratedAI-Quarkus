import React, { useEffect, useState } from 'react';
import { 
  Ticket, DollarSign, 
  TrendingUp, Calendar, Clock
} from 'lucide-react';
import { movieService } from '../services/movie.service';
import { type DashboardStatsResponse } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isLoading, setIsLoading] = useState(true);

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7'];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const [year, month] = selectedMonth.split('-').map(Number);
        const statsData = await movieService.getDashboardStats(month, year);
        setStats(statsData);
      } catch (error) {
        console.error('Dashboard error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, [selectedMonth]);

  const statCards = [
    { label: 'Số phim chiếu', value: stats?.totalMovies || 0, icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Vé đã đặt', value: stats?.totalTickets || 0, icon: Ticket, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Tổng doanh thu', value: `${(stats?.totalRevenue || 0).toLocaleString()}đ`, icon: DollarSign, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Dashboard Header & Month Picker */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-gradient-to-br from-neutral-900 to-neutral-950 p-8 rounded-[2rem] border border-neutral-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
            <TrendingUp className="w-10 h-10 text-green-500" /> Dashboard
          </h1>
        </div>
        <div className="relative z-10 flex flex-col gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-3 bg-neutral-800/80 backdrop-blur-xl p-4 rounded-2xl border border-neutral-700/50 hover:border-green-500/50 transition-all shadow-inner group/input">
            <Calendar className="w-5 h-5 text-green-500 group-hover/input:scale-110 transition-transform" />
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white outline-none font-black cursor-pointer appearance-none uppercase tracking-tight"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-neutral-900 p-8 rounded-[2rem] border border-neutral-800 shadow-xl group hover:border-green-500/30 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 rounded-full group-hover:bg-green-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-4 rounded-2xl ${card.bgColor} group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-7 h-7 ${card.color}`} />
              </div>
              <div className="text-xs font-black text-green-500 uppercase tracking-widest bg-green-500/10 px-4 py-1.5 rounded-full border border-green-500/20 shadow-[0_0_15px_-3px_rgba(34,197,94,0.2)]">Tháng {selectedMonth.split('-')[1]}</div>
            </div>
            <div className="relative z-10">
              <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider">{card.label}</p>
              <h3 className="text-4xl font-black text-white mt-2 italic tracking-tighter group-hover:text-green-500 transition-colors">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Phim xem nhiều nhất Chart */}
        <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-green-500/5 blur-[100px] -ml-32 -mt-32 rounded-full" />
          <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10 italic uppercase tracking-tighter">
            <TrendingUp className="w-6 h-6 text-green-500" /> Phim xem nhiều nhất
          </h3>
          <div className="h-[400px] w-full relative z-10">
            {stats?.topMovies && stats.topMovies.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topMovies} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="movieName" 
                    type="category" 
                    width={180} 
                    tick={{ fill: '#fff', fontSize: 15, fontWeight: '900' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                    formatter={(value: any) => [value, 'Số vé đã bán']}
                    labelStyle={{ color: '#fff', marginBottom: '4px' }}
                  />
                  <Bar dataKey="ticketCount" name="Số vé đã bán" radius={[0, 10, 10, 0]} barSize={30}>
                    {stats.topMovies.map((movie, index) => (
                      <Cell key={`cell-${movie.idMovie}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 italic">Không có dữ liệu phim</div>
            )}
          </div>
        </div>

        {/* Khung giờ phổ biến Chart */}
        <div className="bg-neutral-900 rounded-[2.5rem] border border-neutral-800 p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-green-500/5 blur-[100px] -mr-32 -mb-32 rounded-full" />
          <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3 relative z-10 italic uppercase tracking-tighter">
            <Clock className="w-6 h-6 text-green-500" /> Khung giờ phổ biến
          </h3>
          <div className="h-[400px] w-full relative z-10 flex flex-col items-center">
            {stats?.topTimeSlots && stats.topTimeSlots.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie
                      data={stats.topTimeSlots}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="label"
                    >
                      {stats.topTimeSlots.map((slot, index) => (
                        <Cell key={`cell-${slot.count}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-6 w-full px-4">
                  {stats.topTimeSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex flex-col">
                        <span className="text-xs text-neutral-300 font-black uppercase tracking-wider">{slot.label}</span>
                        <span className="text-sm text-white font-black">{slot.count} vé</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-neutral-500 italic">Không có dữ liệu khung giờ</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
