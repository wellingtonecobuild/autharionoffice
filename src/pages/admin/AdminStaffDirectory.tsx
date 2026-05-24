import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";
import { 
  Search, Users, CheckCircle2, Clock, Shield, 
  Mail, Phone, Briefcase, Calendar, Grid3X3, List
} from "lucide-react";

interface StaffMember {
  id: string;
  legal_full_name: string | null;
  email: string;
  role: string;
  status: string;
  job_title: string | null;
  phone_number: string | null;
  bio: string | null;
  qualifications: string[] | null;
  profile_photo_url: string | null;
  profile_photo_hd_url: string | null;
  verification_status: string;
  profile_completion_score: number;
  availability_status: string;
  last_active_at: string | null;
  created_at: string;
}

export default function AdminStaffDirectory() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("portal_users")
        .select("*")
        .eq("status", "active")
        .order("legal_full_name");

      if (error) throw error;
      setStaff((data || []) as unknown as StaffMember[]);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff directory");
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.legal_full_name?.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.job_title?.toLowerCase().includes(searchLower) ||
      member.role.toLowerCase().includes(searchLower)
    );
  });

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "busy": return "bg-red-500";
      case "away": return "bg-yellow-500";
      default: return "bg-gray-400";
    }
  };

  const StaffCard = ({ member }: { member: StaffMember }) => (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => setSelectedStaff(member)}
    >
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-primary/10">
              <AvatarImage 
                src={member.profile_photo_hd_url || member.profile_photo_url || undefined} 
                alt={member.legal_full_name || "Staff"} 
              />
              <AvatarFallback className="text-2xl">
                {member.legal_full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white ${getAvailabilityColor(member.availability_status)}`} />
            {member.verification_status === "verified" && (
              <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>

          <h3 className="font-semibold mt-3">{member.legal_full_name || "Unnamed"}</h3>
          <p className="text-sm text-muted-foreground">{member.job_title || "Team Member"}</p>

          <div className="flex gap-1 mt-2">
            <Badge variant="outline" className="text-xs">{member.role}</Badge>
            {member.verification_status === "verified" && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Verified
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Staff Directory
          </h1>
          <p className="text-muted-foreground">
            View and manage all Wellington EcoBuild team members
          </p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-sm text-muted-foreground">Total Staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {staff.filter(s => s.verification_status === "verified").length}
            </div>
            <p className="text-sm text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {staff.filter(s => s.role === "contractor").length}
            </div>
            <p className="text-sm text-muted-foreground">Contractors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {staff.filter(s => s.role === "employee").length}
            </div>
            <p className="text-sm text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Display */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading staff...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No staff members found
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredStaff.map((member) => (
            <StaffCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((member) => (
                <TableRow 
                  key={member.id} 
                  className="cursor-pointer"
                  onClick={() => setSelectedStaff(member)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage 
                            src={member.profile_photo_hd_url || member.profile_photo_url || undefined} 
                          />
                          <AvatarFallback>
                            {member.legal_full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getAvailabilityColor(member.availability_status)}`} />
                      </div>
                      <div>
                        <div className="font-medium">{member.legal_full_name || "Unnamed"}</div>
                        <div className="text-sm text-muted-foreground">{member.job_title || "Team Member"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>
                    {member.verification_status === "verified" ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${member.profile_completion_score}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {member.profile_completion_score}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Staff Detail Dialog */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Staff Details</DialogTitle>
            <DialogDescription>Full profile information</DialogDescription>
          </DialogHeader>
          
          {selectedStaff && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4 border-primary/10">
                  <AvatarImage 
                    src={selectedStaff.profile_photo_hd_url || selectedStaff.profile_photo_url || undefined} 
                  />
                  <AvatarFallback className="text-2xl">
                    {selectedStaff.legal_full_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedStaff.legal_full_name || "Unnamed"}</h3>
                  <p className="text-muted-foreground">{selectedStaff.job_title || "Team Member"}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedStaff.role}</Badge>
                    {selectedStaff.verification_status === "verified" && (
                      <Badge className="bg-green-100 text-green-700">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>info@wellingtonecobuild.co.nz</span>
                  <Badge variant="secondary" className="text-xs">Company Email</Badge>
                </div>
                {selectedStaff.phone_number && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStaff.phone_number}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Joined {new Date(selectedStaff.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {selectedStaff.bio && (
                <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedStaff.bio}</p>
                </div>
              )}

              {selectedStaff.qualifications && selectedStaff.qualifications.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Qualifications</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStaff.qualifications.map((qual, idx) => (
                      <Badge key={idx} variant="secondary">{qual}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
