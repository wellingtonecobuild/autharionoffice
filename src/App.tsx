import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { PortalUserProvider } from "@/hooks/usePortalUser";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import { GlobalCacheInitializer } from "@/components/GlobalCacheInitializer";
import { PageViewTracker } from "@/components/PageViewTracker";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Category from "./pages/Category";
import BusinessListing from "./pages/BusinessListing";
import Locations from "./pages/Locations";
import Map from "./pages/Map";
import LocationDetail from "./pages/LocationDetail";
import MarketInsights from "./pages/MarketInsights";
import MarketInsightPost from "./pages/MarketInsightPost";
import HashtagPage from "./pages/HashtagPage";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import ListBusiness from "./pages/ListBusiness";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import HowItWorks from "./pages/HowItWorks";
import Verification from "./pages/Verification";
import ListingStandards from "./pages/ListingStandards";
import Legal from "./pages/Legal";
import ReferralProgram from "./pages/ReferralProgram";
import Contact from "./pages/Contact";
import Search from "./pages/Search";
import TrackProject from "./pages/TrackProject";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBusinesses from "./pages/admin/AdminBusinesses";
import AdminVerifications from "./pages/admin/AdminVerifications";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminRevenue from "./pages/admin/AdminRevenue";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminFeatured from "./pages/admin/AdminFeatured";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminMapControl from "./pages/admin/AdminMapControl";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminJobs from "./pages/admin/AdminJobs";
import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminAdsense from "./pages/admin/AdminAdsense";
import AdminHeldPayments from "./pages/admin/AdminHeldPayments";
import AdminCronJobs from "./pages/admin/AdminCronJobs";
import AdminAssistant from "./pages/admin/AdminAssistant";

