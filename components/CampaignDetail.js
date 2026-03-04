'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, ExternalLink, CheckCircle, Clock, Play, Eye, Link2, Plus, Trash2, Pencil, RefreshCw } from 'lucide-react';

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
  const [addDeliverableDialog, setAddDeliverableDialog] = useState(false);
  const [editDeliverableDialog, setEditDeliverableDialog] = useState(null);
  const [renewDialog, setRenewDialog] = useState(false);
  const [renewMonth, setRenewMonth] = useState('');
  const [newDeliverable, setNewDeliverable] = useState({ serviceName: '', rate: '', month: '' });
  const [selectedMonth, setSelectedMonth] = useState('all');

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
      await apiFetch('PUT', `deliverables/${deliverable.id}`, { status: newStatus });
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

  const addDeliverable = async () => {
    if (!newDeliverable.serviceName || !newDeliverable.rate) {
      toast.error('Service name and rate are required');
      return;
    }
    try {
      await apiFetch('POST', 'deliverables', {
        campaignId,
        serviceName: newDeliverable.serviceName,
        rate: Number(newDeliverable.rate),
        month: newDeliverable.month || campaign?.lastRenewedMonth || new Date().toISOString().substring(0, 7)
      });
      toast.success('Deliverable added!');
      setAddDeliverableDialog(false);
      setNewDeliverable({ serviceName: '', rate: '', month: '' });
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const updateDeliverable = async () => {
    try {
      await apiFetch('PUT', `deliverables/${editDeliverableDialog.id}`, {
        serviceName: editDeliverableDialog.serviceName,
        rate: Number(editDeliverableDialog.rate),
        month: editDeliverableDialog.month
      });
      toast.success('Deliverable updated!');
      setEditDeliverableDialog(null);
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const deleteDeliverable = async (id) => {
    if (!confirm('Delete this deliverable?')) return;
    try {
      await apiFetch('DELETE', `deliverables/${id}`);
      toast.success('Deliverable deleted');
      loadCampaign();
    } catch (err) { toast.error(err.message); }
  };

  const deleteCampaign = async () => {
    if (!confirm('Delete this campaign? This will remove all deliverables and cannot be undone.')) return;
    try {
      await apiFetch('DELETE', `campaigns/${campaignId}`);
      toast.success('Campaign deleted');
      navigate('campaigns');
    } catch (err) { toast.error(err.message); }
  };

  const renewCampaign = async () => {
    if (!renewMonth) {
      toast.error('Select a month');
      return;
    }
    try {
      await apiFetch('POST', `campaigns/${campaignId}/renew`, { month: renewMonth });
      toast.success(`Campaign renewed for ${renewMonth}!`);
      setRenewDialog(false);
      setRenewMonth('');
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

  // Get unique months from deliverables
  const months = [...new Set(deliverables.map(d => d.month).filter(Boolean))].sort().reverse();
  
  // Filter deliverables by selected month
  const filteredDeliverables = selectedMonth === 'all' 
    ? deliverables 
    : deliverables.filter(d => d.month === selectedMonth);

  // Group deliverables by service
  const grouped = {};
  filteredDeliverables.forEach(d => {
    if (!grouped[d.serviceName]) grouped[d.serviceName] = [];
    grouped[d.serviceName].push(d);
  });

  // Get service names from line items for dropdown
  const serviceNames = [...new Set([...lineItems.map(l => l.serviceName), ...deliverables.map(d => d.serviceName)])];

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
            {campaign.isRenewable && (
              <Badge className="bg-blue-100 text-blue-700">Renewable</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{campaign.clientName}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEditCampaign && (
            <>
              <Select value={campaign.status} onValueChange={async (v) => {
                try {
                  await apiFetch('PUT', `campaigns/${campaign.id}`, { status: v });
                  toast.success('Campaign status updated');
                  loadCampaign();
                } catch (err) { toast.error(err.message); }
              }}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="destructive" size="sm" onClick={deleteCampaign}>
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          {campaign.startDate || 'N/A'} - {campaign.endDate || 'Ongoing'}
        </div>
        {campaign.isRenewable && campaign.lastRenewedMonth && (
          <span>Last renewed: {campaign.lastRenewedMonth}</span>
        )}
      </div>

      {/* Line Items Summary */}
      {canViewFinancials && lineItems.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Scope of Work</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Service</th><th className="text-center py-2">Qty</th><th className="text-right py-2">Rate</th><th className="text-right py-2">Total</th></tr></thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={i} className="border-b"><td className="py-2">{item.serviceName}</td><td className="py-2 text-center">{item.quantity}</td><td className="py-2 text-right">{formatBDT(item.rate)}</td><td className="py-2 text-right font-medium">{formatBDT(item.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Deliverables Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Deliverables</CardTitle>
            <div className="flex items-center gap-2">
              {/* Month Filter */}
              {months.length > 0 && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {canEditCampaign && (
                <>
                  {campaign.isRenewable && (
                    <Dialog open={renewDialog} onOpenChange={setRenewDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <RefreshCw size={14} className="mr-1" /> Renew
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Renew Campaign</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <p className="text-sm text-muted-foreground">This will create fresh deliverables for the selected month based on the campaign's line items.</p>
                          <div>
                            <Label>Target Month</Label>
                            <Input type="month" value={renewMonth} onChange={e => setRenewMonth(e.target.value)} />
                          </div>
                          <Button onClick={renewCampaign} className="w-full">Create Deliverables for {renewMonth || 'Selected Month'}</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Dialog open={addDeliverableDialog} onOpenChange={setAddDeliverableDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus size={14} className="mr-1" /> Add</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Deliverable</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Service Name *</Label>
                          <Select value={newDeliverable.serviceName} onValueChange={v => setNewDeliverable({ ...newDeliverable, serviceName: v })}>
                            <SelectTrigger><SelectValue placeholder="Select or type" /></SelectTrigger>
                            <SelectContent>
                              {serviceNames.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input className="mt-2" value={newDeliverable.serviceName} onChange={e => setNewDeliverable({ ...newDeliverable, serviceName: e.target.value })} placeholder="Or enter custom name" />
                        </div>
                        <div>
                          <Label>Rate (BDT) *</Label>
                          <Input type="number" value={newDeliverable.rate} onChange={e => setNewDeliverable({ ...newDeliverable, rate: e.target.value })} />
                        </div>
                        <div>
                          <Label>Month</Label>
                          <Input type="month" value={newDeliverable.month} onChange={e => setNewDeliverable({ ...newDeliverable, month: e.target.value })} />
                        </div>
                        <Button onClick={addDeliverable} className="w-full">Add Deliverable</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(grouped).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deliverables found</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([serviceName, items]) => (
                <div key={serviceName} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                    <span className="font-medium text-sm">{serviceName}</span>
                    <span className="text-xs text-muted-foreground">{items.filter(d => d.status === 'delivered').length}/{items.length} delivered</span>
                  </div>
                  <div className="divide-y">
                    {items.sort((a, b) => a.unitIndex - b.unitIndex).map(d => (
                      <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(d.status)}
                          <span className="text-sm font-medium">#{d.unitIndex}</span>
                          {d.month && <Badge variant="outline" className="text-xs">{d.month}</Badge>}
                          {canViewFinancials && <span className="text-sm text-muted-foreground">{formatBDT(d.rate)}</span>}
                          {d.proofUrl && (
                            <a href={d.proofUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                              <ExternalLink size={12} /> Proof
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={d.status} onValueChange={(v) => updateStatus(d, v)}>
                            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <button onClick={() => { setProofDialog(d); setProofUrl(d.proofUrl || ''); }} className="p-1.5 hover:bg-muted rounded" title="Add proof link">
                            <Link2 size={14} />
                          </button>
                          {canEditCampaign && (
                            <>
                              <button onClick={() => setEditDeliverableDialog({ ...d })} className="p-1.5 hover:bg-muted rounded" title="Edit">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => deleteDeliverable(d.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete">
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proof URL Dialog */}
      <Dialog open={!!proofDialog} onOpenChange={() => setProofDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Proof Link</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Provide a link to the delivered content (e.g., social media post URL, file link)</p>
            <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://..." />
            <Button onClick={submitProof} className="w-full">Save Proof Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Deliverable Dialog */}
      <Dialog open={!!editDeliverableDialog} onOpenChange={() => setEditDeliverableDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Deliverable</DialogTitle></DialogHeader>
          {editDeliverableDialog && (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Service Name</Label>
                <Input value={editDeliverableDialog.serviceName} onChange={e => setEditDeliverableDialog({ ...editDeliverableDialog, serviceName: e.target.value })} />
              </div>
              <div>
                <Label>Rate (BDT)</Label>
                <Input type="number" value={editDeliverableDialog.rate} onChange={e => setEditDeliverableDialog({ ...editDeliverableDialog, rate: e.target.value })} />
              </div>
              <div>
                <Label>Month</Label>
                <Input type="month" value={editDeliverableDialog.month || ''} onChange={e => setEditDeliverableDialog({ ...editDeliverableDialog, month: e.target.value })} />
              </div>
              <Button onClick={updateDeliverable} className="w-full">Update Deliverable</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
