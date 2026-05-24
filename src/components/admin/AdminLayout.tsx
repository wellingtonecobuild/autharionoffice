import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';
import { useAdmin } from '@/hooks/useAdmin';
import { Loader2, Shield, Clock, User, Building2 } from 'lucide-react';
import { format } from 'date-fns';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { isAdmin, loading, user } = useAdmin();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth?redirect=/admin');
      } else if (!isAdmin) {
        navigate('/');
      }
    }
  }, [isAdmin, loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-bg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-lg bg-admin-navy flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-admin-navy">Verifying credentials...</p>
            <p className="text-xs text-admin-slate mt-1">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen min-h-[100dvh] flex w-full bg-admin-bg overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* NZ Government Style Header */}
          <header className="sticky top-0 z-10 bg-admin-navy">
            {/* Primary Header Bar */}
            <div className="flex h-14 items-center gap-4 px-4 sm:px-6 border-b border-admin-navy-light/30">
              <SidebarTrigger className="text-white/80 hover:text-white hover:bg-admin-navy-light" />
              
              {/* Government Branding */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-admin-navy-light/30">
                  <div className="w-8 h-8 rounded bg-admin-teal flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[10px] text-admin-teal-light font-medium tracking-wider uppercase">Wellington EcoBuild</p>
                    <p className="text-xs text-white/60">Administration Portal</p>
                  </div>
                </div>
                <h1 className="text-base sm:text-lg font-semibold text-white tracking-tight">{title}</h1>
              </div>

              {/* Right Side - User & Time */}
              <div className="ml-auto flex items-center gap-4">
                <div className="hidden lg:flex items-center gap-3 text-xs text-white/60">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-admin-navy-light/40">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{format(currentTime, 'HH:mm:ss')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-admin-navy-light/40">
                    <span>{format(currentTime, 'EEEE, d MMMM yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-4 border-l border-admin-navy-light/30">
                  <div className="w-8 h-8 rounded-full bg-admin-teal/20 flex items-center justify-center">
                    <User className="h-4 w-4 text-admin-teal-light" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-medium text-white">Beveck Chiwawa</p>
                    <p className="text-[10px] text-white/50">Founder & CEO</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-4 px-4 sm:px-6 py-1.5 bg-admin-navy-dark text-[11px]">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-admin-success animate-pulse" />
                  <span className="text-admin-success font-medium">System Online</span>
                </span>
              </div>
              <span className="text-admin-navy-light">•</span>
              <div className="flex items-center gap-1.5 text-white/50">
                <Shield className="h-3 w-3" />
                <span>Secure Connection</span>
              </div>
              <span className="text-admin-navy-light hidden sm:block">•</span>
              <span className="text-white/50 hidden sm:block">Session ID: {user?.id?.slice(0, 8)}</span>
            </div>
          </header>

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}