import AdminEliteCaps from "./pages/admin/AdminEliteCaps";
import AdminEmails from "./pages/admin/AdminEmails";
import AdminGmailInbox from "./pages/admin/AdminGmailInbox";
import AdminCommunications from "./pages/admin/AdminCommunications";
import AdminAudioGenerator from "./pages/admin/AdminAudioGenerator";
import AdminTrials from "./pages/admin/AdminTrials";
import AdminActivityStream from "./pages/admin/AdminActivityStream";
import AdminEmailSequences from "./pages/admin/AdminEmailSequences";
import AdminBulkOperations from "./pages/admin/AdminBulkOperations";
import AdminPerformanceDashboard from "./pages/admin/AdminPerformanceDashboard";
import AdminReportBuilder from "./pages/admin/AdminReportBuilder";
import AdminPermissions from "./pages/admin/AdminPermissions";
import AdminPortalUsers from "./pages/admin/AdminPortalUsers";
import AdminPortalInvoices from "./pages/admin/AdminPortalInvoices";
import AdminPortalAnalytics from "./pages/admin/AdminPortalAnalytics";
import AdminPortalAuditLog from "./pages/admin/AdminPortalAuditLog";
import AdminPortalTaxReports from "./pages/admin/AdminPortalTaxReports";
import AdminStaffDirectory from "./pages/admin/AdminStaffDirectory";
import AdminContractorActivity from "./pages/admin/AdminContractorActivity";
import PortalLogin from "./pages/portal/PortalLogin";
import PortalAcceptInvitation from "./pages/portal/PortalAcceptInvitation";
import PortalActivationSuccess from "./pages/portal/PortalActivationSuccess";
import PortalDashboard from "./pages/portal/PortalDashboard";
import PortalProfile from "./pages/portal/PortalProfile";
import PortalCreateInvoice from "./pages/portal/PortalCreateInvoice";
import PortalPayments from "./pages/portal/PortalPayments";
import PortalTimesheets from "./pages/portal/PortalTimesheets";
import PortalDocuments from "./pages/portal/PortalDocuments";
import PortalOnboarding from "./pages/portal/PortalOnboarding";
import PortalInvoices from "./pages/portal/PortalInvoices";
import PortalInvoiceView from "./pages/portal/PortalInvoiceView";
import PortalCommunication from "./pages/portal/PortalCommunication";
import PortalCallLog from "./pages/portal/PortalCallLog";
import PortalWelcome from "./pages/portal/PortalWelcome";
import AdminCallVerification from "./pages/admin/AdminCallVerification";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import JobSeekerProfile from "./pages/jobs/JobSeekerProfile";
import MyApplications from "./pages/jobs/MyApplications";
import EmployerApplications from "./pages/employer/EmployerApplications";
import AdminApplications from "./pages/admin/AdminApplications";
import LiveStats from "./pages/LiveStats";
import SubmitArticle from "./pages/SubmitArticle";
import ContributorDashboard from "./pages/ContributorDashboard";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import Community from "./pages/Community";
import AskQuestion from "./pages/AskQuestion";
import ProjectEstimator from "./pages/ProjectEstimator";
import MarketData from "./pages/MarketData";
import Suburbs from "./pages/Suburbs";
import SuburbPage from "./pages/SuburbPage";
import Leaderboard from "./pages/Leaderboard";
import Resources from "./pages/Resources";
import Events from "./pages/Events";
import PartnerProgram from "./pages/PartnerProgram";
import Showcases from "./pages/Showcases";
import Inbox from "./pages/Inbox";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <GlobalCacheInitializer />
      <AuthProvider>
        <PortalUserProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <PageViewTracker />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/about" element={<About />} />
                <Route path="/directory" element={<Category />} />
                <Route path="/category/:slug" element={<Category />} />
                <Route path="/category/:slug/:subSlug" element={<Category />} />
                <Route path="/business/:id" element={<BusinessListing />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/map" element={<Map />} />
                <Route path="/location/:slug" element={<LocationDetail />} />
                <Route path="/market-insights" element={<MarketInsights />} />
                <Route path="/market-insights/:slug" element={<MarketInsightPost />} />
                <Route path="/news" element={<MarketInsights />} />
                <Route path="/news/:slug" element={<MarketInsightPost />} />
                <Route path="/tag/:tag" element={<HashtagPage />} />
                <Route path="/blog" element={<MarketInsights />} />
                <Route path="/blog/:slug" element={<MarketInsightPost />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/listing-standards" element={<ListingStandards />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/terms" element={<Legal />} />
                <Route path="/privacy" element={<Legal />} />
                <Route path="/sales-terms" element={<Legal />} />
                <Route path="/disclaimer" element={<Legal />} />
                <Route path="/acceptable-use" element={<Legal />} />
                <Route path="/referral-program" element={<ReferralProgram />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/search" element={<Search />} />
                <Route path="/track-project" element={<TrackProject />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/list-business" element={<ListBusiness />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                {/* Job Routes */}
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/jobs/profile" element={<JobSeekerProfile />} />
                <Route path="/jobs/applications" element={<MyApplications />} />
                {/* Employer Routes */}
                <Route path="/employer/applications" element={<EmployerApplications />} />
                <Route path="/stats" element={<LiveStats />} />
                <Route path="/submit-article" element={<SubmitArticle />} />
                <Route path="/contributor" element={<ContributorDashboard />} />
                {/* Growth Features */}
                <Route path="/community" element={<Community />} />
                <Route path="/community/ask" element={<AskQuestion />} />
                <Route path="/community/:slug" element={<Community />} />
                <Route path="/estimate" element={<ProjectEstimator />} />
                <Route path="/market-data" element={<MarketData />} />
                <Route path="/suburbs" element={<Suburbs />} />
                <Route path="/suburb/:slug" element={<SuburbPage />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/resources" element={<Resources />} />
                <Route path="/events" element={<Events />} />
                <Route path="/partners" element={<PartnerProgram />} />
                <Route path="/showcases" element={<Showcases />} />
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/businesses" element={<AdminBusinesses />} />
                <Route path="/admin/verifications" element={<AdminVerifications />} />
                <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                <Route path="/admin/revenue" element={<AdminRevenue />} />
                <Route path="/admin/leads" element={<AdminLeads />} />
                <Route path="/admin/featured" element={<AdminFeatured />} />
                <Route path="/admin/categories" element={<AdminCategories />} />
                <Route path="/admin/blog" element={<AdminBlog />} />
                <Route path="/admin/reviews" element={<AdminReviews />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/map" element={<AdminMapControl />} />
                <Route path="/admin/contacts" element={<AdminContacts />} />
                <Route path="/admin/jobs" element={<AdminJobs />} />
                <Route path="/admin/referrals" element={<AdminReferrals />} />
                <Route path="/admin/notifications" element={<AdminNotifications />} />
                <Route path="/admin/plans" element={<AdminPlans />} />
                <Route path="/admin/elite-caps" element={<AdminEliteCaps />} />
                <Route path="/admin/adsense" element={<AdminAdsense />} />
                <Route path="/admin/held-payments" element={<AdminHeldPayments />} />
                <Route path="/admin/cron-jobs" element={<AdminCronJobs />} />
                <Route path="/admin/assistant" element={<AdminAssistant />} />
                <Route path="/admin/trials" element={<AdminTrials />} />
                <Route path="/admin/applications" element={<AdminApplications />} />
                
                <Route path="/admin/emails" element={<AdminEmails />} />
                <Route path="/admin/gmail-inbox" element={<AdminGmailInbox />} />
                <Route path="/admin/communications" element={<AdminCommunications />} />
                <Route path="/admin/audio-generator" element={<AdminAudioGenerator />} />
                <Route path="/admin/portal-users" element={<AdminPortalUsers />} />
                <Route path="/admin/portal-invoices" element={<AdminPortalInvoices />} />
                <Route path="/admin/portal-analytics" element={<AdminPortalAnalytics />} />
                <Route path="/admin/portal-audit-log" element={<AdminPortalAuditLog />} />
                <Route path="/admin/portal-tax-reports" element={<AdminPortalTaxReports />} />
                <Route path="/admin/staff-directory" element={<AdminStaffDirectory />} />
                <Route path="/admin/contractor-activity" element={<AdminContractorActivity />} />
                <Route path="/admin/activity-stream" element={<AdminActivityStream />} />
                <Route path="/admin/email-sequences" element={<AdminEmailSequences />} />
                <Route path="/admin/bulk-operations" element={<AdminBulkOperations />} />
                <Route path="/admin/performance" element={<AdminPerformanceDashboard />} />
                <Route path="/admin/report-builder" element={<AdminReportBuilder />} />
                <Route path="/admin/permissions" element={<AdminPermissions />} />
                {/* Internal Portal Routes */}
                <Route path="/portal/login" element={<PortalLogin />} />
                <Route path="/portal/accept-invitation" element={<PortalAcceptInvitation />} />
                <Route path="/portal/activation-success" element={<PortalActivationSuccess />} />
                <Route path="/portal/onboarding" element={<PortalOnboarding />} />
                <Route path="/portal/welcome" element={<PortalWelcome />} />
                <Route path="/portal/dashboard" element={<PortalDashboard />} />
                <Route path="/portal/profile" element={<PortalProfile />} />
                <Route path="/portal/invoices/new" element={<PortalCreateInvoice />} />
                <Route path="/portal/invoices/:id" element={<PortalInvoiceView />} />
                <Route path="/portal/invoices" element={<PortalInvoices />} />
                <Route path="/portal/payments" element={<PortalPayments />} />
                <Route path="/portal/timesheets" element={<PortalTimesheets />} />
                <Route path="/portal/documents" element={<PortalDocuments />} />
                <Route path="/portal/communication" element={<PortalCommunication />} />
                <Route path="/portal/call-log" element={<PortalCallLog />} />
                <Route path="/admin/call-verification" element={<AdminCallVerification />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieConsent />
              
            </BrowserRouter>
          </TooltipProvider>
        </PortalUserProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
