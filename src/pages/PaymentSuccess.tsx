import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, Download, ArrowRight, Receipt, Shield, Clock, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  
  const businessId = searchParams.get("business_id");
  const type = searchParams.get("type");

  useEffect(() => {
    fetchLatestInvoice();
  }, []);

  const fetchLatestInvoice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('get-latest-invoice', {
        body: { userId: user.id }
      });

      if (!error && data?.invoiceUrl) {
        setInvoiceUrl(data.invoiceUrl);
      }
    } catch (error) {
      console.log('Could not fetch invoice:', error);
    }
  };

  const handleDownloadReceipt = async () => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
      return;
    }
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to download your receipt");
        return;
      }

      const { data, error } = await supabase.functions.invoke('get-latest-invoice', {
        body: { userId: user.id }
      });

      if (error) throw error;

      if (data?.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
      } else {
        toast.info("Your receipt will be available shortly");
      }
    } catch (error) {
      toast.error("Could not retrieve receipt. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getPaymentTypeText = () => {
    if (type === "job") return "job listing";
    if (type === "spotlight") return "spotlight feature";
    return "subscription";
  };

  return (
    <>
      <Helmet>
        <title>Payment Successful | Wellington EcoBuild</title>
        <meta name="description" content="Your payment has been successfully processed" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-muted to-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Government-style Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Payment Successful
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Thank you for your payment. Your {getPaymentTypeText()} is now active and ready to use.
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-2 border-primary/20 shadow-lg mb-6">
            <CardContent className="p-8">
              {/* Confirmation Details */}
              <div className="bg-primary/5 rounded-lg p-6 mb-6 border border-primary/10">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg text-foreground mb-1">
                      Payment Confirmed
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Your transaction has been securely processed. A confirmation email has been sent to your registered email address.
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Receipt className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Receipt Available</p>
                    <p className="text-xs text-muted-foreground">
                      Download your receipt for your records or accounting purposes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-foreground">Instant Activation</p>
                    <p className="text-xs text-muted-foreground">
                      Your subscription benefits are now active and ready to use.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={handleDownloadReceipt} 
                  variant="outline"
                  className="w-full h-12 text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5 mr-2" />
                  )}
                  Download Receipt
                </Button>
                
                <Button 
                  onClick={() => navigate("/dashboard")}
                  className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground">
            Need help? Contact our support team at{" "}
            <a href="mailto:support@wellingtonecobuild.nz" className="text-primary hover:underline">
              support@wellingtonecobuild.nz
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default PaymentSuccess;
