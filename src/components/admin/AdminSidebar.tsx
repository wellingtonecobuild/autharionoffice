import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Star,
  FolderTree,
  Users,
  FileText,
  Settings,
  ScrollText,
  LogOut,
  Newspaper,
  Mail,
  MapPin,
  Briefcase,
  Gift,
  Bell,
  DollarSign,
  Megaphone,
  Wallet,
  Clock,
  Bot,
  Crown,
  ChevronRight,
  Home,
  Activity,
  Phone,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Notifications', url: '/admin/notifications', icon: Bell, notificationKey: 'notifications' as const },
  { title: 'Held Payments', url: '/admin/held-payments', icon: Wallet },
  { title: 'Bulk Operations', url: '/admin/bulk-operations', icon: Briefcase },
  { title: 'Performance', url: '/admin/performance', icon: Star },
  { title: 'Email Sequences', url: '/admin/email-sequences', icon: Mail },
];

const businessNavItems = [
  { title: 'Businesses', url: '/admin/businesses', icon: Building2 },
  { title: 'Jobs', url: '/admin/jobs', icon: Briefcase },
  { title: 'Applications', url: '/admin/applications', icon: FileText },
  { title: 'Verifications', url: '/admin/verifications', icon: ShieldCheck },
  { title: 'Featured', url: '/admin/featured', icon: Star },
  { title: 'Map Control', url: '/admin/map', icon: MapPin },
];

const financeNavItems = [
  { title: 'Revenue', url: '/admin/revenue', icon: CreditCard },
  { title: 'Plans & Pricing', url: '/admin/plans', icon: DollarSign },
  { title: 'Elite Caps', url: '/admin/elite-caps', icon: Crown },
  { title: 'Subscriptions', url: '/admin/subscriptions', icon: CreditCard },
  { title: 'Referrals', url: '/admin/referrals', icon: Gift },
  { title: 'Leads', url: '/admin/leads', icon: MessageSquare, notificationKey: 'leads' as const },
  { title: 'Portal Users', url: '/admin/portal-users', icon: Users },
  { title: 'Portal Invoices', url: '/admin/portal-invoices', icon: FileText },
  { title: 'Contractor Activity', url: '/admin/contractor-activity', icon: Activity },
  { title: 'Call Verification', url: '/admin/call-verification', icon: Phone },
  { title: 'Report Builder', url: '/admin/reports', icon: FileText },
];

const contentNavItems = [
  { title: 'Market Insights', url: '/admin/blog', icon: Newspaper },
  { title: 'AdSense', url: '/admin/adsense', icon: Megaphone },
  
  { title: 'Categories', url: '/admin/categories', icon: FolderTree },
  { title: 'Reviews', url: '/admin/reviews', icon: FileText },
];

const systemNavItems = [
  { title: 'AI Assistant', url: '/admin/assistant', icon: Bot },
  { title: 'Gmail Inbox', url: '/admin/gmail-inbox', icon: Mail },
  { title: 'Communications', url: '/admin/communications', icon: MessageSquare },
  { title: 'Contacts', url: '/admin/contacts', icon: MessageSquare, notificationKey: 'contacts' as const },
  { title: 'Users & Roles', url: '/admin/users', icon: Users },
  { title: 'Permissions', url: '/admin/permissions', icon: ShieldCheck },
  { title: 'Scheduled Jobs', url: '/admin/cron-jobs', icon: Clock },
  { title: 'Audit Logs', url: '/admin/audit-logs', icon: ScrollText },
  { title: 'Activity Stream', url: '/admin/activity-stream', icon: Clock },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

type NotificationKey = 'leads' | 'contacts' | 'notifications';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  notificationKey?: NotificationKey;
}

export function AdminSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { unreadContacts, unreadLeads, unreadNotifications } = useAdminNotifications();

  const getNotificationCount = (key?: NotificationKey): number => {
    if (!key) return 0;
    if (key === 'contacts') return unreadContacts;
    if (key === 'leads') return unreadLeads;
    if (key === 'notifications') return unreadNotifications;
    return 0;
  };

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const renderNavItem = (item: NavItem) => {
    const count = getNotificationCount(item.notificationKey);
    const active = isActive(item.url);
    
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={active}>
          <NavLink 
            to={item.url} 
            className={`
              flex items-center justify-between w-full px-3 py-2 rounded-md text-sm
              transition-all duration-150
              ${active 
                ? 'bg-admin-teal text-white font-medium' 
                : 'text-foreground/70 hover:bg-admin-border/50 hover:text-foreground'
              }
            `}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className={`h-4 w-4 ${active ? 'text-white' : 'text-admin-slate'}`} />
              <span>{item.title}</span>
            </span>
            {count > 0 ? (
              <Badge 
                className="h-5 min-w-5 px-1.5 text-[10px] font-semibold bg-admin-error text-white border-0"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            ) : active ? (
              <ChevronRight className="h-3.5 w-3.5 text-white/60" />
            ) : null}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderNavSection = (title: string, items: NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-wider text-admin-slate mb-1">
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-0.5">
          {items.map(renderNavItem)}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar className="border-r border-admin-border bg-card">
      {/* Header */}
      <SidebarHeader className="border-b border-admin-border p-4">
        <NavLink to="/admin" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-admin-navy flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">WE</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm text-foreground">Wellington EcoBuild</h2>
            <p className="text-[10px] text-admin-slate font-medium tracking-wide uppercase">
              Admin Portal
            </p>
          </div>
        </NavLink>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-3">
        {renderNavSection('Overview', mainNavItems)}
        
        <Separator className="my-3 bg-admin-border" />
        
        {renderNavSection('Business Management', businessNavItems)}
        
        <Separator className="my-3 bg-admin-border" />
        
        {renderNavSection('Finance & Revenue', financeNavItems)}
        
        <Separator className="my-3 bg-admin-border" />
        
        {renderNavSection('Content', contentNavItems)}
        
        <Separator className="my-3 bg-admin-border" />
        
        {renderNavSection('System', systemNavItems)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-admin-border p-3 space-y-2">
        <NavLink to="/">
          <Button 
            variant="outline" 
            className="w-full justify-start text-sm h-9 border-admin-border text-foreground/70 hover:text-foreground hover:bg-admin-border/30"
          >
            <Home className="h-4 w-4 mr-2" />
            Back to Website
          </Button>
        </NavLink>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-9 text-admin-error hover:text-admin-error hover:bg-admin-error/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}