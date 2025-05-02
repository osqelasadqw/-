'use client';

import React, { useEffect, useState, memo } from 'react';
import { getProductStock } from '@/lib/firebase-service';
import { Badge } from '@/components/ui/badge';

interface ProductStockBadgeProps {
  productId: string;
}

export const ProductStockBadge = memo(function ProductStockBadge({ productId }: ProductStockBadgeProps) {
  const [stock, setStock] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStock = async () => {
      try {
        const stockAmount = await getProductStock(productId);
        if (isMounted) {
          setStock(stockAmount);
        }
      } catch (error) {
        console.error('Error fetching product stock:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchStock();
    
    return () => {
      isMounted = false;
    };
  }, [productId]);

  if (loading) {
    return <Badge variant="outline" className="animate-pulse bg-slate-200 text-transparent">...</Badge>;
  }

  if (stock === 0) {
    return (
      <Badge variant="destructive">
        მარაგი ამოწურულია
      </Badge>
    );
  }

  if (stock <= 5) {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
        დარჩენილია {stock} ცალი
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="border-green-500 text-green-700 bg-green-50">
      მარაგშია
    </Badge>
  );
}); 