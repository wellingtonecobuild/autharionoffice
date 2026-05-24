import { format } from 'date-fns';

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: any) => string;
}

/**
 * Export data to CSV format
 */
export const exportToCSV = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
): void => {
  // Create header row
  const headerRow = columns.map(col => `"${col.header}"`).join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : value;
      // Escape quotes and wrap in quotes
      const escaped = String(formatted ?? '').replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  // Combine and create blob
  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, `${filename}.csv`);
};

/**
 * Export data to Excel-compatible format (TSV with .xls extension)
 */
export const exportToExcel = (
  data: Record<string, any>[],
  columns: ExportColumn[],
  filename: string
): void => {
  // Create header row
  const headerRow = columns.map(col => col.header).join('\t');
  
  // Create data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : value;
      return String(formatted ?? '').replace(/\t/g, ' ');
    }).join('\t');
  });

  // Combine and create blob
  const tsv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([tsv], { type: 'application/vnd.ms-excel' });
  
  downloadBlob(blob, `${filename}.xls`);
};

/**
 * Generate PDF-ready HTML for printing
 */
export const generatePrintableHTML = (
  title: string,
  data: Record<string, any>[],
  columns: ExportColumn[],
  options?: {
    logo?: string;
    subtitle?: string;
    footer?: string;
  }
): string => {
  const now = format(new Date(), 'PPpp');
  
  const tableRows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key];
      const formatted = col.formatter ? col.formatter(value) : value;
      return `<td style="padding: 8px; border: 1px solid #e2e8f0;">${formatted ?? ''}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const headerCells = columns.map(col => 
    `<th style="padding: 8px; border: 1px solid #e2e8f0; background: #f1f5f9; font-weight: 600; text-align: left;">${col.header}</th>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          padding: 20px;
          color: #1e293b;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 2px solid #059669;
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
          color: #059669;
        }
        .date { 
          color: #64748b; 
          font-size: 14px; 
        }
        h1 { 
          font-size: 20px; 
          margin: 0 0 8px 0;
          color: #1e293b;
        }
        .subtitle {
          color: #64748b;
          font-size: 14px;
          margin-bottom: 20px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 16px;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 12px;
          color: #64748b;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">Wellington EcoBuild</div>
          <div class="date">Generated: ${now}</div>
        </div>
      </div>
      
      <h1>${title}</h1>
      ${options?.subtitle ? `<p class="subtitle">${options.subtitle}</p>` : ''}
      
      <table>
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      ${options?.footer ? `<div class="footer">${options.footer}</div>` : ''}
      
      <script>
        window.onload = function() { window.print(); }
      </script>
    </body>
    </html>
  `;
};

/**
 * Open print dialog with formatted content
 */
export const printReport = (
  title: string,
  data: Record<string, any>[],
  columns: ExportColumn[],
  options?: {
    subtitle?: string;
    footer?: string;
  }
): void => {
  const html = generatePrintableHTML(title, data, columns, options);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

/**
 * Helper to download a blob
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Common formatters
 */
export const formatters = {
  currency: (value: number) => `$${(value || 0).toFixed(2)}`,
  date: (value: string) => value ? format(new Date(value), 'dd/MM/yyyy') : '',
  dateTime: (value: string) => value ? format(new Date(value), 'dd/MM/yyyy HH:mm') : '',
  boolean: (value: boolean) => value ? 'Yes' : 'No',
  status: (value: string) => value ? value.charAt(0).toUpperCase() + value.slice(1) : '',
};
