import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Receipt, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PaymentSuccessDialogProps {
  onClose?: () => void;
}

const PaymentSuccessDialog = ({ onClose }: PaymentSuccessDialogProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [latestInvoice, setLatestInvoice] = useState<{
    invoice_pdf: string | null;
    hosted_invoice_url: string | null;
  } | null>(null);

  const payment = searchParams.get("payment");
  const plan = searchParams.get("plan");
  const type = searchParams.get("type");

  useEffect(() => {
    if (payment === "success") {
      setOpen(true);
      fetchLatestInvoice();
    }
  }, [payment]);

  const fetchLatestInvoice = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-billing-history');
      
      if (!error && data?.invoices?.length > 0) {
        const latest = data.invoices[0];
        setLatestInvoice({
          invoice_pdf: latest.invoice_pdf,
          hosted_invoice_url: latest.hosted_invoice_url,
        });
      }
    } catch (err) {
      console.error("Error fetching invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Clear payment params but keep others if needed
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("payment");
    newParams.delete("plan");
    setSearchParams(newParams);
    onClose?.();
  };

  const handleGoToDashboard = () => {
    handleClose();
    navigate("/dashboard");
  };

  const handleDownloadReceipt = () => {
    if (latestInvoice?.invoice_pdf) {
      window.open(latestInvoice.invoice_pdf, "_blank");
    } else if (latestInvoice?.hosted_invoice_url) {
      window.open(latestInvoice.hosted_invoice_url, "_blank");
    } else {
      toast.info("Receipt will be available in your dashboard shortly.");
      handleGoToDashboard();
    }
  };

  const getPaymentTypeText = () => {
    if (type === "pay_per_listing") {
      return "Job Listing";
    }
    if (plan) {
      return `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`;
    }
    return "Subscription";
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <DialogTitle className="text-2xl">Payment Successful!</DialogTitle>
          <DialogDescription className="text-base">
            Thank you for your purchase. Your {getPaymentTypeText()} is now active.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 space-y-3 my-4">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Receipt Available</p>
              <p className="text-xs text-muted-foreground">
                Your receipt is available for download and will always be accessible from your dashboard.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={handleDownloadReceipt} 
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download Receipt
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoToDashboard}
            className="w-full"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSuccessDialog;
