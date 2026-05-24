import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Leaf, 
  Building2, 
  Users, 
  Target, 
  Heart, 
  Shield, 
  Award,
  ArrowRight,
  MapPin,
  Lightbulb,
  Handshake
} from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Leaf,
      title: "Sustainability First",
      description: "We believe in building a greener future. Every business on our platform is committed to sustainable practices and eco-friendly solutions."
    },
    {
      icon: Shield,
      title: "Trust & Transparency",
      description: "We verify every professional on our platform, ensuring you work with qualified experts who deliver quality results."
    },
    {
      icon: Handshake,
      title: "Community Connection",
      description: "We're building a network of like-minded professionals and homeowners who share a vision for sustainable construction."
    },
    {
      icon: Lightbulb,
      title: "Innovation & Education",
      description: "We stay at the forefront of green building technology and share knowledge to help our community make informed decisions."
    }
  ];

  const stats = [
    { number: "500+", label: "Verified Professionals" },
    { number: "15+", label: "Wellington Suburbs" },
    { number: "4", label: "Specialised Categories" },
    { number: "1000+", label: "Projects Completed" }
  ];

  const team = [
    {
      name: "Beveck Chiwawa",
      role: "Founder & CEO",
      description: "Leading Wellington EcoBuild's mission to connect homeowners with verified sustainable building professionals across the Wellington region."
    }
  ];

  return (
    <>
      <Helmet>
        <title>About Us | Wellington EcoBuild - Building a Sustainable Future</title>
        <meta 
          name="description" 
          content="Learn about Wellington EcoBuild's mission to connect homeowners with verified sustainable building professionals across the Wellington region." 
        />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-background to-primary/5" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Leaf className="w-4 h-4" />
                Our Story
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Building Wellington's
                <span className="text-accent block">Sustainable Future</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Wellington EcoBuild is the premier directory connecting Wellington homeowners and businesses 
                with verified sustainable building professionals. We're passionate about making green building 
                accessible, transparent, and trusted.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Target className="w-4 h-4" />
                  Our Mission
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Empowering Sustainable Choices in Wellington
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  We started Wellington EcoBuild with a simple belief: finding a trusted, sustainable 
                  building professional shouldn't be difficult. Whether you're looking for an eco-builder, 
                  sustainable material supplier, green architect, or renovation specialist, we make the 
                  connection seamless.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Our platform verifies every professional, ensuring they meet our high standards for 
                  quality, sustainability, and customer service. We're not just a directory – we're a 
                  community committed to transforming how Wellington builds.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg">
                    <Link to="/category/eco-builders">
                      Find Professionals
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                  <div className="flex flex-col items-center">
                    <Button variant="outline" size="lg" asChild>
                      <Link to="/list-business">Apply to Be Listed</Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      We only accept a limited number of verified builders per area.
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat, index) => (
                    <Card key={index} className="bg-card border-border hover:border-accent/50 transition-colors">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl md:text-4xl font-bold text-accent mb-2">
                          {stat.number}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {stat.label}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 lg:mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Heart className="w-4 h-4" />
                Our Values
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What Drives Us Forward
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                These core values guide everything we do at Wellington EcoBuild
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <Card key={index} className="bg-card border-border hover:border-accent/50 hover:shadow-lg transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                      <value.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Why Wellington Section */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <MapPin className="w-4 h-4" />
                  Why Wellington
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Proudly Serving the Wellington Region
                </h2>
              </div>
              
              <div className="bg-card rounded-2xl border border-border p-8 lg:p-10">
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  Wellington is at the forefront of New Zealand's sustainable building movement. 
                  With strong council initiatives, a community passionate about environmental 
                  responsibility, and unique geographical challenges, the capital region demands 
                  specialised expertise.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  From the windy hills of Karori to the coastal suburbs of Island Bay, from 
                  urban Thorndon to suburban Porirua – we understand the unique building 
                  requirements of each Wellington neighbourhood.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  Our local focus means we know the professionals who understand Wellington's 
                  climate, regulations, and community needs. We're not a national directory 
                  trying to cover everything – we're specialists in Wellington's sustainable 
                  building ecosystem.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* For Professionals Section */}
        <section className="py-16 lg:py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1">
                <Card className="bg-gradient-to-br from-accent/10 to-primary/5 border-accent/20">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                        <Award className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">Verified Professional</h3>
                        <p className="text-sm text-muted-foreground">Premium & Elite Members</p>
                      </div>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                          <span className="text-accent text-xs">✓</span>
                        </div>
                        <span className="text-muted-foreground">Prominent listing in search results</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                          <span className="text-accent text-xs">✓</span>
                        </div>
                        <span className="text-muted-foreground">Verified Professional badge</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                          <span className="text-accent text-xs">✓</span>
                        </div>
                        <span className="text-muted-foreground">Direct lead generation</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center mt-0.5">
                          <span className="text-accent text-xs">✓</span>
                        </div>
                        <span className="text-muted-foreground">Customer review management</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                  <Building2 className="w-4 h-4" />
                  For Professionals
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                  Grow Your Sustainable Building Business
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  Join Wellington's leading directory for sustainable building professionals. 
                  Connect with homeowners actively seeking eco-friendly solutions and grow 
                  your business with qualified leads.
                </p>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Our verification process builds trust, and our marketing reaches homeowners 
                  at the moment they're ready to build sustainably.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex flex-col">
                    <Button asChild size="lg">
                      <Link to="/list-business">
                        Apply to Be Listed
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      We only accept a limited number of verified builders per area.
                    </p>
                  </div>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/pricing">View Pricing</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-br from-accent/10 via-background to-primary/5">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                <Users className="w-4 h-4" />
                Get Started
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Ready to Build Sustainably?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Whether you're a homeowner looking for trusted professionals or a business 
                wanting to reach eco-conscious customers, Wellington EcoBuild is here to help.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg">
                  <Link to="/category/eco-builders">
                    Find Professionals
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/contact">Contact Us</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default About;
