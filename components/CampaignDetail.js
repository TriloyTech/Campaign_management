'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, ExternalLink, CheckCircle, Clock, Play, Eye, Link2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Clock, color: 'text-gray-400' },
  { value: 'in_progress', label: 'In Progress', icon: Play, color: 'text-amber-500' },
  { value: 'review', label: 'Review', icon: Eye, color: 'text-blue-500' },
  { value: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'text-emerald-500' },
];

export default function CampaignDetail({ campaignId, user, navigate }) {
  const [campaign, setCampaign] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [proofDialog, setProofDialog] = useState(null);
  const [proofUrl, setProofUrl] = useState('');

  useEffect(() => { loadCampaign(); }, [campaignId]);

  const loadCampaign = async () => {
    try {
      const res = await apiFetch('GET', `campaigns/${campaignId}`);
      setCampaign(res.campaign);
      setLineItems(res.lineItems || []);
      setDeliverables(res.deliverables || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const updateStatus = async (deliverable, newStatus) => {
    try {
      const updateData = { status: newStatus };
      if (deliverable.proofUrl) updateData.proofUrl = deliverable.proofUrl;
      await apiFetch('PUT', `deliverables/${deliverable.id}`, updateData);
      toast.success(`Updated to ${getStatusLabel(newStatus)}`);
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const submitProof = async () => {
    try {
      await apiFetch('PUT', `deliverables/${proofDialog.id}`, { proofUrl });
      toast.success('Proof link saved!');
      setProofDialog(null);
      setProofUrl('');
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const getStatusIcon = (status) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (!opt) return <Clock size={16} className="text-gray-400" />;
    const Icon = opt.icon;
    return <Icon size={16} className={opt.color} />;
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>;
  if (!campaign) return <div className="text-center py-10 text-muted-foreground">Campaign not found</div>;

  const pct = campaign.totalProjected > 0 ? Math.round((campaign.totalEarned / campaign.totalProjected) * 100) : 0;
  const canViewFinancials = user.role === 'admin' || user.role === 'super_admin';
  const canEditCampaign = user.role === 'admin' || user.role === 'super_admin';

  // Group deliverables by service
  const grouped = {};
  deliverables.forEach(d => {
    if (!grouped[d.serviceName]) grouped[d.serviceName] = [];
    grouped[d.serviceName].push(d);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('campaigns')} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={getStatusColor(campaign.status)}>{getStatusLabel(campaign.status)}</Badge>
            <Badge variant="outline" className="capitalize">{campaign.type}</Badge>
          </div>
          <p className="text-muted-foreground">{campaign.clientName}</p>
        </div>
        {canEditCampaign && (
          <Select value={campaign.status} onValueChange={async (v) => {
            try {
              await apiFetch('PUT', `campaigns/${campaign.id}`, { status: v });
              toast.success('Campaign status updated');
              loadCampaign();
            } catch (err) { toast.error(err.message); }
          }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Campaign Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {canViewFinancials && (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Projected Revenue</p>
              <p className="text-2xl font-bold">{formatBDT(campaign.totalProjected)}</p>
            </CardContent>
          </Card>
        )}
        {canViewFinancials && (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Confirmed Revenue</p>
              <p className="text-2xl font-bold text-emerald-600">{formatBDT(campaign.totalEarned)}</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold">{pct}%</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {(campaign.startDate || campaign.endDate) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={16} />
          {campaign.startDate} - {campaign.endDate}
        </div>
      )}

      {/* Line Items Summary */}
      {canViewFinancials && lineItems.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Scope of Work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3">Service</th>
                    <th className="text-center p-3">Qty</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{item.serviceName}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{formatBDT(item.rate)}</td>
                      <td className="p-3 text-right font-medium">{formatBDT(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Deliverables ({deliverables.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(grouped).map(([serviceName, items]) => (
            <div key={serviceName} className="mb-6 last:mb-0">
              <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                {serviceName}
                <Badge variant="secondary" className="text-xs">{items.filter(d => d.status === 'delivered').length}/{items.length} done</Badge>
              </h4>
              <div className="space-y-2">
                {items.map(d => (
                  <div key={d.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                    {getStatusIcon(d.status)}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{d.serviceName} #{d.unitIndex}</span>
                      {d.proofUrl && (
                        <a href={d.proofUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                          <ExternalLink size={12} /> Proof
                        </a>
                      )}
                    </div>

                    {/* Proof link button */}
                    <button
                      onClick={() => { setProofDialog(d); setProofUrl(d.proofUrl || ''); }}
                      className={`p-1.5 rounded hover:bg-muted transition-colors ${d.proofUrl ? 'text-blue-600' : 'text-muted-foreground'}`}
                      title={d.proofUrl ? 'Edit proof link' : 'Add proof link'}
                    >
                      <Link2 size={14} />
                    </button>

                    {canViewFinancials && <span className="text-sm text-muted-foreground">{formatBDT(d.rate)}</span>}

                    {/* Status dropdown */}
                    <Select value={d.status} onValueChange={(newStatus) => updateStatus(d, newStatus)}>
                      <SelectTrigger className="w-36 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(opt => {
                          const Icon = opt.icon;
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <Icon size={13} className={opt.color} />
                                <span>{opt.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Proof URL Dialog */}
      <Dialog open={!!proofDialog} onOpenChange={() => { setProofDialog(null); setProofUrl(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proof / Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Add or update proof link for <strong>{proofDialog?.serviceName} #{proofDialog?.unitIndex}</strong>
              <br />
              <span className="text-xs">(e.g., Facebook/Instagram post link, Google Drive link, etc.)</span>
            </p>
            <Input
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://facebook.com/your-post-link (optional)"
            />
            <Button onClick={submitProof} className="w-full">
              {proofUrl ? 'Save Proof Link' : 'Clear Proof Link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
