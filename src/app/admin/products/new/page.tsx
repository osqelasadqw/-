'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { getCategories, createProduct, uploadImagesToFirebase, MAX_IMAGES, MAX_FILE_SIZE } from '@/lib/firebase-service';
import { Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, X, Zap, Save, Tag, Plus } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/language-provider';

// ქეშირებული პროდუქტის ტიპი
interface CachedProduct {
  id: string; // დროებითი ID
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  imageFiles: File[];
}

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Image upload states
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // დაქეშილი პროდუქტების სტეიტი
  const [cachedProducts, setCachedProducts] = useState<CachedProduct[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [uploadingBatch, setUploadingBatch] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(-1);

  const { t } = useLanguage();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setCategoryId(categoriesData[0].id);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) {
      newErrors.name = t('admin.nameRequired');
    }
    
    if (!description.trim()) {
      newErrors.description = t('admin.descriptionRequired');
    }
    
    if (!price.trim()) {
      newErrors.price = t('admin.priceRequired');
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      newErrors.price = t('admin.invalidPrice');
    }
    
    if (stock && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      newErrors.stock = t('admin.invalidStock');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Check if adding these files would exceed the MAX_IMAGES limit
    if (imageFiles.length + files.length > MAX_IMAGES) {
      setUploadError(t('admin.maxImagesExceeded'));
      return;
    }
    
    // Check individual file sizes
    const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setUploadError(t('admin.oversizedImages'));
      return;
    }
    
    const newFiles = Array.from(files);
    
    // Create previews for the files
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    
    // Update state with new files and previews
    setImageFiles(prev => [...prev, ...newFiles]);
    setImagePreviews(prev => [...prev, ...newPreviews]);
    setUploadProgress(prev => [...prev, ...Array(files.length).fill(0)]);
    
    // Clear any previous errors
    setUploadError(null);
  };

  const removeImage = (index: number) => {
    setImageFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setImagePreviews(prevPreviews => {
      // Revoke the URL to avoid memory leaks
      URL.revokeObjectURL(prevPreviews[index]);
      return prevPreviews.filter((_, i) => i !== index);
    });
    setUploadProgress(prevProgress => prevProgress.filter((_, i) => i !== index));
    if (uploadError && imageFiles.length <= MAX_IMAGES) {
      setUploadError(null);
    }
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (!files.length) return [];
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Use our new utility function that handles WebP conversion and uploading
      const imageUrls = await uploadImagesToFirebase(
        files,
        (index, progress) => {
          setUploadProgress(prevProgress => {
            const newProgress = [...prevProgress];
            newProgress[index] = progress;
            return newProgress;
          });
        }
      );
      
      return imageUrls;
    } catch (error) {
      console.error('Error uploading images:', error);
      const errorMessage = error instanceof Error ? error.message : t('admin.uploadingImages');
      setUploadError(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // შევამოწმოთ არის თუ არა ფორმა ცარიელი
    const isFormEmpty = !name.trim() && !description.trim() && !price.trim() && imageFiles.length === 0;
    
    // თუ ფორმა ცარიელია და გვაქვს დაქეშილი პროდუქტები, დავიწყოთ ბატჩ ატვირთვა
    if (isFormEmpty && cachedProducts.length > 0) {
      handleBatchUpload();
      return;
    }
    
    // თუ ფორმა ცარიელია და არ გვაქვს დაქეშილი პროდუქტები, გამოვაჩინოთ შეტყობინება
    if (isFormEmpty && cachedProducts.length === 0) {
      setUploadError(t('admin.emptyFormError'));
      return;
    }
    
    // თუ ფორმა არაა ცარიელი, გავაგრძელოთ ვალიდაცია
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      setUploadError(null);
      
      // Upload images first
      const imageUrls = await uploadImages(imageFiles);
      
      // Create the product with image URLs
      await createProduct({
        name,
        description,
        price: parseFloat(price),
        images: imageUrls,
        categoryId,
        stock: parseInt(stock),
      });
      
      // თუ შევქმენით პროდუქტი და გვაქვს დაქეშილი პროდუქტებიც, ვატვირთოთ ისინიც
      if (cachedProducts.length > 0) {
        toast.success(t('admin.productAdded'));
        toast.info(t('admin.startUploadingCache'));
        
        // გავასუფთაოთ ფორმა
        setName('');
        setDescription('');
        setPrice('');
        setStock('0');
        setImageFiles([]);
        setImagePreviews([]);
        setUploadProgress([]);
        setErrors({});
        
        // დავიწყოთ დაქეშილი პროდუქტების ატვირთვა
        await handleBatchUpload();
      } else {
        // Redirect to products list
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : t('admin.productCreateError');
      setUploadError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // შმეგი ფუნქციონალი - პროდუქტის ლოკალურად დაქეშვა
  const handleShmegi = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      // დავამატოთ პროდუქტი ქეშში
      const cachedProduct: CachedProduct = {
        id: uuidv4(), // დროებითი ID
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        categoryId: categoryId,
        imageFiles: [...imageFiles], // ვაკეთებთ ასლს იმიჯ ფაილების
      };
      
      setCachedProducts(prev => [...prev, cachedProduct]);
      
      // გავასუფთაოთ ფორმა ახალი პროდუქტისთვის
      setName('');
      setImageFiles([]);
      setImagePreviews([]);
      setUploadProgress([]);
      setErrors({});
      setUploadError(null);
      
      // შეტყობინება
      toast.success(t('admin.productAddedToCache'), {
        description: `${cachedProducts.length + 1} პროდუქტი დაქეშილია`
      });
      
      // ფოკუსი დავაბრუნოთ სახელის ველზე
      document.getElementById('name')?.focus();
      
    } catch (error) {
      console.error('Error caching product:', error);
      const errorMessage = error instanceof Error ? error.message : 'პროდუქტის დაქეშვა ვერ მოხერხდა';
      setUploadError(errorMessage);
    }
  };
  
  // წაშლის ღილაკის ჰენდლერი
  const handleRemoveCachedProduct = (id: string) => {
    setCachedProducts(prev => prev.filter(product => product.id !== id));
    toast.info(t('admin.productRemovedFromCache'));
  };
  
  // ყველა დაქეშილი პროდუქტის ერთად ატვირთვა
  const handleBatchUpload = async () => {
    if (cachedProducts.length === 0) {
      toast.error(t('admin.cacheEmpty'));
      return;
    }
    
    setUploadingBatch(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      // თითოეული პროდუქტის დამატება თანმიმდევრობით
      for (let i = 0; i < cachedProducts.length; i++) {
        setCurrentUploadIndex(i);
        const product = cachedProducts[i];
        
        try {
          // სურათების ატვირთვა
          const imageUrls = await uploadImages(product.imageFiles);
          
          // პროდუქტის შექმნა
          await createProduct({
            name: product.name,
            description: product.description,
            price: product.price,
            images: imageUrls,
            categoryId: product.categoryId,
            stock: product.stock,
          });
          
          successCount++;
        } catch (error) {
          console.error(`Error uploading product ${product.name}:`, error);
          failCount++;
        }
      }
      
      // შეტყობინება შედეგების შესახებ
      if (successCount > 0) {
        toast.success(t('admin.productsSuccessfullyAdded'));
      }
      
      if (failCount > 0) {
        toast.error(t('admin.someProductsFailedUpload'));
      }
      
      // გავასუფთაოთ ქეში
      if (successCount === cachedProducts.length) {
        setCachedProducts([]);
        // გადავამისამართოთ პროდუქტების გვერდზე
        router.push('/admin/products');
      } else {
        // მხოლოდ წარმატებული პროდუქტები წავშალოთ
        setCachedProducts(prev => prev.slice(successCount));
      }
      
    } catch (error) {
      console.error('Error in batch upload:', error);
      toast.error(t('admin.uploadError'));
    } finally {
      setUploadingBatch(false);
      setCurrentUploadIndex(-1);
    }
  };
  
  // გავხსნათ ფორმა ახალი პროდუქტის დასამატებლად
  const showAddForm = () => {
    setShowForm(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('addProductPage.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('addProductPage.description')}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('addProductPage.backButton')}
          </Button>
        </div>

        {/* პროდუქტის დამატების ფორმა */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
                <p><strong>{t('addProductPage.error')}:</strong> {uploadError}</p>
              </div>
            )}

            {/* დაქეშილი პროდუქტების ჩვენება */}
            {cachedProducts.length > 0 && (
              <div className="mb-4 border rounded-md p-2 bg-amber-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">{t('addProductPage.cachedProductsTitle')} ({cachedProducts.length})</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleBatchUpload}
                    disabled={uploadingBatch}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-1 h-7"
                  >
                    {uploadingBatch ? 'მიმდინარეობს ატვირთვა...' : t('addProductPage.uploadAll')}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cachedProducts.map((product, index) => (
                    <div 
                      key={product.id} 
                      className={`relative border rounded-md px-2 py-1 bg-white ${currentUploadIndex === index ? 'border-green-500 bg-green-50' : 'border-amber-200'}`}
                    >
                      <span className="text-xs">{product.name}</span>
                      <button
                        type="button"
                        className="ml-2 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveCachedProduct(product.id)}
                        disabled={uploadingBatch}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">{t('addProductPage.nameLabel')}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={errors.name ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="price">{t('addProductPage.priceLabel')} (GEL)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={errors.price ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="stock">{t('addProductPage.stockLabel')}</Label>
                    <Input
                      id="stock"
                      type="number"
                      step="1"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className={errors.stock ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.stock && (
                      <p className="mt-1 text-sm text-red-500">{errors.stock}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="category">{t('addProductPage.categoryLabel')}</Label>
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      disabled={isSubmitting || isLoading}
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <Label htmlFor="images">{t('addProductPage.imagesLabel')}</Label>
                    <div className="mt-1">
                      <div className="flex items-center justify-center w-full border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => document.getElementById('image-upload')?.click()}>
                        <input 
                          id="image-upload" 
                          type="file" 
                          accept="image/jpeg,image/png,image/webp,image/gif" 
                          multiple 
                          onChange={handleImageChange} 
                          className="hidden"
                          disabled={isSubmitting || isUploading} 
                        />
                        <div className="text-center">
                          <Upload className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-sm text-gray-500 mt-2">{t('addProductPage.selectImages')}</p>
                          <p className="text-xs text-gray-400">{t('addProductPage.maxImages')} {MAX_IMAGES}, {t('addProductPage.maxFileSize')} 5MB</p>
                          <p className="text-xs text-gray-400">{t('addProductPage.userPreview')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Image Previews with Upload Progress */}
                    {imagePreviews.length > 0 && (
                      <div className="mt-4 border rounded-md p-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {imagePreviews.map((preview, index) => (
                            <div key={index} className="relative aspect-square border border-dashed rounded-md overflow-hidden">
                              <Image 
                                src={preview} 
                                alt={`Preview ${index}`} 
                                width={150}
                                height={150}
                                className="w-full h-full object-contain" 
                              />
                              
                              {/* Progress Text below image area */} 
                              <div className="absolute bottom-0 left-0 right-0 p-1 bg-white bg-opacity-75">
                                <p className="text-xs text-gray-700 text-center">
                                  {uploadProgress[index] > 0 && uploadProgress[index] < 100 
                                    ? `${uploadProgress[index].toFixed(0)}%` 
                                    : uploadProgress[index] === 100 ? t('addProductPage.completed') : t('addProductPage.preparing')}
                                </p>
                              </div>
                              
                              {/* Delete button */} 
                              <button 
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-70 hover:opacity-100"
                                aria-label={`${t('addProductPage.removeImage')} ${index + 1}`}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">{t('addProductPage.descriptionLabel')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`h-40 ${errors.description ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                  )}
                </div>
              </div>
              
              {/* ადგილი ბოლოში, რომ ღილაკებმა არ დაფაროს კონტენტი */}
              <div className="pb-16"></div>
            </form>
            
            {/* ღილაკები ფიქსირებული ქვემოთ */}
            <div className="fixed bottom-5 right-8 z-50 bg-white shadow-lg rounded-md p-2 border">
              <div className="inline-flex items-center space-x-4">
                <Button
                  form="product-form"
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting || isUploading}
                >
                  {t('addProductPage.cancel')}
                </Button>
                
                {/* შმეგი ღილაკი */}
                <Button 
                  form="product-form"
                  type="button" 
                  onClick={handleShmegi}
                  disabled={isSubmitting || isLoading || isUploading}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {t('addProductPage.next')}
                </Button>
                
                <Button 
                  form="product-form"
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading || isUploading}
                >
                  {isSubmitting || isUploading ? t('addProductPage.processing') : t('addProductPage.addProduct')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}