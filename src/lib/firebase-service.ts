import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  DocumentData,
  setDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage, realtimeDb } from './firebase-config';
import { Product, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { batchConvertToWebP } from './image-utils';
import { 
  set as rtdbSet, 
  ref as rtdbRef, 
  get as rtdbGet,
  runTransaction 
} from 'firebase/database';

// Helper function to convert Firebase timestamp to milliseconds
const convertTimestampToMillis = (timestamp: Timestamp) => {
  return timestamp.toMillis();
};

// Settings
export const getSettings = async () => {
  const docRef = doc(db, 'settings', 'siteSettings'); // Assuming a single document for all settings
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    // Return default values or empty object if no settings found
    return { address: '', email: '', phone: '', aboutUsContent: '' }; 
  }
};

export const updateSettings = async (settingsData: any) => {
  const docRef = doc(db, 'settings', 'siteSettings');
  try {
    // Use setDoc with merge: true to create or update the document
    await setDoc(docRef, settingsData, { merge: true });
  } catch (error) {
    console.error("Error updating settings:", error);
    throw error;
  }
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  try {
    const categoriesRef = collection(db, 'categories');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    return categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Category));
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  const docRef = doc(db, 'categories', id);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    createdAt: data.createdAt ? convertTimestampToMillis(data.createdAt) : Date.now(),
    updatedAt: data.updatedAt ? convertTimestampToMillis(data.updatedAt) : Date.now(),
  };
};

export const createCategory = async (name: string): Promise<Category> => {
  const categoriesCollection = collection(db, 'categories');
  const docRef = await addDoc(categoriesCollection, {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  const newCategory = await getCategoryById(docRef.id);
  if (!newCategory) {
    throw new Error('Failed to create category');
  }
  
  return newCategory;
};

export const updateCategory = async (id: string, name: string): Promise<Category> => {
  const docRef = doc(db, 'categories', id);
  await updateDoc(docRef, {
    name,
    updatedAt: serverTimestamp(),
  });
  
  const updatedCategory = await getCategoryById(id);
  if (!updatedCategory) {
    throw new Error('Failed to update category');
  }
  
  return updatedCategory;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'categories', id));
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    const productsSnapshot = await getDocs(productsRef);
    
    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('categoryId', '==', categoryId));
    const productsSnapshot = await getDocs(q);
    
    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Product));
  } catch (error) {
    console.error('Error getting products by category:', error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const productRef = doc(db, 'products', id);
    const productSnapshot = await getDoc(productRef);
    
    if (productSnapshot.exists()) {
      return {
        id: productSnapshot.id,
        ...productSnapshot.data()
      } as Product;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
};

export const createProduct = async (
  productData: {
    name: string;
    description: string;
    price: number;
    images: string[];
    categoryId?: string; 
    stock?: number; // დავამატეთ stock ველი
  }
): Promise<Product> => {
  try {
    const timestamp = Date.now();
    const productRef = collection(db, 'products');
    
    // პროდუქტის მონაცემებიდან ვიღებთ stock-ს
    const { stock, ...productDataWithoutStock } = productData;
    
    const newProduct = {
      ...productDataWithoutStock,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    const docRef = await addDoc(productRef, newProduct);
    
    // თუ მითითებულია მარაგი, Realtime Database-ში ვინახავთ
    if (stock !== undefined) {
      await updateProductStock(docRef.id, stock);
    }
    
    return {
      id: docRef.id,
      ...newProduct
    } as Product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (
  id: string,
  product: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Product> => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    ...product,
    updatedAt: serverTimestamp(),
  });
  
  const updatedProduct = await getProductById(id);
  if (!updatedProduct) {
    throw new Error('Failed to update product');
  }
  
  return updatedProduct;
};

// ფუნქცია სპეციალური პროდუქტების მოსანიშნად
export const markProductAsSpecial = async (id: string, isSpecial: boolean): Promise<Product> => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    isSpecial,
    updatedAt: serverTimestamp(),
  });
  
  const updatedProduct = await getProductById(id);
  if (!updatedProduct) {
    throw new Error('Failed to update product');
  }
  
  return updatedProduct;
};

// ფუნქცია გამორჩეული პროდუქტების მოსანიშნად
export const markProductAsFeatured = async (id: string, isFeatured: boolean): Promise<Product> => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    isFeatured,
    updatedAt: serverTimestamp(),
  });
  
  const updatedProduct = await getProductById(id);
  if (!updatedProduct) {
    throw new Error('Failed to update product');
  }
  
  return updatedProduct;
};

// ფუნქცია ახალი კოლექციის პროდუქტების მოსანიშნად
export const markProductAsNewCollection = async (id: string, isNewCollection: boolean): Promise<Product> => {
  const docRef = doc(db, 'products', id);
  await updateDoc(docRef, {
    isNewCollection,
    updatedAt: serverTimestamp(),
  });
  
  const updatedProduct = await getProductById(id);
  if (!updatedProduct) {
    throw new Error('Failed to update product');
  }
  
  return updatedProduct;
};

