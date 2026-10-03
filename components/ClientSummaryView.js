'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { Building2, Search, TrendingUp, TrendingDown, Package, Briefcase, ChevronRight, ArrowLeft, DollarSign } from 'lucide-react';

export default function ClientSummaryView({ user, navigate }) {
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetail, setClientDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('GET', 'client-summary');
      setClients(res.clients || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadClientDetail = async (clientId) => {
    setLoading(true);
    try {
      let url = `client-summary/${clientId}`;
      if (selectedMonth) url += `?month=${selectedMonth}`;
      const res = await apiFetch('GET', url);
      setClientDetail(res);
      setSelectedClient(clientId);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const filtered = clients.filter(c =>
    c.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    c.clientCode?.toLowerCase().includes(search.toLowerCase())
  );

  // Generate month options (last 12 months)
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = d.toISOString().substring(0, 7);
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ value, label });
  }

  if (selectedClient && clientDetail) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <button onClick={() => { setSelectedClient(null); setClientDetail(null); }} className="p-2 rounded-lg hover:bg-muted flex-shrink-0 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{clientDetail.client?.displayName}</h1>
            <p className="text-sm text-muted-foreground">Client Summary</p>
          </div>
          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); loadClientDetail(selectedClient); }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Time</SelectItem>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Projected Revenue</p>
              <p className="text-lg sm:text-2xl font-bold truncate">{formatBDT(clientDetail.summary?.totalProjected || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Confirmed Revenue</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">{formatBDT(clientDetail.summary?.totalEarned || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Agency Cost</p>
              <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">{formatBDT(clientDetail.summary?.totalAgencyCost || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Net Profit</p>
              <p className={`text-lg sm:text-2xl font-bold truncate ${(clientDetail.summary?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatBDT(clientDetail.summary?.netProfit || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content Breakdown */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Package size={16} /> Content-wise Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientDetail.contentBreakdown?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[500px]">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-3 font-medium">Service/Content</th>
                      <th className="text-center py-2 px-2 font-medium">Total</th>
                      <th className="text-center py-2 px-2 font-medium">Delivered</th>
                      <th className="text-center py-2 px-2 font-medium">In Progress</th>
                      <th className="text-center py-2 px-2 font-medium">Pending</th>
                      <th className="text-right py-2 px-3 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientDetail.contentBreakdown.map((item, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-2 px-3 font-medium">{item.serviceName}</td>
                        <td className="py-2 px-2 text-center">{item.total}</td>
                        <td className="py-2 px-2 text-center text-emerald-600 font-semibold">{item.delivered}</td>
                        <td className="py-2 px-2 text-center text-amber-600">{item.inProgress}</td>
                        <td className="py-2 px-2 text-center text-gray-500">{item.pending}</td>
                        <td className="py-2 px-3 text-right">{formatBDT(item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto mb-2" size={24} />
                <p>No content data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Briefcase size={16} /> Campaigns ({clientDetail.campaigns?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientDetail.campaigns?.length > 0 ? (
              <div className="space-y-2">
                {clientDetail.campaigns.map((campaign, i) => (
                  <div 
                    key={i} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2 cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate('campaign-detail', campaign.id)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{campaign.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs capitalize">{campaign.type}</Badge>
                        <Badge className={campaign.status === 'active' ? 'bg-emerald-100 text-emerald-800' : campaign.status === 'paused' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'} >{campaign.status}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Confirmed / Projected</p>
                        <p className="text-sm font-medium">
                          <span className="text-emerald-600">{formatBDT(campaign.totalEarned)}</span>
                          <span className="text-muted-foreground"> / {formatBDT(campaign.totalProjected)}</span>
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="mx-auto mb-2" size={24} />
                <p>No campaigns found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Client Summary</h1>
          <p className="text-sm text-muted-foreground">View campaign performance by client</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input className="pl-9" placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Client Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <Building2 className="mx-auto mb-3" size={36} />
          <p>No clients found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map(client => (
            <Card 
              key={client.clientId} 
              className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => loadClientDetail(client.clientId)}
            >
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="text-blue-600" size={20} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {client.activeCampaigns} active
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm mb-1 truncate">{client.clientName}</h3>
                {client.clientCode && (
                  <Badge variant="secondary" className="mb-3 text-xs font-mono">{client.clientCode}</Badge>
                )}
                
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Projected</p>
                    <p className="text-sm font-semibold truncate">{formatBDT(client.totalProjected)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confirmed</p>
                    <p className="text-sm font-semibold text-emerald-600 truncate">{formatBDT(client.totalEarned)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">Completion:</span>
                    <span className={`font-semibold ${client.completionRate >= 75 ? 'text-emerald-600' : client.completionRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {client.completionRate}%
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
