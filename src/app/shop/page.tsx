'use client';

import React, { useCallback, useEffect, useState, Suspense, useMemo, useRef, memo } from 'react';
import { ShopLayout } from '@/components/layouts/shop-layout';
import { ProductCard } from '@/components/shop/product-card';
import { getProducts, getProductsByCategory, getCategories, getSettings } from '@/lib/firebase-service';
import { Product, Category } from '@/types';
import { ShoppingCart, SlidersHorizontal, ArrowLeft, ArrowRight, ChevronLeft, ChevronDown, X, Filter as FilterIcon, FilterX } from 'lucide-react';
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
import { Checkbox } from "@/components/ui/checkbox";
import FeaturedProducts from '@/components/shop/featured-products';

type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

interface ShopPageProps {
  initialProducts: Product[];
  initialMinMaxPrice: [number, number];
}

interface SiteSettings {
  loadingType: 'infinite' | 'button';
  productsPerLoad: number;
}

// მემოიზებული SearchParamsSection კომპონენტი
const MemoizedSearchParamsSection = memo(function SearchParamsSection({ 
  setSearchTerm,
  setCategoryId
}: { 
  setSearchTerm: (value: string) => void,
  setCategoryId: (value: string | null) => void
}) {
  const searchParams = useSearchParams();
  const searchTerm = searchParams ? searchParams.get('search') || '' : '';
  const categoryId = searchParams ? searchParams.get('category') || null : null;
  const fromProduct = searchParams ? searchParams.get('fromProduct') === 'true' : false;
  
  // თვალყური მივადევნოთ ამ პარამეტრებს
  useEffect(() => {
    console.log('search params წაკითხულია:', { categoryId, fromProduct });
  }, [searchParams, categoryId, fromProduct]);
  
  useEffect(() => {
    setSearchTerm(searchTerm);
  }, [searchTerm, setSearchTerm]);
  
  useEffect(() => {
    console.log('MemoizedSearchParamsSection: categoryId განახლება:', categoryId, 'fromProduct:', fromProduct);
    setCategoryId(categoryId);
    
    // თუ fromProduct=true, მაშინ ვუთითებთ URL-ს ხელახლა, 
    // ამჯერად fromProduct პარამეტრის გარეშე, რომ მისი ნავიგაციის ისტორია სწორად შენახულიყო
    if (fromProduct && categoryId) {
      // დავაყოვნოთ ცოტა დროით, რომ დარწმუნებული ვიყოთ state განახლდა
      setTimeout(() => {
        window.history.replaceState(
          null, 
          '', 
          `/shop?category=${categoryId}`
        );
      }, 100);
    }
  }, [categoryId, setCategoryId, fromProduct]);
  
  return null;
});

// მემოიზებული ProductCard კომპონენტი 
const MemoizedProductCard = memo(ProductCard);

// მემოიზებული ფილტრის აიკონები, რათა თავიდან ავიცილოთ ზედმეტი რერენდერინგი
const MemoizedFilterIcon = memo(function MemoizedFilterIcon({ className }: { className: string }) {
  return <FilterIcon className={className} />;
});
MemoizedFilterIcon.displayName = 'MemoizedFilterIcon';

const MemoizedFilterXIcon = memo(function MemoizedFilterXIcon({ className }: { className: string }) {
  return <FilterX className={className} />;
});
MemoizedFilterXIcon.displayName = 'MemoizedFilterXIcon';

const MemoizedChevronDown = memo(function MemoizedChevronDown({ className }: { className: string }) {
  return <ChevronDown className={className} />;
});
MemoizedChevronDown.displayName = 'MemoizedChevronDown';

// დებაუნსის ფუნქცია
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
}

