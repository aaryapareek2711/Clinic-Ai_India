'use client';

import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { TemplateFilters, TemplateCategory, AppointmentType } from '@/lib/types/templates';

interface FilterBarProps {
  filters: TemplateFilters;
  onFiltersChange: (filters: TemplateFilters) => void;
}

export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const categories: (TemplateCategory | 'All')[] = [
    'All',
    'General',
    'Cardiology',
    'Pediatrics',
    'Dermatology',
    'Mental Health',
    'Orthopedics',
    'Other'
  ];

  const appointmentTypes: (AppointmentType | 'All')[] = [
    'All',
    'Follow-up',
    'Annual Physical',
    'New Patient',
    'Acute Visit',
    'Chronic Care',
    'Preventive'
  ];

  const sortOptions: Array<{ value: TemplateFilters['sortBy']; label: string }> = [
    { value: 'recent', label: 'Recently Used' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'name', label: 'Name (A-Z)' }
  ];

  return (
    <div className="sticky top-20 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Main Search and Sort */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
            />
          </div>

          {/* Sort Dropdown */}
          <select
            value={filters.sortBy}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                sortBy: e.target.value as TemplateFilters['sortBy']
              })
            }
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
              showAdvanced
                ? 'bg-forest-50 border-forest-300 text-forest-700'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-200 animate-fade-in">
            {/* Category Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    category: e.target.value as TemplateCategory | 'All'
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Appointment Type Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Appointment Type
              </label>
              <select
                value={filters.appointmentType}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    appointmentType: e.target.value as AppointmentType | 'All'
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent bg-white"
              >
                {appointmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                onClick={() =>
                  onFiltersChange({
                    search: '',
                    category: 'All',
                    appointmentType: 'All',
                    sortBy: 'recent'
                  })
                }
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
