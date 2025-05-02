'use client';

import React, { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Category, Product } from '@/types';
import { getCategories, getProductsByCategory } from '@/lib/firebase-service';
import { ChevronDown, Pin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// მემოიზებული ჩევრონის აიკონი
const MemoizedChevronDown = memo(function MemoizedChevronDown({ 
  className 
}: { 
  className: string 
}) {
  return <ChevronDown className={className} aria-hidden="true" />;
});
MemoizedChevronDown.displayName = 'MemoizedChevronDown';

// გარედან გავხადოთ მემოიზებული, რათა შევამციროთ რერენდერების რაოდენობა
export const CategoryDropdown = memo(function CategoryDropdownComponent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const router = useRouter();
  const [closeTimerId, setCloseTimerId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    // Cleanup timer on component unmount
    return () => {
      if (closeTimerId) {
        clearTimeout(closeTimerId);
      }
    };
  }, [closeTimerId]);

  const handleCategoryHover = async (categoryId: string) => {
    setHoveredCategory(categoryId);
    
    // If we already have products for this category, no need to fetch again
    if (categoryProducts[categoryId]) return;
    
    try {
      const products = await getProductsByCategory(categoryId);
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: products
      }));
    } catch (error) {
      console.error('Error fetching products for category:', error);
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerId) {
      clearTimeout(closeTimerId);
      setCloseTimerId(null);
    }
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
  };
  
  const handleMouseEnterContent = () => {
    clearCloseTimer();
  };
  
  const handleMouseLeaveContent = () => {
    // დატოვე ცარიელი - ახლა კლიკზე ვმართავთ
  };

  const handleClickCategory = (categoryId: string) => {
    // ჩავტვირთოთ პროდუქტები კატეგორიისთვის თუ ჯერ არ არის ჩატვირთული
    handleCategoryHover(categoryId);
    router.push(`/shop?category=${categoryId}`);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      {/* დროფდაუნის ტრიგერი */}
      <div className="flex items-center">
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={handleToggleDropdown}
          suppressHydrationWarning
        >
          კატეგორიები
          <MemoizedChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* დროფდაუნის კონტენტი */}
      {isOpen && (
        <div 
          className="fixed z-[100] top-[70px] left-1/2 -translate-x-1/2 rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none transition-all animate-in fade-in-20 zoom-in-95 slide-in-from-top-1 duration-150 max-w-[95vw] w-full max-h-[80vh]"
          style={{ maxWidth: '1000px', height: '500px' }}
          onMouseEnter={handleMouseEnterContent}
          onMouseLeave={handleMouseLeaveContent}
        >
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x h-full">
            {/* კატეგორიების სია */}
            <div className="w-full md:w-72 py-2 h-full max-h-[80vh] md:max-h-[80vh] overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    იტვირთება...
                  </div>
                </div>
              ) : (
                <>
                  {/* მობაილზე - ვერტიკალური სია, სრული სიმაღლით */}
                  <div className="block md:hidden">
                    <div className="space-y-1 min-h-[300px]">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          className={cn(
                            "w-full text-left px-4 py-3 text-sm font-medium flex items-center",
                            hoveredCategory === category.id
                              ? "bg-gray-100 text-primary"
                              : "text-gray-700 hover:bg-gray-50"
                          )}
                          onClick={() => handleClickCategory(category.id)}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* დესკტოპზე - სტანდარტული ჩვენება */}
                  <div className="hidden md:block">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        className={cn(
                          "w-full text-left px-4 py-2 text-sm",
                          hoveredCategory === category.id
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50"
                        )}
                        onMouseEnter={() => handleCategoryHover(category.id)}
                        onClick={() => handleClickCategory(category.id)}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* პროდუქტების ფოტოები - მხოლოდ დესკტოპზე */}
            <div className="flex-1 p-4 h-full min-h-[300px] max-h-[50vh] md:max-h-[80vh] overflow-y-auto hidden md:block">
              {hoveredCategory ? (
                <div className="h-full">
                  <h2 className="text-sm font-medium mb-3 border-b pb-2">
                    {categories.find(c => c.id === hoveredCategory)?.name}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 min-h-[300px]">
                    {categoryProducts[hoveredCategory]?.length > 0 ? (
                      categoryProducts[hoveredCategory].map(product => (
                        <Link 
                          href={`/shop/product/${product.id}`} 
                          key={product.id}
                          className="group"
                        >
                          <div className="aspect-square rounded-md overflow-hidden bg-gray-100 group-hover:shadow-md transition-all">
                            {product.images && product.images[0] ? (
                              <div className="relative w-full h-full">
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  loading="eager"
                                  placeholder="blur"
                                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.onerror = null;
                                    target.src = '/placeholder.png';
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-400">
                                <span className="text-sm font-medium">სურათი არ არის</span>
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-700 truncate group-hover:text-primary transition-colors">{product.name}</p>
                          <p className="text-sm font-medium text-gray-900">₾{product.price?.toFixed(2)}</p>
                        </Link>
                      ))
                    ) : categoryProducts[hoveredCategory] ? (
                      <div className="col-span-3 text-center py-8 text-sm text-gray-500 min-h-[300px] flex items-center justify-center">
                        პროდუქტები არ მოიძებნა
                      </div>
                    ) : (
                      <div className="col-span-3 text-center py-8 min-h-[300px] flex items-center justify-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse"></div>
                          <span className="text-sm text-gray-500">იტვირთება...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-500 min-h-[300px] flex items-center justify-center">
                  აირჩიეთ კატეგორია მარცხნივ
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}); 