'use client';

import { useEffect, useState, useCallback, useMemo, memo } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Star, ShoppingCart } from "lucide-react"
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, FreeMode, Scrollbar } from 'swiper/modules'

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

// მემოიზებული ვარსკვლავების კომპონენტი
const RatingStars = memo(({ count = 5, filled = 4, size = "small" }: { count?: number; filled?: number; size?: "small" | "medium" | "large" }) => {
  // ვარსკვლავების ზომების კალკულაცია
  const starSize = useMemo(() => {
    return size === "small" ? "h-3 w-3" : size === "medium" ? "h-3.5 w-3.5" : "h-4 w-4";
  }, [size]);
  
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <Star 
          key={i} 
          className={`${starSize} ${i < filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} 
        />
      ))}
    </>
  );
});

RatingStars.displayName = 'RatingStars';

// მემოიზებული ფასის კომპონენტი
const PriceDisplay = memo(({ originalPrice, discountedPrice, hasDiscount, size = "small" }: 
  { originalPrice: number; discountedPrice: number; hasDiscount: boolean; size?: "small" | "medium" | "large" }) => {
  
  // ფონტის ზომების კალკულაცია
  const fontSize = useMemo(() => {
    return size === "small" ? "text-xs sm:text-sm" : 
           size === "medium" ? "text-sm sm:text-base" : 
           "text-lg sm:text-xl md:text-2xl";
  }, [size]);
  
  if (hasDiscount) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        <span className={`${fontSize} font-bold`}>₾{discountedPrice.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground line-through">
          ₾{originalPrice.toFixed(2)}
        </span>
      </div>
    );
  }
  
  return (
    <div>
      <span className={`${fontSize} font-bold`}>₾{originalPrice.toFixed(2)}</span>
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
  // მემოიზებული ფასდაკლების გამოთვლა
  const discount = useMemo(() => {
    if (product.hasPublicDiscount && product.discountPercentage && product.promoActive) {
      return {
        hasDiscount: true,
        originalPrice: product.price,
        discountedPrice: product.price * (1 - product.discountPercentage / 100),
        percentage: product.discountPercentage
      };
    }
    return { hasDiscount: false, originalPrice: product.price, discountedPrice: product.price, percentage: 0 };
  }, [product.hasPublicDiscount, product.discountPercentage, product.promoActive, product.price]);

  // მემოიზებული ფუნქციები
  const handleAddToCart = useCallback(() => {
    onAddToCart(product);
  }, [onAddToCart, product]);

  // მემოიზებული სურათის URL
  const imageUrl = useMemo(() => 
    product.images[0] || "/placeholder.svg?height=400&width=400", 
    [product.images]
  );

  // მემოიზებული პროდუქტის URL
  const productUrl = useMemo(() => 
    `/shop/product/${product.id}`, 
    [product.id]
  );

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background hover:shadow-md transition-all h-full">
      <div className="absolute top-2 left-2 z-20">
        <Badge className="bg-amber-500 hover:bg-amber-600 px-1.5 py-0.5 text-xs text-white">გამორჩეული</Badge>
      </div>
      <div className="w-full relative overflow-hidden">
        <Link href={productUrl} className="block w-full aspect-square bg-white">
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </Link>
      </div>
      <div className="p-2 sm:p-3">
        <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1 overflow-hidden text-ellipsis">{product.name}</h3>
        <div className="flex items-center mb-1.5">
          <RatingStars count={5} filled={4} size="small" />
          <span className="ml-1 text-xs text-muted-foreground">(42)</span>
        </div>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 overflow-hidden">
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

// მემოიზებული ახალი კოლექციის ბარათის კომპონენტი
const NewCollectionCard = memo(({ product }: { product: Product }) => {
  // მემოიზებული ფასდაკლების გამოთვლა
  const discount = useMemo(() => {
    if (product.hasPublicDiscount && product.discountPercentage && product.promoActive) {
      return {
        hasDiscount: true,
        originalPrice: product.price,
        discountedPrice: product.price * (1 - product.discountPercentage / 100),
        percentage: product.discountPercentage
      };
    }
    return { hasDiscount: false, originalPrice: product.price, discountedPrice: product.price, percentage: 0 };
  }, [product.hasPublicDiscount, product.discountPercentage, product.promoActive, product.price]);

  // მემოიზებული სურათის URL
  const imageUrl = useMemo(() => 
    product.images[0] || "/placeholder.svg?height=200&width=160", 
    [product.images]
  );

  // მემოიზებული პროდუქტის URL
  const productUrl = useMemo(() => 
    `/shop/product/${product.id}`, 
    [product.id]
  );

  // მემოიზებული პროდუქტის ფასი
  const displayPrice = useMemo(() => 
    discount.hasDiscount ? discount.discountedPrice.toFixed(2) : product.price.toFixed(2),
    [discount.hasDiscount, discount.discountedPrice, product.price]
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-lg mb-1.5 bg-white">
        <Link href={productUrl} className="block w-full h-full">
          <div className="relative w-full h-full">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-contain transition-transform duration-300"
              sizes="(max-width: 639px) 45vw, (max-width: 767px) 33vw, (max-width: 1023px) 25vw, 20vw"
              style={{ objectFit: 'contain' }}
            />
          </div>
        </Link>
        {discount.hasDiscount && (
          <div className="absolute top-1 right-1">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 px-1 py-0.5 text-white text-[10px]">
              -{discount.percentage}%
            </Badge>
          </div>
        )}
      </div>
      <h4 className="font-medium text-xs line-clamp-1 overflow-hidden text-ellipsis whitespace-nowrap">{product.name}</h4>
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

// მემოიზებული სპეციალური პროდუქტის კომპონენტი
const SpecialProductCard = memo(({ 
  product, 
  onAddToCart 
}: { 
  product: Product; 
  onAddToCart: (product: Product) => void 
}) => {
  // მემოიზებული ფასდაკლების გამოთვლა
  const discount = useMemo(() => {
    if (product.hasPublicDiscount && product.discountPercentage && product.promoActive) {
      return {
        hasDiscount: true,
        originalPrice: product.price,
        discountedPrice: product.price * (1 - product.discountPercentage / 100),
        percentage: product.discountPercentage
      };
    }
    return { hasDiscount: false, originalPrice: product.price, discountedPrice: product.price, percentage: 0 };
  }, [product.hasPublicDiscount, product.discountPercentage, product.promoActive, product.price]);

  // მემოიზებული ფუნქციები
  const handleAddToCart = useCallback(() => {
    onAddToCart(product);
  }, [onAddToCart, product]);

  // მემოიზებული სურათის URL
  const imageUrl = useMemo(() => 
    product.images[0] || "/placeholder.svg?height=600&width=600", 
    [product.images]
  );

  return (
    <div className="relative overflow-hidden rounded-lg sm:rounded-xl group">
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-20">
        <Badge className="bg-rose-500 hover:bg-rose-600 px-2 py-1 text-xs text-white">განსაკუთრებული შეთავაზება</Badge>
      </div>
      <div className="grid md:grid-cols-2 gap-4 bg-gradient-to-r from-rose-50 to-rose-100 dark:from-rose-950/20 dark:to-rose-900/20 p-3 sm:p-5 rounded-lg">
        <div className="flex flex-col justify-center">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 line-clamp-2 overflow-hidden text-ellipsis">{product.name}</h3>
          <div className="flex items-center mb-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3 sm:h-4 w-3 sm:w-4 fill-yellow-400 text-yellow-400" />
            ))}
            <span className="ml-1 sm:ml-2 text-xs text-muted-foreground">(128 შეფასება)</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-3 sm:line-clamp-4 overflow-hidden">
            {product.description}
          </p>
          {discount.hasDiscount ? (
            <div className="flex items-center flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl md:text-2xl font-bold">
                ₾{discount.discountedPrice.toFixed(2)}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground line-through">
                ₾{discount.originalPrice.toFixed(2)}
              </span>
              <Badge variant="outline" className="ml-1 text-xs text-emerald-600 border-emerald-600">
                {discount.percentage}% ფასდაკლება
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <span className="text-lg sm:text-xl md:text-2xl font-bold">₾{product.price.toFixed(2)}</span>
            </div>
          )}
          <Button 
            size="sm" 
            className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-xs sm:text-sm"
            onClick={handleAddToCart}
          >
            კალათაში დამატება
          </Button>
        </div>
        <div className="flex items-center justify-center md:order-last order-first mb-3 md:mb-0">
          <div className="relative w-full max-w-[300px] md:max-w-full aspect-square rounded-lg">
            <div className="relative w-full h-full">
              <Image
                src={imageUrl}
                alt={product.name}
                fill
                className="rounded-lg object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                priority
                sizes="(max-width: 639px) 90vw, (max-width: 767px) 80vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
            </div>
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

// ერთიანი State ინტერფეისი
interface ProductLoadingState {
  featured: ExtendedProduct[];
  special: ExtendedProduct[];
  newCollection: ExtendedProduct[];
  isLoading: boolean;
  error: Error | null;
}

export default function FeaturedProducts({ fullWidth = false }: FeaturedProductsProps) {
  // ერთიანი State
  const [productState, setProductState] = useState<ProductLoadingState>({
    featured: [],
    special: [],
    newCollection: [],
    isLoading: true,
    error: null,
  });

  const { addToCart } = useCart();

  // მემოიზებული ფუნქცია addToCart-ის გამოსაძახებლად
  const handleAddToCart = useCallback((product: Product) => {
    addToCart(product);
  }, [addToCart]);

  // მემოიზებული Swiper კონფიგურაცია - გადმოვიტანეთ isLoading-ის შემოწმებამდე
  const featuredSwiperSettings = useMemo(() => ({
    modules: [Navigation, Pagination],
    spaceBetween: 16,
    slidesPerView: 1,
    speed: 600, // ანიმაციის სიჩქარე (ms)
    centeredSlides: false,
    pagination: { clickable: true },
    navigation: {
      enabled: true,
      nextEl: '.featured-button-next',
      prevEl: '.featured-button-prev'
    },
    passiveListeners: true,
    preventClicks: false,
    loop: productState.featured.length >= 3, // განახლებული დამოკიდებულება
    watchOverflow: true, // დავრწმუნდეთ, რომ აჩვენებს ნავიგაციას როცა საჭიროა
    loopAdditionalSlides: 1,
    breakpoints: {
      320: {
        slidesPerView: 1.2,
        spaceBetween: 12,
      },
      400: {
        slidesPerView: 1.5,
        spaceBetween: 16,
      },
      520: {
        slidesPerView: 2,
        spaceBetween: 16,
      },
      640: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 2.5,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 24,
      },
      1280: {
        slidesPerView: 3.5,
        spaceBetween: 24,
      },
      1536: {
        slidesPerView: 4,
        spaceBetween: 24,
      }
    },
    className: "featuredSwiper"
  }), [productState.featured.length]); // განახლებული დამოკიდებულება

  // მემოიზებული Swiper კონფიგურაცია ახალი კოლექციისთვის - გადმოვიტანეთ isLoading-ის შემოწმებამდე
  const newCollectionSwiperSettings = useMemo(() => ({
    modules: [Pagination, FreeMode, Navigation],
    spaceBetween: 16,
    slidesPerView: 2.2,
    speed: 600, // ანიმაციის სიჩქარე (ms)
    pagination: { clickable: true },
    navigation: {
      enabled: true,
      nextEl: '.new-collection-button-next',
      prevEl: '.new-collection-button-prev'
    },
    freeMode: {
      enabled: true,
      sticky: false,
      momentumBounce: true,
      momentumVelocityRatio: 0.4
    },
    passiveListeners: true,
    preventClicks: false,
    grabCursor: true,
    watchOverflow: true,
    breakpoints: {
      320: {
        slidesPerView: 2.2,
        spaceBetween: 12,
      },
      360: {
        slidesPerView: 2.5,
        spaceBetween: 12,
      },
      480: {
        slidesPerView: 3,
        spaceBetween: 16,
      },
      640: {
        slidesPerView: 3.5,
        spaceBetween: 16,
      },
      768: {
        slidesPerView: 4,
        spaceBetween: 20,
      },
      1024: {
        slidesPerView: 5,
        spaceBetween: 20,
      },
      1280: {
        slidesPerView: 6,
        spaceBetween: 20,
      },
      1536: {
        slidesPerView: 7,
        spaceBetween: 20,
      }
    },
    className: "newCollectionSwiper"
  }), []);

  // პროდუქტების ჩატვირთვა
  useEffect(() => {
    const fetchProducts = async () => {
      // არ ვცვლით isLoading-ს აქ
      try {
        const productsData = await getProducts();
        const extendedProducts = productsData as ExtendedProduct[];
        
        const special = extendedProducts.filter(p => p.isSpecial);
        const nonSpecialProducts = extendedProducts.filter(p => !p.isSpecial);
        const featuredProds = nonSpecialProducts.filter(p => p.isFeatured);
        const newCollectionProducts = nonSpecialProducts.filter(p => p.isNewCollection);

        // ვაყენებთ ერთიან state-ს მხოლოდ ერთხელ!
        setProductState({
          featured: featuredProds,
          special: special,
          newCollection: newCollectionProducts,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error("Error fetching products:", error);
        // ვაყენებთ ერთიან state-ს შეცდომის შემთხვევაშიც ერთხელ!
        setProductState(prevState => ({
          ...prevState,
          isLoading: false,
          error: error as Error
        }));
      } 
    };
    
    fetchProducts();
    // საწყისი isLoading: true დაყენებულია useState-ში, ამიტომ აქ აღარ ვცვლით.
    // დამოკიდებულების მასივი ცარიელი რჩება, რომ ერთხელ შესრულდეს.
  }, []);

  // მემოიზებული სლაიდები Featured Products-თვის
  const featuredSlides = useMemo(() => 
    productState.featured.map((product) => (
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
  const FeaturedProductsSwiper = useMemo(() => (
    <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}>
      <Swiper {...featuredSwiperSettings}>
        {featuredSlides} {/* ვიყენებთ მემოიზებულ სლაიდებს */}
        <div className="swiper-button-prev featured-button-prev hidden md:flex"></div>
        <div className="swiper-button-next featured-button-next hidden md:flex"></div>
      </Swiper>
    </div>
  ), [featuredSwiperSettings, featuredSlides, productState.isLoading]); // დამოკიდებულება განახლებულია

  // მემოიზებული სლაიდები New Collection-თვის
  const newCollectionSlides = useMemo(() => 
    productState.newCollection.map((product) => (
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
      <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'} delay-150`}>
        <Swiper {...newCollectionSwiperSettings}>
          {newCollectionSlides} {/* ვიყენებთ მემოიზებულ სლაიდებს */}
          <div className="swiper-button-prev new-collection-button-prev hidden md:flex"></div>
          <div className="swiper-button-next new-collection-button-next hidden md:flex"></div>
        </Swiper>
      </div>
    );
  }, [newCollectionSwiperSettings, newCollectionSlides, productState.isLoading]); // დამოკიდებულება განახლებულია
  
  // მემოიზებული Swiper კონფიგურაცია სპეციალური პროდუქტებისთვის
  const specialSwiperSettings = useMemo(() => ({
    modules: [Navigation],
    spaceBetween: 10,
    slidesPerView: 1,
    centeredSlides: true,
    navigation: {
      enabled: true,
      nextEl: '.special-swiper-button-next',
      prevEl: '.special-swiper-button-prev'
    },
    passiveListeners: true,
    preventClicks: false,
    // loop: productState.special.length >= 3, // დავაკომენტაროთ loop ტესტირებისთვის
    className: "specialProductSwiper"
  }), [productState.special.length]); // დამოკიდებულება specialProducts-ის სიგრძეზე

  // მემოიზებული სპეციალური პროდუქტის სექცია
  const SpecialProductSection = useMemo(() => {
    if (productState.special.length === 0) return null;
    
    // თუ მხოლოდ ერთი სპეციალური პროდუქტია, ვაჩვენებთ მას პირდაპირ
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

    // თუ ერთზე მეტია, ვქმნით მემოიზებულ სლაიდებს
    const specialSlides = productState.special.map((product) => (
       <SwiperSlide key={product.id}>
         <SpecialProductCard 
           product={product} 
           onAddToCart={handleAddToCart} 
         />
       </SwiperSlide>
     ));
    
    // ვაჩვენებთ სლაიდერს მემოიზებული სლაიდებით
    return (
      <div className="mb-3 sm:mb-4 relative specialProductSwiperContainer overflow-hidden w-full">
        <Swiper {...specialSwiperSettings}>
          {specialSlides} {/* ვიყენებთ მემოიზებულ სლაიდებს */}
          <div className="swiper-button-prev special-swiper-button-prev"></div>
          <div className="swiper-button-next special-swiper-button-next"></div>
        </Swiper>
        <div className="mt-2 text-xs text-center text-gray-500">
          {/* მოვაშოროთ ტექსტი "განსაკუთრებული შეთავაზებები" */}
        </div>
      </div>
    );
  }, [productState.special, handleAddToCart, specialSwiperSettings]);

  // კომპონენტის დაბრუნება - isLoading-ის დროს ვაჩვენებთ ჩონჩხს
  // if (productState.isLoading) {
  //   return null; // ან ჩატვირთვის ინდიკატორი
  // }

  // აქ შეგვიძლია შეცდომის დამუშავებაც, თუ საჭიროა
  if (productState.error) {
     return <div>შეცდომა პროდუქტების ჩატვირთვისას...</div>; 
  }

  return (
    <section className={`py-3 sm:py-4 w-full overflow-x-hidden ${fullWidth ? 'full-width-section' : ''}`}>
      <div className={`${fullWidth ? 'container-full pl-0 pr-4 max-w-full' : 'container mx-auto max-w-6xl px-3 sm:px-4 md:px-6'}`}>
        <div className={`flex items-center justify-between ${productState.special.length === 0 && productState.featured.length === 0 ? "mb-2" : "mb-3"}`}>
          <div>
          </div>
          
        </div>

        {/* Wrapper for SpecialProductSection container with fade-in (no delay) */}
        <div className={`transition-opacity duration-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}> 
          {/* კონტეინერი SpecialProductSection-ისთვის მინიმალური სიმაღლით */}
          <div className="min-h-[400px] mb-3 sm:mb-4"> 
            {productState.isLoading ? (
               <div className="h-full w-full bg-muted animate-pulse rounded-lg sm:rounded-xl"></div> // Skeleton Placeholder
             ) : (
               SpecialProductSection
             )}
          </div>
        </div>

        {/* Wrapper for FeaturedProductsSwiper with fade-in (delay-150) */}
        <div className={`transition-opacity duration-300 delay-150 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}> 
          {/* Featured Products Swiper container */}
          <div className={productState.special.length > 0 ? "" : ""}> 
            {FeaturedProductsSwiper}
          </div>
        </div>

        {/* Wrapper for New Collection section with fade-in (delay-300) */}
        <div className={`transition-opacity duration-300 delay-300 ${productState.isLoading ? 'opacity-0' : 'opacity-100'}`}> 
          {/* New Collection */}
          {productState.newCollection.length > 0 && !productState.isLoading && (
            <div className={`w-full ${productState.featured.length > 0 ? "mt-3 sm:mt-4" : ""}`}>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">ახალი კოლექცია</h3>
              {NewCollectionSwiper}
            </div>
          )}
        </div>
        
      </div>

      <style jsx global>{`
        /* THESE pagination rules below should ONLY apply to featuredSwiper and newCollectionSwiper */
        /* We explicitly remove them from applying to specialProductSwiper */
        .featuredSwiper,
        .newCollectionSwiper {
          /* Ensure specialProductSwiper does NOT get this padding if it was implicitly added before */
          padding-bottom: 20px; 
        }
        .specialProductSwiper { /* Explicitly remove padding for special swiper */
          padding-bottom: 0 !important; 
        }
        /* Pagination styles ONLY for featured and new collection */
        .featuredSwiper .swiper-pagination,
        .newCollectionSwiper .swiper-pagination {
          bottom: 0; /* Position pagination at the bottom */
        }
        .featuredSwiper .swiper-pagination-bullet,
        .newCollectionSwiper .swiper-pagination-bullet {
          width: 5px;
          height: 5px;
          background: #cbd5e1;
          opacity: 0.5;
          transition: opacity 0.2s, background-color 0.2s;
        }
        .featuredSwiper .swiper-pagination-bullet-active,
        .newCollectionSwiper .swiper-pagination-bullet-active {
          background: #334155;
          opacity: 1;
        }
        .specialProductSwiper .swiper-pagination { /* Hide pagination for special swiper - Try 1*/
           display: none !important;
        }
        /* Just in case the above doesn't work, try hiding the bullets directly - Try 2 */
        .specialProductSwiper .swiper-pagination-bullet {
          display: none !important;
        }
        /* And hide the container within the specific parent - Try 3 */
        .specialProductSwiperContainer .swiper-pagination {
           display: none !important;
        }

        /* Keep other styles as they are */

        .newCollectionSwiper .swiper-slide {
          height: auto !important;
          display: flex;
          transition: transform 0.3s ease;
        }
        .newCollectionSwiper .swiper-slide:hover {
          cursor: grab;
        }
        .newCollectionSwiper .swiper-slide:active {
          cursor: grabbing;
        }
        .newCollectionSwiper .swiper-wrapper {
          align-items: stretch;
          transition-timing-function: ease-out;
          transition-duration: 400ms;
        }
        
        /* გამორჩეული პროდუქტების სლაიდერის სტილები */
        .featuredSwiper .swiper-slide {
          transition: transform 0.3s ease;
          height: auto !important;
        }
        .featuredSwiper .swiper-wrapper {
          align-items: stretch;
        }
        .featuredSwiper:hover .swiper-button-prev,
        .featuredSwiper:hover .swiper-button-next {
          opacity: 1;
        }
        
        /* Full width სტილები სლაიდერებისთვის */
        .full-width-section .featuredSwiper .swiper-slide,
        .full-width-section .newCollectionSwiper .swiper-slide,
        .full-width-section .specialProductSwiper .swiper-slide {
          max-width: none;
        }
        
        /* სპეციალური პროდუქტების სლაიდერის ნავიგაცია */
        .specialProductSwiperContainer .swiper-button-prev,
        .specialProductSwiperContainer .swiper-button-next {
          opacity: 0;
          transition: opacity 0.3s ease;
          color: #4b5563; /* მუქი ნაცრისფერი */
          width: 40px;
          height: 40px;
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .specialProductSwiperContainer:hover .swiper-button-prev,
        .specialProductSwiperContainer:hover .swiper-button-next {
          opacity: 1;
        }
        .specialProductSwiperContainer .swiper-button-prev:after,
        .specialProductSwiperContainer .swiper-button-next:after {
          font-size: 16px;
          font-weight: bold;
        }
        .specialProductSwiperContainer .swiper-button-prev {
          left: 10px;
        }
        .specialProductSwiperContainer .swiper-button-next {
          right: 10px;
        }
        @media (max-width: 640px) { /* პატარა ეკრანებზე ოდნავ პატარა ღილაკები */
          .specialProductSwiperContainer .swiper-button-prev,
          .specialProductSwiperContainer .swiper-button-next {
            width: 35px;
            height: 35px;
          }
          .specialProductSwiperContainer .swiper-button-prev:after,
          .specialProductSwiperContainer .swiper-button-next:after {
            font-size: 14px;
          }
        }

        /* ახალი კოლექციის სლაიდერის ნავიგაციის ღილაკები */
        .new-collection-button-prev,
        .new-collection-button-next {
          opacity: 0;
          transition: opacity 0.3s ease;
          color: #4b5563; /* მუქი ნაცრისფერი */
          width: 36px;
          height: 36px;
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .newCollectionSwiper:hover .new-collection-button-prev,
        .newCollectionSwiper:hover .new-collection-button-next {
          opacity: 1;
        }
        .new-collection-button-prev:after,
        .new-collection-button-next:after {
          font-size: 14px;
          font-weight: bold;
        }
        .new-collection-button-prev {
          left: 5px;
        }
        .new-collection-button-next {
          right: 5px;
        }
        
        /* გამორჩეული პროდუქტების სლაიდერის ნავიგაციის ღილაკები */
        .featured-button-prev,
        .featured-button-next {
          opacity: 0;
          transition: opacity 0.3s ease;
          color: #4b5563; /* მუქი ნაცრისფერი */
          width: 36px;
          height: 36px;
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .featuredSwiper:hover .featured-button-prev,
        .featuredSwiper:hover .featured-button-next {
          opacity: 1;
        }
        .featured-button-prev:after,
        .featured-button-next:after {
          font-size: 14px;
          font-weight: bold;
        }
        .featured-button-prev {
          left: 5px;
        }
        .featured-button-next {
          right: 5px;
        }
        
        /* დამატებითი breakpoint-ები სრული სიგანისთვის */
        @media (min-width: 1280px) {
          .full-width-section .featuredSwiper .swiper-wrapper,
          .full-width-section .newCollectionSwiper .swiper-wrapper {
            justify-content: space-between;
          }
          .full-width-section .container {
            padding-left: 0 !important;
            padding-right: 2rem;
          }
          .container-full {
            padding-left: 0 !important;
            margin-left: 0 !important;
            width: 100vw !important;
          }
          .full-width-section .featuredSwiper .swiper-slide {
            width: auto !important;
          }
          .full-width-section .newCollectionSwiper .swiper-slide {
            width: auto !important;
          }
        }
        
        @media (min-width: 1400px) {
          .full-width-section .featuredSwiper .swiper-wrapper {
            padding-left: 0;
            padding-right: 0.5rem;
          }
        }

        /* ახალი სტილები ელემენტების ზომების გასაზრდელად */
        .featuredSwiper .swiper-slide {
          height: 100%;
          width: 100%;
          max-width: 100%;
          padding: 5px;
        }
        
        .newCollectionSwiper .swiper-slide {
          height: 100%;
          width: 100%;
          max-width: 100%;
          padding: 5px;
        }
        
        /* დამატებითი სტილები მობილურზე */
        @media (max-width: 640px) {
          .featuredSwiper .swiper-slide {
            width: calc(100% - 10px) !important;
            height: auto !important;
            min-height: unset !important;
          }
          .newCollectionSwiper .swiper-slide {
            width: calc(50% - 10px) !important;
            height: auto !important;
            min-height: unset !important;
          }
        }
        
        /* ფულსკრინ რეჟიმის დამატებითი სტილები */
        .full-width-section {
          padding-left: 0 !important;
          padding-right: 1rem;
          margin-left: 0 !important;
          width: 100% !important;
          overflow: visible !important;
        }
        
        .container-full {
          padding-left: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
          overflow: visible !important;
        }
        
        .full-width-section .featuredSwiper .swiper-slide,
        .full-width-section .newCollectionSwiper .swiper-slide {
          width: auto !important;
          min-width: 250px;
          overflow: hidden !important;
        }
        
        .full-width-section .featured-slide,
        .full-width-section .new-collection-slide {
          height: auto !important;
          overflow: hidden !important;
        }
        
        /* მნიშვნელოვანი ზომის ცვლილება ფულსკრინ რეჟიმში */
        @media (min-width: 1024px) {
          .full-width-section .featuredSwiper {
            padding: 10px;
            padding-left: 0 !important;
          }
          
          .full-width-section .newCollectionSwiper {
            padding: 10px;
            padding-left: 0 !important;
          }
          
          .full-width-section .featuredSwiper .swiper-slide {
            min-width: 320px !important;
          }
          
          .full-width-section .newCollectionSwiper .swiper-slide {
            min-width: 250px !important;
          }
        }
        
        @media (min-width: 1280px) {
          .full-width-section .featuredSwiper .swiper-slide {
            min-width: 350px !important;
          }
          
          .full-width-section .newCollectionSwiper .swiper-slide {
            min-width: 270px !important;
          }
          
          .full-width-section .container {
            padding-left: 0 !important;
            padding-right: 2rem;
          }
        }
        
        @media (min-width: 1536px) {
          .full-width-section .featuredSwiper .swiper-slide {
            min-width: 380px !important;
          }
          
          .full-width-section .newCollectionSwiper .swiper-slide {
            min-width: 290px !important;
          }
        }
        
        /* სპეციალური პროდუქტების სლაიდერის ნავიგაცია */
        .specialProductSwiperContainer .swiper-button-prev,
        .specialProductSwiperContainer .swiper-button-next {
          opacity: 0;
          transition: opacity 0.3s ease;
          color: #4b5563; /* მუქი ნაცრისფერი */
          width: 40px;
          height: 40px;
          background-color: rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .specialProductSwiperContainer:hover .swiper-button-prev,
        .specialProductSwiperContainer:hover .swiper-button-next {
          opacity: 1;
        }
        .specialProductSwiperContainer .swiper-button-prev:after,
        .specialProductSwiperContainer .swiper-button-next:after {
          font-size: 16px;
          font-weight: bold;
        }
        .specialProductSwiperContainer .swiper-button-prev {
          left: 10px;
        }
        .specialProductSwiperContainer .swiper-button-next {
          right: 10px;
        }
        @media (max-width: 640px) { /* პატარა ეკრანებზე ოდნავ პატარა ღილაკები */
          .specialProductSwiperContainer .swiper-button-prev,
          .specialProductSwiperContainer .swiper-button-next {
            width: 35px;
            height: 35px;
          }
          .specialProductSwiperContainer .swiper-button-prev:after,
          .specialProductSwiperContainer .swiper-button-next:after {
            font-size: 14px;
          }
        }

        /* ახლებურად გადავაწყოთ სლაიდერების ჩვენება */
        .swiper-wrapper {
          display: flex !important;
          align-items: stretch !important;
        }

        .swiper-slide {
          height: auto !important;
          display: flex !important;
          flex-direction: column;
        }

        .new-collection-slide > div,
        .featured-slide > div {
          height: 100% !important;
          display: flex !important;
          flex-direction: column;
        }

        /* სპეციალური სწრაფი ფიქსი სლაიდერის კონტეინერებისთვის */
        .newCollectionSwiper, 
        .featuredSwiper,
        .specialProductSwiperContainer {
          overflow: visible !important; /* ეს უზრუნველყოფს, რომ კონტენტი არ ჩამოიჭრას */
          margin: 0 -5px !important; /* კომპენსაცია padding-ისთვის */
          padding: 0 5px !important; /* პადინგი გვერდებზე */
          width: calc(100% + 10px) !important; /* გავზარდოთ სიგანე პადინგით */
        }

        /* გამორჩეული ელემენტები დავრწმუნდეთ რომ ყველა ზომაზე ჩანს */
        .featuredSwiper .swiper-slide, 
        .newCollectionSwiper .swiper-slide {
          padding: 5px !important;
          box-sizing: border-box !important;
        }

        /* გავზარდოთ ღილაკების მხედველობის არე */
        .featured-button-prev, 
        .featured-button-next,
        .new-collection-button-prev,
        .new-collection-button-next {
          z-index: 10 !important;
        }
      `}</style>
    </section>
  )
}