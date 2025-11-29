import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { CatalogSize, CatalogProduct, CatalogCategory } from '../../types';
import { Plus, X } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';

interface ProductFormProps {
  product?: CatalogProduct;
  sizes: CatalogSize[];
  categories: CatalogCategory[];
  initialPrices?: { size_id: string; price: number; product_size_id?: string }[];
  onSubmit: (
    product: Omit<CatalogProduct, 'productId' | 'createAt' | 'updateAt' | 'productDetails'> & {
      selectedFile?: File | null;
      previewUrl?: string | null;
    },
    prices: { size_id: string; price: number; product_size_id?: string }[]
  ) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface SelectedSize {
  size_id: string;
  price: string;
}

export default function ProductForm({
  product,
  sizes,
  categories,
  initialPrices = [],
  onSubmit,
  onCancel,
  loading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    description: product?.description || '',
    category: product?.category || null,
    imageUrl: product?.imageUrl || '',
    active: product?.active ?? true,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.imageUrl || null);

  const [selectedSizes, setSelectedSizes] = useState<SelectedSize[]>(
    initialPrices
      .filter(p => p.size_id && p.size_id !== '-1')
      .map(p => ({ size_id: p.size_id, price: p.price.toString() }))
  );

  // Price for products WITHOUT sizes (represented with size_id = '-1')
  const [noSizePrice, setNoSizePrice] = useState<string>(
    (() => {
      const found = initialPrices.find(p => !p.size_id || p.size_id === '-1');
      return found ? found.price.toString() : '';
    })()
  );

  // Derived states for mutual exclusivity
  const hasSizeRows = selectedSizes.length > 0;
  const hasSinglePriceValue = noSizePrice.trim() !== '';

  // Form errors
  const [errors, setErrors] = useState({
    name: '',
    sku: '',
    category: '',
    description: '',
    image: '',
    price: '',
  });

  // Default category to the first item if none is selected (creation mode)
  useEffect(() => {
    if (!product && categories.length > 0 && !formData.category) {
      setFormData(prev => ({ ...prev, category: categories[0] }));
    }
  }, [categories, product, formData.category]);

  const validateName = (value: string) => {
    if (!value.trim()) return 'Product name is required';
    return '';
  };
  const validateCategory = (cat: CatalogCategory | null) => {
    if (!cat) return 'Category is required';
    return '';
  };
  const validateSku = (value: string) => {
    if (!value.trim()) return 'SKU is required';
    return '';
  };
  const validateDescription = (value: string) => {
    if (!value.trim()) return 'Description is required';
    return '';
  };
  const validateImage = (url: string | null) => {
    if (!url) return 'Product image is required';
    return '';
  };
  const validatePrice = () => {
    const anySizePrice = selectedSizes.some(s => s.price && parseFloat(s.price) > 0);
    const singlePrice = noSizePrice && parseFloat(noSizePrice) > 0;
    if (!anySizePrice && !singlePrice) return 'Please provide at least one price (by size or single price)';
    return '';
  };
  const validateAll = () => {
    const nameErr = validateName(formData.name);
    const skuErr = validateSku(formData.sku);
    const categoryErr = validateCategory(formData.category);
    const descErr = validateDescription(formData.description);
    const imgErr = validateImage(previewUrl);
    const priceErr = validatePrice();
    setErrors({ name: nameErr, sku: skuErr, category: categoryErr, description: descErr, image: imgErr, price: priceErr });
    return !(nameErr || skuErr || categoryErr || descErr || imgErr || priceErr);
  };

  const handleAddSize = () => {
    if (hasSinglePriceValue) return; // button will also be disabled
    if (sizes.length === 0) {
      toast.error('Chưa có size nào! Vui lòng tạo size trước.');
      return;
    }

    const availableSizes = sizes.filter(
      size => !selectedSizes.some(s => s.size_id === size.sizeId.toString())
    );

    if (availableSizes.length === 0) {
      toast.error('Đã thêm tất cả các size!');
      return;
    }

    setSelectedSizes([...selectedSizes, { size_id: availableSizes[0].sizeId.toString(), price: '' }]);
  };

  const handleRemoveSize = (index: number) => {
    setSelectedSizes(selectedSizes.filter((_, i) => i !== index));
  };

  const handleSizeChange = (index: number, size_id: string) => {
    if (hasSinglePriceValue) return;
    const newSelectedSizes = [...selectedSizes];
    newSelectedSizes[index].size_id = size_id;
    setSelectedSizes(newSelectedSizes);
  };

  const handlePriceChange = (index: number, price: string) => {
    if (hasSinglePriceValue) return;
    const newSelectedSizes = [...selectedSizes];
    newSelectedSizes[index].price = price;
    setSelectedSizes(newSelectedSizes);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ ...formData, imageUrl: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll()) {
      return;
    }

    const priceArray = selectedSizes
      .filter(s => s.price && parseFloat(s.price) > 0)
      .map(s => ({
        size_id: s.size_id,
        price: parseFloat(s.price),
      }));

    // Include non-size price if provided (size_id = '-1')
    if (noSizePrice && parseFloat(noSizePrice) > 0) {
      const hasNoSize = priceArray.some(p => p.size_id === '-1');
      if (!hasNoSize) {
        priceArray.push({ size_id: '-1', price: parseFloat(noSizePrice) });
      }
    }

    // If a new file is selected, we'll need to handle file upload
    // For now, we'll pass the file info to the parent component
    const submitData = {
      ...formData,
      selectedFile, // Pass the selected file to parent
      previewUrl,   // Pass preview URL for immediate display
    };

    onSubmit(submitData, priceArray);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (errors.name) setErrors(prev => ({ ...prev, name: validateName(e.target.value) }));
            }}
            onBlur={(e) => setErrors(prev => ({ ...prev, name: validateName(e.target.value) }))}
            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Enter product name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        
        <div>
          <label className="block text-base font-semibold text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.category?.name || ''}
              onChange={(e) => {
                const selectedCategory = categories.find(cat => cat.name === e.target.value);
                setFormData({ ...formData, category: selectedCategory || null });
                if (errors.category) setErrors(prev => ({ ...prev, category: validateCategory(selectedCategory || null) }));
              }}
              onBlur={() => setErrors(prev => ({ ...prev, category: validateCategory(formData.category) }))}
              className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none appearance-none bg-white cursor-pointer transition-all"
            >
              {categories.map((category) => (
                <option key={category.categoryId} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
            </svg>
          </div>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
        </div>
      </div>

      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            if (errors.description) setErrors(prev => ({ ...prev, description: validateDescription(e.target.value) }));
          }}
          onBlur={(e) => setErrors(prev => ({ ...prev, description: validateDescription(e.target.value) }))}
          rows={3}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter product description"
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
      </div>

      {/* SKU - full width below description */}
      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">
          SKU <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.sku}
          onChange={(e) => {
            setFormData({ ...formData, sku: e.target.value });
            if (errors.sku) setErrors(prev => ({ ...prev, sku: validateSku(e.target.value) }));
          }}
          onBlur={(e) => setErrors(prev => ({ ...prev, sku: validateSku(e.target.value) }))}
          className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all ${errors.sku ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Enter SKU"
        />
        {errors.sku && <p className="mt-1 text-sm text-red-600">{errors.sku}</p>}
      </div>

      <div>
        <label className="block text-base font-semibold text-gray-700 mb-2">
          Product Image
        </label>
        
        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={(
                  previewUrl.startsWith('http') ||
                  previewUrl.startsWith('blob:') ||
                  previewUrl.startsWith('data:')
                )
                  ? previewUrl
                  : `${API_BASE_URL}/api/catalogs${previewUrl}`}
                alt="Product preview"
                className="w-32 h-32 object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              {selectedFile ? `Selected: ${selectedFile.name}` : 'Current image'}
            </p>
          </div>
        ) : (
          <label
            htmlFor="image-upload"
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-amber-400 transition-colors cursor-pointer block"
          >
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-500">Click to select an image</p>
              <p className="text-xs text-gray-400">JPEG, PNG, GIF, WebP (max 5MB)</p>
            </div>
          </label>
        )}
        {errors.image && <p className="mt-2 text-sm text-red-600">{errors.image}</p>}
        
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id="image-upload"
        />
        <label
          htmlFor="image-upload"
          className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {previewUrl ? 'Change Image' : 'Select Image'}
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-base font-semibold text-gray-700">
            Price by Size
          </label>
          <button
            type="button"
            onClick={handleAddSize}
            disabled={hasSinglePriceValue}
            className="flex items-center space-x-1 text-base bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors font-medium disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>Add Size</span>
          </button>
        </div>

        {selectedSizes.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">No sizes added. Click "Add Size" to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedSizes.map((selectedSize, index) => {
              const availableSizes = sizes.filter(
                size =>
                  size.sizeId.toString() === selectedSize.size_id ||
                  !selectedSizes.some(s => s.size_id === size.sizeId.toString())
              );

              return (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <select
                      value={selectedSize.size_id}
                      onChange={(e) => handleSizeChange(index, e.target.value)}
                      disabled={hasSinglePriceValue}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {availableSizes.map(size => (
                        <option key={size.sizeId} value={size.sizeId.toString()}>
                          Size {size.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={selectedSize.price}
                      onChange={(e) => handlePriceChange(index, e.target.value)}
                      disabled={hasSinglePriceValue}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter price"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      đ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSize(index)}
                    disabled={hasSinglePriceValue}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Single price for products without sizes */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            If this product has no size, enter its price here:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.01"
              value={noSizePrice}
              onChange={(e) => setNoSizePrice(e.target.value)}
              disabled={hasSizeRows}
              className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="Enter price"
            />
            <span className="text-gray-500 text-sm">đ</span>
          </div>
          {errors.price && !hasSizeRows && <p className="mt-2 text-sm text-red-600">{errors.price}</p>}
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.active}
          onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
          className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500 cursor-pointer"
        />
        <label htmlFor="is_active" className="ml-3 text-base font-medium text-gray-700 cursor-pointer">
          Activate product
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium disabled:opacity-50 shadow-md"
        >
          {loading ? 'Processing...' : product ? 'Update' : 'Add New'}
        </button>
      </div>
    </form>
  );
}
