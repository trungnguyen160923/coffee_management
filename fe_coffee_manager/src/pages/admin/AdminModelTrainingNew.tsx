import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FlaskConical, Loader2, RefreshCw } from 'lucide-react';

import { branchService } from '../../services';
import aiModelAdminService from '../../services/aiModelAdminService';

type BranchOption = { branchId: number; name: string };

export default function AdminModelTrainingNew() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const selectedBranch = useMemo(
    () => branches.find(b => b.branchId === branchId) || null,
    [branches, branchId]
  );

  const [selectedModel, setSelectedModel] = useState<'iforest' | 'forecast'>('forecast');

  // New-method availability (from DB: daily_branch_metrics)
  const [availableBranches, setAvailableBranches] = useState<any>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);

  // IForest params
  const [iforestGroups, setIForestGroups] = useState<string>('a,b,c,d');

  // Prophet params (keep target fixed to order_count for now)
  const targetMetric = 'order_count';
  const [horizon, setHorizon] = useState<number>(30);
  const [futurePeriods, setFuturePeriods] = useState<number>(30);
  const [intervalWidth, setIntervalWidth] = useState<number>(0.8);
  const [intervalWidthGrid, setIntervalWidthGrid] = useState<string>('0.8,0.9,0.95');
  const [minCoverage, setMinCoverage] = useState<number>(0);
  const [coverageWeight, setCoverageWeight] = useState<number>(2);

  // commit toggle
  const [commitToDb, setCommitToDb] = useState<boolean>(false);
  const [createdBy, setCreatedBy] = useState<string>('admin');

  const [loadingRun, setLoadingRun] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);

  // Predict bundle by selected date
  const [predictDate, setPredictDate] = useState<string>(''); // YYYY-MM-DD
  const [loadingPredict, setLoadingPredict] = useState(false);
  const [predictResult, setPredictResult] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
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
            return { branchId: parsedId, name: b?.name || `Branch ${rawId ?? ''}` };
          })
          .filter((b: any) => Number.isFinite(b.branchId) && b.branchId > 0);
        setBranches(opts);
        if (opts.length > 0) setBranchId(opts[0].branchId);
      } catch (e: any) {
        toast.error(e?.message || 'Không tải được danh sách chi nhánh');
      }
    };
    load();
  }, []);

  const requireBranch = () => {
    if (!branchId) {
      toast.error('Vui lòng chọn chi nhánh');
      return false;
    }
    return true;
  };

  const loadAvailable = async () => {
    setLoadingAvail(true);
    try {
      const res = await aiModelAdminService.newMethodAvailableBranches();
      setAvailableBranches(res);
      toast.success('Đã tải danh sách branch có dữ liệu (daily_branch_metrics)');
    } catch (e: any) {
      toast.error(e?.message || 'Không tải được danh sách branch có dữ liệu');
    } finally {
      setLoadingAvail(false);
    }
  };

  useEffect(() => {
    // non-blocking
    loadAvailable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Default date: today (YYYY-MM-DD) for user convenience
    if (!predictDate) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setPredictDate(`${yyyy}-${mm}-${dd}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRun = async () => {
    if (!requireBranch()) return;
    setLoadingRun(true);
    try {
      let res: any;
      if (selectedModel === 'iforest') {
        res = await aiModelAdminService.newMethodTrainIForestAllGroups({
          branchId: branchId!,
          groups: iforestGroups,
          commit: commitToDb,
          createdBy,
        });
      } else {
        res = await aiModelAdminService.newMethodTrainProphetAllVariants({
          branchId: branchId!,
          target: targetMetric as any,
          commit: commitToDb,
          createdBy,
          horizon,
          futurePeriods,
          intervalWidth,
          intervalWidthGrid,
          minCoverage,
          coverageWeight,
        });
      }
      setRunResult(res);
      toast.success('Đã chạy new_method');
    } catch (e: any) {
      toast.error(e?.message || 'Chạy new_method thất bại');
    } finally {
      setLoadingRun(false);
    }
  };

  const onPredict = async () => {
    if (!requireBranch()) return;
    if (!predictDate) {
      toast.error('Vui lòng chọn ngày để dự đoán');
      return;
    }
    setLoadingPredict(true);
    try {
      const res = await aiModelAdminService.predictByDate({
        branchId: branchId!,
        date: predictDate,
        forecastDays: 7,
        targetMetric: targetMetric as any,
      });
      setPredictResult(res);
      toast.success('Đã dự đoán (IForest + Forecast 7 ngày)');
    } catch (e: any) {
      toast.error(e?.message || 'Dự đoán thất bại');
    } finally {
      setLoadingPredict(false);
    }
  };

  const downloadPredictJson = () => {
    try {
      const blob = new Blob([JSON.stringify(predictResult, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predict_branch_${branchId || 'x'}_${predictDate || 'date'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const branchDataOk = useMemo(() => {
    const list = availableBranches?.branches || [];
    return !!list.find((x: any) => Number(x.branch_id) === Number(branchId));
  }, [availableBranches, branchId]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin ML Training (NEW METHOD)</h1>
        <div className="text-sm text-gray-600 mt-1">
          Route test: chạy pipeline new_method từ dữ liệu DB `daily_branch_metrics` + optional save DB.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chi nhánh</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={branchId ?? ''}
              onChange={e => setBranchId(e.target.value ? Number(e.target.value) : null)}
            >
              {branches.map(b => (
                <option key={b.branchId} value={b.branchId}>
                  #{b.branchId} - {b.name}
                </option>
              ))}
            </select>
            <div className={`text-xs mt-1 ${branchDataOk ? 'text-green-700' : 'text-amber-700'}`}>
              daily_branch_metrics:{' '}
              <span className="font-medium">{branchDataOk ? 'FOUND' : 'NOT FOUND'}</span>
            </div>
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
                Prophet (variants)
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
                IForest (all groups)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commit DB</label>
            <div className="flex items-center gap-2">
              <input
                id="commit_db"
                type="checkbox"
                checked={commitToDb}
                onChange={e => setCommitToDb(e.target.checked)}
              />
              <label htmlFor="commit_db" className="text-sm text-gray-700">
                Save models into `ml_models`
              </label>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              An toàn: lưu vào model_name prefix <span className="font-medium">*_nm_*</span> (không overwrite production).
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">created_by</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={createdBy}
              onChange={e => setCreatedBy(e.target.value)}
            />
          </div>
        </div>

        {selectedModel === 'iforest' ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm font-medium text-gray-800 mb-2">IForest params</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Groups</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={iforestGroups}
                  onChange={e => setIForestGroups(e.target.value)}
                  placeholder="a,b,c,d"
                />
                <div className="text-xs text-gray-500 mt-1">VD: `a,b,c,d` hoặc chỉ `a,d`</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm font-medium text-gray-800 mb-2">Prophet params (variants)</div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">target</label>
                <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-700">
                  order_count
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">horizon</label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={horizon}
                  onChange={e => setHorizon(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">future_periods</label>
                <input
                  type="number"
                  min={5}
                  max={365}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={futurePeriods}
                  onChange={e => setFuturePeriods(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">interval_width</label>
                <input
                  type="number"
                  step="0.01"
                  min={0.6}
                  max={0.98}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={intervalWidth}
                  onChange={e => setIntervalWidth(Number(e.target.value))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">interval_width_grid</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={intervalWidthGrid}
                  onChange={e => setIntervalWidthGrid(e.target.value)}
                  placeholder="0.8,0.9,0.95"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">min_coverage</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={0.99}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={minCoverage}
                  onChange={e => setMinCoverage(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">coverage_weight</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={100}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={coverageWeight}
                  onChange={e => setCoverageWeight(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={loadAvailable}
            disabled={loadingAvail}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {loadingAvail ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh DB availability
          </button>
          <button
            onClick={onRun}
            disabled={loadingRun || !branchId}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50 ${
              selectedModel === 'forecast' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {loadingRun ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
            Run new_method ({selectedModel === 'forecast' ? 'Prophet' : 'IForest'})
          </button>
        </div>

        {selectedBranch && (
          <div className="text-xs text-gray-500">
            Đang thao tác: <span className="font-medium text-gray-800">#{selectedBranch.branchId} - {selectedBranch.name}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">Dự đoán theo ngày</div>
            <div className="text-xs text-gray-500">
              Chọn ngày (vd 2025-12-25): kiểm tra bất thường ngày đó (IForest) + dự đoán 7 ngày kế tiếp (Prophet).
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={predictDate}
              onChange={e => setPredictDate(e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex items-end gap-2">
            <button
              onClick={onPredict}
              disabled={loadingPredict || !branchId}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingPredict ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              Dự đoán (7 ngày)
            </button>
            <button
              onClick={downloadPredictJson}
              disabled={!predictResult}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Tải JSON
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-lg font-semibold text-gray-900 mb-2">Available branches (daily_branch_metrics)</div>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[360px]">
            {JSON.stringify(availableBranches, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-lg font-semibold text-gray-900 mb-2">Run result</div>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[360px]">
            {JSON.stringify(runResult, null, 2)}
          </pre>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="text-lg font-semibold text-gray-900 mb-2">Predict result (IForest + Forecast)</div>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-auto max-h-[520px]">
          {JSON.stringify(predictResult, null, 2)}
        </pre>
      </div>
    </div>
  );
}


