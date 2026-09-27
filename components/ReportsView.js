'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { BarChart3, TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight, FileText, Users, Briefcase, DollarSign, Package, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ReportsView({ user }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [activeTab, setActiveTab] = useState('summary');

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

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
          <TabsTrigger value="pnl" className="text-xs sm:text-sm">Profit & Loss</TabsTrigger>
          <TabsTrigger value="services" className="text-xs sm:text-sm">Service Report</TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs sm:text-sm">Delivery Tracking</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4 sm:space-y-6 mt-4">
          {/* Financial Stats */}
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
                  <p className="text-xs sm:text-sm text-muted-foreground">Projected Revenue</p>
                  <p className="text-xl sm:text-3xl font-bold truncate">{formatBDT(report.summary.totalProjected)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:pt-6">
                  <p className="text-xs sm:text-sm text-muted-foreground">Confirmed Revenue</p>
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

          {/* Status & Deliverable Charts */}
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
                        <p className="text-xs text-muted-foreground">
                          {campaign.clientCode ? `${campaign.clientName} (${campaign.clientCode})` : campaign.clientName}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">
                          {campaign.status}
                        </Badge>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-medium">{formatBDT(campaign.totalEarned)} / {formatBDT(campaign.totalProjected)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="pnl" className="space-y-4 sm:space-y-6 mt-4">
          {/* PnL Summary Cards */}
          {report?.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-emerald-600" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Revenue</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-600 truncate">{formatBDT(report.summary.totalEarned)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown size={14} className="text-red-600" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Agency Cost</p>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">{formatBDT(report.summary.totalAgencyCost || 0)}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={14} className="text-blue-600" />
                    <p className="text-xs sm:text-sm text-muted-foreground">Net Profit</p>
                  </div>
                  <p className={`text-xl sm:text-2xl font-bold truncate ${(report.summary.totalNetProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatBDT(report.summary.totalNetProfit || 0)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-3 sm:pt-6">
                  <p className="text-xs sm:text-sm text-muted-foreground">Profit Margin</p>
                  <p className={`text-xl sm:text-2xl font-bold ${(report.summary.profitMargin || 0) >= 50 ? 'text-emerald-600' : (report.summary.profitMargin || 0) >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                    {report.summary.profitMargin || 0}%
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Client-wise PnL Table */}
          {report?.clientBreakdown && report.clientBreakdown.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Users size={16} /> Client-wise Profit & Loss
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 sm:py-3 px-3 font-medium">Client</th>
                        <th className="text-right py-2 sm:py-3 px-2 font-medium">Revenue</th>
                        <th className="text-right py-2 sm:py-3 px-2 font-medium">Agency Cost</th>
                        <th className="text-right py-2 sm:py-3 px-2 font-medium">Net Profit</th>
                        <th className="text-right py-2 sm:py-3 px-3 font-medium">Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.clientBreakdown.map((client, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2 sm:py-3 px-3 font-medium">
                            <div className="truncate max-w-[150px]">{client.displayName || client.clientName}</div>
                            <div className="text-xs text-muted-foreground">{client.campaigns} campaign(s)</div>
                          </td>
                          <td className="py-2 sm:py-3 px-2 text-right text-emerald-600">{formatBDT(client.earned)}</td>
                          <td className="py-2 sm:py-3 px-2 text-right text-red-600">{formatBDT(client.agencyCost || 0)}</td>
                          <td className={`py-2 sm:py-3 px-2 text-right font-semibold ${(client.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatBDT(client.netProfit || 0)}
                          </td>
                          <td className="py-2 sm:py-3 px-3 text-right">
                            <Badge variant={(client.margin || 0) >= 50 ? 'default' : (client.margin || 0) >= 25 ? 'secondary' : 'destructive'} className="text-xs">
                              {client.margin || 0}%
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

          {/* Campaign PnL */}
          {report?.campaigns && report.campaigns.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Briefcase size={16} /> Campaign-wise Profit & Loss
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 sm:py-3 px-3 font-medium">Campaign</th>
                        <th className="text-left py-2 sm:py-3 px-2 font-medium">Client</th>
                        <th className="text-right py-2 sm:py-3 px-2 font-medium">Revenue</th>
                        <th className="text-right py-2 sm:py-3 px-2 font-medium">Agency Cost</th>
                        <th className="text-right py-2 sm:py-3 px-3 font-medium">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.campaigns.map((campaign, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2 sm:py-3 px-3 font-medium truncate max-w-[150px]">{campaign.name}</td>
                          <td className="py-2 sm:py-3 px-2 text-muted-foreground truncate max-w-[120px]">
                            {campaign.clientCode ? `${campaign.clientName} (${campaign.clientCode})` : campaign.clientName}
                          </td>
                          <td className="py-2 sm:py-3 px-2 text-right text-emerald-600">{formatBDT(campaign.totalEarned)}</td>
                          <td className="py-2 sm:py-3 px-2 text-right text-red-600">{formatBDT(campaign.totalAgencyCost || 0)}</td>
                          <td className={`py-2 sm:py-3 px-3 text-right font-semibold ${(campaign.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatBDT(campaign.netProfit || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Service Report Tab */}
        <TabsContent value="services" className="space-y-4 sm:space-y-6 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Package size={16} /> Monthly Service Breakdown
              </CardTitle>
              <p className="text-xs text-muted-foreground">Client/Project-wise task summary</p>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {report?.serviceBreakdown && report.serviceBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 sm:py-3 px-3 font-medium">Client/Project</th>
                        <th className="text-left py-2 sm:py-3 px-2 font-medium">Service Type</th>
                        <th className="text-left py-2 sm:py-3 px-2 font-medium">Service Name</th>
                        <th className="text-center py-2 sm:py-3 px-2 font-medium">Delivered / Target</th>
                        <th className="text-right py-2 sm:py-3 px-2 font-medium">Rate/Service</th>
                        <th className="text-right py-2 sm:py-3 px-3 font-medium">Total Bill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.serviceBreakdown.map((item, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-2 sm:py-3 px-3">
                            <div className="font-medium truncate max-w-[120px]">{item.clientDisplayName}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">{item.campaignName}</div>
                          </td>
                          <td className="py-2 sm:py-3 px-2">
                            <Badge variant="secondary" className="text-xs">{item.serviceType}</Badge>
                          </td>
                          <td className="py-2 sm:py-3 px-2 truncate max-w-[120px]">{item.serviceName}</td>
                          <td className="py-2 sm:py-3 px-2 text-center">
                            <span className={item.deliveredCount >= item.targetCount ? 'text-emerald-600' : 'text-amber-600'}>
                              {item.deliveredCount}
                            </span>
                            <span className="text-muted-foreground"> / {item.targetCount}</span>
                          </td>
                          <td className="py-2 sm:py-3 px-2 text-right">{formatBDT(item.ratePerService)}</td>
                          <td className="py-2 sm:py-3 px-3 text-right font-semibold text-emerald-600">{formatBDT(item.totalBill)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/50">
                        <td colSpan={5} className="py-2 sm:py-3 px-3 font-semibold text-right">Total Month-End Bill:</td>
                        <td className="py-2 sm:py-3 px-3 text-right font-bold text-lg text-emerald-600">
                          {formatBDT(report.serviceBreakdown.reduce((sum, item) => sum + item.totalBill, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="mx-auto mb-3" size={36} />
                  <p>No service data for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Tracking Tab */}
        <TabsContent value="delivery" className="space-y-4 sm:space-y-6 mt-4">
          {/* User Delivery Stats */}
          {report?.deliveryByUser && report.deliveryByUser.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <UserCheck size={16} /> Delivery Count by User
                </CardTitle>
                <p className="text-xs text-muted-foreground">Who changed delivery statuses and how many</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.deliveryByUser.map((userStats, i) => (
                    <div key={i} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {userStats.userName?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{userStats.userName}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">{userStats.statusChanges}</span> changes
                            </span>
                            <span className="text-xs text-emerald-600">
                              <span className="font-semibold">{userStats.toDelivered}</span> delivered
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Delivery Changes */}
          {report?.deliveryLogs && report.deliveryLogs.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-sm sm:text-base">Recent Status Changes</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <div className="divide-y">
                  {report.deliveryLogs.map((log, i) => (
                    <div key={i} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm">{log.details}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{log.userName}</Badge>
                          {log.oldStatus && log.newStatus && (
                            <span className="text-xs text-muted-foreground">
                              {log.oldStatus} → <span className={log.newStatus === 'delivered' ? 'text-emerald-600 font-medium' : ''}>{log.newStatus}</span>
                            </span>
                          )}
                        </div>
                        {log.campaignName && (
                          <p className="text-xs text-muted-foreground mt-1">{log.campaignName} • {log.clientName}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(log.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!report?.deliveryByUser || report.deliveryByUser.length === 0) && (!report?.deliveryLogs || report.deliveryLogs.length === 0) && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <UserCheck className="mx-auto mb-3" size={36} />
                <p>No delivery tracking data available</p>
                <p className="text-xs mt-1">Status changes will appear here when team members update deliverables</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {report?.campaigns?.length === 0 && activeTab === 'summary' && (
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
