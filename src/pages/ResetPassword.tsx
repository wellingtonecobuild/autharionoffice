import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sessionError, setSessionError] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for error or access_token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const error = hashParams.get('error');
      const errorDescription = hashParams.get('error_description');
      
      if (error) {
        console.error("Auth error:", error, errorDescription);
        setSessionError(true);
        toast({
          title: "Link Expired",
          description: "This password reset link has expired or is invalid. Please request a new one.",
          variant: "destructive",
        });
      }
    };

    checkSession();

    // Listen for password recovery event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Password recovery session established");
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const validateForm = () => {
    try {
      passwordSchema.parse({ password, confirmPassword });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // Get current user email before password update
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email;
      const userId = user?.id;

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      // Send password changed confirmation email
      if (userEmail) {
        try {
          await supabase.functions.invoke('send-password-changed', {
            body: { 
              email: userEmail,
              userId: userId,
            },
          });
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
          // Don't block the flow if email fails
        }
      }

      setSuccess(true);
      toast({
        title: "Password Updated!",
        description: "Your password has been successfully reset. A confirmation email has been sent.",
      });

      // Sign out and redirect to login after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/auth");
      }, 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sessionError) {
    return (
      <>
        <Helmet>
          <title>Reset Password | Wellington EcoBuild</title>
        </Helmet>

        <div className="min-h-screen bg-muted flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-lg font-semibold text-foreground">Wellington</span>
                <span className="font-display text-lg font-semibold text-accent">EcoBuild</span>
              </div>
            </Link>

            <div className="bg-background rounded-xl p-8 shadow-lg">
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Link Expired
              </h1>
              <p className="text-muted-foreground mb-6">
                This password reset link has expired or is invalid. Please request a new password reset link.
              </p>
              <Link to="/auth">
                <Button className="w-full" size="lg">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Helmet>
          <title>Password Reset Successful | Wellington EcoBuild</title>
        </Helmet>

        <div className="min-h-screen bg-muted flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-display text-lg font-semibold text-foreground">Wellington</span>
                <span className="font-display text-lg font-semibold text-accent">EcoBuild</span>
              </div>
            </Link>

            <div className="bg-background rounded-xl p-8 shadow-lg">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Password Updated!
              </h1>
              <p className="text-muted-foreground mb-6">
                Your password has been successfully reset. You will be redirected to the sign in page shortly.
              </p>
              <Link to="/auth">
                <Button className="w-full" size="lg">
                  Sign In Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Reset Password | Wellington EcoBuild</title>
        <meta name="description" content="Create a new password for your Wellington EcoBuild account" />
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
              Create New Password
            </h1>
            <p className="text-muted-foreground mb-8">
              Enter your new password below. Make sure it's at least 6 characters long.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              <Button className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Remember your password?{" "}
              <Link to="/auth" className="text-accent hover:underline font-medium">
                Sign in
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
                "Wellington EcoBuild has connected us with clients who truly value sustainable construction."
              </p>
              <footer className="text-primary-foreground/80">
                — Wellington EcoBuild Team
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
