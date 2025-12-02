import React from 'react';

export default function DayTabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Alerts Skeleton (optional - might not show) */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-lg border-l-4 bg-yellow-50 border-yellow-500">
          <div className="w-5 h-5 bg-yellow-200 rounded flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-yellow-200 rounded w-48 mb-1"></div>
            <div className="h-3 bg-yellow-100 rounded w-64"></div>
          </div>
          <div className="w-8 h-6 bg-yellow-200 rounded"></div>
        </div>
      </div>

      {/* Key Metrics Skeleton - Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
            <div className="h-2 bg-gray-100 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* Key Metrics Skeleton - Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 bg-gray-200 rounded w-20"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16 mb-2"></div>
            <div className="h-2 bg-gray-100 rounded w-12"></div>
          </div>
        ))}
      </div>

      {/* 1. TỔNG QUAN & DỰ BÁO */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
              <div className="h-4 bg-gray-200 rounded w-48 mb-3"></div>
              <div className="h-[200px] bg-gray-100 rounded-lg"></div>
              {/* Order Status Summary */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                </div>
                <div className="bg-gray-50 p-2 rounded border border-gray-200">
                  <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-4 bg-gray-300 rounded w-12"></div>
                </div>
              </div>
            </div>
            {/* Forecast Summary */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                  <div className="h-6 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="pt-2 border-t border-green-200">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PHÂN TÍCH BẤT THƯỜNG & DỰ ĐOÁN TƯƠNG LAI */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="space-y-4">
            {/* Anomaly Detection Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-56"></div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-40"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-3 bg-gray-100 rounded w-32"></div>
              </div>
            </div>

            {/* Forecast Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              {/* Forecast Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <div className="h-3 bg-gray-200 rounded w-28 mb-1"></div>
                  <div className="h-6 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-5 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <div className="h-3 bg-gray-200 rounded w-28 mb-1"></div>
                  <div className="h-5 bg-gray-300 rounded w-16"></div>
                </div>
              </div>
              {/* Forecast Chart */}
              <div className="h-[280px] bg-gray-100 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PHÂN TÍCH AI */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-56"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <ul className="space-y-2">
                {[...Array(3)].map((_, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded-full mt-0.5"></div>
                    <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
              <ul className="space-y-2">
                {[...Array(3)].map((_, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded-full mt-0.5"></div>
                    <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-4 bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="h-4 bg-gray-200 rounded w-40 mb-3"></div>
            <div className="space-y-2">
              {[...Array(2)].map((_, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                  <div className="h-5 w-16 bg-gray-200 rounded"></div>
                  <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. SẢN PHẨM BÁN CHẠY */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-2">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-48"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Products by Category */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="h-4 bg-gray-200 rounded w-48 mb-3"></div>
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
      </div>

      {/* 5. CẢNH BÁO TỒN KHO */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-36"></div>
            <div className="w-6 h-5 bg-gray-200 rounded-full"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="p-4 rounded-lg border-l-4 bg-gray-50 border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-3 bg-gray-100 rounded w-40"></div>
                  <div className="h-3 bg-gray-100 rounded w-36"></div>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 6. PHẢN HỒI KHÁCH HÀNG */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="space-y-4">
            {/* Review Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx}>
                    <div className="h-3 bg-gray-200 rounded w-24 mb-1"></div>
                    <div className="h-6 bg-gray-300 rounded w-12"></div>
                  </div>
                ))}
              </div>
              {/* Review Distribution */}
              <div className="pt-4 border-t border-gray-200">
                <div className="h-3 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="flex gap-2">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="flex-1 text-center">
                      <div className="flex justify-center gap-0.5 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="w-3 h-3 bg-gray-200 rounded"></div>
                        ))}
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-6 mx-auto"></div>
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
      </div>

      {/* 7. KHÁCH HÀNG HÀNG ĐẦU */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="w-full flex items-center justify-between p-4 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-40"></div>
          </div>
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
        </div>
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="space-y-2">
              {[...Array(5)].map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-48"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 8. NGUYÊN LIỆU & CHI PHÍ */}
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
              <div className="h-4 bg-gray-200 rounded w-56 mb-3"></div>
              <div className="space-y-2">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50">
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
              <div className="h-4 bg-gray-200 rounded w-52 mb-3"></div>
              <div className="space-y-2">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"></div>
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
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-56"></div>
              </div>
              <div className="space-y-2">
                {[...Array(3)].map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"></div>
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
  );
}
