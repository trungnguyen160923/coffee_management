export interface Discount {
    discountId: number;
    code: string;
    name: string;
    description?: string;
    discountType: 'PERCENT' | 'AMOUNT';
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount?: number;
    startDate: string;
    endDate: string;
    usageLimit: number;
    usedCount: number;
    branchId?: number;
    active: boolean;
    createAt: string;
    updateAt: string;
}

export interface CreateDiscountRequest {
    code: string;
    name: string;
    description?: string;
    discountType: 'PERCENT' | 'AMOUNT';
    discountValue: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    startDate: string;
    endDate: string;
    usageLimit?: number;
    branchId?: number | null;
    active?: boolean;
}

export interface UpdateDiscountRequest {
    name?: string;
    description?: string;
    discountType?: 'PERCENT' | 'AMOUNT';
    discountValue?: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    startDate?: string;
    endDate?: string;
    usageLimit?: number;
    branchId?: number | null;
    clearBranch?: boolean;
    active?: boolean;
}

export interface ApplyDiscountRequest {
    discountCode: string;
    orderAmount: number;
    branchId: number;
}

export interface DiscountApplicationResponse {
    discountCode: string;
    discountName: string;
    discountType: string;
    discountValue: number;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    isValid: boolean;
    message: string;
}

export interface DiscountPageResponse {
    content: Discount[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}
