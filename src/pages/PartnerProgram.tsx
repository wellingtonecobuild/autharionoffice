import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Handshake, DollarSign, Users, TrendingUp, Building2, Shield, Gift, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const PARTNER_TYPES = [
  { value: 'architect', label: 'Architect', commission: 15 },
  { value: 'real_estate', label: 'Real Estate Agent', commission: 12 },
  { value: 'supplier', label: 'Supplier', commission: 10 },
  { value: 'insurance', label: 'Insurance Provider', commission: 8 },
  { value: 'bank', label: 'Bank / Lender', commission: 10 },
  { value: 'media', label: 'Media / Influencer', commission: 15 },
];

const BENEFITS = [
  { icon: DollarSign, title: 'Generous Commissions', description: 'Earn up to 15% commission on every successful referral' },
  { icon: Users, title: 'Growing Network', description: 'Access to a network of quality builders and contractors' },
  { icon: Gift, title: 'Exclusive Perks', description: 'Partner-only discounts and early access to new features' },
  { icon: Shield, title: 'Trusted Platform', description: 'Associate with Wellington\'s premier construction directory' },
];

const PartnerProgram = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    partner_type: '',
    website: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('partners')
        .insert({
          ...formData,
          user_id: user?.id || null,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Application submitted successfully! We\'ll review your application and get back to you soon.');
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        partner_type: '',
        website: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPartnerType = PARTNER_TYPES.find(p => p.value === formData.partner_type);

  return (
    <>
      <Helmet>
        <title>Partner Program | Earn Commissions | Wellington EcoBuild</title>
        <meta name="description" content="Join Wellington EcoBuild's partner program. Earn commissions by referring builders, contractors, and construction professionals to our platform." />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-24 pb-16">
        {/* Hero */}
        <section className="relative bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="outline" className="mb-4">
                <Handshake className="h-3 w-3 mr-1" />
                Partner Program
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Grow Together With Us
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Join our partner program and earn generous commissions by connecting construction professionals with Wellington's leading directory.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">15%</p>
                  <p className="text-sm text-muted-foreground">Max Commission</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">100+</p>
                  <p className="text-sm text-muted-foreground">Active Partners</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">$50K+</p>
                  <p className="text-sm text-muted-foreground">Paid Out</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-12">Why Partner With Us?</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {BENEFITS.map((benefit) => (
                <Card key={benefit.title} className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <benefit.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Commission Rates */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-4">Commission Rates</h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Earn recurring commissions for every business you refer that signs up for a paid plan.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {PARTNER_TYPES.map((type) => (
                <Card key={type.value} className="relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-16 h-16 ${type.commission >= 15 ? 'bg-primary' : 'bg-muted'} transform rotate-45 translate-x-8 -translate-y-8`}></div>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Building2 className="h-6 w-6 text-primary" />
                      <h3 className="font-bold text-foreground">{type.label}</h3>
                    </div>
                    <p className="text-3xl font-bold text-primary mb-2">{type.commission}%</p>
                    <p className="text-sm text-muted-foreground">Commission per referral</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">1</div>
                <h3 className="font-bold text-foreground mb-2">Apply</h3>
                <p className="text-sm text-muted-foreground">Submit your application below</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">2</div>
                <h3 className="font-bold text-foreground mb-2">Get Approved</h3>
                <p className="text-sm text-muted-foreground">We review and approve partners</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">3</div>
                <h3 className="font-bold text-foreground mb-2">Share & Refer</h3>
                <p className="text-sm text-muted-foreground">Get your unique referral link</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">4</div>
                <h3 className="font-bold text-foreground mb-2">Earn</h3>
                <p className="text-sm text-muted-foreground">Get paid for successful referrals</p>
              </div>
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">Apply to Become a Partner</CardTitle>
                  <p className="text-muted-foreground">Fill out the form below and we'll get back to you within 24-48 hours.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          required
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Your company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contact_name">Contact Name *</Label>
                        <Input
                          id="contact_name"
                          required
                          value={formData.contact_name}
                          onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="you@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="04 123 4567"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="partner_type">Partner Type *</Label>
                        <Select
                          value={formData.partner_type}
                          onValueChange={(value) => setFormData({ ...formData, partner_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                          <SelectContent>
                            {PARTNER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label} ({type.commission}% commission)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Tell us about your business</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="How do you plan to refer businesses to us? What's your audience?"
                        rows={4}
                      />
                    </div>

                    {selectedPartnerType && (
                      <div className="bg-primary/10 p-4 rounded-lg">
                        <p className="text-sm text-foreground">
                          <strong>As a {selectedPartnerType.label}</strong>, you'll earn <strong>{selectedPartnerType.commission}% commission</strong> on every successful referral that signs up for a paid plan.
                        </p>
                      </div>
                    )}

                    <Button type="submit" className="w-full" size="lg" disabled={loading}>
                      {loading ? 'Submitting...' : 'Submit Application'}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you agree to our partner terms and conditions.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default PartnerProgram;
