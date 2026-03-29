'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Megaphone, Calendar, CalendarDays, X } from 'lucide-react';

export default function CampaignsView({ user, navigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => { 
    loadCampaigns(); 
  }, [dateFilter, selectedMonth, customStartDate, customEndDate]);

  const loadCampaigns = async () => {
    try {
      let params = '';
      if (dateFilter === 'month' && selectedMonth) {
        params = `?month=${selectedMonth}`;
      } else if (dateFilter === 'custom' && customStartDate) {
        params = `?startDate=${customStartDate}`;
        if (customEndDate) params += `&endDate=${customEndDate}`;
      }
      const res = await apiFetch('GET', `campaigns${params}`);
      let filteredCampaigns = res.campaigns || [];
      if (dateFilter === 'custom' && customStartDate) {
        filteredCampaigns = filteredCampaigns.filter(c => {
          if (!c.startDate && !c.endDate) return true;
          const campStart = c.startDate ? new Date(c.startDate) : new Date('1970-01-01');
          const campEnd = c.endDate ? new Date(c.endDate) : new Date('2099-12-31');
          const filterStart = new Date(customStartDate);
          const filterEnd = customEndDate ? new Date(customEndDate) : new Date('2099-12-31');
          return campStart <= filterEnd && campEnd >= filterStart;
        });
      }
      setCampaigns(filteredCampaigns);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (dateFilter === 'month' && !selectedMonth) {
      setSelectedMonth(new Date().toISOString().substring(0, 7));
    }
  }, [dateFilter]);

  const filtered = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    return true;
  });

  const isAdmin = user.role !== 'team_member';

  const clearFilters = () => {
    setDateFilter('all');
    setSelectedMonth('');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const formatMonthLabel = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{isAdmin ? 'Campaigns' : 'My Campaigns'}</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? 'Manage all campaigns' : 'Campaigns assigned to you'}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('campaign-create')} size="sm" className="w-full sm:w-auto">
            <Plus size={16} className="mr-2" /> New Campaign
          </Button>
        )}
      </div>

      {/* Filters - Responsive */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="retainer">Retainer</SelectItem>
              <SelectItem value="one-time">One-time</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <CalendarDays size={14} className="mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {(dateFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="flex-shrink-0">
              <X size={14} className="mr-1" /> Clear
            </Button>
          )}
        </div>

        {/* Month Picker */}
        {dateFilter === 'month' && (
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)}
            className="w-full sm:w-44"
          />
        )}

        {/* Custom Date Range */}
        {dateFilter === 'custom' && (
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <Input 
              type="date" 
              value={customStartDate} 
              onChange={e => setCustomStartDate(e.target.value)}
              className="w-full sm:w-40"
              placeholder="Start date"
            />
            <span className="text-muted-foreground hidden sm:inline">to</span>
            <Input 
              type="date" 
              value={customEndDate} 
              onChange={e => setCustomEndDate(e.target.value)}
              className="w-full sm:w-40"
              placeholder="End date"
            />
          </div>
        )}
      </div>

      {/* Active Filter Display */}
      {dateFilter !== 'all' && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <CalendarDays size={14} />
          {dateFilter === 'month' && selectedMonth && (
            <span>Showing campaigns active in <strong>{formatMonthLabel(selectedMonth)}</strong></span>
          )}
          {dateFilter === 'custom' && customStartDate && (
            <span>
              Showing campaigns from <strong>{customStartDate}</strong>
              {customEndDate && <> to <strong>{customEndDate}</strong></>}
            </span>
          )}
        </div>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 sm:h-32 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <Megaphone className="mx-auto mb-3" size={36} />
          <p>No campaigns found</p>
          {dateFilter !== 'all' && (
            <p className="text-sm mt-2">Try adjusting your date filter</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => {
            const pct = campaign.totalProjected > 0 ? Math.round((campaign.totalEarned / campaign.totalProjected) * 100) : 0;
            return (
              <Card key={campaign.id} className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`campaign-detail/${campaign.id}`)}>
                <CardContent className="p-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Icon - Hidden on mobile */}
                    <div className="hidden sm:flex w-10 h-10 bg-blue-100 rounded-lg items-center justify-center flex-shrink-0">
                      <Megaphone className="text-blue-600" size={18} />
                    </div>
                    
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                        <Badge className={`text-xs ${getStatusColor(campaign.status)}`}>{getStatusLabel(campaign.status)}</Badge>
                        <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">{campaign.type}</Badge>
                        {campaign.isRenewable && <Badge className="bg-blue-100 text-blue-700 text-xs">Renewable</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                        <span>{campaign.clientName}</span>
                        {campaign.startDate && (
                          <span className="flex items-center gap-1 hidden sm:flex">
                            <Calendar size={12} /> {campaign.startDate} - {campaign.endDate || 'Ongoing'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Financial & Progress */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 mt-2 sm:mt-0">
                      {isAdmin && (
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="font-semibold text-sm">{formatBDT(campaign.totalEarned)}</p>
                          <p className="text-xs text-muted-foreground">of {formatBDT(campaign.totalProjected)}</p>
                        </div>
                      )}
                      <div className="w-24 sm:w-32 flex-shrink-0">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                          <div 
                            className={`h-1.5 sm:h-2 rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right mt-0.5">{pct}%</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
