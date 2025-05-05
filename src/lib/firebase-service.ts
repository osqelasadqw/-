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

// დებაგინგის ინსტრუმენტები
const DEBUG_MODE = false; // შეგიძლიათ გადართოთ false-ზე პროდაქშენში

// კეშირების სისტემა ფაირბეისის მოთხოვნების შესამცირებლად
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 წუთი
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

// ქეშის სისტემა
const cache: Record<string, CacheItem<any>> = {};

// ქეშისთვის ფუნქცია
function getFromCacheOrFetch<T>(
  cacheKey: string, 
  fetchFn: () => Promise<T>, 
  expiry: number = CACHE_EXPIRY_MS
): Promise<T> {
  const cachedItem = cache[cacheKey];
  const now = Date.now();
  
  // თუ ქეშში არსებობს და არ არის ვადაგასული
  if (cachedItem && (now - cachedItem.timestamp) < expiry) {
    console.log(`[Cache hit] ${cacheKey}`);
    return Promise.resolve(cachedItem.data);
  }
  
  // თუ ქეშში არ არის ან ვადაგასულია
  return fetchFn().then(data => {
    cache[cacheKey] = {
      data,
      timestamp: now
    };
    console.log(`[Cache miss] ${cacheKey}`);
    return data;
  });
}

/**
 * დეტალური დებაგინგის ფუნქცია Firebase ოპერაციებისთვის
 * @param operation - ოპერაციის სახელი 
 * @param message - ძირითადი შეტყობინება
 * @param data - დამატებითი მონაცემები (არასავალდებულო)
 */
