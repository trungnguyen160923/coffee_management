import React from 'react';

export default function ProductModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-pulse">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header Skeleton */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-slate-200 rounded w-48"></div>
        </div>

        {/* Content Skeleton */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
              </div>
              <div>
                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-24 bg-slate-200 rounded-lg w-full"></div>
              </div>
              <div>
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                <div className="h-48 bg-slate-200 rounded-lg w-full"></div>
              </div>
              <div>
                <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                <div className="h-10 bg-slate-200 rounded-lg w-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
          <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
        </div>
      </div>
    </div>
  );
}

