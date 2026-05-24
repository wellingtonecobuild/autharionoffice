import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Building2, ArrowLeft, Mail, Lock, Shield } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) throw error;

      // Check if user is a portal user
      const { data: portalUser, error: portalError } = await supabase
        .from('portal_users')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (portalError || !portalUser) {
        await supabase.auth.signOut();
        throw new Error('This account is not registered for the contractor portal.');
      }

      if (portalUser.status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('Your account has been suspended. Please contact admin.');
      }

      if (portalUser.status === 'inactive') {
        await supabase.auth.signOut();
        throw new Error('Your account is inactive. Please contact admin.');
      }

      toast.success('Welcome back!');
      
      // Redirect based on profile completion
      if (!portalUser.profile_completed) {
        navigate('/portal/profile');
      } else {
        navigate('/portal/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Contractor Portal Login | Wellington EcoBuild</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mb-6 shadow-2xl shadow-emerald-500/30">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Wellington EcoBuild</h1>
            <p className="text-emerald-400 mt-2 font-medium">Contractor Portal</p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl text-slate-800">Welcome Back</CardTitle>
              <CardDescription className="text-slate-500">
                Sign in to access your contractor portal
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-500/25"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-slate-100">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-slate-500">Secure, encrypted connection</span>
              </div>
            </CardContent>
          </Card>

          {/* Help Links */}
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-slate-400">
              Received an invitation?{' '}
              <Link to="/portal/accept-invitation" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
                Accept it here
              </Link>
            </p>
            <div className="text-center">
              <Link to="/" className="inline-flex items-center text-sm text-slate-500 hover:text-slate-300 transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to main website
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-slate-600 mt-8">
            © {new Date().getFullYear()} Wellington EcoBuild. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
