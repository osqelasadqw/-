'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Tag, Percent } from 'lucide-react';
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
  loading?: boolean;
  specialBadge?: boolean;
  isPriority?: boolean;
}

export function ProductCard({ product, loading = false, specialBadge = false, isPriority = false }: ProductCardProps) {
  const { addToCart } = useCart();
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  // Default image if no images are available
  const defaultImage = 'https://placehold.co/400x400/eee/999?text=No+Image';
  const productImage = product.images && product.images.length > 0 
    ? product.images[0] 
    : defaultImage;
    
  // Calculate discounted price if there is an active public discount
  const hasActiveDiscount = product.promoActive && 
    product.discountPercentage && 
    product.hasPublicDiscount;

  const discountedPrice = hasActiveDiscount
    ? product.price * (1 - (product.discountPercentage || 0) / 100)
    : null;

  return (
    <Link 
      href={`/shop/product/${product.id}`} 
      className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all bg-white relative h-full flex flex-col"
    >
      {/* სპეციალური შეთავაზების ბეჯი */}
      {specialBadge && (
        <Badge className="absolute top-0.5 left-0.5 z-10 bg-primary text-primary-foreground text-[0.55rem] xs:text-[0.6rem] sm:text-xs px-0.5 py-0 xs:px-1 xs:py-0 sm:px-2 sm:py-0.5">
          სპ
        </Badge>
      )}

      {/* ფასდაკლების Badge, მხოლოდ საჯარო ფასდაკლებისთვის */}
      {hasActiveDiscount && (
        <Badge variant="destructive" className="absolute top-0.5 right-0.5 z-10 text-[0.55rem] xs:text-[0.6rem] sm:text-xs px-0.5 py-0 xs:px-1 xs:py-0 sm:px-2 sm:py-0.5 text-white">
          {product.discountPercentage}%
        </Badge>
      )}
    
      {/* Image container with consistent aspect ratio */}
      <div className="relative w-full aspect-square overflow-hidden">
        {loading ? (
          <div className="h-full w-full bg-gray-100 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="relative w-full h-full">
            <Image
              src={productImage}
              alt={product.name}
              fill
              className="object-contain transition-transform duration-300 hover:scale-105"
              loading={isPriority ? "eager" : "lazy"}
              priority={isPriority}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = '/placeholder.png';
              }}
            />
          </div>
        )}
      </div>

      {/* Content container (name, price, button) */}
      <div className="p-0.5 xs:p-1 sm:p-2 md:p-3 flex flex-col flex-grow text-[0.6rem] xs:text-xs sm:text-sm md:text-base">
        {loading ? (
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-3/4"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            <div className="flex justify-between items-center mt-1">
              <div className="h-3 bg-gray-100 rounded w-12"></div>
              <div className="h-5 w-5 bg-gray-100 rounded-md"></div>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-medium text-[0.6rem] xs:text-xs sm:text-sm md:text-base mb-0 xs:mb-0.5 line-clamp-1 flex-grow truncate">{product.name}</h3>
            
            <div className="flex justify-between items-center mt-0.5 xs:mt-1 sm:mt-2">
              <div className="min-w-0 max-w-[60%]">
                {/* თუ არის საჯარო ფასდაკლება, ვაჩვენოთ ორივე ფასი */}
                {hasActiveDiscount ? (
                  <div className="flex flex-col">
                    <p className="text-[0.55rem] xs:text-[0.6rem] sm:text-xs line-through text-muted-foreground truncate">
                      {new Intl.NumberFormat('ka-GE', {
                        style: 'currency',
                        currency: 'GEL',
                        maximumFractionDigits: 0
                      }).format(product.price)}
                    </p>
                    {discountedPrice !== null && (
                      <p className="text-[0.55rem] xs:text-[0.6rem] sm:text-xs md:text-sm font-semibold text-destructive truncate">
                        {new Intl.NumberFormat('ka-GE', {
                          style: 'currency',
                          currency: 'GEL',
                          maximumFractionDigits: 0
                        }).format(discountedPrice)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[0.55rem] xs:text-[0.6rem] sm:text-xs md:text-sm font-semibold text-gray-900 truncate">
                    {new Intl.NumberFormat('ka-GE', {
                      style: 'currency',
                      currency: 'GEL',
                      maximumFractionDigits: 0
                    }).format(product.price)}
                  </p>
                )}
              </div>
              
              <Button 
                size="sm" 
                variant="default" 
                className="flex items-center gap-0.5 xs:gap-1 rounded-md whitespace-nowrap text-[0.55rem] xs:text-[0.6rem] sm:text-xs md:text-sm h-5 xs:h-6 sm:h-7 md:h-8 min-w-5 xs:min-w-6 sm:min-w-0 px-0.5 xs:px-1 sm:px-2"
                onClick={handleAddToCart}
                aria-label={`${product.name} - კალათში დამატება`}
              >
                <ShoppingCart className="h-2 w-2 xs:h-2.5 xs:w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                <span className="hidden xs:hidden sm:inline md:hidden lg:inline">კალათში</span>
              </Button>
            </div>
          </>
        )}
      </div>
    </Link>
  );
} 