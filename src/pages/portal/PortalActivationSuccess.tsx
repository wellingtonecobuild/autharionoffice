import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Globe, 
  LogIn, 
  User, 
  FileText, 
  Clock,
  ExternalLink,
  Bookmark
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function PortalActivationSuccess() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Account Activated! | Wellington EcoBuild Portal</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 mb-6 shadow-2xl shadow-emerald-500/30">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Wellington EcoBuild</h1>
            <p className="text-emerald-400 mt-2 font-medium">Contractor Portal</p>
          </div>

          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur overflow-hidden">
            {/* Success Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur mb-4">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Account Activated Successfully!</h2>
              <p className="text-emerald-100">Your contractor portal account is now ready to use</p>
            </div>

            <CardContent className="p-8">
              {/* How to Login Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <LogIn className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-800">How to Access Your Portal</h3>
                </div>

                {/* Main Website Login - Primary Method */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-6 mb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <Globe className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-emerald-900">Login via Main Website</h4>
                    <span className="text-xs font-medium bg-emerald-600 text-white px-2 py-0.5 rounded-full">Recommended</span>
                  </div>

                  <p className="text-sm text-emerald-700 mb-4">
                    Access your contractor portal by logging into the main Wellington EcoBuild website:
                  </p>
                  
                  <ol className="text-sm text-emerald-800 space-y-3 ml-1 mb-4">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">1</span>
                      <span>Go to <strong className="text-emerald-900">wellingtonecobuild.nz</strong></span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">2</span>
                      <span>Click <strong className="text-emerald-900">"Contractor Login"</strong> in the website header</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">3</span>
                      <span>Enter your <strong className="text-emerald-900">email and password</strong> to sign in</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-xs font-bold">4</span>
                      <span>Click <strong className="text-emerald-900">"Contractor Portal"</strong> in the top menu to access your portal</span>
                    </li>
                  </ol>

                  <div className="flex items-center gap-2 bg-white/60 rounded-lg p-3 border border-emerald-200">
                    <ExternalLink className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <a 
                      href="https://wellingtonecobuild.nz" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-emerald-700 font-medium hover:text-emerald-900 hover:underline"
                    >
                      wellingtonecobuild.nz
                    </a>
                  </div>
                </div>

                {/* Bookmark Reminder */}
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <Bookmark className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    <strong>Pro tip:</strong> Bookmark <strong>wellingtonecobuild.nz</strong> in your browser for quick access!
                  </p>
                </div>
              </div>

              {/* What's Next Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-lg font-bold text-slate-800">What's Next?</h3>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-emerald-900">Complete Your Profile</p>
                      <p className="text-sm text-emerald-700">Add your IRD number, bank details, and contact information</p>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Required</span>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-600 text-white flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Submit Timesheets</p>
                      <p className="text-sm text-slate-600">Log your weekly hours for approval and payment</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-600 text-white flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">Create Invoices</p>
                      <p className="text-sm text-slate-600">Generate and submit invoices for your services</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-lg shadow-emerald-500/25"
                  onClick={() => navigate('/portal/welcome')}
                >
                  Get Started - View Portal Guide
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>

                <Button 
                  variant="outline"
                  className="w-full h-12 border-slate-200 hover:bg-slate-50"
                  onClick={() => navigate('/portal/profile')}
                >
                  Skip to Profile Setup
                </Button>
              </div>

              {/* Support Info */}
              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-500">
                  Need help? Contact us at{' '}
                  <a href="mailto:info@wellingtonecobuild.nz" className="text-emerald-600 font-medium hover:underline">
                    info@wellingtonecobuild.nz
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-slate-600 mt-8">
            © {new Date().getFullYear()} Wellington EcoBuild. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