export const deleteProduct = async (id: string): Promise<void> => {
  // First get the product to delete its images
  const product = await getProductById(id);
  if (product && product.images && product.images.length > 0) {
    // Delete all associated images
    await Promise.all(
      product.images.map(async (imageUrl) => {
        try {
          // Extract the path from the URL
          const imagePath = decodeURIComponent(imageUrl.split('?')[0].split('/o/')[1]);
          const imageRef = ref(storage, imagePath);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      })
    );
  }
  
  // Then delete the product document
  await deleteDoc(doc(db, 'products', id));
};

// Image uploads
export const uploadProductImage = async (
  file: File,
  productId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        reject(new Error('No file provided'));
        return;
      }

      // Check file size - ვიყენებთ MAX_FILE_SIZE კონსტანტას
      if (file.size > MAX_FILE_SIZE) {
        reject(new Error(`File size exceeds 5MB limit: ${(file.size / (1024 * 1024)).toFixed(2)}MB`));
        return;
      }
      
      // Create a unique filename with UUID
      const uniqueId = uuidv4();
      const storageRef = ref(storage, `images/${uniqueId}-${file.name}`);
      
      
      // Start the upload task
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Calculate and report progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            // Upload completed successfully, get the download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (urlError) {
            console.error('Error getting download URL:', urlError);
            reject(urlError);
          }
        }
      );
    } catch (initError) {
      console.error('Error initializing upload:', initError);
      reject(initError);
    }
  });
};

// User roles management
export const getUserRole = async (email: string): Promise<{isAdmin: boolean}> => {
  try {
    const userRolesRef = collection(db, 'userRoles');
    const q = query(userRolesRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // User not found in roles collection, add them with default role
      await addDoc(userRolesRef, {
        email,
        isAdmin: false,
        createdAt: serverTimestamp()
      });
      return { isAdmin: false };
    }
    
    // Return the user's role
    return querySnapshot.docs[0].data() as {isAdmin: boolean};
  } catch (error) {
    console.error('Error getting user role:', error);
    return { isAdmin: false };
  }
};

