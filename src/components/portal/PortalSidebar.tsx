import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePortalUser } from '@/hooks/usePortalUser';
import { useAuth } from '@/hooks/useAuth';
import {
  Building2,
  LayoutDashboard,
  FileText,
  DollarSign,
  Clock,
  FolderOpen,
  MessageSquare,
  User,
  LogOut,
  Settings,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const menuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/portal/dashboard',
    description: 'Overview & stats'
  },
  {
    label: 'Invoices',
    icon: FileText,
    href: '/portal/invoices',
    description: 'Manage invoices'
  },
  {
    label: 'Payments',
    icon: DollarSign,
    href: '/portal/payments',
    description: 'Payment history'
  },
  {
    label: 'Timesheets',
    icon: Clock,
    href: '/portal/timesheets',
    description: 'Submit hours'
  },
  {
    label: 'Documents',
    icon: FolderOpen,
    href: '/portal/documents',
    description: 'Files & docs'
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    href: '/portal/communication',
    description: 'Admin contact'
  },
];

const secondaryItems = [
  {
    label: 'Profile',
    icon: User,
    href: '/portal/profile',
    description: 'Account settings'
  },
];

interface PortalSidebarProps {
  className?: string;
}

export default function PortalSidebar({ className }: PortalSidebarProps) {
  const location = useLocation();
  const { portalUser } = usePortalUser();
  const { signOut } = useAuth();

  return (
    <aside className={cn(
      "w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col",
      className
    )}>
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <Link to="/portal/dashboard" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-sm">Wellington EcoBuild</h1>
            <p className="text-xs text-emerald-600 font-medium">Contractor Portal</p>
          </div>
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <User className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {portalUser?.legal_full_name || 'Contractor'}
            </p>
            <p className="text-xs text-slate-500 truncate">{portalUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="p-4">
        <Link to="/portal/invoices/new">
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/portal/dashboard' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-emerald-600" : "text-slate-400"
                )} />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight className="h-4 w-4 text-emerald-500" />
                )}
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {secondaryItems.map((item) => {
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-emerald-600" : "text-slate-400"
                )} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Portal v2.0</span>
          <Link to="/" className="text-emerald-600 hover:underline">
            Main Site
          </Link>
        </div>
      </div>
    </aside>
  );
}
