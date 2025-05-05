'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProductById, updateProduct, markProductAsSpecial } from '@/lib/firebase-service';
import { Product } from '@/types';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/language-provider';

// შევცვალეთ ტიპი იმპორტით და გავხადეთ უფრო ზოგადი
type Props = {
  params: {
    id: string;
  };
};

export default function ProductEditPage({ params }: Props) {
  const router = useRouter();
  const { id } = params;
  const [product, setProduct] = useState<Partial<Product> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isSpecial, setIsSpecial] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(id);
        setProduct(data);
        if (data) {
          setName(data.name);
          setDescription(data.description);
          setPrice(data.price.toString());
          setIsSpecial(data.isSpecial || false);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error(t('admin.categoryNotFound'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, t]);

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) return;
    
    setIsSaving(true);
    
    try {
      await updateProduct(id, {
        name,
        description,
        price: parseFloat(price)
      });
      
      // ცალკე ფუნქციის გამოძახება სპეციალურ პროდუქტად მოსანიშნად
      await markProductAsSpecial(id, isSpecial);
      
      toast.success(t('admin.productUpdated'));
      router.push('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(t('admin.productUpdateError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-medium mb-2">{t('admin.noProductsFound')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('admin.categoryNotFound')}
          </p>
          <Button onClick={() => router.push('/admin/products')}>
            {t('admin.productsList')}
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">{t('admin.edit')}</h1>
        
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>{t('admin.addNewProductForm.title')}</CardTitle>
            <CardDescription>{t('admin.addEditDeleteProducts')}</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleUpdateProduct}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('admin.productName')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('product.description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">{t('admin.price')} ({t('product.currency')})</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isSpecial"
                  checked={isSpecial}
                  onChange={(e) => setIsSpecial(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label 
                  htmlFor="isSpecial" 
                  className="font-medium text-base cursor-pointer"
                >
                  {t('admin.specialStatus')}
                </Label>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <p className="font-medium text-amber-800">
                  {t('admin.specialLimit')}
                </p>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/products')}
                disabled={isSaving}
              >
                {t('admin.cancel')}
              </Button>
              
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('admin.save')}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
} 