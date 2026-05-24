import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useEmployerApplications, useJobMessages, ApplicationStatus } from "@/hooks/useJobApplications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  Building2, 
  MapPin, 
  Calendar,
  MessageSquare,
  Eye,
  Loader2,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Star,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  User,
  Download,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const statusConfig: Record<ApplicationStatus, { label: string; color: string; icon: any }> = {
  new: { label: "New", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
  viewed: { label: "Viewed", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Eye },
  shortlisted: { label: "Shortlisted", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Star },
  interview: { label: "Interview", color: "bg-accent/10 text-accent border-accent/20", icon: Calendar },
  rejected: { label: "Rejected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  hired: { label: "Hired", color: "bg-green-600/10 text-green-700 border-green-600/20", icon: CheckCircle },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: AlertCircle },
};

const EmployerApplications = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  const { applications, loading, updateApplicationStatus, markAsRead } = useEmployerApplications(selectedBusinessId);
  
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>("viewed");
  const [statusNotes, setStatusNotes] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { messages, sendMessage, markMessagesAsRead } = useJobMessages(selectedApplicationId || undefined);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Fetch user's businesses
  useEffect(() => {
    const fetchBusinesses = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("id, name")
          .eq("owner_id", user.id)
          .in("status", ["approved", "active"]);

        if (error) throw error;
        setBusinesses(data || []);
        
        if (data && data.length > 0) {
          setSelectedBusinessId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching businesses:", err);
      } finally {
        setLoadingBusinesses(false);
      }
    };

    fetchBusinesses();
  }, [user?.id]);

  const handleViewApplication = async (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setViewDialogOpen(true);
    await markAsRead(applicationId);
  };

  const handleOpenChat = async (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setChatDialogOpen(true);
    setTimeout(() => markMessagesAsRead(), 500);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedApplicationId) return;
    
    setSendingMessage(true);
    const { error } = await sendMessage(newMessage.trim(), 'employer');
    
    if (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSendingMessage(false);
  };

  const handleStatusChange = async () => {
    if (!selectedApplicationId) return;
    
    const { error } = await updateApplicationStatus(selectedApplicationId, newStatus, statusNotes);
    
    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Status updated" });
      setStatusDialogOpen(false);
      setStatusNotes("");
    }
  };

  const openStatusDialog = (applicationId: string, currentStatus: ApplicationStatus) => {
    setSelectedApplicationId(applicationId);
    setNewStatus(currentStatus);
    setStatusDialogOpen(true);
  };

  if (authLoading || loadingBusinesses) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (businesses.length === 0) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen bg-background">
          <div className="container mx-auto px-4 py-20 text-center">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              No Business Found
            </h1>
            <p className="text-muted-foreground mb-6">
              You need to have an approved business listing to receive applications.
            </p>
            <Button asChild>
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const selectedApplication = applications.find(a => a.id === selectedApplicationId);
  
  const filteredApplications = statusFilter === 'all' 
    ? applications 
    : applications.filter(a => a.status === statusFilter);

  // Stats
  const newCount = applications.filter(a => a.status === 'new').length;
  const shortlistedCount = applications.filter(a => a.status === 'shortlisted' || a.status === 'interview').length;
  const hiredCount = applications.filter(a => a.status === 'hired').length;

  return (
    <>
      <Helmet>
        <title>Applications | Employer Dashboard | Wellington EcoBuild</title>
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                Applications Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage applications for your job postings
              </p>
            </div>
            
            {businesses.length > 1 && (
              <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select business" />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{applications.length}</p>
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
                    <p className="text-2xl font-bold">{newCount}</p>
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
                    <p className="text-2xl font-bold">{shortlistedCount}</p>
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
                    <p className="text-2xl font-bold">{hiredCount}</p>
                    <p className="text-sm text-muted-foreground">Hired</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
              <TabsTrigger value="new">New ({newCount})</TabsTrigger>
              <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
              <TabsTrigger value="interview">Interview</TabsTrigger>
              <TabsTrigger value="hired">Hired</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

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
                  <h3 className="font-semibold text-foreground mb-2">No applications</h3>
                  <p className="text-muted-foreground">
                    {statusFilter === 'all' 
                      ? "You haven't received any applications yet"
                      : `No applications with status "${statusFilter}"`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplications.map((app) => {
                        const status = statusConfig[app.status];
                        const StatusIcon = status.icon;
                        const profile = app.applicant_profile;
                        
                        return (
                          <TableRow key={app.id} className={!app.is_read ? 'bg-blue-50/50' : ''}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {profile?.full_name || 'Unknown Applicant'}
                                    {!app.is_read && (
                                      <Badge variant="secondary" className="ml-2 text-xs">New</Badge>
                                    )}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {profile?.trade_role?.replace(/_/g, ' ') || 'No role specified'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link 
                                to={`/jobs/${app.job.id}`}
                                className="font-medium text-foreground hover:text-primary transition-colors"
                              >
                                {app.job.title}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewApplication(app.id)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenChat(app.id)}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openStatusDialog(app.id, app.status)}
                                >
                                  Update
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* View Application Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            {selectedApplication && (
              <DialogDescription>
                For {selectedApplication.job.title}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedApplication?.applicant_profile && (
            <div className="space-y-6">
              {/* Applicant Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {selectedApplication.applicant_profile.full_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {selectedApplication.applicant_profile.email}
                    </div>
                    {selectedApplication.applicant_profile.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        {selectedApplication.applicant_profile.phone}
                      </div>
                    )}
                    {selectedApplication.applicant_profile.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {selectedApplication.applicant_profile.location}
                      </div>
                    )}
                    {selectedApplication.applicant_profile.trade_role && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        {selectedApplication.applicant_profile.trade_role.replace(/_/g, ' ')}
                      </div>
                    )}
                  </div>
                  
                  {selectedApplication.applicant_profile.bio && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground">
                        {selectedApplication.applicant_profile.bio}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CV */}
              {(selectedApplication.cv_url || selectedApplication.applicant_profile.cv_url) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      CV / Resume
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline">
                      <a 
                        href={selectedApplication.cv_url || selectedApplication.applicant_profile.cv_url || ''} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download CV
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Cover Letter */}
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

              {/* Status & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge className={statusConfig[selectedApplication.status].color}>
                    {statusConfig[selectedApplication.status].label}
                  </Badge>
                  {selectedApplication.status_notes && (
                    <p className="text-sm text-muted-foreground">
                      {selectedApplication.status_notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setViewDialogOpen(false);
              handleOpenChat(selectedApplicationId!);
            }}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Message Applicant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      <Dialog open={chatDialogOpen} onOpenChange={setChatDialogOpen}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat with {selectedApplication?.applicant_profile?.full_name || 'Applicant'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet. Start a conversation.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'employer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_type === 'employer'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_type === 'employer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 pt-4 border-t">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Change the status and add notes for this application.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ApplicationStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                placeholder="Add any internal notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
};

export default EmployerApplications;