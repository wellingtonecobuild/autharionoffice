import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  FileText,
  Loader2,
  User,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  admin_id: string;
  entity_id: string | null;
  entity_type: string;
  metadata: Record<string, any> | null;
  created_at: string;
  admin_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface DocumentHistoryProps {
  documentId: string;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  approve_document: {
    icon: <CheckCircle className="h-4 w-4" />,
    label: 'Approved',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  reject_document: {
    icon: <XCircle className="h-4 w-4" />,
    label: 'Rejected',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  request_document_replacement: {
    icon: <RefreshCw className="h-4 w-4" />,
    label: 'Replacement Requested',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  delete_document: {
    icon: <Trash2 className="h-4 w-4" />,
    label: 'Deleted',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  },
  upload_document: {
    icon: <FileText className="h-4 w-4" />,
    label: 'Uploaded',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  set_document_expiry: {
    icon: <Clock className="h-4 w-4" />,
    label: 'Expiry Set',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
};

export function DocumentHistory({ documentId, documentName, open, onOpenChange }: DocumentHistoryProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && documentId) {
      fetchHistory();
    }
  }, [open, documentId]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'verification_submission')
        .eq('entity_id', documentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch admin profiles for the logs
      const adminIds = [...new Set((data || []).map(log => log.admin_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', adminIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const logsWithProfiles = (data || []).map(log => ({
        ...log,
        metadata: log.metadata as Record<string, any> | null,
        admin_profile: profileMap.get(log.admin_id) || null,
      }));

      setLogs(logsWithProfiles);
    } catch (error) {
      console.error('Error fetching document history:', error);
    } finally {
      setLoading(false);
    }
  }

  const getActionConfig = (action: string) => {
    return ACTION_CONFIG[action] || {
      icon: <FileText className="h-4 w-4" />,
      label: action.replace(/_/g, ' '),
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Document History
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {documentName}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <History className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No history available</p>
            <p className="text-sm text-muted-foreground/70">
              Status changes will appear here
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {logs.map((log, index) => {
                  const config = getActionConfig(log.action);
                  return (
                    <div key={log.id} className="relative flex gap-4">
                      {/* Timeline dot */}
                      <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background ${config.color}`}>
                        {config.icon}
                      </div>
                      
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                          </span>
                        </div>
                        
                        <div className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.admin_profile?.full_name || log.admin_profile?.email || 'Admin'}
                        </div>

                        {log.metadata && (
                          <div className="mt-2 text-sm bg-muted/50 rounded p-2 space-y-1">
                            {log.metadata.reason && (
                              <p><strong>Reason:</strong> {log.metadata.reason}</p>
                            )}
                            {log.metadata.instructions && (
                              <p><strong>Instructions:</strong> {log.metadata.instructions}</p>
                            )}
                            {log.metadata.expiry_date && (
                              <p><strong>Expiry Date:</strong> {new Date(log.metadata.expiry_date).toLocaleDateString()}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface DocumentHistoryButtonProps {
  documentId: string;
  documentName: string;
  compact?: boolean;
}

export function DocumentHistoryButton({ documentId, documentName, compact = false }: DocumentHistoryButtonProps) {
  const [open, setOpen] = useState(false);

  // Don't show for legacy documents with composite IDs
  if (documentId.includes(':')) {
    return null;
  }

  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          title="View History"
        >
          <History className="h-4 w-4" />
        </Button>
        <DocumentHistory
          documentId={documentId}
          documentName={documentName}
          open={open}
          onOpenChange={setOpen}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <History className="h-4 w-4 mr-1" />
        History
      </Button>
      <DocumentHistory
        documentId={documentId}
        documentName={documentName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
