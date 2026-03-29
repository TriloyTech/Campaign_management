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
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{user.role === 'super_admin' ? 'Multi-agency overview' : isAdmin ? 'Agency revenue overview' : 'Your campaign overview'}</p>
        </div>
        <DateFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Financial Stats - Responsive grid */}
      {isAdmin && financials && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Projected Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900 truncate">{formatBDT(financials.totalProjected)}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <TrendingUp className="text-blue-600" size={16} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 hidden sm:block">{financials.activeCampaigns} active campaigns</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Confirmed Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">{formatBDT(financials.totalEarned)}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <DollarSign className="text-emerald-600" size={16} />
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-2 hidden sm:block">{financials.totalProjected > 0 ? Math.round((financials.totalEarned / financials.totalProjected) * 100) : 0}% of projected</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Pending Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-amber-600 truncate">{formatBDT(financials.totalPending)}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <Clock className="text-amber-600" size={16} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 hidden sm:block">Awaiting delivery</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 sm:pt-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">Deliverables Done</p>
                  <p className="text-lg sm:text-2xl font-bold">{deliverableStats?.delivered || 0}/{deliverableStats?.total || 0}</p>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                  <CheckCircle className="text-purple-600" size={16} />
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                <div className="bg-purple-600 h-1.5 sm:h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section - Stack on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {isAdmin && chartData.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <BarChart3 size={16} /> Monthly Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={40} />
                  <Tooltip formatter={(value) => [`${formatBDT(value)}`, '']} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="projected" name="Projected" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="earned" name="Confirmed" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Activity size={16} /> Deliverable Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {pieData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={180} className="sm:w-1/2">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 sm:space-y-3 w-full sm:w-auto">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs sm:text-sm">{item.name}: <strong>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">No deliverables yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {isAdmin && clientBreakdown?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Client Revenue Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                {clientBreakdown.map((c, i) => (
                  <div key={i} className="space-y-1.5 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="font-medium truncate flex-1 mr-2">{c.clientName}</span>
                      <span className="text-muted-foreground flex-shrink-0">{formatBDT(c.earned)} / {formatBDT(c.projected)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                      <div className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all" style={{ width: `${c.projected > 0 ? (c.earned / c.projected * 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {recentActivity?.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-blue-600">{a.userName?.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm line-clamp-2">{a.details}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.userName} &middot; {new Date(a.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Campaigns */}
      {campaigns?.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">Active Campaigns</CardTitle>
            <button onClick={() => navigate('campaigns')} className="text-xs sm:text-sm text-blue-600 hover:underline">View all</button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {campaigns.map((c) => {
                const pct = c.totalProjected > 0 ? Math.round((c.totalEarned / c.totalProjected) * 100) : 0;
                return (
                  <div key={c.id} 
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" 
                    onClick={() => navigate(`campaign-detail/${c.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.clientName}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {isAdmin && (
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatBDT(c.totalEarned)}</p>
                          <p className="text-xs text-muted-foreground">of {formatBDT(c.totalProjected)}</p>
                        </div>
                      )}
                      <div className="w-20 sm:w-24">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                          <div className={`h-1.5 sm:h-2 rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground text-right mt-0.5">{pct}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
