'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { getCategories, createCategory, updateCategory, deleteCategory, getProducts, updateProduct } from '@/lib/firebase-service';
import { Category, Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, X, Check, ArrowLeftRight, Image as ImageIcon, Grid, Save, Search } from 'lucide-react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from '@/components/providers/language-provider';

// ლამაზი სქროლბარის კლასი
const customScrollbarStyles = `
  /* ზოგიერთი კონტეინერისთვის სქროლბარი ჩანდეს მხოლოდ ჰოვერისას */
  .custom-scrollbar.hover-show::-webkit-scrollbar-thumb {
    opacity: 0;
  }
  
  .custom-scrollbar.hover-show:hover::-webkit-scrollbar-thumb {
    opacity: 1;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(241, 241, 241, 0.1);
    border-radius: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(103, 103, 245, 0.4);
    border-radius: 10px;
    transition: all 0.3s ease;
    opacity: 0.7;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(103, 103, 245, 0.7);
    opacity: 1;
  }
  
  /* სქროლბარის კუთხე */
  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }
  
  /* Firefox სქროლბარი */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(103, 103, 245, 0.4) transparent;
  }
  
  /* ანიმაცია */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    animation: fadeIn 0.5s ease;
  }
`;

type DragItemType = {
  id: string;
  type: string;
  image: string;
  productId: string;
};

// Draggable component
const DraggableImage = ({ image, productId }: { image: string; productId: string }) => {
  const { t } = useLanguage();
  const id = React.useId();
  const dragItemData = { id, type: 'image', image, productId };
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: dragItemData
  });

  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return null; // არ გამოაჩინო დივი, თუ სურათი ვერ ჩაიტვირთა
  }

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  // ფოტოს ზომა დამოკიდებულია პროდუქტის ID-ზე - თუ კატეგორიიდან არის უფრო პატარა იქნება
  const isFromCategory = productId === "category-move";
  const maxSize = isFromCategory ? '70px' : '90px';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`relative aspect-square rounded overflow-hidden shadow-sm hover:shadow-md transition-all ${
        isDragging ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
      }`}
      style={{
        ...style,
        cursor: 'grab',
        maxWidth: maxSize,
        maxHeight: maxSize,
        transform: isDragging ? 'scale(0.95)' : 'scale(1)',
        transition: 'all 0.2s ease'
      }}
    >
      <div className="relative w-full h-full">
        <Image
          src={image}
          alt={t('admin.productImage')}
          fill
          className="object-contain"
          onError={() => setImageError(true)}
        />
      </div>
    </div>
  );
};

// Droppable component
const CategoryDropZone = ({ category, pendingImages }: { 
  category: Category, 
  pendingImages: {id: string, image: string}[]
}) => {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 border-2 rounded-md transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/10 shadow-md scale-102' 
          : 'border-dashed border-gray-300'
      }`}
      style={{
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
        height: '280px', // ფიქსირებული სიმაღლე, რომელიც 4 ფოტოს იტევს
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-medium text-sm truncate flex-1" title={category.name}>{category.name}</h3>
        <span className="text-xs text-muted-foreground bg-gray-100 rounded-full px-2 py-0.5">
          {pendingImages.length} {t('admin.photos')}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {pendingImages.length === 0 ? (
          <div className="text-xs text-muted-foreground h-full flex items-center justify-center">
            {t('admin.dragImagesToAdd')}
          </div>
        ) : (
          <div className="mt-1 flex-1 overflow-y-auto custom-scrollbar hover-show">
            <div className="grid grid-cols-4 2xl:grid-cols-5 gap-1 p-1">
              {pendingImages.map((img) => (
                <div 
                  key={img.id}
                  className="relative"
                >
                  <DraggableImage 
                    image={img.image}
                    productId="category-move" // ეს გამოვიყენოთ სიგნალად, რომ კატეგორიიდან გადმოტანილი სურათია
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {isOver && (
        <div className="mt-1 text-xs text-primary animate-pulse">
          {t('admin.dropHere')}
        </div>
      )}
    </div>
  );
};

// ვქმნით ახალ კომპონენტს კატეგორიის გარეშე ფოტოებისთვის
const UncategorizedDropZone = () => {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({
    id: "uncategorized"
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 border-2 rounded-md transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/10 shadow-md scale-102' 
          : 'border-dashed border-gray-300'
      }`}
      style={{
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
        height: '280px', // ფიქსირებული სიმაღლე, თანხვედრაში CategoryDropZone-სთან
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-medium text-sm">{t('admin.uncategorized')}</h3>
        <span className="text-xs text-muted-foreground bg-gray-100 rounded-full px-2 py-0.5">
          {t('admin.dropZone')}
        </span>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="text-xs text-muted-foreground flex-1 flex items-center justify-center">
          {t('admin.dragImagesToRemove')}
        </div>
        
        {isOver && (
          <div className="mt-1 text-xs text-primary animate-pulse">
            {t('admin.dropHereToRemove')}
          </div>
        )}
      </div>
    </div>
  );
};

