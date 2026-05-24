import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Send, CheckCircle, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
const bookingSchema = z.object({
  customer_name: z.string().min(2, 'Name must be at least 2 characters'),
  customer_email: z.string().email('Please enter a valid email'),
  customer_phone: z.string().optional(),
  project_type: z.string().min(1, 'Please select a project type'),
  project_description: z.string().min(20, 'Please provide more details (at least 20 characters)'),
  preferred_start_date: z.string().optional(),
  estimated_budget: z.string().optional(),
  property_address: z.string().optional(),
  property_type: z.string().optional(),
  urgency: z.string().default('normal'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  businessId: string;
  businessName: string;
  onSuccess?: (trackingCode: string) => void;
}

const projectTypes = [
  'New Build',
  'Renovation',
  'Extension',
  'Kitchen Remodel',
  'Bathroom Remodel',
  'Deck/Outdoor Living',
  'Roofing',
  'Insulation',
  'Solar Installation',
  'Heat Pump Installation',
  'General Repairs',
  'Commercial Project',
  'Other',
];

const budgetRanges = [
  'Under $10,000',
  '$10,000 - $25,000',
  '$25,000 - $50,000',
  '$50,000 - $100,000',
  '$100,000 - $250,000',
  '$250,000 - $500,000',
  '$500,000+',
  'Not sure yet',
];

const propertyTypes = [
  'Residential - House',
  'Residential - Apartment',
  'Residential - Townhouse',
  'Commercial - Office',
  'Commercial - Retail',
  'Commercial - Industrial',
  'Other',
];

export function BookingForm({ businessId, businessName, onSuccess }: BookingFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      urgency: 'normal',
    },
  });

  // Gate behind authentication
  if (!user) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Request a Quote
          </CardTitle>
          <CardDescription>
            Sign in to request a quote from {businessName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Sign in required</p>
              <p className="text-sm text-muted-foreground">
                Create a free account to request quotes and track your projects
              </p>
            </div>
            <Button asChild className="w-full">
              <Link to="/auth">
                <Lock className="w-4 h-4 mr-2" />
                Sign In to Request Quote
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      const { data: booking, error } = await supabase
        .from('project_bookings')
        .insert([{
          business_id: businessId,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          customer_phone: data.customer_phone || null,
          project_type: data.project_type,
          project_description: data.project_description,
          preferred_start_date: data.preferred_start_date || null,
          estimated_budget: data.estimated_budget || null,
          property_address: data.property_address || null,
          property_type: data.property_type || null,
          urgency: data.urgency,
        }])
        .select('tracking_code')
        .single();

      if (error) throw error;

      // Send notification email to business
      await supabase.functions.invoke('project-booking-notification', {
        body: {
          bookingId: booking.tracking_code,
          businessId,
          customerName: data.customer_name,
          customerEmail: data.customer_email,
          projectType: data.project_type,
        },
      });

      setTrackingCode(booking.tracking_code);
      setIsSubmitted(true);
      toast.success('Booking request submitted successfully!');
      onSuccess?.(booking.tracking_code);
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error('Failed to submit booking request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted && trackingCode) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-800">Booking Request Submitted!</h3>
            <p className="text-green-700">
              Your request has been sent to {businessName}. They will review it and get back to you soon.
            </p>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-sm text-muted-foreground mb-1">Your Tracking Code</p>
              <p className="text-2xl font-mono font-bold text-primary">{trackingCode}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Save this code to track your project status
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = `/track-project?code=${trackingCode}`}
            >
              Track Your Project
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Request a Quote
        </CardTitle>
        <CardDescription>
          Fill out the form below and {businessName} will get back to you with a quote
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Your Name *</Label>
              <Input
                id="customer_name"
                {...register('customer_name')}
                placeholder="John Smith"
              />
              {errors.customer_name && (
                <p className="text-sm text-destructive">{errors.customer_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_email">Email *</Label>
              <Input
                id="customer_email"
                type="email"
                {...register('customer_email')}
                placeholder="john@example.com"
              />
              {errors.customer_email && (
                <p className="text-sm text-destructive">{errors.customer_email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone (Optional)</Label>
              <Input
                id="customer_phone"
                {...register('customer_phone')}
                placeholder="04XX XXX XXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type *</Label>
              <Select onValueChange={(value) => setValue('project_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {projectTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.project_type && (
                <p className="text-sm text-destructive">{errors.project_type.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project_description">Project Description *</Label>
            <Textarea
              id="project_description"
              {...register('project_description')}
              placeholder="Describe your project in detail. Include any specific requirements, materials preferences, or considerations..."
              rows={4}
            />
            {errors.project_description && (
              <p className="text-sm text-destructive">{errors.project_description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="property_address">Property Address</Label>
              <Input
                id="property_address"
                {...register('property_address')}
                placeholder="123 Main Street, Wellington"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="property_type">Property Type</Label>
              <Select onValueChange={(value) => setValue('property_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_budget">Estimated Budget</Label>
              <Select onValueChange={(value) => setValue('estimated_budget', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  {budgetRanges.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_start_date">Preferred Start Date</Label>
              <Input
                id="preferred_start_date"
                type="date"
                {...register('preferred_start_date')}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="urgency">Urgency</Label>
            <Select onValueChange={(value) => setValue('urgency', value)} defaultValue="normal">
              <SelectTrigger>
                <SelectValue placeholder="Select urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Flexible timeline</SelectItem>
                <SelectItem value="normal">Normal - Within a few weeks</SelectItem>
                <SelectItem value="high">High - As soon as possible</SelectItem>
                <SelectItem value="urgent">Urgent - Emergency repair</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Booking Request
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            By submitting, you agree to be contacted by {businessName} regarding your project.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
