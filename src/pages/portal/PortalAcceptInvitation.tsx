import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Building2, CheckCircle, XCircle, ArrowLeft, Lock, Shield, Eye, EyeOff, FileText, Scale, AlertTriangle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function PortalAcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Legal acceptance states
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptContractorAgreement, setAcceptContractorAgreement] = useState(false);
  const [showContractorTerms, setShowContractorTerms] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_invitations')
          .select('*, portal_user:portal_users(*)')
          .eq('token', token)
          .is('accepted_at', null)
          .single();

        if (error || !data) {
          setError('Invalid or expired invitation');
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError('This invitation has expired. Please contact admin for a new one.');
          return;
        }

        setInvitation(data);
      } catch (err) {
        setError('Failed to verify invitation');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const getPasswordStrength = (pass: string) => {
    let strength = 0;
    if (pass.length >= 8) strength++;
    if (pass.length >= 12) strength++;
    if (/[A-Z]/.test(pass)) strength++;
    if (/[0-9]/.test(pass)) strength++;
    if (/[^A-Za-z0-9]/.test(pass)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500', 'bg-emerald-600'];

  const isContractor = invitation?.role === 'contractor';
  
  // All required acceptances must be checked
  const allAcceptancesComplete = acceptTerms && acceptPrivacy && 
    (!isContractor || acceptContractorAgreement);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!allAcceptancesComplete) {
      toast.error('Please accept all required terms and conditions');
      return;
    }

    setProcessing(true);

    try {
      const response = await supabase.functions.invoke('portal-accept-invitation', {
        body: { 
          token, 
          password,
          acceptedTerms: acceptTerms,
          acceptedPrivacy: acceptPrivacy,
          acceptedContractorAgreement: isContractor ? acceptContractorAgreement : null,
          acceptedAt: new Date().toISOString()
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success('Account activated successfully!');
      
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password
      });

      if (loginError) {
        // Still show success page even if auto-login fails
        navigate('/portal/activation-success');
      } else {
        // Show success page with login instructions
        navigate('/portal/activation-success');
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to activate account');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Accept Invitation | Wellington EcoBuild Portal</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mb-6 shadow-2xl shadow-emerald-500/30">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Wellington EcoBuild</h1>
            <p className="text-emerald-400 mt-2 font-medium">Contractor Portal</p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur">
            <CardHeader className="text-center pb-2">
              {loading ? (
                <>
                  <div className="flex justify-center mb-4">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                  </div>
                  <CardTitle className="text-slate-800">Verifying Invitation...</CardTitle>
                  <CardDescription className="text-slate-500">Please wait while we verify your invitation</CardDescription>
                </>
              ) : error ? (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                      <XCircle className="h-10 w-10 text-red-500" />
                    </div>
                  </div>
                  <CardTitle className="text-slate-800">Invitation Invalid</CardTitle>
                  <CardDescription className="text-red-500">{error}</CardDescription>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-10 w-10 text-emerald-600" />
                    </div>
                  </div>
                  <CardTitle className="text-xl text-slate-800">Accept Your Invitation</CardTitle>
                  <CardDescription className="text-slate-500">
                    You have been invited as a <span className="text-emerald-600 font-semibold capitalize">{invitation?.role}</span>
                  </CardDescription>
                </>
              )}
            </CardHeader>
            
            {!loading && !error && invitation && (
              <CardContent className="pt-4">
                {/* Email Display */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Your Login Email</p>
                  <p className="text-slate-800 font-semibold">{invitation.email}</p>
                </div>

                <form onSubmit={handleAccept} className="space-y-5">
                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-slate-700 font-medium">Create Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="pl-10 pr-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${
                                i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-slate-500">
                          Password strength: <span className={`font-medium ${passwordStrength >= 3 ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {strengthLabels[passwordStrength - 1] || 'Too weak'}
                          </span>
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-500">Minimum 8 characters. Use uppercase, numbers, and symbols for a stronger password.</p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={`pl-10 pr-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 ${
                          confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-500' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-500">Passwords do not match</p>
                    )}
                  </div>

                  {/* Legal Acceptance Section */}
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Scale className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold">Legal Agreements</span>
                    </div>

                    {/* Contractor Agreement (only for contractors) */}
                    {isContractor && (
                      <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-amber-800 text-sm">Independent Contractor Agreement</p>
                            <p className="text-xs text-amber-700 mt-1">
                              Please read carefully before accepting
                            </p>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setShowContractorTerms(!showContractorTerms)}
                          className="text-xs text-amber-700 underline hover:text-amber-900 mb-3"
                        >
                          {showContractorTerms ? 'Hide' : 'View'} full agreement
                        </button>
                        
                        {showContractorTerms && (
                          <ScrollArea className="h-48 rounded-lg border border-amber-200 bg-white p-3 mb-3">
                            <div className="text-xs text-slate-700 space-y-3">
                              <p className="font-semibold text-slate-900">INDEPENDENT CONTRACTOR ACKNOWLEDGMENT</p>
                              <p>By accepting this agreement, I acknowledge and confirm that:</p>
                              
                              <p className="font-semibold">1. Employment Status</p>
                              <p>I am engaged as an <strong>independent contractor</strong> and NOT as an employee of Wellington EcoBuild. I understand there is no employment relationship between myself and Wellington EcoBuild.</p>
                              
                              <p className="font-semibold">2. Tax Obligations (Inland Revenue)</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>I am responsible for filing my own annual tax return (IR3) with Inland Revenue New Zealand</li>
                                <li>No PAYE tax is deducted from payments made to me</li>
                                <li>I am responsible for paying provisional tax if my residual income tax exceeds $5,000</li>
                                <li>If my annual turnover exceeds $60,000, I must register for GST and file GST returns</li>
                                <li>I will keep accurate records of all income and expenses for at least 7 years as required by IRD</li>
                              </ul>
                              
                              <p className="font-semibold">3. ACC Levies</p>
                              <p>As a self-employed person, I am responsible for paying my own ACC levies directly to ACC.</p>
                              
                              <p className="font-semibold">4. No Employee Benefits</p>
                              <p>I understand that as an independent contractor, I am NOT entitled to:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Annual leave or holiday pay</li>
                                <li>Sick leave entitlements</li>
                                <li>KiwiSaver employer contributions</li>
                                <li>Redundancy payments</li>
                                <li>Any other employee benefits under NZ employment law</li>
                              </ul>
                              
                              <p className="font-semibold">5. Insurance</p>
                              <p>I acknowledge that I am responsible for my own:</p>
                              <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Public liability insurance (recommended minimum $1,000,000)</li>
                                <li>Professional indemnity insurance (if applicable)</li>
                                <li>Income protection insurance</li>
                              </ul>
                              
                              <p className="font-semibold">6. Business Registration</p>
                              <p>I confirm that I am operating as a legitimate self-employed business and have any necessary registrations (NZBN, GST if applicable) in place or will obtain them as required.</p>
                              
                              <p className="font-semibold">7. Compliance with NZ Law</p>
                              <p>This agreement is governed by the laws of New Zealand. I agree to comply with all applicable New Zealand laws and regulations, including but not limited to the Income Tax Act 2007, Goods and Services Tax Act 1985, and Health and Safety at Work Act 2015.</p>
                              
                              <p className="font-semibold">8. IRD Resources</p>
                              <p>I have been directed to visit <a href="https://www.ird.govt.nz/roles/self-employed" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">ird.govt.nz/roles/self-employed</a> for information about my tax obligations.</p>
                              
                              <p className="text-slate-500 mt-4 pt-3 border-t">
                                This acknowledgment forms part of the contractual relationship between myself and Wellington EcoBuild. A record of this acceptance will be stored for compliance purposes.
                              </p>
                            </div>
                          </ScrollArea>
                        )}
                        
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="contractorAgreement"
                            checked={acceptContractorAgreement}
                            onCheckedChange={(checked) => setAcceptContractorAgreement(checked === true)}
                            className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          />
                          <Label htmlFor="contractorAgreement" className="text-xs text-amber-800 leading-relaxed cursor-pointer">
                            I acknowledge that I am an <strong>independent contractor</strong>, I understand my tax obligations to IRD, and I am responsible for my own ACC levies, GST (if applicable), and annual tax returns. I confirm I am not an employee.
                          </Label>
                        </div>
                      </div>
                    )}

                    {/* Terms of Service */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={acceptTerms}
                        onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                        className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                        I agree to the{' '}
                        <Link to="/terms" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">
                          Terms of Service
                        </Link>
                        {' '}and{' '}
                        <Link to="/acceptable-use" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">
                          Acceptable Use Policy
                        </Link>
                      </Label>
                    </div>

                    {/* Privacy Policy */}
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="privacy"
                        checked={acceptPrivacy}
                        onCheckedChange={(checked) => setAcceptPrivacy(checked === true)}
                        className="mt-0.5 border-slate-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                      <Label htmlFor="privacy" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                        I have read and agree to the{' '}
                        <Link to="/privacy" target="_blank" className="text-emerald-600 underline hover:text-emerald-700">
                          Privacy Policy
                        </Link>
                        . I consent to the collection and processing of my personal information (including IRD number and bank details) in accordance with the Privacy Act 2020 (NZ) for the purposes of payment processing and tax compliance.
                      </Label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={processing || password !== confirmPassword || password.length < 8 || !allAcceptancesComplete}
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Activating Account...
                      </>
                    ) : (
                      'Accept & Activate My Account'
                    )}
                  </Button>
                </form>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-slate-100">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-slate-500">Your password is encrypted and secure</span>
                </div>
              </CardContent>
            )}

            {!loading && error && (
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <Button 
                    className="w-full h-12 bg-slate-800 hover:bg-slate-900"
                    asChild
                  >
                    <Link to="/portal/login">Go to Login</Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-slate-200"
                    asChild
                  >
                    <a href="mailto:info@wellingtonecobuild.nz">Contact Support</a>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          <div className="mt-6 text-center">
            <Link to="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-300 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to main website
            </Link>
          </div>

          <p className="text-center text-xs text-slate-600 mt-8">
            © {new Date().getFullYear()} Wellington EcoBuild. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
