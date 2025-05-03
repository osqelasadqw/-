'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShopLayout } from '@/components/layouts/shop-layout';
import { getProductById, getProductsByCategory, getPaginatedProductImages, MAX_DISPLAY_IMAGES, getSettings } from '@/lib/firebase-service';
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
import { ProductStockBadge } from '@/components/shop/product-stock-badge';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs, FreeMode, Autoplay } from 'swiper/modules';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import 'swiper/css/free-mode';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

// დავამატოთ ინტერფეისი სისტემის პარამეტრებისთვის
interface SiteSettings {
  loadingType?: 'infinite' | 'button';
  productsPerLoad?: number;
}

// მემოიზებული კომპონენტები რერენდერების შესამცირებლად
const MemoizedPriceRangeInputs = React.memo(function PriceRangeInputs({
  isMobile,
  minMaxPrice,
  priceRange,
  handleMinPriceChange,
  handleMaxPriceChange
}: {
  isMobile: boolean;
  minMaxPrice: [number, number];
  priceRange: [number, number];
  handleMinPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleMaxPriceChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
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
});

const MemoizedSortSelector = React.memo(function SortSelector({
  relatedSortOption,
  setRelatedSortOption
}: {
  relatedSortOption: SortOption;
  setRelatedSortOption: (value: SortOption) => void;
}) {
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
});

// გამოვიყენოთ React.memo, რომ თავიდან ავიცილოთ ზედმეტი რერენდერები
const ProductDetailPage = React.memo(function ProductDetailPage() {
  const params = useParams() || {};
  const id = params.id ? String(params.id) : '';
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
  const [thumbsSwiper, setThumbsSwiper] = useState(null);
  
  // ახალი სტეიტები ფოტოების პაკეტურად ჩატვირთვისთვის
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [totalImageCount, setTotalImageCount] = useState<number>(0);
  const [isLoadingMoreImages, setIsLoadingMoreImages] = useState<boolean>(false);
  const [hasMoreImages, setHasMoreImages] = useState<boolean>(false);

  // სისტემის პარამეტრები
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    loadingType: 'infinite', // Default loading type
    productsPerLoad: 10
  });
  
  // ეკრანის ზომის სტეიტი და გრიდის სვეტების რაოდენობა
  const [windowWidth, setWindowWidth] = useState(0);
  const [gridColumns, setGridColumns] = useState(5); // დეფოლტ მნიშვნელობა

  // Filtering state for related products - გამოვიყენოთ მემოიზაცია საწყისი მნიშვნელობებისთვის
  const initialMinMaxPrice = useMemo(() => [0, 1000] as [number, number], []);
  const initialPriceRange = useMemo(() => [0, 0] as [number, number], []);
  const [minMaxPrice, setMinMaxPrice] = useState<[number, number]>(initialMinMaxPrice);
  const [priceRange, setPriceRange] = useState<[number, number]>(initialPriceRange);
  const [userModifiedRange, setUserModifiedRange] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // ახალი სტეიტი მსგავსი პროდუქტების ფეიჯინაციისთვის
  const [visibleRelatedProductsCount, setVisibleRelatedProductsCount] = useState(0);

  // Define all memoized values and callbacks at the top level, before any conditional logic
  const defaultImage = useMemo(() => 'https://placehold.co/600x600/eee/999?text=No+Image', []);
  const hasMultipleImages = useMemo(() => loadedImages.length > 1 || totalImageCount > 1, [loadedImages.length, totalImageCount]);
  const currentImage = useMemo(() => {
    if (!loadedImages || loadedImages.length === 0) {
      return defaultImage;
    }
    return loadedImages[currentImageIndex] || defaultImage;
  }, [loadedImages, currentImageIndex, defaultImage]);

  // ახალი მეთოდი ეკრანის ზომის მიხედვით მაქს სვეტების გამოსათვლელად
  const calculateGridColumns = useCallback((width: number) => {
    if (width < 640) {
      return 2; // მობილურზე 2 სვეტი (Related Products-ისთვის)
    } else if (width < 768) {
      return 3; // პატარა ტაბლეტზე 3 სვეტი
    } else if (width < 1024) {
      return 4; // დიდ ტაბლეტზე 4 სვეტი
    } else if (width < 1280) {
       return 4; // პატარა დესკტოპზე 4 (თუ ფილტრი ჩანს)
    } else {
       return 5; // დიდ დესკტოპზე 5 (თუ ფილტრი ჩანს)
    }
     // გავითვალისწინოთ ფილტრის ჩვენება/დამალვა დესკტოპზე
    // const baseColumns = width < 1280 ? 4 : 5;
    // return showFilters ? baseColumns : baseColumns + 1;
  }, []);

  // ეკრანის ზომის ცვლილებაზე რეაგირება
  useEffect(() => {
    const updateWindowWidth = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 0;
      setWindowWidth(width);
      setGridColumns(calculateGridColumns(width));
    };
    
    updateWindowWidth(); // Initial call
    window.addEventListener('resize', updateWindowWidth);
    return () => window.removeEventListener('resize', updateWindowWidth);
  }, [calculateGridColumns]); // Removed showFilters dependency for now

  // სისტემის პარამეტრების წამოღება
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const fetchedSettings = await getSettings();
        if (fetchedSettings) {
          setSiteSettings({
            loadingType: fetchedSettings.loadingType || 'infinite',
            productsPerLoad: Number(fetchedSettings.productsPerLoad) || 10
          });
        }
      } catch (error) {
        console.error("Error loading settings in product page:", error);
      }
    };
    loadSettings();
  }, []);
  
  // დავაყენოთ თავდაპირველი ხილვადი პროდუქტების რაოდენობა პარამეტრების მიხედვით
  useEffect(() => {
    const initialCount = (siteSettings.productsPerLoad || 10) * gridColumns;
    setVisibleRelatedProductsCount(initialCount);
  }, [siteSettings.productsPerLoad, gridColumns]);

  // რელატედ სორტ ოფშენ სეტერის მემოიზაცია 
  const setRelatedSortOptionCallback = useCallback((option: SortOption) => {
    setRelatedSortOption(option);
  }, []);

  // Declare all callbacks at the top before any conditional returns
  const handleReset = useCallback(() => {
    setPriceRange(prev => [minMaxPrice[0], minMaxPrice[1]]);
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

  const toggleImageZoom = useCallback(() => {
    setIsImageZoomed(prev => !prev);
  }, []);

  const nextImage = useCallback(() => {
    if (loadedImages && loadedImages.length > 0) {
      const newIndex = currentImageIndex === loadedImages.length - 1 ? 0 : currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      
      // თუ მომხმარებელი აღწევს ჩატვირთული სურათების ბოლოს, ავტომატურად ვტვირთავთ მეტ სურათს
      if (newIndex > loadedImages.length - 3 && hasMoreImages && !isLoadingMoreImages) {
        loadMoreImages();
      }
    }
  }, [loadedImages, currentImageIndex, hasMoreImages, isLoadingMoreImages]);

  const prevImage = useCallback(() => {
    if (loadedImages && loadedImages.length > 0) {
      setCurrentImageIndex(prev => 
        prev === 0 ? loadedImages.length - 1 : prev - 1
      );
    }
  }, [loadedImages]);

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
        
          addToCart(discountedProduct);
      } else {
          addToCart(product);
      }
    }
  }, [product, addToCart, isPublicDiscount, discountedPrice]);

  // Memoized filtered and sorted related products for performance
  const filteredAndSortedRelatedProducts = useMemo(() => {
    // First filter by price
    const filtered = relatedProducts.filter(product => {
      // Filter by price range if user has modified it
      const priceMatch = !userModifiedRange || (
        product.price >= priceRange[0] && 
        product.price <= priceRange[1]
      );
      return priceMatch;
    });
    
    // Clone the filtered array
    const sorted = [...filtered];
    
    // Apply sorting based on option
    if (relatedSortOption === 'price-asc') {
      sorted.sort((a: Product, b: Product) => (a.price ?? 0) - (b.price ?? 0));
    } else if (relatedSortOption === 'price-desc') {
      sorted.sort((a: Product, b: Product) => (b.price ?? 0) - (a.price ?? 0));
    } else if (relatedSortOption === 'name-asc') {
      sorted.sort((a: Product, b: Product) => a.name.localeCompare(b.name));
    } else if (relatedSortOption === 'name-desc') {
      sorted.sort((a: Product, b: Product) => b.name.localeCompare(a.name));
    }
    // For 'newest' or default, we don't sort if the original order matters, 
    // or we could sort by createdAt if available. Assuming original order is fine for 'newest'.

    return sorted;
  }, [relatedProducts, relatedSortOption, priceRange, userModifiedRange]);
  
  // მსგავსი პროდუქტების საჩვენებელი ნაწილი
  const visibleRelatedProducts = useMemo(() => {
    return filteredAndSortedRelatedProducts.slice(0, visibleRelatedProductsCount);
  }, [filteredAndSortedRelatedProducts, visibleRelatedProductsCount]);

  // მეტი მსგავსი პროდუქტის ჩატვირთვის ფუნქცია
  const loadMoreRelatedProducts = useCallback(() => {
    const increment = (siteSettings.productsPerLoad || 10) * gridColumns;
    setVisibleRelatedProductsCount(prevCount => prevCount + increment);
  }, [siteSettings.productsPerLoad, gridColumns]);

  const handleThumbsSwiper = useCallback((swiper: any) => {
    setThumbsSwiper(swiper);
  }, []);

  const handleSlideChange = useCallback((swiper: any) => {
    setCurrentImageIndex(swiper.activeIndex);
  }, []);

  // ფოტოების ჩატვირთვის ფუნქცია გადავაკეთოთ, რომ გამოიყენოს სისტემის პარამეტრები
  const loadProductImages = useCallback(async (productId: string, startIndex: number = 0) => {
    try {
      setIsLoadingMoreImages(true);
      
      // ეს ეხება მთავარი პროდუქტის ფოტოებს, არა მსგავს პროდუქტებს
      const mainImageLoadLimit = MAX_DISPLAY_IMAGES; // Can keep this separate if needed
      
      const { images, totalCount } = await getPaginatedProductImages(
        productId, 
        startIndex, 
        mainImageLoadLimit // Using the specific limit for main product images
        // gridColumns is not needed here as it was removed from the function signature
      );
      
      if (startIndex === 0) {
        setLoadedImages(images);
      } else {
        setLoadedImages(prev => [...prev, ...images]);
      }
      
      setTotalImageCount(totalCount);
      setHasMoreImages(startIndex + images.length < totalCount);
    } catch (error) {
      console.error('Error loading product images:', error);
    } finally {
      setIsLoadingMoreImages(false);
    }
  }, []);

  // მეტი ფოტოს ჩატვირთვის ფუნქცია (მთავარი პროდუქტისთვის)
  const loadMoreImages = useCallback(() => {
    if (product && !isLoadingMoreImages && hasMoreImages) {
      loadProductImages(product.id, loadedImages.length);
    }
  }, [product, loadedImages.length, isLoadingMoreImages, hasMoreImages, loadProductImages]);

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
      
      // პროდუქტის პირველი პაკეტი ფოტოების ჩატვირთვა
      await loadProductImages(productData.id);
      
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
  }, [id, loadProductImages]);

  const fetchRelatedProducts = useCallback(async (categoryId: string, currentProductId: string) => {
    try {
      const productsInCategory = await getProductsByCategory(categoryId);
      // ამოვიღოთ მიმდინარე პროდუქტი დაკავშირებული პროდუქტების სიიდან
      const filteredProducts = productsInCategory.filter(p => p.id !== currentProductId);
      
      setRelatedProducts(filteredProducts);
      
      // ვიპოვოთ მინ-მაქს ფასები შესწორებული მიდგომით
      if (filteredProducts.length > 0) {
        const prices = filteredProducts.map(p => p.price || 0);
        const min = Math.floor(Math.min(...prices));
        const max = Math.ceil(Math.max(...prices));
        
        // useMemo გამოვიყენოთ ახალი მასივებისთვის რათა თავიდან ავიცილოთ ზედმეტი რერენდერები
        const newMinMaxPrice: [number, number] = [min, max];
        setMinMaxPrice(newMinMaxPrice);
        
        // თუ მომხმარებელს ფილტრი არ აქვს მოდიფიცირებული, განვაახლოთ ფასის საზღვრებიც
        if (!userModifiedRange) {
          setPriceRange(prev => [min, max]);
        }
      }
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  }, [userModifiedRange]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

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

  // სტილები გლობალური სქროლბარის გამოსარიცხად
  useEffect(() => {
    // შევამოწმოთ ბრაუზერის გარემო
    if (typeof window !== 'undefined') {
      // მოვუსმინოთ რესაიზ ივენთს
      const checkOverflow = () => {
        const htmlElement = document.documentElement;
        const hasHorizontalOverflow = htmlElement.scrollWidth > htmlElement.clientWidth;
        
        if (hasHorizontalOverflow) {
          document.body.style.overflowX = 'hidden';
        }
      };
      
      // თავიდანვე გავასწოროთ ჰორიზონტალური სქროლბარი
      document.body.style.overflowX = 'hidden';
      
      window.addEventListener('resize', checkOverflow);
      return () => {
        window.removeEventListener('resize', checkOverflow);
      };
    }
  }, []);

  // Now we can have conditional returns since all hooks are defined
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
                <MemoizedPriceRangeInputs 
                  isMobile={true} 
                  minMaxPrice={minMaxPrice}
                  priceRange={priceRange}
                  handleMinPriceChange={handleMinPriceChange}
                  handleMaxPriceChange={handleMaxPriceChange}
                />
                <MemoizedSortSelector 
                  relatedSortOption={relatedSortOption}
                  setRelatedSortOption={setRelatedSortOptionCallback}
                />
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
                <MemoizedPriceRangeInputs 
                  isMobile={false} 
                  minMaxPrice={minMaxPrice}
                  priceRange={priceRange}
                  handleMinPriceChange={handleMinPriceChange}
                  handleMaxPriceChange={handleMaxPriceChange}
                />
                <MemoizedSortSelector 
                  relatedSortOption={relatedSortOption}
                  setRelatedSortOption={setRelatedSortOptionCallback}
                />
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
              {/* Main Image with Swiper */}
              {hasMultipleImages ? (
                <div className="product-swiper-container w-full aspect-square relative overflow-hidden">
                  <Swiper
                    modules={[Navigation, Pagination, Thumbs, Autoplay]}
                    spaceBetween={0}
                    slidesPerView={1}
                    navigation={{
                      nextEl: '.swiper-button-next',
                      prevEl: '.swiper-button-prev',
                    }}
                    pagination={{ clickable: true }}
                    thumbs={{ swiper: thumbsSwiper }}
                    autoplay={{ 
                      delay: 5000,
                      disableOnInteraction: true,
                      pauseOnMouseEnter: true 
                    }}
                    loop={loadedImages?.length > 1}
                    onSlideChange={handleSlideChange}
                    className="product-main-swiper rounded-md border overflow-hidden aspect-square"
                    onClick={toggleImageZoom}
                  >
                    {loadedImages?.map((image, index) => (
                      <SwiperSlide key={`main-${index}`} className="aspect-square">
                        <div className="relative w-full h-full flex items-center justify-center">
                          {isPublicDiscount && index === 0 && (
                            <div className="absolute top-4 right-4 z-10 bg-red-600 text-white px-2 py-1 rounded-md font-medium">
                              {product?.discountPercentage}% ფასდაკლება
                            </div>
                          )}
                          <div className="relative w-full h-full">
                            <Image
                              src={image}
                              alt={`${product?.name} - სურათი ${index + 1}`}
                              fill={true}
                              sizes="(max-width: 768px) 100vw, 40vw"
                              className="object-contain"
                              priority={index === 0}
                              loading={index === 0 ? "eager" : "lazy"}
                              placeholder="blur"
                              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                            />
                          </div>
                        </div>
                      </SwiperSlide>
                    ))}
                    <div className="swiper-button-next"></div>
                    <div className="swiper-button-prev"></div>
                  </Swiper>

                  {/* Thumbnail Swiper */}
                  <div className="mt-4 overflow-hidden">
                    <Swiper
                      modules={[Navigation, FreeMode, Thumbs]}
                      spaceBetween={10}
                      slidesPerView="auto"
                      freeMode={true}
                      watchSlidesProgress={true}
                      onSwiper={handleThumbsSwiper}
                      className="product-thumbs-swiper"
                      breakpoints={{
                        0: {
                          slidesPerView: Math.min(gridColumns, 2),
                          spaceBetween: 8,
                        },
                        480: {
                          slidesPerView: Math.min(gridColumns, 3),
                          spaceBetween: 10,
                        },
                        640: {
                          slidesPerView: Math.min(gridColumns, 4),
                          spaceBetween: 10,
                        },
                        768: {
                          slidesPerView: Math.min(gridColumns, 5),
                          spaceBetween: 10,
                        },
                        1024: {
                          slidesPerView: Math.min(gridColumns, 6),
                          spaceBetween: 10,
                        },
                      }}
                    >
                      {loadedImages?.map((image, index) => (
                        <SwiperSlide key={`thumb-${index}`} className="cursor-pointer">
                          <div className={`relative h-full w-full rounded-md overflow-hidden border ${
                            index === currentImageIndex ? 'ring-2 ring-primary border-primary' : 'opacity-70 hover:opacity-100'
                          }`}>
                            <Image
                              src={image}
                              alt={`${product?.name} - thumbnail ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="80px"
                              loading={index < 5 ? "eager" : "lazy"}
                              placeholder="blur"
                              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                            />
                          </div>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                  
                  {/* დავამატოთ ღილაკი მეტი ფოტოს ჩასატვირთად */}
                  {hasMoreImages && (
                    <div className="mt-2 text-center">
                      <Button 
                        onClick={loadMoreImages} 
                        variant="outline" 
                        size="sm"
                        disabled={isLoadingMoreImages}
                        className="text-xs"
                      >
                        {isLoadingMoreImages ? (
                          <span className="flex items-center">
                            <span className="w-3 h-3 mr-2 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
                            იტვირთება...
                          </span>
                        ) : (
                          <span>მეტი ფოტოს ჩატვირთვა ({loadedImages.length}/{totalImageCount})</span>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                // Single image display if there's only one image
                <div 
                  className="relative aspect-square overflow-hidden rounded-md bg-white border cursor-pointer flex items-center justify-center max-h-[70vh]"
                  onClick={toggleImageZoom}
                >
                  {isPublicDiscount && (
                    <div className="absolute top-4 right-4 z-10 bg-red-600 text-white px-2 py-1 rounded-md font-medium">
                      {product?.discountPercentage}% ფასდაკლება
                    </div>
                  )}
                
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div className="relative w-auto h-auto max-w-full max-h-full">
                      <Image
                        src={currentImage}
                        alt={product?.name || ''}
                        width={600}
                        height={600}
                        className="object-contain w-auto h-auto max-h-[60vh]"
                        priority={true}
                        loading="eager"
                        placeholder="blur"
                        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                      />
                    </div>
                  </div>
                </div>
              )}
            
              {/* Full Screen Image Modal */}
              {isImageZoomed && (
                <div 
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center"
                  onClick={toggleImageZoom}
                  style={{ overflow: 'hidden' }}
                >
                  <button 
                    className="fixed top-4 right-4 text-white bg-black/40 hover:bg-black/60 shadow-lg rounded-full p-2 z-[9999]"
                    onClick={(e) => { e.stopPropagation(); toggleImageZoom(); }}
                    aria-label="დახურვა"
                  >
                    <X className="h-6 w-6" />
                  </button>

                  <div className="flex flex-col items-center justify-center w-full h-full max-w-[95vw] max-h-[95vh] px-2">
                    {/* მოდალური ფოტოს კონტეინერი */}
                    <div className="relative flex items-center justify-center w-full h-full">
                      <div className="relative flex items-center justify-center">
                        <img
                          src={currentImage}
                          alt={product?.name || ''}
                          className="max-w-[90vw] max-h-[80vh] object-contain"
                        />
                      </div>
                      
                      {/* ნავიგაციის ღილაკები */}
                      {hasMultipleImages && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); prevImage(); }} 
                            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 md:p-3 rounded-full flex items-center justify-center transition-all z-10"
                            aria-label="წინა სურათი"
                          >
                            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-2 md:p-3 rounded-full flex items-center justify-center transition-all z-10"
                            aria-label="შემდეგი სურათი"
                          >
                            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* თამბნეილების ქვედა პანელი - მობილურზეც და დესკტოპზეც */}
                    {hasMultipleImages && loadedImages.length > 1 && (
                      <div className="flex justify-center space-x-2 mt-2 pb-2 overflow-x-auto w-full max-w-[90vw]">
                        {loadedImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentImageIndex(index);
                            }}
                            className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded overflow-hidden ${
                              index === currentImageIndex 
                              ? 'ring-2 ring-white' 
                              : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={image}
                              alt={`თამბნეილი ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ინდიკატორი */}
                    {hasMultipleImages && (
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2 z-10">
                        <span>{currentImageIndex + 1} / {totalImageCount}</span>
                      </div>
                    )}
                    
                    {/* დავამატოთ მეტი ფოტოს ჩატვირთვის ღილაკი მოდალშიც */}
                    {hasMoreImages && (
                      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadMoreImages();
                          }}
                          variant="outline"
                          size="sm"
                          disabled={isLoadingMoreImages}
                          className="bg-black/40 hover:bg-black/60 text-white border-gray-700"
                        >
                          {isLoadingMoreImages ? "იტვირთება..." : "მეტი ფოტოს ჩატვირთვა"}
                        </Button>
                      </div>
                    )}
                  </div>
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

                {/* მარაგის ბეჯი */}
                <div className="my-3">
                  {product && <ProductStockBadge productId={product.id} />}
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
                  <Button 
                    onClick={handleAddToCart} 
                    className="flex items-center gap-2 bg-red-700 hover:bg-red-800 text-white"
                  >
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
              {visibleRelatedProducts.length === 0 && filteredAndSortedRelatedProducts.length > 0 ? ( // Adjusted condition
                <div className="text-center py-12">
                  <h2 className="text-xl font-medium mb-2">მსგავსი პროდუქტები ვერ მოიძებნა</h2>
                  <p className="text-muted-foreground">
                    ვერ მოიძებნა მსგავსი პროდუქტი თქვენი ფილტრაციის პარამეტრებით.
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
                <>
                  <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-${gridColumns} gap-4 sm:gap-5 md:gap-6`}>
                    {visibleRelatedProducts.map((relatedProduct) => (
                      <Link 
                        href={`/shop/product/${relatedProduct.id}`} 
                        key={relatedProduct.id} 
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
                            // განვაახლოთ sizes პროპორციულად gridColumns-ის მიხედვით
                            sizes={`(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, ${100 / gridColumns}vw`}
                            className="object-cover transition-transform duration-300 group-hover:scale-105" // Added scale effect
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                          />
                        </div>
                        <div className="flex flex-col flex-grow p-3"> {/* Adjusted padding */}
                          <h3 className="font-medium text-base mb-1 line-clamp-2">{relatedProduct.name}</h3> {/* Adjusted text size and clamp */}
                           {/* Optionally add description back if needed */}
                           {/* <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{relatedProduct.description}</p> */}
                          <div className="mt-auto pt-1"> {/* Adjusted spacing */}
                            <span className="font-semibold text-lg">{relatedProduct.price} ₾</span> {/* Adjusted text size */}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  
                  {/* "მეტის ჩვენება" ღილაკი */}
                  {siteSettings.loadingType === 'button' && visibleRelatedProductsCount < filteredAndSortedRelatedProducts.length && (
                    <div className="mt-8 text-center">
                      <Button 
                        onClick={loadMoreRelatedProducts} 
                        variant="outline"
                        disabled={isLoadingMoreImages} // Can potentially reuse this state or add a specific one
                      >
                        {isLoadingMoreImages ? 'იტვირთება...' : 'მეტის ჩვენება'} 
                      </Button>
                    </div>
                  )}
                  
                  {/* აქ შეიძლება დაემატოს Infinite Scroll ლოგიკა loadingType === 'infinite'-სთვის */}
                   {siteSettings.loadingType === 'infinite' && visibleRelatedProductsCount < filteredAndSortedRelatedProducts.length && (
                     <div className="h-10"> 
                       {/* Optional loading indicator */}
                     </div>
                   )}

                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* სწაიპერის სტილები */}
      <style jsx global>{`
        .product-main-swiper {
          width: 100%;
          height: 100%;
          aspect-ratio: 1/1;
          cursor: pointer;
        }
        
        .product-main-swiper .swiper-slide {
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          width: 100% !important;
          height: 100% !important;
          position: relative;
        }
        
        .product-thumbs-swiper {
          width: 100%;
          height: auto;
          margin-top: 15px;
        }
        
        .product-thumbs-swiper .swiper-slide {
          width: 80px !important;
          height: 80px !important;
          border-radius: 0.375rem;
          overflow: hidden;
          opacity: 0.7;
          transition: opacity 0.3s ease;
          position: relative;
        }
        
        .product-thumbs-swiper .swiper-slide:hover {
          opacity: 1;
        }
        
        .product-thumbs-swiper .swiper-slide-thumb-active {
          opacity: 1;
          border: 2px solid #2563eb;
        }
        
        .product-main-swiper .swiper-button-next,
        .product-main-swiper .swiper-button-prev {
          background-color: rgba(255, 255, 255, 0.8);
          width: 35px;
          height: 35px;
          border-radius: 50%;
          color: #333;
        }
        
        .product-main-swiper .swiper-button-next:after,
        .product-main-swiper .swiper-button-prev:after {
          font-size: 15px;
          font-weight: bold;
        }
        
        .product-main-swiper .swiper-button-next:hover,
        .product-main-swiper .swiper-button-prev:hover {
          background-color: rgba(255, 255, 255, 1);
        }
        
        .product-main-swiper .swiper-pagination-bullet {
          width: 8px;
          height: 8px;
          background: #cbd5e1;
          opacity: 0.5;
        }
        
        .product-main-swiper .swiper-pagination-bullet-active {
          background: #334155;
          opacity: 1;
        }
        
        // Adjust grid dynamically based on gridColumns state
        .lg\:grid-cols-${gridColumns} {
           grid-template-columns: repeat(${gridColumns}, minmax(0, 1fr));
        }
      `}</style>
    </ShopLayout>
  );
});

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
          <div className="relative max-h-full max-w-full w-full h-full flex items-center justify-center">
            <Image
              src={currentImage}
              alt={productName}
              className="object-contain"
              fill
              style={{ objectFit: 'contain' }}
              priority={false}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            />
          </div>
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

export default ProductDetailPage; 