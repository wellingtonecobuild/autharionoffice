import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Calculator, Home, Building2, Hammer, PaintBucket, Leaf,
  ArrowRight, ArrowLeft, CheckCircle, Sparkles, Users, Clock, Star, BadgeCheck, MapPin
} from "lucide-react";
import { findMatchingBuilders, createContractorMatches } from "@/lib/aiMatching";

interface MatchedBuilder {
  id: string;
  name: string;
  category: string;
  city: string;
  rating: number | null;
  is_verified: boolean;
  subscription_plan: string;
  match_score: number;
  match_reasons: string[];
}

const PROJECT_TYPES = [
  { id: "new_build", label: "New Build", icon: Building2, description: "Building a new home from scratch" },
  { id: "renovation", label: "Renovation", icon: Hammer, description: "Major home renovation project" },
  { id: "extension", label: "Extension", icon: Home, description: "Adding to your existing home" },
  { id: "bathroom", label: "Bathroom", icon: PaintBucket, description: "Bathroom renovation or new build" },
  { id: "kitchen", label: "Kitchen", icon: PaintBucket, description: "Kitchen renovation or upgrade" },
  { id: "sustainable", label: "Sustainable Upgrade", icon: Leaf, description: "Eco-friendly improvements" },
];

const SIZE_OPTIONS = [
  { id: "small", label: "Small", description: "Under 50m²", multiplier: 0.7 },
  { id: "medium", label: "Medium", description: "50-100m²", multiplier: 1 },
  { id: "large", label: "Large", description: "100-200m²", multiplier: 1.5 },
  { id: "very_large", label: "Very Large", description: "Over 200m²", multiplier: 2.2 },
];

const BUDGET_RANGES = [
  { id: "budget", label: "Budget", description: "$50k - $150k", min: 50000, max: 150000 },
  { id: "mid_range", label: "Mid-Range", description: "$150k - $400k", min: 150000, max: 400000 },
  { id: "premium", label: "Premium", description: "$400k - $800k", min: 400000, max: 800000 },
  { id: "luxury", label: "Luxury", description: "$800k+", min: 800000, max: 2000000 },
];

const TIMELINE_OPTIONS = [
  { id: "urgent", label: "ASAP", description: "Start within 1 month" },
  { id: "soon", label: "Soon", description: "1-3 months" },
  { id: "planned", label: "Planned", description: "3-6 months" },
  { id: "flexible", label: "Flexible", description: "6+ months" },
];

const BASE_COSTS: Record<string, { min: number; max: number }> = {
  new_build: { min: 3500, max: 5500 },
  renovation: { min: 2000, max: 4000 },
  extension: { min: 2800, max: 4500 },
  bathroom: { min: 25000, max: 60000 },
  kitchen: { min: 35000, max: 80000 },
  sustainable: { min: 15000, max: 50000 },
};

