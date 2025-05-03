import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * დებაუნსი ფუნქცია - შეზღუდავს ფუნქციის გამოძახების სიხშირეს.
 * სასარგებლოა ძვირადღირებული ოპერაციებისთვის, როგორიცაა API ძახილები, input ველები, და ა.შ.
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function(...args: Parameters<F>): void {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

/**
 * თროთლინგ ფუნქცია - შეზღუდავს ფუნქციის გამოძახების სიხშირეს, მაგრამ მაშინვე შეასრულებს პირველ გამოძახებას.
 * სასარგებლოა ისეთი ოპერაციებისთვის, როგორიცაა scroll ან resize ივენთების დამუშავება.
 */
export function throttle<F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): (...args: Parameters<F>) => void {
  let waiting = false;
  
  return function(...args: Parameters<F>): void {
    if (!waiting) {
      func(...args);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, waitFor);
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
