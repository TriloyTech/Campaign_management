'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from 'lucide-react';

export default function CampaignCreate({ user, navigate }) {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', clientId: '', type: 'retainer', startDate: '', endDate: '', assignedTo: [], isRenewable: false
  });
  const [lineItems, setLineItems] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('GET', 'clients'),
      apiFetch('GET', 'services'),
      apiFetch('GET', 'team')
    ]).then(([cRes, sRes, tRes]) => {
      setClients(cRes.clients || []);
      setServices(sRes.services || []);
      setTeam((tRes.members || []).filter(m => m.role === 'team_member'));
    });
  }, []);

  const addLineItem = () => {
    setLineItems([...lineItems, { serviceId: '', serviceName: '', quantity: 1, rate: 0 }]);
  };

  const updateLineItem = (index, field, value) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'serviceId') {
      const svc = services.find(s => s.id === value);
      if (svc) {
        updated[index].serviceName = svc.name;
        updated[index].rate = svc.defaultRate;
      }
    }
    setLineItems(updated);
  };

  const removeLineItem = (index) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const grandTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const totalDeliverables = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCreate = async () => {
    setLoading(true);
    try {
      await apiFetch('POST', 'campaigns', { ...form, lineItems });
      toast.success('Campaign created successfully!');
      navigate('campaigns');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === form.clientId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('campaigns')} className="p-2 rounded-lg hover:bg-muted">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground">Step {step} of 3</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-blue-500' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Campaign Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Q2 Social Media Campaign" />
            </div>
            <div>
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={v => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campaign Type *</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retainer">Retainer</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="renewable" 
                checked={form.isRenewable} 
                onChange={e => setForm({ ...form, isRenewable: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="renewable" className="text-sm cursor-pointer">
                Renewable Campaign (auto-creates deliverables each month on the 1st)
              </Label>
            </div>
            <div>
              <Label>Assign Team Members</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {team.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      const assigned = form.assignedTo.includes(m.id)
                        ? form.assignedTo.filter(id => id !== m.id)
                        : [...form.assignedTo, m.id];
                      setForm({ ...form, assignedTo: assigned });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${form.assignedTo.includes(m.id) ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200'}`}
                  >
                    {m.name}
                  </button>
                ))}
                {team.length === 0 && <p className="text-sm text-muted-foreground">No team members available</p>}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { if (!form.name || !form.clientId) { toast.error('Fill required fields'); return; } setStep(2); }}>
                Next <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Line Items */}
      {step === 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Scope of Work (Line Items)</CardTitle>
            <Button size="sm" variant="outline" onClick={addLineItem}>
              <Plus size={14} className="mr-1" /> Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No line items yet. Click "Add Item" to start building the scope.</p>
              </div>
            ) : (
              lineItems.map((item, idx) => (
                <div key={idx} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item #{idx + 1}</span>
                    <button onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 sm:col-span-1">
                      <Label className="text-xs">Service</Label>
                      <Select value={item.serviceId} onValueChange={v => updateLineItem(idx, 'serviceId', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({formatBDT(s.defaultRate)})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Quantity</Label>
                      <Input type="number" min="1" value={item.quantity} onChange={e => updateLineItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                    </div>
                    <div>
                      <Label className="text-xs">Rate (BDT)</Label>
                      <Input type="number" min="0" value={item.rate} onChange={e => updateLineItem(idx, 'rate', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    Subtotal: <strong>{formatBDT(item.quantity * item.rate)}</strong>
                  </div>
                </div>
              ))
            )}

            {lineItems.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Total Deliverables: <strong>{totalDeliverables}</strong></span>
                  <span>Grand Total: <strong className="text-lg">{formatBDT(grandTotal)}</strong></span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft size={16} className="mr-2" /> Back
              </Button>
              <Button onClick={() => { if (!lineItems.length) { toast.error('Add at least one line item'); return; } setStep(3); }}>
                Next <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Review & Create</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Campaign:</span> <strong>{form.name}</strong></div>
              <div><span className="text-muted-foreground">Client:</span> <strong>{selectedClient?.name}</strong></div>
              <div><span className="text-muted-foreground">Type:</span> <Badge variant="outline" className="capitalize">{form.type}</Badge></div>
              <div><span className="text-muted-foreground">Period:</span> {form.startDate || 'N/A'} - {form.endDate || 'N/A'}</div>
              {form.isRenewable && (
                <div className="col-span-2"><Badge className="bg-blue-100 text-blue-700">Renewable Campaign</Badge> - New deliverables created on 1st of each month</div>
              )}
            </div>

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
                      <td className="p-3 text-right font-medium">{formatBDT(item.quantity * item.rate)}</td>
                    </tr>
                  ))}
                  <tr className="border-t bg-blue-50">
                    <td className="p-3 font-semibold" colSpan="2">Grand Total ({totalDeliverables} deliverables)</td>
                    <td></td>
                    <td className="p-3 text-right font-bold text-lg">{formatBDT(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-sm text-amber-800">
              This will create <strong>{totalDeliverables}</strong> individual deliverable tasks that team members can track.
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft size={16} className="mr-2" /> Back
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Campaign'} <Check size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
