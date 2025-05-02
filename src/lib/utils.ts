import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * დებაუნსი ფუნქცია - შეზღუდავს ფუნქციის გამოძახების სიხშირეს.
 * სასარგებლოა ძვირადღირებული ოპერაციებისთვის, როგორიცაა API ძახილები, input ველები, და ა.შ.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T, 
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(context, args);
    }, wait);
  };
}

/**
 * თროთლინგ ფუნქცია - შეზღუდავს ფუნქციის გამოძახების სიხშირეს, მაგრამ მაშინვე შეასრულებს პირველ გამოძახებას.
 * სასარგებლოა ისეთი ოპერაციებისთვის, როგორიცაა scroll ან resize ივენთების დამუშავება.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * ფორმატირებული ფასის დაბრუნება
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('ka-GE', {
    style: 'currency',
    currency: 'GEL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * გამოთვალოს ფასდაკლებული ფასი
 */
export function calculateDiscountedPrice(
  price: number,
  discountPercentage: number,
  hasDiscount: boolean = true, 
  isPromoActive: boolean = true
): { 
  finalPrice: number; 
  isDiscounted: boolean;
  discountAmount: number;
} {
  if (!hasDiscount || !isPromoActive || discountPercentage <= 0) {
    return { finalPrice: price, isDiscounted: false, discountAmount: 0 };
  }
  
  const safeDiscount = Math.max(0, Math.min(100, discountPercentage));
  const discountAmount = price * (safeDiscount / 100);
  const finalPrice = price - discountAmount;
  
  return {
    finalPrice,
    isDiscounted: true,
    discountAmount,
  };
}
