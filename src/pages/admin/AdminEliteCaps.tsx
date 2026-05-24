import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  DollarSign,
  MapPin,
  TrendingUp,
  RotateCcw,
  Plus,
  Shield,
  Star,
  Calendar,
} from "lucide-react";
import {
  useEliteAvailability,
  useEliteWaitlist,
  useEliteRegionSettings,
  useEliteLocationMultipliers,
  useAdminEliteManagement,
  useEliteTotalStats,
  formatCategoryName,
  EliteCategoryCap,
  EliteWaitlistEntry,
  EliteLocationMultiplier,
} from "@/hooks/useEliteAvailability";
import { format } from "date-fns";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

export default function AdminEliteCaps() {
  const { data: caps, isLoading: capsLoading, refetch: refetchCaps } = useEliteAvailability();
  const { data: waitlist, isLoading: waitlistLoading, refetch: refetchWaitlist } = useEliteWaitlist();
  const { data: regionSettings, refetch: refetchRegion } = useEliteRegionSettings();
  const { data: locations, isLoading: locationsLoading, refetch: refetchLocations } = useEliteLocationMultipliers();
  const stats = useEliteTotalStats();
  
  const { 
    updateCap, 
    updateRegionSettings,
    updateLocationMultiplier,
    addLocationMultiplier,
    processWaitlistEntry, 
    removeFromWaitlist,
    updateTraffic,
  } = useAdminEliteManagement();

  const [editingCap, setEditingCap] = useState<EliteCategoryCap | null>(null);
  const [editMaxSlots, setEditMaxSlots] = useState(10);
  const [editAccepting, setEditAccepting] = useState(true);

  const [processingEntry, setProcessingEntry] = useState<EliteWaitlistEntry | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const [editingLocation, setEditingLocation] = useState<EliteLocationMultiplier | null>(null);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<{ city: string; suburb: string; size_tier: 'small' | 'medium' | 'large'; max_elite_slots: number }>({ city: '', suburb: '', size_tier: 'medium', max_elite_slots: 10 });

  const [showRegionSettings, setShowRegionSettings] = useState(false);
  const [trafficInput, setTrafficInput] = useState(regionSettings?.current_monthly_traffic ?? 0);

  useAutoRefresh(() => {
    refetchCaps();
    refetchWaitlist();
    refetchRegion();
    refetchLocations();
  });

  const handleUpdateCap = async () => {
    if (!editingCap) return;
    await updateCap.mutateAsync({
      category: editingCap.category,
      maxSlots: editMaxSlots,
      isAcceptingNew: editAccepting,
    });
    setEditingCap(null);
  };

  const handleProcessEntry = async (action: "approved" | "rejected") => {
    if (!processingEntry) return;
    await processWaitlistEntry.mutateAsync({
      entryId: processingEntry.id,
      action,
      adminNotes,
    });
    setProcessingEntry(null);
    setAdminNotes("");
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;
    await updateLocationMultiplier.mutateAsync({
      id: editingLocation.id,
      updates: {
        max_elite_slots: editingLocation.max_elite_slots,
        size_tier: editingLocation.size_tier,
      },
    });
    setEditingLocation(null);
  };

  const handleAddLocation = async () => {
    await addLocationMultiplier.mutateAsync({
      city: newLocation.city,
      suburb: newLocation.suburb || null,
      size_tier: newLocation.size_tier,
      max_elite_slots: newLocation.max_elite_slots,
    });
    setShowAddLocation(false);
    setNewLocation({ city: '', suburb: '', size_tier: 'medium', max_elite_slots: 10 });
  };

  const waitingCount = waitlist?.filter(w => w.status === "waiting").length ?? 0;

  const getTrafficTier = () => {
    if (!regionSettings) return 'Base';
    const traffic = regionSettings.current_monthly_traffic;
    if (traffic >= regionSettings.traffic_threshold_3) return 'Tier 3 (Unlimited)';
    if (traffic >= regionSettings.traffic_threshold_2) return 'Tier 2';
    if (traffic >= regionSettings.traffic_threshold_1) return 'Tier 1';
    return 'Base';
  };

  return (
    <AdminLayout title="Elite Scarcity Management">
      <div className="space-y-6">
        {/* Hero Stats */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Elite Usage</CardTitle>
              <Crown className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsed}/{stats.effectiveCap}</div>
              <Progress 
                value={(stats.totalUsed / stats.effectiveCap) * 100} 
                className={stats.isNearingCap ? "[&>div]:bg-yellow-500" : ""}
              />
              <p className="text-xs text-muted-foreground mt-1">{getTrafficTier()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.monthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">At $399/month each</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Max Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.maxMonthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All slots filled</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waitlist</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{waitingCount}</div>
              <p className="text-xs text-muted-foreground">Priority queue</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setShowRegionSettings(true)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Region Cap</CardTitle>
              <MapPin className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{regionSettings?.current_cap ?? 100}</div>
              <p className="text-xs text-muted-foreground">Click to configure</p>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-primary">Elite-Only Scarcity</p>
                <p className="text-sm text-muted-foreground">
                  Premium listings scale with demand. Elite listings are limited, verified, and reserved for top-performing builders only.
                  Caps expand automatically based on traffic.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="region" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="region">
                <MapPin className="h-4 w-4 mr-1" />
                Locations
              </TabsTrigger>
              <TabsTrigger value="caps">
                <Crown className="h-4 w-4 mr-1" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="waitlist">
                <Users className="h-4 w-4 mr-1" />
                Waitlist
                {waitingCount > 0 && (
                  <Badge variant="destructive" className="ml-2">{waitingCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="rotation">
                <RotateCcw className="h-4 w-4 mr-1" />
                Rotation
              </TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm" onClick={() => { refetchCaps(); refetchWaitlist(); refetchRegion(); refetchLocations(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Location-based Caps Tab */}
          <TabsContent value="region">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Location-Based Elite Slots</CardTitle>
                  <CardDescription>
                    Dynamic caps based on suburb size. Large areas get more slots.
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddLocation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Location
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead>Size Tier</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Max Slots</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : locations?.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {loc.city}{loc.suburb && ` - ${loc.suburb}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            loc.size_tier === 'large' ? 'border-green-500 text-green-600' :
                            loc.size_tier === 'small' ? 'border-yellow-500 text-yellow-600' :
                            'border-blue-500 text-blue-600'
                          }>
                            {loc.size_tier.charAt(0).toUpperCase() + loc.size_tier.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="flex items-center justify-between mb-1 text-sm">
                              <span>{loc.current_elite_count}/{loc.max_elite_slots}</span>
                            </div>
                            <Progress value={(loc.current_elite_count / loc.max_elite_slots) * 100} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{loc.max_elite_slots} max</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingLocation({ ...loc })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Category Caps Tab */}
          <TabsContent value="caps">
            <Card>
              <CardHeader>
                <CardTitle>Elite Slots by Category</CardTitle>
                <CardDescription>
                  Category-level caps enforced at checkout.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Slots</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : caps?.map((cap) => {
                      const isFull = cap.current_count >= cap.max_slots;
                      const percentage = (cap.current_count / cap.max_slots) * 100;
                      
                      return (
                        <TableRow key={cap.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Crown className="h-4 w-4 text-accent" />
                              {formatCategoryName(cap.category)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="w-32">
                              <div className="flex items-center justify-between mb-1 text-sm">
                                <span>{cap.current_count}/{cap.max_slots}</span>
                                <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                              </div>
                              <Progress 
                                value={percentage} 
                                className={isFull ? "[&>div]:bg-destructive" : ""}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{cap.max_slots} max</Badge>
                          </TableCell>
                          <TableCell>
                            {!cap.is_accepting_new ? (
                              <Badge variant="outline" className="border-destructive text-destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Closed
                              </Badge>
                            ) : isFull ? (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Full
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-primary text-primary">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Open
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(cap.updated_at), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCap(cap);
                                setEditMaxSlots(cap.max_slots);
                                setEditAccepting(cap.is_accepting_new);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Priority Waitlist Tab */}
          <TabsContent value="waitlist">
            <Card>
              <CardHeader>
                <CardTitle>Elite Priority Waitlist</CardTitle>
                <CardDescription>
                  Ranked by verification, reviews, platform tenure, and activity. Top scorers get promoted first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Priority Score</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Credentials</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlistLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                      </TableRow>
                    ) : waitlist?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No businesses on the waitlist
                        </TableCell>
                      </TableRow>
                    ) : waitlist?.map((entry, index) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Badge variant="outline" className="border-accent text-accent w-6 h-6 p-0 flex items-center justify-center">
                                #{index + 1}
                              </Badge>
                            )}
                            {entry.business?.name || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={entry.priority_score} className="w-16" />
                            <span className="font-mono text-sm">{entry.priority_score}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCategoryName(entry.category)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {entry.is_verified && (
                              <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                <Shield className="h-3 w-3 mr-0.5" />
                                Verified
                              </Badge>
                            )}
                            {entry.review_count > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Star className="h-3 w-3 mr-0.5" />
                                {entry.review_count} reviews
                              </Badge>
                            )}
                            {entry.months_on_platform > 0 && (
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-0.5" />
                                {entry.months_on_platform}mo
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(entry.requested_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {entry.status === "waiting" ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Waiting
                            </Badge>
                          ) : entry.status === "approved" ? (
                            <Badge variant="outline" className="border-primary text-primary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-destructive text-destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {entry.status === "waiting" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setProcessingEntry(entry)}
                              >
                                Process
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromWaitlist.mutate(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rotation Tab */}
          <TabsContent value="rotation">
            <Card>
              <CardHeader>
                <CardTitle>Elite Rotation Settings</CardTitle>
                <CardDescription>
                  Configure how Elite listings rotate for fair exposure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Rotation Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically rotate Elite listing display order
                    </p>
                  </div>
                  <Switch 
                    checked={regionSettings?.is_rotation_enabled ?? true}
                    onCheckedChange={(checked) => updateRegionSettings.mutate({ is_rotation_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Rotation Frequency</p>
                    <p className="text-sm text-muted-foreground">
                      How often to rotate display order
                    </p>
                  </div>
                  <Select 
                    value={regionSettings?.rotation_frequency ?? 'daily'}
                    onValueChange={(value) => updateRegionSettings.mutate({ rotation_frequency: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="algorithmic">Algorithmic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    <strong>Daily:</strong> Shuffles order at midnight.<br />
                    <strong>Weekly:</strong> Rotates every Monday.<br />
                    <strong>Algorithmic:</strong> Balances based on impressions and engagement.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Category Cap Dialog */}
        <Dialog open={!!editingCap} onOpenChange={() => setEditingCap(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Elite Cap: {editingCap && formatCategoryName(editingCap.category)}</DialogTitle>
              <DialogDescription>
                Adjust maximum slots and availability status.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Maximum Slots</Label>
                <Input
                  type="number"
                  min={0}
                  value={editMaxSlots}
                  onChange={(e) => setEditMaxSlots(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Current usage: {editingCap?.current_count || 0} businesses
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Accepting New Applications</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow new Elite sign-ups for this category
                  </p>
                </div>
                <Switch
                  checked={editAccepting}
                  onCheckedChange={setEditAccepting}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCap(null)}>Cancel</Button>
              <Button onClick={handleUpdateCap} disabled={updateCap.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Process Waitlist Entry Dialog */}
        <Dialog open={!!processingEntry} onOpenChange={() => setProcessingEntry(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Waitlist Entry</DialogTitle>
              <DialogDescription>
                {processingEntry?.business?.name} - {processingEntry && formatCategoryName(processingEntry.category)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Priority Score:</span>
                  <span className="font-mono">{processingEntry?.priority_score ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Verified:</span>
                  <span>{processingEntry?.is_verified ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Reviews:</span>
                  <span>{processingEntry?.review_count ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Months on Platform:</span>
                  <span>{processingEntry?.months_on_platform ?? 0}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Admin Notes (optional)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this decision..."
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setProcessingEntry(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => handleProcessEntry("rejected")}
                disabled={processWaitlistEntry.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleProcessEntry("approved")}
                disabled={processWaitlistEntry.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Location Dialog */}
        <Dialog open={!!editingLocation} onOpenChange={() => setEditingLocation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Location: {editingLocation?.city}{editingLocation?.suburb && ` - ${editingLocation.suburb}`}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Size Tier</Label>
                <Select 
                  value={editingLocation?.size_tier ?? 'medium'}
                  onValueChange={(value) => setEditingLocation(prev => prev ? { ...prev, size_tier: value as 'small' | 'medium' | 'large' } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (3-5 slots)</SelectItem>
                    <SelectItem value="medium">Medium (5-10 slots)</SelectItem>
                    <SelectItem value="large">Large (10-20 slots)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Elite Slots</Label>
                <Input
                  type="number"
                  min={1}
                  value={editingLocation?.max_elite_slots ?? 10}
                  onChange={(e) => setEditingLocation(prev => prev ? { ...prev, max_elite_slots: parseInt(e.target.value) || 10 } : null)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingLocation(null)}>Cancel</Button>
              <Button onClick={handleUpdateLocation} disabled={updateLocationMultiplier.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Location Dialog */}
        <Dialog open={showAddLocation} onOpenChange={setShowAddLocation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={newLocation.city}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="e.g., Wellington"
                />
              </div>
              <div className="space-y-2">
                <Label>Suburb (optional)</Label>
                <Input
                  value={newLocation.suburb}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, suburb: e.target.value }))}
                  placeholder="e.g., Karori"
                />
              </div>
              <div className="space-y-2">
                <Label>Size Tier</Label>
                <Select 
                  value={newLocation.size_tier}
                  onValueChange={(value) => setNewLocation(prev => ({ ...prev, size_tier: value as 'small' | 'medium' | 'large' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (5 slots)</SelectItem>
                    <SelectItem value="medium">Medium (10 slots)</SelectItem>
                    <SelectItem value="large">Large (20 slots)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Elite Slots</Label>
                <Input
                  type="number"
                  min={1}
                  value={newLocation.max_elite_slots}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, max_elite_slots: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddLocation(false)}>Cancel</Button>
              <Button onClick={handleAddLocation} disabled={addLocationMultiplier.isPending || !newLocation.city}>
                Add Location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Region Settings Dialog */}
        <Dialog open={showRegionSettings} onOpenChange={setShowRegionSettings}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Region Cap Settings</DialogTitle>
              <DialogDescription>
                Traffic-based scaling automatically adjusts the region cap.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Cap</Label>
                  <Input
                    type="number"
                    value={regionSettings?.base_cap ?? 100}
                    onChange={(e) => updateRegionSettings.mutate({ base_cap: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Cap (auto)</Label>
                  <Input
                    type="number"
                    value={regionSettings?.current_cap ?? 100}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <p className="font-medium">Traffic Thresholds</p>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Tier 1 Traffic</Label>
                    <Input
                      type="number"
                      value={regionSettings?.traffic_threshold_1 ?? 10000}
                      onChange={(e) => updateRegionSettings.mutate({ traffic_threshold_1: parseInt(e.target.value) || 10000 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tier 2 Traffic</Label>
                    <Input
                      type="number"
                      value={regionSettings?.traffic_threshold_2 ?? 25000}
                      onChange={(e) => updateRegionSettings.mutate({ traffic_threshold_2: parseInt(e.target.value) || 25000 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tier 3 Traffic</Label>
                    <Input
                      type="number"
                      value={regionSettings?.traffic_threshold_3 ?? 50000}
                      onChange={(e) => updateRegionSettings.mutate({ traffic_threshold_3: parseInt(e.target.value) || 50000 })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <Label className="text-xs">Cap at Tier 1</Label>
                    <Input
                      type="number"
                      value={regionSettings?.cap_at_threshold_1 ?? 150}
                      onChange={(e) => updateRegionSettings.mutate({ cap_at_threshold_1: parseInt(e.target.value) || 150 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cap at Tier 2</Label>
                    <Input
                      type="number"
                      value={regionSettings?.cap_at_threshold_2 ?? 250}
                      onChange={(e) => updateRegionSettings.mutate({ cap_at_threshold_2: parseInt(e.target.value) || 250 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cap at Tier 3</Label>
                    <Input
                      type="number"
                      value={regionSettings?.cap_at_threshold_3 ?? 500}
                      onChange={(e) => updateRegionSettings.mutate({ cap_at_threshold_3: parseInt(e.target.value) || 500 })}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-lg space-y-3">
                <p className="font-medium">Update Monthly Traffic</p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={trafficInput}
                    onChange={(e) => setTrafficInput(parseInt(e.target.value) || 0)}
                    placeholder="Monthly visitors"
                  />
                  <Button onClick={() => updateTraffic.mutate(trafficInput)} disabled={updateTraffic.isPending}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current: {regionSettings?.current_monthly_traffic?.toLocaleString() ?? 0} visitors/month
                  {regionSettings?.last_traffic_update && (
                    <> · Last updated: {format(new Date(regionSettings.last_traffic_update), "MMM d, yyyy")}</>
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRegionSettings(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
