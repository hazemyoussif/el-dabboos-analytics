import { AlertCircle, ChartNoAxesCombined, Info, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';
export function EmptyState({ children, search = false, action }: { children: ReactNode; search?: boolean; action?: ReactNode }) {
  const Icon = search ? SearchX : ChartNoAxesCombined;
  return <div className="empty-state"><Icon aria-hidden="true" /><p>{children}</p>{action}</div>;
}
export function Notice({ children, tone = 'warning' }: { children: ReactNode; tone?: 'warning' | 'danger' | 'info' }) {
  const Icon = tone === 'info' ? Info : AlertCircle;
  return <div className={`notice notice-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}><Icon aria-hidden="true" /><span>{children}</span></div>;
}
export function DashboardSkeleton({ label }: { label: string }) {
  return <div className="dashboard-skeleton" role="status" aria-label={label}><span className="sr-only">{label}</span>{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index}><span className="skeleton skeleton-label" /><span className="skeleton skeleton-value" /><span className="skeleton skeleton-context" /></div>)}</div>;
}
