import React from 'react';
import { cn } from '../utils.js';

// Button Component
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-[var(--cape-primary,#0f172a)] text-[var(--cape-primary-foreground,#f8fafc)] hover:opacity-90 shadow':
              variant === 'default',
            'bg-red-600 text-slate-50 hover:bg-red-600/90 shadow-sm': variant === 'destructive',
            'border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 shadow-sm': variant === 'outline',
            'bg-slate-100 text-slate-900 hover:bg-slate-100/80': variant === 'secondary',
            'hover:bg-slate-100 hover:text-slate-900': variant === 'ghost',
            'text-slate-900 underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// Badge Component
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-[var(--cape-primary,#0f172a)] text-[var(--cape-primary-foreground,#f8fafc)] hover:opacity-90':
            variant === 'default',
          'border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80': variant === 'secondary',
          'border-transparent bg-red-500 text-slate-50 hover:bg-red-500/80': variant === 'destructive',
          'border-transparent bg-green-500 text-white hover:bg-green-500/80': variant === 'success',
          'text-slate-950 border-slate-200': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

// Table Components
export const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
);
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('[&_tr]:border-b bg-slate-50/50', className)} {...props} />
  )
);
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  )
);
TableBody.displayName = 'TableBody';

export const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-b transition-colors hover:bg-slate-50 data-[state=selected]:bg-slate-100', className)}
      {...props}
    />
  )
);
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-10 px-4 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      {...props}
    />
  )
);
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]', className)}
      {...props}
    />
  )
);
TableCell.displayName = 'TableCell';

// Dialog Components
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10 border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-medium">
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// Alert Component
export function Alert({
  variant = 'default',
  children,
  className,
}: {
  variant?: 'default' | 'destructive';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-950 [&>svg~*]:pl-7',
        {
          'bg-white text-slate-950 border-slate-200': variant === 'default',
          'border-red-500/50 text-red-600 bg-red-50/50': variant === 'destructive',
        },
        className
      )}
    >
      {children}
    </div>
  );
}

// Empty State
export function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your search or filters.',
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 p-8 text-center animate-in fade-in-50">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mb-4 mt-2 text-sm text-slate-500">{description}</p>
        {action}
      </div>
    </div>
  );
}

// Error State
export function ErrorState({ error, onRetry }: { error: Error | string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-red-200 bg-red-50/20 p-8 text-center">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <h3 className="mt-4 text-lg font-semibold text-red-600">Something went wrong</h3>
        <p className="mb-4 mt-2 text-sm text-red-500">{typeof error === 'string' ? error : error.message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