const ProjectEstimator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    projectType: "",
    projectSize: "",
    budgetRange: "",
    timeline: "",
    location: "Wellington",
    requirements: "",
    name: "",
    email: "",
    phone: "",
  });
  const [estimate, setEstimate] = useState<{ low: number; high: number } | null>(null);
  const [matchedBuilders, setMatchedBuilders] = useState<MatchedBuilder[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimateId, setEstimateId] = useState<string | null>(null);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const calculateEstimate = () => {
    const baseCost = BASE_COSTS[formData.projectType] || { min: 2000, max: 4000 };
    const sizeOption = SIZE_OPTIONS.find(s => s.id === formData.projectSize);
    const multiplier = sizeOption?.multiplier || 1;

    let low: number, high: number;

    if (formData.projectType === "bathroom" || formData.projectType === "kitchen" || formData.projectType === "sustainable") {
      low = baseCost.min * multiplier;
      high = baseCost.max * multiplier;
    } else {
      const sizeDesc = SIZE_OPTIONS.find(s => s.id === formData.projectSize)?.description || "";
      const avgSize = formData.projectSize === "small" ? 40 : 
                      formData.projectSize === "medium" ? 75 : 
                      formData.projectSize === "large" ? 150 : 250;
      
      low = baseCost.min * avgSize;
      high = baseCost.max * avgSize;
    }

    return { low: Math.round(low), high: Math.round(high) };
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    const calculatedEstimate = calculateEstimate();
    setEstimate(calculatedEstimate);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("project_estimates")
        .insert({
          user_id: user?.id || null,
          project_type: formData.projectType,
          project_size: formData.projectSize,
          budget_range: formData.budgetRange,
          timeline: formData.timeline,
          location: formData.location,
          requirements: { notes: formData.requirements },
          estimated_cost_low: calculatedEstimate.low,
          estimated_cost_high: calculatedEstimate.high,
          status: "completed",
        })
        .select()
        .single();

      if (error) throw error;

      setEstimateId(data.id);
      
      // Show results immediately while matching runs in background
      setStep(6);
      toast.success("Estimate generated! Finding matching contractors...");

      // AI Match: Find matching builders in background
      const criteria = {
        projectType: formData.projectType,
        location: formData.location,
        budgetRange: formData.budgetRange,
        timeline: formData.timeline,
      };
      
      findMatchingBuilders(criteria, 5).then(async (matches) => {
        setMatchedBuilders(matches);
        
        // Create contractor matches and log activity in background
        if (matches.length > 0) {
          createContractorMatches(data.id, matches, { userId: user?.id }).catch(console.error);
        }
        
        (async () => {
          await supabase.from("site_activity").insert({
            activity_type: "new_estimate",
            description: `New project estimate created for ${PROJECT_TYPES.find(p => p.id === formData.projectType)?.label}`,
            metadata: { estimate_id: data.id, matched_builders: matches.length },
          });
        })().catch(console.error);
      }).catch(console.error);

    } catch (error) {
      console.error("Error saving estimate:", error);
      toast.error("Failed to save estimate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Project Cost Estimator | Wellington EcoBuild</title>
        <meta name="description" content="Get an instant estimate for your Wellington building project. Free calculator for renovations, new builds, and sustainable upgrades." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Progress */}
          {step < 6 && (
            <div className="mb-8">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Step {step} of {totalSteps}</span>
                <span className="font-medium">{Math.round(progress)}% complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Step 1: Project Type */}
          {step === 1 && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-4">
                  <Calculator className="w-4 h-4" />
                  Free Instant Estimate
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  What type of project are you planning?
                </h1>
                <p className="text-muted-foreground">
                  Select the option that best describes your building project
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {PROJECT_TYPES.map(type => {
                  const Icon = type.icon;
                  const isSelected = formData.projectType === type.id;
                  
                  return (
                    <button
                      key={type.id}
                      onClick={() => {
                        setFormData({ ...formData, projectType: type.id });
                        setTimeout(handleNext, 300);
                      }}
                      className={`p-6 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? "border-primary bg-primary/5 shadow-md" 
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <Icon className={`w-8 h-8 mb-3 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <h3 className="font-semibold mb-1">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Project Size */}
          {step === 2 && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-4">
                  How big is your project?
                </h2>
                <p className="text-muted-foreground">
                  This helps us calculate accurate cost estimates
                </p>
              </div>

              <RadioGroup
                value={formData.projectSize}
                onValueChange={(value) => setFormData({ ...formData, projectSize: value })}
                className="grid sm:grid-cols-2 gap-4"
              >
                {SIZE_OPTIONS.map(size => (
                  <Label
                    key={size.id}
                    htmlFor={size.id}
                    className={`flex items-center gap-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.projectSize === size.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={size.id} id={size.id} />
                    <div>
                      <p className="font-semibold">{size.label}</p>
                      <p className="text-sm text-muted-foreground">{size.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.projectSize}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-4">
                  What's your budget range?
                </h2>
                <p className="text-muted-foreground">
                  We'll match you with contractors in your price range
                </p>
              </div>

              <RadioGroup
                value={formData.budgetRange}
                onValueChange={(value) => setFormData({ ...formData, budgetRange: value })}
                className="grid sm:grid-cols-2 gap-4"
              >
                {BUDGET_RANGES.map(budget => (
                  <Label
                    key={budget.id}
                    htmlFor={budget.id}
                    className={`flex items-center gap-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.budgetRange === budget.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={budget.id} id={budget.id} />
                    <div>
                      <p className="font-semibold">{budget.label}</p>
                      <p className="text-sm text-muted-foreground">{budget.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.budgetRange}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Timeline */}
          {step === 4 && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-4">
                  When do you want to start?
                </h2>
                <p className="text-muted-foreground">
                  This helps contractors plan their availability
                </p>
              </div>

              <RadioGroup
                value={formData.timeline}
                onValueChange={(value) => setFormData({ ...formData, timeline: value })}
                className="grid sm:grid-cols-2 gap-4"
              >
                {TIMELINE_OPTIONS.map(timeline => (
                  <Label
                    key={timeline.id}
                    htmlFor={timeline.id}
                    className={`flex items-center gap-4 p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.timeline === timeline.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={timeline.id} id={timeline.id} />
                    <div>
                      <p className="font-semibold">{timeline.label}</p>
                      <p className="text-sm text-muted-foreground">{timeline.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.timeline}>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Additional Details */}
          {step === 5 && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-display font-bold mb-4">
                  Any additional details?
                </h2>
                <p className="text-muted-foreground">
                  Help us understand your project better (optional)
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="requirements">Project Notes</Label>
                    <Textarea
                      id="requirements"
                      placeholder="Describe any specific requirements, preferences, or questions..."
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      className="mt-2"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Calculating..." : "Get My Estimate"}
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 6: Results */}
          {step === 6 && estimate && (
            <div className="animate-fade-up">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-6">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <h2 className="text-3xl font-display font-bold mb-4">
                  Your Estimated Project Cost
                </h2>

                <Card className="mb-8">
                  <CardContent className="p-8">
                    <div className="text-4xl md:text-5xl font-display font-bold text-primary mb-2">
                      ${estimate.low.toLocaleString()} - ${estimate.high.toLocaleString()}
                    </div>
                    <p className="text-muted-foreground">
                      Based on Wellington market rates for {PROJECT_TYPES.find(p => p.id === formData.projectType)?.label.toLowerCase()} projects
                    </p>

                    <div className="grid sm:grid-cols-3 gap-4 mt-8 pt-8 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{matchedBuilders.length}</p>
                        <p className="text-sm text-muted-foreground">AI-Matched Builders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">Free</p>
                        <p className="text-sm text-muted-foreground">Quotes & Matching</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">100%</p>
                        <p className="text-sm text-muted-foreground">Vetted Professionals</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI-Matched Builders */}
              {matchedBuilders.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    AI-Matched Contractors for Your Project
                  </h3>
                  <div className="space-y-3">
                    {matchedBuilders.map((builder) => (
                      <Card key={builder.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Link 
                                  to={`/business/${builder.id}`}
                                  className="font-semibold text-foreground hover:text-primary transition-colors"
                                >
                                  {builder.name}
                                </Link>
                                {builder.is_verified && (
                                  <Badge className="bg-primary/10 text-primary border-primary/30 gap-1 text-xs">
                                    <BadgeCheck className="w-3 h-3" />
                                    Verified
                                  </Badge>
                                )}
                                {builder.subscription_plan === 'elite' && (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">
                                    Elite
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {builder.city}
                                </span>
                                {builder.rating && (
                                  <span className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    {builder.rating.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {builder.match_reasons.slice(0, 3).map((reason, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {reason}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-primary">
                                {builder.match_score}% match
                              </div>
                              <Button size="sm" className="mt-2" asChild>
                                <Link to={`/business/${builder.id}`}>View Profile</Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center text-center">
                <Button asChild size="lg">
                  <Link to="/category/eco-builders">
                    <Users className="w-5 h-5 mr-2" />
                    Browse All Contractors
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/community/ask">
                    Get Expert Advice
                  </Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mt-8 text-center">
                * Estimates are based on average Wellington market rates and may vary based on specific requirements, materials, and contractor availability.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
};

export default ProjectEstimator;
