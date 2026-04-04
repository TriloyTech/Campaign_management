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
import { apiFetch, formatBDT } from '@/lib/api';
import { toast } from 'sonner';
import { 
  Plus, Building2, Search, Pencil, Trash2, Phone, Mail, MapPin, 
  TrendingUp, DollarSign, FileText, CheckCircle, Clock, Package,
  ChevronRight, BarChart3, Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AgenciesView({ user, navigate }) {
  const [activeTab, setActiveTab] = useState('list');
  const [agencies, setAgencies] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';

  useEffect(() => {
    loadAgencies();
    loadDashboard();
  }, []);

  const loadAgencies = async () => {
    try {
      const res = await apiFetch('GET', 'agencies');
      setAgencies(res.agencies || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const loadDashboard = async () => {
    try {
      const res = await apiFetch('GET', 'agencies/dashboard');
      setDashboard(res);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Agency name is required'); return; }
    try {
      if (editing) {
        await apiFetch('PUT', `agencies/${editing.id}`, form);
        toast.success('Agency updated');
      } else {
        await apiFetch('POST', 'agencies', form);
        toast.success('Agency created');
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
      loadAgencies();
      loadDashboard();
    } catch (err) { toast.error(err.message); }
  };

  const handleEdit = (agency) => {
    setEditing(agency);
    setForm({
      name: agency.name,
      contactPerson: agency.contactPerson || '',
      email: agency.email || '',
      phone: agency.phone || '',
      address: agency.address || '',
      notes: agency.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agency?')) return;
    try {
      await apiFetch('DELETE', `agencies/${id}`);
      toast.success('Agency deleted');
      loadAgencies();
      loadDashboard();
    } catch (err) { toast.error(err.message); }
  };

  const filteredAgencies = agencies.filter(a =>
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Building2 className="text-blue-600" size={24} /> External Agencies
          </h1>
          <p className="text-sm text-muted-foreground">Manage outsourcing partners and track expenses</p>
        </div>
        {isAdmin && (
          <Dialog open={showDialog} onOpenChange={(open) => { 
            setShowDialog(open); 
            if (!open) { setEditing(null); setForm({ name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' }); } 
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto"><Plus size={16} className="mr-2" /> Add Agency</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Agency' : 'New Agency'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Agency Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Agency name" /></div>
                <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} placeholder="Primary contact" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@agency.com" /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+880 ..." /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Office address" /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional notes" /></div>
                <Button onClick={handleSave} className="w-full">{editing ? 'Update' : 'Create'} Agency</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="list" className="text-xs sm:text-sm">
            <Building2 size={14} className="mr-1" /> Agencies
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
            <BarChart3 size={14} className="mr-1" /> Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Agency List Tab */}
        <TabsContent value="list" className="space-y-4 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input className="pl-9" placeholder="Search agencies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>

          {/* Agency Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : filteredAgencies.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="mx-auto mb-3" size={36} />
                <p>No agencies found</p>
                <p className="text-sm mt-1">Add your first external agency to start tracking expenses</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgencies.map(agency => (
                <Card 
                  key={agency.id} 
                  className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`agency-detail/${agency.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="text-white" size={18} />
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={(e) => { e.stopPropagation(); handleEdit(agency); }} className="p-1.5 rounded hover:bg-muted">
                            <Pencil size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(agency.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm truncate mb-1">{agency.name}</h3>
                    {agency.contactPerson && (
                      <p className="text-xs text-muted-foreground truncate mb-2">{agency.contactPerson}</p>
                    )}

                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Deliverables</p>
                        <p className="font-medium text-sm">{agency.completedDeliverables}/{agency.totalDeliverables}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payable</p>
                        <p className="font-medium text-sm text-amber-600">{formatBDT(agency.totalPayable)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end mt-3 text-xs text-blue-600">
                      View Details <ChevronRight size={12} className="ml-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4 mt-4">
          {dashboard ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Agencies</p>
                        <p className="text-xl sm:text-2xl font-bold">{dashboard.summary.totalAgencies}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="text-blue-600" size={18} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Agency Cost</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600 truncate">{formatBDT(dashboard.summary.totalAgencyCost)}</p>
                      </div>
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="text-amber-600" size={18} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Pending Payment</p>
                        <p className="text-xl sm:text-2xl font-bold text-red-600 truncate">{formatBDT(dashboard.summary.pendingPayment)}</p>
                      </div>
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <Clock className="text-red-600" size={18} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Paid</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 truncate">{formatBDT(dashboard.summary.totalPaid)}</p>
                      </div>
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="text-emerald-600" size={18} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly Expenses Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp size={16} /> Monthly Agency Expenses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.monthlyExpenses && dashboard.monthlyExpenses.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={dashboard.monthlyExpenses}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} width={40} />
                          <Tooltip formatter={(value) => [formatBDT(value), 'Expense']} />
                          <Bar dataKey="expense" fill="#f59e0b" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No expense data yet</div>
                    )}
                  </CardContent>
                </Card>

                {/* Agency Breakdown */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users size={16} /> Agency Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboard.agencyBreakdown && dashboard.agencyBreakdown.length > 0 ? (
                      <div className="space-y-3 max-h-[220px] overflow-y-auto">
                        {dashboard.agencyBreakdown.slice(0, 5).map((agency, i) => (
                          <div key={agency.id} className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <p className="text-sm font-medium truncate">{agency.name}</p>
                                <p className="text-sm font-bold text-amber-600">{formatBDT(agency.totalPayable)}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span>{agency.completedDeliverables}/{agency.totalDeliverables} delivered</span>
                                {agency.uninvoiced > 0 && (
                                  <Badge variant="outline" className="text-xs text-amber-600">
                                    {formatBDT(agency.uninvoiced)} uninvoiced
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">No agency data yet</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Uninvoiced Alert */}
              {dashboard.summary.uninvoicedAmount > 0 && (
                <Card className="border-amber-200 bg-amber-50 shadow-sm">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="text-amber-600" size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Uninvoiced Amount</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBDT(dashboard.summary.uninvoicedAmount)} worth of delivered work not yet invoiced
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                      Review
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