// მაღლა მივაბრუნოთ ღილაკი, როცა ფოტოს დავიჭერთ
const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return null; // ამ ფუნქციონალს ახლა არ ვიყენებთ
};

export default function AdminCategories() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [allImages, setAllImages] = useState<{id: string, image: string, productId: string}[]>([]);
  const [updateMessage, setUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{imageId: string, productId: string, categoryId: string | undefined}[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryImages, setCategoryImages] = useState<Record<string, {id: string, image: string}[]>>({});
  // ახალი სტეიტები საძიებოსთვის
  const [imageSearchTerm, setImageSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [secondCategorySearchTerm, setSecondCategorySearchTerm] = useState(''); // მეორე კატეგორიის ძიება
  const [showDiscountedOnly, setShowDiscountedOnly] = useState(false);

  // ფუნქცია კატეგორიიდან ფოტოს წასაშლელად და კატეგორიის გარეშე განყოფილებაში გადასატანად
  const handleRemoveFromCategory = (imageData: DragItemType) => {
    try {
      
      // მოვძებნოთ პროდუქტის ID რომელსაც ეს სურათი ეკუთვნის
      let foundProductId = '';
      products.forEach(product => {
        if (product.images && product.images.includes(imageData.image)) {
          foundProductId = product.id;
        }
      });
      
      if (!foundProductId) {
        console.error("ვერ მოიძებნა პროდუქტის ID");
        return;
      }
      
      
      // წავშალოთ სურათი ყველა კატეგორიიდან
      setCategoryImages(prev => {
        const newCategoryImages = { ...prev };
        
        // წავშალოთ ყველა კატეგორიიდან
        Object.keys(newCategoryImages).forEach(catId => {
          if (newCategoryImages[catId]) {
            newCategoryImages[catId] = newCategoryImages[catId].filter(img => 
              img.id !== imageData.id && img.image !== imageData.image
            );
          }
        });
        
        return newCategoryImages;
      });
      
      // დავამატოთ ფოტო allImages სიაში
      setAllImages(prev => [
        ...prev,
        {
          id: imageData.id,
          image: imageData.image,
          productId: foundProductId
        }
      ]);
      
      // დავამატოთ ცვლილება, რომ პროდუქტს წავუშალოთ კატეგორია
      setPendingChanges(prevChanges => {
        // წავშალოთ ნებისმიერი არსებული ცვლილება ამ პროდუქტისთვის
        const filteredChanges = prevChanges.filter(change => change.productId !== foundProductId);
        // დავამატოთ ახალი ცვლილება - categoryId: undefined
        return [
          ...filteredChanges, 
          { 
            imageId: imageData.id, 
            productId: foundProductId, 
            categoryId: undefined  // undefined კატეგორია ნიშნავს კატეგორიის წაშლას
          }
        ];
      });
      
      setUpdateMessage({
        type: 'success',
        text: 'ფოტო გამოტანილია კატეგორიიდან'
      });
      
      setTimeout(() => {
        setUpdateMessage(null);
      }, 3000);
      
    } catch (error) {
      console.error('Error removing from category:', error);
      setUpdateMessage({
        type: 'error',
        text: 'შეცდომა ფოტოს კატეგორიიდან გამოტანისას'
      });
      
      setTimeout(() => {
        setUpdateMessage(null);
      }, 3000);
    }
  };

  // Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.data.current) {
      const imageData = active.data.current as DragItemType;
      const targetId = over.id as string;
      
      // თუ სურათს ვაგდებთ "uncategorized" ზონაში, განსხვავებული ლოგიკა გამოვიყენოთ
      if (targetId === "uncategorized") {
        if (imageData.productId === "category-move") {
          console.log("კატეგორიიდან ფოტოს გადაწევა uncategorized-ში", imageData);
          handleRemoveFromCategory(imageData);
        } else {
          console.log("ფოტო უკვე uncategorized-შია, არაფერს ვაკეთებთ", imageData);
          // თუ ფოტო უკვე კატეგორიის გარეშეა, არაფერი გავაკეთოთ
        }
        return;
      }
      
      // ვამატებთ ვალიდაციას, რომ არ დავუშვათ დუბლიკატების შექმნა
      // თუ სურათი მოდის კატეგორიიდან, ვიპოვოთ წყარო კატეგორია
      if (imageData.productId === "category-move") {
        // ვიპოვოთ წყარო კატეგორია
        let sourceCategory = '';
        Object.entries(categoryImages).forEach(([catId, images]) => {
          if (images.some(img => img.id === imageData.id || img.image === imageData.image)) {
            sourceCategory = catId;
          }
        });
        
        // თუ წყარო და სამიზნე კატეგორიები ერთი და იგივეა, გამოვიდეთ ფუნქციიდან
        if (sourceCategory === targetId) {
          console.log("ფოტო იგივე კატეგორიაში გადავიტანეთ, ცვლილება არ კეთდება", imageData, targetId);
          return;
        }
        
        console.log("ფოტოს გადატანა ერთი კატეგორიიდან მეორეში", imageData, sourceCategory, targetId);
      } else {
        console.log("ფოტოს გადატანა uncategorized-დან კატეგორიაში", imageData, targetId);
      }
      
      handleImageDrop(imageData, targetId);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        await fetchCategories(); // ჯერ კატეგორიები
        await fetchProducts(); // შემდეგ პროდუქტები
      } catch (_error) {
        // console.error('Error fetching initial data:', error);
        setUpdateMessage({ type: 'error', text: 'მონაცემების ჩატვირთვისას მოხდა შეცდომა.' });
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isDistributionModalOpen) {
      fetchProducts();
      // Reset pending changes when modal opens
      setPendingChanges([]);
      setCategoryImages({});
    }
  }, [isDistributionModalOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsData = await getProducts();
      setProducts(productsData);
      
      // ინიციალიზაცია categoryImages-ის
      const newCategoryImages: Record<string, {id: string, image: string}[]> = {};
      
      // პირველ ეტაპზე, გამოვყოთ პროდუქტები კატეგორიების მიხედვით
      const productsByCategory: Record<string, Product[]> = {};
      
      // გავფილტროთ პროდუქტები კატეგორიების მიხედვით
      productsData.forEach(product => {
        if (product.categoryId) {
          if (!productsByCategory[product.categoryId]) {
            productsByCategory[product.categoryId] = [];
          }
          productsByCategory[product.categoryId].push(product);
        }
      });
      
      // შევქმნათ დროებითი ლისტი იმ პროდუქტებისთვის, რომლებსაც არ აქვთ კატეგორია
      const productsWithoutCategory = productsData.filter(product => !product.categoryId);
      
      // Extract images for products with categories
      Object.entries(productsByCategory).forEach(([categoryId, products]) => {
        const categoryImages = products.flatMap(product => 
          (product.images || [])
            .filter(image => !!image && typeof image === 'string' && image.trim() !== '')
            .map(image => ({ 
              id: crypto.randomUUID(), 
              image, 
              productId: product.id 
            }))
        );
        
        if (categoryImages.length > 0) {
          newCategoryImages[categoryId] = categoryImages.map(img => ({
            id: img.id,
            image: img.image
          }));
        }
      });
      
      // დავაყენოთ categoryImages
      setCategoryImages(newCategoryImages);
      
      // მხოლოდ კატეგორიის გარეშე პროდუქტების სურათები აჩვენე
      const uncategorizedImages = productsWithoutCategory.flatMap(product => 
        (product.images || [])
          .filter(image => !!image && typeof image === 'string' && image.trim() !== '')
          .map(image => ({ 
            id: crypto.randomUUID(), 
            image, 
            productId: product.id 
          }))
      );
      
      setAllImages(uncategorizedImages);
    } catch (error) {
      console.error('Error fetching products:', error); // Renamed variable to error
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      const newCategory = await createCategory(newCategoryName);
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingName.trim() || editingName === categories.find(c => c.id === id)?.name) {
      setEditingId(null);
      return;
    }
    
    try {
      setIsSubmitting(true);
      const updatedCategory = await updateCategory(id, editingName);
      setCategories(categories.map(category => 
        category.id === id ? updatedCategory : category
      ));
      setEditingId(null);
    } catch (error) {
      console.error('Error updating category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm(t('admin.deleteCategoryConfirmation'))) {
      try {
        setIsSubmitting(true);
        await deleteCategory(id);
        setCategories(categories.filter(category => category.id !== id));
      } catch (error) {
        console.error('Error deleting category:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleImageDrop = (imageData: DragItemType, categoryId: string) => {
    try {
      // სურათის ID და URL, რომელიც მიგვაქვს
      const targetImageId = imageData.id;
      const targetImageUrl = imageData.image;
      
      // მოვძებნოთ პროდუქტის ID რომელსაც ეს სურათი ეკუთვნის - ეს ყველა შემთხვევაში გვჭირდება
      let productId = imageData.productId;
      
      // თუ სურათი კატეგორიიდან მოდის, მოვძებნოთ რეალური პროდუქტის ID
      if (imageData.productId === "category-move") {
        let foundProductId = '';
        products.forEach(product => {
          if (product.images && product.images.includes(targetImageUrl)) {
            foundProductId = product.id;
          }
        });
        
        if (foundProductId) {
          productId = foundProductId;
        } else {
          console.error("ვერ მოიძებნა პროდუქტის ID სურათისთვის:", targetImageUrl);
          return; // თუ ვერ ვიპოვეთ პროდუქტის ID, გამოვიდეთ
        }
      }
      
      // პირველ რიგში შევამოწმოთ წყარო კატეგორია
      let sourceCategory = '';
      Object.entries(categoryImages).forEach(([catId, images]) => {
        if (images.some(img => img.id === targetImageId || img.image === targetImageUrl)) {
          sourceCategory = catId;
        }
      });
      
      // თუ წყარო და სამიზნე კატეგორიები ერთი და იგივეა, გამოვიდეთ ფუნქციიდან
      if (sourceCategory === categoryId) {
        return;
      }
      
      // მოვძებნოთ პროდუქტი, რომ ვიცოდეთ მისი ორიგინალი categoryId
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        console.error("ვერ მოიძებნა პროდუქტი ID-სთვის:", productId);
        return; // თუ ვერ ვიპოვეთ პროდუქტი, გამოვიდეთ
      }
      
      // თუ ფოტო ბრუნდება თავის ორიგინალ კატეგორიაში, წავშალოთ pendingChanges-დან
      if (product.categoryId === categoryId) {
        setPendingChanges(prevChanges => 
          prevChanges.filter(change => change.productId !== productId)
        );
      } else {
        // დავამატოთ ან განვაახლოთ ცვლილება, როცა ნამდვილი ცვლილებაა
        setPendingChanges(prevChanges => {
          // წავშალოთ არსებული ცვლილებები ამ პროდუქტისთვის
          const filteredChanges = prevChanges.filter(change => change.productId !== productId);
          // დავამატოთ ახალი ცვლილება
          return [
            ...filteredChanges, 
            { 
              imageId: targetImageId,
              productId: productId,
              categoryId
            }
          ];
        });
      }
      
      // თუ სურათი მოდის allImages-დან, წავშალოთ იქიდან
      if (imageData.productId !== "category-move") {
        setAllImages(prevImages => 
          prevImages.filter(img => (img.id !== targetImageId && img.image !== targetImageUrl))
        );
      }
      
      // განვახორციელოთ UI განახლება categoryImages-ში
      setCategoryImages(prev => {
        const newCategoryImages = { ...prev };
        
        // 1. წავშალოთ სურათი ყველა კატეგორიიდან
        Object.keys(newCategoryImages).forEach(catId => {
          if (newCategoryImages[catId]) {
            newCategoryImages[catId] = newCategoryImages[catId].filter(img => 
              img.id !== targetImageId && img.image !== targetImageUrl
            );
          }
        });
        
        // 2. დავამატოთ სურათი ახალ კატეგორიაში
        if (!newCategoryImages[categoryId]) {
          newCategoryImages[categoryId] = [];
        }
        
        // ვამოწმებთ, უკვე ხომ არ არის ეს სურათი ამ კატეგორიაში
        const alreadyExists = newCategoryImages[categoryId].some(
          img => img.id === targetImageId || img.image === targetImageUrl
        );
        
        if (!alreadyExists) {
          newCategoryImages[categoryId].push({ 
            id: targetImageId, 
            image: targetImageUrl 
          });
        }
        
        return newCategoryImages;
      });
      
    } catch (error) {
      console.error('Error handling image drop:', error);
      setUpdateMessage({
        type: 'error',
        text: t('admin.imageTransferError')
      });
      
      setTimeout(() => {
        setUpdateMessage(null);
      }, 3000);
    }
  };

  const saveAllChanges = async () => {
    if (pendingChanges.length === 0) {
      setUpdateMessage({
        type: 'error',
        text: 'არ არის ცვლილებები შესანახად'
      });
      setTimeout(() => setUpdateMessage(null), 3000);
      return;
    }

    setIsSaving(true);
    setUpdateMessage(null);
    
    try {
      // Group changes by product ID to minimize API calls
      const changesByProduct = pendingChanges.reduce((acc, change) => {
        acc[change.productId] = change.categoryId;
        return acc;
      }, {} as Record<string, string | undefined>);
      
      // Apply all changes
      const updatePromises = Object.entries(changesByProduct).map(
        ([productId, categoryId]) => updateProduct(productId, { categoryId })
      );
      
      await Promise.all(updatePromises);
      
      // Update local state
      setProducts(products.map(product => {
        const newCategoryId = changesByProduct[product.id];
        if (newCategoryId !== undefined) {
          return { ...product, categoryId: newCategoryId };
        }
        return product;
      }));
      
      // Clear pending changes
      setPendingChanges([]);
      
      setUpdateMessage({
        type: 'success',
        text: t('admin.changesSaved')
      });
      
    } catch (error) {
      console.error('Error saving changes:', error);
      setUpdateMessage({
        type: 'error',
        text: t('admin.saveError')
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setUpdateMessage(null), 3000);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const hasPendingChanges = pendingChanges.length > 0;

  // ფილტრაცია ფოტოებისთვის
  const filteredAllImages = allImages.filter(img => {
    // პოვნა productId-ს მიხედვით შესაბამისი პროდუქტი
    const relatedProduct = products.find(p => p.id === img.productId);
    
    // ფასდაკლების ფილტრი
    let discountFilter = true;
    if (showDiscountedOnly && relatedProduct) {
      // @ts-expect-error: ეს ველები არსებობს პროდუქტში, მაგრამ TS ვერ ხედავს
      discountFilter = relatedProduct.discountPercentage > 0 || relatedProduct.hasPublicDiscount || relatedProduct.isSpecial;
    }
      
    // სახელის და აღწერის ფილტრი
    const searchFilter = imageSearchTerm.trim() === ''
      ? true
      : relatedProduct && (
          relatedProduct.name.toLowerCase().includes(imageSearchTerm.toLowerCase()) ||
          (relatedProduct.description && relatedProduct.description.toLowerCase().includes(imageSearchTerm.toLowerCase()))
        );
    
    return relatedProduct && discountFilter && searchFilter;
  });

  // ფილტრაცია კატეგორიებისთვის
  const filteredCategories = categories.filter(cat => {
    if (categorySearchTerm.trim() === '') return true;
    return cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase());
  });

  // მეორე ფილტრი კატეგორიებისთვის
  const secondFilteredCategories = categories.filter(cat => {
    if (secondCategorySearchTerm.trim() === '') return true;
    return cat.name.toLowerCase().includes(secondCategorySearchTerm.toLowerCase());
  });

  // ფილტრაცია კატეგორიებში არსებული ფოტოებისთვის
  // ამ ფილტრაციის ლოგიკას ამჟამად არ ვიყენებთ, მაგრამ შევინარჩუნოთ მომავალი გამოყენებისთვის
  /* Object.entries(categoryImages).reduce((acc, [catId, images]) => {
    if (!categorySearchTerm.trim() || categories.find(c => c.id === catId)?.name.toLowerCase().includes(categorySearchTerm.toLowerCase())) {
      // თუ ფასდაკლების ფილტრი ჩართულია, დავფილტროთ კატეგორიის ფოტოებიც
      if (showDiscountedOnly) {
        // მივიღოთ იმ პროდუქტების სურათები, რომლებსაც აქვთ ფასდაკლება
        const discountedImages = images.filter(img => {
          const imageUrl = img.image;
          // მოვძებნოთ პროდუქტი, რომელსაც ეს სურათი ეკუთვნის
          const relatedProduct = products.find(p => p.images && p.images.includes(imageUrl));
          if (!relatedProduct) return false;
          
          // @ts-expect-error: ეს ველები არსებობს პროდუქტში, მაგრამ TS ვერ ხედავს
          return relatedProduct.discountPercentage > 0 || relatedProduct.hasPublicDiscount || relatedProduct.isSpecial;
        });
        
        if (discountedImages.length > 0) {
          acc[catId] = discountedImages;
        }
      } else {
        acc[catId] = images;
      }
    }
    return acc;
  }, {} as Record<string, {id: string, image: string}[]>); */

  return (
    <AdminLayout>
      <style dangerouslySetInnerHTML={{ __html: customScrollbarStyles }} />
      
      {isDistributionModalOpen ? (
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col h-[calc(100vh-90px)] max-h-[calc(100vh-90px)] overflow-auto custom-scrollbar hover-show">
            <div className="flex justify-between items-center border-b p-2 sm:p-4 bg-white shadow-sm sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsDistributionModalOpen(false)}
                  className="mr-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{t('admin.goBack')}</span>
                </Button>
                <h2 className="text-base sm:text-xl font-bold truncate">{t('admin.redistributeImages')}</h2>
              </div>
              
              <Button 
                onClick={saveAllChanges} 
                disabled={!hasPendingChanges || isSaving}
                className={`text-white font-bold px-2 sm:px-6 py-2 ${hasPendingChanges ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span className="hidden sm:inline">{t('admin.saving')}</span>
                    <span className="sm:hidden">{t('admin.saving')}</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-1 sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">{t('admin.changesSaved')}</span>
                    <span className="sm:hidden">{t('admin.save')}</span>
                    {hasPendingChanges && (
                      <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 bg-white text-green-700 rounded-full text-xs sm:text-sm font-bold">
                        {pendingChanges.length}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
              
            {updateMessage && (
              <div className={`p-2 sm:p-3 mx-4 mt-2 rounded sticky top-[60px] sm:top-[76px] z-10 ${
                updateMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {updateMessage.text}
              </div>
            )}

            {/* მობილური და დესკტოპ ვერსიები, შეცვლილი განლაგებით */}
            <div className="flex flex-col md:flex-row gap-4 p-4 overflow-auto flex-1 min-h-0">
              {/* Images Section - კატეგორიის გარეშე ფოტოები */}
              <div className="w-full md:w-1/2 flex flex-col min-h-0 max-h-full">
                <div className="flex flex-col gap-2 mb-3 bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{t('admin.uncategorizedPhotos')}</h3>
                    {filteredAllImages.length > 0 && (
                      <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        {filteredAllImages.length} {t('admin.photos')}
                      </span>
                    )}
                  </div>
                  
                  {/* საძიებო ველი ფოტოებისთვის - კომპაქტური ვერსია მობილურზე */}
                  <div className="relative mt-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 pr-3 py-1 w-full text-sm"
                      placeholder={t('admin.searchPhotos')}
                      value={imageSearchTerm}
                      onChange={(e) => setImageSearchTerm(e.target.value)}
                    />
                    {imageSearchTerm && (
                      <button
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setImageSearchTerm('')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* ფასდაკლების ფილტრი */}
                  <div className="flex items-center mt-1 pl-1">
                    <input
                      type="checkbox"
                      id="discount-filter-mobile"
                      checked={showDiscountedOnly}
                      onChange={(e) => setShowDiscountedOnly(e.target.checked)}
                      className="h-3 w-3 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="discount-filter-mobile" className="ml-2 text-xs font-medium text-gray-700">
                      {t('admin.discountedOnly')}
                    </label>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-y-auto flex-1 p-2 md:p-4 bg-gray-50 shadow-inner min-h-[100px] md:min-h-0 max-h-[30vh] md:max-h-full custom-scrollbar hover-show">
                  {/* დავამატოთ drop ზონა კატეგორიიდან გამოსატანად */}
                  {/* ეს ზონა მხოლოდ მაშინ აისახება, როდესაც ფოტოები არსებობს კატეგორიებში */}
                  {Object.values(categoryImages).some(images => images.length > 0) && (
                    <div className="mb-3">
                      <UncategorizedDropZone />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                    {filteredAllImages.length === 0 ? (
                      <div className="col-span-full py-4 text-center text-muted-foreground text-xs md:text-sm">
                        {imageSearchTerm ? t('admin.noPhotosFound') : t('admin.noUncategorizedPhotos')}
                      </div>
                    ) : (
                      filteredAllImages.map((imageData, index) => (
                        <DraggableImage
                          key={`${imageData.id}-${index}`}
                          image={imageData.image}
                          productId={imageData.productId}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Categories Section - კატეგორიები */}
              <div className="w-full md:w-1/2 flex flex-col min-h-0 max-h-full mt-4 md:mt-0">
                <div className="flex flex-col gap-2 mb-3 bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <Grid className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">{t('admin.categories')}</h3>
                    {hasPendingChanges && (
                      <span className="ml-auto text-xs md:text-sm bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                        {pendingChanges.length} {t('admin.pendingChanges')}
                      </span>
                    )}
                  </div>
                  
                  {/* ორი საძიებო ველი კატეგორიებისთვის ერთ დივში */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {/* პირველი საძიებო ველი */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8 pr-3 py-1 w-full text-sm"
                        placeholder={t('admin.firstCategory')}
                        value={categorySearchTerm}
                        onChange={(e) => setCategorySearchTerm(e.target.value)}
                      />
                      {categorySearchTerm && (
                        <button
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setCategorySearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* მეორე საძიებო ველი */}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-8 pr-3 py-1 w-full text-sm"
                        placeholder={t('admin.secondCategory')}
                        value={secondCategorySearchTerm}
                        onChange={(e) => setSecondCategorySearchTerm(e.target.value)}
                      />
                      {secondCategorySearchTerm && (
                        <button
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          onClick={() => setSecondCategorySearchTerm('')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* მოკლე განმარტება */}
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('admin.searchBothCategories')}
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-y-auto flex-1 p-2 md:p-4 bg-gray-50 shadow-inner min-h-[250px] md:min-h-0 max-h-[60vh] md:max-h-full custom-scrollbar hover-show">
                  {/* კატეგორიების ჩვენება */}
                  <div className="space-y-3 md:space-y-4">
                    {/* გაფილტრული კატეგორიები პირველი საძიებოდან */}
                    {filteredCategories.length === 0 && secondFilteredCategories.length === 0 ? (
                      <div className="py-4 md:py-8 text-center text-muted-foreground text-xs md:text-sm">
                        {categorySearchTerm || secondCategorySearchTerm ? 'კატეგორიები ვერ მოიძებნა' : 'კატეგორიები არ მოიძებნა'}
                      </div>
                    ) : (
                      <>
                        {/* პირველი საძიებოთი გაფილტრული კატეგორიები */}
                        {filteredCategories.length > 0 && categorySearchTerm && (
                          <div className="mb-4">
                            <div className="text-sm font-medium mb-2 bg-primary/10 p-1 px-2 rounded-md inline-block">
                              პირველი საძიებო: {categorySearchTerm}
                            </div>
                            <div className="space-y-3">
                              {filteredCategories.map(category => (
                                <CategoryDropZone
                                  key={category.id}
                                  category={category}
                                  pendingImages={categoryImages[category.id] || []}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* მეორე საძიებოთი გაფილტრული კატეგორიები */}
                        {secondFilteredCategories.length > 0 && secondCategorySearchTerm && (
                          <div>
                            <div className="text-sm font-medium mb-2 bg-secondary/20 p-1 px-2 rounded-md inline-block">
                              მეორე საძიებო: {secondCategorySearchTerm}
                            </div>
                            <div className="space-y-3">
                              {secondFilteredCategories.map(category => (
                                <CategoryDropZone
                                  key={`second-${category.id}`}
                                  category={category}
                                  pendingImages={categoryImages[category.id] || []}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* არაგაფილტრული კატეგორიები (როცა არცერთი საძიებო არ არის შევსებული) */}
                        {!categorySearchTerm && !secondCategorySearchTerm && (
                          <div className="space-y-3">
                            {categories.map((category) => (
                              <CategoryDropZone
                                key={category.id}
                                category={category}
                                pendingImages={categoryImages[category.id] || []}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* მაღლა დაბრუნების ღილაკი */}
            <ScrollToTopButton />
          </div>
        </DndContext>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('admin.categoriesManagement')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('admin.organizeProducts')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
              <Button
                onClick={() => setIsDistributionModalOpen(true)}
                variant="outline"
                className="bg-primary/10 border-primary text-primary hover:bg-primary/20"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                {t('admin.redistributeImages')}
              </Button>
              <Button
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.addCategory')}
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isAdding && (
              <div className="p-4 border-b bg-gray-50">
                <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label htmlFor="new-category" className="sr-only">
                      ახალი კატეგორია
                    </Label>
                    <Input
                      id="new-category"
                      placeholder="შეიყვანეთ კატეგორიის სახელი"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={!newCategoryName.trim() || isSubmitting}
                    >
                      {isSubmitting ? 'მიმდინარეობს...' : 'დამატება'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setIsAdding(false)}
                    >
                      გაუქმება
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p className="mt-2 text-muted-foreground">მიმდინარეობს ჩატვირთვა...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-muted-foreground">კატეგორიები არ არის დამატებული.</p>
                <Button
                  onClick={() => setIsAdding(true)}
                  variant="link"
                  className="mt-2"
                >
                  დაამატეთ პირველი კატეგორია
                </Button>
              </div>
            ) : (
              <ul className="divide-y max-h-[70vh] overflow-y-auto custom-scrollbar hover-show">
                {categories.map((category) => (
                  <li key={category.id} className="p-4 hover:bg-gray-50">
                    {editingId === category.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="flex-1"
                          disabled={isSubmitting}
                          autoFocus
                        />
                        <Button
                          size="icon"
                          onClick={() => handleUpdateCategory(category.id)}
                          disabled={isSubmitting || !editingName.trim()}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.name}</span>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEditing(category)}
                            disabled={isSubmitting}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category.id)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
} 