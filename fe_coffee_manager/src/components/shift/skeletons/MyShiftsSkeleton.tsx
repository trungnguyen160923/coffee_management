import React from 'react';

export default function MyShiftsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-8 bg-slate-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-64"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 bg-slate-200 rounded-lg w-28"></div>
            <div className="h-9 bg-slate-200 rounded-lg w-24"></div>
          </div>
        </div>

        {/* Status Legend Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="h-4 bg-slate-200 rounded w-16"></div>
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-slate-200 rounded border-2"></div>
                <div className="h-3 bg-slate-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-6 inline-block">
          <div className="flex gap-2">
            <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
            <div className="h-10 bg-slate-200 rounded-lg w-36"></div>
          </div>
        </div>

        {/* Month Navigation Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
            <div className="flex items-center gap-4">
              <div className="w-5 h-5 bg-slate-200 rounded"></div>
              <div className="h-5 bg-slate-200 rounded w-40"></div>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
          </div>
        </div>

        {/* Calendar Grid Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {/* Day Headers - 7 days */}
            {[...Array(7)].map((_, idx) => (
              <div key={idx} className="p-2 text-center bg-slate-50">
                <div className="h-3 bg-slate-200 rounded w-12 mx-auto"></div>
              </div>
            ))}

            {/* Calendar Days - ~35 days (5 weeks) */}
            {[...Array(35)].map((_, dayIdx) => (
              <div key={dayIdx} className="min-h-[80px] p-1.5 bg-white">
                {/* Date number */}
                <div className="h-4 bg-slate-200 rounded w-6 mb-1"></div>
                
                {/* Assignment cards - random 0-2 per day */}
                {Math.random() > 0.4 && (
                  <div className="space-y-0.5">
                    {[...Array(Math.floor(Math.random() * 2) + 1)].map((_, cardIdx) => (
                      <div
                        key={cardIdx}
                        className="w-full p-0.5 rounded border border-slate-200 bg-slate-50"
                      >
                        <div className="flex items-center justify-between gap-0.5">
                          <div className="flex items-center gap-1 flex-1 min-w-0">
                            <div className="w-3.5 h-3.5 bg-slate-200 rounded"></div>
                            <div className="h-3 bg-slate-200 rounded w-16"></div>
                          </div>
                          <div className="w-3.5 h-3.5 bg-slate-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Statistics Skeleton */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="h-3 bg-slate-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-slate-300 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

