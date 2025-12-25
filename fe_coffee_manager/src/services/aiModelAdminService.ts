import { apiClient } from '../config/api';

export type ForecastAlgorithm = 'PROPHET';
export type ForecastTargetMetric = 'order_count' | 'total_revenue' | 'customer_count' | 'avg_order_value';

export interface ModelStatusResponse {
  success: boolean;
  branch_id: number;
  iforest_model?: any | null;
  forecast_model?: any | null;
}

export interface RetrainModelsRequest {
  branch_id: number;
  train_iforest?: boolean;
  train_forecast?: boolean;
  algorithm?: ForecastAlgorithm;
  target_metric?: ForecastTargetMetric;
  iforest_params?: {
    n_estimators?: number;
    contamination?: number;
    enable_tuning?: boolean;
  };
  forecast_params?: {
    seasonality_mode?: 'additive' | 'multiplicative';
    yearly_seasonality?: boolean;
    weekly_seasonality?: boolean;
    daily_seasonality?: boolean;
    use_external_regressors?: boolean;
    enable_tuning?: boolean;
  };
}

export interface RetrainModelsResponse {
  success: boolean;
  result?: any;
  message?: string;
  raw?: any;
}

export interface TestForecastRequest {
  branch_id: number;
  algorithm?: ForecastAlgorithm;
  target_metric?: ForecastTargetMetric;
  test_days?: number;
}

export interface TestIForestRequest {
  branch_id: number;
  test_days?: number;
}

export type ModelKind = 'iforest' | 'forecast';

export interface ModelHistoryResponse {
  success: boolean;
  branch_id: number;
  model_name: string;
  total: number;
  items: any[];
  best_model_id?: number | null;
}

export interface ModelByIdResponse {
  success: boolean;
  model: any;
}

export interface TrainingDefaultsResponse {
  success: boolean;
  iforest: {
    training_days: number;
    min_training_samples: number;
    n_estimators: number;
    contamination: number;
    enable_tuning: boolean;
    min_validation_separation: number;
  };
  forecast: {
    training_days: number;
    min_training_samples: number;
    algorithm: ForecastAlgorithm;
    target_metric: ForecastTargetMetric;
    seasonality_mode: 'additive' | 'multiplicative';
    yearly_seasonality: boolean;
    weekly_seasonality: boolean;
    daily_seasonality: boolean;
    use_external_regressors: boolean;
    enable_tuning: boolean;
    quality_gate: {
      min_test_samples: number;
      max_mape_percent: number;
      max_mae: number;
    };
  };
}

export const aiModelAdminService = {
  async getDefaults() {
    return await apiClient.get<TrainingDefaultsResponse>(`/api/ai/admin/models/defaults`);
  },

  async newMethodAvailableBranches() {
    return await apiClient.get<any>(`/api/ai/admin/models/new-method/available-branches`);
  },

  async newMethodTrainIForestAllGroups(args: { branchId: number; groups?: string; commit?: boolean; createdBy?: string }) {
    const params = new URLSearchParams({
      branch_id: String(args.branchId),
      groups: args.groups ?? 'a,b,c,d',
      commit: String(args.commit ?? false),
      created_by: args.createdBy ?? 'admin',
    });
    return await apiClient.post<any>(`/api/ai/admin/models/new-method/iforest/train-all-groups?${params.toString()}`, {});
  },

  async newMethodTrainProphetAllVariants(args: {
    branchId: number;
    target?: ForecastTargetMetric;
    commit?: boolean;
    createdBy?: string;
    horizon?: number;
    futurePeriods?: number;
    intervalWidth?: number;
    intervalWidthGrid?: string;
    minCoverage?: number;
    coverageWeight?: number;
  }) {
    const params = new URLSearchParams({
      branch_id: String(args.branchId),
      target: args.target ?? 'order_count',
      commit: String(args.commit ?? false),
      created_by: args.createdBy ?? 'admin',
      horizon: String(args.horizon ?? 30),
      future_periods: String(args.futurePeriods ?? 30),
      interval_width: String(args.intervalWidth ?? 0.8),
      interval_width_grid: String(args.intervalWidthGrid ?? ''),
      min_coverage: String(args.minCoverage ?? 0),
      coverage_weight: String(args.coverageWeight ?? 2),
    });
    return await apiClient.post<any>(`/api/ai/admin/models/new-method/forecast/train-all-variants?${params.toString()}`, {});
  },

  async predictByDate(args: {
    branchId: number;
    date: string; // YYYY-MM-DD (or DD/MM/YYYY accepted by BE)
    forecastDays?: number;
    targetMetric?: ForecastTargetMetric;
  }) {
    const params = new URLSearchParams({
      branch_id: String(args.branchId),
      date: args.date,
      forecast_days: String(args.forecastDays ?? 7),
      target_metric: args.targetMetric ?? 'order_count',
      algorithm: 'PROPHET',
    });
    return await apiClient.post<any>(`/api/ai/admin/models/predict/by-date?${params.toString()}`, {});
  },

  async getStatus(branchId: number, algorithm: ForecastAlgorithm = 'PROPHET', targetMetric: ForecastTargetMetric = 'order_count') {
    const params = new URLSearchParams({
      branch_id: String(branchId),
      algorithm,
      target_metric: targetMetric,
    });
    return await apiClient.get<ModelStatusResponse>(`/api/ai/admin/models/status?${params.toString()}`);
  },

  async getHistory(args: {
    branchId: number;
    kind: ModelKind;
    algorithm?: ForecastAlgorithm;
    targetMetric?: ForecastTargetMetric;
    includeInactive?: boolean;
    limit?: number;
    sortBy?: 'best' | 'trained_at';
  }) {
    const params = new URLSearchParams({
      branch_id: String(args.branchId),
      kind: args.kind,
      algorithm: args.algorithm || 'PROPHET',
      target_metric: args.targetMetric || 'order_count',
      include_inactive: String(args.includeInactive ?? true),
      limit: String(args.limit ?? 10),
      sort_by: args.sortBy || 'best',
    });
    return await apiClient.get<ModelHistoryResponse>(`/api/ai/admin/models/history?${params.toString()}`);
  },

  async getById(modelId: number) {
    const params = new URLSearchParams({ model_id: String(modelId) });
    return await apiClient.get<ModelByIdResponse>(`/api/ai/admin/models/by-id?${params.toString()}`);
  },

  async iforestAblation(args: { branchId: number; days?: number; n_estimators?: number; contamination?: number }) {
    const params = new URLSearchParams({
      branch_id: String(args.branchId),
      days: String(args.days ?? 180),
      n_estimators: String(args.n_estimators ?? 200),
      contamination: String(args.contamination ?? 0.1),
    });
    return await apiClient.get<any>(`/api/ai/admin/models/iforest/ablation?${params.toString()}`);
  },

  async retrain(req: RetrainModelsRequest) {
    return await apiClient.post<RetrainModelsResponse>(`/api/ai/admin/models/retrain`, req);
  },

  async testForecast(req: TestForecastRequest) {
    return await apiClient.post<any>(`/api/ai/admin/models/test/forecast`, req);
  },

  async testIForest(req: TestIForestRequest) {
    return await apiClient.post<any>(`/api/ai/admin/models/test/iforest`, req);
  },
};

export default aiModelAdminService;


