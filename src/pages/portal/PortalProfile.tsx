import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { Building2, Save, Loader2, ArrowLeft, AlertCircle, CheckCircle, Shield, CreditCard, User, FileText, Key, Eye, EyeOff } from 'lucide-react';

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  role: 'contractor' | 'employee';
  ird_number: string | null;
  gst_registered: boolean;
  bank_account_number: string | null;
  hourly_rate: number | null;
  profile_completed: boolean;
}

export default function PortalProfile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  
  // Form state
  const [legalName, setLegalName] = useState('');
  const [irdNumber, setIrdNumber] = useState('');
  const [gstRegistered, setGstRegistered] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/portal/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          toast.error('Portal account not found');
          await signOut();
          navigate('/portal/login');
          return;
        }

        const pUser = data as PortalUser;
        setPortalUser(pUser);
        setLegalName(pUser.legal_full_name || '');
        setIrdNumber(formatIRD(pUser.ird_number || ''));
        setGstRegistered(pUser.gst_registered || false);
        setBankAccount(formatBankAccount(pUser.bank_account_number || ''));
        setHourlyRate(pUser.hourly_rate?.toString() || '');
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, signOut]);

  const formatIRD = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  };

  const formatBankAccount = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 13) return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 13)}-${digits.slice(13, 16)}`;
  };

  const handleIRDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIRD(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 9) {
      setIrdNumber(formatted);
    }
  };

  const handleBankAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBankAccount(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 16) {
      setBankAccount(formatted);
    }
  };

  const validateIRD = (ird: string): boolean => {
    const cleaned = ird.replace(/\D/g, '');
    return cleaned.length >= 8 && cleaned.length <= 9;
  };

  const validateBankAccount = (account: string): boolean => {
    const cleaned = account.replace(/\D/g, '');
    return cleaned.length >= 15 && cleaned.length <= 16;
  };

  const handleSave = async () => {
    if (!portalUser) return;

    // Validation
    if (!legalName.trim()) {
      toast.error('Legal full name is required');
      return;
    }

    if (legalName.trim().length < 3) {
      toast.error('Please enter your full legal name');
      return;
    }

    if (!irdNumber.trim() || !validateIRD(irdNumber)) {
      toast.error('Please enter a valid IRD number (8-9 digits)');
      return;
    }

    if (!bankAccount.trim() || !validateBankAccount(bankAccount)) {
      toast.error('Please enter a valid NZ bank account number (15-16 digits)');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('portal_users')
        .update({
          legal_full_name: legalName.trim(),
          ird_number: irdNumber.replace(/\D/g, ''),
          gst_registered: gstRegistered,
          bank_account_number: bankAccount.replace(/\D/g, ''),
          hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
          profile_completed: true,
          profile_completed_at: new Date().toISOString()
        })
        .eq('id', portalUser.id);

      if (error) throw error;

      toast.success('Profile saved successfully');
      
      if (!portalUser.profile_completed) {
        navigate('/portal/dashboard');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const isNewProfile = !portalUser?.profile_completed;

  return (
    <>
      <Helmet>
        <title>Profile | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-slate-900">Wellington EcoBuild</h1>
                  <p className="text-xs text-slate-500">Contractor Portal</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!isNewProfile && (
            <Link to="/portal/dashboard" className="inline-flex items-center text-sm text-slate-500 hover:text-emerald-600 transition-colors mb-6">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          )}

          {/* Welcome Banner for new profiles */}
          {isNewProfile && (
            <div className="mb-8 p-6 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl text-white shadow-xl shadow-emerald-500/20">
              <h2 className="text-2xl font-bold mb-2">Welcome to the Portal! 👋</h2>
              <p className="text-emerald-100">
                Complete your profile to start submitting timesheets and invoices. This information is required for payment processing.
              </p>
            </div>
          )}

          <Card className="border-0 shadow-xl shadow-slate-200/50">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                {isNewProfile ? 'Complete Your Profile' : 'Your Profile'}
              </CardTitle>
              <CardDescription>
                {isNewProfile 
                  ? 'All fields marked with * are required for compliance and payment processing.'
                  : 'Update your personal and payment details'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              {/* Personal Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700">Personal Information</h3>
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label className="text-slate-600">Email Address</Label>
                  <Input 
                    value={portalUser?.email || ''} 
                    disabled 
                    className="bg-slate-50 border-slate-200 text-slate-500"
                  />
                  <p className="text-xs text-slate-400">This is your login email and cannot be changed</p>
                </div>

                {/* Legal Name */}
                <div className="space-y-2">
                  <Label htmlFor="legalName" className="text-slate-700 font-medium">
                    Legal Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="legalName"
                    placeholder="Enter your full legal name"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    className="h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-slate-500">
                    As it appears on your IRD documents. This will be used on invoices and tax records.
                  </p>
                </div>
              </div>

              {/* Tax Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700">Tax Information</h3>
                </div>

                {/* IRD Number */}
                <div className="space-y-2">
                  <Label htmlFor="irdNumber" className="text-slate-700 font-medium">
                    IRD Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="irdNumber"
                    placeholder="123-456-789"
                    value={irdNumber}
                    onChange={handleIRDChange}
                    className="h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Your Inland Revenue Department number (8-9 digits). Required for tax compliance.
                  </p>
                </div>

                {/* GST Registered */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="gstRegistered" className="text-base font-medium text-slate-700">
                        GST Registered
                      </Label>
                      <p className="text-sm text-slate-500">
                        Toggle on if you are registered for Goods and Services Tax
                      </p>
                    </div>
                    <Switch
                      id="gstRegistered"
                      checked={gstRegistered}
                      onCheckedChange={setGstRegistered}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                </div>

                {gstRegistered && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-800">GST will be added</p>
                      <p className="text-sm text-blue-700">
                        As a GST-registered contractor, 15% GST will be automatically calculated and added to all your invoices.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Information Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700">Payment Information</h3>
                </div>

                {/* Bank Account */}
                <div className="space-y-2">
                  <Label htmlFor="bankAccount" className="text-slate-700 font-medium">
                    Bank Account Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="bankAccount"
                    placeholder="XX-XXXX-XXXXXXX-XXX"
                    value={bankAccount}
                    onChange={handleBankAccountChange}
                    className="h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-xs text-slate-500">
                    Your New Zealand bank account for receiving payments (format: BB-BBBB-AAAAAAA-SSS)
                  </p>
                </div>

                {/* Hourly Rate */}
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate" className="text-slate-700 font-medium">
                    Default Hourly Rate
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      className="h-12 pl-10 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">/hour</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Your standard hourly rate. This will be pre-filled when creating timesheets.
                  </p>
                </div>
              </div>

              {/* Account Security Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <Key className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold text-slate-700">Account Security</h3>
                </div>
                
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base font-medium text-slate-700">
                        Password
                      </Label>
                      <p className="text-sm text-slate-500">
                        Change your login password
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => setShowPasswordDialog(true)}
                      className="border-slate-300"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-6 border-t border-slate-100">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      {isNewProfile ? 'Complete Profile & Continue' : 'Save Changes'}
                    </>
                  )}
                </Button>
              </div>

              {/* Security Notice */}
              <div className="p-5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">Your data is secure</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Your sensitive information including IRD number and bank account details are encrypted using industry-standard security protocols. Only authorized administrators can access this information for payment processing purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} Wellington EcoBuild. All rights reserved.
          </p>
        </main>

        {/* Password Change Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Minimum 8 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
