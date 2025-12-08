import { useEffect, useMemo, useState } from 'react';
import catalogService from '../../services/catalogService';
import { CatalogCategory, CatalogRecipe, CatalogProduct } from '../../types';
import { API_BASE_URL } from '../../config/api';
import { Coffee, ChefHat, RefreshCw } from 'lucide-react';
import RecipeDetailModal from '../../components/recipe/RecipeDetailModal';
import { RecipesSkeleton } from '../../components/staff/skeletons';
import ProductRecipeModal from '../../components/recipe/ProductRecipeModal';

export default function StaffRecipes() {
    const [recipes, setRecipes] = useState<CatalogRecipe[]>([]);
    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
    const [search, setSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detail, setDetail] = useState<CatalogRecipe | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
    const [productModalOpen, setProductModalOpen] = useState(false);

    // Helper function to get product image URL
    const getProductImageUrl = (product: CatalogProduct): string | null => {
        if (!product.imageUrl) return null;
        return product.imageUrl.startsWith('http')
            ? product.imageUrl
            : `${API_BASE_URL}/api/catalogs${product.imageUrl}`;
    };


    // Load categories and products once
    useEffect(() => {
        (async () => {
            try {
                const [cats, productsPage] = await Promise.all([
                    catalogService.getCategories(),
                    catalogService.searchProducts({ page: 0, size: 1000, active: true })
                ]);
                setCategories(Array.isArray(cats) ? cats : []);
                setProducts(Array.isArray(productsPage?.content) ? productsPage.content : []);
            } catch (e) {
                console.error('Failed to load categories or products:', e);
            }
        })();
    }, []);

    // Load recipes whenever category changes
    useEffect(() => {
        // debounce search term
        const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(handle);
    }, [search]);

    // Load recipes function
    const loadRecipes = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            // Fetch only ACTIVE recipes, optionally filtered by category
            const page = await catalogService.searchRecipes({
                status: 'ACTIVE',
                categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
                keyword: debouncedSearch || undefined,
                page: 0,
                size: 200
            });
            setRecipes(Array.isArray(page?.content) ? page.content : []);
        } catch (e: any) {
            setError(e?.message || 'Failed to load recipes.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load recipes whenever category or search changes
    useEffect(() => {
        loadRecipes();
    }, [selectedCategoryId, debouncedSearch]);

    // Group recipes by product (similar to dashboard)
    const groupedByProduct = useMemo(() => {
        const productMap = new Map<number, { product: CatalogProduct; recipes: CatalogRecipe[] }>();
        
        recipes.forEach(recipe => {
            if (!recipe.productDetail?.pdId) return;
            
            // Find product that contains this productDetail
            const product = products.find(p => 
                p.productDetails?.some(pd => pd.pdId === recipe.productDetail.pdId)
            );
            
            if (product) {
                if (!productMap.has(product.productId)) {
                    productMap.set(product.productId, { product, recipes: [] });
                }
                productMap.get(product.productId)!.recipes.push(recipe);
            }
        });
        
        return Array.from(productMap.values());
    }, [recipes, products]);

    // Group by category for display
    const groupedByCategory = useMemo(() => {
        const categoryMap = new Map<string, typeof groupedByProduct>();
        for (const item of groupedByProduct) {
            const catName = item.product.category?.name || 'Uncategorized';
            if (!categoryMap.has(catName)) {
                categoryMap.set(catName, []);
            }
            categoryMap.get(catName)!.push(item);
        }
        return Array.from(categoryMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [groupedByProduct]);

    const closeDetail = () => {
        setDetailOpen(false);
        setDetail(null);
    };

    return (
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-8 pt-6 pb-3">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">Recipe List</h1>
                            <p className="text-sm text-slate-500">Recipe list for staff</p>
                        </div>
                        <button
                            onClick={() => loadRecipes(true)}
                            disabled={refreshing}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                    <div className="p-6 lg:p-8 pt-4">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Category</label>
                    <select
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        value={selectedCategoryId === 'all' ? 'all' : String(selectedCategoryId)}
                        onChange={(e) => {
                            const v = e.target.value;
                            setSelectedCategoryId(v === 'all' ? 'all' : Number(v));
                        }}
                    >
                        <option value="all">All</option>
                        {categories.map(c => (
                            <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[220px]">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search recipes..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                    />
                </div>
            </div>

            {loading && <RecipesSkeleton />}
            {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">{error}</div>}

            {!loading && !error && (
                <div className="space-y-8">
                    {groupedByProduct.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow p-6 text-gray-600 text-center">No recipes found.</div>
                    ) : (
                        groupedByCategory.map(([catName, productItems]) => (
                            <div key={catName} className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-800">{catName}</h2>
                                    <span className="text-xs text-gray-500">{productItems.length} {productItems.length === 1 ? 'product' : 'products'}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {productItems.map(({ product, recipes: productRecipes }) => {
                                        const imageUrl = getProductImageUrl(product);
                                        const availableSizes = product.productDetails?.filter(pd => pd.active && pd.size) || [];
                                        const recipesBySize = new Map<number, CatalogRecipe>();
                                        productRecipes.forEach(recipe => {
                                            if (recipe.productDetail?.pdId) {
                                                recipesBySize.set(recipe.productDetail.pdId, recipe);
                                            }
                                        });

                                        return (
                                            <div
                                                key={product.productId}
                                                className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setProductModalOpen(true);
                                                }}
                                            >
                                                {/* Product Image */}
                                                {imageUrl ? (
                                                    <div className="w-full h-32 bg-gray-100 rounded-t-lg overflow-hidden">
                                                        <img
                                                            src={imageUrl}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-full h-32 bg-amber-50 flex items-center justify-center">
                                                        <Coffee className="w-12 h-12 text-amber-300" />
                                                    </div>
                                                )}
                                                
                                                {/* Product Info */}
                                                <div className="p-4">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <h3 className="text-base font-semibold text-gray-900 line-clamp-1">{product.name}</h3>
                                                        {product.category && (
                                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium ml-2 flex-shrink-0">
                                                                {product.category.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Sizes */}
                                                    <div className="mt-3 min-h-[3rem]">
                                                        {availableSizes.length > 0 ? (
                                                            <>
                                                                <p className="text-xs text-gray-500 mb-1.5">Sizes:</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {availableSizes.map((pd) => {
                                                                        const hasRecipe = recipesBySize.has(pd.pdId);
                                                                        return (
                                                                            <span
                                                                                key={pd.pdId}
                                                                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                                    hasRecipe
                                                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                                                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                                                                                }`}
                                                                            >
                                                                                {pd.size?.name || 'N/A'}
                                                                                {hasRecipe && <ChefHat className="w-3 h-3 inline ml-1" />}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="h-8"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <RecipeDetailModal
                open={detailOpen}
                onClose={closeDetail}
                recipe={detail}
                productImageUrl={detail ? (() => {
                    const product = products.find(p => 
                        p.productDetails?.some(pd => pd.pdId === detail.productDetail?.pdId)
                    );
                    return product ? getProductImageUrl(product) : null;
                })() : null}
            />

            {/* Product Recipe Modal */}
            {selectedProduct && (
                <ProductRecipeModal
                    product={selectedProduct}
                    recipes={groupedByProduct.find(item => item.product.productId === selectedProduct.productId)?.recipes || []}
                    open={productModalOpen}
                    onClose={() => {
                        setProductModalOpen(false);
                        setSelectedProduct(null);
                    }}
                />
            )}
                    </div>
                </div>
            </div>
        </div>
    );
}


