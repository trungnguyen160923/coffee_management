import React from 'react';

export default function SingleBranchDaySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Branch Info Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-64"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded-lg w-32"></div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-7 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Main Content - Collapsible Sections */}
      <div className="space-y-4">
        {/* 1. SẢN PHẨM BÁN CHẠY */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="space-y-2">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                </div>
              ))}
            </div>
            {/* Products by Category */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="h-4 bg-gray-200 rounded w-40 mb-3"></div>
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-5 bg-gray-300 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. TỒN KHO */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-36"></div>
              <div className="h-5 bg-gray-200 rounded-full w-6"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="p-4 rounded-lg border-l-4 bg-gray-50 border-gray-300">
                  <div className="flex items-start justify-between mb-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-100 rounded w-32"></div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div className="h-1.5 bg-gray-300 rounded-full w-1/3"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. PHẢN HỒI KHÁCH HÀNG */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="p-4 pt-0 border-t border-gray-100">
            {/* Review Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx}>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-6 bg-gray-300 rounded w-16"></div>
                  </div>
                ))}
              </div>
              {/* Review Distribution */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="h-3 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      <div className="flex justify-center gap-0.5 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-3 h-3 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-8 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Recent Reviews */}
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-4 h-4 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. KHÁCH HÀNG */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-40"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="space-y-2">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. NGUYÊN LIỆU & CHI PHÍ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="w-full flex items-center justify-between p-4 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
          </div>
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="space-y-4">
              {/* Top Ingredients by Value */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="h-4 bg-gray-200 rounded w-48 mb-3"></div>
                <div className="space-y-2">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-200">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                        <div className="h-3 bg-gray-100 rounded w-24"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Cost Ingredients */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="h-4 bg-gray-200 rounded w-48 mb-3"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-200">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="h-1.5 bg-gray-300 rounded-full w-1/2"></div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-gray-100 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue by Payment Method */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="h-4 bg-gray-200 rounded w-56 mb-3"></div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-200">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="h-1.5 bg-gray-300 rounded-full w-2/3"></div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                        <div className="h-3 bg-gray-100 rounded w-12"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

