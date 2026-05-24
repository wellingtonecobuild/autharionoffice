import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T, index: number) => ReactNode;
}

interface AdminDataTableProps<T> {
  title?: string;
  description?: string;
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  headerActions?: ReactNode;
  keyExtractor: (item: T) => string;
  className?: string;
}

export function AdminDataTable<T>({
  title,
  description,
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  headerActions,
  keyExtractor,
  className,
}: AdminDataTableProps<T>) {
  return (
    <Card className={cn('shadow-sm border-border', className)}>
      {(title || description || headerActions) && (
        <CardHeader className="border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <CardTitle className="text-base font-semibold text-foreground">
                  {title}
                </CardTitle>
              )}
              {description && (
                <CardDescription className="text-sm mt-0.5">
                  {description}
                </CardDescription>
              )}
            </div>
            {headerActions}
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => (
                <TableHead 
                  key={col.key} 
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide text-muted-foreground h-10',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-admin-teal" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      Loading data...
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-12">
                  <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={keyExtractor(item)} className="hover:bg-muted/30">
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn('py-3', col.className)}>
                      {col.render ? col.render(item, index) : (item as any)[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