// შეცვლილი applyFilters ფუნქცია, this-ის გარეშე
function applyFilters(
  allProducts: Product[],
  filters: {
    priceRange: [number, number];
    categories: string[];
    searchTerm: string;
  }
) {
  return allProducts.filter((product) => {
    // ფასი
    const inPriceRange = product.price >= filters.priceRange[0] && 
                        product.price <= filters.priceRange[1];
    
    // კატეგორია
    const inCategory = filters.categories.length === 0 || 
                      (product.categoryId && filters.categories.includes(product.categoryId));
    
    // ძიება
    const matchesSearch = !filters.searchTerm || 
                        product.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    return inPriceRange && inCategory && matchesSearch;
  });
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
  const [columnsPerView, setColumnsPerView] = useState(4);
  const [itemsPerPage, setItemsPerPage] = useState(12 * 4);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // დავამატოთ სტეიტი, რომელიც აღრიცხავს, არსებობს თუ არა სპეციალური პროდუქტები
  const [hasSpecialProducts, setHasSpecialProducts] = useState<boolean | null>(null);

  // სისტემის პარამეტრები
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    loadingType: 'infinite',
    productsPerLoad: 20
  });

  const { addToCart } = useCart();

  // დროებითი ფილტრები (UI-ში შეცვლისთვის)
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [tempSortOption, setTempSortOption] = useState<SortOption>('newest');
  const [tempShowDiscountedOnly, setTempShowDiscountedOnly] = useState(false);
  const [temporaryPriceRange, setTemporaryPriceRange] = useState<[number, number]>([0, 0]);

  // გამოყენებული ფილტრები (რეალური ფილტრაციისთვის)
  const [appliedSearchTerm, setAppliedSearchTerm] = useState('');
  const [appliedSortOption, setAppliedSortOption] = useState<SortOption>('newest');
  const [appliedShowDiscountedOnly, setAppliedShowDiscountedOnly] = useState(false);
  const [appliedPriceRange, setAppliedPriceRange] = useState<[number, number]>([0, 0]);
  
  // რეფები ინფუთებისთვის
  const minPriceRef = useRef<HTMLInputElement>(null);
  const maxPriceRef = useRef<HTMLInputElement>(null);
  const minPriceMobileRef = useRef<HTMLInputElement>(null);
  const maxPriceMobileRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ფანჯრის სიმაღლის სტეიტი
  const [windowHeight, setWindowHeight] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);
  
  // ზედა ნავიგაციის სიმაღლე გამოვიანგარიშოთ
  useEffect(() => {
    // დავაყენოთ საწყისი window სიმაღლე და სიგანე
    setWindowHeight(window.innerHeight);
    setWindowWidth(window.innerWidth);
    
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // გამოვთვალოთ სვეტების რაოდენობა ეკრანის სიგანის მიხედვით
  useEffect(() => {
    // განვსაზღვროთ სვეტების რაოდენობა ეკრანის სიგანიდან
    let columns = 4; // დეფოლტი - 4 სვეტი

    if (windowWidth < 640) {
      columns = 2; // მობილურზე 2 სვეტი
    } else if (windowWidth < 1024) {
      columns = 3; // ტაბლეტზე 3 სვეტი
    } else if (windowWidth >= 1280) {
      columns = showFilters ? 4 : 5; // დიდ ეკრანზე 4 ან 5 სვეტი, ფილტრის გამოჩენის მიხედვით
    }

    setColumnsPerView(columns);
  }, [windowWidth, showFilters]);

  // პროდუქტების რაოდენობის განახლება სვეტების რაოდენობისა და სისტემის პარამეტრების მიხედვით
  useEffect(() => {
    const rowsToLoad = siteSettings.productsPerLoad || 20;
    setItemsPerPage(rowsToLoad * columnsPerView);
  }, [columnsPerView, siteSettings.productsPerLoad]);
  
  // ფილტრის მაქსიმალური სიმაღლის გამოთვლა ეკრანის მიხედვით
  const filterTopPosition = useMemo(() => {
    return 'var(--header-height, 80px)';
  }, []);

  // ინიციალიზაცია localStorage-დან
  useEffect(() => {
    try {
      // შევამოწმოთ არის თუ არა სპეციალური პროდუქტების ინფორმაცია შენახული
      const hasSpecialProductsSaved = localStorage.getItem('shopHasSpecialProducts');
      if (hasSpecialProductsSaved !== null) {
        const hasSpecial = hasSpecialProductsSaved === 'true';
        setHasSpecialProducts(hasSpecial);
      }
      
      // მინ-მაქს ფასების აღდგენა localStorage-დან
      const savedPriceRange = localStorage.getItem('shopPriceRange');
      if (savedPriceRange) {
        const parsedRange = JSON.parse(savedPriceRange) as [number, number];
        if (Array.isArray(parsedRange) && parsedRange.length === 2) {
          setTemporaryPriceRange(parsedRange);
          setAppliedPriceRange(parsedRange);
          setUserModifiedRange(true);
        }
      }
      
      // დახარისხების პარამეტრების აღდგენა
      const savedSortOption = localStorage.getItem('shopSortOption') as SortOption | null;
      if (savedSortOption) {
        setTempSortOption(savedSortOption);
        setAppliedSortOption(savedSortOption);
      }
      
      // ფასდაკლების ფილტრის აღდგენა
      const savedDiscountOnly = localStorage.getItem('shopDiscountOnly');
      if (savedDiscountOnly) {
        const isDiscountOnly = savedDiscountOnly === 'true';
        setTempShowDiscountedOnly(isDiscountOnly);
        setAppliedShowDiscountedOnly(isDiscountOnly);
      }
    } catch (error) {
      console.error('Error loading filter settings from localStorage:', error);
    }
  }, []);

  const calculateInitialPriceRange = useCallback((productsData: Product[]) => {
    let calculatedMinMax: [number, number] = [0, 1000];
    if (productsData.length > 0) {
      const prices = productsData.map(p => p.price || 0);
      calculatedMinMax = [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
    }
    return calculatedMinMax;
  }, []);

  // დავამატოთ categoryId წინა მნიშვნელობის მიდევნება
  const prevCategoryIdRef = useRef<string | null>(null);
  
  // როდესაც categoryId იცვლება, ვლოგავთ
  useEffect(() => {
    console.log('categoryId შეიცვალა:', {
      previousValue: prevCategoryIdRef.current,
      newValue: categoryId
    });
    prevCategoryIdRef.current = categoryId;
  }, [categoryId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // ჯერ ჩავტვირთოთ სისტემის პარამეტრები
        const systemSettings = await getSettings();
        if (systemSettings) {
          // შევინახოთ მხოლოდ საჭირო პარამეტრები
          const loadingSettings: SiteSettings = {
            loadingType: systemSettings.loadingType || 'infinite',
            productsPerLoad: systemSettings.productsPerLoad || 20
          };
          setSiteSettings(loadingSettings);
        }

        // პროდუქტებისა და კატეგორიების ჩატვირთვა
        let productsData: Product[] = [];
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        
        console.log('კატეგორიები ჩატვირთულია, მიმდინარე categoryId:', categoryId);
        
        if (categoryId) {
          // კატეგორიის მიხედვით პროდუქტების ჩატვირთვა
          productsData = await getProductsByCategory(categoryId);
          const category = categoriesData.find(cat => cat.id === categoryId);
          console.log('კატეგორია ნაპოვნია:', category);
          
          if (category) {
            console.log('კატეგორიის სახელის დაყენება:', category.name);
            setActiveCategoryName(category.name);
          } else {
            console.error('კატეგორია ვერ მოიძებნა ID-თვის:', categoryId);
          }
        } else {
          console.log('ყველა პროდუქტის ჩატვირთვა (categoryId არ არის)');
          productsData = await getProducts();
        }
        
        setProducts(productsData);
        
        // შემოწმება არის თუ არა რომელიმე მონიშნული პროდუქტი (სპეციალური, გამორჩეული, ახალი კოლექცია)
        const hasAnySpecial = productsData.some(p => 
          Boolean((p as any).isSpecial) || 
          Boolean((p as any).isFeatured) || 
          Boolean((p as any).isNewCollection)
        );
        setHasSpecialProducts(hasAnySpecial);
        
        // შევინახოთ სპეციალური პროდუქტების არსებობის ინფორმაცია
        localStorage.setItem('shopHasSpecialProducts', hasAnySpecial.toString());
        
        // ფასის საზღვრებს ვიანგარიშებთ მხოლოდ თუ მომხმარებელს არ აქვს შენახული ფილტრი
        if (!userModifiedRange) {
          const calculatedMinMax = calculateInitialPriceRange(productsData);
          setInitialMinMaxPrice(calculatedMinMax);
          setMinMaxPrice(calculatedMinMax);
          setPriceRange(calculatedMinMax);
          
          // თუ localStorage-ში არ არის შენახული, მაშინ ვიყენებთ გამოთვლილ მნიშვნელობებს
          if (!localStorage.getItem('shopPriceRange')) {
            setTemporaryPriceRange(calculatedMinMax);
            setAppliedPriceRange(calculatedMinMax);
          }
        }
        
        // საწყისი მნიშვნელობების განახლება URL-დან (თუ არსებობს)
        if (searchTerm) {
          setTempSearchTerm(searchTerm);
          setAppliedSearchTerm(searchTerm);
        }
      } catch (error) {
        console.error('Error fetching initial products:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [categoryId, calculateInitialPriceRange, searchTerm, userModifiedRange]);

  const handleReset = useCallback(() => {
    const resetValues: [number, number] = [minMaxPrice[0], minMaxPrice[1]];
    
    // რესეტ ინფუთებში მნიშვნელობები
    if (minPriceRef.current) minPriceRef.current.value = resetValues[0].toString();
    if (maxPriceRef.current) maxPriceRef.current.value = resetValues[1].toString();
    if (minPriceMobileRef.current) minPriceMobileRef.current.value = resetValues[0].toString();
    if (maxPriceMobileRef.current) maxPriceMobileRef.current.value = resetValues[1].toString();
    if (searchInputRef.current) searchInputRef.current.value = '';
    
    // დროებითი ფილტრების განულება
    setTemporaryPriceRange(resetValues);
    setTempSearchTerm('');
    setTempSortOption('newest');
    setTempShowDiscountedOnly(false);
    
    // გამოყენებული ფილტრების განულება
    setAppliedPriceRange(resetValues);
    setAppliedSearchTerm('');
    setAppliedSortOption('newest');
    setAppliedShowDiscountedOnly(false);
    
    setUserModifiedRange(false);
    
    // წავშალოთ შენახული ფილტრები localStorage-დან
    localStorage.removeItem('shopPriceRange');
    localStorage.removeItem('shopSortOption');
    localStorage.removeItem('shopDiscountOnly');
  }, [minMaxPrice]);

  const handleApplyFilter = useCallback((isMobile: boolean) => {
    const minInput = isMobile ? minPriceMobileRef.current : minPriceRef.current;
    const maxInput = isMobile ? maxPriceMobileRef.current : maxPriceRef.current;
    
    if (minInput && maxInput) {
      const minPrice = parseFloat(minInput.value) || 0;
      const maxPrice = parseFloat(maxInput.value) || 0;
      
      const newPriceRange: [number, number] = [minPrice, maxPrice];
      setTemporaryPriceRange(newPriceRange);
      setAppliedPriceRange(newPriceRange);
      setUserModifiedRange(true);
      
      // შევინახოთ ფასის საზღვრები localStorage-ში
      localStorage.setItem('shopPriceRange', JSON.stringify(newPriceRange));
    }
    
    // გამოყენებული ფილტრების განახლება დროებითი ფილტრებიდან
    setAppliedSearchTerm(tempSearchTerm);
    setAppliedSortOption(tempSortOption);
    setAppliedShowDiscountedOnly(tempShowDiscountedOnly);
    
    // შევინახოთ დახარისხების პარამეტრი და ფასდაკლების ფილტრი localStorage-ში
    localStorage.setItem('shopSortOption', tempSortOption);
    localStorage.setItem('shopDiscountOnly', tempShowDiscountedOnly.toString());
    
    // ვაყენებთ მიმდინარე გვერდს 1-ზე, რომ თავიდან დავიწყოთ ფილტრირებული შედეგების ჩვენება
    setCurrentPage(1);
    
    // დავამატოთ ანიმაცია - ხანმოკლე დაყოვნება, რომ ვიზუალურად უკეთესად გამოჩნდეს გაფილტვრა
    setTimeout(() => {
      // თუ კომპიუტერის სქროლის პოზიცია ქვემოთაა, ავწიოთ ზემოთ, რომ ახალი გაფილტრული შედეგები დავინახოთ
      if (window.scrollY > 300) {
        window.scrollTo({
          top: 300,
          behavior: 'smooth'
        });
      }
    }, 100);
  }, [tempSearchTerm, tempSortOption, tempShowDiscountedOnly]);

  const allFilteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // გაუმჯობესებული ფასების ფილტრაცია
        const priceCondition = userModifiedRange 
          ? (product.price >= appliedPriceRange[0] && product.price <= appliedPriceRange[1])
          : true;
          
        // ფასდაკლებების ფილტრაცია
        const discountCondition = appliedShowDiscountedOnly 
          ? (product.discountPercentage !== undefined && product.discountPercentage > 0)
          : true;
          
        return (product.name.toLowerCase().includes(appliedSearchTerm.toLowerCase()) ||
         product.description.toLowerCase().includes(appliedSearchTerm.toLowerCase())) &&
         priceCondition && discountCondition;
      })
      .sort((a, b) => {
        switch (appliedSortOption) {
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
  }, [products, appliedSearchTerm, appliedPriceRange, userModifiedRange, appliedSortOption, appliedShowDiscountedOnly]);
    
  const specialProducts = useMemo(() => {
    return allFilteredProducts.filter(product => Boolean((product as any).isSpecial));
  }, [allFilteredProducts]);

  // დავამატოთ featured და newCollection პროდუქტების ფილტრაცია
  const featuredProducts = useMemo(() => {
    return allFilteredProducts.filter(product => Boolean((product as any).isFeatured));
  }, [allFilteredProducts]);

  const newCollectionProducts = useMemo(() => {
    return allFilteredProducts.filter(product => Boolean((product as any).isNewCollection));
  }, [allFilteredProducts]);
  
  const filteredProducts = useMemo(() => {
    // თუ ფილტრაცია გააქტიურებულია (ძიება, ფასი ან ფასდაკლება), ვაჩვენოთ ყველა პროდუქტი ჩვეულებრივი ფორმით
    const isFilterActive = appliedSearchTerm !== '' || 
                           appliedShowDiscountedOnly || 
                           (userModifiedRange && 
                            (appliedPriceRange[0] > minMaxPrice[0] || 
                             appliedPriceRange[1] < minMaxPrice[1]));
    
    if (isFilterActive || categoryId) {
      // გაფილტვრის ან კატეგორიის არჩევის შემთხვევაში ყველა პროდუქტი ჩვეულებრივი ფორმით გამოვიდეს
      return allFilteredProducts;
    }
    
    // თუ ფილტრაცია არ არის გააქტიურებული, ვაჩვენოთ მხოლოდ ჩვეულებრივი პროდუქტები გრიდში
    // ხოლო სპეციალურები, გამორჩეულები და ახალი კოლექცია - თავიანთ სპეციალურ სექციებში
    return allFilteredProducts.filter(product => 
      !Boolean((product as any).isSpecial) && 
      !Boolean((product as any).isFeatured) && 
      !Boolean((product as any).isNewCollection)
    );
  }, [allFilteredProducts, categoryId, appliedSearchTerm, appliedShowDiscountedOnly, appliedPriceRange, userModifiedRange, minMaxPrice]);
  
  const allProductsForSmallScreens = useMemo(() => [...allFilteredProducts], [allFilteredProducts]);

  const indexOfLastItem = currentPage * itemsPerPage;

  // მემოიზებული PriceRangeInputs კომპონენტი - გადაკეთებული კომპაქტური ვერსია
  const PriceRangeInputs = memo(function PriceRangeInputs({isMobile}: {isMobile: boolean}) {
    const idPrefix = isMobile ? 'mobile' : 'desktop';
    const minRef = isMobile ? minPriceMobileRef : minPriceRef;
    const maxRef = isMobile ? maxPriceMobileRef : maxPriceRef;
    
    // ფუნქცია დაიყენოს საწყისი მნიშვნელობები კომპონენტის მაუნთისას
    useEffect(() => {
      if (minRef.current && temporaryPriceRange[0] !== undefined) {
        minRef.current.value = temporaryPriceRange[0].toString();
      }
      if (maxRef.current && temporaryPriceRange[1] !== undefined) {
        maxRef.current.value = temporaryPriceRange[1].toString();
      }
    }, [temporaryPriceRange, minRef, maxRef]);
    
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-medium">ფასი</h2>
        <div className="flex items-center justify-between gap-2">
          <input
            id={`min-price-${idPrefix}`}
            ref={minRef}
            type="number"
            className="border rounded-md px-2 py-1 w-20 text-center text-sm"
            defaultValue={temporaryPriceRange[0]}
            placeholder="მინ"
            aria-label="მინიმალური ფასი"
          />
          <div className="flex items-center justify-center">
            <span className="text-gray-400 text-sm">-</span>
          </div>
          <input
            id={`max-price-${idPrefix}`}
            ref={maxRef}
            type="number"
            className="border rounded-md px-2 py-1 w-20 text-center text-sm"
            defaultValue={temporaryPriceRange[1]}
            placeholder="მაქს"
            aria-label="მაქსიმალური ფასი"
          />
        </div>
      </div>
    );
  });
  PriceRangeInputs.displayName = 'PriceRangeInputs';

  // SearchInput კომპონენტი გამოუყენებელია, ამოღებულია

  // მემოიზებული SortSelector კომპონენტი - კომპაქტური ვერსია
  const SortSelector = memo(function SortSelector() {
    return (
      <div className="space-y-2">
        <h2 className="text-xs font-medium">დახარისხება</h2>
        
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select
              value={tempSortOption}
              onValueChange={(value) => setTempSortOption(value as SortOption)}
            >
              <SelectTrigger aria-label="დახარისხების პარამეტრები" className="text-xs py-1 h-8">
                <SelectValue placeholder="აირჩიეთ" />
              </SelectTrigger>
              <SelectContent className="text-sm">
                <SelectItem value="newest">უახლესი</SelectItem>
                <SelectItem value="oldest">უძველესი</SelectItem>
                <SelectItem value="price-asc">ფასი: დაბლიდან მაღლა</SelectItem>
                <SelectItem value="price-desc">ფასი: მაღლიდან დაბლა</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-1">
            <Checkbox 
              id="show-discounted-desktop" 
              checked={tempShowDiscountedOnly}
              onCheckedChange={(checked: boolean | 'indeterminate') => setTempShowDiscountedOnly(!!checked)}
            />
            <Label 
              htmlFor="show-discounted-desktop" 
              className="text-xs whitespace-normal break-words max-w-[80px]"
            >
              ფასდაკლებული
            </Label>
          </div>
        </div>
      </div>
    );
  });
  SortSelector.displayName = 'SortSelector';

  // ფასდაკლებების მობილური ვერსიის ფილტრი
  const MobileDiscountFilter = memo(function MobileDiscountFilter() {
    return (
      <div className="flex items-center space-x-2 my-2">
        <Checkbox 
          id="show-discounted-mobile" 
          checked={tempShowDiscountedOnly}
          onCheckedChange={(checked: boolean | 'indeterminate') => setTempShowDiscountedOnly(!!checked)}
        />
        <Label 
          htmlFor="show-discounted-mobile"
          className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-normal break-words max-w-[150px]"
        >
          მხოლოდ ფასდაკლებული
        </Label>
      </div>
    );
  });
  MobileDiscountFilter.displayName = 'MobileDiscountFilter';

  // სკროლის პოზიციის შესანარჩუნებელი ლოგიკა
  useEffect(() => {
    // დავაფიქსიროთ სქროლის პოზიცია დოკუმენტის ისტორიაში
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    
    // არ ვბლოკავთ სქროლს ჩატვირთვისას - ეს იწვევდა ხტუნაობას
    // ჩვენ უბრალოდ ვიმახსოვრებთ პოზიციას ნავიგაციისთვის
    
    // ეს ფუნქცია გამოიძახება კომპონენტის დამონტაჟების დროს
    // და რომ დავრწმუნდეთ რომ სწორად ჩატვირთვისას პოზიცია შენარჩუნდება
    return () => {
      // გაწმენდისას არაფერს ვაკეთებთ - კომპონენტის გათიშვისას ნავიგაციის
      // მექანიზმი თავად იზრუნებს სქროლის პოზიციაზე
    };
  }, []);

  // ინფინიტი სქროლის ლოგიკა
  useEffect(() => {
    // თუ ჩატვირთვის ტიპი არ არის ინფინიტი, მაშინ ეს ლოგიკა არ გვჭირდება
    if (siteSettings.loadingType !== 'infinite') return;

    // დებაუნსდ სქროლის ფუნქცია, რომ ზედმეტად ხშირად არ მოხდეს გამოძახება
    const debouncedScrollHandler = debounce(() => {
      // თუ მომხმარებელი მივიდა გვერდის ბოლომდე ან მიუახლოვდა ბოლოს (300px დაშორება)
      if (
        window.innerHeight + document.documentElement.scrollTop + 300 >=
        document.documentElement.scrollHeight
      ) {
        // თუ არსებობს მეტი პროდუქტი ჩასატვირთად და არ მიმდინარეობს ჩატვირთვა
        if (indexOfLastItem < filteredProducts.length && !isLoadingMore) {
          setIsLoadingMore(true);
          
          // დავაყოვნოთ ცოტა დროით ანიმაციისთვის
          setTimeout(() => {
            setCurrentPage(prev => prev + 1);
            setIsLoadingMore(false);
          }, 300);
        }
      }
    }, 200); // გაზრდილი დებაუნსის დაყოვნება 200მს, უფრო გლუვი სქროლისთვის

    // დავაკავშიროთ სქროლის მოვლენა
    window.addEventListener('scroll', debouncedScrollHandler);

    // გაწმენდა კომპონენტის unmount-ის დროს
    return () => {
      window.removeEventListener('scroll', debouncedScrollHandler);
    };
  }, [filteredProducts.length, indexOfLastItem, isLoadingMore, siteSettings.loadingType]);

  const handleLoadMore = () => {
    if (indexOfLastItem < filteredProducts.length && !isLoadingMore) {
      setIsLoadingMore(true);
      
      // მარტივად დავამატოთ ახალი პროდუქტები დაყოვნების გარეშე
      setCurrentPage(prev => prev + 1);
      
      // დავაყენოთ ისევ isLoadingMore ფალს - მცირე დაყოვნებით
      // რომ UI-ს ჰქონდეს საშუალება აჩვენოს ჩატვირთვის ინდიკატორი
      setTimeout(() => {
        setIsLoadingMore(false);
      }, 300);
    }
  };

  // ფილტრის ფუნქცია უკვე გვაქვს ზემოთ, აღარ გვჭირდება დუბლირება

  return (
    <ShopLayout>
      <Suspense fallback={<div>Loading search parameters...</div>}>
        <MemoizedSearchParamsSection setSearchTerm={setTempSearchTerm} setCategoryId={setCategoryId} />
      </Suspense>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {activeCategoryName ? `კატეგორია: ${activeCategoryName}` : "ყველა პროდუქტი"}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-muted-foreground">
            {categoryId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="px-0 hover:bg-transparent hover:text-primary -ml-2"
                onClick={() => {
                  // ვშლით კატეგორიის პარამეტრს
                  setCategoryId(null);
                  setActiveCategoryName(null);
                  // გადავდივართ იგივე გვერდზე კატეგორიის პარამეტრის გარეშე
                  router.push('/shop');
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                ყველა პროდუქტის ჩვენება
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
                  <div className="flex items-center justify-between">
                    <SheetTitle>ფილტრი</SheetTitle>
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        aria-label="ფილტრის დახურვა"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </SheetClose>
                  </div>
                  <SheetDescription>
                    დააფილტრეთ და დაალაგეთ პროდუქტები
                  </SheetDescription>
                </SheetHeader>
                <div className="space-y-6 py-4">
                  <PriceRangeInputs isMobile={true} />
                  <MobileDiscountFilter />
                  <SortSelector />
                </div>
                <div className="pt-4 space-y-2">
                  <Button onClick={(e) => {
                    e.preventDefault();
                    handleApplyFilter(true);
                  }} variant="default" className="w-full">
                    გაფილტვრა
                  </Button>
                  <Button onClick={handleReset} variant="outline" className="w-full">
                    ფილტრის გასუფთავება
                  </Button>
                  <SheetClose asChild>
                    <Button variant="ghost" className="w-full mt-1">
                      ფილტრის დახურვა
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {showFilters && (
          <div className="hidden md:block md:w-56 lg:w-64 transition-all duration-300 ease-in-out">
            <Card className="sticky shadow-sm hover:shadow-md transition-shadow duration-200" style={{ top: filterTopPosition }}>
              <CardHeader className="py-2 px-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">ფილტრი</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowFilters(false)}
                    className="h-6 w-6 p-0"
                    aria-label="ფილტრის დახურვა"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 py-0 px-3">
                <PriceRangeInputs isMobile={false} />
                <SortSelector />
              </CardContent>
              <CardFooter className="flex flex-col space-y-2 py-2 px-3">
                <Button onClick={(e) => {
                  e.preventDefault();
                  handleApplyFilter(false);
                }} variant="default" className="w-full text-xs py-1 h-8">
                  გაფილტვრა
                </Button>
                <Button onClick={handleReset} variant="outline" className="w-full text-xs py-1 h-8">
                  გასუფთავება
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        <div className={`flex-1 overflow-x-hidden transition-all duration-300 ease-in-out ${!showFilters ? "w-full" : ""}`} style={{ overflowAnchor: 'none' }}>
          {!showFilters && (
            <div className="mb-4 transition-opacity duration-200 ease-in-out">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 text-xs hover:bg-slate-100 ml-0"
                onClick={() => setShowFilters(true)}
              >
                <MemoizedFilterIcon className="h-3.5 w-3.5" />
                <span>ფილტრის ჩართვა</span>
              </Button>
            </div>
          )}

          {/* სპეციალური პროდუქტის დივი - ჩატვირთვის შემდეგ გამოჩნდება, მხოლოდ თუ არსებობს მონიშნული პროდუქტები და არ არის არჩეული კატეგორია */}
          {!isLoading && !categoryId && (specialProducts.length > 0 || featuredProducts.length > 0 || newCollectionProducts.length > 0) && 
            // დავამატოთ შემოწმება - არ აჩვენოს სპეციალური სექციები, თუ ფილტრაცია გააქტიურებულია
            !(appliedSearchTerm !== '' || 
              appliedShowDiscountedOnly || 
              (userModifiedRange && 
               (appliedPriceRange[0] > minMaxPrice[0] || 
                appliedPriceRange[1] < minMaxPrice[1]))) && (
            <div className="mb-6 sm:mb-8 relative overflow-hidden rounded-xl">
              <div className={`w-full ${!showFilters ? "pl-0" : ""}`}>
                <FeaturedProducts fullWidth={!showFilters} /> 
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-8">
              {/* პროდუქტების გრიდის სკელეტონი */}
              <div className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {[...Array(8)].map((_, index) => (
                    <div key={index} className="space-y-3 border border-gray-100 p-3 sm:p-4 rounded-lg">
                      <div className="aspect-square bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={`star-${index}-${i}`} className="w-3 h-3 bg-gray-200 rounded-full animate-pulse"></div>
                        ))}
                      </div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                      <div className="flex justify-between items-center">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
                        <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse"></div>
                      </div>
                </div>
              ))}
                </div>
              </div>
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
              {/* სპეციალური პროდუქტის დივში უკვე არის კონტენტი */}
              
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
                      grid-row: span 1;
                      aspect-ratio: 1/1;
                      max-height: 80vh;
                    }
                    .product-grid {
                      display: grid;
                      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                      gap: 1rem;
                      max-width: 1400px;
                      margin: 0 auto;
                      overflow: hidden;
                      width: 100%;
                      transition: all 0.3s ease;
                      padding-left: 0;
                      min-height: 300px;
                    }
                    .product-grid.full-width {
                      max-width: 100%;
                      animation: fadeIn 0.3s ease-out;
                      padding-left: 0;
                      margin-left: 0;
                    }
                    @keyframes fadeIn {
                      from { opacity: 0.9; transform: translateY(5px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                    .product-grid-item {
                      display: flex;
                      min-width: 0;
                    }
                    .special-grid-item {
                      grid-column: span 1;
                      grid-row: span 1;
                      min-height: 220px;
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
                    .loading-indicator-container {
                      height: 60px;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      margin-top: 1rem;
                      margin-bottom: 1rem;
                    }
                    @media (min-width: 1280px) {
                      .product-grid {
                        grid-template-columns: repeat(4, 1fr);
                      }
                      .product-grid.full-width {
                        grid-template-columns: repeat(5, 1fr);
                      }
                    }
                    @media (max-width: 1279px) {
                      .product-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 0.75rem;
                      }
                      .product-grid.full-width {
                        grid-template-columns: repeat(4, 1fr);
                      }
                    }
                    @media (max-width: 1023px) {
                      .product-grid {
                        grid-template-columns: repeat(3, 1fr);
                        gap: 0.75rem;
                      }
                      .product-grid.full-width {
                        grid-template-columns: repeat(3, 1fr);
                      }
                    }
                    @media (max-width: 767px) {
                      .product-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.5rem;
                      }
                      .product-grid-item {
                        grid-column: span 1;
                        grid-row: span 1;
                      }
                    }
                    @media (max-width: 639px) {
                      .product-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 0.5rem;
                      }
                    }
                  `}</style>
                  
                  <div className={`product-grid ${!showFilters ? "full-width" : ""}`}>
                    {filteredProducts.slice(0, indexOfLastItem).map((product: Product) => (
                      <div key={product.id} className="xs:p-1 mb-4">
                        <MemoizedProductCard product={product} />
                      </div>
                    ))}
                  </div>
                  
                  {/* მეტი პროდუქტის ჩატვირთვის ინდიკატორი - მხოლოდ ჩატვირთვისას */}
                  {isLoadingMore && (
                    <div className="loading-indicator-container">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  )}
                  
                  {/* ყველა პროდუქტი ჩატვირთულია ინდიკატორი - მხოლოდ როცა ყველა ჩატვირთულია */}
                  {!isLoadingMore && filteredProducts.length > 0 && indexOfLastItem >= filteredProducts.length && (
                    <div className="loading-indicator-container">
                      <div className="text-muted-foreground text-sm">
                        ყველა პროდუქტი ჩატვირთულია
                      </div>
                    </div>
                  )}
                  
                  {/* მეტის ჩატვირთვის ღილაკი - ჩანს მხოლოდ button ტიპის ჩატვირთვის შემთხვევაში */}
                  {siteSettings.loadingType === 'button' && !isLoadingMore && filteredProducts.length > 0 && indexOfLastItem < filteredProducts.length && (
                    <div className="loading-indicator-container">
                      <Button 
                        onClick={handleLoadMore} 
                        variant="outline" 
                        className="px-6"
                      >
                        მეტის ჩატვირთვა
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ShopLayout>
  );
} 