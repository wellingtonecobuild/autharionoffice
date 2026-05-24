import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Send,
  Plus,
  Settings,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  Loader2,
  Eye,
  MessageSquare
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface BusinessProjectDashboardProps {
  businessId: string;
}

export function BusinessProjectDashboard({ businessId }: BusinessProjectDashboardProps) {
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [newMilestone, setNewMilestone] = useState({ name: '', description: '', estimated_date: '' });
  const [newUpdate, setNewUpdate] = useState({ title: '', content: '' });

  // Fetch bookings
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['business-bookings', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_bookings')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch availability settings
  const { data: availability } = useQuery({
    queryKey: ['business-availability', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('builder_availability')
        .select('*')
        .eq('business_id', businessId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Fetch milestones for selected booking
  const { data: milestones } = useQuery({
    queryKey: ['booking-milestones', selectedBooking?.id],
    queryFn: async () => {
      if (!selectedBooking?.id) return [];
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('booking_id', selectedBooking.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedBooking?.id,
  });

  // Update booking status mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('project_bookings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Send notification to customer
      await supabase.functions.invoke('project-status-notification', {
        body: { bookingId: id, status: updates.status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-bookings', businessId] });
      toast.success('Booking updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update booking');
      console.error(error);
    },
  });

  // Add milestone mutation
  const addMilestoneMutation = useMutation({
    mutationFn: async (milestone: any) => {
      const { error } = await supabase
        .from('project_milestones')
        .insert({
          booking_id: selectedBooking.id,
          ...milestone,
          sort_order: (milestones?.length || 0) + 1,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-milestones', selectedBooking?.id] });
      setNewMilestone({ name: '', description: '', estimated_date: '' });
      toast.success('Milestone added');
    },
  });

  // Update milestone mutation
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking-milestones', selectedBooking?.id] });
      toast.success('Milestone updated');
    },
  });

  // Add update mutation
  const addUpdateMutation = useMutation({
    mutationFn: async (update: any) => {
      const { error } = await supabase
        .from('project_updates')
        .insert({
          booking_id: selectedBooking.id,
          update_type: 'status',
          ...update,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewUpdate({ title: '', content: '' });
      toast.success('Update posted');
    },
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('builder_availability')
        .upsert({
          business_id: businessId,
          ...updates,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-availability', businessId] });
      toast.success('Availability updated');
    },
  });

  const handleSendQuote = () => {
    if (!quoteAmount || !selectedBooking) return;
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      updates: {
        status: 'quoted',
        quoted_amount: parseFloat(quoteAmount),
        quoted_at: new Date().toISOString(),
      },
    });
    setQuoteAmount('');
  };

  const handleAccept = () => {
    if (!selectedBooking) return;
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      updates: {
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      },
    });
  };

  const handleDecline = () => {
    if (!selectedBooking) return;
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      updates: {
        status: 'declined',
        declined_at: new Date().toISOString(),
        decline_reason: declineReason,
      },
    });
    setDeclineReason('');
  };

  const handleStartProject = () => {
    if (!selectedBooking) return;
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      updates: { status: 'in_progress' },
    });
  };

  const handleCompleteProject = () => {
    if (!selectedBooking) return;
    updateBookingMutation.mutate({
      id: selectedBooking.id,
      updates: { status: 'completed' },
    });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      quoted: { label: 'Quote Sent', className: 'bg-blue-100 text-blue-800' },
      accepted: { label: 'Accepted', className: 'bg-green-100 text-green-800' },
      in_progress: { label: 'In Progress', className: 'bg-purple-100 text-purple-800' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
      declined: { label: 'Declined', className: 'bg-red-100 text-red-800' },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const pendingCount = bookings?.filter(b => b.status === 'pending').length || 0;
  const activeCount = bookings?.filter(b => ['accepted', 'in_progress'].includes(b.status)).length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {bookings?.filter(b => b.status === 'completed').length || 0}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${bookings?.reduce((sum, b) => sum + (b.quoted_amount || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Quoted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings">Booking Requests</TabsTrigger>
          <TabsTrigger value="availability">Availability Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bookings List */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>All Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {bookings?.map((booking) => (
                      <div
                        key={booking.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedBooking?.id === booking.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setSelectedBooking(booking)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{booking.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{booking.project_type}</p>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                    {(!bookings || bookings.length === 0) && (
                      <div className="p-8 text-center text-muted-foreground">
                        No booking requests yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card className="lg:col-span-2">
              {selectedBooking ? (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedBooking.project_type}</CardTitle>
                        <CardDescription>
                          Tracking: <span className="font-mono">{selectedBooking.tracking_code}</span>
                        </CardDescription>
                      </div>
                      {getStatusBadge(selectedBooking.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Customer</h4>
                        <p className="font-medium">{selectedBooking.customer_name}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <a href={`mailto:${selectedBooking.customer_email}`} className="text-primary hover:underline">
                            {selectedBooking.customer_email}
                          </a>
                        </div>
                        {selectedBooking.customer_phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <a href={`tel:${selectedBooking.customer_phone}`} className="text-primary hover:underline">
                              {selectedBooking.customer_phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Property</h4>
                        {selectedBooking.property_address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{selectedBooking.property_address}</span>
                          </div>
                        )}
                        {selectedBooking.property_type && (
                          <p className="text-sm">{selectedBooking.property_type}</p>
                        )}
                        {selectedBooking.estimated_budget && (
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <span>Budget: {selectedBooking.estimated_budget}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Project Description */}
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Project Description</h4>
                      <p className="text-sm">{selectedBooking.project_description}</p>
                    </div>

                    {selectedBooking.preferred_start_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Preferred Start: {format(new Date(selectedBooking.preferred_start_date), 'MMMM d, yyyy')}</span>
                        <Badge variant="outline" className="ml-2">
                          {selectedBooking.urgency === 'urgent' ? '🔴 Urgent' : 
                           selectedBooking.urgency === 'high' ? '🟠 High Priority' :
                           selectedBooking.urgency === 'low' ? '🟢 Flexible' : '🔵 Normal'}
                        </Badge>
                      </div>
                    )}

                    <Separator />

                    {/* Actions based on status */}
                    <div className="space-y-4">
                      {selectedBooking.status === 'pending' && (
                        <div className="flex gap-2 flex-wrap">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button>
                                <DollarSign className="w-4 h-4 mr-2" />
                                Send Quote
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Send Quote</DialogTitle>
                                <DialogDescription>
                                  Enter the quoted amount for this project
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Quote Amount (NZD)</Label>
                                  <Input
                                    type="number"
                                    placeholder="e.g., 25000"
                                    value={quoteAmount}
                                    onChange={(e) => setQuoteAmount(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={handleSendQuote} disabled={!quoteAmount}>
                                  Send Quote
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="destructive">
                                <XCircle className="w-4 h-4 mr-2" />
                                Decline
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Decline Request</DialogTitle>
                                <DialogDescription>
                                  Provide a reason for declining this request
                                </DialogDescription>
                              </DialogHeader>
                              <Textarea
                                placeholder="Reason for declining..."
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                              />
                              <DialogFooter>
                                <Button variant="destructive" onClick={handleDecline}>
                                  Confirm Decline
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}

                      {selectedBooking.status === 'quoted' && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-800">
                            Quote of <strong>${selectedBooking.quoted_amount?.toLocaleString()}</strong> sent on{' '}
                            {format(new Date(selectedBooking.quoted_at), 'MMMM d, yyyy')}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">Waiting for customer response</p>
                        </div>
                      )}

                      {selectedBooking.status === 'accepted' && (
                        <Button onClick={handleStartProject} className="w-full">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Start Project
                        </Button>
                      )}

                      {selectedBooking.status === 'in_progress' && (
                        <>
                          {/* Milestones Management */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">Project Milestones</h4>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add Milestone
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Milestone</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Milestone Name</Label>
                                      <Input
                                        value={newMilestone.name}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
                                        placeholder="e.g., Foundation Complete"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Description</Label>
                                      <Textarea
                                        value={newMilestone.description}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                                        placeholder="Details about this milestone..."
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Estimated Date</Label>
                                      <Input
                                        type="date"
                                        value={newMilestone.estimated_date}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, estimated_date: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button onClick={() => addMilestoneMutation.mutate(newMilestone)}>
                                      Add Milestone
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>

                            {milestones?.map((milestone) => (
                              <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  {milestone.status === 'completed' ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                  ) : (
                                    <button
                                      onClick={() => updateMilestoneMutation.mutate({
                                        id: milestone.id,
                                        updates: { status: 'completed', completed_at: new Date().toISOString() }
                                      })}
                                      className="w-5 h-5 border-2 rounded-full hover:border-green-500"
                                    />
                                  )}
                                  <div>
                                    <p className={`font-medium ${milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                      {milestone.milestone_name}
                                    </p>
                                    {milestone.estimated_date && milestone.status !== 'completed' && (
                                      <p className="text-xs text-muted-foreground">
                                        Est: {format(new Date(milestone.estimated_date), 'MMM d, yyyy')}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Post Update */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full">
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Post Update
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Post Project Update</DialogTitle>
                                <DialogDescription>
                                  This update will be visible to the customer
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Title</Label>
                                  <Input
                                    value={newUpdate.title}
                                    onChange={(e) => setNewUpdate({ ...newUpdate, title: e.target.value })}
                                    placeholder="e.g., Foundation work complete"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Details</Label>
                                  <Textarea
                                    value={newUpdate.content}
                                    onChange={(e) => setNewUpdate({ ...newUpdate, content: e.target.value })}
                                    placeholder="Describe the progress..."
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button onClick={() => addUpdateMutation.mutate(newUpdate)}>
                                  Post Update
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button onClick={handleCompleteProject} className="w-full" variant="default">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark Project Complete
                          </Button>
                        </>
                      )}

                      {selectedBooking.status === 'completed' && (
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                          <p className="text-green-800 font-medium">Project Completed!</p>
                        </div>
                      )}

                      {selectedBooking.status === 'declined' && (
                        <div className="bg-red-50 p-4 rounded-lg">
                          <p className="text-red-800 font-medium">Request Declined</p>
                          {selectedBooking.decline_reason && (
                            <p className="text-sm text-red-600 mt-1">{selectedBooking.decline_reason}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a booking to view details</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Availability Settings
              </CardTitle>
              <CardDescription>
                Configure your workload and booking preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Maximum Concurrent Projects</Label>
                    <Input
                      type="number"
                      defaultValue={availability?.max_projects || 5}
                      onChange={(e) => updateAvailabilityMutation.mutate({ max_projects: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">How many projects can you handle at once?</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Current Active Projects</Label>
                    <Input
                      type="number"
                      defaultValue={availability?.current_projects || 0}
                      onChange={(e) => updateAvailabilityMutation.mutate({ current_projects: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Average Project Duration (days)</Label>
                    <Input
                      type="number"
                      defaultValue={availability?.average_project_days || 30}
                      onChange={(e) => updateAvailabilityMutation.mutate({ average_project_days: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Booking Lead Time (days)</Label>
                    <Input
                      type="number"
                      defaultValue={availability?.booking_lead_time_days || 14}
                      onChange={(e) => updateAvailabilityMutation.mutate({ booking_lead_time_days: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Minimum notice required for new bookings</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Next Available Date</Label>
                    <Input
                      type="date"
                      defaultValue={availability?.next_available_date || ''}
                      onChange={(e) => updateAvailabilityMutation.mutate({ next_available_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Availability Notes</Label>
                    <Textarea
                      defaultValue={availability?.notes || ''}
                      onChange={(e) => updateAvailabilityMutation.mutate({ notes: e.target.value })}
                      placeholder="e.g., Booking up fast for summer season..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Accept New Bookings</p>
                  <p className="text-sm text-muted-foreground">Toggle this off to pause new booking requests</p>
                </div>
                <Button
                  variant={availability?.is_accepting_bookings !== false ? 'default' : 'outline'}
                  onClick={() => updateAvailabilityMutation.mutate({ 
                    is_accepting_bookings: !availability?.is_accepting_bookings 
                  })}
                >
                  {availability?.is_accepting_bookings !== false ? 'Accepting' : 'Paused'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
