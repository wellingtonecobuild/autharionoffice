import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Save, 
  Send, 
  Loader2,
  FileText
} from 'lucide-react';

interface PortalUser {
  id: string;
  email: string;
  legal_full_name: string | null;
  gst_registered: boolean;
  hourly_rate: number | null;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  date_of_service: string;
}

export default function PortalCreateInvoice() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  
  // Form state
  const [description, setDescription] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, date_of_service: '' }
  ]);

  useEffect(() => {
    if (!user) {
      navigate('/portal/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('portal_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          await signOut();
          navigate('/portal/login');
          return;
        }

        if (!data.profile_completed) {
          toast.error('Please complete your profile first');
          navigate('/portal/profile');
          return;
        }

        setPortalUser(data as PortalUser);
        
        // Set default rate if available
        if (data.hourly_rate) {
          setLineItems([
            { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: data.hourly_rate, date_of_service: '' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, navigate, signOut]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { 
        id: crypto.randomUUID(), 
        description: '', 
        quantity: 1, 
        unit_price: portalUser?.hourly_rate || 0, 
        date_of_service: '' 
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      toast.error('Invoice must have at least one line item');
      return;
    }
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateGST = () => {
    return portalUser?.gst_registered ? calculateSubtotal() * 0.15 : 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const validateForm = () => {
    for (const item of lineItems) {
      if (!item.description.trim()) {
        toast.error('All line items must have a description');
        return false;
      }
      if (item.quantity <= 0) {
        toast.error('Quantity must be greater than 0');
        return false;
      }
      if (item.unit_price <= 0) {
        toast.error('Unit price must be greater than 0');
        return false;
      }
    }
    return true;
  };

  const saveInvoice = async (submit: boolean = false) => {
    if (!portalUser || !validateForm()) return;

    if (submit) {
      setSubmitting(true);
    } else {
      setSaving(true);
    }

    try {
      // Generate invoice number
      const { data: invoiceNum } = await supabase.rpc('generate_invoice_number');
      
      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('contractor_invoices')
        .insert({
          invoice_number: invoiceNum || `INV-${Date.now()}`,
          portal_user_id: portalUser.id,
          invoice_date: new Date().toISOString().split('T')[0],
          period_start: periodStart || null,
          period_end: periodEnd || null,
          description: description || null,
          subtotal: calculateSubtotal(),
          gst_amount: calculateGST(),
          total_amount: calculateTotal(),
          status: submit ? 'submitted' : 'draft',
          submitted_at: submit ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items
      const { error: itemsError } = await supabase
        .from('invoice_line_items')
        .insert(
          lineItems.map((item, index) => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.quantity * item.unit_price,
            date_of_service: item.date_of_service || null,
            sort_order: index
          }))
        );

      if (itemsError) throw itemsError;

      // Show success immediately, fire notification in background
      if (submit) {
        toast.success('Invoice submitted for review!');
        supabase.functions.invoke('portal-invoice-action', {
          body: { invoiceId: invoice.id, action: 'submit' }
        }).catch(console.error);
      } else {
        toast.success('Invoice saved as draft');
      }

      navigate('/portal/dashboard');
    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast.error(error.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Create Invoice | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/dashboard" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className="font-semibold text-slate-900">Create Invoice</h1>
                  <p className="text-xs text-slate-500">Add services and submit for payment</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => saveInvoice(false)}
                  disabled={saving || submitting}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Draft
                </Button>
                <Button 
                  onClick={() => saveInvoice(true)}
                  disabled={saving || submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit for Review
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="Brief description of work performed..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input
                        type="date"
                        value={periodStart}
                        onChange={(e) => setPeriodStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input
                        type="date"
                        value={periodEnd}
                        onChange={(e) => setPeriodEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Line Items</CardTitle>
                  <Button variant="outline" size="sm" onClick={addLineItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-500">Item {index + 1}</span>
                        {lineItems.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Input
                          placeholder="Service or work description"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Date</Label>
                          <Input
                            type="date"
                            value={item.date_of_service}
                            onChange={(e) => updateLineItem(item.id, 'date_of_service', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hours/Qty *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rate *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="pl-8"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <span className="font-medium">
                          Amount: ${(item.quantity * item.unit_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Summary Sidebar */}
            <div>
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Invoice Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contractor</span>
                      <span className="font-medium">{portalUser?.legal_full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Line Items</span>
                      <span>{lineItems.length}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">${calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {portalUser?.gst_registered && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">GST (15%)</span>
                        <span>${calculateGST().toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Total</span>
                      <span className="text-emerald-600">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  {!portalUser?.gst_registered && (
                    <p className="text-xs text-muted-foreground">
                      Not GST registered. No GST will be added.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
