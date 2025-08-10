/**
 * MatchFilter Component
 * Provides filtering capabilities for match listing as per User Story 3
 * Includes bet range, AI rating, nen type, and other filters
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FunnelIcon, 
  XMarkIcon, 
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { MatchFilters, MatchFilterProps } from '@/types/match';

const NEN_TYPES = [
  { value: 'enhancement', label: 'Enhancement', color: 'red' },
  { value: 'emission', label: 'Emission', color: 'cyan' },
  { value: 'transmutation', label: 'Transmutation', color: 'yellow' },
  { value: 'conjuration', label: 'Conjuration', color: 'purple' },
  { value: 'manipulation', label: 'Manipulation', color: 'green' },
  { value: 'specialization', label: 'Specialization', color: 'pink' },
];

const MATCH_STATUSES = [
  { value: 'upcoming', label: 'Upcoming', color: 'yellow' },
  { value: 'live', label: 'Live', color: 'red' },
  { value: 'completed', label: 'Completed', color: 'gray' },
];

const SORT_OPTIONS = [
  { value: 'startTime', label: 'Start Time' },
  { value: 'totalPool', label: 'Prize Pool' },
  { value: 'rating', label: 'AI Rating' },
  { value: 'viewerCount', label: 'Popularity' },
  { value: 'created', label: 'Recently Added' },
];

const TIME_CONTROLS = [
  { value: '5+3', label: '5+3 (Blitz)' },
  { value: '10+5', label: '10+5 (Rapid)' },
  { value: '15+10', label: '15+10 (Standard)' },
  { value: '30+0', label: '30+0 (Classical)' },
];

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  children, 
  isExpanded = true, 
  onToggle 
}) => (
  <div className="border border-gray-700 rounded-lg bg-cyber-darker/50">
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors"
    >
      <span className="font-cyber text-sm uppercase tracking-wider text-gray-300">
        {title}
      </span>
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </motion.div>
    </button>
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 space-y-3">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  unit?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatValue = (val) => val.toString(),
  unit = '',
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleMinChange = (newMin: number) => {
    const newValue: [number, number] = [Math.min(newMin, localValue[1]), localValue[1]];
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleMaxChange = (newMax: number) => {
    const newValue: [number, number] = [localValue[0], Math.max(newMax, localValue[0])];
    setLocalValue(newValue);
    onChange(newValue);
  };

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-cyber text-gray-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 w-8">Min:</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={localValue[0]}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <span className="text-xs text-gray-300 w-16 text-right">
            {formatValue(localValue[0])}{unit}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 w-8">Max:</span>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={localValue[1]}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
          />
          <span className="text-xs text-gray-300 w-16 text-right">
            {formatValue(localValue[1])}{unit}
          </span>
        </div>
      </div>
    </div>
  );
};

export const MatchFilter: React.FC<MatchFilterProps> = ({
  filters,
  onFiltersChange,
  availableNenTypes = NEN_TYPES.map(t => t.value),
  availableTimeControls = TIME_CONTROLS.map(t => t.value),
  onReset,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Expand filters by default for User Story 3
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    status: true,
    betting: true, // Show bet range filter by default for User Story 3
    rating: true,  // Show AI rating filter by default for User Story 3
    types: true,   // Expand nen types for User Story 3
    sorting: false,
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    onFiltersChange({ search: search || undefined });
  }, [onFiltersChange]);

  const handleStatusChange = useCallback((status: string, checked: boolean) => {
    const currentStatuses = filters.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status as any]
      : currentStatuses.filter(s => s !== status);
    
    onFiltersChange({ 
      status: newStatuses.length > 0 ? newStatuses : undefined 
    });
  }, [filters.status, onFiltersChange]);

  const handleNenTypeChange = useCallback((nenType: string, checked: boolean) => {
    const currentTypes = filters.nenTypes || [];
    const newTypes = checked
      ? [...currentTypes, nenType]
      : currentTypes.filter(t => t !== nenType);
    
    onFiltersChange({ 
      nenTypes: newTypes.length > 0 ? newTypes : undefined 
    });
  }, [filters.nenTypes, onFiltersChange]);

  const handleBetRangeChange = useCallback((range: [number, number]) => {
    onFiltersChange({
      minBetRange: range[0] > 0 ? range[0] : undefined,
      maxBetRange: range[1] < 1000 ? range[1] : undefined,
    });
  }, [onFiltersChange]);

  const handleRatingRangeChange = useCallback((range: [number, number]) => {
    onFiltersChange({
      minAiRating: range[0] > 1000 ? range[0] : undefined,
      maxAiRating: range[1] < 3000 ? range[1] : undefined,
    });
  }, [onFiltersChange]);

  const handleSortChange = useCallback((sortBy: string, sortOrder: string) => {
    onFiltersChange({ 
      sortBy: sortBy as any, 
      sortOrder: sortOrder as any 
    });
  }, [onFiltersChange]);

  const handleReset = useCallback(() => {
    onReset?.();
  }, [onReset]);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.status?.length) count++;
    if (filters.nenTypes?.length) count++;
    if (filters.minBetRange !== undefined || filters.maxBetRange !== undefined) count++;
    if (filters.minAiRating !== undefined || filters.maxAiRating !== undefined) count++;
    return count;
  }, [filters]);

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 px-4 py-2 bg-cyber-darker border border-solana-purple rounded-lg hover:bg-gray-800 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-testid="match-filters-toggle"
        >
          <FunnelIcon className="w-5 h-5 text-solana-purple" />
          <span className="font-cyber text-sm text-gray-300">
            Filter by Bet Range or AI Rating
          </span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-solana-purple text-xs font-bold text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.div>
        </motion.button>

        {activeFilterCount > 0 && (
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 text-xs text-gray-400 hover:text-gray-300 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 p-4 bg-cyber-darker/30 border border-gray-700 rounded-lg">
              
              {/* Filter description removed per UI cleanup */}
              
              {/* Search */}
              <FilterSection
                title="Search"
                isExpanded={expandedSections.search}
                onToggle={() => toggleSection('search')}
              >
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search agent names..."
                    value={filters.search || ''}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-500 focus:outline-none focus:border-solana-purple focus:ring-1 focus:ring-solana-purple"
                  />
                </div>
              </FilterSection>

              {/* Match Status */}
              <FilterSection
                title="Match Status"
                isExpanded={expandedSections.status}
                onToggle={() => toggleSection('status')}
              >
                <div className="grid grid-cols-1 gap-2">
                  {MATCH_STATUSES.map((status) => (
                    <label key={status.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.status?.includes(status.value as any) || false}
                        onChange={(e) => handleStatusChange(status.value, e.target.checked)}
                        className="form-checkbox h-4 w-4 text-solana-purple bg-gray-800 border-gray-600 rounded focus:ring-solana-purple focus:ring-2"
                      />
                      <span className={`text-sm text-${status.color}-400`}>
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Betting Range */}
              <FilterSection
                title="Bet Range (SOL)"
                isExpanded={expandedSections.betting}
                onToggle={() => toggleSection('betting')}
              >
                <div data-testid="bet-range-filter">
                  <RangeSlider
                    label="Prize Pool Range"
                    min={0}
                    max={1000}
                    step={10}
                    value={[
                      filters.minBetRange || 0,
                      filters.maxBetRange || 1000
                    ]}
                    onChange={handleBetRangeChange}
                    formatValue={(val) => val === 1000 ? '1000+' : val.toString()}
                    unit=" SOL"
                  />
                </div>
              </FilterSection>

              {/* AI Rating Range */}
              <FilterSection
                title="AI Rating"
                isExpanded={expandedSections.rating}
                onToggle={() => toggleSection('rating')}
              >
                <div data-testid="ai-rating-filter">
                  <RangeSlider
                    label="ELO Rating Range"
                    min={1000}
                    max={3000}
                    step={50}
                    value={[
                      filters.minAiRating || 1000,
                      filters.maxAiRating || 3000
                    ]}
                    onChange={handleRatingRangeChange}
                    formatValue={(val) => val === 3000 ? '3000+' : val.toString()}
                  />
                </div>
              </FilterSection>

              {/* Nen Types */}
              <FilterSection
                title="Nen Types"
                isExpanded={expandedSections.types}
                onToggle={() => toggleSection('types')}
              >
                <div className="grid grid-cols-2 gap-2">
                  {NEN_TYPES.filter(type => availableNenTypes.includes(type.value)).map((nenType) => (
                    <label key={nenType.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.nenTypes?.includes(nenType.value) || false}
                        onChange={(e) => handleNenTypeChange(nenType.value, e.target.checked)}
                        className="form-checkbox h-4 w-4 text-solana-purple bg-gray-800 border-gray-600 rounded focus:ring-solana-purple focus:ring-2"
                      />
                      <span className={`text-sm nen-${nenType.value}`}>
                        {nenType.label}
                      </span>
                    </label>
                  ))}
                </div>
              </FilterSection>

              {/* Sorting */}
              <FilterSection
                title="Sort By"
                isExpanded={expandedSections.sorting}
                onToggle={() => toggleSection('sorting')}
              >
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-cyber text-gray-400 uppercase tracking-wider mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy || 'startTime'}
                      onChange={(e) => handleSortChange(e.target.value, filters.sortOrder || 'desc')}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-solana-purple focus:ring-1 focus:ring-solana-purple"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-cyber text-gray-400 uppercase tracking-wider mb-2">
                      Order
                    </label>
                    <select
                      value={filters.sortOrder || 'desc'}
                      onChange={(e) => handleSortChange(filters.sortBy || 'startTime', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 focus:outline-none focus:border-solana-purple focus:ring-1 focus:ring-solana-purple"
                    >
                      <option value="desc">Descending</option>
                      <option value="asc">Ascending</option>
                    </select>
                  </div>
                </div>
              </FilterSection>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-solana-purple/20 border border-solana-purple/50 rounded-full text-xs">
              <span>Search: "{filters.search}"</span>
              <button
                onClick={() => handleSearchChange('')}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {filters.status?.map(status => (
            <div key={status} className="flex items-center space-x-1 px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-xs">
              <span>{status}</span>
              <button
                onClick={() => handleStatusChange(status, false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}

          {filters.nenTypes?.map(nenType => (
            <div key={nenType} className="flex items-center space-x-1 px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-xs">
              <span>{nenType}</span>
              <button
                onClick={() => handleNenTypeChange(nenType, false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
