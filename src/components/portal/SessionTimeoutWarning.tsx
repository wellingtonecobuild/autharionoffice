import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

interface SessionTimeoutWarningProps {
  onLogout?: () => void;
}

export const SessionTimeoutWarning = ({ onLogout }: SessionTimeoutWarningProps) => {
  const { showWarning, remainingSeconds, extendSession, formatTime } = useSessionTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    onTimeout: onLogout,
  });

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            Session Expiring Soon
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-slate-600 mb-2">
              Your session will expire due to inactivity.
            </p>
            <p className="text-3xl font-bold text-amber-600">
              {formatTime(remainingSeconds)}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Click "Stay Logged In" to continue your session.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onLogout}>
            Logout Now
          </Button>
          <Button onClick={extendSession} className="bg-emerald-600 hover:bg-emerald-700">
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
