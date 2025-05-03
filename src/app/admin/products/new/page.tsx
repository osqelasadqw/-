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
      newErrors.name = 'პროდუქტის სახელი აუცილებელია';
    }
    
    if (!description.trim()) {
      newErrors.description = 'პროდუქტის აღწერა აუცილებელია';
    }
    
    if (!price.trim()) {
      newErrors.price = 'ფასი აუცილებელია';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      newErrors.price = 'ფასი უნდა იყოს დადებითი რიცხვი';
    }
    
    if (stock && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      newErrors.stock = 'მარაგი უნდა იყოს არაუარყოფითი რიცხვი';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    // Check if adding these files would exceed the MAX_IMAGES limit
    if (imageFiles.length + files.length > MAX_IMAGES) {
      setUploadError(`მაქსიმუმ ${MAX_IMAGES} სურათის ატვირთვაა შესაძლებელი ერთ პროდუქტზე`);
      return;
    }
    
    // Check individual file sizes
    const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      setUploadError(`${oversizedFiles.length} სურათის ზომა აღემატება დასაშვებს (5MB)`);
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
      const errorMessage = error instanceof Error ? error.message : 'სურათების ატვირთვა ვერ მოხერხდა';
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
      setUploadError("გთხოვთ შეავსოთ ფორმა ან დაამატოთ პროდუქტები შმეგის გამოყენებით");
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
        toast.success('პროდუქტი წარმატებით დაემატა!');
        toast.info('ახლა დაიწყება დაქეშილი პროდუქტების ატვირთვა...');
        
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
      const errorMessage = error instanceof Error ? error.message : 'პროდუქტის შექმნა ვერ მოხერხდა';
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
      toast.success('პროდუქტი დაემატა დროებით სიაში!', {
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
    toast.info('პროდუქტი წაიშალა დროებითი სიიდან');
  };
  
  // ყველა დაქეშილი პროდუქტის ერთად ატვირთვა
  const handleBatchUpload = async () => {
    if (cachedProducts.length === 0) {
      toast.error('დასამატებელი პროდუქტების სია ცარიელია');
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
        toast.success(`${successCount} პროდუქტი წარმატებით დაემატა!`);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} პროდუქტის დამატება ვერ მოხერხდა`);
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
      toast.error('პროდუქტების ატვირთვისას დაფიქსირდა შეცდომა');
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
            <h1 className="text-2xl font-bold">პროდუქტის დამატება</h1>
            <p className="text-muted-foreground mt-1">
              შეავსეთ ფორმა ახალი პროდუქტის დასამატებლად
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            უკან დაბრუნება
          </Button>
        </div>

        {/* პროდუქტის დამატების ფორმა */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md">
                <p><strong>შეცდომა:</strong> {uploadError}</p>
              </div>
            )}

            {/* დაქეშილი პროდუქტების ჩვენება */}
            {cachedProducts.length > 0 && (
              <div className="mb-4 border rounded-md p-2 bg-amber-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">დაქეშილი პროდუქტები ({cachedProducts.length})</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleBatchUpload}
                    disabled={uploadingBatch}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-1 h-7"
                  >
                    {uploadingBatch ? 'მიმდინარეობს ატვირთვა...' : 'ყველას ატვირთვა'}
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
                    <Label htmlFor="name">პროდუქტის სახელი</Label>
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
                    <Label htmlFor="price">ფასი (GEL)</Label>
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
                    <Label htmlFor="stock">მარაგი</Label>
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
                    <Label htmlFor="category">კატეგორია</Label>
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
                    <Label htmlFor="images">პროდუქტის სურათები</Label>
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
                          <p className="text-sm text-gray-500 mt-2">აირჩიეთ სურათები</p>
                          <p className="text-xs text-gray-400">მაქსიმუმ {MAX_IMAGES} სურათი, თითო მაქს. 5MB</p>
                          <p className="text-xs text-gray-400">მომხმარებელი სურათებს იხილავს ეტაპობრივად</p>
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
                                    : uploadProgress[index] === 100 ? 'დასრულდა' : 'მზადაა'}
                                </p>
                              </div>
                              
                              {/* Delete button */} 
                              <button 
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-70 hover:opacity-100"
                                aria-label={`წაშალე სურათი ${index + 1}`}
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
                  <Label htmlFor="description">პროდუქტის აღწერა</Label>
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
                  გაუქმება
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
                  შემდეგი
                </Button>
                
                <Button 
                  form="product-form"
                  type="submit" 
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading || isUploading}
                >
                  {isSubmitting || isUploading ? 'მიმდინარეობს შენახვა...' : 'პროდუქტის დამატება'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}