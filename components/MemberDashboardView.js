'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { User, Package, CheckCircle, Clock, Play, Eye, Briefcase } from 'lucide-react';

export default function MemberDashboardView({ user, navigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('status'); // 'status' or 'campaign'
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('GET', 'member-dashboard');
      setData(res);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={14} className="text-gray-400" />;
      case 'in_progress': return <Play size={14} className="text-amber-500" />;
      case 'review': return <Eye size={14} className="text-blue-500" />;
      case 'delivered': return <CheckCircle size={14} className="text-emerald-500" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <User className="mx-auto mb-3" size={36} />
        <p>Unable to load dashboard</p>
      </div>
    );
  }

  // Get filtered items based on statusFilter
  const getFilteredItems = () => {
    if (viewMode === 'status') {
      if (statusFilter === 'all') {
        return [
          ...data.byStatus.pending,
          ...data.byStatus.inProgress,
          ...data.byStatus.review,
          ...data.byStatus.delivered
        ];
      }
      return data.byStatus[statusFilter === 'in_progress' ? 'inProgress' : statusFilter] || [];
    }
    return data.byCampaign || [];
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Work</h1>
          <p className="text-sm text-muted-foreground">
            {data.user?.name} • {data.user?.designation || data.user?.role}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="campaign">By Campaign</SelectItem>
            </SelectContent>
          </Select>
          {viewMode === 'status' && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'pending' ? 'ring-2 ring-gray-400' : ''}`} onClick={() => { setViewMode('status'); setStatusFilter('pending'); }}>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-gray-400" />
              <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold">{data.summary?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'in_progress' ? 'ring-2 ring-amber-400' : ''}`} onClick={() => { setViewMode('status'); setStatusFilter('in_progress'); }}>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Play size={14} className="text-amber-500" />
              <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-amber-600">{data.summary?.inProgress || 0}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'review' ? 'ring-2 ring-blue-400' : ''}`} onClick={() => { setViewMode('status'); setStatusFilter('review'); }}>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <Eye size={14} className="text-blue-500" />
              <p className="text-xs sm:text-sm text-muted-foreground">Review</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-blue-600">{data.summary?.review || 0}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 shadow-sm cursor-pointer ${statusFilter === 'delivered' ? 'ring-2 ring-emerald-400' : ''}`} onClick={() => { setViewMode('status'); setStatusFilter('delivered'); }}>
          <CardContent className="p-3 sm:pt-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-emerald-500" />
              <p className="text-xs sm:text-sm text-muted-foreground">Delivered</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{data.summary?.delivered || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Work Items */}
      {viewMode === 'status' ? (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Package size={16} /> 
              {statusFilter === 'all' ? 'All Items' : getStatusLabel(statusFilter)} ({getFilteredItems().length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getFilteredItems().length > 0 ? (
              <div className="space-y-2">
                {getFilteredItems().map((item, i) => (
                  <div key={item.id || i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      {getStatusIcon(item.status)}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.serviceName} #{item.unitIndex}</p>
                        <p className="text-xs text-muted-foreground">{item.month}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                      <span className="text-sm font-medium">{formatBDT(item.rate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="mx-auto mb-2" size={24} />
                <p>No items found</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.byCampaign?.length > 0 ? (
            data.byCampaign.map((campaign, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader className="pb-2 sm:pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Briefcase size={16} /> {campaign.campaignName}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">{campaign.items.length} items</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{campaign.clientName}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {campaign.items.map((item, j) => (
                      <div key={item.id || j} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/30 rounded-lg gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          {getStatusIcon(item.status)}
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{item.serviceName} #{item.unitIndex}</p>
                            <p className="text-xs text-muted-foreground">{item.month}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(item.status)}>{getStatusLabel(item.status)}</Badge>
                          <span className="text-sm font-medium">{formatBDT(item.rate)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Briefcase className="mx-auto mb-3" size={36} />
                <p>No assigned work found</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
