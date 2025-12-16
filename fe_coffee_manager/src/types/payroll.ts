// ========== Enums ==========

export type PayrollStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PAID';

export type BonusType = 'PERFORMANCE' | 'ATTENDANCE' | 'SPECIAL' | 'HOLIDAY' | 'OTHER';
export type BonusStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PenaltyType = 'NO_SHOW' | 'LATE' | 'EARLY_LEAVE' | 'MISTAKE' | 'VIOLATION' | 'OTHER';
export type PenaltyStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AllowanceType = 'TRANSPORT' | 'MEAL' | 'PHONE' | 'HOUSING' | 'OTHER';
export type AllowanceStatus = 'ACTIVE' | 'INACTIVE';

// ========== Payroll Types ==========

export interface Payroll {
  payrollId: number;
  userId: number;
  userRole: string;
  branchId: number;
  period: string; // Format: YYYY-MM
  userName?: string;
  branchName?: string;
  baseSalary: number;
  baseSalarySnapshot: number;
  hourlyRateSnapshot: number;
  insuranceSalarySnapshot: number;
  overtimeHours: number;
  overtimePay: number;
  totalAllowances: number;
  totalBonuses: number;
  totalPenalties: number;
  grossSalary: number;
  amountInsurances: number;
  amountTax: number;
  amountAdvances: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  createdBy: number;
  approvedBy: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createAt: string;
  updateAt: string;
}

export interface PayrollCalculationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  notes?: string;
}

export interface BatchCalculateRequest {
  userIds: number[];
  period: string; // Format: YYYY-MM
}

export interface BatchApproveRequest {
  payrollIds: number[];
}

export interface PayrollFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: PayrollStatus;
}

// ========== Bonus Types ==========

export interface Bonus {
  bonusId: number;
  userId: number;
  branchId: number;
  period: string; // Format: YYYY-MM
  bonusType: BonusType;
  amount: number;
  description: string;
  status: BonusStatus;
  sourceTemplateId: number | null;
  shiftId?: number | null;
  createdBy: number;
  approvedBy: number | null;
  rejectedBy: number | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createAt: string;
  updateAt: string;
}

export interface BonusCreationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  bonusType: BonusType;
  amount: number;
  description: string;
  shiftId?: number | null;
}

export interface BonusApplyTemplateRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  templateId: number;
  overrideAmount?: number;
  overrideDescription?: string;
}

export interface BonusFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: BonusStatus;
}

// ========== Penalty Types ==========

export interface Penalty {
  penaltyId: number;
  userId: number;
  branchId: number;
  period: string; // Format: YYYY-MM
  penaltyType: PenaltyType;
  amount: number;
  description: string;
  status: PenaltyStatus;
  sourceTemplateId: number | null;
  incidentDate?: string | null; // Format: YYYY-MM-DD
  shiftId?: number | null; // Tham chiếu đến shift
  reasonCode?: string | null; // Mã lý do
  createdBy: number;
  approvedBy: number | null;
  rejectedBy: number | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createAt: string;
  updateAt: string;
}

export interface PenaltyCreationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  penaltyType: PenaltyType;
  amount: number;
  description: string;
  incidentDate?: string | null; // Format: YYYY-MM-DD
  shiftId?: number | null; // Tham chiếu đến shift
  reasonCode?: string | null; // Mã lý do
}

export interface PenaltyApplyTemplateRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  templateId: number;
  overrideAmount?: number;
  overrideDescription?: string;
}

export interface PenaltyFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: PenaltyStatus;
}

// ========== Allowance Types ==========

export interface Allowance {
  allowanceId: number;
  userId: number;
  branchId: number;
  period: string; // Format: YYYY-MM
  allowanceType: AllowanceType;
  amount: number;
  description: string;
  status: AllowanceStatus;
  sourceTemplateId: number | null;
  createdBy: number;
  createAt: string;
  updateAt: string;
}

export interface AllowanceCreationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  allowanceType: AllowanceType;
  amount: number;
  description: string;
}

export interface AllowanceApplyTemplateRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  templateId: number;
  overrideAmount?: number;
  overrideDescription?: string;
}

export interface AllowanceFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: AllowanceStatus;
}

// ========== Template Types ==========

export interface AllowanceTemplate {
  templateId: number;
  branchId: number | null; // NULL = SYSTEM scope
  name: string;
  allowanceType: AllowanceType;
  amount: number;
  description: string;
  isActive: boolean;
  createdBy: number;
  createAt: string;
  updateAt: string;
  usageCount?: number; // Số lần template đã được sử dụng (optional)
}

export interface BonusTemplate {
  templateId: number;
  branchId: number | null; // NULL = SYSTEM scope
  name: string;
  bonusType: BonusType;
  amount: number;
  description: string;
  isActive: boolean;
  createdBy: number;
  createAt: string;
  updateAt: string;
  usageCount?: number; // Số lần template đã được sử dụng (optional)
}

export interface PenaltyConfig {
  configId: number;
  branchId: number | null; // NULL = SYSTEM scope
  name: string;
  penaltyType: PenaltyType;
  amount: number;
  description: string;
  isActive: boolean;
  createdBy: number;
  createAt: string;
  updateAt: string;
  usageCount?: number; // Số lần config đã được sử dụng (optional)
}

export interface AllowanceTemplateCreationRequest {
  branchId?: number | null; // NULL = SYSTEM scope
  name: string;
  allowanceType: AllowanceType;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface AllowanceTemplateUpdateRequest {
  name?: string;
  allowanceType?: AllowanceType;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

export interface BonusTemplateCreationRequest {
  branchId?: number | null; // NULL = SYSTEM scope
  name: string;
  bonusType: BonusType;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface BonusTemplateUpdateRequest {
  name?: string;
  bonusType?: BonusType;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

export interface PenaltyConfigCreationRequest {
  branchId?: number | null; // NULL = SYSTEM scope
  name: string;
  penaltyType: PenaltyType;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface PenaltyConfigUpdateRequest {
  name?: string;
  penaltyType?: PenaltyType;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

export interface TemplateFilters {
  branchId?: number;
  isActive?: boolean;
}

// ========== Helper Types ==========

export type PayrollResponse = Payroll;
export type BonusResponse = Bonus;
export type PenaltyResponse = Penalty;
export type AllowanceResponse = Allowance;
export type PayrollTemplate = AllowanceTemplate | BonusTemplate | PenaltyConfig;

