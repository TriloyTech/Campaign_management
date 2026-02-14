'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';

export default function ServicesView({ user }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', defaultRate: '', description: '' });

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const res = await apiFetch('GET', 'services');
      setServices(res.services || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await apiFetch('PUT', `services/${editing.id}`, form);
        toast.success('Service updated');
      } else {
        await apiFetch('POST', 'services', form);
        toast.success('Service created');
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: '', defaultRate: '', description: '' });
      loadServices();
    } catch (err) { toast.error(err.message); }
  };

  const handleEdit = (svc) => {
    setEditing(svc);
    setForm({ name: svc.name, defaultRate: svc.defaultRate, description: svc.description });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await apiFetch('DELETE', `services/${id}`);
      toast.success('Service deleted');
      loadServices();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Catalog</h1>
          <p className="text-muted-foreground">Manage your service offerings and default rates</p>
        </div>
        {user.role === 'admin' && (
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditing(null); setForm({ name: '', defaultRate: '', description: '' }); } }}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-2" /> Add Service</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Service' : 'New Service'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Service Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Static Post Design" /></div>
                <div><Label>Default Rate (BDT) *</Label><Input type="number" value={form.defaultRate} onChange={e => setForm({ ...form, defaultRate: e.target.value })} placeholder="1600" /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? 'Update' : 'Create'} Service</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="mx-auto mb-3" size={40} />
          <p>No services configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(svc => (
            <Card key={svc.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Package className="text-indigo-600" size={20} />
                  </div>
                  {user.role === 'admin' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(svc)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(svc.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm">{svc.name}</h3>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatBDT(svc.defaultRate)}</p>
                {svc.description && <p className="text-xs text-muted-foreground mt-2">{svc.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
