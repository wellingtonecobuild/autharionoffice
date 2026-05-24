import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePortalUser } from '@/hooks/usePortalUser';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, 
  FileText, 
  Phone, 
  Mail, 
  Clock,
  CheckCircle2,
  ArrowRight,
  User,
  DollarSign,
  FolderOpen,
  BookOpen,
  Shield,
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function PortalWelcome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { portalUser, loading } = usePortalUser();
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !portalUser) {
      navigate('/portal/login');
      return;
    }

    // Check if user has seen welcome
    if (portalUser) {
      const welcomed = localStorage.getItem(`portal_welcomed_${portalUser.id}`);
      if (welcomed === 'true') {
        setHasSeenWelcome(true);
      }
    }
  }, [portalUser, loading, navigate]);

  const handleContinue = async () => {
    if (!acknowledged) {
      toast.error('Please acknowledge that you have read the guidelines');
      return;
    }

    setSaving(true);
    try {
      // Mark as welcomed
      if (portalUser) {
        localStorage.setItem(`portal_welcomed_${portalUser.id}`, 'true');
      }
      
      // Log the acknowledgment
      await supabase.from('portal_audit_log').insert({
        portal_user_id: portalUser?.id,
        action: 'welcome_acknowledged',
        new_value: { acknowledged_at: new Date().toISOString() },
        performed_by: user?.id,
      });

      toast.success('Welcome! Redirecting to your dashboard...');
      navigate('/portal/dashboard');
    } catch (error) {
      console.error('Error:', error);
      navigate('/portal/dashboard');
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isContractor = portalUser?.role === 'contractor';

  return (
    <>
      <Helmet>
        <title>Welcome | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="font-bold text-slate-900">Wellington EcoBuild</h1>
                  <p className="text-xs text-slate-500">Contractor Portal</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Welcome Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Welcome to the Portal
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              Hello, {portalUser?.legal_full_name?.split(' ')[0] || 'Contractor'}!
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              This quick guide will help you understand how to use the Wellington EcoBuild Portal effectively.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Call Logs */}
            <Card className="border-2 border-indigo-300 bg-indigo-50/30 hover:border-indigo-400 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Phone className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">Call Log</CardTitle>
                      <Badge className="bg-indigo-600 text-white text-xs">VERIFIED</Badge>
                    </div>
                    <CardDescription>Record all client phone communications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Verification Notice */}
                <div className="bg-indigo-100 border border-indigo-200 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-indigo-800">
                      <strong>Notice:</strong> Admin may contact the people you log to verify your communications. 
                      Ensure all entries are accurate and truthful.
                    </p>
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm leading-relaxed">
                  Record all your phone calls with clients, suppliers, and subcontractors. This creates an audit trail for accountability.
                </p>
                <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-indigo-800">How to use:</p>
                  <ul className="text-sm text-indigo-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Log every call immediately after completion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Include accurate contact name, phone, and email</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Record the purpose and outcome of each call</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Add detailed notes for your records</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Messages & Emails - CRITICAL COMPLIANCE */}
            <Card className="border-2 border-red-300 bg-red-50/30 hover:border-red-400 transition-all duration-300 hover:shadow-lg md:col-span-2">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <Mail className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">Messages & Emails</CardTitle>
                      <Badge className="bg-red-600 text-white text-xs">MANDATORY</Badge>
                    </div>
                    <CardDescription>All client communications MUST go through this portal</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Critical Warning Box */}
                <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-red-900 text-base mb-2">⚠️ IMPORTANT COMPLIANCE REQUIREMENT</h4>
                      <ul className="text-sm text-red-800 space-y-2">
                        <li className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span><strong>ALL emails to clients and companies MUST be sent through this portal</strong> - not from your personal email</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span><strong>Every email you send is automatically logged, tracked, and monitored</strong> by administration</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>Email content, recipients, timestamps, and attachments are permanently recorded</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>Any attempt to falsify communications or bypass tracking may result in termination</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <p className="text-slate-600 text-sm leading-relaxed">
                  This portal provides a secure, professional way to communicate with clients on behalf of Wellington EcoBuild. 
                  All communications are tracked for quality assurance, compliance, and to protect both you and the company.
                </p>
                
                <div className="bg-rose-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-rose-800">How to use:</p>
                  <ul className="text-sm text-rose-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Use "New Message" for internal admin communication</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Use "Send Email" for ALL external client/company emails</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>View complete history of all your sent emails in the "Sent" tab</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Attach files up to 10MB per attachment</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Invoices */}
            {isContractor && (
              <Card className="border-2 border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <FileText className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Invoices</CardTitle>
                      <CardDescription>Submit and track your invoices</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Create professional invoices, submit them for approval, and track payment status all in one place.
                  </p>
                  <div className="bg-emerald-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-emerald-800">Invoice workflow:</p>
                    <ul className="text-sm text-emerald-700 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <Badge className="bg-slate-500 text-white text-xs">Draft</Badge>
                        <span>Create and save for later</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge className="bg-amber-500 text-white text-xs">Submitted</Badge>
                        <span>Sent for admin review</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge className="bg-blue-500 text-white text-xs">Approved</Badge>
                        <span>Approved, awaiting payment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge className="bg-emerald-500 text-white text-xs">Paid</Badge>
                        <span>Payment processed</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timesheets */}
            <Card className="border-2 border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Clock className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Timesheets</CardTitle>
                    <CardDescription>Log your work hours</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Track your daily work hours, breaks, and project assignments. Essential for accurate billing and payroll.
                </p>
                <div className="bg-amber-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-800">Best practices:</p>
                  <ul className="text-sm text-amber-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Log hours daily for accuracy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Include project/job references</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Note any overtime or special rates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Submit weekly for approval</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Documents */}
            <Card className="border-2 border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-500/20">
                    <FolderOpen className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Documents</CardTitle>
                    <CardDescription>Access important files</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Access company documents, policies, and upload your own certifications and compliance documents.
                </p>
                <div className="bg-slate-100 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Document types:</p>
                  <ul className="text-sm text-slate-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Company policies and procedures</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Health & Safety documentation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Your certifications & licenses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Training materials</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Profile */}
            <Card className="border-2 border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Your Profile</CardTitle>
                    <CardDescription>Keep your details up to date</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-600 text-sm leading-relaxed">
                  Maintain accurate personal details, bank information, and emergency contacts for smooth operations.
                </p>
                <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-semibold text-purple-800">Keep updated:</p>
                  <ul className="text-sm text-purple-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Contact details and address</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Bank account for payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>IRD number and GST details</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Emergency contact information</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance & Tracking Notice */}
          <Card className="border-2 border-red-300 bg-red-50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900 mb-3 text-lg">📋 Compliance & Activity Tracking</h3>
                  <ul className="text-sm text-red-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold">1.</span>
                      <span><strong>All emails MUST be sent through this portal</strong> - using personal email for work communications is prohibited</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">2.</span>
                      <span><strong>Every email and call log is permanently recorded</strong> and can be audited at any time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">3.</span>
                      <span><strong>Admin may verify your logged calls</strong> by contacting the people you've recorded</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold">4.</span>
                      <span><strong>Falsifying records or bypassing tracking</strong> is grounds for immediate contract termination</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Standard Reminders */}
          <Card className="border-2 border-amber-200 bg-amber-50 mb-8">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">General Reminders</h3>
                  <ul className="text-sm text-amber-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-medium">•</span>
                      <span>All data you enter is securely stored and only accessible to authorized personnel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">•</span>
                      <span>Log your call activities immediately after each call</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">•</span>
                      <span>Submit invoices by the 20th of each month for timely processing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-medium">•</span>
                      <span>Contact admin through the Messages section for any questions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Acknowledgment */}
          <Card className="border-2 border-emerald-200 bg-white">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Checkbox 
                  id="acknowledge"
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  className="mt-1"
                />
                <div>
                  <label htmlFor="acknowledge" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                    <strong>I acknowledge and agree to the following:</strong>
                    <ul className="mt-2 space-y-1 text-slate-600">
                      <li>• I will send ALL work-related emails to clients and companies through this portal only</li>
                      <li>• I understand that all my emails, call logs, and activities are tracked and monitored</li>
                      <li>• I understand that admin may verify my logged calls by contacting the people I record</li>
                      <li>• I will not falsify any records or attempt to bypass tracking systems</li>
                      <li>• I have read and understood all portal guidelines and compliance requirements</li>
                    </ul>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-center mt-8">
                <Button
                  size="lg"
                  onClick={handleContinue}
                  disabled={saving || !acknowledged}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-12 py-6 text-lg shadow-lg shadow-emerald-500/20"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Continue to Dashboard
                      <ArrowRight className="h-5 w-5 ml-3" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
