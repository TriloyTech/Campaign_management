'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
    if (!opt) return <Clock size={14} className="text-gray-400" />;
    const Icon = opt.icon;
    return <Icon size={14} className={opt.color} />;
  };

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 sm:h-32 bg-muted animate-pulse rounded-lg" />)}</div>;
  if (!campaign) return <div className="text-center py-10 text-muted-foreground">Campaign not found</div>;

  const pct = campaign.totalProjected > 0 ? Math.round((campaign.totalEarned / campaign.totalProjected) * 100) : 0;
  const canViewFinancials = user.role === 'admin' || user.role === 'super_admin';
  const canEditCampaign = user.role === 'admin' || user.role === 'super_admin';

  const months = [...new Set(deliverables.map(d => d.month).filter(Boolean))].sort().reverse();
  const filteredDeliverables = selectedMonth === 'all' 
    ? deliverables 
    : deliverables.filter(d => d.month === selectedMonth);

  const grouped = {};
  filteredDeliverables.forEach(d => {
    if (!grouped[d.serviceName]) grouped[d.serviceName] = [];
    grouped[d.serviceName].push(d);
  });

  const serviceNames = [...new Set([...lineItems.map(l => l.serviceName), ...deliverables.map(d => d.serviceName)])];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('campaigns')} className="p-2 rounded-lg hover:bg-muted flex-shrink-0 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-bold truncate">{campaign.name}</h1>
              <Badge className={getStatusColor(campaign.status)}>{getStatusLabel(campaign.status)}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <Badge variant="outline" className="capitalize text-xs">{campaign.type}</Badge>
              {campaign.isRenewable && <Badge className="bg-blue-100 text-blue-700 text-xs">Renewable</Badge>}
              <span className="text-sm text-muted-foreground">{campaign.clientName}</span>
            </div>
          </div>
        </div>
        
        {/* Campaign Actions */}
        {canEditCampaign && (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={campaign.status} onValueChange={async (v) => {
              try {
                await apiFetch('PUT', `campaigns/${campaign.id}`, { status: v });
                toast.success('Campaign status updated');
                loadCampaign();
              } catch (err) { toast.error(err.message); }
            }}>
              <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" onClick={deleteCampaign}>
              <Trash2 size={14} className="mr-1 sm:mr-0" />
              <span className="sm:hidden">Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {canViewFinancials && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Projected</p>
              <p className="text-lg sm:text-2xl font-bold truncate">{formatBDT(campaign.totalProjected)}</p>
            </CardContent>
          </Card>
        )}
        {canViewFinancials && (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:pt-6">
              <p className="text-xs sm:text-sm text-muted-foreground">Confirmed</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">{formatBDT(campaign.totalEarned)}</p>
            </CardContent>
          </Card>
        )}
        <Card className="border-0 shadow-sm col-span-2 md:col-span-1">
          <CardContent className="p-3 sm:pt-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Progress</p>
            <p className="text-lg sm:text-2xl font-bold">{pct}%</p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
              <div className={`h-1.5 sm:h-2 rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 40 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Period */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-muted-foreground gap-1">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          {campaign.startDate || 'N/A'} - {campaign.endDate || 'Ongoing'}
        </div>
        {campaign.isRenewable && campaign.lastRenewedMonth && (
          <span>Last renewed: {campaign.lastRenewedMonth}</span>
        )}
      </div>

      {/* Scope of Work */}
      {canViewFinancials && lineItems.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 sm:pb-4"><CardTitle className="text-sm sm:text-base">Scope of Work</CardTitle></CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Service</th>
                    <th className="text-center py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Rate</th>
                    <th className="text-right py-2 px-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 px-3">{item.serviceName}</td>
                      <td className="py-2 px-2 text-center">{item.quantity}</td>
                      <td className="py-2 px-2 text-right">{formatBDT(item.rate)}</td>
                      <td className="py-2 px-3 text-right font-medium">{formatBDT(item.total)}</td>
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
        <CardHeader className="pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm sm:text-base">Deliverables</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {months.length > 0 && (
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-28 sm:w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        <Button variant="outline" size="sm" className="h-8 text-xs">
                          <RefreshCw size={12} className="mr-1" /> Renew
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Renew Campaign</DialogTitle></DialogHeader>
                        <div className="space-y-4 mt-4">
                          <p className="text-sm text-muted-foreground">This will create fresh deliverables for the selected month.</p>
                          <div>
                            <Label>Target Month</Label>
                            <Input type="month" value={renewMonth} onChange={e => setRenewMonth(e.target.value)} />
                          </div>
                          <Button onClick={renewCampaign} className="w-full">Create Deliverables</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  <Dialog open={addDeliverableDialog} onOpenChange={setAddDeliverableDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-8 text-xs"><Plus size={12} className="mr-1" /> Add</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader><DialogTitle>Add Deliverable</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label>Service Name *</Label>
                          <Select value={newDeliverable.serviceName} onValueChange={v => setNewDeliverable({ ...newDeliverable, serviceName: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No deliverables found</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([serviceName, items]) => (
                <div key={serviceName} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 sm:px-4 py-2 flex items-center justify-between">
                    <span className="font-medium text-xs sm:text-sm truncate">{serviceName}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{items.filter(d => d.status === 'delivered').length}/{items.length}</span>
                  </div>
                  <div className="divide-y">
                    {items.sort((a, b) => a.unitIndex - b.unitIndex).map(d => (
                      <div key={d.id} className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-muted/30">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getStatusIcon(d.status)}
                            <span className="text-xs sm:text-sm font-medium">#{d.unitIndex}</span>
                            {d.month && <Badge variant="outline" className="text-xs">{d.month}</Badge>}
                            {canViewFinancials && <span className="text-xs text-muted-foreground">{formatBDT(d.rate)}</span>}
                            {d.proofUrl && (
                              <a href={d.proofUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                                <ExternalLink size={10} /> Proof
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <Select value={d.status} onValueChange={(v) => updateStatus(d, v)}>
                              <SelectTrigger className="w-24 sm:w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <button onClick={() => { setProofDialog(d); setProofUrl(d.proofUrl || ''); }} className="p-1 sm:p-1.5 hover:bg-muted rounded" title="Add proof link">
                              <Link2 size={12} />
                            </button>
                            {canEditCampaign && (
                              <>
                                <button onClick={() => setEditDeliverableDialog({ ...d })} className="p-1 sm:p-1.5 hover:bg-muted rounded" title="Edit">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => deleteDeliverable(d.id)} className="p-1 sm:p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete">
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Proof Link</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Provide a link to the delivered content</p>
            <Input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://..." />
            <Button onClick={submitProof} className="w-full">Save Proof Link</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Deliverable Dialog */}
      <Dialog open={!!editDeliverableDialog} onOpenChange={() => setEditDeliverableDialog(null)}>
        <DialogContent className="max-w-sm">
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
