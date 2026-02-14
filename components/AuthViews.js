'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';

export default function AuthViews({ onLogin, onRegister, currentView, navigate }) {
  const [isLogin, setIsLogin] = useState(currentView !== 'register');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', organizationName: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await onLogin(form.email, form.password);
        toast.success('Welcome back!');
      } else {
        await onRegister(form);
        toast.success('Account created successfully!');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Demo data loaded! Login with admin@agency.com / admin123');
        setForm({ ...form, email: 'admin@agency.com', password: 'admin123' });
        setIsLogin(true);
      }
    } catch (err) {
      toast.error('Failed to seed data');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4">
            <Megaphone className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CampaignPulse</h1>
          <p className="text-slate-500 text-sm mt-1">Digital Marketing Campaign Tracker</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{isLogin ? 'Sign In' : 'Create Account'}</CardTitle>
            <CardDescription>{isLogin ? 'Enter your credentials to continue' : 'Set up your agency account'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <Label htmlFor="orgName">Agency Name</Label>
                    <Input id="orgName" placeholder="Your agency name" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required />
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@agency.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600 hover:underline">
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t text-center">
              <button onClick={seedData} className="text-xs text-slate-400 hover:text-blue-600 transition-colors">
                Load demo data for testing
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
