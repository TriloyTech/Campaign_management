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

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981'];

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="text-blue-600" /> Reports
          </h1>
          <p className="text-muted-foreground">Generate and view campaign reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Period Navigator */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigatePeriod(-1)}>
              <ChevronLeft size={20} />
            </Button>
            <div className="text-center">
              <p className="text-lg font-semibold">{formatPeriodLabel()}</p>
              {report?.periodStart && report?.periodEnd && (
                <p className="text-xs text-muted-foreground">
                  {report.periodStart} to {report.periodEnd}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigatePeriod(1)}>
              <ChevronRight size={20} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {report?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Campaigns</p>
              <p className="text-3xl font-bold">{report.summary.totalCampaigns}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Projected Revenue</p>
              <p className="text-3xl font-bold">{formatBDT(report.summary.totalProjected)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Confirmed Revenue</p>
              <p className="text-3xl font-bold text-emerald-600">{formatBDT(report.summary.totalEarned)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-3xl font-bold text-blue-600">{report.summary.completionRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Campaign Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.statusBreakdown && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span>Active</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{report.statusBreakdown.active}</span>
                    <span className="text-muted-foreground ml-2">({formatBDT(report.revenueByStatus?.active?.projected || 0)})</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Paused</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{report.statusBreakdown.paused}</span>
                    <span className="text-muted-foreground ml-2">({formatBDT(report.revenueByStatus?.paused?.projected || 0)})</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Completed</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{report.statusBreakdown.completed}</span>
                    <span className="text-muted-foreground ml-2">({formatBDT(report.revenueByStatus?.completed?.projected || 0)})</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Deliverable Progress</CardTitle>
          </CardHeader>
          <CardContent>
            {report?.deliverableStats && (
              <ResponsiveContainer width="100%" height={200}>
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
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

      {/* Client Breakdown */}
      {report?.clientBreakdown && report.clientBreakdown.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users size={18} /> Client Revenue Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium">Client</th>
                    <th className="text-right py-3 font-medium">Campaigns</th>
                    <th className="text-right py-3 font-medium">Projected</th>
                    <th className="text-right py-3 font-medium">Confirmed</th>
                    <th className="text-right py-3 font-medium">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {report.clientBreakdown.map((client, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 font-medium">{client.clientName}</td>
                      <td className="py-3 text-right">{client.campaigns}</td>
                      <td className="py-3 text-right">{formatBDT(client.projected)}</td>
                      <td className="py-3 text-right text-emerald-600">{formatBDT(client.earned)}</td>
                      <td className="py-3 text-right">
                        <Badge variant={client.projected > 0 && (client.earned / client.projected) >= 0.75 ? 'default' : 'secondary'}>
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
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase size={18} /> Campaigns in Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.campaigns.map((campaign, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">{campaign.clientName}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'}>
                      {campaign.status}
                    </Badge>
                    {campaign.isRenewable && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Renewable
                      </Badge>
                    )}
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatBDT(campaign.totalEarned)} / {formatBDT(campaign.totalProjected)}</p>
                      <p className="text-xs text-muted-foreground">{campaign.startDate} - {campaign.endDate || 'Ongoing'}</p>
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
          <CardContent className="py-16 text-center text-muted-foreground">
            <Calendar className="mx-auto mb-3" size={40} />
            <p>No campaigns found for this period</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
