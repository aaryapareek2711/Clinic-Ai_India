'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type FlowItem = {
  label: string;
  href?: string;
};

interface FlowBreadcrumbProps {
  items: FlowItem[];
  className?: string;
}

export default function FlowBreadcrumb({ items, className = '' }: FlowBreadcrumbProps) {
  if (!items.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 text-xs text-slate-500 ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-slate-700">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-slate-700' : ''}>{item.label}</span>
            )}
            {!isLast && <ChevronRight className="h-3 w-3" />}
          </span>
        );
      })}
    </div>
  );
}
