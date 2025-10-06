import React, { useEffect, useMemo, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import catalogService from '../../services/catalogService';
import { CatalogIngredient, CatalogUnit, CatalogProductDetail, CreateRecipeRequest, UpdateRecipeRequest, CatalogRecipe } from '../../types';
import { ChefHat, X, Plus, Trash2, Loader } from 'lucide-react';
import RecipeProductPickerModal from './RecipeProductPickerModal';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (recipe: CatalogRecipe) => void;
  recipe?: CatalogRecipe | null;
}

type ItemRow = {
  id?: number;
  ingredientId?: number;
  qty?: number;
  unitCode?: string;
  note?: string;
};

export default function RecipeModal({ open, onClose, onSaved, recipe }: Props) {
  const [loading, setLoading] = useState(false);
  const [pdId, setPdId] = useState<number | undefined>(recipe?.productDetail?.pdId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdDisplay, setPdDisplay] = useState<string>(() => {
    if (recipe?.productDetail) {
      const sizeName = (recipe.productDetail as any)?.size?.name;
      return sizeName ? `Size ${sizeName}` : `PD #${recipe.productDetail.pdId}`;
    }
    return '';
  });
  const [name, setName] = useState<string>(recipe?.name || '');
  const [version, setVersion] = useState<number>(recipe?.version || 1);
  const [description, setDescription] = useState<string>(recipe?.description || '');
  const [yieldVal, setYieldVal] = useState<number | undefined>(recipe?.yield ?? 1);
  const [instructions, setInstructions] = useState<string>(recipe?.instructions || '');
  const [status, setStatus] = useState<string>(recipe?.status || 'ACTIVE');
  const [items, setItems] = useState<ItemRow[]>(() =>
    recipe?.items?.map(i => ({ id: i.id, ingredientId: i.ingredient.ingredientId, qty: Number(i.qty), unitCode: i.unit.code, note: i.note || '' })) || [{ }]
  );

  type ItemError = { ingredientId?: string; qty?: string; unitCode?: string };
  type Errors = { pdId?: string; name?: string; version?: string; instructions?: string; items?: ItemError[] };
  const [errors, setErrors] = useState<Errors>({});

  // Instruction steps (each step is one line/entry)
  type Step = { text: string };
  const initialSteps: Step[] = (() => {
    const raw = instructions || '';
    if (!raw) return [{ text: '' }];
    const parts = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    return parts.length ? parts.map(t => ({ text: t })) : [{ text: '' }];
  })();
  const [steps, setSteps] = useState<Step[]>(initialSteps);

  const [ingredients, setIngredients] = useState<CatalogIngredient[]>([]);
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [productDetails, setProductDetails] = useState<CatalogProductDetail[]>([]);
  
  // Refs for auto scroll
  const ingredientsTableRef = useRef<HTMLDivElement>(null);
  const instructionsContainerRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    if (recipe) return; // only reset when creating
    setPdId(undefined);
    setPdDisplay('');
    setName('');
    setVersion(1);
    setDescription('');
    setYieldVal(1);
    setInstructions('');
    setStatus('ACTIVE');
    setItems([{}]);
    setSteps([{ text: '' }]);
    setErrors({});
  };

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [ingRes, unitRes] = await Promise.all([
          catalogService.searchIngredients({ page: 0, size: 100 }).then(r => r.content),
          catalogService.getUnits(),
        ]);
        setIngredients(ingRes);
        setUnits(unitRes);
      } catch {}
    })();
  }, [open]);

  // Sync form with recipe when opening or switching between edit/create
  useEffect(() => {
    if (!open) return;
    if (recipe) {
      setPdId(recipe.productDetail?.pdId);
      const sizeName = (recipe.productDetail as any)?.size?.name;
      setPdDisplay(sizeName ? `Size ${sizeName}` : (recipe.productDetail?.pdId ? `PD #${recipe.productDetail.pdId}` : ''));
      setName(recipe.name || '');
      setVersion(recipe.version || 1);
      setDescription(recipe.description || '');
      setYieldVal(recipe.yield ?? 1);
      setInstructions(recipe.instructions || '');
      setStatus(recipe.status || 'ACTIVE');
      setItems(recipe.items?.map(i => ({ id: i.id, ingredientId: i.ingredient.ingredientId, qty: Number(i.qty), unitCode: i.unit.code, note: i.note || '' })) || [{}]);
      const stepParts = (recipe.instructions || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      setSteps(stepParts.length ? stepParts.map(t => ({ text: t })) : [{ text: '' }]);
      setErrors({});
    } else {
      resetForm();
    }
  }, [open, recipe]);

  // Auto-suggest next version when name or pdId changes
  useEffect(() => {
    if (!open || recipe) return; // Only for create mode
    if (name && pdId) {
      const fetchNextVersion = async () => {
        try {
          const nextVersion = await catalogService.getNextRecipeVersion(name, pdId);
          setVersion(nextVersion);
        } catch (error) {
          console.error('Failed to get next version:', error);
          // Keep current version if API fails
        }
      };
      
      // Debounce the API call
      const timer = setTimeout(fetchNextVersion, 500);
      return () => clearTimeout(timer);
    }
  }, [name, pdId, open, recipe]);

  // NOTE: product details list could be fetched from a product-service endpoint; placeholder leaves manual type-in for pdId

  const addRow = () => {
    setItems(prev => [...prev, {}]);
    // Auto scroll to bottom of ingredients table after adding new row
    setTimeout(() => {
      if (ingredientsTableRef.current) {
        console.log('Ingredients table ref found, scrolling...', {
          scrollHeight: ingredientsTableRef.current.scrollHeight,
          clientHeight: ingredientsTableRef.current.clientHeight,
          scrollTop: ingredientsTableRef.current.scrollTop
        });
        // Smooth scroll to bottom
        ingredientsTableRef.current.scrollTo({
          top: ingredientsTableRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        console.log('Ingredients table ref not found');
      }
    }, 200);
  };
  
  const removeRow = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<ItemRow>) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));

  const validateField = (field: keyof Omit<Errors, 'items'>, value: any) => {
    const next: Errors = { ...errors };
    switch (field) {
      case 'pdId':
        next.pdId = !value ? 'Required' : undefined;
        break;
      case 'name':
        next.name = !value ? 'Required' : value.length > 150 ? 'Max 150 chars' : undefined;
        break;
      case 'version':
        next.version = !value || value < 1 ? 'Must be >= 1' : undefined;
        break;
      case 'instructions':
        next.instructions = steps.some(s => s.text && s.text.trim()) ? undefined : 'At least one step is required';
        break;
    }
    setErrors(next);
  };

  const validateItemField = (index: number, field: keyof ItemError, value: any) => {
    const arr: ItemError[] = [...(errors.items || [])];
    while (arr.length < items.length) arr.push({});
    const row = { ...(arr[index] || {}) };
    if (field === 'ingredientId') row.ingredientId = !value ? 'Required' : undefined;
    if (field === 'qty') row.qty = !value || Number(value) <= 0 ? 'Must be > 0' : undefined;
    if (field === 'unitCode') row.unitCode = !value ? 'Required' : undefined;
    arr[index] = row;
    setErrors({ ...errors, items: arr });
  };

  const validateAll = (): boolean => {
    const next: Errors = { items: [] };
    next.pdId = !pdId ? 'Required' : undefined;
    next.name = !name ? 'Required' : name.length > 150 ? 'Max 150 chars' : undefined;
    next.version = !version || version < 1 ? 'Must be >= 1' : undefined;
    next.instructions = steps.some(s => s.text && s.text.trim()) ? undefined : 'At least one step is required';
    items.forEach((it, idx) => {
      (next.items as ItemError[])[idx] = {
        ingredientId: !it.ingredientId ? 'Required' : undefined,
        qty: !it.qty || Number(it.qty) <= 0 ? 'Must be > 0' : undefined,
        unitCode: !it.unitCode ? 'Required' : undefined,
      };
    });
    setErrors(next);
    const noHeaderErrors = !next.pdId && !next.name && !next.version && !next.instructions;
    const noItemErrors = (next.items || []).every(er => !er?.ingredientId && !er?.qty && !er?.unitCode);
    return noHeaderErrors && noItemErrors;
  };

  const canSubmit = useMemo(() => {
    if (!pdId || !name || !version) return false;
    if (!steps.some(s => s.text && s.text.trim())) return false;
    if (!items.length) return false;
    for (const it of items) {
      if (!it.ingredientId || !it.qty || !it.unitCode) return false;
    }
    return true;
  }, [pdId, name, version, steps, items]);

  const handleSubmit = async () => {
    if (!validateAll()) return;
    setLoading(true);
    try {
      const joinedInstructions = steps
        .map(s => (s.text || '').trim())
        .filter(Boolean)
        .join('\n');
      if (!recipe) {
        const payload: CreateRecipeRequest = {
          pdId: pdId!,
          name,
          version,
          description: description || undefined,
          yield: yieldVal,
          instructions: joinedInstructions,
          status,
          items: items.map(it => ({
            ingredientId: it.ingredientId!,
            qty: it.qty!,
            unitCode: it.unitCode!,
            note: it.note || undefined,
          }))
        };
        const created = await catalogService.createRecipe(payload);
        toast.success('Recipe created successfully');
        onSaved(created);
      } else {
        const payload: UpdateRecipeRequest = {
          pdId,
          name,
          version,
          description: description || undefined,
          yield: yieldVal,
          instructions: joinedInstructions,
          status,
          items: items.map(it => ({
            id: it.id,
            ingredientId: it.ingredientId!,
            qty: it.qty!,
            unitCode: it.unitCode!,
            note: it.note || undefined,
          }))
        };
        const updated = await catalogService.updateRecipe(recipe.recipeId, payload);
        toast.success('Recipe updated successfully');
        onSaved(updated);
      }
      resetForm();
      onClose();
    } catch (e: any) {
      const message = e?.response?.data?.message || e?.message || 'An error occurred while saving the recipe';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => { resetForm(); onClose(); }} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-50 p-2 rounded-lg">
                  <ChefHat className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{recipe ? 'Update Recipe' : 'Create Recipe'}</h3>
              </div>
              <button onClick={() => { resetForm(); onClose(); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-auto max-h-[70vh] pr-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Product Detail</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pdId ? (pdDisplay || `PD #${pdId}`) : ''}
                  placeholder="Not selected"
                  className={`flex-1 px-4 py-2.5 border rounded-lg outline-none transition-colors bg-gray-50 ${errors.pdId ? 'border-red-500' : 'border-gray-300'}`}
                />
                {!recipe && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >Pick</button>
                )}
              </div>
              {errors.pdId && <p className="text-xs text-red-600 mt-1">{errors.pdId}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600">Recipe name</label>
              <input
                value={name}
                onBlur={() => validateField('name', name)}
                onChange={e => setName(e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-colors ${errors.name ? 'border-red-500' : 'border-gray-300 hover:border-amber-400 focus:border-amber-500'}`}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>
            
            {/* Version, Yield, Status - 3 columns */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Version</label>
                  <input
                    type="number"
                    value={version}
                    onBlur={() => validateField('version', version)}
                    onChange={e => setVersion(Number(e.target.value))}
                    className={`w-full px-2 py-2 text-sm border rounded-md outline-none transition-colors ${errors.version ? 'border-red-500' : 'border-gray-300 hover:border-amber-400 focus:border-amber-500'}`}
                  />
                  {errors.version && <p className="text-xs text-red-600 mt-1">{errors.version}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Yield</label>
                  <input type="number" step="0.0001" value={yieldVal ?? ''} onChange={e => setYieldVal(e.target.value ? Number(e.target.value) : undefined)} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md outline-none transition-colors hover:border-amber-400 focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md outline-none bg-white cursor-pointer hover:border-amber-400 focus:border-amber-500 transition-colors">
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition-colors hover:border-amber-400 focus:border-amber-500" />
            </div>
            {/* Instruction steps editor */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-gray-600">Instructions (step by step)</label>
                <button
                  type="button"
                  onClick={() => {
                    setSteps(prev => [...prev, { text: '' }]);
                    // Auto scroll to bottom of instructions after adding new step
                    setTimeout(() => {
                      if (instructionsContainerRef.current) {
                        // Smooth scroll to bottom
                        instructionsContainerRef.current.scrollTo({
                          top: instructionsContainerRef.current.scrollHeight,
                          behavior: 'smooth'
                        });
                      }
                    }, 150);
                  }}
                  className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                >
                  Add step
                </button>
              </div>
              {steps.length === 0 && (
                <div className="text-sm text-gray-500 mb-2">No steps yet. Click "Add step" to start.</div>
              )}
              <div ref={instructionsContainerRef} className="space-y-2 instructions-container max-h-48 overflow-y-auto">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-8 text-sm text-gray-600">{idx + 1}.</div>
                    <input
                      value={step.text}
                      onChange={e => setSteps(prev => prev.map((s, i) => i === idx ? { text: e.target.value } : s))}
                      onBlur={() => validateField('instructions', step.text)}
                      className={`flex-1 px-4 py-2.5 border rounded-lg outline-none transition-colors ${errors.instructions ? 'border-red-500' : 'border-gray-300 hover:border-amber-400 focus:border-amber-500'}`}
                      placeholder="Enter step text..."
                    />
                    <button
                      type="button"
                      onClick={() => setSteps(prev => prev.filter((_, i) => i !== idx))}
                      className="px-2 py-2 text-red-600 hover:bg-red-50 rounded"
                      aria-label="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.instructions && <p className="text-xs text-red-600 mt-1">{errors.instructions}</p>}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Ingredients</h3>
              <button 
                onClick={addRow} 
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> 
                Add Ingredient
              </button>
            </div>
            <div className="mt-2 border rounded-lg overflow-hidden">
                  <div ref={ingredientsTableRef} className="max-h-48 overflow-y-auto pr-3 ingredients-table">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Ingredient</th>
                      <th className="px-3 py-2 text-left">Qty</th>
                      <th className="px-3 py-2 text-left">Unit</th>
                      <th className="px-3 py-2 text-left">Note</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((row, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">
                          <select
                            className={`w-full px-4 py-2.5 border rounded-lg outline-none bg-white cursor-pointer transition-colors ${errors.items?.[idx]?.ingredientId ? 'border-red-500' : 'border-gray-300 hover:border-amber-400 focus:border-amber-500'}`}
                            value={row.ingredientId ?? ''}
                            onBlur={() => validateItemField(idx, 'ingredientId', row.ingredientId)}
                            onChange={e => updateRow(idx, { ingredientId: Number(e.target.value) })}
                          >
                            <option value="">Select ingredient</option>
                            {ingredients.map(ing => (
                              <option key={ing.ingredientId} value={ing.ingredientId}>{ing.name}</option>
                            ))}
                          </select>
                          {errors.items?.[idx]?.ingredientId && <p className="text-xs text-red-600 mt-1">{errors.items[idx]?.ingredientId}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.0001"
                            className={`w-full px-4 py-2.5 border rounded-lg outline-none transition-colors ${errors.items?.[idx]?.qty ? 'border-red-500' : 'border-gray-300 hover:border-amber-400 focus:border-amber-500'}`}
                            value={row.qty ?? ''}
                            onBlur={() => validateItemField(idx, 'qty', row.qty)}
                            onChange={e => updateRow(idx, { qty: e.target.value ? Number(e.target.value) : undefined })}
                          />
                          {errors.items?.[idx]?.qty && <p className="text-xs text-red-600 mt-1">{errors.items[idx]?.qty}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className={`w-full px-4 py-2.5 border rounded-lg outline-none bg-white cursor-pointer transition-colors ${errors.items?.[idx]?.unitCode ? 'border-red-500' : 'border-gray-300 hover:border-amber-400 focus:border-amber-500'}`}
                            value={row.unitCode ?? ''}
                            onBlur={() => validateItemField(idx, 'unitCode', row.unitCode)}
                            onChange={e => updateRow(idx, { unitCode: e.target.value })}
                          >
                            <option value="">Select unit</option>
                            {units.map(u => (
                              <option key={u.code} value={u.code}>{u.name} ({u.code})</option>
                            ))}
                          </select>
                          {errors.items?.[idx]?.unitCode && <p className="text-xs text-red-600 mt-1">{errors.items[idx]?.unitCode}</p>}
                        </td>
                        <td className="px-3 py-2">
                          <input className="w-full px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition-colors hover:border-amber-400 focus:border-amber-500" value={row.note ?? ''} onChange={e => updateRow(idx, { note: e.target.value })} />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button className="p-2 rounded hover:bg-red-50 text-red-600" onClick={() => removeRow(idx)} aria-label="Remove row">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => { resetForm(); onClose(); }}>Cancel</button>
              <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50" disabled={loading} onClick={handleSubmit}>
                {loading && <Loader className="w-4 h-4 mr-2 inline-block animate-spin" />} {recipe ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
        <RecipeProductPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          allowPdId={recipe?.productDetail?.pdId}
          onPicked={(pickedPdId, productName, sizeName) => {
            setPdId(pickedPdId);
            setPdDisplay(sizeName ? `${productName} • Size ${sizeName}` : productName);
            setName(`${productName}${sizeName ? ' - ' + sizeName : ''}`);
            setErrors(prev => ({ ...prev, pdId: undefined }));
          }}
        />
      </div>
    </div>
  );
}


