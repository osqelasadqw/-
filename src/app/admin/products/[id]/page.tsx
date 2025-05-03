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
        toast.error('პროდუქტის ჩატვირთვა ვერ მოხერხდა');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

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
      
      toast.success('პროდუქტი წარმატებით განახლდა');
      router.push('/admin/products');
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('პროდუქტის განახლება ვერ მოხერხდა');
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
          <h2 className="text-xl font-medium mb-2">პროდუქტი ვერ მოიძებნა</h2>
          <p className="text-muted-foreground mb-4">
            მოთხოვნილი პროდუქტი არ არსებობს ან წაშლილია.
          </p>
          <Button onClick={() => router.push('/admin/products')}>
            პროდუქტების სიაში დაბრუნება
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">პროდუქტის რედაქტირება</h1>
        
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>პროდუქტის დეტალები</CardTitle>
            <CardDescription>განაახლეთ პროდუქტის ინფორმაცია</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleUpdateProduct}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">სახელი</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">აღწერა</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">ფასი (₾)</Label>
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
                  გამოაჩინე სპეციალურ ადგილას
                </Label>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                <p className="font-medium text-amber-800">
                  გაითვალისწინეთ: სპეციალური პროდუქტები გამოჩნდება შოპის გვერდზე გამორჩეულ პოზიციებზე. 
                  რეკომენდებულია მაქსიმუმ 4 პროდუქტის მონიშვნა.
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
                გაუქმება
              </Button>
              
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                შენახვა
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
} 