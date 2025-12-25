import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, RefreshCw, FlaskConical } from 'lucide-react';
import ModalPortal from '../../components/common/ModalPortal';

import { branchService } from '../../services';
import aiModelAdminService, { ForecastTargetMetric } from '../../services/aiModelAdminService';

type BranchOption = { branchId: number; name: string };

// Forecast target metric is fixed to 'order_count' per UI requirement.

export default function AdminModelTraining() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);

  // UI requirement: forecast is fixed to order_count (no dropdown)
  const targetMetric: ForecastTargetMetric = 'order_count';
  // UI requirement: only one model can be selected at a time
  const [selectedModel, setSelectedModel] = useState<'iforest' | 'forecast'>('forecast');
  const [forecastTestDays, setForecastTestDays] = useState<number>(14);
  const [iforestTestDays, setIForestTestDays] = useState<number>(30);

  // Defaults + optional hyperparameter inputs (prefilled from BE /defaults)
  const [defaults, setDefaults] = useState<any>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(false);

  const [iforestEnableTuning, setIForestEnableTuning] = useState(true);
  const [iforestNEstimators, setIForestNEstimators] = useState<number>(200);
  const [iforestContamination, setIForestContamination] = useState<number>(0.1);

  const [forecastEnableTuning, setForecastEnableTuning] = useState(true);
  const [forecastSeasonalityMode, setForecastSeasonalityMode] = useState<'additive' | 'multiplicative'>(
    'multiplicative'
  );
  const [forecastYearly, setForecastYearly] = useState(true);
  const [forecastWeekly, setForecastWeekly] = useState(true);
  const [forecastDaily, setForecastDaily] = useState(false);
  const [forecastUseRegressors, setForecastUseRegressors] = useState(true);

  // IForest feature ablation (analysis-only)
  const [loadingAblation, setLoadingAblation] = useState(false);
  const [ablationResult, setAblationResult] = useState<any>(null);

  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [loadingRetrain, setLoadingRetrain] = useState(false);
  const [loadingForecastTest, setLoadingForecastTest] = useState(false);
  const [loadingIForestTest, setLoadingIForestTest] = useState(false);

  const [status, setStatus] = useState<any>(null);
  const [statusBefore, setStatusBefore] = useState<any>(null);
  const [statusAfter, setStatusAfter] = useState<any>(null);

  const [historyIForest, setHistoryIForest] = useState<any>(null);
  const [historyForecast, setHistoryForecast] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedOldIForestId, setSelectedOldIForestId] = useState<number | null>(null);
  const [selectedOldForecastId, setSelectedOldForecastId] = useState<number | null>(null);
  const [oldIForestModel, setOldIForestModel] = useState<any>(null);
  const [oldForecastModel, setOldForecastModel] = useState<any>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState<string>('');
  const [detailPayload, setDetailPayload] = useState<any>(null);
  const [retrainResult, setRetrainResult] = useState<any>(null);
  const [forecastTestResult, setForecastTestResult] = useState<any>(null);
  const [iforestTestResult, setIForestTestResult] = useState<any>(null);

  const selectedBranch = useMemo(
    () => branches.find(b => b.branchId === branchId) || null,
    [branches, branchId]
  );

  useEffect(() => {
    const load = async () => {
      setLoadingBranches(true);
      try {
        const res = await branchService.getBranches({ status: 'active' });
        const opts = (res.branches || [])
          .map((b: any) => {
            const rawId = b?.branchId ?? b?.id ?? b?.branch_id;
            const parsedId =
              typeof rawId === 'number'
                ? rawId
                : typeof rawId === 'string'
                  ? Number.parseInt(rawId, 10)
                  : NaN;
            return {
              branchId: parsedId,
              name: b?.name || `Branch ${rawId ?? ''}`,
            };
          })
          .filter(b => Number.isFinite(b.branchId) && b.branchId > 0);
        setBranches(opts);
        if (opts.length > 0) setBranchId(opts[0].branchId);
      } catch (e: any) {
        toast.error(e?.message || 'Không tải được danh sách chi nhánh');
      } finally {
        setLoadingBranches(false);
      }
    };
    load();
  }, []);

  // Load defaults once (prefill hyperparameter form; non-blocking)
  useEffect(() => {
    (async () => {
      setLoadingDefaults(true);
      try {
        const d = await aiModelAdminService.getDefaults();
        setDefaults(d);
        if (d?.iforest) {
          setIForestEnableTuning(Boolean(d.iforest.enable_tuning));
          setIForestNEstimators(Number(d.iforest.n_estimators ?? 200));
          setIForestContamination(Number(d.iforest.contamination ?? 0.1));
        }
        if (d?.forecast) {
          setForecastEnableTuning(Boolean(d.forecast.enable_tuning));
          setForecastSeasonalityMode((d.forecast.seasonality_mode as any) || 'multiplicative');
          setForecastYearly(Boolean(d.forecast.yearly_seasonality));
          setForecastWeekly(Boolean(d.forecast.weekly_seasonality));
          setForecastDaily(Boolean(d.forecast.daily_seasonality));
          setForecastUseRegressors(Boolean(d.forecast.use_external_regressors));
        }
      } catch (e) {
        // Keep local defaults
        console.error(e);
      } finally {
        setLoadingDefaults(false);
      }
    })();
  }, []);

  const requireBranch = () => {
    if (!branchId) {
      toast.error('Vui lòng chọn chi nhánh');
      return false;
    }
    return true;
  };

  const onLoadStatus = async () => {
    if (!requireBranch()) return;
    setLoadingStatus(true);
    try {
      const res = await aiModelAdminService.getStatus(branchId!, 'PROPHET', targetMetric);
      setStatus(res);
      setStatusAfter(res);
      toast.success('Đã tải trạng thái model');
    } catch (e: any) {
      toast.error(e?.message || 'Không tải được trạng thái model');
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadHistory = async () => {
    if (!branchId) return;
    setLoadingHistory(true);
    try {
      if (selectedModel === 'iforest') {
        const hIf = await aiModelAdminService.getHistory({
          branchId,
          kind: 'iforest',
          includeInactive: true,
          limit: 20,
          sortBy: 'best',
        });
        setHistoryIForest(hIf);
        const activeIfId = statusAfter?.iforest_model?.id ?? status?.iforest_model?.id;
        const ifCandidate =
          (hIf?.items || []).find((m: any) => m?.id && m.id !== activeIfId) || (hIf?.items || [])[0];
        if (ifCandidate?.id) setSelectedOldIForestId(ifCandidate.id);
      } else {
        const hFc = await aiModelAdminService.getHistory({
          branchId,
          kind: 'forecast',
          algorithm: 'PROPHET',
          targetMetric,
          includeInactive: true,
          limit: 20,
          sortBy: 'best',
        });
        setHistoryForecast(hFc);
        const activeFcId = statusAfter?.forecast_model?.id ?? status?.forecast_model?.id;
        const fcCandidate =
          (hFc?.items || []).find((m: any) => m?.id && m.id !== activeFcId) || (hFc?.items || [])[0];
        if (fcCandidate?.id) setSelectedOldForecastId(fcCandidate.id);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Không tải được lịch sử model');
    } finally {
      setLoadingHistory(false);
    }
  };

  const onRetrain = async () => {
    if (!requireBranch()) return;
    setLoadingRetrain(true);
    try {
      // Snapshot model hiện tại (model cũ) trước khi retrain
      const before = await aiModelAdminService.getStatus(branchId!, 'PROPHET', targetMetric);
      setStatusBefore(before);

      const res = await aiModelAdminService.retrain({
        branch_id: branchId!,
        train_iforest: selectedModel === 'iforest',
        train_forecast: selectedModel === 'forecast',
        algorithm: 'PROPHET',
        target_metric: targetMetric,
        iforest_params:
          selectedModel === 'iforest'
            ? {
                enable_tuning: iforestEnableTuning,
                ...(iforestEnableTuning ? {} : { n_estimators: iforestNEstimators, contamination: iforestContamination }),
              }
            : undefined,
        forecast_params:
          selectedModel === 'forecast'
            ? {
                enable_tuning: forecastEnableTuning,
                ...(forecastEnableTuning
                  ? {}
                  : {
                      seasonality_mode: forecastSeasonalityMode,
                      yearly_seasonality: forecastYearly,
                      weekly_seasonality: forecastWeekly,
                      daily_seasonality: forecastDaily,
                      use_external_regressors: forecastUseRegressors,
                    }),
              }
            : undefined,
      });
      setRetrainResult(res);
      toast.success('Đã train/retrain');
      const after = await aiModelAdminService.getStatus(branchId!, 'PROPHET', targetMetric);
      setStatus(after);
      setStatusAfter(after);
      // refresh history after train
      await loadHistory();
    } catch (e: any) {
      toast.error(e?.message || 'Train/retrain thất bại');
    } finally {
      setLoadingRetrain(false);
    }
  };

  const onRunAblation = async () => {
    if (!requireBranch()) return;
    setLoadingAblation(true);
    try {
      const r = await aiModelAdminService.iforestAblation({
        branchId: branchId!,
        days: defaults?.iforest?.training_days ?? 180,
        n_estimators: iforestNEstimators,
        contamination: iforestContamination,
      });
      setAblationResult(r);
      toast.success('Đã chạy feature ablation (IForest)');
    } catch (e: any) {
      toast.error(e?.message || 'Chạy feature ablation thất bại');
    } finally {
      setLoadingAblation(false);
    }
  };

  // Auto refresh history when branch/metric changes (best-effort, non-blocking)
  useEffect(() => {
    if (!branchId) return;
    // Load status first then history
    (async () => {
      try {
        const s = await aiModelAdminService.getStatus(branchId, 'PROPHET', targetMetric);
        setStatus(s);
        setStatusAfter(s);
      } catch { }
      await loadHistory();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, selectedModel]);

  useEffect(() => {
    if (!selectedOldIForestId) {
      setOldIForestModel(null);
      return;
    }
    (async () => {
      try {
        const r = await aiModelAdminService.getById(selectedOldIForestId);
        setOldIForestModel(r?.model);
      } catch (e: any) {
        toast.error(e?.message || 'Không tải được model IForest cũ');
      }
    })();
  }, [selectedOldIForestId]);

  useEffect(() => {
    if (!selectedOldForecastId) {
      setOldForecastModel(null);
      return;
    }
    (async () => {
      try {
        const r = await aiModelAdminService.getById(selectedOldForecastId);
        setOldForecastModel(r?.model);
      } catch (e: any) {
        toast.error(e?.message || 'Không tải được model Forecast cũ');
      }
    })();
  }, [selectedOldForecastId]);

  const renderModelCard = (title: string, model: any) => {
    if (!model) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">{title}</div>
          <div className="text-sm text-gray-700">Không có</div>
        </div>
      );
    }
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="text-xs text-gray-500 mb-2">{title}</div>
        <div className="grid grid-cols-1 gap-1 text-sm">
          <div>
            <span className="text-gray-500">ID:</span> <span className="font-medium">{model.id ?? '-'}</span>
          </div>
          <div className="break-all">
            <span className="text-gray-500">Name:</span> <span className="font-medium">{model.model_name ?? '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Type:</span> <span className="font-medium">{model.model_type ?? '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Version:</span> <span className="font-medium">{model.model_version ?? '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Samples:</span> <span className="font-medium">{model.training_samples_count ?? '-'}</span>
          </div>
          <div>
            <span className="text-gray-500">Train range:</span>{' '}
            <span className="font-medium">
              {(model.training_data_start_date ?? '-') + ' → ' + (model.training_data_end_date ?? '-')}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Trained at:</span> <span className="font-medium">{model.trained_at ?? '-'}</span>
          </div>
          {(model.quality_metric || model.quality_value != null) && (
            <div>
              <span className="text-gray-500">Quality:</span>{' '}
              <span className="font-medium">
                {model.quality_metric ?? 'score'}={model.quality_value ?? model.quality_score ?? '-'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const openDetail = (title: string, payload: any) => {
    setDetailTitle(title);
    setDetailPayload(payload);
    setDetailOpen(true);
  };

  const renderComparison = () => {
    const result = retrainResult?.result;
    const iforest = result?.iforest;
    const forecast = result?.forecast;
    if (!iforest && !forecast) return null;

    const renderBlock = (title: string, block: any) => {
      if (!block) return null;
      const comparison = block.comparison;
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            <span
              className={`text-xs px-2 py-1 rounded-full border ${
                block.action === 'saved'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : block.action === 'skipped'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              {block.action ?? 'N/A'}
            </span>
          </div>

          {block.model_id && (
            <div className="text-sm text-gray-700 mt-2">
              <span className="text-gray-500">model_id:</span> <span className="font-medium">{block.model_id}</span>
            </div>
          )}

          {comparison && (
            <div className="mt-3 space-y-2 text-sm">
              {typeof comparison.old_separation_score !== 'undefined' && (
                <div>
                  <span className="text-gray-500">Old separation:</span>{' '}
                  <span className="font-medium">{comparison.old_separation_score ?? '-'}</span>
                </div>
              )}
              {typeof comparison.new_separation_score !== 'undefined' && (
                <div>
                  <span className="text-gray-500">New separation:</span>{' '}
                  <span className="font-medium">{comparison.new_separation_score ?? '-'}</span>
                </div>
              )}
              {typeof comparison.old_mae !== 'undefined' && (
                <div>
                  <span className="text-gray-500">Old MAE:</span> <span className="font-medium">{comparison.old_mae ?? '-'}</span>
                </div>
              )}
              {typeof comparison.new_mae !== 'undefined' && (
                <div>
                  <span className="text-gray-500">New MAE:</span> <span className="font-medium">{comparison.new_mae ?? '-'}</span>
                </div>
              )}
              {comparison.improvement_percent != null && (
                <div>
                  <span className="text-gray-500">Improvement (%):</span>{' '}
                  <span className="font-medium">{Number(comparison.improvement_percent).toFixed(2)}%</span>
                </div>
              )}
              {comparison.decision_reason && (
                <div className="text-gray-700">
                  <span className="text-gray-500">Decision:</span> {comparison.decision_reason}
                </div>
              )}
            </div>
          )}

          <details className="mt-3">
            <summary className="text-sm text-gray-700 cursor-pointer">Raw</summary>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[280px] mt-2">
              {JSON.stringify(block, null, 2)}
            </pre>
          </details>
        </div>
      );
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedModel === 'iforest' && renderBlock('So sánh Isolation Forest', iforest)}
        {selectedModel === 'forecast' && renderBlock('So sánh Forecast (Prophet)', forecast)}
      </div>
    );
  };

  const onTestForecast = async () => {
    if (!requireBranch()) return;
    setLoadingForecastTest(true);
    try {
      const res = await aiModelAdminService.testForecast({
        branch_id: branchId!,
        algorithm: 'PROPHET',
        target_metric: targetMetric,
        test_days: forecastTestDays,
      });
      setForecastTestResult(res);
      toast.success('Đã chạy test forecast');
    } catch (e: any) {
      toast.error(e?.message || 'Test forecast thất bại');
    } finally {
      setLoadingForecastTest(false);
    }
  };

  const onTestIForest = async () => {
    if (!requireBranch()) return;
    setLoadingIForestTest(true);
    try {
      const res = await aiModelAdminService.testIForest({
        branch_id: branchId!,
        test_days: iforestTestDays,
      });
      setIForestTestResult(res);
      toast.success('Đã chạy test Isolation Forest');
    } catch (e: any) {
      toast.error(e?.message || 'Test Isolation Forest thất bại');
    } finally {
      setLoadingIForestTest(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {detailOpen && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{detailTitle}</div>
                  <div className="text-xs text-gray-500">JSON chi tiết (tương tự “Trạng thái model”)</div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(JSON.stringify(detailPayload, null, 2));
                        toast.success('Đã copy JSON');
                      } catch {
                        toast.error('Copy thất bại');
                      }
                    }}
                  >
                    Copy
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-gray-900 text-sm text-white hover:bg-gray-800"
                    onClick={() => setDetailOpen(false)}
                  >
                    Đóng
                  </button>
                </div>
              </div>
              <div className="p-4">
                <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[70vh]">
                  {JSON.stringify(detailPayload, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin ML Training (Hidden)</h1>
          <p className="text-gray-600 text-sm">
            Route ẩn để train/retrain & test Isolation Forest + Prophet theo chi nhánh (không hiển thị menu).
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Prophet test trả về: MAE/MAPE/RMSE, CI (lower/upper) và độ tin cậy (CI/CV).
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              disabled={loadingBranches}
              value={branchId ?? ''}
              onChange={e => setBranchId(e.target.value ? Number(e.target.value) : null)}
            >
              {branches.map(b => (
                <option key={b.branchId} value={b.branchId}>
                  #{b.branchId} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedModel('forecast')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  selectedModel === 'forecast'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Prophet (Forecast)
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel('iforest')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                  selectedModel === 'iforest'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Isolation Forest
              </button>
            </div>
          </div>

          <div>
            {selectedModel === 'forecast' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forecast metric</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  Số đơn (order_count)
                </div>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
                  IForest phát hiện bất thường theo feature list
                </div>
              </>
            )}
          </div>

          <div>
            {selectedModel === 'forecast' ? (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test days (Forecast)</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={forecastTestDays}
                  onChange={e => setForecastTestDays(Number(e.target.value))}
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test days (IForest)</label>
                <input
                  type="number"
                  min={5}
                  max={365}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={iforestTestDays}
                  onChange={e => setIForestTestDays(Number(e.target.value))}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-gray-800">Hyperparameters (optional)</div>
              <div className="text-xs text-gray-500">
                {loadingDefaults
                  ? 'Đang tải default...'
                  : 'Nếu bật tuning thì hệ thống sẽ tự chọn params (không dùng giá trị nhập tay).'}
              </div>
            </div>
            {defaults && (
              <div className="text-xs text-gray-500">
                Default từ BE: {selectedModel === 'forecast' ? 'Forecast' : 'IForest'}
              </div>
            )}
          </div>

          {selectedModel === 'iforest' ? (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="iforest_tuning"
                  type="checkbox"
                  checked={iforestEnableTuning}
                  onChange={e => setIForestEnableTuning(e.target.checked)}
                />
                <label htmlFor="iforest_tuning" className="text-sm text-gray-700">
                  Enable tuning
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">n_estimators</label>
                <input
                  type="number"
                  min={10}
                  max={2000}
                  disabled={iforestEnableTuning}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                  value={iforestNEstimators}
                  onChange={e => setIForestNEstimators(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">contamination</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={0.49}
                  disabled={iforestEnableTuning}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                  value={iforestContamination}
                  onChange={e => setIForestContamination(Number(e.target.value))}
                />
              </div>

              <div className="text-xs text-gray-600 flex items-center">
                Gate: val_separation ≥{' '}
                <span className="font-medium ml-1">
                  {defaults?.iforest?.min_validation_separation ?? '-'}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <input
                  id="forecast_tuning"
                  type="checkbox"
                  checked={forecastEnableTuning}
                  onChange={e => setForecastEnableTuning(e.target.checked)}
                />
                <label htmlFor="forecast_tuning" className="text-sm text-gray-700">
                  Enable tuning
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">seasonality_mode</label>
                <select
                  disabled={forecastEnableTuning}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:opacity-60"
                  value={forecastSeasonalityMode}
                  onChange={e => setForecastSeasonalityMode(e.target.value as any)}
                >
                  <option value="multiplicative">multiplicative</option>
                  <option value="additive">additive</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    disabled={forecastEnableTuning}
                    checked={forecastYearly}
                    onChange={e => setForecastYearly(e.target.checked)}
                  />
                  yearly
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    disabled={forecastEnableTuning}
                    checked={forecastWeekly}
                    onChange={e => setForecastWeekly(e.target.checked)}
                  />
                  weekly
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    disabled={forecastEnableTuning}
                    checked={forecastDaily}
                    onChange={e => setForecastDaily(e.target.checked)}
                  />
                  daily
                </label>
              </div>

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    disabled={forecastEnableTuning}
                    checked={forecastUseRegressors}
                    onChange={e => setForecastUseRegressors(e.target.checked)}
                  />
                  use regressors
                </label>
                <div className="text-[11px] text-gray-600 text-right">
                  Gate: MAPE ≤ {defaults?.forecast?.quality_gate?.max_mape_percent ?? '-'}%
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedModel === 'iforest' && (
          <div className="mt-3 rounded-lg border border-gray-200 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-800">Feature ablation (IForest)</div>
                <div className="text-xs text-gray-500">
                  Chạy thử nhiều feature set để xem set nào cho separation tốt hơn. Không lưu model.
                </div>
              </div>
              <button
                onClick={onRunAblation}
                disabled={loadingAblation || !branchId}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {loadingAblation ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Chạy ablation
              </button>
            </div>

            {ablationResult?.items?.length ? (
              <div className="mt-3 overflow-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2">Rank</th>
                      <th className="text-left px-3 py-2">Feature set</th>
                      <th className="text-right px-3 py-2">Val separation</th>
                      <th className="text-right px-3 py-2">Val anomaly rate</th>
                      <th className="text-left px-3 py-2">Features</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ablationResult.items || []).map((it: any, idx: number) => (
                      <tr key={it.name} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          #{idx + 1}
                          {idx === 0 && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              BEST
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium">{it.name}</td>
                        <td className="px-3 py-2 text-right">
                          {it.val_separation != null ? Number(it.val_separation).toFixed(4) : '-'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {it.val_anomaly_rate != null ? (Number(it.val_anomaly_rate) * 100).toFixed(2) + '%' : '-'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {(it.features || []).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : ablationResult ? (
              <div className="mt-3 text-xs text-gray-600">
                Không có kết quả ablation.
              </div>
            ) : null}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={onLoadStatus}
            disabled={loadingStatus || !branchId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loadingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Tải trạng thái
          </button>
          <button
            onClick={onRetrain}
            disabled={loadingRetrain || !branchId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {loadingRetrain ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Train / Retrain ({selectedModel === 'forecast' ? 'Prophet' : 'IForest'})
          </button>
          <button
            onClick={selectedModel === 'forecast' ? onTestForecast : onTestIForest}
            disabled={(selectedModel === 'forecast' ? loadingForecastTest : loadingIForestTest) || !branchId}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50 ${
              selectedModel === 'forecast' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {(selectedModel === 'forecast' ? loadingForecastTest : loadingIForestTest) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4" />
            )}
            Dự đoán test ({selectedModel === 'forecast' ? 'Forecast' : 'IForest'})
          </button>
        </div>

        {selectedBranch && (
          <div className="mt-3 text-xs text-gray-500">
            Đang thao tác: <span className="font-medium text-gray-800">#{selectedBranch.branchId} - {selectedBranch.name}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Trạng thái model (theo lựa chọn)</h2>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[360px]">
            {JSON.stringify(
              selectedModel === 'forecast'
                ? { forecast_model: status?.forecast_model }
                : { iforest_model: status?.iforest_model },
              null,
              2
            )}
          </pre>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Kết quả train/retrain (theo lựa chọn)</h2>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[360px]">
            {JSON.stringify(
              selectedModel === 'forecast'
                ? retrainResult?.result?.forecast || retrainResult
                : retrainResult?.result?.iforest || retrainResult,
              null,
              2
            )}
          </pre>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Model cũ vs Model mới (theo lựa chọn)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Trước khi train (model cũ)</div>
            {selectedModel === 'forecast'
              ? renderModelCard('Forecast (cũ)', statusBefore?.forecast_model)
              : renderModelCard('IForest (cũ)', statusBefore?.iforest_model)}
          </div>
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Sau khi train (model hiện tại)</div>
            {selectedModel === 'forecast'
              ? renderModelCard('Forecast (mới/active)', statusAfter?.forecast_model)
              : renderModelCard('IForest (mới/active)', statusAfter?.iforest_model)}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lịch sử model (từ bảng ml_models)</h2>
            <p className="text-xs text-gray-500">
              Lấy theo model_name: iforest_anomaly_branch_{'{branchId}'} và forecast_prophet_{'{targetMetric}'}_branch_{'{branchId}'}
            </p>
          </div>
          <button
            onClick={loadHistory}
            disabled={loadingHistory || !branchId}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loadingHistory ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Tải lịch sử
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedModel === 'iforest' && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">IForest history</div>
            {historyIForest?.best_model_id && (
              <div className="text-xs text-gray-600">
                Best model id: <span className="font-medium">#{historyIForest.best_model_id}</span> (separation cao nhất)
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">Chọn model cũ:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={selectedOldIForestId ?? ''}
                onChange={e => setSelectedOldIForestId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">--</option>
                {(historyIForest?.items || []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    #{m.id}{historyIForest?.best_model_id === m.id ? ' (BEST)' : ''} {m.is_active ? '(active)' : ''} - {m.trained_at ?? ''}
                  </option>
                ))}
              </select>
            </div>
            {renderModelCard('IForest (model cũ đã chọn)', oldIForestModel)}

            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Active</th>
                    <th className="text-left px-3 py-2">Version</th>
                    <th className="text-left px-3 py-2">Samples</th>
                    <th className="text-left px-3 py-2">Separation</th>
                    <th className="text-left px-3 py-2">Trained at</th>
                    <th className="text-left px-3 py-2">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyIForest?.items || []).map((m: any) => (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        #{m.id}
                        {historyIForest?.best_model_id === m.id ? (
                          <span className="ml-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            BEST
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{m.is_active ? 'YES' : 'NO'}</td>
                      <td className="px-3 py-2">{m.model_version ?? '-'}</td>
                      <td className="px-3 py-2">{m.training_samples_count ?? '-'}</td>
                      <td className="px-3 py-2">{m.quality_value ?? '-'}</td>
                      <td className="px-3 py-2">{m.trained_at ?? '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                          onClick={() => openDetail(`IForest model #${m.id}`, m)}
                        >
                          Xem JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!historyIForest?.items?.length && (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={6}>
                        Chưa có dữ liệu lịch sử IForest.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {selectedModel === 'forecast' && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">Forecast history (Prophet + order_count)</div>
            {historyForecast?.best_model_id && (
              <div className="text-xs text-gray-600">
                Best model id: <span className="font-medium">#{historyForecast.best_model_id}</span> (MAE thấp nhất)
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm text-gray-600">Chọn model cũ:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={selectedOldForecastId ?? ''}
                onChange={e => setSelectedOldForecastId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">--</option>
                {(historyForecast?.items || []).map((m: any) => (
                  <option key={m.id} value={m.id}>
                    #{m.id}{historyForecast?.best_model_id === m.id ? ' (BEST)' : ''} {m.is_active ? '(active)' : ''} - {m.trained_at ?? ''}
                  </option>
                ))}
              </select>
            </div>
            {renderModelCard('Forecast (model cũ đã chọn)', oldForecastModel)}

            <div className="overflow-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">ID</th>
                    <th className="text-left px-3 py-2">Active</th>
                    <th className="text-left px-3 py-2">Version</th>
                    <th className="text-left px-3 py-2">Samples</th>
                    <th className="text-left px-3 py-2">MAE</th>
                    <th className="text-left px-3 py-2">Trained at</th>
                    <th className="text-left px-3 py-2">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {(historyForecast?.items || []).map((m: any) => (
                    <tr key={m.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        #{m.id}
                        {historyForecast?.best_model_id === m.id ? (
                          <span className="ml-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                            BEST
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{m.is_active ? 'YES' : 'NO'}</td>
                      <td className="px-3 py-2">{m.model_version ?? '-'}</td>
                      <td className="px-3 py-2">{m.training_samples_count ?? '-'}</td>
                      <td className="px-3 py-2">{m.quality_value ?? '-'}</td>
                      <td className="px-3 py-2">{m.trained_at ?? '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
                          onClick={() => openDetail(`Forecast model #${m.id}`, m)}
                        >
                          Xem JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!historyForecast?.items?.length && (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={6}>
                        Chưa có dữ liệu lịch sử Forecast.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      </div>

      {renderComparison()}

      {selectedModel === 'forecast' && (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Forecast test (Prophet) — metric: order_count</h2>
        {forecastTestResult?.success && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-500 text-xs">MAE</div>
              <div className="font-semibold">{forecastTestResult?.metrics?.mae ?? '-'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-500 text-xs">MAPE</div>
              <div className="font-semibold">{forecastTestResult?.metrics?.mape ?? '-'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Độ tin cậy</div>
              <div className="font-semibold">
                {forecastTestResult?.confidence?.percent ?? 0}% ({forecastTestResult?.confidence?.level ?? 'N/A'})
              </div>
            </div>
          </div>
        )}

        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Actual</th>
                <th className="text-right px-3 py-2">Forecast</th>
                <th className="text-right px-3 py-2">Lower</th>
                <th className="text-right px-3 py-2">Upper</th>
              </tr>
            </thead>
            <tbody>
              {(forecastTestResult?.rows || []).map((r: any) => (
                <tr key={r.date} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2 text-right">{r.actual ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{r.forecast ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{r.lower ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{r.upper ?? '-'}</td>
                </tr>
              ))}
              {!forecastTestResult?.rows?.length && (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={5}>
                    Chưa có dữ liệu. Bấm “Dự đoán test (Forecast)”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <details className="mt-3">
          <summary className="text-sm text-gray-700 cursor-pointer">Raw JSON</summary>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[360px] mt-2">
            {JSON.stringify(forecastTestResult, null, 2)}
          </pre>
        </details>
      </div>
      )}

      {selectedModel === 'iforest' && (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Isolation Forest test</h2>
        {iforestTestResult?.success && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Tổng ngày</div>
              <div className="font-semibold">{iforestTestResult?.summary?.total_days ?? '-'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Ngày bất thường</div>
              <div className="font-semibold">{iforestTestResult?.summary?.anomaly_days ?? '-'}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-gray-500 text-xs">Confidence TB</div>
              <div className="font-semibold">{iforestTestResult?.summary?.avg_confidence ?? '-'}</div>
            </div>
          </div>
        )}

        <div className="overflow-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Anomaly score</th>
                <th className="text-right px-3 py-2">Confidence</th>
                <th className="text-right px-3 py-2">Is anomaly</th>
              </tr>
            </thead>
            <tbody>
              {(iforestTestResult?.rows || []).map((r: any) => (
                <tr key={r.date} className="border-t border-gray-100">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2 text-right">{r.anomaly_score ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{r.confidence ?? '-'}</td>
                  <td className="px-3 py-2 text-right">{r.is_anomaly ? 'YES' : 'NO'}</td>
                </tr>
              ))}
              {!iforestTestResult?.rows?.length && (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={4}>
                    Chưa có dữ liệu. Bấm “Dự đoán test (IForest)”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <details className="mt-3">
          <summary className="text-sm text-gray-700 cursor-pointer">Raw JSON</summary>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[360px] mt-2">
            {JSON.stringify(iforestTestResult, null, 2)}
          </pre>
        </details>
      </div>
      )}
    </div>
  );
}


