import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useMyApplications, useJobMessages, ApplicationStatus } from "@/hooks/useJobApplications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<ApplicationStatus, { label: string; color: string; icon: any }> = {
  new: { label: "Submitted", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
  viewed: { label: "Viewed", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: Eye },
  shortlisted: { label: "Shortlisted", color: "bg-green-500/10 text-green-600 border-green-500/20", icon: Star },
  interview: { label: "Interview", color: "bg-accent/10 text-accent border-accent/20", icon: Calendar },
  rejected: { label: "Not Selected", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  hired: { label: "Hired!", color: "bg-green-600/10 text-green-700 border-green-600/20", icon: CheckCircle },
  withdrawn: { label: "Withdrawn", color: "bg-gray-500/10 text-gray-600 border-gray-500/20", icon: AlertCircle },
};

const MyApplications = () => {
  const { user, loading: authLoading } = useAuth();
  const { applications, loading, withdrawApplication } = useMyApplications();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    searchParams.get('chat')
  );
  const [chatOpen, setChatOpen] = useState(!!searchParams.get('chat'));

  const { messages, sendMessage, markMessagesAsRead } = useJobMessages(selectedApplicationId || undefined);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const handleOpenChat = async (applicationId: string) => {
    setSelectedApplicationId(applicationId);
    setChatOpen(true);
    // Mark messages as read when opening chat
    setTimeout(() => markMessagesAsRead(), 500);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedApplicationId) return;
    
    setSendingMessage(true);
    const { error } = await sendMessage(newMessage.trim(), 'applicant');
    
    if (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } else {
      setNewMessage("");
    }
    setSendingMessage(false);
  };

  const handleWithdraw = async (applicationId: string) => {
    if (!confirm("Are you sure you want to withdraw this application?")) return;
    
    const { error } = await withdrawApplication(applicationId);
    if (error) {
      toast({ title: "Error", description: "Failed to withdraw application", variant: "destructive" });
    } else {
      toast({ title: "Application withdrawn" });
    }
  };

  if (authLoading) {
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

  const selectedApplication = applications.find(a => a.id === selectedApplicationId);

  return (
    <>
      <Helmet>
        <title>My Applications | Wellington EcoBuild</title>
      </Helmet>

      <Header />

      <main className="pt-20 lg:pt-24 min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                My Applications
              </h1>
              <p className="text-muted-foreground">
                Track the status of your job applications
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link to="/jobs/profile">
                  Edit Profile
                </Link>
              </Button>
              <Button asChild>
                <Link to="/jobs">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Find Jobs
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Briefcase className="w-5 h-5 text-blue-600" />
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
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.status === 'viewed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Viewed</p>
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
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.status === 'shortlisted' || a.status === 'interview').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Shortlisted</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {applications.filter(a => a.status !== 'rejected' && a.status !== 'withdrawn').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No applications yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start applying for construction opportunities
                  </p>
                  <Button asChild>
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Position</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applications.map((app) => {
                        const status = statusConfig[app.status];
                        const StatusIcon = status.icon;
                        
                        return (
                          <TableRow key={app.id}>
                            <TableCell>
                              <div>
                                <Link 
                                  to={`/jobs/${app.job.id}`}
                                  className="font-medium text-foreground hover:text-primary transition-colors"
                                >
                                  {app.job.title}
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {app.job.location}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                {app.business.name}
                              </div>
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
                                  variant="ghost"
                                  onClick={() => handleOpenChat(app.id)}
                                >
                                  <MessageSquare className="w-4 h-4" />
                                </Button>
                                {app.status === 'new' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700"
                                    onClick={() => handleWithdraw(app.id)}
                                  >
                                    Withdraw
                                  </Button>
                                )}
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

      {/* Chat Dialog */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-lg h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </DialogTitle>
            {selectedApplication && (
              <DialogDescription>
                {selectedApplication.job.title} at {selectedApplication.business.name}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No messages yet. Start a conversation with the employer.
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'applicant' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        msg.sender_type === 'applicant'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_type === 'applicant' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Message Input */}
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

      <Footer />
    </>
  );
};

export default MyApplications;