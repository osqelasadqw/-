import React from 'react';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useCart } from '@/components/providers/cart-provider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useLanguage } from '@/components/providers/language-provider';

export function ShoppingCart() {
  const { items, removeFromCart, updateQuantity, totalItems, totalPrice } = useCart();
  const { t } = useLanguage();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('cart.title')}</SheetTitle>
        </SheetHeader>
        
        {items.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-10 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('cart.empty')}</h3>
            <p className="text-muted-foreground mb-6">{t('cart.emptyDescription')}</p>
          </div>
        ) : (
          <>
            <div className="flex-grow overflow-auto py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.product.id}>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="relative h-20 w-20 rounded-md overflow-hidden flex-shrink-0">
                            {item.product.images && item.product.images.length > 0 ? (
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.name}
                                fill
                                className="object-contain"
                              />
                            ) : (
                              <div className="bg-muted h-full w-full flex items-center justify-center">
                                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-grow">
                            <div className="flex justify-between">
                              <h4 className="font-medium line-clamp-1">{item.product.name}</h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeFromCart(item.product.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center border rounded-md">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <div className="font-medium">
                                ₾{(item.product.price * item.quantity).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>{t('cart.subtotal')}</span>
                <span className="font-medium">₾{totalPrice.toFixed(2)}</span>
              </div>
              <Button className="w-full">
                {t('cart.checkout')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
} 