export const debugFirebase = (operation: string, message: string, data?: any) => {
  if (!DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString();
  
  console.group(`🔥 Firebase Debug [${timestamp}] - ${operation}`);
  console.log(`📌 ${message}`);
  
  if (data) {
    console.log('📊 Data:', typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  }
  
  // შედეგების დაკავშირება ბრაუზერის კონსოლში
  console.groupEnd();
};

/**
 * შეცდომების დეტალური ლოგირება Firebase-ისთვის
 * @param operation - ოპერაციის სახელი
 * @param error - Firebase-ის ან სხვა შეცდომის ობიექტი 
 */
export const logFirebaseError = (operation: string, error: any) => {
  console.group(`❌ Firebase Error [${new Date().toISOString()}] - ${operation}`);
  console.error('Error object:', error);
  
  // დეტალების გამოტანა
  const details = {
    name: error?.name || 'Unknown',
    code: error?.code || 'No code',
    message: error?.message || 'No message',
    stack: error?.stack || 'No stack trace',
    customData: error?.customData || 'No custom data',
    serverResponse: error?.serverResponse || 'No server response'
  };
  
  console.table(details);
  console.groupEnd();
  
  return details; // შეცდომის დეტალების დაბრუნება შემდგომი დამუშავებისთვის
};

/**
 * გააქტიურეთ ეს ფუნქცია, რომ დაიჭიროთ ყველა Firestore HTTP მოთხოვნა
 * შენიშვნა: მხოლოდ დებაგისთვის გამოიყენეთ, შეამცირებს წარმადობას
 */
export const monitorFirestoreRequests = () => {
  if (!DEBUG_MODE || typeof window === 'undefined') return;
  
  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    
    // თუ Firestore-ის მოთხოვნაა და ეხება settings-ს, მხოლოდ მაშინ დავალოგოთ
    if (url && url.includes('firestore.googleapis.com')) {
      // ვამოწმებთ არის თუ არა ეს settings-ის განახლების მოთხოვნა
      const isSettingsOperation = init?.body && typeof init.body === 'string' && 
                                 (init.body.includes('settings/siteSettings') || 
                                  init.body.includes('siteSettings'));
      
      // მხოლოდ მნიშვნელოვანი ოპერაციები დავალოგოთ
      const isWriteOperation = init?.method === 'POST' && url.includes('/Write/');
      const isErrorStatus = false; // ეს შეიცვლება Response-ის მიღების შემდეგ
      
      // დავალოგოთ მხოლოდ მნიშვნელოვანი ოპერაციები (settings-თან დაკავშირებული ან Write)
      const shouldLog = isSettingsOperation || (isWriteOperation && init?.body && typeof init.body === 'string' && init.body.length > 100);
      
      if (shouldLog) {
        console.group(`🔄 Firebase ${isSettingsOperation ? 'Settings' : 'Write'} Request [${new Date().toISOString()}]`);
        console.log(`URL: ${url.substring(0, 100)}...`);
        console.log('Method:', init?.method || 'GET');
        
        // ბოდის მოკლე ვერსია, რომ არ გადაივსოს კონსოლი
        if (init?.body) {
          try {
            const bodyText = init.body.toString();
            const shortBody = bodyText.length > 200 ? bodyText.substring(0, 200) + '...' : bodyText;
            console.log('Request Body (preview):', shortBody);
          } catch (e) {
            console.log('Request Body: [Could not stringify body]');
          }
        }
      }
      
      return originalFetch(input, init)
        .then(response => {
          const duration = Date.now() - startTime;
          const hasError = !response.ok;
          
          // თუ შეცდომაა, ყოველთვის დავალოგოთ
          if (shouldLog || hasError) {
            console.log(`Response Status: ${response.status} ${response.statusText}`);
            console.log(`Duration: ${duration}ms`);
            
            // კოპირება იმედი რომ შევინარჩუნოთ response ობიექტი
            const clonedResponse = response.clone();
            
            // ვცდილობთ წავიკითხოთ პასუხი, თუ შესაძლებელია
            clonedResponse.text()
              .then(text => {
                try {
                  // მხოლოდ შეცდომები ან უჩვეულო პასუხები დავალოგოთ სრულად
                  if (hasError || text.includes('error') || text.includes('Error')) {
                    console.log('Response Body (preview):', text.substring(0, 500) + (text.length > 500 ? '...' : ''));
                  } else {
                    console.log('Response received successfully:', text.length, 'bytes');
                  }
                } catch (e) {
                  console.log('Could not read response body');
                }
                console.groupEnd();
              })
              .catch(() => {
                console.log('Could not read response body (stream already consumed)');
                console.groupEnd();
              });
          }
          
          return response;
        })
        .catch(error => {
          const duration = Date.now() - startTime;
          // შეცდომები ყოველთვის დავალოგოთ
          console.group(`❌ Firebase Request Error [${new Date().toISOString()}]`);
          console.error(`Error: ${error?.message || 'Unknown error'}`);
          console.log(`URL: ${url.substring(0, 100)}...`);
          console.log(`Duration: ${duration}ms`);
          console.groupEnd();
          throw error;
        });
    }
    
    // არა-Firestore მოთხოვნებს ვაგრძელებთ ჩვეულებრივად
    return originalFetch(input, init);
  };
  
  console.log('🔍 Firebase მონიტორინგი გააქტიურდა - მხოლოდ მნიშვნელოვანი მოთხოვნები აისახება.');
  
  return () => {
    // ფუნქცია მონიტორინგის გასათიშად
    window.fetch = originalFetch;
    console.log('🛑 Firebase HTTP მონიტორინგი გაითიშა.');
  };
};

// Helper function to convert Firebase timestamp to milliseconds
const convertTimestampToMillis = (timestamp: Timestamp) => {
  return timestamp.toMillis();
};

// Settings
export const getSettings = async () => {
  if (!db) {
    console.error("Firebase Firestore is not initialized");
    throw new Error("Firebase Firestore მონაცემთა ბაზა არ არის ინიციალიზებული");
  }
  
  try {
    const docRef = doc(db, 'settings', 'siteSettings'); // Assuming a single document for all settings
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return default values or empty object if no settings found
      return { address: '', email: '', phone: '', aboutUsContent: '' }; 
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
    throw new Error("პარამეტრების ჩატვირთვა ვერ მოხერხდა");
  }
};

export const updateSettings = async (settingsData: any) => {
  debugFirebase('updateSettings', 'Starting updateSettings function', { data: settingsData });
  
  if (!db) {
    const error = new Error("Firebase Firestore მონაცემთა ბაზა არ არის ინიციალიზებული");
    logFirebaseError('updateSettings', error);
    throw error;
  }
  
  if (!settingsData) {
    const error = new Error("პარამეტრების მონაცემები არ არის მითითებული");
    logFirebaseError('updateSettings', error);
    throw error;
  }
  
  // დავრწმუნდეთ, რომ ყველა მონაცემი ტექსტურ ფორმატშია
  const formattedData: Record<string, string> = {};
  
  // გადავიაროთ ყველა ველზე და გადავაკონვერტიროთ ტექსტურ ფორმატში
  Object.keys(settingsData).forEach(key => {
    // გამოვტოვოთ undefined და null მნიშვნელობები
    if (settingsData[key] === undefined || settingsData[key] === null) {
      return;
    }
    
    // ყველა მნიშვნელობა გადავიყვანოთ სტრინგად
    formattedData[key] = String(settingsData[key]);
  });
  
  console.group("🔍 Settings Update - Detailed Debug");
  console.log("Original settings data:", settingsData);
  console.log("Formatted settings data (all strings):", formattedData);
  console.log("Settings keys:", Object.keys(formattedData));
  console.log("Settings values:", Object.values(formattedData));
  console.groupEnd();
  
  const docRef = doc(db, 'settings', 'siteSettings');
  
  // ვიზუალების ინფორმაცია სესიის გასაგებად
  console.log("Firebase session info - docRef path:", docRef.path);
  console.log("Firebase DB instance ID:", (db as any)._databaseId?.projectId || "unknown");
  
  // დამატებითი დიაგნოსტიკა Firestore კავშირისთვის
  debugFirebase('updateSettings', 'Checking Firestore connection', {
    docRefPath: docRef.path,
    firestoreInstance: Boolean(db),
    appName: (db as any)._appName || 'default',
    settingsKeys: Object.keys(formattedData)
  });
  
  // მაქსიმალური მცდელობების რაოდენობა
  const MAX_RETRIES = 3;
  let currentRetry = 0;
  let lastError = null;
  
  while (currentRetry < MAX_RETRIES) {
    try {
      console.group(`🔄 Settings Update - Attempt #${currentRetry + 1}`);
      console.log(`Starting attempt #${currentRetry + 1} for updating settings`);
      console.log(`Attempt strategy: ${currentRetry === 0 ? 'setDoc with merge' : 
                 currentRetry === 1 ? 'updateDoc' : 'setDoc without merge'}`);
      console.log(`Current timestamp: ${new Date().toISOString()}`);
      
      debugFirebase('updateSettings', `Attempt #${currentRetry + 1} started`, {
        strategy: currentRetry === 0 ? 'setDoc with merge' : 
                 currentRetry === 1 ? 'updateDoc' : 'setDoc without merge'
      });
      
      // setDoc ნაცვლად updateDoc-ს ვცდით, თუ პირველი არ იმუშავებს
      // პირველ ეტაპზე ვცადოთ setDoc merge: true პარამეტრით
      if (currentRetry === 0) {
        console.log("Attempt #1: Using setDoc with merge: true");
        console.time("setDoc_with_merge_execution_time");
        await setDoc(docRef, formattedData, { merge: true });
        console.timeEnd("setDoc_with_merge_execution_time");
      } 
      // მეორე ეტაპზე ვცადოთ updateDoc
      else if (currentRetry === 1) {
        console.log("Attempt #2: Using updateDoc");
        console.time("updateDoc_execution_time");
        await updateDoc(docRef, formattedData);
        console.timeEnd("updateDoc_execution_time");
      } 
      // მესამე ეტაპზე ვცადოთ setDoc ახალი დოკუმენტის შექმნით
      else {
        console.log("Attempt #3: Using setDoc without merge");
        console.time("setDoc_without_merge_execution_time");
        await setDoc(docRef, {
          ...formattedData,
          updatedAt: new Date().toISOString()
        });
        console.timeEnd("setDoc_without_merge_execution_time");
      }
      
      console.log("Settings updated successfully on attempt #", currentRetry + 1);
      console.log("Final settings data:", formattedData);
      console.groupEnd();
      
      debugFirebase('updateSettings', `Success on attempt #${currentRetry + 1}`, { settingsData: formattedData });
      
      // წარმატებული განახლება
      return { success: true, data: formattedData };
    } catch (error) {
      lastError = error;
      console.error(`Error updating settings (attempt ${currentRetry + 1}):`, error);
      
      // დებაგინგის ფუნქციის გამოძახება შეცდომის დასალოგად
      logFirebaseError(`updateSettings (attempt ${currentRetry + 1})`, error);
      
      // დამატებითი დებაგინგი შეცდომის შესახებ
      console.group(`❌ Settings Update Error - Attempt #${currentRetry + 1}`);
      console.log("Error details:");
      console.log("- Error name:", (error as any).name);
      console.log("- Error code:", (error as any).code);
      console.log("- Error message:", (error as any).message);
      console.log("- Firebase context:", (error as any).customData?.context || "No context");
      console.log("- Error stack:", (error as any).stack);
      console.log("- Network details:", {
        online: typeof navigator !== 'undefined' ? navigator.onLine : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      });
      console.groupEnd();
      
      currentRetry++;
      
      // მცირე დაყოვნება მცდელობებს შორის
      if (currentRetry < MAX_RETRIES) {
        const delay = 1000 * currentRetry; // პროგრესული დაყოვნება
        console.log(`Waiting ${delay}ms before next attempt...`);
        debugFirebase('updateSettings', `Retrying after delay`, { 
          retryNumber: currentRetry, 
          delayMs: delay,
          nextStrategy: currentRetry === 1 ? 'updateDoc' : 'setDoc without merge'
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // ყველა მცდელობა წარუმატებელი იყო
  console.group("❌ Settings Update - All Attempts Failed");
  console.error("All attempts to update settings failed. Last error:", lastError);
  
  // შეცდომის უფრო დეტალური ლოგი საბოლოო შეცდომისთვის
  if (lastError) {
    console.error("Final error details:", {
      name: (lastError as any).name,
      code: (lastError as any).code,
      message: (lastError as any).message,
      serverResponse: (lastError as any).serverResponse || "No server response",
      customData: (lastError as any).customData || "No custom data"
    });
    
    // ყველა მცდელობა დასრულდა - დეტალური დებაგის ინფო
    debugFirebase('updateSettings', 'All attempts failed', {
      attempts: MAX_RETRIES,
      lastError: {
        name: (lastError as any).name,
        code: (lastError as any).code,
        message: (lastError as any).message
      }
    });
  }
  console.groupEnd();
  
  throw lastError || new Error("პარამეტრების განახლება ვერ მოხერხდა");
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
  return getFromCacheOrFetch('all-products', async () => {
  try {
      const productsSnapshot = await getDocs(collection(db, 'products'));
    return productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
      }) as Product);
  } catch (error) {
      logFirebaseError('getProducts', error);
    return [];
  }
  });
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  return getFromCacheOrFetch(`products-by-category-${categoryId}`, async () => {
  try {
      const q = query(
        collection(db, 'products'),
        where('categoryId', '==', categoryId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
      }) as Product);
  } catch (error) {
      logFirebaseError('getProductsByCategory', error);
    return [];
  }
  });
};

export const getProductById = async (id: string): Promise<Product | null> => {
  return getFromCacheOrFetch(`product-${id}`, async () => {
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
  });
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
 * @param gridColumns The number of columns to use for pagination (default: 2)
 * @returns Promise with array of image URLs
 */
export const getPaginatedProductImages = async (
  productId: string,
  startIndex: number = 0,
  limit: number = 10
): Promise<{images: string[], totalCount: number}> => {
  return getFromCacheOrFetch(`product-images-${productId}-${startIndex}-${limit}`, async () => {
    // დავიჭიროთ პროდუქტი ქეშიდან, რადგან სავარაუდოდ უკვე იქნება ჩატვირთული
    const product = await getProductById(productId);
    
    if (!product || !product.images) {
      return { images: [], totalCount: 0 };
    }
    
    // ლიმიტირებული სურათები
    const paginatedImages = product.images.slice(startIndex, startIndex + limit);
    
    return {
      images: paginatedImages,
      totalCount: product.images.length
    };
  }, 10 * 60 * 1000); // 10 წუთი ქეშირება სურათებისთვის
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
  if (!productId) {
    console.error('getProductStock: productId is undefined or empty');
    return 0;
  }
  
  if (!realtimeDb) {
    console.error('getProductStock: realtimeDb is not initialized');
    return 0;
  }
  
  try {
    const stockRef = rtdbRef(realtimeDb, `stock/${productId}`);
    const snapshot = await rtdbGet(stockRef);
    
    if (snapshot.exists()) {
      const stockValue = snapshot.val();
      // უბრუნებს მხოლოდ რიცხვით მნიშვნელობას ან 0
      return typeof stockValue === 'number' ? stockValue : 0;
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