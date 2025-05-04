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
import { Percent, CheckCircle, AlertCircle, Trash, Tag } from 'lucide-react';

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
        toast.error('შეცდომა მონაცემების მიღებისას');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [refreshTrigger]);

  const handleAddDiscount = async () => {
    if (!selectedProductId || discountPercentage <= 0 || discountPercentage > 100) {
      toast.error('გთხოვთ შეავსოთ ყველა ველი სწორად');
      return;
    }
    
    // თუ არ არის საჯარო ფასდაკლება, შეამოწმოს პრომოკოდი
    if (!isPublic && !promoCode.trim()) {
      toast.error('გთხოვთ შეიყვანოთ პრომოკოდი');
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
        'ფასდაკლება წარმატებით დაემატა' : 
        'პრომოკოდი წარმატებით დაემატა'
      );
      
      // ფორმის გასუფთავება
      setSelectedProductId('');
      setDiscountPercentage(10);
      setPromoCode('');
      
      // განახლება
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('შეცდომა ფასდაკლების დამატებისას:', error);
      toast.error('შეცდომა ფასდაკლების დამატებისას');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeactivateDiscount = async (discountId: string) => {
    setIsLoading(true);
    
    try {
      await deactivateDiscount(discountId);
      toast.success('ფასდაკლება წარმატებით დეაქტივირდა');
      
      // განახლება
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('შეცდომა ფასდაკლების დეაქტივაციისას:', error);
      toast.error('შეცდომა ფასდაკლების დეაქტივაციისას');
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
        <h1 className="text-2xl font-bold mb-6">ფასდაკლებები და პრომოკოდები</h1>
        
        {/* ახალი ფასდაკლების/პრომოკოდის დამატების ფორმა */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>ახალი ფასდაკლება/პრომოკოდი</CardTitle>
            <CardDescription>
              დაამატეთ ფასდაკლება ან პრომოკოდი პროდუქტზე
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
                  {isPublic ? 'საჯარო ფასდაკლება' : 'პრომოკოდი'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? '(ხილული ყველა მომხმარებლისთვის)' 
                    : '(ხილული მხოლოდ კოდის ცოდნის შემთხვევაში)'}
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="product">პროდუქტი</Label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  onOpenChange={setIsSelectOpen}
                >
                  <SelectTrigger id="product">
                    <SelectValue placeholder="აირჩიეთ პროდუქტი" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] p-0">
                    <div className="px-2 py-2 sticky top-0 bg-background z-10 border-b">
                      <Input
                        placeholder="პროდუქტის ძებნა სახელით..."
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        className="mb-1"
                        autoFocus={isSelectOpen}
                        // ენტერის დაჭერაზე პირველი შედეგის არჩევა
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && filteredProducts.length > 0) {
                            setSelectedProductId(filteredProducts[0].id);
                            setIsSelectOpen(false);
                          }
                        }}
                      />
                    </div>
                    <ScrollArea className="max-h-[220px] overflow-auto">
                      {filteredProducts.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          პროდუქტები არ მოიძებნა
                        </div>
                      ) : (
                        filteredProducts.map(product => (
                          <SelectItem 
                            key={product.id} 
                            value={product.id}
                            className="cursor-pointer hover:bg-accent focus:bg-accent"
                          >
                            <div className="flex items-center gap-2 py-1">
                              {product.images && product.images[0] ? (
                                <div className="w-8 h-8 relative rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                  <Image 
                                    src={product.images[0]} 
                                    alt={product.name} 
                                    fill
                                    className="object-cover" 
                                    sizes="32px"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="truncate max-w-[200px] text-sm font-medium">{product.name}</span>
                                {product.price && (
                                  <span className="text-xs text-muted-foreground">₾{product.price.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              
              {!isPublic && (
                <div className="grid gap-2">
                  <Label htmlFor="promoCode">პრომოკოდი</Label>
                  <div className="flex items-center gap-2">
                    <Tag className="text-muted-foreground" size={16} />
                    <Input
                      id="promoCode"
                      placeholder="მაგ: SUMMER20"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="discount">ფასდაკლება (%)</Label>
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
              {isPublic ? 'ფასდაკლების' : 'პრომოკოდის'} დამატება
            </Button>
          </CardFooter>
        </Card>
        
        {/* ფასდაკლებების და პრომოკოდების ცხრილები */}
        <Tabs defaultValue="discounts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="discounts">საჯარო ფასდაკლებები</TabsTrigger>
            <TabsTrigger value="promocodes">პრომოკოდები</TabsTrigger>
          </TabsList>
          
          {/* საჯარო ფასდაკლებების ჩანართი */}
          <TabsContent value="discounts">
            <Card>
              <CardHeader>
                <CardTitle>საჯარო ფასდაკლებები</CardTitle>
                <CardDescription>
                  ყველა მომხმარებლისთვის ხილული ფასდაკლებები პროდუქტებზე
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>პროდუქტი</TableHead>
                      <TableHead>ფასდაკლება</TableHead>
                      <TableHead>სტატუსი</TableHead>
                      <TableHead>მოქმედება</TableHead>
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
                                <span>აქტიური</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-500">
                                <AlertCircle size={14} />
                                <span>არააქტიური</span>
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
                                დეაქტივაცია
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          ფასდაკლებები არ არის დამატებული
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
                <CardTitle>პრომოკოდები</CardTitle>
                <CardDescription>
                  ფარული პრომოკოდები კონკრეტული პროდუქტებისთვის
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>პროდუქტი</TableHead>
                      <TableHead>პრომოკოდი</TableHead>
                      <TableHead>ფასდაკლება</TableHead>
                      <TableHead>სტატუსი</TableHead>
                      <TableHead>მოქმედება</TableHead>
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
                                <span>აქტიური</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-500">
                                <AlertCircle size={14} />
                                <span>არააქტიური</span>
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
                                დეაქტივაცია
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                          პრომოკოდები არ არის დამატებული
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