'use client';

import { useEffect, useState, useCallback, useMemo, memo, useRef, lazy, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star, ShoppingCart } from "lucide-react"
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, FreeMode, Scrollbar, Autoplay } from 'swiper/modules'

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Product } from "@/types"
import { getProducts } from "@/lib/firebase-service"
import { useCart } from "@/components/providers/cart-provider"

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/free-mode'
import 'swiper/css/scrollbar'

// მემოიზებული ვარსკვლავების კომპონენტი - გაუმჯობესებული ვერსია
const RatingStars = memo(({ count = 5, filled = 4, size = "small" }: { count?: number; filled?: number; size?: "small" | "medium" | "large" }) => {
  // სტატიკური ზომები კალკულაციის თავიდან ასაცილებლად
  const starSize = size === "small" ? "h-3 w-3" : size === "medium" ? "h-3.5 w-3.5" : "h-4 w-4";
  
  // არ გამოვიყენებთ useState შიდა მასივისთვის - ესეც შეამცირებს მეხსიერების გამოყენებას
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Star 
          key={i} 
          className={`${starSize} ${i < filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} 
        />
      ))}
    </>
  );
});

RatingStars.displayName = 'RatingStars';

// მემოიზებული ფასის კომპონენტი - გაუმჯობესებული პერფორმანსით
const PriceDisplay = memo(({ originalPrice, discountedPrice, hasDiscount, size = "small" }: 
  { originalPrice: number; discountedPrice: number; hasDiscount: boolean; size?: "small" | "medium" | "large" }) => {
  
  // წინასწარ განსაზღვრული ფონტის ზომები useCallback-ის ნაცვლად
  const fontSize = size === "small" ? "text-xs sm:text-sm" : 
                   size === "medium" ? "text-sm sm:text-base" : 
                   "text-lg sm:text-xl md:text-2xl";
  
  // არ გამოვიყენებთ პირობით რენდერს და ერთიან სტრუქტურას გამოვიყენებთ
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className={`${fontSize} font-bold`}>₾{discountedPrice.toFixed(2)}</span>
      {hasDiscount && (
        <span className="text-xs text-muted-foreground line-through">
          ₾{originalPrice.toFixed(2)}
        </span>
      )}
    </div>
  );
});

PriceDisplay.displayName = 'PriceDisplay';

// მემოიზებული პროდუქტის ბარათების კომპონენტები
const FeaturedProductCard = memo(({ 
  product, 
  onAddToCart 
}: { 
  product: Product; 
  onAddToCart: (product: Product) => void 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 10; // Pixels

  // drag ფუნქციონალი გავაერთიანეთ პერფორმანსისთვის
  const dragHandlers = useMemo(() => ({
    handleMouseDown: (e: React.MouseEvent) => {
      startPos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(false);
    },
    handleMouseMove: (e: React.MouseEvent) => {
      if (!startPos.current || e.buttons !== 1) return; 
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        setIsDragging(true);
      }
    },
    handleMouseUp: () => {
      startPos.current = null; 
    },
    handleClickCapture: (e: React.MouseEvent) => {
      if (isDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
      setIsDragging(false);
    }
  }), [isDragging]);

  // მემოიზებული ფასდაკლების გამოთვლა - მხოლოდ საჭირო პროპერთებზე დამოკიდებულით
  const discount = useMemo(() => {
    if (product.hasPublicDiscount && product.discountPercentage && product.promoActive) {
      const discountedPrice = product.price * (1 - product.discountPercentage / 100);
      return {
        hasDiscount: true,
        originalPrice: product.price,
        discountedPrice,
        percentage: product.discountPercentage
      };
    }
    return { hasDiscount: false, originalPrice: product.price, discountedPrice: product.price, percentage: 0 };
  }, [product.hasPublicDiscount, product.discountPercentage, product.promoActive, product.price]);

  // მემოიზებული ფუნქციები
  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  }, [onAddToCart, product]);

  // მემოიზებული სურათის URL - გამოვიყენებთ null coalescing ოპერატორს (??)
  const imageUrl = product.images[0] ?? "/placeholder.svg?height=400&width=400";

  // მემოიზებული პროდუქტის URL
  const productUrl = `/shop/product/${product.id}`;

  // DOM-ის ზომის შემცირებისთვის ვაოპტიმიზებთ JSX სტრუქტურას
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background hover:shadow-md transition-all h-full">
      <div className="absolute top-2 left-2 z-20">
        <Badge className="bg-amber-500 hover:bg-amber-600 px-1.5 py-0.5 text-xs text-black">გამორჩეული</Badge>
      </div>
      <Link 
        href={productUrl} 
        className="block w-full aspect-square bg-white relative overflow-hidden"
        onMouseDown={dragHandlers.handleMouseDown}
        onMouseMove={dragHandlers.handleMouseMove}
        onMouseUp={dragHandlers.handleMouseUp}
        onMouseLeave={dragHandlers.handleMouseUp}
        onClickCapture={dragHandlers.handleClickCapture}
      >
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-contain group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
          loading="lazy"
        />
      </Link>
      <div className="p-2 sm:p-3">
        <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1">{product.name}</h3>
        <div className="flex items-center mb-1.5">
          <RatingStars count={5} filled={4} size="small" />
          <span className="ml-1 text-xs text-muted-foreground">(42)</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between flex-wrap gap-1">
          <PriceDisplay 
            originalPrice={discount.originalPrice}
            discountedPrice={discount.discountedPrice}
            hasDiscount={discount.hasDiscount}
            size="small"
          />
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="default"
              className="rounded-full h-6 w-6 sm:h-7 sm:w-7 p-0"
              onClick={handleAddToCart}
              type="button"
            >
              <ShoppingCart className="h-3 w-3" />
              <span className="sr-only">კალათაში დამატება</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-full h-6 w-6 sm:h-7 sm:w-7 p-0"
              asChild
            >
              <Link href={productUrl}>
                <ArrowRight className="h-3 w-3" />
                <span className="sr-only">დეტალების ნახვა</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

FeaturedProductCard.displayName = 'FeaturedProductCard';

// ოპტიმიზებული NewCollectionCard კომპონენტი
const NewCollectionCard = memo(({ product }: { product: Product }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 10;

  // drag ფუნქციონალი გავაერთიანეთ პერფორმანსისთვის
  const dragHandlers = useMemo(() => ({
    handleMouseDown: (e: React.MouseEvent) => {
      startPos.current = { x: e.clientX, y: e.clientY };
      setIsDragging(false);
    },
    handleMouseMove: (e: React.MouseEvent) => {
      if (!startPos.current || e.buttons !== 1) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        setIsDragging(true);
      }
    },
    handleMouseUp: () => {
      startPos.current = null;
    },
    handleClickCapture: (e: React.MouseEvent) => {
      if (isDragging) {
        e.stopPropagation();
        e.preventDefault();
      }
      setIsDragging(false);
    }
  }), [isDragging]);

  // გაუმჯობესებული ფასდაკლების გამოთვლა
  const { 
    hasDiscount, 
    discountedPrice, 
    percentage 
  } = useMemo(() => {
    if (product.hasPublicDiscount && product.discountPercentage && product.promoActive) {
      return {
        hasDiscount: true,
        discountedPrice: product.price * (1 - product.discountPercentage / 100),
        percentage: product.discountPercentage
      };
    }
    return { 
      hasDiscount: false, 
      discountedPrice: product.price, 
      percentage: 0 
    };
  }, [product.hasPublicDiscount, product.discountPercentage, product.promoActive, product.price]);

  // წინასწარ დეკლარირებული ცვლადები
  const imageUrl = product.images[0] ?? "/placeholder.svg?height=200&width=160";
  const productUrl = `/shop/product/${product.id}`;
  const displayPrice = discountedPrice.toFixed(2);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg mb-1.5 bg-white">
        <Link 
          href={productUrl} 
          className="block w-full h-full"
          onMouseDown={dragHandlers.handleMouseDown}
          onMouseMove={dragHandlers.handleMouseMove}
          onMouseUp={dragHandlers.handleMouseUp}
          onMouseLeave={dragHandlers.handleMouseUp}
          onClickCapture={dragHandlers.handleClickCapture}
        >
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain transition-transform duration-300"
            sizes="(max-width: 639px) 45vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
            loading="lazy"
          />
        </Link>
        {hasDiscount && (
          <div className="absolute top-1 right-1">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 px-1 py-0.5 text-white text-[10px]">
              -{percentage}%
            </Badge>
          </div>
        )}
      </div>
      <h4 className="font-medium text-xs line-clamp-1">{product.name}</h4>
      <div className="flex items-center justify-between mt-0.5">
        <span className="font-semibold text-xs">₾{displayPrice}</span>
        <div className="flex items-center">
          <Star className="h-2.5 w-2.5 fill-yellow-400 text-yellow-400" />
          <span className="text-[10px] ml-0.5">4.8</span>
        </div>
      </div>
    </div>
  );
});

NewCollectionCard.displayName = 'NewCollectionCard';

// ოპტიმიზებული SpecialProductCard კომპონენტი
const SpecialProductCard = memo(({ 
  product, 
  onAddToCart 
}: { 
  product: Product; 
  onAddToCart: (product: Product) => void 
}) => {
  // ოპტიმიზებული ფასდაკლების გამოთვლა
  const { 
    hasDiscount, 
    originalPrice, 
    discountedPrice, 
    percentage 
  } = useMemo(() => {
    if (product.hasPublicDiscount && product.discountPercentage && product.promoActive) {
      return {
        hasDiscount: true,
        originalPrice: product.price,
        discountedPrice: product.price * (1 - product.discountPercentage / 100),
        percentage: product.discountPercentage
      };
    }
    return { 
      hasDiscount: false, 
      originalPrice: product.price, 
      discountedPrice: product.price, 
      percentage: 0 
    };
  }, [product.hasPublicDiscount, product.discountPercentage, product.promoActive, product.price]);

  // მემოიზებული ფუნქციები
  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  }, [onAddToCart, product]);

  // მემოიზებული სურათის URL
  const imageUrl = product.images[0] ?? "/placeholder.svg?height=600&width=600";

  return (
    <div className="relative overflow-hidden rounded-lg sm:rounded-xl group">
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20">
        <Badge className="bg-rose-500 hover:bg-rose-600 px-2 py-1 text-xs text-black">განსაკუთრებული შეთავაზება</Badge>
      </div>
      <div className="grid md:grid-cols-2 gap-4 bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/20 p-3 sm:p-5 rounded-lg">
        <div className="flex flex-col justify-center">
          <p className="text-lg sm:text-xl md:text-2xl font-bold mb-2 line-clamp-2">{product.name}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-4">
            {product.description}
          </p>
          {hasDiscount ? (
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl md:text-2xl font-bold">
                ₾{discountedPrice.toFixed(2)}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground line-through">
                ₾{originalPrice.toFixed(2)}
              </span>
              <Badge variant="outline" className="ml-1 text-xs text-emerald-600 border-emerald-600">
                {percentage}% ფასდაკლება
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl md:text-2xl font-bold">₾{originalPrice.toFixed(2)}</span>
            </div>
          )}
          <Button 
            size="sm" 
            className="w-full sm:w-auto bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm"
            onClick={handleAddToCart}
            type="button"
          >
            კალათაში დამატება
          </Button>
        </div>
        <div className="flex items-center justify-center md:order-last order-first mb-3 md:mb-0">
          <div className="relative w-full max-w-[300px] md:max-w-full aspect-square rounded-lg">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="rounded-lg object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
              loading="eager"
              sizes="(max-width: 639px) 90vw, (max-width: 767px) 80vw, 50vw"
              quality={85}
              priority={true}
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
            />
          </div>
        </div>
      </div>
    </div>
  );
});

SpecialProductCard.displayName = 'SpecialProductCard';

// ტიპების გაფართოება რადგან Product ტიპს არ აქვს ეს ველები სტანდარტულად
interface ExtendedProduct extends Product {
  isFeatured?: boolean;
  isNewCollection?: boolean;
  isSpecial?: boolean;
}

// დავამატოთ props ინტერფეისი
interface FeaturedProductsProps {
  fullWidth?: boolean;
}

// ერთიანი State ინტერფეისი - ვინახავთ მონაცემებს ერთ ობიექტში
interface ProductLoadingState {
  featured: ExtendedProduct[];
  special: ExtendedProduct[];
  newCollection: ExtendedProduct[];
  isLoading: boolean;
  error: Error | null;
}

// მთავარი კომპონენტის ლენიანი დატვირთვისთვის - გამოიყენეთ React.lazy შემდეგში
export default function FeaturedProducts({ fullWidth = false }: FeaturedProductsProps) {
  // საწყისი მდგომარეობა ერთიან ობიექტში
  const [productState, setProductState] = useState<ProductLoadingState>({
    featured: [],
    special: [],
    newCollection: [],
    isLoading: true,
    error: null,
  });

  const { addToCart } = useCart();

  // მემოიზებული კარტის დამატების ფუნქცია - ერთხელ იქმნება
  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
  }, [addToCart]);

  // Preload the LCP image
  useEffect(() => {
    // Preload LCP image
    if (productState.special.length > 0 && productState.special[0].images && productState.special[0].images.length > 0) {
      // Link preload-ის გამოყენება
      const linkEl = document.createElement('link');
      linkEl.rel = 'preload';
      linkEl.href = productState.special[0].images[0];
      linkEl.as = 'image';
      document.head.appendChild(linkEl);
    }
  }, [productState.special]);

  // პროდუქტების ჩატვირთვა - ოპტიმიზებული useEffect კუროუთინა
  useEffect(() => {
    // ავარიდოთ თავი მემორის გაჟონვას
    let isMounted = true;
    
    const fetchProducts = async () => {
      try {
        // გამოვიყენებთ fetch-ში ტაიმაუტს
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 5000);
        
        const productsData = await getProducts();
        
        clearTimeout(timeoutId);
        
        // თუ კომპონენტი აღარ არის ხელმისაწვდომი, არ განვაახლოთ state
        if (!isMounted) return;
        
        const extendedProducts = productsData as ExtendedProduct[];
        
        // ეფექტური ფილტრაცია - ერთი გავლით, შეზღუდული რაოდენობით
        const categorizedProducts = extendedProducts.reduce((acc, product, index) => {
          if (product.isSpecial && acc.special.length < 3) {
            acc.special.push(product);
          } else {
            if (product.isFeatured && acc.featured.length < 6) acc.featured.push(product);
            if (product.isNewCollection && acc.newCollection.length < 8) acc.newCollection.push(product);
          }
          return acc;
        }, { 
          special: [] as ExtendedProduct[], 
          featured: [] as ExtendedProduct[], 
          newCollection: [] as ExtendedProduct[] 
        });
        
        // ერთი state განახლება მრავალი ცვლილების ნაცვლად
        setProductState({
          featured: categorizedProducts.featured,
          special: categorizedProducts.special,
          newCollection: categorizedProducts.newCollection,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error("Error fetching products:", error);
        if (isMounted) {
          // ერთი state განახლება შეცდომის შემთხვევაშიც
          setProductState(prevState => ({
            ...prevState,
            isLoading: false,
            error: error as Error
          }));
        }
      } 
    };
    
    fetchProducts();
    
    // cleanup ფუნქცია მემორის გაჟონვის თავიდან ასაცილებლად
    return () => {
      isMounted = false;
    };
  }, []); // ცარიელი დამოკიდებულების მასივი

  // მემოიზებული Swiper კონფიგურაცია - გაუმჯობესებული პერფორმანსი
  const featuredSwiperSettings = useMemo(() => ({
    modules: [Navigation, Pagination, Autoplay], // შემცირებული მოდულების რაოდენობა
    spaceBetween: 16,
    slidesPerView: 1,
    speed: 800,
    centeredSlides: false,
    pagination: { 
      clickable: true,
      dynamicBullets: true,
      dynamicMainBullets: 3,
    },
    navigation: {
      nextEl: '.featured-button-next',
      prevEl: '.featured-button-prev'
    },
    autoplay: {
      delay: 4000,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    preventClicks: true,
    preventClicksPropagation: true,
    passiveListeners: true,
    noSwipingClass: 'no-swiping',
    loop: productState.featured.length >= 3,
    watchOverflow: true,
    loopAdditionalSlides: 1,
    breakpoints: {
      320: { slidesPerView: 1.2, spaceBetween: 12 },
      400: { slidesPerView: 1.5, spaceBetween: 16 },
      520: { slidesPerView: 2, spaceBetween: 16 },
      640: { slidesPerView: 2.5, spaceBetween: 20 },
      768: { slidesPerView: 2.5, spaceBetween: 20 },
      1024: { slidesPerView: 3, spaceBetween: 24 },
      1280: { slidesPerView: 3.5, spaceBetween: 24 },
      1536: { slidesPerView: 4, spaceBetween: 24 }
    }
  }), [productState.featured.length]);

  // მემოიზებული Swiper კონფიგურაცია ახალი კოლექციისთვის - ოპტიმიზებული ვერსია
  const newCollectionSwiperSettings = useMemo(() => ({
    modules: [Pagination, FreeMode, Autoplay], // Navigation-ის გარეშე, გამოვიყენებთ როცა საჭიროა
    spaceBetween: 16,
    slidesPerView: 2.2,
    speed: 600,
    pagination: { 
      clickable: true,
      dynamicBullets: true,
      dynamicMainBullets: 3,
    },
    navigation: {
      nextEl: '.new-collection-button-next',
      prevEl: '.new-collection-button-prev'
    },
    autoplay: {
      delay: 4500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    freeMode: {
      enabled: true,
      sticky: false,
      momentumBounce: true,
      momentumVelocityRatio: 0.4
    },
    preventClicks: true,
    preventClicksPropagation: true,
    passiveListeners: true,
    touchReleaseOnEdges: true,
    grabCursor: true,
    watchOverflow: true,
    noSwipingClass: 'no-swiping',
    breakpoints: {
      320: { slidesPerView: 2.2, spaceBetween: 12 },
      360: { slidesPerView: 2.5, spaceBetween: 12 },
      480: { slidesPerView: 3, spaceBetween: 16 },
      640: { slidesPerView: 3.5, spaceBetween: 16 },
      768: { slidesPerView: 4, spaceBetween: 20 },
      1024: { slidesPerView: 5, spaceBetween: 20 },
      1280: { slidesPerView: 6, spaceBetween: 20 },
      1536: { slidesPerView: 7, spaceBetween: 20 }
    }
  }), []);

  // მემოიზებული Swiper კონფიგურაცია სპეციალური პროდუქტებისთვის - გამარტივებული ვერსია
  const specialSwiperSettings = useMemo(() => ({
    modules: [Navigation, Pagination, Autoplay],
    spaceBetween: 10,
    slidesPerView: 1,
    speed: 700,
    pagination: { 
      clickable: true, 
      dynamicBullets: true,
      dynamicMainBullets: 3
    },
    navigation: {
      nextEl: '.special-swiper-button-next',
      prevEl: '.special-swiper-button-prev'
    },
    autoplay: {
      delay: 3500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true
    },
    preventClicks: true,
    preventClicksPropagation: true,
    passiveListeners: true,
    noSwipingClass: 'no-swiping'
  }), []);

  // მემოიზებული სლაიდები Featured Products-თვის - 6-ით შევზღუდავთ რომ შევამციროთ DOM ზომა 
  const featuredSlides = useMemo(() => 
    productState.featured.slice(0, 6).map((product) => (
      <SwiperSlide key={product.id} className="featured-slide h-full">
        <div className="h-full w-full px-1 py-1">
          <FeaturedProductCard 
            product={product} 
            onAddToCart={handleAddToCart}
          />
        </div>
      </SwiperSlide>
    ))
  , [productState.featured, handleAddToCart]);

  // მემოიზებული Featured Products Swiper
  const FeaturedProductsSwiper = useMemo(() => {
    if (productState.featured.length === 0) return null;
    
    return (
      <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Swiper {...featuredSwiperSettings}>
          {featuredSlides}
          <div className="swiper-button-prev featured-button-prev hidden md:flex"></div>
          <div className="swiper-button-next featured-button-next hidden md:flex"></div>
        </Swiper>
      </div>
    );
  }, [featuredSwiperSettings, featuredSlides, productState.isLoading]);

  // მემოიზებული სლაიდები New Collection-თვის - მაქსიმუმ 8 პროდუქტი DOM-ის შესამცირებლად
  const newCollectionSlides = useMemo(() => 
    productState.newCollection.slice(0, 8).map((product) => (
      <SwiperSlide key={product.id} className="new-collection-slide h-auto">
        <div className="w-full h-full px-1 py-1">
          <NewCollectionCard product={product} />
        </div>
      </SwiperSlide>
    ))
  , [productState.newCollection]);

  // მემოიზებული New Collection Swiper
  const NewCollectionSwiper = useMemo(() => {
    if (productState.newCollection.length === 0) {
      return null;
    }
    
    return (
      <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}>
        <Swiper {...newCollectionSwiperSettings}>
          {newCollectionSlides}
          <div className="swiper-button-prev new-collection-button-prev hidden md:flex"></div>
          <div className="swiper-button-next new-collection-button-next hidden md:flex"></div>
        </Swiper>
      </div>
    );
  }, [newCollectionSwiperSettings, newCollectionSlides, productState.isLoading]);
  
  // მემოიზებული სპეციალური პროდუქტის სექცია - გამარტივებული DOM სტრუქტურით
  const SpecialProductSection = useMemo(() => {
    if (productState.special.length === 0) return null;
    
    // თუ მხოლოდ ერთი სპეციალური პროდუქტია
    if (productState.special.length === 1) {
      return (
        <div className="mb-3 sm:mb-4">
          <SpecialProductCard 
            product={productState.special[0]} 
            onAddToCart={handleAddToCart} 
          />
        </div>
      );
    }

    // თუ ერთზე მეტია - მხოლოდ პირველ 3-ს ვაჩვენებთ DOM-ის შესამცირებლად
    const specialSlides = productState.special.slice(0, 3).map((product) => (
       <SwiperSlide key={product.id}>
         <SpecialProductCard 
           product={product} 
           onAddToCart={handleAddToCart} 
         />
       </SwiperSlide>
     ));
    
    return (
      <div className="mb-3 sm:mb-4 relative overflow-hidden w-full">
        <Swiper {...specialSwiperSettings}>
          {specialSlides}
          <div className="swiper-button-prev special-swiper-button-prev"></div>
          <div className="swiper-button-next special-swiper-button-next"></div>
        </Swiper>
      </div>
    );
  }, [productState.special, handleAddToCart, specialSwiperSettings]);

  // შეცდომის დამუშავება
  if (productState.error) {
     return <div className="py-3 text-center">შეცდომა პროდუქტების ჩატვირთვისას</div>; 
  }

  // მემოიზებული მთავარი JSX - გავამარტივოთ DOM სტრუქტურა და შევამციროთ CSS-ის დატვირთვა
  return (
    <section className={`py-3 sm:py-4 w-full overflow-x-hidden ${fullWidth ? 'full-width-section' : ''}`}>
      <div className={`${fullWidth ? 'container-full pl-0 pr-4 max-w-full' : 'container mx-auto max-w-6xl px-3 sm:px-4 md:px-6'}`}>
        {/* სპეციალური პროდუქტის სექცია */}
        <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}> 
          <div className="mb-3 sm:mb-4"> 
            {productState.isLoading ? (
              <div className="h-40 sm:h-48 w-full bg-muted animate-pulse rounded-lg"></div>
            ) : (
              SpecialProductSection
            )}
          </div>
        </div>

        {/* Featured Products */}
        <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}> 
          <div className="mb-3 sm:mb-4">
            {productState.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-64 sm:h-72 bg-muted animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : (
              FeaturedProductsSwiper
            )}
          </div>
        </div>

        {/* New Collection */}
        {(productState.newCollection.length > 0 || productState.isLoading) && (
          <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}> 
            <div className="w-full">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">ახალი კოლექცია</h3>
              {productState.isLoading ? (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 sm:h-36 bg-muted animate-pulse rounded-lg"></div>
                  ))}
                </div>
              ) : (
                NewCollectionSwiper
              )}
            </div>
          </div>
        )}
      </div>

      {/* ოპტიმიზებული CSS - მხოლოდ საჭირო სტილები */}
      <style jsx global>{`
        /* Swiper პადინგები */
        .featuredSwiper,
        .newCollectionSwiper {
          padding-bottom: 20px;
        }
        
        /* Pagination styles - გამარტივებული ვერსია */
        .swiper-pagination-bullet {
          width: 6px;
          height: 6px;
          background: #cbd5e1;
          opacity: 0.5;
          transition: all 0.3s;
          margin: 0 3px;
        }
        
        .swiper-pagination-bullet-active {
          background: #334155;
          opacity: 1;
          width: 8px;
          height: 8px;
        }
      `}</style>
    </section>
  )
}