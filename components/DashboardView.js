'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch, formatBDT } from '@/lib/api';
import { TrendingUp, DollarSign, Clock, CheckCircle, BarChart3, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import DateFilter from '@/components/DateFilter';

export default function DashboardView({ user, navigate }) {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => { loadDashboard(); }, [dateRange]);

  const loadDashboard = async () => {
    try {
      const dateParam = dateRange !== 'all' ? `?dateRange=${dateRange}` : '';
      const chartParam = dateRange !== 'all' ? `?dateRange=${dateRange}` : '';
      const [dashRes, chartRes] = await Promise.all([
        apiFetch('GET', `dashboard${dateParam}`),
        user.role !== 'team_member' ? apiFetch('GET', `dashboard/revenue-chart${chartParam}`) : Promise.resolve({ chartData: [] })
      ]);
      setData(dashRes);
      setChartData(chartRes.chartData || []);
    } catch (err) { console.error('Dashboard error:', err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>;
  if (!data) return <div className="text-center py-10 text-muted-foreground">Failed to load dashboard</div>;

  const { financials, campaigns, clientBreakdown, deliverableStats, recentActivity } = data;
  const isAdmin = user.role !== 'team_member';
  const progressPercent = deliverableStats?.total > 0 ? Math.round((deliverableStats.delivered / deliverableStats.total) * 100) : 0;
  const pieData = deliverableStats ? [
    { name: 'Delivered', value: deliverableStats.delivered, color: '#10b981' },
    { name: 'Review', value: deliverableStats.review, color: '#3b82f6' },
    { name: 'In Progress', value: deliverableStats.inProgress, color: '#f59e0b' },
    { name: 'Pending', value: deliverableStats.pending, color: '#94a3b8' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">{user.role === 'super_admin' ? 'Multi-agency overview' : isAdmin ? 'Agency revenue overview' : 'Your campaign overview'}</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {isAdmin && financials && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Projected Revenue</p><p className="text-2xl font-bold text-slate-900">{formatBDT(financials.totalProjected)}</p></div><div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><TrendingUp className="text-blue-600" size={20} /></div></div><p className="text-xs text-muted-foreground mt-2">{financials.activeCampaigns} active campaigns</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Confirmed Revenue</p><p className="text-2xl font-bold text-emerald-600">{formatBDT(financials.totalEarned)}</p></div><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><DollarSign className="text-emerald-600" size={20} /></div></div><p className="text-xs text-emerald-600 mt-2">{financials.totalProjected > 0 ? Math.round((financials.totalEarned / financials.totalProjected) * 100) : 0}% of projected</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Pending Revenue</p><p className="text-2xl font-bold text-amber-600">{formatBDT(financials.totalPending)}</p></div><div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center"><Clock className="text-amber-600" size={20} /></div></div><p className="text-xs text-muted-foreground mt-2">Awaiting delivery</p></CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Deliverables Done</p><p className="text-2xl font-bold">{deliverableStats?.delivered || 0}/{deliverableStats?.total || 0}</p></div><div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><CheckCircle className="text-purple-600" size={20} /></div></div><div className="mt-2 w-full bg-gray-200 rounded-full h-2"><div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} /></div></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && chartData.length > 0 && (
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 size={18} /> Monthly Revenue</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={280}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="month" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} /><Tooltip formatter={(value) => [`${formatBDT(value)}`, '']} /><Legend /><Bar dataKey="projected" name="Projected" fill="#3b82f6" radius={[4,4,0,0]} /><Bar dataKey="earned" name="Confirmed" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        )}
        <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity size={18} /> Deliverable Status</CardTitle></CardHeader><CardContent>{pieData.length > 0 ? (<div className="flex items-center gap-4"><ResponsiveContainer width="50%" height={220}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>{pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="space-y-3">{pieData.map((item, i) => (<div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-sm">{item.name}: <strong>{item.value}</strong></span></div>))}</div></div>) : (<div className="text-center py-10 text-muted-foreground">No deliverables yet</div>)}</CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && clientBreakdown?.length > 0 && (
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Client Revenue Breakdown</CardTitle></CardHeader><CardContent><div className="space-y-4">{clientBreakdown.map((c, i) => (<div key={i} className="space-y-2"><div className="flex justify-between text-sm"><span className="font-medium">{c.clientName}</span><span className="text-muted-foreground">{formatBDT(c.earned)} / {formatBDT(c.projected)}</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${c.projected > 0 ? (c.earned / c.projected * 100) : 0}%` }} /></div></div>))}</div></CardContent></Card>
        )}
        {recentActivity?.length > 0 && (
          <Card className="border-0 shadow-sm"><CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader><CardContent><div className="space-y-3">{recentActivity.map((a, i) => (<div key={i} className="flex items-start gap-3 text-sm"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5"><span className="text-xs font-medium text-blue-600">{a.userName?.charAt(0)}</span></div><div className="flex-1 min-w-0"><p className="text-sm">{a.details}</p><p className="text-xs text-muted-foreground mt-0.5">{a.userName} &middot; {new Date(a.createdAt).toLocaleDateString()}</p></div></div>))}</div></CardContent></Card>
        )}
      </div>

      {campaigns?.length > 0 && (
        <Card className="border-0 shadow-sm"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">Active Campaigns</CardTitle><button onClick={() => navigate('campaigns')} className="text-sm text-blue-600 hover:underline">View all</button></CardHeader><CardContent><div className="space-y-3">{campaigns.map((c) => { const pct = c.totalProjected > 0 ? Math.round((c.totalEarned / c.totalProjected) * 100) : 0; return (<div key={c.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => navigate(`campaign-detail/${c.id}`)}><div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{c.name}</p><p className="text-xs text-muted-foreground">{c.clientName}</p></div>{isAdmin && (<div className="text-right"><p className="text-sm font-medium">{formatBDT(c.totalEarned)}</p><p className="text-xs text-muted-foreground">of {formatBDT(c.totalProjected)}</p></div>)}<div className="w-24"><div className="w-full bg-gray-100 rounded-full h-2"><div className={`h-2 rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} /></div><p className="text-xs text-muted-foreground text-right mt-1">{pct}%</p></div></div>); })}</div></CardContent></Card>
      )}
    </div>
  );
}
