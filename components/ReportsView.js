'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, Calendar, ChevronLeft, ChevronRight, FileText, Users, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ReportsView({ user }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));

  useEffect(() => {
    loadReport();
  }, [period, selectedDate]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('GET', `reports?period=${period}&date=${selectedDate}`);
      setReport(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const navigatePeriod = (direction) => {
    const date = new Date(selectedDate);
    if (period === 'month') {
      date.setMonth(date.getMonth() + direction);
    } else if (period === 'week') {
      date.setDate(date.getDate() + (7 * direction));
    } else {
      date.setDate(date.getDate() + direction);
    }
    setSelectedDate(date.toISOString().substring(0, 10));
  };

  const formatPeriodLabel = () => {
    const date = new Date(selectedDate);
    if (period === 'month') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (period === 'week') {
      const start = new Date(date.setDate(date.getDate() - date.getDay()));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 sm:h-32 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FileText className="text-blue-600" size={20} /> Reports
          </h1>
          <p className="text-sm text-muted-foreground">Generate and view campaign reports</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Period Navigator */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigatePeriod(-1)} className="p-2">
              <ChevronLeft size={18} />
            </Button>
            <div className="text-center flex-1 min-w-0 px-2">
              <p className="text-sm sm:text-lg font-semibold truncate">{formatPeriodLabel()}</p>
              {report?.periodStart && report?.periodEnd && (
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {report.periodStart} to {report.periodEnd}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigatePeriod(1)} className="p-2">
              <ChevronRight size={18} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {report?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Total Campaigns</p>
              <p className="text-xl sm:text-3xl font-bold">{report.summary.totalCampaigns}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Projected</p>
              <p className="text-xl sm:text-3xl font-bold truncate">{formatBDT(report.summary.totalProjected)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Confirmed</p>
              <p className="text-xl sm:text-3xl font-bold text-emerald-600 truncate">{formatBDT(report.summary.totalEarned)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Completion</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-600">{report.summary.completionRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown & Deliverable Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">Campaign Status</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.statusBreakdown && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm">Active</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{report.statusBreakdown.active}</span>
                    <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({formatBDT(report.revenueByStatus?.active?.projected || 0)})</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm">Paused</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{report.statusBreakdown.paused}</span>
                    <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({formatBDT(report.revenueByStatus?.paused?.projected || 0)})</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm">Completed</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{report.statusBreakdown.completed}</span>
                    <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">({formatBDT(report.revenueByStatus?.completed?.projected || 0)})</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base">Deliverable Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.deliverableStats && (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Delivered', value: report.deliverableStats.delivered, color: '#10b981' },
                      { name: 'In Progress', value: report.deliverableStats.inProgress, color: '#3b82f6' },
                      { name: 'Review', value: report.deliverableStats.review, color: '#f59e0b' },
                      { name: 'Pending', value: report.deliverableStats.pending, color: '#d1d5db' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: 'Delivered', value: report.deliverableStats.delivered, color: '#10b981' },
                      { name: 'In Progress', value: report.deliverableStats.inProgress, color: '#3b82f6' },
                      { name: 'Review', value: report.deliverableStats.review, color: '#f59e0b' },
                      { name: 'Pending', value: report.deliverableStats.pending, color: '#d1d5db' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client Breakdown Table */}
      {report?.clientBreakdown && report.clientBreakdown.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Users size={16} /> Client Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[450px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 sm:py-3 px-3 font-medium">Client</th>
                    <th className="text-right py-2 sm:py-3 px-2 font-medium">Campaigns</th>
                    <th className="text-right py-2 sm:py-3 px-2 font-medium">Projected</th>
                    <th className="text-right py-2 sm:py-3 px-2 font-medium">Confirmed</th>
                    <th className="text-right py-2 sm:py-3 px-3 font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.clientBreakdown.map((client, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 sm:py-3 px-3 font-medium truncate max-w-[120px]">{client.clientName}</td>
                      <td className="py-2 sm:py-3 px-2 text-right">{client.campaigns}</td>
                      <td className="py-2 sm:py-3 px-2 text-right">{formatBDT(client.projected)}</td>
                      <td className="py-2 sm:py-3 px-2 text-right text-emerald-600">{formatBDT(client.earned)}</td>
                      <td className="py-2 sm:py-3 px-3 text-right">
                        <Badge variant={client.projected > 0 && (client.earned / client.projected) >= 0.75 ? 'default' : 'secondary'} className="text-xs">
                          {client.projected > 0 ? Math.round((client.earned / client.projected) * 100) : 0}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      {report?.campaigns && report.campaigns.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Briefcase size={16} /> Campaigns in Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.campaigns.map((campaign, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground">{campaign.clientName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                      {campaign.status}
                    </Badge>
                    {campaign.isRenewable && (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                        Renewable
                      </Badge>
                    )}
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-medium">{formatBDT(campaign.totalEarned)} / {formatBDT(campaign.totalProjected)}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{campaign.startDate} - {campaign.endDate || 'Ongoing'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report?.campaigns?.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 sm:py-16 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3" size={36} />
            <p>No campaigns found for this period</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
