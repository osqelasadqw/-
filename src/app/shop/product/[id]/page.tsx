'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShopLayout } from '@/components/layouts/shop-layout';
import { getProductById, getProductsByCategory } from '@/lib/firebase-service';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { useCart } from '@/components/providers/cart-provider';
import { ShoppingCart, Minus, Plus, X, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedSortOption, setRelatedSortOption] = useState<SortOption>('newest'); // Default sort
  const _router = useRouter(); // გამოუყენებელი ცვლადი
  const [isPublicDiscount, setIsPublicDiscount] = useState(false);
  const [discountedPrice, setDiscountedPrice] = useState(0);
  const [_error, setError] = useState<string | null>(null); // გამოუყენებელი error ცვლადი

  // Filtering state for related products
  const [minMaxPrice, setMinMaxPrice] = useState<[number, number]>([0, 1000]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [userModifiedRange, setUserModifiedRange] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  const fetchProduct = useCallback(async () => {
    try {
      setIsLoading(true);
      if (typeof id !== 'string') return;
      
      const productData = await getProductById(id as string);
      if (!productData) {
        setError('პროდუქტი ვერ მოიძებნა');
        return;
      }
      
      setProduct(productData);
      
      // მხოლოდ საჯარო ფასდაკლების შემოწმება
      const hasPublicDiscount = productData.promoActive && 
        productData.hasPublicDiscount && 
        productData.discountPercentage;
        
      setIsPublicDiscount(!!hasPublicDiscount);
      
      if (hasPublicDiscount && productData.discountPercentage) {
        setDiscountedPrice(productData.price * (1 - (productData.discountPercentage / 100)));
      }
      
      // After fetching the product, fetch related products from the same category
      if (productData?.categoryId) {
        fetchRelatedProducts(productData.categoryId, productData.id);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const fetchRelatedProducts = useCallback(async (categoryId: string, currentProductId: string) => {
    try {
      const products = await getProductsByCategory(categoryId);
      // Filter out the current product
      const otherProducts = products.filter(p => p.id !== currentProductId);
      setRelatedProducts(otherProducts);
      
      // Set min and max price for the filter
      if (otherProducts.length > 0) {
        const prices = otherProducts.map(p => p.price || 0);
        const calculatedMinMax: [number, number] = [
          Math.floor(Math.min(...prices)), 
          Math.ceil(Math.max(...prices))
        ];
        setMinMaxPrice(calculatedMinMax);
        setPriceRange(calculatedMinMax);
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  }, []);

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity(prev => Math.max(1, prev + delta));
  }, []);

  const handleAddToCart = useCallback(() => {
    if (product) {
      // თუ აქვს საჯარო ფასდაკლება, ვქმნით პროდუქტის ასლს შეცვლილი ფასით
      if (isPublicDiscount) {
        const discountedProduct = {
          ...product,
          originalPrice: product.price, // ორიგინალი ფასის შენახვა
          price: discountedPrice // დროებით შეცვლა ფასის კალათში, რომ იყოს ფასდაკლებით
        };
        
        for (let i = 0; i < quantity; i++) {
          addToCart(discountedProduct);
        }
      } else {
        // თუ არ აქვს ფასდაკლება, ჩვეულებრივად ვამატებთ
        for (let i = 0; i < quantity; i++) {
          addToCart(product);
        }
      }
    }
  }, [product, isPublicDiscount, discountedPrice, quantity, addToCart]);

  const nextImage = useCallback(() => {
    if (product?.images && product.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === product.images.length - 1 ? 0 : prev + 1
      );
    }
  }, [product?.images]);

  const prevImage = useCallback(() => {
    if (product?.images && product.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? product.images.length - 1 : prev - 1
      );
    }
  }, [product?.images]);

  const toggleImageZoom = useCallback(() => {
    setIsImageZoomed(!isImageZoomed);
  }, [isImageZoomed]);

  // ფოტოს მოდალის კლავიატურით მართვა
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isImageZoomed) return;
      
      if (e.key === 'ArrowLeft') {
        prevImage();
      } else if (e.key === 'ArrowRight') {
        nextImage();
      } else if (e.key === 'Escape') {
        setIsImageZoomed(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageZoomed, prevImage, nextImage]);

  // Filter functions
  const handleReset = useCallback(() => {
    setPriceRange([minMaxPrice[0], minMaxPrice[1]]);
    setUserModifiedRange(false);
    setRelatedSortOption('newest');
  }, [minMaxPrice]);

  const handleMinPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinPrice = Number(e.target.value);
    if (isNaN(newMinPrice) || newMinPrice < minMaxPrice[0]) return;
    
    if (newMinPrice <= priceRange[1]) {
      setPriceRange(prev => [newMinPrice, prev[1]]);
      setUserModifiedRange(true);
    }
  }, [minMaxPrice, priceRange]);

  const handleMaxPriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newMaxPrice = Number(e.target.value);
    if (isNaN(newMaxPrice) || newMaxPrice > minMaxPrice[1]) return;
    
    if (newMaxPrice >= priceRange[0]) {
      setPriceRange(prev => [prev[0], newMaxPrice]);
      setUserModifiedRange(true);
    }
  }, [minMaxPrice, priceRange]);

  // მემოიზირებული ინტერფეისის კომპონენტები
  const PriceRangeInputs = useCallback(({isMobile}: {isMobile: boolean}) => {
    const idPrefix = isMobile ? 'mobile' : 'desktop';
    return (
      <div className="space-y-4">
        <h2 className="font-medium text-sm">ფასი</h2>
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-center">
            <Label htmlFor={`min-price-${idPrefix}`} className="mb-1 text-xs">მინიმალური</Label>
            <input
              id={`min-price-${idPrefix}`}
              type="number"
              className="border rounded-md px-2 py-1 w-24 text-center"
              min={minMaxPrice[0]}
              max={priceRange[1]}
              value={priceRange[0]}
              onChange={handleMinPriceChange}
            />
          </div>
          <div className="flex items-center justify-center">
            <span className="text-gray-400 mx-2">-</span>
          </div>
          <div className="flex flex-col items-center">
            <Label htmlFor={`max-price-${idPrefix}`} className="mb-1 text-xs">მაქსიმალური</Label>
            <input
              id={`max-price-${idPrefix}`}
              type="number"
              className="border rounded-md px-2 py-1 w-24 text-center"
              min={priceRange[0]}
              max={minMaxPrice[1]}
              value={priceRange[1]}
              onChange={handleMaxPriceChange}
            />
          </div>
        </div>
      </div>
    );
  }, [minMaxPrice, priceRange, handleMinPriceChange, handleMaxPriceChange]);

  const SortSelector = useCallback(() => {
    return (
      <div className="space-y-4">
        <h2 className="font-medium text-sm">დახარისხება</h2>
        <Select
          value={relatedSortOption}
          onValueChange={(value) => setRelatedSortOption(value as SortOption)}
        >
          <SelectTrigger aria-label="დახარისხების პარამეტრები">
            <SelectValue placeholder="აირჩიეთ ვარიანტი" />
          </SelectTrigger>
          <SelectContent className="after:content-[''] after:block after:h-3">
            <SelectItem value="newest">უახლესი</SelectItem>
            <SelectItem value="price-asc">ფასი: დაბლიდან მაღლა</SelectItem>
            <SelectItem value="price-desc">ფასი: მაღლიდან დაბლა</SelectItem>
            <SelectItem value="name-asc">სახელი: ა-ჰ</SelectItem>
            <SelectItem value="name-desc">სახელი: ჰ-ა</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }, [relatedSortOption]);

  // Memoized filtered and sorted related products for performance
  const filteredAndSortedRelatedProducts = useMemo(() => {
    // First filter by price
    const filtered = relatedProducts.filter(product => {
      return !userModifiedRange || (
        product.price >= priceRange[0] && 
        product.price <= priceRange[1]
      );
    });
    
    // Then sort
    const sorted = [...filtered];
    switch (relatedSortOption) {
      case 'price-asc':
        sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest': // No sorting for newest (default)
      default:
        // Don't return here, just use the filtered array
        break;
    }
    return sorted;
  }, [relatedProducts, relatedSortOption, priceRange, userModifiedRange]);

  if (isLoading) {
    return (
      <ShopLayout>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-square bg-gray-200 rounded-md animate-pulse"></div>
          <div className="w-full md:w-1/2 space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse w-1/3 mt-8"></div>
          </div>
        </div>
      </ShopLayout>
    );
  }

  if (!product) {
    return (
      <ShopLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-medium mb-2">პროდუქტი ვერ მოიძებნა</h2>
          <p className="text-muted-foreground">
            მითითებული პროდუქტი არ არსებობს ან წაშლილია.
          </p>
        </div>
      </ShopLayout>
    );
  }

  // Default image if no images are available
  const defaultImage = useMemo(() => 'https://placehold.co/600x600/eee/999?text=No+Image', []);
  const hasMultipleImages = useMemo(() => product?.images && product.images.length > 1, [product?.images]);
  const currentImage = useMemo(() => {
    if (!product?.images || product.images.length === 0) {
      return defaultImage;
    }
    return product.images[currentImageIndex];
  }, [product?.images, currentImageIndex, defaultImage]);

  return (
    <ShopLayout>
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{product.name}</h1>
          {product.categoryId && (
            <div className="text-sm text-muted-foreground mb-4">
              <Link href={`/shop?category=${product.categoryId}`} className="hover:underline">
                {(product as any).category || 'კატეგორია'}
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile filter trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="md:hidden flex items-center gap-1 text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>ფილტრი</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm">
              <SheetHeader>
                <SheetTitle>ფილტრი</SheetTitle>
                <SheetDescription>
                  დააფილტრეთ და დაალაგეთ მსგავსი პროდუქტები
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 py-4">
                <PriceRangeInputs isMobile={true} />
                <SortSelector />
              </div>
              <div className="pt-4">
                <Button onClick={handleReset} variant="outline" className="w-full">
                  ფილტრის გასუფთავება
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Desktop floating filter */}
        {showFilters && (
          <div className="hidden md:block md:w-64 lg:w-72">
            <Card className="sticky top-24">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ფილტრი</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleReset}
                    className="h-8 w-8 p-0"
                    aria-label="ფილტრის გასუფთავება"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  დააფილტრეთ და დაალაგეთ მსგავსი პროდუქტები
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <PriceRangeInputs isMobile={false} />
                <SortSelector />
              </CardContent>
              <CardFooter>
                <Button onClick={handleReset} variant="outline" className="w-full">
                  ფილტრის გასუფთავება
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Product Images */}
            <div className="w-full md:w-2/5">
              {/* Main Image */}
              <div 
                className="relative aspect-square overflow-hidden rounded-md bg-white border cursor-pointer flex items-center justify-center max-h-[70vh]"
                onClick={toggleImageZoom}
              >
                {/* ფასდაკლების Badge */}
                {isPublicDiscount && (
                  <div className="absolute top-4 right-4 z-10 bg-red-500 text-white px-2 py-1 rounded-md font-medium">
                    {product.discountPercentage}% ფასდაკლება
                  </div>
                )}
              
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill={true}
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-contain"
                  priority
                  loading="eager"
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                />
                
                {/* Image Navigation Arrows */}
                {hasMultipleImages && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 p-2 rounded-full shadow hover:bg-opacity-100 transition-all z-10"
                      aria-label="წინა სურათი"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); nextImage(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 p-2 rounded-full shadow hover:bg-opacity-100 transition-all z-10"
                      aria-label="შემდეგი სურათი"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              
              {/* Thumbnail Gallery */}
              {hasMultipleImages && (
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`aspect-square overflow-hidden rounded-md border ${
                        index === currentImageIndex ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'
                      }`}
                      aria-label={`პროდუქტის სურათი ${index + 1}`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} - thumbnail ${index + 1}`}
                        width={100}
                        height={100}
                        className="h-full w-full object-cover"
                        loading={index < 5 ? "eager" : "lazy"}
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                      />
                    </button>
                  ))}
                </div>
              )}
            
              {/* Full Screen Image Modal */}
              {isImageZoomed && (
                <div 
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
                  onClick={toggleImageZoom}
                >
                  <button 
                    className="absolute top-4 right-4 text-gray-800 bg-white shadow-lg rounded-full p-2 z-10"
                    onClick={toggleImageZoom}
                    aria-label="დახურვა"
                  >
                    <X className="h-6 w-6" />
                  </button>

                  <div className="flex flex-row items-center justify-center space-x-5 max-w-[95vw] max-h-[90vh]">
                    {/* ვერტიკალური თამბნეილები მარცხნივ - მხოლოდ დესკტოპზე */}
                    {hasMultipleImages && (
                      <div className="hidden md:flex h-full items-center self-center z-10">
                        <div className="flex flex-col gap-3 my-auto max-h-[80vh] overflow-y-auto py-2 pr-2">
                          {product.images.map((image, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex(index);
                              }}
                              className={`w-28 h-28 overflow-hidden flex-shrink-0 ${
                                index === currentImageIndex 
                                ? 'border-[3px] border-primary shadow-md' 
                                : 'border border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <Image
                                src={image}
                                alt={`${product.name} - thumbnail ${index + 1}`}
                                width={112}
                                height={112}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* მთავარი ფოტო კონტეინერი */}
                    <div className="relative flex items-center justify-center">
                      <Image
                        src={currentImage}
                        alt={product.name}
                        width={1200}
                        height={1200}
                        className="max-h-[80vh] max-w-[78vw] md:max-w-[60vw] object-contain"
                        loading="eager"
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                      />
                      
                      {/* ნავიგაციის ღილაკები ფოტოზე */}
                      {hasMultipleImages && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                            className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white/95 shadow-lg text-gray-800 p-2.5 md:p-3.5 rounded-full flex items-center justify-center hover:bg-white transition-all z-10"
                            aria-label="წინა სურათი"
                          >
                            <ChevronLeft className="h-6 w-6 md:h-7 md:w-7" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute -right-4 top-1/2 -translate-y-1/2 bg-white/95 shadow-lg text-gray-800 p-2.5 md:p-3.5 rounded-full flex items-center justify-center hover:bg-white transition-all z-10"
                            aria-label="შემდეგი სურათი"
                          >
                            <ChevronRight className="h-6 w-6 md:h-7 md:w-7" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ფოტოს ნომერი/ინდიკატორი */}
                  {hasMultipleImages && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 z-10">
                      <span className="hidden md:inline text-xs text-gray-300">
                        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">←</kbd>
                        <kbd className="px-1.5 py-0.5 bg-gray-800 rounded ml-1">→</kbd>
                      </span>
                      <span>{currentImageIndex + 1} / {product.images.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Product Details */}
            <div className="w-full md:w-3/5">
              <div className="mb-6">
                <div className="mt-4 mb-6">
                  {isPublicDiscount ? (
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{discountedPrice.toFixed(2)} ₾</p>
                      <p className="text-lg text-muted-foreground line-through">{product.price} ₾</p>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-sm font-medium">
                        {product.discountPercentage}% ფასდაკლება
                      </span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">{product.price} ₾</p>
                  )}
                </div>
                
                {/* Add to Cart Section */}
                <div className="flex items-center gap-4 my-8">
                  <div className="flex items-center border rounded-md">
                    <button 
                      onClick={() => handleQuantityChange(-1)}
                      className="px-3 py-2 hover:bg-slate-100"
                      aria-label="შემცირება"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="px-4 py-2 font-medium">{quantity}</span>
                    <button 
                      onClick={() => handleQuantityChange(1)}
                      className="px-3 py-2 hover:bg-slate-100"
                      aria-label="გაზრდა"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <Button onClick={handleAddToCart} className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span>კალათში დამატება</span>
                  </Button>
                </div>
                
                {/* Product Description */}
                <div className="mt-6">
                  <Tabs defaultValue="description">
                    <TabsList>
                      <TabsTrigger value="description">აღწერა</TabsTrigger>
                      {(product as any).specifications && <TabsTrigger value="specifications">სპეციფიკაციები</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="description" className="mt-4">
                      <div className="prose max-w-none">
                        <p>{product.description}</p>
                      </div>
                    </TabsContent>
                    {(product as any).specifications && (
                      <TabsContent value="specifications" className="mt-4">
                        <div className="prose max-w-none">
                          <ul>
                            {Object.entries((product as any).specifications).map(([key, value]) => (
                              <li key={key}>
                                <strong>{key}:</strong> {String(value)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TabsContent>
                    )}
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
          
          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold tracking-tight mb-6">მსგავსი პროდუქტები</h2>
              {filteredAndSortedRelatedProducts.length === 0 ? (
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium mb-2">მსგავსი პროდუქტები ვერ მოიძებნა</h2>
                  <p className="text-muted-foreground">
                    ვერ მოიძებნა მსგავსი პროდუქტი თქვენი პარამეტრებით.
                    შეცვალეთ ფილტრაციის პარამეტრები ან გაასუფთავეთ ფილტრი.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={handleReset}
                    variant="outline"
                  >
                    ფილტრის გასუფთავება
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedRelatedProducts.map((relatedProduct) => (
                    <Link href={`/shop/product/${relatedProduct.id}`} key={relatedProduct.id} 
                      onClick={() => window.scrollTo(0, 0)}
                      className="group flex flex-col h-full border rounded-md overflow-hidden hover:shadow-md transition-shadow duration-300"
                    >
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <Image
                          src={relatedProduct.images && relatedProduct.images.length > 0 
                            ? relatedProduct.images[0] 
                            : defaultImage}
                          alt={relatedProduct.name}
                          fill={true}
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                        />
                      </div>
                      <div className="flex flex-col flex-grow p-4">
                        <h3 className="font-medium text-lg mb-1">{relatedProduct.name}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{relatedProduct.description}</p>
                        <div className="mt-auto">
                          <span className="font-bold">{relatedProduct.price} ₾</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
}

// Define the ZoomedImageModal component (or import if it's separate)
const ZoomedImageModal = dynamic(() => Promise.resolve(({ 
  currentImage, 
  productName, 
  hasMultipleImages, 
  onClose, 
  onPrev, 
  onNext 
}: {
  currentImage: string;
  productName: string;
  hasMultipleImages: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) => {
  return (
    <div 
      className="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <button 
        className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 transition-all"
        onClick={onClose}
        aria-label="დახურე გადიდებული სურათი"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      
      <div className="w-full max-w-screen-lg h-[80vh] md:h-[85vh] relative bg-white rounded-lg p-2 sm:p-4 shadow-2xl flex items-center justify-center overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src={currentImage}
            alt={productName}
            className="max-h-full max-w-full object-contain"
            width={1200}
            height={1200}
            style={{ objectFit: 'contain' }}
            priority={false}
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          />
        </div>
        
        {hasMultipleImages && (
          <>
            <button 
              onClick={onPrev} 
              className="absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 p-2 sm:p-3 rounded-full shadow-md hover:bg-opacity-100 transition-all z-10"
              aria-label="წინა სურათი"
            >
              <ChevronLeft className="h-5 w-5 sm:h-8 sm:w-8 text-gray-800" />
            </button>
            <button 
              onClick={onNext}
              className="absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-75 p-2 sm:p-3 rounded-full shadow-md hover:bg-opacity-100 transition-all z-10"
              aria-label="შემდეგი სურათი"
            >
              <ChevronRight className="h-5 w-5 sm:h-8 sm:w-8 text-gray-800" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}), { ssr: false, loading: () => <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"><div className="bg-white p-4 rounded-md">სურათი იტვირთება...</div></div> }); 