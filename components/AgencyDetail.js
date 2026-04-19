'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT, getStatusColor, getStatusLabel } from '@/lib/api';
import { toast } from 'sonner';
import { 
  ArrowLeft, Building2, Plus, Pencil, Trash2, Phone, Mail, MapPin, 
  DollarSign, FileText, CheckCircle, Clock, Package, ExternalLink,
  RefreshCw, Calendar, Download, AlertCircle
} from 'lucide-react';

export default function AgencyDetail({ agencyId, user, navigate }) {
  const [agency, setAgency] = useState(null);
  const [rates, setRates] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('deliverables');
  
  // Rate dialog
  const [rateDialog, setRateDialog] = useState(false);
  const [rateForm, setRateForm] = useState({ serviceName: '', rate: '' });
  
  // Invoice dialog
  const [invoiceDialog, setInvoiceDialog] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ type: 'all', campaignId: '', periodStart: '', periodEnd: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  useEffect(() => {
    loadAgency();
    loadServices();
    loadCampaigns();
  }, [agencyId]);

  const loadAgency = async () => {
    try {
      const res = await apiFetch('GET', `agencies/${agencyId}`);
      setAgency(res.agency);
      setRates(res.rates || []);
      setDeliverables(res.deliverables || []);
      setInvoices(res.invoices || []);
      setStats(res.stats);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadServices = async () => {
    try {
      const res = await apiFetch('GET', 'services');
      setServices(res.services || []);
    } catch (err) { console.error(err); }
  };

  const loadCampaigns = async () => {
    try {
      const res = await apiFetch('GET', 'campaigns');
      setCampaigns(res.campaigns || []);
    } catch (err) { console.error(err); }
  };

  // Add/Update Rate
  const saveRate = async () => {
    if (!rateForm.serviceName || !rateForm.rate) {
      toast.error('Service name and rate are required');
      return;
    }
    try {
      await apiFetch('POST', `agencies/${agencyId}/rates`, rateForm);
      toast.success('Rate saved');
      setRateDialog(false);
      setRateForm({ serviceName: '', rate: '' });
      loadAgency();
    } catch (err) { toast.error(err.message); }
  };

  // Delete Rate
  const deleteRate = async (rateId) => {
    if (!confirm('Delete this rate?')) return;
    try {
      await apiFetch('DELETE', `agencies/${agencyId}/rates?rateId=${rateId}`);
      toast.success('Rate deleted');
      loadAgency();
    } catch (err) { toast.error(err.message); }
  };

  // Generate Invoice
  const generateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      const payload = {};
      if (invoiceForm.type === 'campaign' && invoiceForm.campaignId) {
        payload.campaignId = invoiceForm.campaignId;
      } else if (invoiceForm.type === 'period' && invoiceForm.periodStart) {
        payload.periodStart = invoiceForm.periodStart;
        payload.periodEnd = invoiceForm.periodEnd || new Date().toISOString().split('T')[0];
      }
      
      const res = await apiFetch('POST', `agencies/${agencyId}/invoices`, payload);
      toast.success(`Invoice ${res.invoice.invoiceNumber} generated!`);
      setInvoiceDialog(false);
      setInvoiceForm({ type: 'all', campaignId: '', periodStart: '', periodEnd: '' });
      loadAgency();
    } catch (err) { toast.error(err.message); }
    finally { setGeneratingInvoice(false); }
  };

  // Update Invoice Status
  const updateInvoiceStatus = async (invoiceId, status) => {
    try {
      await apiFetch('PUT', `agencies/${agencyId}/invoices?invoiceId=${invoiceId}`, { status });
      toast.success(`Invoice marked as ${status}`);
      loadAgency();
    } catch (err) { toast.error(err.message); }
  };

  // Delete Invoice
  const deleteInvoice = async (invoiceId) => {
    if (!confirm('Delete this draft invoice?')) return;
    try {
      await apiFetch('DELETE', `agencies/${agencyId}/invoices?invoiceId=${invoiceId}`);
      toast.success('Invoice deleted');
      loadAgency();
    } catch (err) { toast.error(err.message); }
  };

  // Get uninvoiced deliverables count
  const uninvoicedDeliverables = deliverables.filter(d => d.status === 'delivered' && !d.invoiceId);

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}</div>;
  }

  if (!agency) {
    return <div className="text-center py-10 text-muted-foreground">Agency not found</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('agencies')} className="p-2 rounded-lg hover:bg-muted flex-shrink-0 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{agency.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
              {agency.contactPerson && <span>{agency.contactPerson}</span>}
              {agency.email && <span className="flex items-center gap-1"><Mail size={12} /> {agency.email}</span>}
              {agency.phone && <span className="flex items-center gap-1"><Phone size={12} /> {agency.phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Total Deliverables</p>
              <p className="text-xl font-bold">{stats.completedDeliverables}/{stats.totalDeliverables}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Total Payable</p>
              <p className="text-xl font-bold text-amber-600 truncate">{formatBDT(stats.totalPayable)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Invoiced</p>
              <p className="text-xl font-bold text-blue-600 truncate">{formatBDT(stats.totalInvoiced)}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-xl font-bold text-emerald-600 truncate">{formatBDT(stats.totalPaid)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Uninvoiced Alert */}
      {uninvoicedDeliverables.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 shadow-sm">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-amber-600" size={20} />
              <div>
                <p className="font-medium text-sm">{uninvoicedDeliverables.length} Uninvoiced Deliverables</p>
                <p className="text-xs text-muted-foreground">
                  {formatBDT(uninvoicedDeliverables.reduce((s, d) => s + (d.agencyRate || 0), 0))} worth of delivered work
                </p>
              </div>
            </div>
            <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                  <FileText size={14} className="mr-1" /> Generate Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Generate Invoice</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label>Invoice Type</Label>
                    <Select value={invoiceForm.type} onValueChange={v => setInvoiceForm({...invoiceForm, type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Uninvoiced Items</SelectItem>
                        <SelectItem value="campaign">By Campaign</SelectItem>
                        <SelectItem value="period">By Date Period</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {invoiceForm.type === 'campaign' && (
                    <div>
                      <Label>Select Campaign</Label>
                      <Select value={invoiceForm.campaignId} onValueChange={v => setInvoiceForm({...invoiceForm, campaignId: v})}>
                        <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                        <SelectContent>
                          {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {invoiceForm.type === 'period' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>From</Label>
                        <Input type="date" value={invoiceForm.periodStart} onChange={e => setInvoiceForm({...invoiceForm, periodStart: e.target.value})} />
                      </div>
                      <div>
                        <Label>To</Label>
                        <Input type="date" value={invoiceForm.periodEnd} onChange={e => setInvoiceForm({...invoiceForm, periodEnd: e.target.value})} />
                      </div>
                    </div>
                  )}
                  
                  <Button onClick={generateInvoice} disabled={generatingInvoice} className="w-full">
                    {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="deliverables" className="text-xs sm:text-sm">
            <Package size={14} className="mr-1 hidden sm:inline" /> Deliverables
          </TabsTrigger>
          <TabsTrigger value="rates" className="text-xs sm:text-sm">
            <DollarSign size={14} className="mr-1 hidden sm:inline" /> Rates
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">
            <FileText size={14} className="mr-1 hidden sm:inline" /> Invoices
          </TabsTrigger>
        </TabsList>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Assigned Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              {deliverables.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No deliverables assigned yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Deliverable</th>
                        <th className="text-left py-2 px-2">Campaign</th>
                        <th className="text-center py-2 px-2">Status</th>
                        <th className="text-right py-2 px-2">Rate</th>
                        <th className="text-center py-2 px-3">Invoiced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliverables.map(d => (
                        <tr key={d.id} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-3">
                            <p className="font-medium">{d.serviceName} #{d.unitIndex}</p>
                            {d.month && <p className="text-xs text-muted-foreground">{d.month}</p>}
                          </td>
                          <td className="py-2 px-2">
                            <p className="truncate max-w-[150px]">{d.campaignName}</p>
                            <p className="text-xs text-muted-foreground truncate">{d.clientName}</p>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Badge className={`text-xs ${getStatusColor(d.status)}`}>{getStatusLabel(d.status)}</Badge>
                          </td>
                          <td className="py-2 px-2 text-right font-medium">{formatBDT(d.agencyRate || 0)}</td>
                          <td className="py-2 px-3 text-center">
                            {d.invoiceId ? (
                              <CheckCircle size={14} className="text-emerald-500 mx-auto" />
                            ) : d.status === 'delivered' ? (
                              <Clock size={14} className="text-amber-500 mx-auto" />
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rates Tab */}
        <TabsContent value="rates" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Service Rates</CardTitle>
              {isAdmin && (
                <Dialog open={rateDialog} onOpenChange={setRateDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline"><Plus size={14} className="mr-1" /> Add Rate</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Add Service Rate</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Service</Label>
                        <Select value={rateForm.serviceName} onValueChange={v => setRateForm({...rateForm, serviceName: v})}>
                          <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                          <SelectContent>
                            {services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Rate (BDT)</Label>
                        <Input type="number" value={rateForm.rate} onChange={e => setRateForm({...rateForm, rate: e.target.value})} placeholder="Agency rate for this service" />
                      </div>
                      <Button onClick={saveRate} className="w-full">Save Rate</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {rates.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No rates configured</p>
                  <p className="text-xs mt-1">Add default rates for services this agency provides</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rates.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{r.serviceName}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-blue-600">{formatBDT(r.rate)}</p>
                        {isAdmin && (
                          <button onClick={() => deleteRate(r.id)} className="p-1 rounded hover:bg-red-50 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Invoices</CardTitle>
              {isAdmin && uninvoicedDeliverables.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setInvoiceDialog(true)}>
                  <Plus size={14} className="mr-1" /> Generate Invoice
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No invoices generated yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map(inv => {
                    const isLocked = inv.status === 'finalized' || inv.status === 'paid';
                    const isPaid = inv.status === 'paid';
                    
                    return (
                      <div key={inv.id} className={`p-3 sm:p-4 border rounded-lg ${isPaid ? 'bg-emerald-50/50 border-emerald-200' : isLocked ? 'bg-blue-50/50 border-blue-200' : ''}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm">{inv.invoiceNumber}</p>
                              <Badge 
                                variant={isPaid ? 'default' : inv.status === 'finalized' ? 'secondary' : 'outline'} 
                                className={`text-xs ${isPaid ? 'bg-emerald-600' : ''}`}
                              >
                                {isPaid ? '✓ Paid' : inv.status === 'finalized' ? '🔒 Finalized' : 'Draft'}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {inv.campaignName ? `Campaign: ${inv.campaignName}` : `${inv.deliverableCount} deliverables`}
                              {' • '}{new Date(inv.createdAt).toLocaleDateString()}
                              {inv.paidAt && ` • Paid: ${new Date(inv.paidAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-lg ${isPaid ? 'text-emerald-600' : ''}`}>{formatBDT(inv.totalAmount)}</p>
                            
                            {/* Draft: Can finalize or delete */}
                            {isAdmin && inv.status === 'draft' && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => updateInvoiceStatus(inv.id, 'finalized')}>
                                  Finalize
                                </Button>
                                <button onClick={() => deleteInvoice(inv.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete draft">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                            
                            {/* Finalized: Can only mark as paid, cannot delete */}
                            {isAdmin && inv.status === 'finalized' && (
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={() => updateInvoiceStatus(inv.id, 'paid')}>
                                  Mark Paid
                                </Button>
                                <span className="text-xs text-muted-foreground" title="Finalized invoices cannot be deleted">
                                  🔒
                                </span>
                              </div>
                            )}
                            
                            {/* Paid: Fully locked, show checkmark */}
                            {inv.status === 'paid' && (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={18} className="text-emerald-500" />
                                <span className="text-xs text-muted-foreground" title="Paid invoices cannot be modified">
                                  🔒
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Lock message for finalized/paid invoices */}
                        {isLocked && (
                          <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                            {isPaid 
                              ? '✓ This invoice has been paid and is locked for record-keeping.'
                              : '🔒 This invoice is finalized and cannot be deleted. Mark as paid when payment is received.'
                            }
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
