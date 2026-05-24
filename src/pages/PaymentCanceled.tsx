import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PaymentCanceled = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Payment Canceled | Wellington EcoBuild</title>
        <meta name="description" content="Your payment was canceled" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-muted to-background flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              Payment Canceled
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Your payment was not completed. No charges have been made to your account.
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-2 border-muted shadow-lg mb-6">
            <CardContent className="p-8">
              {/* Info Box */}
              <div className="bg-muted/50 rounded-lg p-6 mb-6 border border-border">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <HelpCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg text-foreground mb-1">
                      What Happened?
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      The payment process was interrupted or canceled. This could happen if you closed the payment window, clicked cancel, or if there was a connection issue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-4 mb-8">
                <h3 className="font-medium text-foreground">What would you like to do?</h3>
                
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Try Again</p>
                      <p className="text-xs text-muted-foreground">
                        Return to pricing and complete your subscription purchase.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border border-border">
                    <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Need Help?</p>
                      <p className="text-xs text-muted-foreground">
                        If you experienced any issues, our support team is here to assist you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate("/pricing")}
                  className="w-full h-12 text-base bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Return to Pricing
                </Button>
                
                <Button 
                  onClick={() => navigate("/dashboard")}
                  variant="outline"
                  className="w-full h-12 text-base"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground">
            Questions about pricing?{" "}
            <a href="mailto:support@wellingtonecobuild.nz" className="text-primary hover:underline">
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </>
  );
};

export default PaymentCanceled;
