import React from 'react';

export default function ShiftRegistrationSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-96"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 bg-slate-200 rounded-lg w-24"></div>
            <div className="h-9 bg-slate-200 rounded-lg w-28"></div>
          </div>
        </div>

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

        {/* Calendar Grid Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {/* Day Headers */}
            {[...Array(7)].map((_, idx) => (
              <div key={idx} className="bg-slate-50 p-3 text-center">
                <div className="h-3 bg-slate-200 rounded w-12 mx-auto mb-2"></div>
                <div className="h-5 bg-slate-300 rounded w-8 mx-auto"></div>
              </div>
            ))}

            {/* Day Content - 7 days */}
            {[...Array(7)].map((_, dayIdx) => (
              <div key={dayIdx} className="bg-white min-h-[200px] p-2">
                {/* Shift Cards Skeleton - 2-3 cards per day */}
                <div className="space-y-2">
                  {[...Array(Math.floor(Math.random() * 2) + 2)].map((_, shiftIdx) => (
                    <div
                      key={shiftIdx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 min-h-[140px] flex flex-col"
                    >
                      {/* Time and Duration */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-3.5 h-3.5 bg-slate-200 rounded"></div>
                        <div className="h-4 bg-slate-200 rounded w-20"></div>
                      </div>
                      <div className="h-3 bg-slate-200 rounded w-16 mb-2"></div>

                      {/* Info Lines */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-slate-200 rounded"></div>
                          <div className="h-3 bg-slate-200 rounded w-32"></div>
                        </div>
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                        <div className="h-3 bg-slate-200 rounded w-28"></div>
                      </div>

                      {/* Button Skeleton */}
                      <div className="mt-auto pt-2">
                        <div className="h-7 bg-slate-200 rounded-md w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box Skeleton */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-blue-200 rounded w-24"></div>
              <div className="space-y-1">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="h-3 bg-blue-200 rounded w-full"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

