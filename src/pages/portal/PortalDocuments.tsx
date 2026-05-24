import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePortalUser } from '@/hooks/usePortalUser';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import { 
  Building2, 
  FileText, 
  Upload, 
  User, 
  LogOut,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileWarning,
  Shield,
  Calendar,
  Download,
  Eye
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';

interface Document {
  id: string;
  document_type: string;
  document_name: string;
  file_path: string;
  file_size: number | null;
  expiry_date: string | null;
  is_verified: boolean;
  created_at: string;
}

const DOCUMENT_TYPES = [
  { value: 'ird_certificate', label: 'IRD Certificate', icon: '🏛️' },
  { value: 'gst_certificate', label: 'GST Registration', icon: '📋' },
  { value: 'insurance', label: 'Insurance Certificate', icon: '🛡️' },
  { value: 'contract', label: 'Signed Contract', icon: '📝' },
  { value: 'bank_verification', label: 'Bank Verification', icon: '🏦' },
  { value: 'identification', label: 'Identification', icon: '🪪' },
  { value: 'other', label: 'Other Document', icon: '📄' },
];

export default function PortalDocuments() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { portalUser } = usePortalUser();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Upload form
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!portalUser) return;
    
    try {
      const { data, error } = await supabase
        .from('portal_documents')
        .select('*')
        .eq('portal_user_id', portalUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [portalUser]);

  useEffect(() => {
    if (!user) {
      navigate('/portal/login');
      return;
    }
    if (portalUser) {
      fetchDocuments();
    }
  }, [user, portalUser, navigate, fetchDocuments]);

  const handleLogout = async () => {
    await signOut();
    navigate('/portal/login');
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType || !documentName || !portalUser || !user) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${documentType}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('portal-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from('portal_documents')
        .insert({
          portal_user_id: portalUser.id,
          document_type: documentType,
          document_name: documentName,
          file_path: fileName,
          file_size: selectedFile.size,
          mime_type: selectedFile.type,
          expiry_date: expiryDate || null,
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      setShowUploadDialog(false);
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      // Delete from storage
      await supabase.storage.from('portal-documents').remove([doc.file_path]);

      // Delete record
      const { error } = await supabase
        .from('portal_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('portal-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.document_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const resetForm = () => {
    setDocumentType('');
    setDocumentName('');
    setExpiryDate('');
    setSelectedFile(null);
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, new Date());
    
    if (isPast(expiry)) {
      return { status: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, color: 'bg-amber-100 text-amber-800' };
    } else {
      return { status: 'valid', label: `Valid until ${format(expiry, 'dd MMM yyyy')}`, color: 'bg-emerald-100 text-emerald-800' };
    }
  };

  const getDocTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getDocTypeIcon = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.icon || '📄';
  };

  // Stats
  const verifiedCount = documents.filter(d => d.is_verified).length;
  const expiringCount = documents.filter(d => {
    if (!d.expiry_date) return false;
    const days = differenceInDays(new Date(d.expiry_date), new Date());
    return days >= 0 && days <= 30;
  }).length;
  const expiredCount = documents.filter(d => d.expiry_date && isPast(new Date(d.expiry_date))).length;

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
        <title>Documents | Wellington EcoBuild Portal</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-3">
                <Link to="/portal/dashboard" className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="font-semibold text-slate-900">Wellington EcoBuild</h1>
                    <p className="text-xs text-slate-500">Contractor Portal</p>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/portal/profile">
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">My Documents</h2>
              <p className="text-slate-500">Upload and manage your compliance documents</p>
            </div>
            <Button onClick={() => setShowUploadDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Documents</p>
                    <p className="text-2xl font-bold">{documents.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-700">Verified</p>
                    <p className="text-2xl font-bold text-emerald-800">{verifiedCount}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-emerald-200 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-emerald-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
            {expiringCount > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-700">Expiring Soon</p>
                      <p className="text-2xl font-bold text-amber-800">{expiringCount}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-amber-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {expiredCount > 0 && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700">Expired</p>
                      <p className="text-2xl font-bold text-red-800">{expiredCount}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-red-200 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-700" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Documents List */}
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>
                Keep your compliance documents up to date for IRD and insurance requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileWarning className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No documents uploaded</h3>
                  <p className="text-slate-500 mb-4">Upload your IRD certificate, insurance, and other compliance documents</p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const expiryStatus = getExpiryStatus(doc.expiry_date);
                    return (
                      <div 
                        key={doc.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
                            {getDocTypeIcon(doc.document_type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900">{doc.document_name}</p>
                              {doc.is_verified && (
                                <Badge className="bg-emerald-100 text-emerald-800 border-0">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">{getDocTypeLabel(doc.document_type)}</p>
                            {expiryStatus && (
                              <Badge className={`${expiryStatus.color} border-0 mt-1`}>
                                <Calendar className="h-3 w-3 mr-1" />
                                {expiryStatus.label}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => downloadDocument(doc)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          {!doc.is_verified && (
                            <Button variant="outline" size="sm" onClick={() => handleDelete(doc)} className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <span>{type.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Document Name *</Label>
              <Input
                placeholder="e.g., IRD Certificate 2024"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (if applicable)</Label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>File *</Label>
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Accepted: PDF, JPG, PNG, WebP (max 10MB)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={uploading || !selectedFile || !documentType || !documentName}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
