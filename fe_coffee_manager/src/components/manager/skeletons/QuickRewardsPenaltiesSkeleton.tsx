import React from 'react';

export default function QuickRewardsPenaltiesSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 animate-pulse">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full"></div>
            <div>
              <div className="h-6 bg-white/20 rounded w-48 mb-2"></div>
              <div className="h-4 bg-white/20 rounded w-64"></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 bg-white/20 rounded-lg w-24"></div>
            <div className="h-9 bg-white/20 rounded-lg w-28"></div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex items-center gap-3 mb-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-10 bg-white rounded-lg w-24 border border-gray-200"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Selection Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 bg-gray-200 rounded w-24"></div>
              <div className="h-7 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="space-y-3">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg">
                  <div className="w-4 h-4 bg-gray-200 rounded mt-1"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-40"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-40"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                    <div className="h-5 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-5 bg-gray-200 rounded w-40 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>
                  <div className="h-6 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






