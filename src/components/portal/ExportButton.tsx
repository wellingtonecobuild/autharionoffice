import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { exportToCSV, exportToExcel, printReport, ExportColumn, formatters } from '@/utils/exportUtils';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: Record<string, any>[];
  columns: ExportColumn[];
  filename: string;
  title: string;
  subtitle?: string;
}

export const ExportButton = ({ 
  data, 
  columns, 
  filename, 
  title,
  subtitle 
}: ExportButtonProps) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel' | 'print') => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportToCSV(data, columns, filename);
          toast.success('CSV exported successfully');
          break;
        case 'excel':
          exportToExcel(data, columns, filename);
          toast.success('Excel file exported successfully');
          break;
        case 'print':
          printReport(title, data, columns, { subtitle });
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting} className="gap-2">
          <Download className="h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')} className="gap-2">
          <FileText className="h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('print')} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Re-export formatters for convenience
export { formatters };
