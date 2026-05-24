import { useState, useCallback } from "react";
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Loader2, Mail, MessageSquare, Copy, ExternalLink, Check, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";

interface NewsletterSubscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminContacts = () => {
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null);
  const queryClient = useQueryClient();

  const { data: subscribers = [], isLoading: loadingSubs, refetch: refetchSubs } = useQuery({
    queryKey: ["admin-newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as NewsletterSubscriber[];
    },
  });

  const { data: contacts = [], isLoading: loadingContacts, refetch: refetchContacts } = useQuery({
    queryKey: ["admin-contact-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ContactSubmission[];
    },
  });

  // Auto-refresh every 5 seconds
  useAutoRefresh(useCallback(async () => { 
    await refetchSubs(); 
    await refetchContacts(); 
  }, [refetchSubs, refetchContacts]));

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-unread-contacts"] });
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_submissions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-submissions"] });
      toast.success("Message deleted");
    },
    onError: () => {
      toast.error("Failed to delete message");
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const openEmailClient = (email: string, subject?: string) => {
    const mailtoUrl = `mailto:${email}${subject ? `?subject=Re: ${encodeURIComponent(subject)}` : ''}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleViewContact = (contact: ContactSubmission) => {
    setSelectedContact(contact);
    if (!contact.is_read) {
      markAsReadMutation.mutate(contact.id);
    }
  };

  const unreadContacts = contacts.filter(c => !c.is_read).length;

  return (
    <>
      <Helmet>
        <title>Contacts & Subscribers | Admin</title>
      </Helmet>

      <AdminLayout title="Contacts & Subscribers">
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold">Contacts & Subscribers</h1>
            <p className="text-muted-foreground">
              Manage contact form submissions and newsletter subscribers
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{contacts.length}</p>
                  <p className="text-sm text-muted-foreground">Contact Messages</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Mail className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadContacts}</p>
                  <p className="text-sm text-muted-foreground">Unread Messages</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subscribers.length}</p>
                  <p className="text-sm text-muted-foreground">Total Subscribers</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Check className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{subscribers.filter(s => s.is_active).length}</p>
                  <p className="text-sm text-muted-foreground">Active Subscribers</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="contacts">
            <TabsList>
              <TabsTrigger value="contacts" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Contact Messages
                {unreadContacts > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {unreadContacts}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="subscribers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Newsletter Subscribers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contacts" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Form Submissions</CardTitle>
                  <CardDescription>Messages from the contact form - click to view full message and respond</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingContacts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : contacts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No contact submissions yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>From</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Message Preview</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact) => (
                          <TableRow 
                            key={contact.id} 
                            className={!contact.is_read ? "bg-accent/30" : ""}
                          >
                            <TableCell>
                              <div>
                                <div className="font-medium">{contact.name}</div>
                                <div className="text-sm text-muted-foreground">{contact.email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {contact.subject || "No subject"}
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              <p className="truncate text-sm text-muted-foreground">
                                {contact.message}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant={contact.is_read ? "secondary" : "default"}>
                                {contact.is_read ? "Read" : "New"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(contact.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(contact.email, "Email")}
                                  title="Copy email"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEmailClient(contact.email, contact.subject || undefined)}
                                  title="Reply in email client"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteContactMutation.mutate(contact.id)}
                                  title="Delete message"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewContact(contact)}
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscribers" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Newsletter Subscribers</CardTitle>
                  <CardDescription>People who signed up for your newsletter</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingSubs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : subscribers.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No subscribers yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Subscribed</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscribers.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell className="font-medium">{sub.email}</TableCell>
                            <TableCell>
                              <Badge variant={sub.is_active ? "default" : "secondary"}>
                                {sub.is_active ? "Active" : "Unsubscribed"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(sub.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(sub.email, "Email")}
                                  title="Copy email"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openEmailClient(sub.email)}
                                  title="Send email"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </AdminLayout>

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message from {selectedContact?.name}
            </DialogTitle>
            <DialogDescription>
              Received on {selectedContact && format(new Date(selectedContact.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">From</label>
                  <p className="font-medium">{selectedContact.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{selectedContact.email}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(selectedContact.email, "Email")}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedContact.subject && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Subject</label>
                  <p className="font-medium">{selectedContact.subject}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-muted-foreground">Message</label>
                <div className="mt-1 p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedContact.message}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => openEmailClient(selectedContact.email, selectedContact.subject || undefined)}
                  className="flex-1"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Reply in Email Client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(selectedContact.email, "Email")}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminContacts;