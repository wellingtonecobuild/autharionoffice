import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Eye, Loader2, Trash2, ExternalLink } from "lucide-react";

const VERIFICATION_BUCKET = "verification-documents";

function extractObjectPathFromStorageUrl(fileUrl: string, bucket: string): string | null {
  const trimmed = (fileUrl || "").trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, "");
  }

  try {
    const decoded = decodeURIComponent(trimmed);
    const marker = `/${bucket}/`;
    const idx = decoded.indexOf(marker);
    if (idx === -1) return null;

    const after = decoded.slice(idx + marker.length);
    return after.split("?")[0] || null;
  } catch {
    return null;
  }
}

function guessKindFromName(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) return "file" as const;
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image" as const;
  if (ext === "pdf") return "pdf" as const;
  return "file" as const;
}

async function fetchBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
  return await res.blob();
}

interface DocumentActionsProps {
  fileUrl: string;
  fileName: string;
  onDelete?: () => Promise<void>;
  showDelete?: boolean;
  compact?: boolean;
}

export function DocumentActions({
  fileUrl,
  fileName,
  onDelete,
  showDelete = false,
  compact = false,
}: DocumentActionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [busy, setBusy] = useState<"view" | "download" | "delete" | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  const kind = useMemo(() => guessKindFromName(fileName), [fileName]);

  const resolveAccessibleUrl = async (): Promise<string> => {
    const objectPath = extractObjectPathFromStorageUrl(fileUrl, VERIFICATION_BUCKET);
    if (!objectPath) return fileUrl;

    const { data, error } = await supabase.storage
      .from(VERIFICATION_BUCKET)
      .createSignedUrl(objectPath, 60 * 10);

    if (error || !data?.signedUrl) {
      return fileUrl;
    }

    return data.signedUrl;
  };

  const handleView = async () => {
    setBusy("view");
    try {
      const url = await resolveAccessibleUrl();
      setResolvedUrl(url);
      setOpen(true);
    } catch (e: any) {
      toast({
        title: "Could not open document",
        description: e?.message || "Failed to generate a view link",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleOpenExternal = async () => {
    setBusy("view");
    try {
      const url = await resolveAccessibleUrl();
      window.open(url, "_blank");
    } catch (e: any) {
      toast({
        title: "Could not open document",
        description: e?.message || "Failed to generate a view link",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const url = await resolveAccessibleUrl();
      const blob = await fetchBlob(url);
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fileName || "document";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (e: any) {
      toast({
        title: "Download failed",
        description: e?.message || "Could not download this document",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setBusy("delete");
    try {
      await onDelete();
      setDeleteDialogOpen(false);
      toast({
        title: "Document deleted",
        description: "The document has been removed successfully",
      });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Could not delete this document",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  if (compact) {
    return (
      <>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleView}
            disabled={busy !== null}
            title="View"
          >
            {busy === "view" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            disabled={busy !== null}
            title="Download"
          >
            {busy === "download" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          {showDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={busy !== null}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="truncate">{fileName}</DialogTitle>
            </DialogHeader>

            {!resolvedUrl ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : kind === "image" ? (
              <img
                src={resolvedUrl}
                alt={`Document preview: ${fileName}`}
                className="max-h-[70vh] w-full object-contain rounded-md border"
                loading="lazy"
              />
            ) : (
              <iframe
                title={`Document preview: ${fileName}`}
                src={resolvedUrl}
                className="h-[70vh] w-full rounded-md border"
              />
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleOpenExternal}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button onClick={handleDownload} disabled={busy !== null}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Document</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{fileName}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={busy === "delete"}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleView}
          disabled={busy !== null}
        >
          {busy === "view" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Eye className="h-4 w-4 mr-1" />
          )}
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={busy !== null}
        >
          {busy === "download" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Download
        </Button>
        {showDelete && onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={busy !== null}
            className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{fileName}</DialogTitle>
          </DialogHeader>

          {!resolvedUrl ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : kind === "image" ? (
            <img
              src={resolvedUrl}
              alt={`Verification document preview: ${fileName}`}
              className="max-h-[70vh] w-full object-contain rounded-md border"
              loading="lazy"
            />
          ) : (
            <iframe
              title={`Verification document preview: ${fileName}`}
              src={resolvedUrl}
              className="h-[70vh] w-full rounded-md border"
            />
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleOpenExternal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button onClick={handleDownload} disabled={busy !== null}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy === "delete" && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
