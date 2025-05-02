'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, Product } from '@/types';
import { decrementStock, getProductStock } from '@/lib/firebase-service';
import { toast } from '@/components/ui/use-toast';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// გამოითვალოს პროდუქტის ფასი ფასდაკლების გათვალისწინებით
const calculateProductPrice = (product: Product): number => {
  const hasActiveDiscount = product.promoActive && product.discountPercentage;
  
  // მხოლოდ საჯარო ფასდაკლება გამოჩნდეს პროდუქტის გვერდზე და კალათაში
  if (hasActiveDiscount && product.hasPublicDiscount) {
    return product.price * (1 - (product.discountPercentage || 0) / 100);
  }
  
  // პრომოკოდი არ გამოიყენება კალათაში ავტომატურად, მხოლოდ კალათის გვერდზე შეყვანისას
  return product.price;
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // მემოიზებული addToCart ფუნქცია
  const addToCart = useCallback(async (product: Product) => {
    try {
      // ვამოწმებთ მარაგს პროდუქტისთვის
      const currentStock = await getProductStock(product.id);
      const existingItem = items.find(item => item.product.id === product.id);
      
      // თუ პროდუქტი უკვე კალათაშია, ვამოწმებთ საკმარისია თუ არა მარაგი რაოდენობის გასაზრდელად
      if (existingItem) {
        if (currentStock <= existingItem.quantity) {
          toast({
            title: "მარაგი ამოწურულია",
            description: "სამწუხაროდ, მოთხოვნილი რაოდენობა მარაგში არ არის",
            variant: "destructive",
          });
          return;
        }
      } else if (currentStock <= 0) {
        // თუ პროდუქტი კალათაში არ არის და მარაგი 0-ია
        toast({
          title: "მარაგი ამოწურულია",
          description: "სამწუხაროდ, პროდუქტი მარაგში აღარ არის",
          variant: "destructive",
        });
        return;
      }
      
      // შევამციროთ მარაგი transaction-ის გამოყენებით
      const success = await decrementStock(product.id);
      
      if (!success) {
        toast({
          title: "მარაგი ამოწურულია",
          description: "სამწუხაროდ, პროდუქტი მარაგში აღარ არის",
          variant: "destructive",
        });
        return;
      }
      
      // მარაგის წარმატებით შემცირების შემდეგ დავამატოთ კალათაში
      setItems(prevItems => {
        if (existingItem) {
          return prevItems.map(item => 
            item.product.id === product.id 
              ? { ...item, quantity: item.quantity + 1 } 
              : item
          );
        } else {
          return [...prevItems, { product, quantity: 1 }];
        }
      });
      
      toast({
        title: "პროდუქტი დაემატა",
        description: "პროდუქტი წარმატებით დაემატა კალათაში",
      });
    } catch (error) {
      console.error("Error adding product to cart:", error);
      toast({
        title: "შეცდომა",
        description: "პროდუქტის დამატებისას დაფიქსირდა შეცდომა",
        variant: "destructive",
      });
    }
  }, [items]);

  // მემოიზებული removeFromCart ფუნქცია
  const removeFromCart = useCallback((productId: string) => {
    setItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  }, []);

  // მემოიზებული updateQuantity ფუნქცია
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setItems(prevItems => 
      prevItems.map(item => 
        item.product.id === productId 
          ? { ...item, quantity } 
          : item
      )
    );
  }, [removeFromCart]);

  // მემოიზებული clearCart ფუნქცია
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // მემოიზებული totalItems გამოთვლა
  const totalItems = useMemo(() => 
    items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );
  
  // მემოიზებული totalPrice გამოთვლა საჯარო ფასდაკლების გათვალისწინებით
  const totalPrice = useMemo(() => 
    items.reduce((total, item) => {
      const itemPrice = calculateProductPrice(item.product);
      return total + (itemPrice * item.quantity);
    }, 0),
    [items]
  );

  // მემოიზებული კონტექსტის მნიშვნელობა, რომ არ მოხდეს ხელახალი შექმნა ყოველ რენდერზე
  const value = useMemo<CartContextType>(() => ({
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
  }), [items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}; 