import React, { useEffect, useState, useCallback, useRef } from 'react';
import { catalogService } from '../../services';
import { CatalogProduct, CatalogSize, CatalogCategory, ProductSearchParams, CatalogRecipe } from '../../types';
import { toast } from 'react-hot-toast';
import { Coffee, Plus, Settings, Loader, X, Trash2, RefreshCw } from 'lucide-react';
import ProductForm from '../../components/product/ProductForm';
import ProductList from '../../components/product/ProductList';
import ProductModal from '../../components/product/ProductModal';
import ProductDetail from '../../components/product/ProductDetail';
import SizeManager from '../../components/product/SizeManager';
import CategoryManager from '../../components/product/CategoryManager';
import SearchBar from '../../components/product/SearchBar';
import Pagination from '../../components/product/Pagination';
import ConfirmModal from '../../components/common/ConfirmModal';
import RecipeDetailModal from '../../components/recipe/RecipeDetailModal';
import { AdminProductManagementSkeleton } from '../../components/admin/skeletons';

type ModalType = 'create' | 'edit' | 'view' | null;


const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [sizes, setSizes] = useState<CatalogSize[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSizes, setLoadingSizes] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const firstLoadRef = useRef(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [showDeleted, setShowDeleted] = useState(false);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [showSizeManager, setShowSizeManager] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingSize, setEditingSize] = useState<CatalogSize | null>(null);
  const [showDeleteSizeConfirm, setShowDeleteSizeConfirm] = useState(false);
  const [sizeToDelete, setSizeToDelete] = useState<CatalogSize | null>(null);
  
  // Recipe modal state
  const [selectedRecipe, setSelectedRecipe] = useState<CatalogRecipe | null>(null);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [search]);

  // Show search loading when search changes but debounced hasn't updated yet
  useEffect(() => {
    if (search !== debouncedSearch) {
      setSearchLoading(true);
    } else {
      setSearchLoading(false);
    }
  }, [search, debouncedSearch]);

  useEffect(() => {
    // On first mount: full load; subsequent changes: soft update without blanking UI
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      loadProducts({ initial: true });
    } else {
      loadProducts({ soft: true });
    }
  }, [currentPage, debouncedSearch, category, showDeleted]);

  const loadInitialData = async () => {
    // Load sizes and categories in parallel, update as soon as each completes
    const loadSizes = async () => {
      try {
        setLoadingSizes(true);
        const sizesData = await catalogService.getSizes();
        setSizes(sizesData);
      } catch (error) {
        console.error('Error loading sizes:', error);
        toast.error('Unable to load sizes!');
      } finally {
        setLoadingSizes(false);
      }
    };

    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesData = await catalogService.getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Unable to load categories!');
      } finally {
        setLoadingCategories(false);
      }
    };

    // Load in parallel
    await Promise.all([loadSizes(), loadCategories()]);
  };

  const loadProducts = async ({ initial = false, soft = false }: { initial?: boolean; soft?: boolean } = {}) => {
    try {
      if (initial) setLoading(true);
      if (soft) setIsUpdating(true);
      
      const searchParams: ProductSearchParams = {
        page: currentPage,
        size: pageSize,
        search: debouncedSearch || undefined,
        categoryId: category ? categories.find(c => c.name === category)?.categoryId : undefined,
        active: showDeleted ? false : true, // Default to active products, show deleted when toggled
        sortBy: 'createAt',
        sortDirection: 'DESC'
      };
      
      const response = await catalogService.searchProducts(searchParams);
      setProducts(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Unable to load product list!');
    } finally {
      if (initial) setLoading(false);
      if (soft) setIsUpdating(false);
    }
  };

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(0);
  }, []);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setCurrentPage(0);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setModalType('create');
  };

  const handleEdit = async (product: CatalogProduct) => {
    try {
      setSelectedProduct(product);
      setModalType('edit');
    } catch (error) {
      console.error('Error loading product details:', error);
      toast.error('Unable to load product information!');
    }
  };

  const handleView = async (product: CatalogProduct) => {
    try {
      setSelectedProduct(product);
      setModalType('view');
    } catch (error) {
      console.error('Error loading product details:', error);
      toast.error('Unable to load product information!');
    }
  };

  const handleDelete = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    try {
      await catalogService.deleteProduct(parseInt(productToDelete));
      toast.success('Product deleted successfully!');
      
      // Optimistic update - remove from local state
      setProducts(prevProducts => prevProducts.filter(p => p.productId !== parseInt(productToDelete)));
      setTotalElements(prev => Math.max(0, prev - 1));
      
      // If current page becomes empty and not first page, go to previous page
      const remainingProducts = products.filter(p => p.productId !== parseInt(productToDelete));
      if (remainingProducts.length === 0 && currentPage > 0) {
        setCurrentPage(prev => Math.max(0, prev - 1));
        loadProducts({ soft: true });
      }
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Unable to delete product!');
    } finally {
      setShowDeleteConfirm(false);
      setProductToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadInitialData();
      await loadProducts({ initial: true });
      toast.success('Data refreshed!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Unable to refresh data!');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (productId: string) => {
    try {
      // Update product to set active = true
      await catalogService.updateProduct(parseInt(productId), { active: true });
      toast.success('Product restored successfully!');
      
      // Optimistic update - update in local state
      setProducts(prevProducts => 
        prevProducts.map(p => p.productId === parseInt(productId) ? { ...p, active: true } : p)
      );
    } catch (error: any) {
      console.error('Error restoring product:', error);
      toast.error(error.message || 'Unable to restore product!');
    }
  };

  const handleEditSize = (size: CatalogSize) => {
    setEditingSize(size);
    setShowSizeManager(true);
  };

  const handleCloseSizeManager = () => {
    setShowSizeManager(false);
    setEditingSize(null);
  };

  const handleDeleteSize = (size: CatalogSize) => {
    setSizeToDelete(size);
    setShowDeleteSizeConfirm(true);
  };

  const confirmDeleteSize = async () => {
    if (!sizeToDelete) return;
    
    try {
      await catalogService.deleteSize(sizeToDelete.sizeId);
      toast.success('Size deleted successfully!');
      await loadInitialData(); // Refresh sizes data
    } catch (error: any) {
      console.error('Error deleting size:', error);
      toast.error(error.message || 'Unable to delete size!');
    } finally {
      setShowDeleteSizeConfirm(false);
      setSizeToDelete(null);
    }
  };

  const cancelDeleteSize = () => {
    setShowDeleteSizeConfirm(false);
    setSizeToDelete(null);
  };

  const handleSubmit = async (
    _product: Omit<CatalogProduct, 'productId' | 'createAt' | 'updateAt' | 'productDetails'> & { selectedFile?: File | null },
    _prices: { size_id: string; price: number }[]
  ) => {
    try {
      setSubmitting(true);
      let imageUrl: string | undefined = _product.imageUrl || undefined;
      if (_product.selectedFile) {
        imageUrl = await catalogService.uploadProductImage(_product.selectedFile);
      }

      const payload = {
        name: _product.name,
        categoryId: _product.category?.categoryId as number,
        sku: _product.sku,
        description: _product.description,
        active: _product.active,
        imageUrl,
        productSizes: _prices.map(p => ({
          sizeId: parseInt(p.size_id, 10),
          price: p.price,
        }))
      };

      if (selectedProduct) {
        // Update existing product
        const updatedProduct = await catalogService.updateProduct(selectedProduct.productId, payload as any);
        toast.success('Product updated successfully');
        
        // Optimistic update - replace in local state
        setProducts(prevProducts => 
          prevProducts.map(p => p.productId === updatedProduct.productId ? updatedProduct : p)
        );
      } else {
        // Create new product
        const newProduct = await catalogService.createProduct(payload as any);
        toast.success('Product created successfully');
        
        // Optimistic update - add to local state
        setTotalElements(prev => prev + 1);
        setProducts(prevProducts => {
          const next = [newProduct, ...prevProducts];
          // If exceeds page size, need to reload to get correct pagination
          if (next.length > pageSize) {
            loadProducts({ soft: true });
            return prevProducts;
          }
          return next;
        });
        
        // If not on first page, reload to get correct data
        if (currentPage > 0) {
          loadProducts({ soft: true });
        }
      }
      
      setModalType(null);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Unable to save product!');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedProduct(null);
  };

  // Recipe modal handlers
  const handleViewRecipe = (recipe: CatalogRecipe) => {
    setSelectedRecipe(recipe);
    setRecipeModalOpen(true);
  };

  const closeRecipeModal = () => {
    setRecipeModalOpen(false);
    setSelectedRecipe(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-2">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Product Management</h1>
              <p className="text-sm text-slate-500">Coffee shop catalog & pricing</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="p-8 pt-4">
            {/* Additional Info Section - Above search bar */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Available Sizes - CRUD Table */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Sizes</h2>
                    <button
                      onClick={() => setShowSizeManager(true)}
                      className="flex items-center space-x-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                      disabled={loadingSizes}
                    >
                      <span>Manage Sizes</span>
                    </button>
                  </div>
                  
                  {/* Size Statistics */}
                  {loadingSizes ? (
                    <div className="animate-pulse">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-200 rounded-lg p-3 h-16"></div>
                        <div className="bg-slate-200 rounded-lg p-3 h-16"></div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(3)].map((_, idx) => (
                          <div key={idx} className="h-8 bg-slate-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-blue-600">{sizes.length}</div>
                          <div className="text-xs text-blue-800">Total Sizes</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-green-600">
                            {products.reduce((acc, product) => acc + product.productDetails.length, 0)}
                          </div>
                          <div className="text-xs text-green-800">Size Variants</div>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto max-h-32 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 font-medium text-gray-700">Name</th>
                              <th className="text-left py-2 font-medium text-gray-700">Description</th>
                              <th className="text-center py-2 font-medium text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sizes.slice(0, 5).map(size => (
                          <tr key={size.sizeId} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 font-medium text-gray-900 max-w-[80px] truncate" title={size.name}>{size.name}</td>
                            <td className="py-2 text-gray-600 max-w-[150px] truncate" title={size.description || '—'}>{size.description || '—'}</td>
                            <td className="py-2 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => handleEditSize(size)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit size"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSize(size)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete size"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!sizes.length && (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">
                              No sizes available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {sizes.length > 5 && (
                      <div className="text-center mt-2">
                        <button
                          onClick={() => setShowSizeManager(true)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View all {sizes.length} sizes
                        </button>
                      </div>
                    )}
                  </div>
                    </>
                  )}
                </div>
              </div>

              {/* Category Management - Small Section */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Categories</h2>
                    <button
                      onClick={() => setShowCategoryManager(true)}
                      className="flex items-center space-x-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                      disabled={loadingCategories}
                    >
                      <span>Manage Categories</span>
                    </button>
                  </div>
                  
                  {/* Category Statistics */}
                  {loadingCategories ? (
                    <div className="animate-pulse">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-200 rounded-lg p-3 h-16"></div>
                        <div className="bg-slate-200 rounded-lg p-3 h-16"></div>
                      </div>
                      <div className="space-y-2">
                        {[...Array(3)].map((_, idx) => (
                          <div key={idx} className="h-8 bg-slate-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-green-50 rounded-lg p-3">
                          <div className="text-xl font-bold text-green-600">{categories.length}</div>
                          <div className="text-xs text-green-800">Total Categories</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-purple-600">
                        {products.filter(p => p.category).length}
                      </div>
                      <div className="text-xs text-purple-800">Categorized Products</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {categories.slice(0, 5).map(category => (
                      <div key={category.categoryId} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                        <div className="pr-3">
                          <span className="font-medium text-gray-900">{category.name}</span>
                          {category.description && (
                            <p className="text-sm text-gray-500">{category.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                          {products.filter(p => p.category?.name === category.name).length} products
                        </span>
                      </div>
                    ))}
                    {categories.length > 5 && (
                      <div className="text-center">
                        <button
                          onClick={() => setShowCategoryManager(true)}
                          className="text-sm text-green-600 hover:text-green-800 font-medium"
                        >
                          View all {categories.length} categories
                        </button>
                      </div>
                    )}
                    {!categories.length && (
                      <div className="text-center py-4 text-gray-500">
                        No categories available
                      </div>
                    )}
                  </div>
                    </>
                  )}
                </div>
              </div>

              {/* Product Statistics - Third Column */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Products</h2>
                    <button
                      onClick={handleCreate}
                      className="flex items-center space-x-1 text-sm bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Product</span>
                    </button>
                  </div>
                  
                  {/* Product Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-blue-600">{totalElements}</div>
                      <div className="text-xs text-blue-800">Total Products</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-green-600">
                        {products.filter(p => p.active).length}
                      </div>
                      <div className="text-xs text-green-800">Active Products</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">All Products</span>
                        <p className="text-sm text-gray-500">Complete product catalog</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {totalElements} items
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-gray-900">Active Products</span>
                        <p className="text-sm text-gray-500">Currently available</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {products.filter(p => p.active).length} items
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading && products.length === 0 ? (
              <AdminProductManagementSkeleton />
            ) : (
              <>
                {/* Search Bar - Below overview section */}
                <div className="mb-6">
                  <SearchBar
                    search={search}
                    category={category}
                    onSearchChange={handleSearch}
                    onCategoryChange={handleCategoryChange}
                    searchLoading={searchLoading}
                  />
                </div>

                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-gray-600">
                      Found <span className="font-semibold text-gray-900">{totalElements}</span> products
                      {showDeleted && <span className="text-red-600 ml-1">(Deleted)</span>}
                    </p>
                    <button
                      onClick={() => {
                        setShowDeleted(!showDeleted);
                        setCurrentPage(0);
                      }}
                      className={`flex items-center space-x-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        showDeleted 
                          ? 'bg-red-600 text-white hover:bg-red-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{showDeleted ? 'Show Active' : 'Show Deleted'}</span>
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isUpdating && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Loader className="w-4 h-4 animate-spin mr-2 text-amber-600" /> Updating...
                      </div>
                    )}
                    <button
                      onClick={handleCreate}
                      className="flex items-center space-x-1 text-sm bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Product</span>
                    </button>
                  </div>
                </div>

                <ProductList
                  products={products}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                  onRestore={handleRestore}
                />

                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      currentPage={currentPage + 1}
                      totalPages={totalPages}
                      onPageChange={(page) => setCurrentPage(page - 1)}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>


      <ProductModal
        isOpen={modalType === 'create' || modalType === 'edit'}
        onClose={closeModal}
        title={modalType === 'create' ? 'Add New Product' : 'Edit Product'}
      >
        <ProductForm
          product={selectedProduct || undefined}
          sizes={sizes}
          categories={categories}
          initialPrices={selectedProduct?.productDetails?.map(pd => ({
            size_id: pd.size ? pd.size.sizeId.toString() : '-1',
            price: pd.price,
            product_size_id: pd.pdId?.toString()
          }))}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          loading={submitting}
        />
      </ProductModal>

      <ProductModal
        isOpen={modalType === 'view'}
        onClose={closeModal}
        title="Product Details"
      >
        {selectedProduct && <ProductDetail product={selectedProduct} onViewRecipe={handleViewRecipe} />}
      </ProductModal>

      {showSizeManager && (
        <SizeManager
          onClose={handleCloseSizeManager}
          onSizesUpdated={loadInitialData}
          editingSize={editingSize}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          onClose={() => setShowCategoryManager(false)}
          onCategoriesUpdated={loadInitialData}
        />
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <ConfirmModal
        open={showDeleteSizeConfirm}
        title="Delete Size"
        description={`Bạn có chắc chắn muốn xóa size "${sizeToDelete?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteSize}
        onCancel={cancelDeleteSize}
      />

      {/* Global Recipe Detail Modal */}
      <RecipeDetailModal
        open={recipeModalOpen}
        onClose={closeRecipeModal}
        recipe={selectedRecipe}
      />
    </div>
  );
};

export default ProductManagement;


