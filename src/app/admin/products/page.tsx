'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { useLanguage } from '@/components/providers/language-provider';

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
  const { t, locale } = useLanguage();

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
        title: t('admin.error'),
        description: t('admin.dataRetrievalError')
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
        title: t('admin.success'),
        description: t('admin.productDeleted')
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        variant: "destructive", 
        title: t('admin.error'), 
        description: t('admin.deleteError')
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
        title: t('admin.limitReached'),
        description: t('admin.specialLimit'),
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
        title: t('admin.success'),
        description: !currentValue ? t('admin.addedToSpecial') : t('admin.removedFromSpecial'),
      });
    } catch (error) {
      console.error("Error toggling special status:", error);
      toast({ 
        title: t('admin.error'), 
        description: t('admin.specialUpdateError'), 
        variant: "destructive" 
      });
    } finally {
      setLoadingState({ productId: null, type: null });
    }
  };

  const handleToggleFeatured = async (productId: string, currentValue: boolean) => {
    if (featuredProductsCount >= 20 && !currentValue) {
      toast({
        title: t('admin.limitReached'),
        description: t('admin.featuredLimit'),
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
        title: t('admin.success'),
        description: !currentValue ? t('admin.addedToFeatured') : t('admin.removedFromFeatured'),
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast({ 
        title: t('admin.error'), 
        description: t('admin.featuredUpdateError'), 
        variant: "destructive" 
      });
    } finally {
      setLoadingState({ productId: null, type: null });
    }
  };

  const handleToggleNewCollection = async (productId: string, currentValue: boolean) => {
    if (newCollectionProductsCount >= 20 && !currentValue) {
      toast({
        title: t('admin.limitReached'),
        description: t('admin.newCollectionLimit'),
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
        title: t('admin.success'),
        description: !currentValue ? t('admin.addedToNewCollection') : t('admin.removedFromNewCollection'),
      });
    } catch (error) {
      console.error("Error toggling new collection status:", error);
      toast({ 
        title: t('admin.error'), 
        description: t('admin.newCollectionUpdateError'), 
        variant: "destructive" 
      });
    } finally {
      setLoadingState({ productId: null, type: null });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.get(categoryId)?.name || 'Uncategorized';
  };

  const formatCurrency = (amount: number) => {
    // მიმდინარე ენის შესაბამისი ვალუტის ფორმატი
    const localeFormat = locale === 'en' ? 'en-US' : 'ka-GE';
    
    return new Intl.NumberFormat(localeFormat, {
      style: 'currency',
      currency: 'GEL',
    }).format(amount);
  };

  return (
    <AdminLayout>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div>
              <CardTitle>{t('admin.productsManagement')}</CardTitle>
              <CardDescription>
                {t('admin.addEditDeleteProducts')}
              </CardDescription>
            </div>
            <Link href="/admin/products/new">
              <Button><Plus className="mr-2 h-4 w-4" /> {t('admin.addProduct')}</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="bg-white rounded-lg shadow w-full overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('admin.productSearch')}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* სტატუსების განმარტება */}
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center space-x-3 sm:space-x-6 overflow-x-auto text-xs sm:text-sm">
              <div className="flex items-center flex-shrink-0">
                <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400 fill-yellow-400 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{t('admin.special')}</span>
                <span className="text-gray-500 ml-1 sm:ml-2 whitespace-nowrap">({specialProductsCount}/10)</span>
              </div>
              <div className="flex items-center flex-shrink-0">
                <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 fill-amber-500 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{t('admin.featured')}</span>
                <span className="text-gray-500 ml-1 sm:ml-2 whitespace-nowrap">({featuredProductsCount}/20)</span>
              </div>
              <div className="flex items-center flex-shrink-0">
                <PackageOpen className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 fill-emerald-500 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">{t('admin.newCollection')}</span>
                <span className="text-gray-500 ml-1 sm:ml-2 whitespace-nowrap">({newCollectionProductsCount}/20)</span>
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
                  {searchTerm ? t('admin.noProductsFound') : t('admin.noProducts')}
                </p>
                {searchTerm && (
                  <Button
                    variant="link"
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    {t('admin.clearSearch')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
                {/* მობილურზე სხვა დიზაინი */}
                <div className="md:hidden">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="border-b p-4">
                      <div className="flex items-center justify-between mb-2">
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
                          <div className="ml-3 overflow-hidden">
                            <div className="font-medium text-gray-900 truncate max-w-[150px]">{product.name}</div>
                            <div className="text-gray-500 text-sm truncate">{getCategoryName(product.categoryId ?? '')}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(product.price)}</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex space-x-3">
                          <button 
                            onClick={() => handleToggleSpecial(product.id, Boolean(product.isSpecial))}
                            className="focus:outline-none relative"
                            title={product.isSpecial ? t('admin.removedFromSpecial') : t('admin.addedToSpecial')}
                            disabled={loadingState.productId === product.id}
                          >
                            {loadingState.productId === product.id && loadingState.type === 'special' ? (
                              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            ) : product.isSpecial ? (
                              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                            ) : (
                              <Star className="h-5 w-5 text-gray-300" />
                            )}
                          </button>
                          
                          <button 
                            onClick={() => handleToggleFeatured(product.id, Boolean(product.isFeatured))}
                            className="focus:outline-none relative"
                            title={product.isFeatured ? t('admin.removedFromFeatured') : t('admin.addedToFeatured')}
                            disabled={loadingState.productId === product.id}
                          >
                            {loadingState.productId === product.id && loadingState.type === 'featured' ? (
                              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            ) : product.isFeatured ? (
                              <Crown className="h-5 w-5 text-amber-500 fill-amber-500" />
                            ) : (
                              <Crown className="h-5 w-5 text-gray-300" />
                            )}
                          </button>
                          
                          <button 
                            onClick={() => handleToggleNewCollection(product.id, Boolean(product.isNewCollection))}
                            className="focus:outline-none relative"
                            title={product.isNewCollection ? t('admin.removedFromNewCollection') : t('admin.addedToNewCollection')}
                            disabled={loadingState.productId === product.id}
                          >
                            {loadingState.productId === product.id && loadingState.type === 'newCollection' ? (
                              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                            ) : product.isNewCollection ? (
                              <PackageOpen className="h-5 w-5 text-emerald-500 fill-emerald-500" />
                            ) : (
                              <PackageOpen className="h-5 w-5 text-gray-300" />
                            )}
                          </button>
                        </div>
                        
                        <div className="flex space-x-1">
                          <Link href={`/admin/products/${product.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => setProductToDelete(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('admin.deleteConfirmation')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('admin.deleteWarning')} {`"${products.find(p => p.id === productToDelete)?.name || ''}"`}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setProductToDelete(null)}>
                                  {t('admin.cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDeleteProduct}
                                  className="bg-red-500 hover:bg-red-600"
                                  disabled={isDeleting}
                                >
                                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {t('admin.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* დესკტოპ ცხრილი */}
                <table className="w-full hidden md:table">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.table.product')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.table.price')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.table.category')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.table.tags')}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('admin.table.actions')}
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
                              title={product.isSpecial ? t('admin.removedFromSpecial') : t('admin.addedToSpecial')}
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
                              title={product.isFeatured ? t('admin.removedFromFeatured') : t('admin.addedToFeatured')}
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
                              title={product.isNewCollection ? t('admin.removedFromNewCollection') : t('admin.addedToNewCollection')}
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
                                  <AlertDialogTitle>{t('admin.deleteConfirmation')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('admin.deleteWarning')} {`"${products.find(p => p.id === productToDelete)?.name || ''}"`}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => setProductToDelete(null)}>
                                    {t('admin.cancel')}
                                  </AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={handleDeleteProduct}
                                    className="bg-red-500 hover:bg-red-600"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t('admin.delete')}
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
            <DialogTitle>{t('admin.delete')}</DialogTitle>
            <DialogDescription>
              {t('admin.deleteConfirmation')} &quot;{currentProduct?.name}&quot;?
              {t('admin.deleteWarning')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t('admin.cancel')}
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
              {t('admin.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
} 