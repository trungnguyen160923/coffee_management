import React from 'react';

export default function BranchScheduleSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Week Navigation Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 bg-slate-200 rounded"></div>
            <div className="h-5 bg-slate-200 rounded w-48"></div>
          </div>
          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
        </div>
      </div>

      {/* Schedule Calendar Skeleton */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-slate-200">
          {/* Day Headers */}
          {[...Array(7)].map((_, idx) => (
            <div
              key={idx}
              className="p-3 text-center bg-slate-50"
            >
              <div className="h-3 bg-slate-200 rounded w-12 mx-auto mb-2"></div>
              <div className="h-5 bg-slate-300 rounded w-8 mx-auto"></div>
            </div>
          ))}

          {/* Day Content - 7 days */}
          {[...Array(7)].map((_, dayIdx) => (
            <div
              key={dayIdx}
              className="bg-white min-h-[200px] p-2"
            >
              {/* Time Slot Groups - 2-3 groups per day */}
              <div className="space-y-2">
                {[...Array(Math.floor(Math.random() * 2) + 2)].map((_, slotIdx) => (
                  <div
                    key={slotIdx}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    {/* Time Header */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-3.5 h-3.5 bg-slate-200 rounded"></div>
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                    </div>
                    
                    {/* Staff Items - 2-4 items per time slot */}
                    <div className="space-y-1">
                      {[...Array(Math.floor(Math.random() * 3) + 2)].map((_, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-center justify-between gap-1.5"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <div className="w-3 h-3 bg-slate-200 rounded"></div>
                            <div className="h-3 bg-slate-200 rounded w-24"></div>
                          </div>
                          <div className="w-3.5 h-3.5 bg-slate-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Skeleton */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="h-3 bg-slate-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-slate-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

