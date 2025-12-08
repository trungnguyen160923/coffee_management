import React from 'react';

export default function POSSkeleton() {
  return (
    <div className="h-screen bg-gray-50 flex animate-pulse">
      {/* Left Panel Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="h-9 bg-slate-200 rounded-lg w-20"></div>
              <div className="h-7 bg-slate-200 rounded w-48"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-slate-200 rounded-full"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="flex space-x-2 mb-4">
            <div className="h-10 bg-slate-200 rounded-lg w-32"></div>
            <div className="h-10 bg-slate-200 rounded-lg w-40"></div>
          </div>

          {/* Search and Filters Skeleton */}
          <div className="flex space-x-4">
            <div className="h-10 bg-slate-200 rounded-lg flex-1"></div>
            <div className="h-10 bg-slate-200 rounded-lg w-48"></div>
          </div>
        </div>

        {/* Content Area Skeleton */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(12)].map((_, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="aspect-square bg-slate-200 rounded-t-xl"></div>
                <div className="p-3">
                  <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Cart Skeleton */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        {/* Cart Header Skeleton */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <div className="h-5 w-5 bg-slate-200 rounded"></div>
            <div className="h-5 bg-slate-200 rounded w-32"></div>
            <div className="h-5 w-5 bg-slate-200 rounded-full"></div>
          </div>
        </div>

        {/* Cart Items Skeleton */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-3">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-slate-200 rounded w-20"></div>
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checkout Skeleton */}
        <div className="border-t border-gray-200 p-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-slate-200 rounded w-20"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </div>
            <div className="h-12 bg-slate-200 rounded-lg w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

