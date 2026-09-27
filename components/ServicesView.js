'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package, Tag } from 'lucide-react';

const DEFAULT_SERVICE_TYPES = ['Campaign', 'Creative', 'Digital', 'SEO', 'Social Media', 'Content', 'Video', 'General'];

export default function ServicesView({ user }) {
  const [services, setServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState(DEFAULT_SERVICE_TYPES);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', defaultRate: '', description: '', serviceType: 'General' });
  const [customType, setCustomType] = useState('');
  const [showCustomType, setShowCustomType] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { loadServices(); }, []);

  const loadServices = async () => {
    try {
      const res = await apiFetch('GET', 'services');
      setServices(res.services || []);
      // Merge existing types with defaults
      if (res.serviceTypes && res.serviceTypes.length > 0) {
        const allTypes = [...new Set([...DEFAULT_SERVICE_TYPES, ...res.serviceTypes])];
        setServiceTypes(allTypes);
      }
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const finalType = showCustomType && customType ? customType : form.serviceType;
      const data = { ...form, serviceType: finalType };
      
      if (editing) {
        await apiFetch('PUT', `services/${editing.id}`, data);
        toast.success('Service updated');
      } else {
        await apiFetch('POST', 'services', data);
        toast.success('Service created');
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: '', defaultRate: '', description: '', serviceType: 'General' });
      setCustomType('');
      setShowCustomType(false);
      loadServices();
    } catch (err) { toast.error(err.message); }
  };

  const handleEdit = (svc) => {
    setEditing(svc);
    setForm({ name: svc.name, defaultRate: svc.defaultRate, description: svc.description, serviceType: svc.serviceType || 'General' });
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

  const canManageServices = user.role === 'admin' || user.role === 'super_admin';

  // Group services by type
  const groupedServices = services.reduce((acc, svc) => {
    const type = svc.serviceType || 'General';
    if (!acc[type]) acc[type] = [];
    acc[type].push(svc);
    return acc;
  }, {});

  const filteredServices = filterType === 'all' 
    ? services 
    : services.filter(s => (s.serviceType || 'General') === filterType);

  const getTypeColor = (type) => {
    const colors = {
      'Campaign': 'bg-blue-100 text-blue-800',
      'Creative': 'bg-purple-100 text-purple-800',
      'Digital': 'bg-indigo-100 text-indigo-800',
      'SEO': 'bg-emerald-100 text-emerald-800',
      'Social Media': 'bg-pink-100 text-pink-800',
      'Content': 'bg-amber-100 text-amber-800',
      'Video': 'bg-red-100 text-red-800',
      'General': 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Service Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage service offerings and rates</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {serviceTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageServices && (
            <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) { setEditing(null); setForm({ name: '', defaultRate: '', description: '', serviceType: 'General' }); setCustomType(''); setShowCustomType(false); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto"><Plus size={16} className="mr-2" /> Add Service</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Edit Service' : 'New Service'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div><Label>Service Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Static Post Design" /></div>
                  <div>
                    <Label>Service Type *</Label>
                    <Select value={showCustomType ? 'custom' : form.serviceType} onValueChange={(v) => {
                      if (v === 'custom') {
                        setShowCustomType(true);
                      } else {
                        setShowCustomType(false);
                        setForm({ ...form, serviceType: v });
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                        <SelectItem value="custom">+ Add Custom Type</SelectItem>
                      </SelectContent>
                    </Select>
                    {showCustomType && (
                      <Input 
                        className="mt-2" 
                        value={customType} 
                        onChange={e => setCustomType(e.target.value)} 
                        placeholder="Enter custom type name" 
                      />
                    )}
                  </div>
                  <div><Label>Default Rate (BDT) *</Label><Input type="number" value={form.defaultRate} onChange={e => setForm({ ...form, defaultRate: e.target.value })} placeholder="1600" /></div>
                  <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description" /></div>
                  <Button onClick={handleSave} className="w-full">{editing ? 'Update' : 'Create'} Service</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Service Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 sm:h-32 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <Package className="mx-auto mb-3" size={36} />
          <p>No services configured</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredServices.map(svc => (
            <Card key={svc.id} className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="text-indigo-600" size={18} />
                  </div>
                  {canManageServices && (
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(svc)} className="p-1.5 rounded hover:bg-muted"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(svc.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-sm truncate">{svc.name}</h3>
                <Badge className={`${getTypeColor(svc.serviceType || 'General')} text-xs mt-1 border-0`}>
                  <Tag size={10} className="mr-1" />{svc.serviceType || 'General'}
                </Badge>
                <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-2">{formatBDT(svc.defaultRate)}</p>
                {svc.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{svc.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
