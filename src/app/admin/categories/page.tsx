'use client';

import React, { useEffect, useState } from 'react';
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
  const maxSize = isFromCategory ? '80px' : '120px';

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
      <Image
        src={image}
        alt="პროდუქტის ფოტო"
        width={isFromCategory ? 80 : 120}
        height={isFromCategory ? 80 : 120}
        className="h-full w-full object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

// Droppable component
const CategoryDropZone = ({ category, pendingImages }: { 
  category: Category, 
  pendingImages: {id: string, image: string}[]
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: category.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 border-2 rounded-md min-h-[100px] transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/10 shadow-md scale-102' 
          : 'border-dashed border-gray-300'
      }`}
      style={{
        transform: isOver ? 'scale(1.02)' : 'scale(1)'
      }}
    >
      <h3 className="font-medium mb-1 text-sm">{category.name}</h3>
      {pendingImages.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          გადმოიტანეთ ფოტოები აქ კატეგორიაში დასამატებლად
        </div>
      ) : (
        <div className="mt-1">
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
      
      {isOver && (
        <div className="mt-1 text-xs text-primary animate-pulse">
          აქ გადმოაგდეთ
        </div>
      )}
    </div>
  );
};

// ვქმნით ახალ კომპონენტს კატეგორიის გარეშე ფოტოებისთვის
const UncategorizedDropZone = (/*{ pendingImages }: { pendingImages: {id: string, image: string, productId: string}[] }*/) => { // commented out pendingImages
  const { setNodeRef, isOver } = useDroppable({
    id: "uncategorized"
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 border-2 rounded-md min-h-[100px] transition-all duration-200 ${
        isOver 
          ? 'border-primary bg-primary/10 shadow-md scale-102' 
          : 'border-dashed border-gray-300'
      }`}
      style={{
        transform: isOver ? 'scale(1.02)' : 'scale(1)'
      }}
    >
      <h3 className="font-medium mb-1 text-sm">კატეგორიის გარეშე</h3>
      <div className="text-xs text-muted-foreground mb-2">
        გადმოიტანეთ ფოტოები აქ კატეგორიიდან გამოსატანად
      </div>
      
      {isOver && (
        <div className="mt-1 text-xs text-primary animate-pulse">
          აქ გადმოაგდეთ კატეგორიიდან გამოსატანად
        </div>
      )}
    </div>
  );
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [allImages, setAllImages] = useState<{id: string, image: string, productId: string}[]>([]);
  const [updateMessage, setUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{imageId: string, productId: string, categoryId: string | undefined}[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryImages, setCategoryImages] = useState<Record<string, {id: string, image: string}[]>>({});
  // ახალი სტეიტები საძიებოსთვის
  const [imageSearchTerm, setImageSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
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
      setIsLoading(true);
      try {
        await fetchCategories(); // ჯერ კატეგორიები
        await fetchProducts(); // შემდეგ პროდუქტები
      } catch (_error) {
        // console.error('Error fetching initial data:', error);
        setUpdateMessage({ type: 'error', text: 'მონაცემების ჩატვირთვისას მოხდა შეცდომა.' });
      } finally {
        setIsLoading(false);
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
      setIsLoading(true);
      const categoriesData = await getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
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
    if (window.confirm('ნამდვილად გსურთ კატეგორიის წაშლა? ამ კატეგორიასთან დაკავშირებული პროდუქტები დარჩება, მაგრამ კატეგორიის გარეშე.')) {
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
      
      // სურათის ID, რომელიც მიგვაქვს
      const targetImageId = imageData.id;
      const targetImageUrl = imageData.image;
      
      // პირველ რიგში შევამოწმოთ, ხომ არ არის სურათი უკვე ამ კატეგორიაში
      // ვიპოვოთ წყარო კატეგორია
      if (imageData.productId === "category-move") {
        let sourceCategory = '';
        Object.entries(categoryImages).forEach(([catId, images]) => {
          if (images.some(img => img.id === imageData.id || img.image === targetImageUrl)) {
            sourceCategory = catId;
          }
        });
        
        // თუ წყარო და სამიზნე კატეგორიები ერთი და იგივეა, გამოვიდეთ ფუნქციიდან
        if (sourceCategory === categoryId) {
          // console.log("ფოტო იგივე კატეგორიაში გადავიტანეთ, ცვლილება არ კეთდება");
          return;
        }
      }
      
      // თუ სურათი არის კატეგორიიდან გადმოტანილი
      if (imageData.productId === "category-move") {
  
        
        // მოვძებნოთ პროდუქტის ID რომელსაც ეს სურათი ეკუთვნის
        let foundProductId = '';
        products.forEach(product => {
          if (product.images && product.images.includes(targetImageUrl)) {
            foundProductId = product.id;
          }
        });
        
        if (foundProductId) {
          
          // მოვძებნოთ პროდუქტი, რომ ვიცოდეთ მისი ორიგინალი categoryId
          const product = products.find(p => p.id === foundProductId);
          
          // თუ ფოტო ბრუნდება თავის ორიგინალ კატეგორიაში, წავშალოთ pendingChanges-დან
          if (product?.categoryId === categoryId) {
            
            // წავშალოთ ეს პროდუქტი pendingChanges-დან
            setPendingChanges(prevChanges => 
              prevChanges.filter(change => change.productId !== foundProductId)
            );
          } else {
            // შევამოწმოთ არის თუ არა ეს ნამდვილი ცვლილება 
            // თუ პროდუქტის კატეგორია უკვე დაყენებულია ამავე მნიშვნელობაზე, არ დავამატოთ ცვლილება
            if (product?.categoryId === categoryId) {
            } else {
              // დავამატოთ ცვლილება pending changes-ში მხოლოდ თუ რეალური ცვლილებაა
              setPendingChanges(prevChanges => {
                // ჯერ წავშალოთ ნებისმიერი არსებული ცვლილება ამ პროდუქტისთვის
                const filteredChanges = prevChanges.filter(change => change.productId !== foundProductId);
                // შემდეგ დავამატოთ ახალი ცვლილება
                return [
                  ...filteredChanges, 
                  { 
                    imageId: targetImageId, 
                    productId: foundProductId, 
                    categoryId 
                  }
                ];
              });
            }
          }
        }
        
        // კატეგორიების განახლებამდე ვნახოთ არსებული მდგომარეობა

        
        // ვიპოვოთ პროდუქტი
        const currentProduct = products.find(p => p.id === imageData.productId);
        
        // შევამოწმოთ, ხომ არ ბრუნდება ფოტო თავის ორიგინალ კატეგორიაში
        if (currentProduct?.categoryId === categoryId) {
          
          // წავშალოთ ეს პროდუქტი pendingChanges-დან
          setPendingChanges(prevChanges => 
            prevChanges.filter(change => change.productId !== imageData.productId)
          );
        } else {
          // Store pending change - მხოლოდ თუ რეალური ცვლილებაა
          setPendingChanges(prevChanges => {
            // ჯერ წავშალოთ ნებისმიერი არსებული ცვლილება ამ პროდუქტისთვის
            const filteredChanges = prevChanges.filter(change => change.productId !== imageData.productId);
            // შემდეგ დავამატოთ ახალი ცვლილება
            return [
              ...filteredChanges, 
              { 
                imageId: targetImageId, 
                productId: imageData.productId, 
                categoryId 
              }
            ];
          });
        }
        
        // ყოველთვის წავშალოთ სურათი allImages-დან როდესაც კატეგორიაში გადაგვაქვს
        // გამოვიყენოთ targetImageUrl-ც ფილტრაციისთვის, რომ გარანტირებულად ამოვშალოთ
        setAllImages(prevImages => 
          prevImages.filter(img => (img.id !== targetImageId && img.image !== targetImageUrl))
        );
      } else {
        // ეს არის დამატებული ლოგიკა, როდესაც ფოტო მოდის კატეგორიის გარედან (uncategorized)
        
        // მოვძებნოთ პროდუქტის ID (უკვე მოცემულია imageData.productId-ში)
        const productId = imageData.productId;
        
        // მოვძებნოთ პროდუქტი, რომ ვიცოდეთ მისი ორიგინალი categoryId
        const product = products.find(p => p.id === productId);
        
        if (product) {
          // თუ ფოტო უკვე ამ კატეგორიის პროდუქტს ეკუთვნის, ცვლილება არ დაგვჭირდება
          if (product.categoryId === categoryId) {
            return;
          }
          
          // დავამატოთ ცვლილება pending changes-ში
          setPendingChanges(prevChanges => {
            // წავშალოთ ნებისმიერი არსებული ცვლილება ამ პროდუქტისთვის
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
          
          // წავშალოთ სურათი allImages-დან
          setAllImages(prevImages => 
            prevImages.filter(img => (img.id !== targetImageId && img.image !== targetImageUrl))
          );
        }
      }
      
      // განვახორციელოთ UI-ს განახლება კატეგორიებში
      setCategoryImages(prev => {
        // შევქმნათ ახალი ობიექტი, რომ არ შევცვალოთ არსებული
        const newCategoryImages = { ...prev };
        
        
        // 1. წავშალოთ სურათი ყველა კატეგორიიდან
        Object.keys(newCategoryImages).forEach(catId => {
          // შევინახოთ სურათების რაოდენობა წაშლამდე
          const beforeCount = newCategoryImages[catId]?.length || 0;
          
          if (newCategoryImages[catId]) {
            newCategoryImages[catId] = newCategoryImages[catId].filter(img => 
              img.id !== targetImageId && img.image !== targetImageUrl
            );
            
            // შევამოწმოთ შეიცვალა თუ არა რაოდენობა
            const afterCount = newCategoryImages[catId]?.length || 0;
            if (beforeCount !== afterCount) {
            }
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
          newCategoryImages[categoryId] = [
            ...newCategoryImages[categoryId],
            { id: targetImageId, image: targetImageUrl }
          ];
        } else {
        }
        
        return newCategoryImages;
      });
      
      // Don't show notification for individual image drops
    } catch (error) { // Changed error to _error to mark as unused
      console.error('Error handling image drop:', error);
      setUpdateMessage({
        type: 'error',
        text: ''
      });
      
      // Clear error message after 3 seconds
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
        text: 'ყველა ცვლილება შენახულია!'
      });
      
    } catch (error) {
      console.error('Error saving changes:', error);
      setUpdateMessage({
        type: 'error',
        text: 'შეცდომა ცვლილებების შენახვისას'
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
  const filteredCategories = categorySearchTerm.trim() === '' 
    ? categories 
    : categories.filter(cat => 
        cat.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
      );

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
            <div className="flex justify-between items-center border-b p-4 bg-white shadow-sm sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsDistributionModalOpen(false)}
                  className="mr-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  უკან დაბრუნება
                </Button>
                <h2 className="text-xl font-bold">ფოტოების გადანაწილება კატეგორიებში</h2>
              </div>
              
              <Button 
                onClick={saveAllChanges} 
                disabled={!hasPendingChanges || isSaving}
                className={`text-white font-bold px-6 py-2 ${hasPendingChanges ? "bg-green-600 hover:bg-green-700" : "bg-gray-400"}`}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    მიმდინარეობს შენახვა...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    ცვლილებების შენახვა {hasPendingChanges && (
                      <span className="ml-2 px-2 py-0.5 bg-white text-green-700 rounded-full text-sm font-bold">
                        {pendingChanges.length}
                      </span>
                    )}
                  </>
                )}
              </Button>
            </div>
              
            {updateMessage && (
              <div className={`p-3 mx-4 mt-2 rounded sticky top-[76px] z-10 ${
                updateMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {updateMessage.text}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 p-4 overflow-auto flex-1 min-h-0">
              {/* Images Section */}
              <div className="w-full md:w-1/2 flex flex-col min-h-0 max-h-full">
                <div className="flex flex-col gap-2 mb-3 bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">კატეგორიის გარეშე ფოტოები</h3>
                  </div>
                  
                  {/* საძიებო ველი ფოტოებისთვის */}
                  <div className="relative mt-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 pr-3 py-1 w-full text-sm"
                      placeholder="მოძებნეთ ფოტოები პროდუქტის სახელით..."
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
                  <div className="flex items-center mt-2 pl-1">
                    <input
                      type="checkbox"
                      id="discount-filter"
                      checked={showDiscountedOnly}
                      onChange={(e) => setShowDiscountedOnly(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="discount-filter" className="ml-2 text-xs font-medium text-gray-700">
                      მხოლოდ ფასდაკლებული პროდუქტები
                    </label>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-y-auto flex-1 p-4 bg-gray-50 shadow-inner min-h-0 custom-scrollbar hover-show">
                  {/* დავამატოთ drop ზონა კატეგორიიდან გამოსატანად */}
                  {/* ეს ზონა მხოლოდ მაშინ აისახება, როდესაც ფოტოები არსებობს კატეგორიებში */}
                  {Object.values(categoryImages).some(images => images.length > 0) && (
                    <div className="mb-4">
                      <UncategorizedDropZone /> {/* Removed pendingImages prop */}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredAllImages.length === 0 ? (
                      <div className="col-span-full py-8 text-center text-muted-foreground">
                        {imageSearchTerm ? 'ძიების შედეგად ფოტოები ვერ მოიძებნა' : 'კატეგორიის გარეშე ფოტოები არ მოიძებნა'}
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
              
              {/* Categories Section */}
              <div className="w-full md:w-1/2 flex flex-col min-h-0 max-h-full">
                <div className="flex flex-col gap-2 mb-3 bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2">
                    <Grid className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">კატეგორიები</h3>
                    {hasPendingChanges && (
                      <span className="ml-auto text-sm bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                        {pendingChanges.length} შეუნახავი ცვლილება
                      </span>
                    )}
                  </div>
                  
                  {/* საძიებო ველი კატეგორიებისთვის */}
                  <div className="relative mt-1">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 pr-3 py-1 w-full text-sm"
                      placeholder="მოძებნეთ კატეგორიები სახელით..."
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
                  
                  {/* ფასდაკლების ფილტრი კატეგორიებისთვის */}
                  <div className="flex items-center mt-2 pl-1">
                    <input
                      type="checkbox"
                      id="discount-filter-categories"
                      checked={showDiscountedOnly}
                      onChange={(e) => setShowDiscountedOnly(e.target.checked)}
                      className="h-4 w-4 rounded text-primary focus:ring-primary"
                    />
                    <label htmlFor="discount-filter-categories" className="ml-2 text-xs font-medium text-gray-700">
                      მხოლოდ ფასდაკლებული პროდუქტები
                    </label>
                  </div>
                </div>
                
                <div className="border rounded-lg overflow-y-auto flex-1 p-4 bg-gray-50 shadow-inner min-h-0 custom-scrollbar hover-show">
                  <div className="space-y-4">
                    {filteredCategories.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        {categorySearchTerm ? 'ძიების შედეგად კატეგორიები ვერ მოიძებნა' : 'კატეგორიები არ მოიძებნა'}
                      </div>
                    ) : (
                      filteredCategories.map(category => (
                        <CategoryDropZone
                          key={category.id}
                          category={category}
                          pendingImages={categoryImages[category.id] || []}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DndContext>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">კატეგორიების მართვა</h1>
              <p className="text-muted-foreground mt-1">
                ორგანიზება გაუკეთეთ თქვენს პროდუქტებს კატეგორიების დამატებით
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:mt-0">
              <Button
                onClick={() => setIsDistributionModalOpen(true)}
                variant="outline"
                className="bg-primary/10 border-primary text-primary hover:bg-primary/20"
              >
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                ფოტოების გადანაწილება
              </Button>
              <Button
                onClick={() => setIsAdding(true)}
                disabled={isAdding}
              >
                <Plus className="mr-2 h-4 w-4" />
                კატეგორიის დამატება
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

            {isLoading ? (
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