'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ImagePreloadProps {
  // სურათების მასივი პრელოდისთვის
  images: string[];
  // ნაჩვენები იყოს თუ არა ჩატვირთვის პროგრესი
  showProgress?: boolean;
  // კოლბეკი, რომელიც გამოსხიდება ყველა სურათის ჩატვირთვისას
  onComplete?: () => void;
  className?: string;
}

/**
 * კომპონენტი, რომელიც წინასწარ ჩატვირთავს გამოსახულებებს და შეინახავს მათ ბრაუზერის ქეშში
 */
export function ImagePreloader({ 
  images = [], 
  showProgress = false, 
  onComplete,
  className = ''
}: ImagePreloadProps) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (!images.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }
    
    const imagePromises = images.map((src, index) => {
      return new Promise<void>((resolve) => {
        if (!src) {
          resolve();
          return;
        }
        
        const img = new Image();
        
        img.onload = () => {
          setLoadedCount(prevCount => {
            const newCount = prevCount + 1;
            if (newCount === images.length) {
              setIsComplete(true);
              onComplete?.();
            }
            return newCount;
          });
          resolve();
        };
        
        img.onerror = () => {
          console.error(`ვერ ჩაიტვირთა სურათი: ${src}`);
          setLoadedCount(prevCount => {
            const newCount = prevCount + 1;
            if (newCount === images.length) {
              setIsComplete(true);
              onComplete?.();
            }
            return newCount;
          });
          resolve();
        };
        
        // დავიწყოთ ჩატვირთვა
        img.src = src;
      });
    });
    
    // ველოდებით ყველა სურათის ჩატვირთვას
    Promise.all(imagePromises).then(() => {
      setIsComplete(true);
      onComplete?.();
    });
    
    return () => {
      // გაწმენდა აღარ გვჭირდება, რადგან Image API-ს გამოვიყენებთ
    };
  }, [images, onComplete]);
  
  if (!showProgress) return null;
  
  const progress = images.length ? Math.round((loadedCount / images.length) * 100) : 100;
  
  return showProgress ? (
    <div className={`fixed bottom-4 right-4 bg-white rounded-full shadow-lg p-2 z-50 ${className} ${isComplete ? 'opacity-0 transition-opacity duration-1000' : 'opacity-100'}`}>
      <div className="flex items-center justify-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-medium">{progress}%</span>
      </div>
    </div>
  ) : null;
}

/**
 * სურათების ქეშირება ბრაუზერის მეხსიერებაში
 */
const imageCache = new Map<string, string>();

export function preloadImage(src: string): Promise<string> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      imageCache.set(src, src);
      resolve(src);
    };
    
    img.onerror = () => {
      reject(new Error(`ვერ ჩაიტვირთა სურათი: ${src}`));
    };
    
    img.src = src;
  });
}

export function preloadImages(images: string[]): Promise<string[]> {
  return Promise.all(images.map(src => preloadImage(src)));
}

export default ImagePreloader; 