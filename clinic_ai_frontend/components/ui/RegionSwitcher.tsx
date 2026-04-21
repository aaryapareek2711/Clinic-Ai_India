'use client';

import { useState, useRef, useEffect } from 'react';
import { useRegion, REGIONS, RegionCode } from '@/contexts/RegionContext';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegionSwitcherProps {
  /**
   * Visual variant
   */
  variant?: 'default' | 'compact' | 'minimal';
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Show the region name or just flag
   */
  showName?: boolean;
  /**
   * Dropdown alignment
   */
  align?: 'left' | 'right';
}

const regionList = Object.values(REGIONS);

export function RegionSwitcher({
  variant = 'default',
  className,
  showName = true,
  align = 'right',
}: RegionSwitcherProps) {
  const { region, regionConfig, setRegion, isLoading } = useRegion();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleRegionChange = (newRegion: RegionCode) => {
    setRegion(newRegion);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-slate-200 rounded h-8 w-24', className)} />
    );
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors',
          variant === 'default' && 'px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700',
          variant === 'compact' && 'px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm',
          variant === 'minimal' && 'px-2 py-1 hover:bg-slate-100 text-slate-600 text-sm',
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select region"
      >
        <span className="text-lg" role="img" aria-label={regionConfig.name}>
          {regionConfig.flag}
        </span>
        {showName && (
          <span className={cn(
            'font-medium',
            variant === 'minimal' && 'hidden sm:inline'
          )}>
            {regionConfig.name}
          </span>
        )}
        <ChevronDown className={cn(
          'w-4 h-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 min-w-[200px]',
            align === 'right' && 'right-0',
            align === 'left' && 'left-0',
          )}
          role="listbox"
          aria-label="Available regions"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe className="w-3 h-3" />
              <span>Select your region</span>
            </div>
          </div>

          {regionList.map((r) => (
            <button
              key={r.code}
              onClick={() => handleRegionChange(r.code as RegionCode)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left',
                region === r.code && 'bg-forest-50'
              )}
              role="option"
              aria-selected={region === r.code}
            >
              <span className="text-xl" role="img" aria-label={r.name}>
                {r.flag}
              </span>
              <div className="flex-1">
                <div className="font-medium text-slate-900">{r.name}</div>
                <div className="text-xs text-slate-500">
                  {r.currency} ({r.currencySymbol})
                </div>
              </div>
              {region === r.code && (
                <Check className="w-4 h-4 text-forest-600" />
              )}
            </button>
          ))}

          <div className="px-3 py-2 border-t border-slate-100 mt-1">
            <p className="text-xs text-slate-400">
              Region affects compliance, currency, and data residency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline region indicator (non-interactive)
 * Shows current region with flag
 */
interface RegionIndicatorProps {
  className?: string;
  showCompliance?: boolean;
}

export function RegionIndicator({ className, showCompliance = false }: RegionIndicatorProps) {
  const { regionConfig, isLoading } = useRegion();

  if (isLoading) {
    return <div className={cn('animate-pulse bg-slate-200 rounded h-5 w-16', className)} />;
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-sm text-slate-600', className)}>
      <span role="img" aria-label={regionConfig.name}>
        {regionConfig.flag}
      </span>
      <span>{regionConfig.name}</span>
      {showCompliance && (
        <span className="text-slate-400">
          ({regionConfig.compliance.map(c => c.toUpperCase()).join(', ')})
        </span>
      )}
    </div>
  );
}

export default RegionSwitcher;
