'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { createProduct, getCategories } from '@/lib/firebase-service';
import { Category } from '@/types';
import { ArrowLeft } from 'lucide-react';

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    stock: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setFormData(prev => ({ ...prev, categoryId: categoriesData[0].id }));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'პროდუქტის სახელი აუცილებელია';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'პროდუქტის აღწერა აუცილებელია';
    }
    
    if (!formData.price) {
      newErrors.price = 'ფასი აუცილებელია';
    } else if (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'ფასი უნდა იყოს დადებითი რიცხვი';
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = 'კატეგორია აუცილებელია';
    }
    
    if (formData.stock && (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0)) {
      newErrors.stock = 'მარაგი უნდა იყოს არაუარყოფითი რიცხვი';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (value: string) => {
    setFormData({
      ...formData,
      categoryId: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        images: [],
        stock: parseInt(formData.stock),
      };
      
      await createProduct(productData);
      
      router.push('/admin/products');
    } catch (error) {
      console.error('Error creating product:', error);
      setErrors({ submit: 'პროდუქტის შექმნა ვერ მოხერხდა. გთხოვთ, სცადოთ ხელახლა.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="უკან დაბრუნება"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">პროდუქტის დამატება</h1>
          <p className="text-muted-foreground">
            შექმენით ახალი პროდუქტი თქვენს მაღაზიაში
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>პროდუქტის ინფორმაცია</CardTitle>
              <CardDescription>
                ძირითადი ინფორმაცია თქვენი პროდუქტის შესახებ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  პროდუქტის სახელი <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="შეიყვანეთ პროდუქტის სახელი"
                  value={formData.name}
                  onChange={handleInputChange}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">
                  აღწერა <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="შეიყვანეთ პროდუქტის აღწერა"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    ფასი (₾) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock">
                    მარაგი
                  </Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="0"
                    value={formData.stock}
                    onChange={handleInputChange}
                  />
                  {errors.stock && (
                    <p className="text-sm text-red-500">{errors.stock}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">
                    კატეგორია <span className="text-red-500">*</span>
                  </Label>
                  {isLoading ? (
                    <div className="animate-pulse h-10 w-full bg-muted rounded-md"></div>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-amber-500">
                      კატეგორიები არ არის ხელმისაწვდომი. გთხოვთ, ჯერ შექმნათ კატეგორია.
                    </p>
                  ) : (
                    <Select 
                      value={formData.categoryId} 
                      onValueChange={handleSelectChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="აირჩიეთ კატეგორია" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.categoryId && (
                    <p className="text-sm text-red-500">{errors.categoryId}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {errors.submit && (
            <div className="text-sm text-red-500 mt-2">{errors.submit}</div>
          )}
          
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              უკან დაბრუნება
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'დამატება...' : 'პროდუქტის დამატება'}
            </Button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
} 