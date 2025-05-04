'use client';

import React, { useEffect, useState, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { useRouter } from 'next/navigation';
import { getProducts } from '@/lib/firebase-service';
import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from '@/components/providers/cart-provider';

interface SearchResultsProps {
  searchTerm: string;
  onClose: () => void;
  isOpen: boolean;
}

const CompactListItem = memo(({ product, onProductClick, onAddToCartClick }: { product: Product, onProductClick: (id: string) => void, onAddToCartClick: (e: React.MouseEvent, product: Product) => void }) => (
  <div 
    className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer transition-colors rounded-md border-b last:border-b-0"
    onClick={() => onProductClick(product.id)}
  >
    <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
      <Image
        src={product.images?.[0] || '/placeholder.png'}
        alt={product.name}
        fill
        className="object-cover"
        sizes="48px"
      />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-sm truncate">{product.name}</h3>
      <span className="text-xs font-semibold text-gray-700">
        {new Intl.NumberFormat('ka-GE', {
          style: 'currency',
          currency: 'GEL',
          maximumFractionDigits: 0
        }).format(product.price)}
      </span>
    </div>
    <Button 
      size="sm" 
      variant="ghost"
      className="rounded-full w-8 h-8 p-0 ml-auto"
      onClick={(e) => onAddToCartClick(e, product)}
      aria-label="კალათში დამატება"
    >
      <ShoppingCart className="h-4 w-4" />
    </Button>
  </div>
));
CompactListItem.displayName = 'CompactListItem';

const ExpandedGridItem = memo(({ product, onProductClick, onAddToCartClick }: { product: Product, onProductClick: (id: string) => void, onAddToCartClick: (e: React.MouseEvent, product: Product) => void }) => (
  <div 
    key={product.id}
    className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer bg-white flex flex-col"
    onClick={() => onProductClick(product.id)}
  >
    <div className="relative w-full pt-[80%] overflow-hidden bg-gray-100">
      <Image
        src={product.images?.[0] || '/placeholder.png'}
        alt={product.name}
        fill
        className="object-cover transition-transform duration-300 hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
      />
      {product.promoActive && product.discountPercentage && product.hasPublicDiscount && (
        <Badge variant="destructive" className="absolute top-2 right-2 z-10 font-medium px-2 py-0.5">
          {product.discountPercentage}% ფასდაკლება
        </Badge>
      )}
    </div>
    <div className="p-3 flex-1 flex flex-col">
      <h3 className="font-medium text-base truncate">{product.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mt-1 mb-2">{product.description}</p>
      <div className="flex items-center justify-between mt-auto">
        {product.promoActive && product.discountPercentage && product.hasPublicDiscount ? (
          <div className="flex flex-col">
            <span className="text-xs line-through text-gray-400">
              {new Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL', maximumFractionDigits: 0 }).format(product.price)}
            </span>
            <span className="text-base font-bold text-destructive">
              {new Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL', maximumFractionDigits: 0 }).format(product.price * (1 - (product.discountPercentage || 0) / 100))}
            </span>
          </div>
        ) : (
          <span className="text-base font-bold">
            {new Intl.NumberFormat('ka-GE', { style: 'currency', currency: 'GEL', maximumFractionDigits: 0 }).format(product.price)}
          </span>
        )}
        <Button 
          size="sm" 
          className="rounded-full w-9 h-9 p-0"
          onClick={(e) => onAddToCartClick(e, product)}
        >
          <ShoppingCart className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
));
ExpandedGridItem.displayName = 'ExpandedGridItem';

const SearchResultsComponent = ({ searchTerm, onClose, isOpen }: SearchResultsProps) => {
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const compactViewRef = useRef<HTMLDivElement>(null);
  const expandedViewRef = useRef<HTMLDivElement>(null);
  const { addToCart } = useCart();
  
  const handleClose = useCallback(() => {
    setIsExpanded(false);
    onClose();
  }, [onClose]);
  
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setResults([]);
        setIsExpanded(false);
        return;
      }
      
      setLoading(true);
      try {
        const allProducts = await getProducts();
        const filtered = allProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setResults(filtered);
      } catch (error) {
        console.error("Error searching products:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    
    searchProducts();
  }, [searchTerm]);
  
  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (isOpen && isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isExpanded]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetElement = event.target as Element;
      const headerElement = document.querySelector('header');
      const currentRef = isExpanded ? expandedViewRef.current : compactViewRef.current;

      if (headerElement && headerElement.contains(targetElement)) {
        return;
      }

      if (targetElement.closest('[data-radix-popper-content-wrapper]')) {
          return;
      }

      if (currentRef && !currentRef.contains(targetElement)) { 
        handleClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isExpanded, handleClose]);
  
  const handleProductClick = (productId: string) => {
    router.push(`/shop/product/${productId}`);
    handleClose();
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    addToCart(product);
  };
  
  if (!isOpen) return null;
  
  if (isExpanded) {
    return (
      <div 
        className="fixed inset-x-0 bottom-0 z-60 flex flex-col"
        style={{ 
          top: 'var(--header-height, 80px)',
        }}
      >
        <div className="fixed inset-0 bg-black/40 z-50"
          style={{ top: 'var(--header-height, 80px)' }}></div>
        
        <div 
          ref={expandedViewRef} 
          className="bg-white w-full flex-1 flex flex-col z-60"
          style={{
            height: '100%',
            borderRadius: 0,
            position: 'relative'
          }}
        >
          <div className="sticky top-0 flex items-center justify-between p-3 bg-white z-10">
            <h2 className="font-medium text-lg">
              {searchTerm ? `ძიების შედეგები: "${searchTerm}"` : 'ძიება'}
            </h2>
            <button 
              onClick={handleClose}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="დახურვა"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm && searchTerm.length >= 2 
                  ? 'პროდუქტები ვერ მოიძებნა' 
                  : 'ჩაწერეთ მინიმუმ 2 სიმბოლო ძიებისთვის'}
              </div>
            ) : (
              <div className="container mx-auto">
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {results.map(product => (
                    <ExpandedGridItem 
                      key={product.id} 
                      product={product} 
                      onProductClick={handleProductClick} 
                      onAddToCartClick={handleAddToCart} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={compactViewRef}
      className="absolute top-[calc(100%+8px)] left-0 right-0 w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
      style={{ 
        transformOrigin: 'top center',
        animation: 'fadeInDown 0.2s ease-out'
      }}
    >
      <div className="p-3 border-b">
        <h2 className="font-medium">ძიების სწრაფი შედეგები</h2>
      </div>
      
      <div className="max-h-[300px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center p-4 text-sm text-gray-500">
             {searchTerm && searchTerm.length >= 2 
               ? 'პროდუქტები ვერ მოიძებნა' 
               : 'ჩაწერეთ მინიმუმ 2 სიმბოლო ძიებისთვის'}
          </div>
        ) : (
          results.slice(0, 5).map(product => (
            <CompactListItem 
              key={product.id} 
              product={product} 
              onProductClick={handleProductClick} 
              onAddToCartClick={handleAddToCart} 
            />
          ))
        )}
      </div>
      
      {results.length > 0 && (
        <div className="p-2 border-t text-center">
          <Button variant="link" size="sm" onClick={() => setIsExpanded(true)} className="text-primary font-medium">
            ყველა შედეგის ნახვა ({results.length})
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default memo(SearchResultsComponent);
SearchResultsComponent.displayName = 'SearchResults'; 