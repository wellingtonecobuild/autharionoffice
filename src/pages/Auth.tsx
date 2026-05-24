import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Leaf, Loader2, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { trackSignup } from "@/lib/analytics";
import { sendWelcomeEmail } from "@/lib/emailService";

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().optional(),
  acceptTerms: z.boolean().optional(),
});

const phoneSchema = z.object({
  phone: z.string().min(8, { message: "Please enter a valid phone number" }).max(20),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  fullName: z.string().optional(),
  acceptTerms: z.boolean().optional(),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get("redirect");
    if (!raw) return "/";

    try {
      const decoded = decodeURIComponent(raw);
      return decoded.startsWith("/") ? decoded : "/";
    } catch {
      return "/";
    }
  }, [location.search]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate(redirectTo);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate(redirectTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  const validateForm = () => {
    try {
      if (authMethod === "email") {
        emailSchema.parse({ email, password, fullName: isLogin ? undefined : fullName });
      } else {
        phoneSchema.parse({ phone, password, fullName: isLogin ? undefined : fullName });
      }
      
      if (!isLogin && !acceptTerms) {
        setErrors({ acceptTerms: "You must accept the Terms of Use and Privacy Policy to create an account" });
        return false;
      }
      
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMethod === "email") {
      const emailValidation = z.string().trim().email({ message: "Invalid email address" });
      try {
        emailValidation.parse(email);
        setErrors({});
      } catch (error) {
        if (error instanceof z.ZodError) {
          setErrors({ email: error.errors[0].message });
        }
        return;
      }
      
      setLoading(true);
      try {
        const redirectUrl = `${window.location.origin}/reset-password`;
        const { data, error } = await supabase.functions.invoke('send-password-reset', {
          body: { email: email.trim(), redirectUrl },
        });
        
        if (error) throw error;
        
        toast({ 
          title: "Check your email!", 
          description: "If an account exists with this email, we've sent you a password reset link." 
        });
        setIsForgotPassword(false);
      } catch (error: any) {
        console.error("Password reset error:", error);
        toast({ 
          title: "Check your email!", 
          description: "If an account exists with this email, we've sent you a password reset link." 
        });
        setIsForgotPassword(false);
      } finally {
        setLoading(false);
      }
    } else {
      // Phone-based password reset via SMS would require additional setup
      // For now, provide helpful message about using email recovery
      toast({
        title: "Use Email for Password Reset",
        description: "Please use the email option to reset your password. You can add your phone number to your account after logging in.",
      });
      setAuthMethod("email");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (authMethod === "email") {
        if (isLogin) {
          const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (error) throw error;
          toast({ title: "Welcome back!", description: "You have successfully signed in." });
        } else {
          const redirectUrl = `${window.location.origin}/`;
          const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: redirectUrl,
              data: { full_name: fullName.trim() },
            },
          });
          if (error) throw error;
          
          trackSignup();
          
          if (data.user) {
            sendWelcomeEmail(email.trim(), fullName.trim() || undefined);
          }
          
          toast({ 
            title: "Welcome to Wellington EcoBuild!", 
            description: "Your account has been created. Check your email for a welcome message." 
          });
        }
      } else {
        // Phone-based authentication
        const formattedPhone = phone.startsWith('+') ? phone : `+64${phone.replace(/^0/, '')}`;
        
        if (isLogin) {
          // For phone login, we use OTP or password
          // First try password-based login by looking up email from phone
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .eq('phone', formattedPhone)
            .single();
          
          if (profileData?.email) {
            const { error } = await supabase.auth.signInWithPassword({
              email: profileData.email,
              password,
            });
            if (error) throw error;
            toast({ title: "Welcome back!", description: "You have successfully signed in." });
          } else {
            throw new Error("No account found with this phone number. Please sign up first or use email login.");
          }
        } else {
          // Phone signup - create with email derived from phone
          const tempEmail = `${formattedPhone.replace(/\+/g, '')}@phone.wellingtonecobuild.nz`;
          const redirectUrl = `${window.location.origin}/`;
          
          const { data, error } = await supabase.auth.signUp({
            email: tempEmail,
            password,
            options: {
              emailRedirectTo: redirectUrl,
              data: { 
                full_name: fullName.trim(),
                phone: formattedPhone,
              },
            },
          });
          if (error) throw error;
          
          // Update profile with phone number
          if (data.user) {
            await supabase
              .from('profiles')
              .update({ phone: formattedPhone })
              .eq('id', data.user.id);
          }
          
          trackSignup();
          
          toast({ 
            title: "Welcome to Wellington EcoBuild!", 
            description: "Your account has been created successfully." 
          });
        }
      }
    } catch (error: any) {
      let message = error.message;
      if (message.includes("User already registered")) {
        message = "An account with this email already exists. Please sign in instead.";
      } else if (message.includes("Invalid login credentials")) {
        message = "Invalid credentials. Please try again.";
      }
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isForgotPassword ? "Reset Password" : isLogin ? "Sign In" : "Create Account"} | Wellington EcoBuild</title>
        <meta name="description" content={isForgotPassword ? "Reset your Wellington EcoBuild password" : isLogin ? "Sign in to your Wellington EcoBuild account" : "Create your Wellington EcoBuild account"} />
      </Helmet>

      <div className="min-h-screen bg-muted flex">
        {/* Left Side - Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Link to="/" className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-lg font-semibold text-foreground">Wellington</span>
                <span className="font-display text-lg font-semibold text-accent">EcoBuild</span>
              </div>
            </Link>

            <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {isForgotPassword ? "Reset your password" : isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground mb-6">
              {isForgotPassword 
                ? "Enter your email or phone and we'll help you reset your password." 
                : isLogin 
                  ? "Sign in to manage your business listing." 
                  : "Join Wellington's sustainable construction network."}
            </p>

            {/* Auth Method Tabs */}
            {!isForgotPassword && (
              <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {isForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "email" | "phone")} className="mb-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger value="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {authMethod === "email" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+64 21 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        For security, password resets are sent via email. Please switch to email recovery.
                      </p>
                    </div>
                  )}
                  
                  <Button className="w-full" size="lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {authMethod === "email" ? "Send Reset Link" : "Switch to Email"}
                  </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setErrors({});
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>
                  )}
                  
                  {authMethod === "email" ? (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="021 123 4567 or +64 21 123 4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                      {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                      <p className="text-xs text-muted-foreground">
                        NZ numbers will be formatted automatically (+64)
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setErrors({});
                          }}
                          className="text-sm text-accent hover:underline"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  
                  {!isLogin && (
                    <div className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="acceptTerms"
                          checked={acceptTerms}
                          onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                          className="mt-1"
                        />
                        <Label htmlFor="acceptTerms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                          I agree to the{" "}
                          <Link to="/legal?tab=terms" className="text-accent hover:underline" target="_blank">
                            Terms of Use
                          </Link>
                          ,{" "}
                          <Link to="/legal?tab=privacy" className="text-accent hover:underline" target="_blank">
                            Privacy Policy
                          </Link>
                          , and{" "}
                          <Link to="/legal?tab=acceptable-use" className="text-accent hover:underline" target="_blank">
                            Acceptable Use Policy
                          </Link>
                        </Label>
                      </div>
                      {errors.acceptTerms && <p className="text-sm text-destructive">{errors.acceptTerms}</p>}
                    </div>
                  )}
                  <Button className="w-full" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLogin ? "Signing you in… please wait" : "Creating account…"}
                      </>
                    ) : (
                      isLogin ? "Sign In" : "Create Account"
                    )}
                  </Button>
                  
                  {loading && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      This may take a moment. Please don't refresh.
                    </p>
                  )}
                </form>

                <p className="text-center text-sm text-muted-foreground mt-8">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setErrors({});
                    }}
                    className="text-accent hover:underline font-medium"
                  >
                    {isLogin ? "Create one" : "Sign in"}
                  </button>
                </p>

                {/* Security Notice */}
                <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    <strong className="text-foreground">Security Notice:</strong> Please store your password securely. 
                    Self-service recovery options are provided to ensure account protection.
                  </p>
                </div>
              </>
            )}

            <p className="text-center text-sm text-muted-foreground mt-4">
              Want to list your business?{" "}
              <Link to="/list-business" className="text-accent hover:underline font-medium">
                Apply to Be Listed
              </Link>
            </p>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=1600&fit=crop"
            alt="Sustainable building"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-forest/60" />
          <div className="absolute bottom-0 left-0 right-0 p-12">
            <blockquote className="text-primary-foreground">
              <p className="text-xl font-display font-medium mb-4">
                "Wellington EcoBuild has connected us with clients who truly value sustainable construction. Our leads have doubled since joining."
              </p>
              <footer className="text-primary-foreground/80">
                — James Wilson, GreenBuild Wellington
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;