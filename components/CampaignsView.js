'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Megaphone, Calendar, Users } from 'lucide-react';

export default function CampaignsView({ user, navigate }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => { loadCampaigns(); }, []);

  const loadCampaigns = async () => {
    try {
      const res = await apiFetch('GET', 'campaigns');
      setCampaigns(res.campaigns || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const filtered = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    return true;
  });

  const isAdmin = user.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Campaigns' : 'My Campaigns'}</h1>
          <p className="text-muted-foreground">{isAdmin ? 'Manage all campaigns' : 'Campaigns assigned to you'}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('campaign-create')}>
            <Plus size={16} className="mr-2" /> New Campaign
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="retainer">Retainer</SelectItem>
            <SelectItem value="one-time">One-time</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="mx-auto mb-3" size={40} />
          <p>No campaigns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(campaign => {
            const pct = campaign.totalProjected > 0 ? Math.round((campaign.totalEarned / campaign.totalProjected) * 100) : 0;
            return (
              <Card key={campaign.id} className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`campaign-detail/${campaign.id}`)}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Megaphone className="text-blue-600" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{campaign.name}</h3>
                        <Badge className={`text-xs ${getStatusColor(campaign.status)}`}>{getStatusLabel(campaign.status)}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{campaign.type}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{campaign.clientName}</span>
                        {campaign.startDate && <span className="flex items-center gap-1"><Calendar size={12} /> {campaign.startDate} - {campaign.endDate}</span>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm">{formatBDT(campaign.totalEarned)}</p>
                        <p className="text-xs text-muted-foreground">of {formatBDT(campaign.totalProjected)}</p>
                      </div>
                    )}
                    <div className="w-32 flex-shrink-0">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground text-right mt-1">{pct}% delivered</p>
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
