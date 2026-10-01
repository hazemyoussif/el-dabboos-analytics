import { createElement } from 'react';
import type { ReactNode } from 'react';

/** Keep editing controls ahead of potentially tall dashboard content. */
export function DashboardSection({ header, aiEditor, metadata, canvas }: {
  header: ReactNode; aiEditor?: ReactNode; metadata: ReactNode; canvas: ReactNode;
}) {
  return createElement('section', { className: 'dashboard-section' }, header, aiEditor, metadata, canvas);
}
