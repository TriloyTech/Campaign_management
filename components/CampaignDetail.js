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
import { ArrowLeft, Calendar, ExternalLink, CheckCircle, Clock, AlertCircle, Play, Eye } from 'lucide-react';

const STATUS_FLOW = ['pending', 'in_progress', 'review', 'delivered'];

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
    if (newStatus === 'delivered' && !deliverable.proofUrl) {
      setProofDialog(deliverable);
      setProofUrl('');
      return;
    }
    try {
      await apiFetch('PUT', `deliverables/${deliverable.id}`, { status: newStatus });
      toast.success(`Updated to ${getStatusLabel(newStatus)}`);
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const submitProof = async () => {
    if (!proofUrl) { toast.error('Please enter a proof URL'); return; }
    try {
      await apiFetch('PUT', `deliverables/${proofDialog.id}`, { status: 'delivered', proofUrl });
      toast.success('Marked as delivered!');
      setProofDialog(null);
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const getNextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={16} className="text-emerald-500" />;
      case 'review': return <Eye size={16} className="text-blue-500" />;
      case 'in_progress': return <Play size={16} className="text-amber-500" />;
      default: return <Clock size={16} className="text-gray-400" />;
    }
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>;
  if (!campaign) return <div className="text-center py-10 text-muted-foreground">Campaign not found</div>;

  const pct = campaign.totalProjected > 0 ? Math.round((campaign.totalEarned / campaign.totalProjected) * 100) : 0;
  const isAdmin = user.role === 'admin';

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge className={getStatusColor(campaign.status)}>{getStatusLabel(campaign.status)}</Badge>
            <Badge variant="outline" className="capitalize">{campaign.type}</Badge>
          </div>
          <p className="text-muted-foreground">{campaign.clientName}</p>
        </div>
        {isAdmin && (
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
        {isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Projected Revenue</p>
              <p className="text-2xl font-bold">{formatBDT(campaign.totalProjected)}</p>
            </CardContent>
          </Card>
        )}
        {isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Earned Revenue</p>
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

      {/* Date range */}
      {(campaign.startDate || campaign.endDate) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar size={16} />
          {campaign.startDate} - {campaign.endDate}
        </div>
      )}

      {/* Line Items Summary */}
      {isAdmin && lineItems.length > 0 && (
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
                {items.map(d => {
                  const next = getNextStatus(d.status);
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      {getStatusIcon(d.status)}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{d.serviceName} #{d.unitIndex}</span>
                        {d.proofUrl && (
                          <a href={d.proofUrl} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <ExternalLink size={12} /> Proof
                          </a>
                        )}
                      </div>
                      <Badge className={`text-xs ${getStatusColor(d.status)}`}>{getStatusLabel(d.status)}</Badge>
                      {isAdmin && <span className="text-sm text-muted-foreground">{formatBDT(d.rate)}</span>}
                      {next && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatus(d, next)}>
                          {getStatusLabel(next)}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Proof URL Dialog */}
      <Dialog open={!!proofDialog} onOpenChange={() => setProofDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Proof of Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              To mark <strong>{proofDialog?.serviceName} #{proofDialog?.unitIndex}</strong> as delivered, please provide the proof URL (e.g., Facebook/Instagram post link).
            </p>
            <Input
              value={proofUrl}
              onChange={e => setProofUrl(e.target.value)}
              placeholder="https://facebook.com/your-post-link"
            />
            <Button onClick={submitProof} className="w-full">Mark as Delivered</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
