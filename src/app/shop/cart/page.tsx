'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShopLayout } from '@/components/layouts/shop-layout';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, X, ShoppingBag, ArrowLeft, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { getPromoCodes } from '@/lib/firebase-service';
// import { PromoCode } from '@/types'; // Commented out problematic import
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface PromoCode { id: string; code: string; discountPercentage: number; productId: string; }

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalItems, totalPrice } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [isPromoLoading, setIsPromoLoading] = useState(false);
  const [activePromo, setActivePromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  
  // პრომოკოდის გარეშე ჯამური ფასი
  const rawTotalPrice = useMemo(() => totalPrice, [totalPrice]);
  
  // პრომოკოდის გათვალისწინებით საბოლოო ფასი, დაცული გამოთვლა
  const finalTotal = useMemo(() => {
    // არ გამოვიყენოთ პრომოკოდი თუ არ არის აქტიური
    if (!activePromo) return rawTotalPrice;
    
    // მოვძებნოთ პროდუქტი, რომელზეც მოქმედებს პრომოკოდი
    const targetProduct = items.find(item => item.product.id === activePromo.productId);
    
    // თუ პროდუქტი არ არის კალათაში, არ გამოვიყენოთ ფასდაკლება
    if (!targetProduct) return rawTotalPrice;
    
    // ფასდაკლების პროცენტის ვალიდაცია
    const discountPercentage = Math.min(Math.max(activePromo.discountPercentage, 0), 100);
    
    // გამოვთვალოთ ფასდაკლების ღირებულება კონკრეტულ პროდუქტზე
    const productTotal = targetProduct.product.price * targetProduct.quantity;
    const discountAmount = productTotal * (discountPercentage / 100);
    
    // სრული ჯამური ფასიდან გამოვაკლოთ ფასდაკლება
    return parseFloat(Math.max(rawTotalPrice - discountAmount, 0).toFixed(2));
  }, [rawTotalPrice, activePromo, items]);

  // მემოიზებული ფასის ფორმატირების ფუნქცია
  const formatCurrency = useCallback((amount: number) => {
    return formatPrice(amount);
  }, []);

  const handlePromoCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!promoCode.trim()) {
      toast.error('გთხოვთ შეიყვანოთ პრომოკოდი');
      return;
    }
    
    setIsPromoLoading(true);
    setPromoError(null);
    
    try {
      // მივიღებთ ყველა აქტიურ პრომოკოდს
      const promoCodes = await getPromoCodes();
      
      // ვეძებთ, არის თუ არა შეყვანილი პრომოკოდი აქტიურების სიაში
      const foundPromo = promoCodes.find(
        (p) => p.promoCode && p.promoCode.toLowerCase() === promoCode.toLowerCase()
      );
      
      if (foundPromo) {
        // ვამოწმებთ, არის თუ არა პროდუქტი კალათაში, რომელზეც მოქმედებს პრომოკოდი
        const matchingProduct = items.find(item => item.product.id === foundPromo.productId);
        
        if (matchingProduct) {
          setActivePromo(foundPromo);
          toast.success('პრომოკოდი წარმატებით გააქტიურდა');
        } else {
          setPromoError('პრომოკოდი ვერ გააქტიურდა: შესაბამისი პროდუქტი არ არის კალათაში');
          toast.error('პრომოკოდი ვერ გააქტიურდა: შესაბამისი პროდუქტი არ არის კალათაში');
        }
      } else {
        setPromoError('არასწორი პრომოკოდი');
        toast.error('არასწორი პრომოკოდი');
      }
    } catch (error) {
      console.error('შეცდომა პრომოკოდის შემოწმებისას:', error);
      setPromoError('შეცდომა პრომოკოდის შემოწმებისას');
      toast.error('შეცდომა პრომოკოდის შემოწმებისას');
    } finally {
      setIsPromoLoading(false);
    }
  };
  
  const clearPromoCode = () => {
    setActivePromo(null);
    setPromoCode('');
    setPromoError(null);
    toast.info('პრომოკოდი გაუქმებულია');
  };

  // შეკვეთის განთავსების ფუნქცია დამატებითი უსაფრთხოების შემოწმებით
  const placeOrder = async () => {
    try {
      // მომხმარებლის დამოწმება აუთენტიფიკაციის გარეშე არ გამოვიდეს
      // TODO: შეკვეთის დასრულებისთვის საჭიროა ავტორიზაცია
      
      // თუ გამოიყენება პრომოკოდი, სერვერზე ვადასტურებთ მის ვალიდურობას
      if (activePromo) {
        // სერვერიდან ვამოწმებთ პრომოკოდის ნამდვილობას
        const serverPromoCodes = await getPromoCodes();
        const validPromo = serverPromoCodes.find(
          p => p.promoCode === activePromo.code && 
              p.productId === activePromo.productId && 
              p.active === true
        );
        
        if (!validPromo) {
          toast.error('პრომოკოდი აღარ არის აქტიური, გთხოვთ სცადოთ თავიდან');
          setActivePromo(null);
          return;
        }
        
        // შევამოწმოთ თანხვედრა ფასდაკლების პროცენტებს შორის
        if (validPromo.discountPercentage !== activePromo.discountPercentage) {
          toast.error('პრომოკოდის მონაცემები შეიცვალა, ვაახლებთ...');
          setActivePromo({
            ...activePromo,
            discountPercentage: validPromo.discountPercentage
          });
          return;
        }
      }
      
      // TODO: აქ გააგრძელეთ შეკვეთის განთავსების პროცესი
      toast.success('შეკვეთა წარმატებით განთავსდა');
    } catch (error) {
      console.error('შეცდომა შეკვეთის განთავსებისას:', error);
      toast.error('შეცდომა შეკვეთის განთავსებისას');
    }
  };

  // თუ კალათა ცარიელია
  const isCartEmpty = useMemo(() => items.length === 0, [items]);

  // მემოიზებული თითოეული პროდუქტის ღირებულების გამოთვლა
  const calculateItemTotal = useCallback((price: number, quantity: number) => {
    return price * quantity;
  }, []);

  // მემოიზებული რაოდენობის ცვლილების ფუნქცია
  const handleQuantityChange = useCallback((productId: string, delta: number, currentQty: number) => {
    const newQty = Math.max(1, currentQty + delta);
    updateQuantity(productId, newQty);
  }, [updateQuantity]);

  // მემოიზებული კალათის სია
  const cartItemsList = useMemo(() => (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.product.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 border-b">
          <div className="flex items-center gap-4 mb-3 sm:mb-0">
            <div className="relative w-16 h-16 rounded-md overflow-hidden">
              <Image 
                src={item.product.images[0] || "/placeholder.svg"} 
                alt={item.product.name}
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium text-sm">{item.product.name}</h3>
              <p className="text-sm text-muted-foreground">{formatCurrency(item.product.price)}</p>
              {item.product.hasPublicDiscount && item.product.discountPercentage && (
                <Badge variant="outline" className="mt-1 text-xs text-emerald-600 border-emerald-600">
                  {item.product.discountPercentage}% ფასდაკლება
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center border rounded-md">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleQuantityChange(item.product.id, -1, item.quantity)}
              >
                <Minus className="h-3 w-3" />
                <span className="sr-only">შემცირება</span>
              </Button>
              <span className="w-8 text-center text-sm">{item.quantity}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleQuantityChange(item.product.id, 1, item.quantity)}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">გაზრდა</span>
              </Button>
            </div>
            
            <div className="w-24 text-right">
              <p className="font-medium">{formatCurrency(calculateItemTotal(item.product.price, item.quantity))}</p>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => removeFromCart(item.product.id)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">წაშლა</span>
            </Button>
          </div>
        </div>
      ))}
    </div>
  ), [items, formatCurrency, handleQuantityChange, removeFromCart, calculateItemTotal]);

  if (isCartEmpty) {
    return (
      <ShopLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">თქვენი კალათა ცარიელია</h1>
          <p className="text-muted-foreground mb-6">
            კალათაში არაფერი გაქვთ დამატებული
          </p>
          <Link href="/shop">
            <Button className="flex items-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              მაღაზიაში დაბრუნება
            </Button>
          </Link>
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">კალათა</h1>
          <p className="text-muted-foreground">
            {totalItems} ნივთი კალათაში
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cartItemsList}
          </div>

          <div className="lg:col-span-1">
            <div className="rounded-md border p-6 space-y-6">
              <h2 className="text-lg font-medium">შეკვეთის შეჯამება</h2>
              
              {/* პრომოკოდის შეყვანის ფორმა */}
              <div className="space-y-3">
                <form onSubmit={handlePromoCodeSubmit} className="flex space-x-2">
                  <div className="flex-grow relative">
                    <Input
                      placeholder="პრომოკოდი"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={!!activePromo || isPromoLoading}
                    />
                    {activePromo && (
                      <CheckCircle className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  {activePromo ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={clearPromoCode}
                    >
                      გაუქმება
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={!promoCode.trim() || isPromoLoading}
                    >
                      {isPromoLoading ? '...' : 'გააქტიურება'}
                    </Button>
                  )}
                </form>
                
                {/* პრომოკოდის შეცდომის ან წარმატების შეტყობინებები */}
                {promoError && (
                  <div className="flex items-center text-destructive text-sm">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>{promoError}</span>
                  </div>
                )}
                
                {activePromo && (
                  <div className="text-sm text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span>პრომოკოდი გააქტიურებულია -{activePromo.discountPercentage}%</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ჯამური თანხა</span>
                  <span>{formatCurrency(rawTotalPrice)}</span>
                </div>
                
                {activePromo && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>ფასდაკლება</span>
                    <span>-{formatCurrency(rawTotalPrice - finalTotal)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">მიტანის საფასური</span>
                  <span>უფასო</span>
                </div>
                
                <div className="border-t pt-4 flex justify-between font-medium">
                  <span>გადასახდელი თანხა</span>
                  <span>{formatCurrency(finalTotal)}</span>
                </div>
              </div>
              
              <Button className="w-full" onClick={placeOrder}>შეკვეთის განთავსება</Button>
              
              <div className="text-center">
                <Link
                  href="/shop"
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  მაღაზიაში დაბრუნება
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ShopLayout>
  );
} 