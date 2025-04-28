'use client';

import React, { useCallback, useEffect, useState, Suspense, useMemo } from 'react';
import { ShopLayout } from '@/components/layouts/shop-layout';
import { ProductCard } from '@/components/shop/product-card';
import { getProducts, getProductsByCategory, getCategories } from '@/lib/firebase-service';
import { Product, Category } from '@/types';
import { ShoppingCart, SlidersHorizontal, ArrowLeft, ArrowRight, ChevronLeft, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Image from 'next/image';
import { useCart } from '@/components/providers/cart-provider';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';
import { Label } from "@/components/ui/label";
// import { Pagination as UIPagination } from '@/components/ui/pagination';
// import { Checkbox } from "@/components/ui/checkbox";

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

interface ShopPageProps {
  initialProducts: Product[];
  initialMinMaxPrice: [number, number];
}

function SearchParamsSection({ 
  setSearchTerm,
  setCategoryId
}: { 
  setSearchTerm: (value: string) => void,
  setCategoryId: (value: string | null) => void
}) {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || null;
  
  useEffect(() => {
    setSearchTerm(searchTerm);
  }, [searchTerm, setSearchTerm]);
  
  useEffect(() => {
    setCategoryId(categoryId);
  }, [categoryId, setCategoryId]);
  
  return null;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [initialMinMaxPrice, setInitialMinMaxPrice] = useState<[number, number]>([0, 1000]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const router = useRouter();
  
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minMaxPrice, setMinMaxPrice] = useState<[number, number]>([0, 1000]);
  const [userModifiedRange, setUserModifiedRange] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  const { addToCart } = useCart();

  const calculateInitialPriceRange = useCallback((productsData: Product[]) => {
    let calculatedMinMax: [number, number] = [0, 1000];
    if (productsData.length > 0) {
      const prices = productsData.map(p => p.price || 0);
      calculatedMinMax = [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
    }
    return calculatedMinMax;
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        let productsData: Product[] = [];
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        
        if (categoryId) {
          productsData = await getProductsByCategory(categoryId);
          const category = categoriesData.find(cat => cat.id === categoryId);
          if (category) {
            setActiveCategoryName(category.name);
          }
        } else {
          productsData = await getProducts();
        }
        
        setProducts(productsData);
        
        const calculatedMinMax = calculateInitialPriceRange(productsData);
        setInitialMinMaxPrice(calculatedMinMax);
        setMinMaxPrice(calculatedMinMax);
        setPriceRange(calculatedMinMax);
      } catch (error) {
        console.error('Error fetching initial products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [categoryId, calculateInitialPriceRange]);

  const allFilteredProducts = useMemo(() => {
    return products
      .filter(product => {
        const priceCondition = userModifiedRange 
          ? (product.price >= priceRange[0] && product.price <= priceRange[1])
          : true;
          
        return (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         product.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
         priceCondition;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'newest':
            return (b.createdAt || 0) - (a.createdAt || 0);
          case 'oldest':
            return (a.createdAt || 0) - (b.createdAt || 0);
          case 'price-asc':
            return (a.price || 0) - (b.price || 0);
          case 'price-desc':
            return (b.price || 0) - (a.price || 0);
          default:
            return 0;
        }
      });
  }, [products, searchTerm, priceRange, userModifiedRange, sortOption]);
    
  const specialProducts = useMemo(() => {
    return allFilteredProducts.filter(product => Boolean((product as any).isSpecial));
  }, [allFilteredProducts]);
  
  const filteredProducts = useMemo(() => {
    return allFilteredProducts.filter(product => !Boolean((product as any).isSpecial));
  }, [allFilteredProducts]);
  
  const allProductsForSmallScreens = useMemo(() => [...allFilteredProducts], [allFilteredProducts]);

  const handleReset = useCallback(() => {
    setPriceRange([minMaxPrice[0], minMaxPrice[1]]);
    setUserModifiedRange(false);
    setSortOption('newest');
    setSearchTerm('');
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
          value={sortOption}
          onValueChange={(value) => setSortOption(value as SortOption)}
        >
          <SelectTrigger aria-label="დახარისხების პარამეტრები">
            <SelectValue placeholder="აირჩიეთ ვარიანტი" />
          </SelectTrigger>
          <SelectContent className="after:content-[''] after:block after:h-3">
            <SelectItem value="newest">უახლესი</SelectItem>
            <SelectItem value="oldest">უძველესი</SelectItem>
            <SelectItem value="price-asc">ფასი: დაბლიდან მაღლა</SelectItem>
            <SelectItem value="price-desc">ფასი: მაღლიდან დაბლა</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }, [sortOption]);

  const indexOfLastItem = currentPage * itemsPerPage;

  return (
    <ShopLayout>
      <Suspense fallback={<div>Loading search parameters...</div>}>
        <SearchParamsSection setSearchTerm={setSearchTerm} setCategoryId={setCategoryId} />
      </Suspense>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {activeCategoryName ? activeCategoryName : "ყველა პროდუქტი"}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-muted-foreground">
            {categoryId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="px-0 hover:bg-transparent hover:text-primary -ml-2"
                onClick={() => {
                  router.push('/shop');
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                მთავარზე დაბრუნება
              </Button>
            )}
          </p>
          <div className="flex items-center gap-2">
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
                    დააფილტრეთ და დაალაგეთ პროდუქტები
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
      </div>

      <div className="flex flex-col md:flex-row gap-6">
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
                  დააფილტრეთ და დაალაგეთ პროდუქტები
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
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, index) => (
                <div key={index} className="space-y-3">
                  <div className="aspect-square bg-gray-200 rounded-md animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (filteredProducts.length === 0 && specialProducts.length === 0) ? (
            <div className="text-center py-12">
              <h2 className="text-xl font-medium mb-2">პროდუქტები ვერ მოიძებნა</h2>
              <p className="text-muted-foreground">
                ვერ მოიძებნა პროდუქტი თქვენი პარამეტრებით.
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
            <div className="space-y-8">
              <div>
                
                <div className="relative group">
                  <style jsx>{`
                    .card-reference {
                      position: absolute;
                      visibility: hidden;
                      height: 0;
                    }
                    .special-card {
                      height: 100%;
                      grid-row: span 2;
                      aspect-ratio: 3/4;
                      max-height: 80vh;
                    }
                    .product-grid {
                      display: grid;
                      grid-template-columns: repeat(4, 1fr);
                      gap: 0.75rem;
                      max-width: 100%;
                      overflow: hidden;
                    }
                    .product-grid-item {
                      display: flex;
                      min-width: 0;
                    }
                    .special-grid-item {
                      grid-column: 3 / span 2;
                      grid-row: 1 / span 2;
                      min-height: 300px;
                    }
                    .special-grid-item .swiper {
                      height: 100%;
                      width: 100%;
                    }
                    .special-grid-item .swiper-slide {
                      height: 100%;
                      width: 100%;
                      display: flex;
                      flex-direction: column;
                    }
                    @media (max-width: 1279px) {
                      .product-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.5rem;
                      }
                    }
                    @media (max-width: 1023px) {
                      .product-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.5rem;
                      }
                    }
                    @media (max-width: 767px) {
                      .product-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.3rem;
                      }
                      .product-grid-item {
                        grid-column: span 1;
                        grid-row: span 1;
                      }
                    }
                    @media (max-width: 639px) {
                      .product-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.3rem;
                      }
                    }
                  `}</style>
                  
                  <div className="product-grid">
                    {specialProducts.length > 0 && (
                      <div className="special-grid-item">
                        <div className="h-full w-full min-h-[300px] border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all bg-white relative">
                          <Swiper
                            modules={[Autoplay, Pagination]}
                            spaceBetween={0}
                            slidesPerView={1}
                            autoplay={{ delay: 5000, disableOnInteraction: true }}
                            pagination={{ clickable: true }}
                            loop={specialProducts.length >= 3}
                            className="h-full w-full min-h-[300px]"
                            breakpoints={{
                              1280: {
                                slidesPerView: 1
                              },
                              1000: {
                                slidesPerView: 1
                              }
                            }}
                          >
                            {specialProducts.map((product: Product, index: number) => {
                              const defaultImage = 'https://placehold.co/400x400/eee/999?text=No+Image';
                              const productImage = product.images && product.images.length > 0 
                                ? product.images[0] 
                                : defaultImage;
                                
                              return (
                                <SwiperSlide key={product.id}>
                                  <Link 
                                    href={`/shop/product/${product.id}`}
                                    className="group flex flex-col h-full w-full"
                                  >
                                    <div className="flex-1 flex items-center justify-center relative overflow-hidden min-h-[200px] p-0 pt-0 pb-0">
                                      <Image
                                        src={productImage}
                                        alt={product.name}
                                        fill
                                        style={{ objectFit: 'cover', objectPosition: 'center' }}
                                        sizes="(max-width: 639px) 100vw, (max-width: 767px) 100vw, (max-width: 1023px) 100vw, (max-width: 1279px) 100vw, 50vw"
                                        priority={index === 0}
                                        placeholder="blur"
                                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                                        className="object-cover w-full h-full"
                                      />
                                    </div>
                                    
                                    <div className="p-3 mt-auto bg-white">
                                      <h3 className="font-medium text-sm md:text-base mb-1 line-clamp-2">{product.name}</h3>
                                      <div className="flex justify-between items-end mt-1">
                                        <p className="text-sm font-semibold text-gray-900">
                                          {new Intl.NumberFormat('ka-GE', {
                                            style: 'currency',
                                            currency: 'GEL',
                                          }).format(product.price)}
                                        </p>
                                        <Button 
                                          size="sm" 
                                          variant="default" 
                                          className="flex items-center gap-1 rounded-md whitespace-nowrap text-xs md:text-sm ml-1"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addToCart(product);
                                          }}
                                          aria-label={`${product.name} - კალათში დამატება`}
                                        >
                                          <ShoppingCart className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                                          <span className="hidden xs:inline">კალათში</span>
                                          <span className="xs:hidden">+</span>
                                        </Button>
                                      </div>
                                    </div>
                                  </Link>
                                </SwiperSlide>
                              );
                            })}
                          </Swiper>
                          
                          {specialProducts.length > 1 && (
                            <>
                              <button 
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1.5 focus:outline-none shadow-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const swiperInstance = (document.querySelector('.special-grid-item .swiper') as any)?.swiper;
                                  if (swiperInstance) {
                                    swiperInstance.slidePrev();
                                  }
                                }}
                                aria-label="წინა სლაიდი"
                              >
                                <ArrowLeft className="h-4 w-4 text-gray-700" />
                              </button>
                              <button 
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white/80 hover:bg-white rounded-full p-1.5 focus:outline-none shadow-sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const swiperInstance = (document.querySelector('.special-grid-item .swiper') as any)?.swiper;
                                  if (swiperInstance) {
                                    swiperInstance.slideNext();
                                  }
                                }}
                                aria-label="შემდეგი სლაიდი"
                              >
                                <ArrowRight className="h-4 w-4 text-gray-700" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {filteredProducts.slice(0, 4).map((product) => (
                      <div key={product.id} className="product-grid-item">
                        <div className="w-full h-full product-card-normal scale-95 xs:scale-90 sm:scale-95">
                          <ProductCard product={product} />
                        </div>
                      </div>
                    ))}
                    
                    {filteredProducts.slice(4).map((product) => (
                      <div key={product.id} className="product-grid-item">
                        <div className="w-full h-full product-card-normal scale-95 xs:scale-90 sm:scale-95">
                          <ProductCard product={product} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
} 