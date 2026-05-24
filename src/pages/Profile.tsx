import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ApplicantProfileSection } from "@/components/profile/ApplicantProfileSection";
import { ChangePasswordSection } from "@/components/ChangePasswordSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Mail, 
  Building2, 
  Camera, 
  Loader2, 
  Star, 
  MapPin,
  Calendar,
  Check,
  AlertCircle,
  Briefcase,
  Lock,
  Shield,
  Activity,
  BadgeCheck,
  ClipboardList
} from "lucide-react";
import { ProjectTracker } from "@/components/project-tracking";
import { toast } from "sonner";

interface Business {
  id: string;
  name: string;
  category: string;
  city: string;
  subscription_plan: string;
  is_verified: boolean;
  status: string;
  rating: number;
  review_count: number;
  created_at: string;
}

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile, uploadAvatar } = useProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchUserBusinesses();
    }
  }, [user]);

  const fetchUserBusinesses = async () => {
    if (!user) return;
    
    setLoadingBusinesses(true);
    try {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName });
    
    if (error) {
      toast.error("Failed to update profile");
    } else {
      toast.success("Profile updated successfully");
    }
    setSaving(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    const { error } = await uploadAvatar(file);
    
    if (error) {
      toast.error("Failed to upload avatar");
    } else {
      toast.success("Avatar updated successfully");
    }
    setUploading(false);
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return (
          <Badge className="bg-admin-success/10 text-admin-success border-admin-success/30 gap-1">
            <Check className="w-3 h-3" /> Active
          </Badge>
        );
      case "pending":
      case "pending_verification":
        return (
          <Badge className="bg-admin-warning/10 text-admin-warning border-admin-warning/30 gap-1">
            <AlertCircle className="w-3 h-3" /> Pending
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-admin-teal mx-auto mb-3" />
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <>
      <Helmet>
        <title>My Profile | Wellington EcoBuild</title>
        <meta name="description" content="Manage your Wellington EcoBuild profile and business listings" />
      </Helmet>

      <Header />

      <main className="pt-28 lg:pt-32 min-h-screen bg-muted">
        {/* Government-style Header Banner */}
        <div className="bg-admin-navy border-b border-admin-navy-light">
          <div className="container mx-auto px-4 py-5">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-admin-navy-light rounded-lg">
                <User className="h-5 w-5 text-admin-teal" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-white tracking-tight">
                    Account Profile
                  </h1>
                  <div className="flex items-center gap-1.5 text-xs text-admin-success">
                    <Shield className="h-3 w-3" />
                    <span>VERIFIED</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  Manage your account settings and preferences
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-1">
              <Card className="overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-admin-navy to-admin-navy-light" />
                <CardContent className="pt-0 -mt-10 relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative group">
                      <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                        <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || "User"} />
                        <AvatarFallback className="text-xl bg-admin-teal text-white">
                          {getInitials(profile.full_name, profile.email)}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        onClick={handleAvatarClick}
                        disabled={uploading}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {uploading ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                    
                    <h2 className="mt-4 font-semibold text-lg text-foreground">
                      {profile.full_name || "Add your name"}
                    </h2>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                    
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>

                    <div className="mt-4 w-full pt-4 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-foreground tabular-nums">{businesses.length}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Listings</p>
                        </div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg">
                          <p className="text-2xl font-bold text-admin-teal tabular-nums">
                            {businesses.filter(b => b.is_verified).length}
                          </p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Verified</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="settings" className="space-y-6">
                <div className="bg-card rounded-lg border border-border p-1">
                  <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
                    <TabsTrigger value="settings" className="data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      Account Settings
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <Lock className="w-4 h-4" />
                      Security
                    </TabsTrigger>
                    <TabsTrigger value="listings" className="data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      My Listings
                    </TabsTrigger>
                    <TabsTrigger value="career" className="data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      Career Profile
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="gap-1.5 data-[state=active]:bg-admin-teal data-[state=active]:text-white">
                      <ClipboardList className="w-4 h-4" />
                      My Projects
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="settings">
                  <Card>
                    <CardHeader className="border-b border-border bg-muted/30">
                      <CardTitle className="text-base">Account Settings</CardTitle>
                      <CardDescription>Update your personal information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Email Address
                        </Label>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <Input
                            id="email"
                            value={profile.email}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Full Name
                        </Label>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={saving}
                        className="bg-admin-teal hover:bg-admin-teal/90"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="security">
                  <ChangePasswordSection />
                </TabsContent>

                <TabsContent value="listings">
                  <Card>
                    <CardHeader className="border-b border-border bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">My Business Listings</CardTitle>
                          <CardDescription>Manage your sustainable construction businesses</CardDescription>
                        </div>
                        <Button asChild className="bg-admin-teal hover:bg-admin-teal/90">
                          <Link to="/list-business">
                            <Building2 className="w-4 h-4 mr-2" />
                            Add New
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {loadingBusinesses ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-admin-teal" />
                        </div>
                      ) : businesses.length === 0 ? (
                        <div className="text-center py-12 px-4">
                          <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <h3 className="font-semibold text-lg text-foreground mb-2">
                            No listings yet
                          </h3>
                          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
                            Apply to list your sustainable construction business.
                          </p>
                          <div className="flex flex-col items-center">
                            <Button asChild className="bg-admin-teal hover:bg-admin-teal/90">
                              <Link to="/list-business">Apply to Be Listed</Link>
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              We only accept a limited number of verified builders per area.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {businesses.map((business) => (
                            <div
                              key={business.id}
                              className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors"
                            >
                              <div className="p-2.5 bg-admin-teal/10 rounded-lg shrink-0">
                                <Building2 className="w-5 h-5 text-admin-teal" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h4 className="font-semibold text-foreground">{business.name}</h4>
                                  {business.is_verified && (
                                    <Badge className="bg-admin-teal/10 text-admin-teal border-admin-teal/30 gap-1">
                                      <BadgeCheck className="w-3 h-3" />
                                      Verified
                                    </Badge>
                                  )}
                                  {getStatusBadge(business.status)}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {business.category.replace("-", " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {business.city}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-admin-warning text-admin-warning" />
                                    {business.rating || 0} ({business.review_count || 0})
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <Badge variant={
                                  business.subscription_plan === "elite" ? "default" :
                                  business.subscription_plan === "premium" ? "secondary" :
                                  "outline"
                                } className={
                                  business.subscription_plan === "elite" ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" :
                                  business.subscription_plan === "premium" ? "bg-admin-teal text-white border-0" :
                                  ""
                                }>
                                  {business.subscription_plan.toUpperCase()}
                                </Badge>
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/business/${business.id}`}>View</Link>
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="career">
                  <ApplicantProfileSection />
                </TabsContent>

                <TabsContent value="projects">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-admin-teal" />
                        Track Your Projects
                      </CardTitle>
                      <CardDescription>
                        Enter your tracking code to see real-time updates on your sustainable building project
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProjectTracker />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Profile;