export const getAllUsers = async (): Promise<Array<{id: string, email: string, isAdmin: boolean, createdAt: number}>> => {
  try {
    const userRolesRef = collection(db, 'userRoles');
    const userRolesSnapshot = await getDocs(userRolesRef);
    
    return userRolesSnapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      isAdmin: doc.data().isAdmin,
      createdAt: doc.data().createdAt ? convertTimestampToMillis(doc.data().createdAt) : Date.now()
    }));
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const updateUserRole = async (userId: string, isAdmin: boolean): Promise<void> => {
  try {
    const userRoleRef = doc(db, 'userRoles', userId);
    await updateDoc(userRoleRef, {
      isAdmin,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

/**
 * Get product images with pagination
 * @param productId The ID of the product to get images for
 * @param startIndex The index to start getting images from (default: 0)
 * @param limit The maximum number of images to get (default: 10)
 * @returns Promise with array of image URLs
 */
export const getPaginatedProductImages = async (
  productId: string,
  startIndex: number = 0,
  limit: number = 10
): Promise<{images: string[], totalCount: number}> => {
  try {
    const productRef = doc(db, 'products', productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      return {images: [], totalCount: 0};
    }
    
    const productData = productSnap.data();
    const allImages = productData.images || [];
    const totalCount = allImages.length;
    
    // Return paginated results
    const paginatedImages = allImages.slice(startIndex, startIndex + limit);
    
    return {
      images: paginatedImages,
      totalCount
    };
  } catch (error) {
    console.error('Error getting paginated product images:', error);
    return {images: [], totalCount: 0};
  }
};

// ლიმიტის კონსტანტები
// MAX_IMAGES - მაქსიმალური ფოტოების რაოდენობა, რაც შეიძლება აიტვირთოს პროდუქტზე
// MAX_DISPLAY_IMAGES - მაქსიმალური ფოტოების რაოდენობა, რაც ერთ პაკეტად ჩაიტვირთება გამოსახვისას
// MAX_FILE_SIZE - ერთი ფაილის მაქსიმალური ზომა ბაიტებში
export const MAX_IMAGES = 10; // 100 -> 10 (ერთ პროდუქტზე მაქსიმუმ 10 ფოტოა საჭირო)
export const MAX_DISPLAY_IMAGES = 10; // ერთ ჯერზე ჩვენებისთვის
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB ლიმიტი თითო ფაილისთვის

/**
 * Upload multiple images to Firebase Storage with WebP conversion
 * @param files Array of files to upload
 * @param progressCallback Optional callback to track upload progress for each file
 * @returns Promise with array of download URLs
 */
export const uploadImagesToFirebase = async (
  files: File[], 
  progressCallback?: (index: number, progress: number) => void
): Promise<string[]> => {
  if (!files.length) return [];
  
  try {
    // ლიმიტის დაწესება - მაქსიმუმ 20 ფოტო (ეს ლიმიტი რჩება ატვირთვისთვის)
    if (files.length > MAX_IMAGES) {
      throw new Error(`ფოტოების რაოდენობა არ უნდა აღემატებოდეს ${MAX_IMAGES}-ს. გთხოვთ აირჩიოთ ნაკლები ფოტო.`);
    }
    
    // Convert all images to WebP format for better performance
    const webpFiles = await batchConvertToWebP(files, 0.8);
    
    const uploadPromises = webpFiles.map((file, index) => {
      return new Promise<string>((resolve, reject) => {
        // Generate a unique filename
        const filename = `${uuidv4()}.webp`;
        const storageRef = ref(storage, `images/${filename}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (progressCallback) {
              progressCallback(index, progress);
            }
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    });
    
    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error in uploadImagesToFirebase:', error);
    throw error;
  }
};

// ახალი ფუნქცია საჯარო და ფარული ფასდაკლებების დასამატებლად
export const addDiscountToProduct = async (
  productId: string, 
  discountPercentage: number, 
  isPublic: boolean, 
  promoCode?: string
) => {
  try {
    const discountId = promoCode || `discount_${productId}_${Date.now()}`;
    
    // მოძებნა პროდუქტის 
    const productRef = doc(db, 'products', productId);
    const productSnapshot = await getDoc(productRef);
    
    if (!productSnapshot.exists()) {
      throw new Error('პროდუქტი ვერ მოიძებნა');
    }
    
    // პროდუქტისთვის განსახვავებული განახლება ფასდაკლების ტიპის მიხედვით
    if (isPublic) {
      // საჯარო ფასდაკლებისთვის
      await updateDoc(productRef, {
        discountPercentage: discountPercentage,
        hasPublicDiscount: true,
        promoActive: true,
        updatedAt: Date.now()
      });
    } else {
      // პრომოკოდისთვის
      await updateDoc(productRef, {
        promoCode: promoCode,
        discountPercentage: discountPercentage,
        promoActive: true,
        updatedAt: Date.now()
      });
    }
    
    // ფასდაკლების შენახვა ფასდაკლებების კოლექციაში
    const discountRef = doc(db, 'discounts', discountId);
    await setDoc(discountRef, {
      id: discountId,
      productId: productId,
      discountPercentage: discountPercentage,
      active: true,
      isPublic: isPublic,
      promoCode: isPublic ? null : promoCode,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    
    return true;
  } catch (error) {
    console.error('შეცდომა ფასდაკლების დამატებისას:', error);
    throw error;
  }
};

// პრომოკოდის დამატება პროდუქტზე (დაეფუძნება ახალ ფუნქციას)
export const addPromoCodeToProduct = async (productId: string, promoCode: string, discountPercentage: number) => {
  return addDiscountToProduct(productId, discountPercentage, false, promoCode);
};

// საჯარო ფასდაკლების დამატება
export const addPublicDiscountToProduct = async (productId: string, discountPercentage: number) => {
  return addDiscountToProduct(productId, discountPercentage, true);
};

// ფასდაკლების დეაქტივაცია (უნივერსალური)
export const deactivateDiscount = async (discountId: string) => {
  try {
    // ნახოს ფასდაკლება
    const discountRef = doc(db, 'discounts', discountId);
    const discountSnap = await getDoc(discountRef);
    
    if (!discountSnap.exists()) {
      throw new Error('ფასდაკლება ვერ მოიძებნა');
    }
    
    const discountData = discountSnap.data() as any;
    const productId = discountData.productId;
    
    // პირველად განაახლოს ფასდაკლების დოკუმენტი
    await updateDoc(discountRef, {
      active: false,
      updatedAt: Date.now()
    });
    
    // შემდეგ განაახლოს პროდუქტის მდგომარეობა
    const productRef = doc(db, 'products', productId);
    
    if (discountData.isPublic) {
      // თუ საჯარო ფასდაკლებაა
      await updateDoc(productRef, {
        hasPublicDiscount: false,
        promoActive: false,
        updatedAt: Date.now()
      });
    } else {
      // თუ პრომოკოდია
      await updateDoc(productRef, {
        promoActive: false,
        updatedAt: Date.now()
      });
    }
    
    return true;
  } catch (error) {
    console.error('შეცდომა ფასდაკლების დეაქტივაციისას:', error);
    throw error;
  }
};

// პრომოკოდის დეაქტივაცია (ძველი მეთოდის ხიდი)
export const deactivatePromoCode = async (promoCode: string) => {
  return deactivateDiscount(promoCode);
};

// ფასდაკლებების მიღება
export const getDiscounts = async () => {
  try {
    const discountsRef = collection(db, 'discounts');
    const discountsSnapshot = await getDocs(discountsRef);
    const discounts: any[] = [];
    
    discountsSnapshot.forEach((doc) => {
      discounts.push({
        ...doc.data(),
        id: doc.id
      });
    });
    
    return discounts;
  } catch (error) {
    console.error('შეცდომა ფასდაკლებების მიღებისას:', error);
    throw error;
  }
};

// პრომოკოდების მიღება (მხოლოდ აქტიური პრომოკოდები, არა საჯარო ფასდაკლებები)
export const getPromoCodes = async () => {
  try {
    const promosRef = collection(db, 'discounts');
    const q = query(
      promosRef, 
      where('isPublic', '==', false),  // მხოლოდ პრივატული პრომოკოდები
      where('active', '==', true)      // მხოლოდ აქტიური პრომოკოდები
    );
    
    const querySnapshot = await getDocs(q);
    const promoCodes: any[] = [];
    
    for (const docItem of querySnapshot.docs) {
      const promoData = docItem.data();
      
      // პროდუქტის ინფორმაციის მიღება
      const productRef = doc(db, 'products', promoData.productId);
      const productSnapshot = await getDoc(productRef);
      
      if (productSnapshot.exists()) {
        const productData = productSnapshot.data();
        promoCodes.push({
          ...promoData,
          id: docItem.id,
          productName: productData.name,
          productImage: productData.images?.[0] || '',
          productPrice: productData.price
        });
      }
    }
    
    return promoCodes;
  } catch (error) {
    console.error('შეცდომა პრომოკოდების მიღებისას:', error);
    throw error;
  }
};

// საჯარო ფასდაკლებების მიღება (მხოლოდ აქტიური საჯარო ფასდაკლებები)
export const getPublicDiscounts = async () => {
  try {
    const discountsRef = collection(db, 'discounts');
    const q = query(
      discountsRef, 
      where('isPublic', '==', true),  // მხოლოდ საჯარო ფასდაკლებები
      where('active', '==', true)     // მხოლოდ აქტიური ფასდაკლებები
    );
    
    const querySnapshot = await getDocs(q);
    const publicDiscounts: any[] = [];
    
    for (const docItem of querySnapshot.docs) {
      const discountData = docItem.data();
      
      // პროდუქტის ინფორმაციის მიღება
      const productRef = doc(db, 'products', discountData.productId);
      const productSnapshot = await getDoc(productRef);
      
      if (productSnapshot.exists()) {
        const productData = productSnapshot.data();
        publicDiscounts.push({
          ...discountData,
          id: docItem.id,
          productName: productData.name,
          productImage: productData.images?.[0] || '',
          productPrice: productData.price
        });
      }
    }
    
    return publicDiscounts;
  } catch (error) {
    console.error('შეცდომა საჯარო ფასდაკლებების მიღებისას:', error);
    throw error;
  }
};

// მარაგის ოპერაციები Realtime Database-ზე

// მარაგის დამატება/განახლება
export const updateProductStock = async (productId: string, stockCount: number): Promise<void> => {
  try {
    const stockRef = rtdbRef(realtimeDb, `stock/${productId}`);
    await rtdbSet(stockRef, stockCount);
  } catch (error) {
    console.error('Error updating product stock:', error);
    throw error;
  }
};

// მარაგის შემოწმება
export const getProductStock = async (productId: string): Promise<number> => {
  try {
    const stockRef = rtdbRef(realtimeDb, `stock/${productId}`);
    const snapshot = await rtdbGet(stockRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return 0; // თუ არ არსებობს, ვაბრუნებთ 0
  } catch (error) {
    console.error('Error getting product stock:', error);
    return 0;
  }
};

// მარაგის შემცირება ყიდვისას (transaction-ით)
export const decrementStock = async (productId: string): Promise<boolean> => {
  try {
    const stockRef = rtdbRef(realtimeDb, `stock/${productId}`);
    
    const result = await runTransaction(stockRef, (currentStock) => {
      // თუ მარაგი არ არსებობს
      if (currentStock === null) {
        return 0;
      }
      
      // თუ მარაგი 0-ზე მეტია, შევამციროთ
      if (currentStock > 0) {
        return currentStock - 1;
      } else {
        // მარაგი ამოწურულია, არ ვცვლით
        return;
      }
    });
    
    // transaction შედეგის შემოწმება
    if (result.committed) {
      return true; // წარმატებით შემცირდა მარაგი
    } else {
      return false; // მარაგი ამოწურულია ან სხვა შეცდომა
    }
  } catch (error) {
    console.error('Error decrementing product stock:', error);
    throw error;
  }
}; 