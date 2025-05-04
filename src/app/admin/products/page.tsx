'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getProducts, getCategories, deleteProduct, markProductAsSpecial, markProductAsFeatured, markProductAsNewCollection } from '@/lib/firebase-service';
import { Category, Product } from '@/types';
import { Plus, Edit, Trash2, Search, Star, Loader2, CheckCheck, ImageDown, Pencil, StarOff, Tag, Tags, Sparkles, Crown, PackageOpen, PackageX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';

// ტიპების გაფართოება
interface ExtendedProduct extends Product {
  isFeatured?: boolean;
  isNewCollection?: boolean;
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [currentProduct, /* setCurrentProduct */] = useState<ExtendedProduct | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<ExtendedProduct[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<{ productId: string | null, type: string | null }>({ productId: null, type: null });

  const router = useRouter();

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      
      setProducts(productsData as ExtendedProduct[]);
      
      // Create a map for faster category lookups
      const categoriesMap = new Map<string, Category>();
      categoriesData.forEach(category => {
        categoriesMap.set(category.id, category);
      });
      setCategories(categoriesMap);

      setFilteredProducts(productsData as ExtendedProduct[]);
    } catch (error) {
      console.error('Error fetching products data:', error);
      toast({
        variant: "destructive",
        title: "შეცდომა",
        description: "პროდუქტების ჩატვირთვა ვერ მოხერხდა"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = products.filter(product => 
        product.name.toLowerCase().includes(lowercasedTerm) || 
        product.description.toLowerCase().includes(lowercasedTerm)
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete);
      setProducts(products.filter(p => p.id !== productToDelete));
      toast({
        title: "წარმატება",
        description: "პროდუქტი წაიშალა"
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        variant: "destructive", 
        title: "შეცდომა", 
        description: "პროდუქტის წაშლა ვერ მოხერხდა"
      });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const specialProductsCount = useMemo(() => products.filter(p => p.isSpecial).length, [products]);
  const featuredProductsCount = useMemo(() => products.filter(p => p.isFeatured).length, [products]);
  const newCollectionProductsCount = useMemo(() => products.filter(p => p.isNewCollection).length, [products]);

  const handleToggleSpecial = async (productId: string, currentValue: boolean) => {
    if (specialProductsCount >= 10 && !currentValue) {
      toast({
        title: "ლიმიტი მიღწეულია",
        description: "შესაძლებელია მაქსიმუმ 10 სპეციალური პროდუქტის მონიშვნა.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingState({ productId, type: 'special' });
    try {
      const updatedProduct = await markProductAsSpecial(productId, !currentValue);
      setProducts(prev => 
        prev.map(p => p.id === productId ? updatedProduct as ExtendedProduct : p)
      );
      toast({
        title: "წარმატება",
        description: `პროდუქტი ${!currentValue ? 'დაემატა' : 'მოიხსნა'} სპეციალურებიდან.`,
      });
    } catch (error) {
      console.error("Error toggling special status:", error);
      toast({ title: "შეცდომა", description: "სპეციალური სტატუსის განახლება ვერ მოხერხდა.", variant: "destructive" });
    } finally {
      setLoadingState({ productId: null, type: null });
    }
  };

  const handleToggleFeatured = async (productId: string, currentValue: boolean) => {
    if (featuredProductsCount >= 10 && !currentValue) {
      toast({
        title: "ლიმიტი მიღწეულია",
        description: "შესაძლებელია მაქსიმუმ 10 გამორჩეული პროდუქტის მონიშვნა.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingState({ productId, type: 'featured' });
    try {
      const updatedProduct = await markProductAsFeatured(productId, !currentValue);
      setProducts(prev => 
        prev.map(p => p.id === productId ? updatedProduct as ExtendedProduct : p)
      );
      toast({
        title: "წარმატება",
        description: `პროდუქტი ${!currentValue ? 'დაემატა' : 'მოიხსნა'} გამორჩეულებიდან.`,
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast({ title: "შეცდომა", description: "გამორჩეული სტატუსის განახლება ვერ მოხერხდა.", variant: "destructive" });
    } finally {
      setLoadingState({ productId: null, type: null });
    }
  };

  const handleToggleNewCollection = async (productId: string, currentValue: boolean) => {
    if (newCollectionProductsCount >= 10 && !currentValue) {
      toast({
        title: "ლიმიტი მიღწეულია",
        description: "შესაძლებელია მაქსიმუმ 10 ახალი კოლექციის პროდუქტის მონიშვნა.",
        variant: "destructive",
      });
      return;
    }
    
    setLoadingState({ productId, type: 'newCollection' });
    try {
      const updatedProduct = await markProductAsNewCollection(productId, !currentValue);
      setProducts(prev => 
        prev.map(p => p.id === productId ? updatedProduct as ExtendedProduct : p)
      );
      toast({
        title: "წარმატება",
        description: `პროდუქტი ${!currentValue ? 'დაემატა' : 'მოიხსნა'} ახალი კოლექციიდან.`,
      });
    } catch (error) {
      console.error("Error toggling new collection status:", error);
      toast({ title: "შეცდომა", description: "ახალი კოლექციის სტატუსის განახლება ვერ მოხერხდა.", variant: "destructive" });
    } finally {
      setLoadingState({ productId: null, type: null });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.get(categoryId)?.name || 'Uncategorized';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ka-GE', {
      style: 'currency',
      currency: 'GEL',
    }).format(amount);
  };

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>პროდუქტების მართვა</CardTitle>
              <CardDescription>
                დაამატეთ, შეცვალეთ ან წაშალეთ პროდუქტები. ასევე მონიშნეთ პროდუქტები.
              </CardDescription>
            </div>
            <Link href="/admin/products/new">
              <Button><Plus className="mr-2 h-4 w-4" /> პროდუქტის დამატება</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="პროდუქტების ძიება..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* სტატუსების განმარტება */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center space-x-6 overflow-x-auto">
              <div className="flex items-center flex-shrink-0">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">სპეციალური</span>
                <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">({specialProductsCount}/10)</span>
              </div>
              <div className="flex items-center flex-shrink-0">
                <Crown className="h-5 w-5 text-amber-500 fill-amber-500 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">გამორჩეული</span>
                <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">({featuredProductsCount}/10)</span>
              </div>
              <div className="flex items-center flex-shrink-0">
                <PackageOpen className="h-5 w-5 text-emerald-500 fill-emerald-500 mr-2 flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">ახალი კოლექცია</span>
                <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">({newCollectionProductsCount}/10)</span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4">
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex animate-pulse">
                      <div className="h-12 w-12 bg-gray-200 rounded mr-4"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {searchTerm ? 'პროდუქტები ვერ მოიძებნა.' : 'პროდუქტები არ არის დამატებული.'}
                </p>
                {searchTerm && (
                  <Button
                    variant="link"
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    ძიების გასუფთავება
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        პროდუქტი
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ფასი
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        კატეგორია
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        მარკირება
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        მოქმედებები
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <Image
                                  className="h-10 w-10 rounded-full object-contain bg-gray-100"
                                  src={product.images[0]}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-xs text-gray-500">No img</span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="font-medium text-gray-900">{product.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-gray-900">{formatCurrency(product.price)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-gray-500">{getCategoryName(product.categoryId ?? '')}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleToggleSpecial(product.id, Boolean(product.isSpecial))}
                              className="focus:outline-none relative"
                              title={product.isSpecial ? "სპეციალური პროდუქტებიდან მოხსნა" : "სპეციალურ პროდუქტებში დამატება"}
                              disabled={loadingState.productId === product.id}
                            >
                              {loadingState.productId === product.id && loadingState.type === 'special' ? (
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                              ) : product.isSpecial ? (
                                <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                              ) : (
                                <Star className="h-6 w-6 text-gray-300" />
                              )}
                            </button>
                            
                            <button 
                              onClick={() => handleToggleFeatured(product.id, Boolean(product.isFeatured))}
                              className="focus:outline-none relative"
                              title={product.isFeatured ? "გამორჩეული პროდუქტებიდან მოხსნა" : "გამორჩეულ პროდუქტებში დამატება"}
                              disabled={loadingState.productId === product.id}
                            >
                              {loadingState.productId === product.id && loadingState.type === 'featured' ? (
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                              ) : product.isFeatured ? (
                                <Crown className="h-6 w-6 text-amber-500 fill-amber-500" />
                              ) : (
                                <Crown className="h-6 w-6 text-gray-300" />
                              )}
                            </button>
                            
                            <button 
                              onClick={() => handleToggleNewCollection(product.id, Boolean(product.isNewCollection))}
                              className="focus:outline-none relative"
                              title={product.isNewCollection ? "ახალი კოლექციიდან მოხსნა" : "ახალ კოლექციაში დამატება"}
                              disabled={loadingState.productId === product.id}
                            >
                              {loadingState.productId === product.id && loadingState.type === 'newCollection' ? (
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                              ) : product.isNewCollection ? (
                                <PackageOpen className="h-6 w-6 text-emerald-500 fill-emerald-500" />
                              ) : (
                                <PackageOpen className="h-6 w-6 text-gray-300" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link href={`/admin/products/${product.id}`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => setProductToDelete(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>დარწმუნებული ხართ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    ამ მოქმედების გაუქმება შეუძლებელია. პროდუქტი {`"${products.find(p => p.id === productToDelete)?.name || ''}"`} წაიშლება მონაცემთა ბაზიდან.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setProductToDelete(null)}>
                                    გაუქმება
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={handleDeleteProduct}
                                    className="bg-red-500 hover:bg-red-600"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    წაშლა
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Product Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{currentProduct?.name}&quot;?
              This will also delete all associated images.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (currentProduct) {
                  handleDeleteProduct();
                }
                setIsDeleteDialogOpen(false);
              }}
            >
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
} 