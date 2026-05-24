import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Briefcase, 
  Building2, 
  User, 
  Eye, 
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  MessageSquare,
  Search,
  FileText,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ApplicationStatus } from "@/hooks/useJobApplications";

const statusConfig: Record<ApplicationStatus, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  viewed: { label: "Viewed", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  shortlisted: { label: "Shortlisted", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  interview: { label: "Interview", color: "bg-accent/10 text-accent border-accent/20" },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  hired: { label: "Hired", color: "bg-green-600/10 text-green-700 border-green-600/20" },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};

interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  business_id: string;
  cover_letter: string | null;
  cv_url: string | null;
  status: ApplicationStatus;
  status_notes: string | null;
  is_read: boolean;
  created_at: string;
  job: { id: string; title: string; location: string };
  business: { id: string; name: string };
  applicant_profile?: {
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
    trade_role: string | null;
    cv_url: string | null;
    bio: string | null;
  };
}

interface Message {
  id: string;
  application_id: string;
  sender_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

const AdminApplications = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [messagesDialogOpen, setMessagesDialogOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("job_applications")
        .select(`
          *,
          job:jobs!inner(id, title, location),
          business:businesses!inner(id, name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch applicant profiles
      const applicantIds = [...new Set(data?.map(a => a.applicant_id) || [])];
      
      if (applicantIds.length > 0) {
        const { data: profiles } = await supabase
          .from("job_seeker_profiles")
          .select("user_id, full_name, email, phone, location, trade_role, cv_url, bio")
          .in("user_id", applicantIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const enriched = (data || []).map(app => ({
          ...app,
          status: app.status as ApplicationStatus,
          applicant_profile: profileMap.get(app.applicant_id),
        }));

        setApplications(enriched as Application[]);
      } else {
        setApplications((data || []).map(d => ({ ...d, status: d.status as ApplicationStatus })) as Application[]);
      }
    } catch (err) {
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  useAutoRefresh(fetchApplications);

  const fetchMessages = async (applicationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from("job_messages")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleViewApplication = (app: Application) => {
    setSelectedApplication(app);
    setViewDialogOpen(true);
  };

  const handleViewMessages = async (app: Application) => {
    setSelectedApplication(app);
    setMessagesDialogOpen(true);
    await fetchMessages(app.id);
  };

  const filteredApplications = applications.filter(app => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      app.applicant_profile?.full_name?.toLowerCase().includes(search) ||
      app.job.title.toLowerCase().includes(search) ||
      app.business.name.toLowerCase().includes(search)
    );
  });

  // Stats
  const stats = {
    total: applications.length,
    new: applications.filter(a => a.status === "new").length,
    shortlisted: applications.filter(a => a.status === "shortlisted" || a.status === "interview").length,
    hired: applications.filter(a => a.status === "hired").length,
  };

  return (
    <AdminLayout title="Job Applications">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-sm text-muted-foreground">New</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Star className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.shortlisted}</p>
                <p className="text-sm text-muted-foreground">Shortlisted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.hired}</p>
                <p className="text-sm text-muted-foreground">Hired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="viewed">Viewed</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="hired">Hired</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Applications Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try adjusting your search" : "Applications will appear here"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {app.applicant_profile?.full_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {app.applicant_profile?.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/jobs/${app.job.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {app.job.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          {app.business.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[app.status].color}>
                          {statusConfig[app.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewApplication(app)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewMessages(app)}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Application Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            {selectedApplication && (
              <DialogDescription>
                {selectedApplication.job.title} at {selectedApplication.business.name}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedApplication?.applicant_profile && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {selectedApplication.applicant_profile.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {selectedApplication.applicant_profile.email}
                    </div>
                    {selectedApplication.applicant_profile.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {selectedApplication.applicant_profile.phone}
                      </div>
                    )}
                    {selectedApplication.applicant_profile.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {selectedApplication.applicant_profile.location}
                      </div>
                    )}
                    {selectedApplication.applicant_profile.trade_role && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        {selectedApplication.applicant_profile.trade_role.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  {selectedApplication.applicant_profile.bio && (
                    <p className="text-sm text-muted-foreground pt-2 border-t">
                      {selectedApplication.applicant_profile.bio}
                    </p>
                  )}
                </CardContent>
              </Card>

              {(selectedApplication.cv_url || selectedApplication.applicant_profile.cv_url) && (
                <Card>
                  <CardContent className="py-4">
                    <Button asChild variant="outline">
                      <a 
                        href={selectedApplication.cv_url || selectedApplication.applicant_profile.cv_url || ''} 
                        target="_blank"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View CV
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {selectedApplication.cover_letter && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cover Letter</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedApplication.cover_letter}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Status</p>
                    <Badge className={statusConfig[selectedApplication.status].color}>
                      {statusConfig[selectedApplication.status].label}
                    </Badge>
                  </div>
                  {selectedApplication.status_notes && (
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.status_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Messages Dialog */}
      <Dialog open={messagesDialogOpen} onOpenChange={setMessagesDialogOpen}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conversation History</DialogTitle>
            {selectedApplication && (
              <DialogDescription>
                {selectedApplication.applicant_profile?.full_name} - {selectedApplication.job.title}
              </DialogDescription>
            )}
          </DialogHeader>

          <ScrollArea className="flex-1">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No messages in this conversation
              </p>
            ) : (
              <div className="space-y-4 pr-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'employer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_type === 'employer'
                          ? 'bg-primary text-primary-foreground'
                          : msg.sender_type === 'admin'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.sender_type === 'applicant' ? 'Applicant' : msg.sender_type === 'employer' ? 'Employer' : 'Admin'}
                      </p>
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminApplications;