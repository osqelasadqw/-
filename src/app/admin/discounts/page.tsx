'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AdminLayout } from '@/components/layouts/admin-layout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  addDiscountToProduct, 
  deactivateDiscount, 
  getProducts, 
  getPromoCodes, 
  getPublicDiscounts 
} from '@/lib/firebase-service';
import { Product/*, Discount*/ } from '@/types'; // Commented out problematic Discount import
import { toast } from 'sonner';
import { Percent, CheckCircle, AlertCircle, Trash, Tag, Search, X } from 'lucide-react';
import { useLanguage } from '@/components/providers/language-provider';

export default function AdminDiscountsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [publicDiscounts, setPublicDiscounts] = useState<any[]>([]); // Changed type to any[]
  const [promoCodes, setPromoCodes] = useState<any[]>([]); // Changed type to any[]
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [promoCode, setPromoCode] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // პროდუქტების მიღება
        const productsData = await getProducts();
        setProducts(productsData);
        
        // საჯარო ფასდაკლებებისა და პრომოკოდების მიღება
        const discountsData = await getPublicDiscounts();
        const promoCodesData = await getPromoCodes();
        
        setPublicDiscounts(discountsData);
        setPromoCodes(promoCodesData);
      } catch (error) {
        console.error('შეცდომა მონაცემების მიღებისას:', error);
        toast.error(t('admin.dataRetrievalError'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger, t]);

  const handleAddDiscount = async () => {
    if (!selectedProductId || discountPercentage <= 0 || discountPercentage > 100) {
      toast.error(t('admin.fillAllFields'));
      return;
    }
    
    // თუ არ არის საჯარო ფასდაკლება, შეამოწმოს პრომოკოდი
    if (!isPublic && !promoCode.trim()) {
      toast.error(t('admin.enterPromocode'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      await addDiscountToProduct(
        selectedProductId, 
        discountPercentage, 
        isPublic, 
        isPublic ? undefined : promoCode
      );
      
      toast.success(isPublic ? 
        t('admin.discountAdded') : 
        t('admin.promocodeAdded')
      );
      
      // ფორმის გასუფთავება
      setSelectedProductId('');
      setDiscountPercentage(10);
      setPromoCode('');
      
      // განახლება
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('შეცდომა ფასდაკლების დამატებისას:', error);
      toast.error(t('admin.discountAddError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateDiscount = async (discountId: string) => {
    setIsLoading(true);
    
    try {
      await deactivateDiscount(discountId);
      toast.success(t('admin.discountDeactivated'));
      
      // განახლება
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('შეცდომა ფასდაკლების დეაქტივაციისას:', error);
      toast.error(t('admin.discountDeactivateError'));
    } finally {
      setIsLoading(false);
    }
  };

  // პროდუქტის სახელის მიღება ID-ით
  const getProductNameById = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : 'უცნობი პროდუქტი';
  };

  // გაუმჯობესებული პროდუქტების ფილტრაცია საძიებო სიტყვის მიხედვით
  const filteredProducts = products.filter(product => {
    if (!productSearchQuery.trim()) return true;
    
    const searchTerms = productSearchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
    const productNameLower = product.name.toLowerCase();
    const productDescLower = (product.description || '').toLowerCase();
    
    return searchTerms.some(term => 
      productNameLower.includes(term) || productDescLower.includes(term)
    );
  });

  return (
    <AdminLayout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t('admin.discounts')}</h1>
        
        {/* ახალი ფასდაკლების/პრომოკოდის დამატების ფორმა */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('admin.addNewDiscount')}</CardTitle>
            <CardDescription>
              {t('admin.addDiscountOrPromocode')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="discount-type"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
                <Label htmlFor="discount-type" className="font-medium">
                  {isPublic ? t('admin.publicDiscount') : t('admin.promocodes')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? t('admin.visibleForAllUsers')
                    : t('admin.hiddenPromocode')}
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="product">{t('admin.product')}</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder={t('admin.selectProduct')}
                      className="pl-8 pr-10"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      onClick={() => setIsSelectOpen(true)}
                    />
                    {productSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearchQuery('');
                          setSelectedProductId('');
                        }}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {isSelectOpen && (
                    <Card className="absolute top-full left-0 right-0 mt-1 z-10 max-h-60 overflow-hidden shadow-lg">
                      <ScrollArea className="h-60">
                        <div className="p-1">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map((product) => (
                              <button
                                key={product.id}
                                className="w-full text-left px-3 py-2 hover:bg-muted rounded-sm flex items-center gap-2"
                                onClick={() => {
                                  setSelectedProductId(product.id);
                                  setProductSearchQuery(product.name);
                                  setIsSelectOpen(false);
                                }}
                              >
                                {product.images && product.images[0] && (
                                  <Image 
                                    src={product.images[0]} 
                                    alt={product.name} 
                                    width={28} 
                                    height={28} 
                                    className="w-7 h-7 object-cover rounded-sm"
                                  />
                                )}
                                <span>{product.name}</span>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-muted-foreground text-sm">
                              {t('admin.productsNotFound')}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  )}
                </div>
              </div>
              
              {!isPublic && (
                <div className="grid gap-2">
                  <Label htmlFor="promocode">{t('admin.promocode')}</Label>
                  <Input
                    id="promocode"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder={t('admin.promoExample')}
                    className="uppercase"
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="discount">{t('admin.discountPercentage')}</Label>
                <div className="flex items-center gap-2">
                  <Percent className="text-muted-foreground" size={16} />
                  <Input
                    id="discount"
                    type="number"
                    min="1"
                    max="100"
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleAddDiscount}
              disabled={isLoading || 
                !selectedProductId || 
                (!isPublic && !promoCode) || 
                discountPercentage <= 0 || 
                discountPercentage > 100}
            >
              {t('admin.addDiscount')}
            </Button>
          </CardFooter>
        </Card>
        
        {/* ფასდაკლებების და პრომოკოდების ცხრილები */}
        <Tabs defaultValue="discounts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="discounts">{t('admin.publicDiscounts')}</TabsTrigger>
            <TabsTrigger value="promocodes">{t('admin.promocodes')}</TabsTrigger>
          </TabsList>
          
          {/* საჯარო ფასდაკლებების ჩანართი */}
          <TabsContent value="discounts">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.publicDiscounts')}</CardTitle>
                <CardDescription>
                  {t('admin.visibleDiscountsForAllUsers')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.product')}</TableHead>
                      <TableHead>{t('admin.discount')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                      <TableHead>{t('admin.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {publicDiscounts.length > 0 ? (
                      publicDiscounts.map((discount) => (
                        <TableRow key={discount.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {discount.productImage && (
                                <Image src={discount.productImage} alt={discount.productName} 
                                     width={32} height={32} className="w-8 h-8 object-cover rounded" />
                              )}
                              <span>{discount.productName || getProductNameById(discount.productId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>{discount.discountPercentage}%</TableCell>
                          <TableCell>
                            {discount.active ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={14} />
                                <span>{t('admin.active')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-500">
                                <AlertCircle size={14} />
                                <span>{t('admin.inactive')}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {discount.active && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeactivateDiscount(discount.id)}
                                disabled={isLoading}
                              >
                                <Trash size={14} className="mr-1" />
                                {t('admin.deactivate')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          {t('admin.noDiscounts')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* პრომოკოდების ჩანართი */}
          <TabsContent value="promocodes">
            <Card>
              <CardHeader>
                <CardTitle>{t('admin.promocodes')}</CardTitle>
                <CardDescription>
                  {t('admin.hiddenPromocodes')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.product')}</TableHead>
                      <TableHead>{t('admin.promocode')}</TableHead>
                      <TableHead>{t('admin.discount')}</TableHead>
                      <TableHead>{t('admin.status')}</TableHead>
                      <TableHead>{t('admin.action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promoCodes.length > 0 ? (
                      promoCodes.map((promo) => (
                        <TableRow key={promo.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {promo.productImage && (
                                <Image src={promo.productImage} alt={promo.productName} 
                                     width={32} height={32} className="w-8 h-8 object-cover rounded" />
                              )}
                              <span>{promo.productName || getProductNameById(promo.productId)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Tag size={14} />
                              <span className="font-mono">{promo.promoCode}</span>
                            </div>
                          </TableCell>
                          <TableCell>{promo.discountPercentage}%</TableCell>
                          <TableCell>
                            {promo.active ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle size={14} />
                                <span>{t('admin.active')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-500">
                                <AlertCircle size={14} />
                                <span>{t('admin.inactive')}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {promo.active && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeactivateDiscount(promo.id)}
                                disabled={isLoading}
                              >
                                <Trash size={14} className="mr-1" />
                                {t('admin.deactivate')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          {t('admin.noPromocodes')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
} 