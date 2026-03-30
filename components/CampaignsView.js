'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Megaphone, Calendar, ChevronLeft, ChevronRight, Search, Pencil, Filter, X, Check, RefreshCw } from 'lucide-react';

export default function CampaignsView({ user, navigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Month navigation
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'all'
  
  // Edit dialog
  const [editDialog, setEditDialog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    loadCampaigns();
    loadClients();
  }, [selectedMonth, viewMode]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const params = viewMode === 'month' ? `?month=${selectedMonth}` : '';
      const res = await apiFetch('GET', `campaigns${params}`);
      setCampaigns(res.campaigns || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadClients = async () => {
    try {
      const res = await apiFetch('GET', 'clients');
      setClients(res.clients || []);
    } catch (err) { console.error(err); }
  };

  // Navigate months
  const navigateMonth = (direction) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, month - 1 + direction, 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonthDisplay = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get available months from campaigns for quick navigation
  const availableMonths = useMemo(() => {
    const months = new Set();
    campaigns.forEach(c => {
      if (c.startDate) months.add(c.startDate.substring(0, 7));
      if (c.endDate) months.add(c.endDate.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [campaigns]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!c.name?.toLowerCase().includes(q) && !c.clientName?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [campaigns, statusFilter, typeFilter, searchQuery]);

  // Group campaigns by client
  const groupedByClient = useMemo(() => {
    const groups = {};
    filteredCampaigns.forEach(c => {
      const clientName = c.clientName || 'Unknown Client';
      if (!groups[clientName]) groups[clientName] = [];
      groups[clientName].push(c);
    });
    return groups;
  }, [filteredCampaigns]);

  const isAdmin = user.role !== 'team_member';

  // Open edit dialog
  const openEditDialog = (campaign, e) => {
    e.stopPropagation();
    setEditForm({
      id: campaign.id,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status,
      clientId: campaign.clientId,
      startDate: campaign.startDate || '',
      endDate: campaign.endDate || '',
      isRenewable: campaign.isRenewable || false
    });
    setEditDialog(campaign);
  };

  // Save campaign edit
  const saveEdit = async () => {
    setSaving(true);
    try {
      await apiFetch('PUT', `campaigns/${editForm.id}`, editForm);
      toast.success('Campaign updated');
      setEditDialog(null);
      loadCampaigns();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || searchQuery;

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredCampaigns.length;
    const active = filteredCampaigns.filter(c => c.status === 'active').length;
    const totalProjected = filteredCampaigns.reduce((sum, c) => sum + (c.totalProjected || 0), 0);
    const totalEarned = filteredCampaigns.reduce((sum, c) => sum + (c.totalEarned || 0), 0);
    return { total, active, totalProjected, totalEarned };
  }, [filteredCampaigns]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{isAdmin ? 'Campaigns' : 'My Campaigns'}</h1>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'month' ? formatMonthDisplay(selectedMonth) : 'All campaigns'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={() => navigate('campaign-create')} size="sm">
              <Plus size={16} className="mr-2" /> New
            </Button>
          )}
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className="text-xs sm:text-sm"
              >
                <Calendar size={14} className="mr-1" /> Monthly
              </Button>
              <Button
                variant={viewMode === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('all')}
                className="text-xs sm:text-sm"
              >
                All Time
              </Button>
            </div>
            
            {viewMode === 'month' && (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)} className="p-1 sm:p-2">
                  <ChevronLeft size={18} />
                </Button>
                <span className="text-sm sm:text-base font-medium min-w-[100px] sm:min-w-[140px] text-center">
                  {formatMonthDisplay(selectedMonth)}
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)} className="p-1 sm:p-2">
                  <ChevronRight size={18} />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-muted-foreground">Campaigns</p>
            <p className="text-lg sm:text-xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-muted-foreground">Projected</p>
            <p className="text-lg sm:text-xl font-bold truncate">{formatBDT(stats.totalProjected)}</p>
          </div>
          <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border">
            <p className="text-xs text-muted-foreground">Confirmed</p>
            <p className="text-lg sm:text-xl font-bold text-emerald-600 truncate">{formatBDT(stats.totalEarned)}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            className="pl-9" 
            placeholder="Search campaigns or clients..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={showFilters ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0"
          >
            <Filter size={14} className="mr-1" /> 
            Filters
            {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full" />}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X size={14} className="mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="border shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-wrap gap-3">
              <div className="w-full sm:w-auto">
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto">
                <Label className="text-xs mb-1 block">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="retainer">Retainer</SelectItem>
                    <SelectItem value="one-time">One-time</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : filteredCampaigns.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 sm:py-16 text-center text-muted-foreground">
            <Megaphone className="mx-auto mb-3" size={36} />
            <p className="font-medium">No campaigns found</p>
            <p className="text-sm mt-1">
              {viewMode === 'month' 
                ? `No campaigns active in ${formatMonthDisplay(selectedMonth)}`
                : 'Try adjusting your filters'
              }
            </p>
            {viewMode === 'month' && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setViewMode('all')}>
                View All Campaigns
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByClient).map(([clientName, clientCampaigns]) => (
            <Card key={clientName} className="border-0 shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b">
                <CardTitle className="text-sm font-medium text-slate-700 flex items-center justify-between">
                  <span>{clientName}</span>
                  <Badge variant="secondary" className="text-xs">{clientCampaigns.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {clientCampaigns.map(campaign => {
                  const pct = campaign.totalProjected > 0 
                    ? Math.round((campaign.totalEarned / campaign.totalProjected) * 100) 
                    : 0;
                  
                  return (
                    <div 
                      key={campaign.id}
                      className="p-3 sm:p-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => navigate(`campaign-detail/${campaign.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Campaign Name & Status */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-medium text-sm truncate">{campaign.name}</h3>
                            <Badge className={`text-xs ${getStatusColor(campaign.status)}`}>
                              {getStatusLabel(campaign.status)}
                            </Badge>
                          </div>
                          
                          {/* Tags Row */}
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                            <span className="capitalize bg-slate-100 px-2 py-0.5 rounded">{campaign.type}</span>
                            {campaign.isRenewable && (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                <RefreshCw size={10} /> Renewable
                              </span>
                            )}
                            {campaign.startDate && (
                              <span className="hidden sm:inline">
                                {campaign.startDate} → {campaign.endDate || 'Ongoing'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Side - Financials & Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {isAdmin && (
                            <div className="text-right hidden sm:block">
                              <p className="font-semibold text-sm">{formatBDT(campaign.totalEarned)}</p>
                              <p className="text-xs text-muted-foreground">of {formatBDT(campaign.totalProjected)}</p>
                            </div>
                          )}
                          
                          {/* Progress Circle */}
                          <div className="w-10 h-10 sm:w-12 sm:h-12 relative flex-shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="#e5e7eb"
                                strokeWidth="3"
                              />
                              <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke={pct >= 75 ? '#10b981' : pct >= 40 ? '#3b82f6' : '#f59e0b'}
                                strokeWidth="3"
                                strokeDasharray={`${pct}, 100`}
                              />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                              {pct}%
                            </span>
                          </div>

                          {/* Edit Button */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2"
                              onClick={(e) => openEditDialog(campaign, e)}
                            >
                              <Pencil size={14} />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Mobile Financials */}
                      {isAdmin && (
                        <div className="flex items-center justify-between mt-2 sm:hidden text-xs">
                          <span className="text-muted-foreground">Revenue:</span>
                          <span className="font-medium">{formatBDT(campaign.totalEarned)} / {formatBDT(campaign.totalProjected)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Campaign Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          {editDialog && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Campaign Name</Label>
                <Input 
                  value={editForm.name || ''} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={editForm.type} onValueChange={v => setEditForm({...editForm, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="retainer">Retainer</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Client</Label>
                <Select value={editForm.clientId} onValueChange={v => setEditForm({...editForm, clientId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={editForm.startDate || ''} 
                    onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={editForm.endDate || ''} 
                    onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Renewable Campaign</Label>
                  <p className="text-xs text-muted-foreground">Auto-generate deliverables monthly</p>
                </div>
                <Switch 
                  checked={editForm.isRenewable} 
                  onCheckedChange={v => setEditForm({...editForm, isRenewable: v})}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialog(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
