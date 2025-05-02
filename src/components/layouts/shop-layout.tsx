'use client';

import React, { useState, useEffect, useCallback, Suspense, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CategoryDropdown } from '@/components/shop/category-dropdown';
import { Category } from '@/types';
import { getCategories, getUserRole, getSettings } from '@/lib/firebase-service';
import { Menu, X, ShoppingBag, User, LogOut, LayoutDashboard, Search } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { auth } from '@/lib/firebase-config';
import { signInWithGoogle, signOut } from '@/lib/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import SearchResults from '@/components/shop/search-results';

interface ShopLayoutProps {
  children: React.ReactNode;
}

interface SiteSettings {
  address?: string;
  email?: string;
  phone?: string;
  aboutUsContent?: string;
}

// ცალკე კომპონენტი სურათებისთვის - მემოიზებული
const OptimizedImage = memo(({src, alt, width, height, className}: {src: string, alt: string, width: number, height: number, className?: string}) => {
  return (
    <div className="image-container">
      <Image 
        src={src} 
        alt={alt} 
        width={width}
        height={height}
        className={className}
        loading="lazy"
        placeholder="blur"
        blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEIQH/lZGLmAAAAABJRU5ErkJggg=="
      />
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ცალკე კომპონენტი, რომელიც იყენებს useSearchParams
const SearchSection = memo(({ 
  searchTerm, 
  setSearchTerm, 
  showSearchResults, 
  setShowSearchResults, 
  handleSearchSubmit 
}: { 
  searchTerm: string; 
  setSearchTerm: (term: string) => void; 
  showSearchResults: boolean; 
  setShowSearchResults: (show: boolean) => void; 
  handleSearchSubmit: (e: React.FormEvent) => void; 
}) => {
  const searchParams = useSearchParams();

  // ჩატვირთვისას დავაყენოთ searchTerm URL-დან
  useEffect(() => {
    const query = searchParams?.get('search') || '';
    setSearchTerm(query);
  }, [searchParams, setSearchTerm]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // თუ საკმარისი სიმბოლოებია, ავტომატურად გახსნას შედეგები
    if (value.trim().length >= 2) {
      setShowSearchResults(true);
    } else if (value.trim().length === 0) {
      setShowSearchResults(false);
    }
  };

  const handleSearchFocus = () => {
    if (searchTerm.trim().length >= 2) {
      setShowSearchResults(true);
    }
  };

  const handleCloseSearch = () => {
    setShowSearchResults(false);
  };

  return (
    <div className="relative w-full max-w-lg">
      <form onSubmit={handleSearchSubmit} className="flex items-center w-full">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="პროდუქტის ძიება..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={handleSearchInputChange}
            onFocus={handleSearchFocus}
          />
        </div>
      </form>
      <SearchResults 
        searchTerm={searchTerm} 
        onClose={handleCloseSearch} 
        isOpen={showSearchResults}
      />
    </div>
  );
});

SearchSection.displayName = 'SearchSection';

// ცალკე კომპონენტი, რომელიც იყენებს useSearchParams - მობილური ვერსიისთვის
const MobileSearchSection = memo(({ 
  searchTerm, 
  setSearchTerm, 
  showSearchResults, 
  setShowSearchResults 
}: { 
  searchTerm: string; 
  setSearchTerm: (term: string) => void; 
  showSearchResults: boolean; 
  setShowSearchResults: (show: boolean) => void; 
}) => {
  const searchParams = useSearchParams();

  // ჩატვირთვისას დავაყენოთ searchTerm URL-დან
  useEffect(() => {
    const query = searchParams?.get('search') || '';
    setSearchTerm(query);
  }, [searchParams, setSearchTerm]);

  return (
    <div className="relative w-full">
      <form className="flex items-center w-full">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="პროდუქტის ძიება..."
            className="pl-9 w-full py-1.5 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSearchResults(true)}
          />
        </div>
      </form>
      <SearchResults 
        searchTerm={searchTerm} 
        onClose={() => setShowSearchResults(false)} 
        isOpen={showSearchResults}
      />
    </div>
  );
});

MobileSearchSection.displayName = 'MobileSearchSection';

// ფუტერის კომპონენტი - მემოიზებული წარმადობისთვის
const FooterSection = memo(({ settings }: { settings: any }) => {
  const emailInputId = React.useId();
  const subscribeButtonId = React.useId();
  const year = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-800 text-gray-200 pt-12 pb-8">
      <div className="container mx-auto px-4">
        {/* გადმოტანილი კოდი */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; {year} OnLyne Store. ყველა უფლება დაცულია.
            </div>
            <div className="flex space-x-4">
              {/* ოპტიმიზებული სურათები */}
              <div className="w-8 h-8">
                <OptimizedImage 
                  src="https://cdn-icons-png.flaticon.com/128/196/196578.png" 
                  alt="Visa" 
                  width={32} 
                  height={32} 
                  className="grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all" 
                />
              </div>
              <div className="w-8 h-8">
                <OptimizedImage 
                  src="https://cdn-icons-png.flaticon.com/128/196/196561.png" 
                  alt="MasterCard" 
                  width={32} 
                  height={32} 
                  className="grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all" 
                />
              </div>
              <div className="w-8 h-8">
                <OptimizedImage 
                  src="https://cdn-icons-png.flaticon.com/128/5968/5968299.png" 
                  alt="PayPal" 
                  width={32} 
                  height={32} 
                  className="grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
});

FooterSection.displayName = 'FooterSection';

export function ShopLayout({ children }: ShopLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({});
  
  const emailInputId = React.useId();
  const subscribeButtonId = React.useId();

  const navItems = [
    { href: '/shop', label: 'მთავარი' },
    { href: '/shop/categories', label: 'კატეგორიები' },
    { href: '/shop/about', label: 'ჩვენს შესახებ' },
    { href: '/shop/promo-checker', label: 'პრომოკოდები' },
  ];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const fetchedSettings = await getSettings();
        if (fetchedSettings) {
          setSettings(fetchedSettings as SiteSettings);
        }
      } catch (error) {
        console.error("Error loading settings in layout:", error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      // Check if user is admin in Firestore
      if (currentUser && currentUser.email) {
        try {
          const { isAdmin: hasAdminRole } = await getUserRole(currentUser.email);
          setIsAdmin(hasAdminRole);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault(); 
    // Maybe navigate to a dedicated search page if needed?
    // For now, just prevents default form submission.
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col">
            {/* მთავარი ნავიგაცია */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <Link href="/shop" className="text-xl font-bold tracking-tight">
                  OnLyne Store
                </Link>
              </div>
              
              {/* Center Search - დესკტოპი */}
              <div className="hidden md:flex flex-1 justify-center mx-4 items-center">
                {/* Desktop Category Dropdown (visible on md and above) */}
                <div className="mr-4">
                  <CategoryDropdown />
                </div>
                
                <Suspense fallback={
                  <div className="w-full max-w-lg h-10 bg-gray-100 animate-pulse rounded-md" aria-hidden="true"></div>
                }>
                  <SearchSection 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    showSearchResults={showSearchResults}
                    setShowSearchResults={setShowSearchResults}
                    handleSearchSubmit={handleSearchSubmit}
                  />
                </Suspense>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Mobile menu button (visible below md) */}
                <button
                  type="button"
                  className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-md text-gray-700 hover:bg-gray-100 border border-gray-300"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={isMenuOpen ? "დახურე მენიუ" : "გახსენი კატეგორიების მენიუ"}
                  aria-expanded={isMenuOpen}
                >
                  {isMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <>
                      <Menu className="h-4 w-4" />
                      <span className="text-xs font-medium hidden xs:inline">კატეგორიები</span>
                    </>
                  )}
                </button>
                
                {!loadingAuth && (
                  <>
                    {user ? (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {user.photoURL && (
                            <div className="w-8 h-8 rounded-full overflow-hidden hidden md:block">
                              <OptimizedImage 
                                src={user.photoURL} 
                                alt="User profile" 
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            </div>
                          )}
                          <span className="text-sm font-medium hidden md:inline-block">
                            {user.displayName}
                          </span>
                        </div>
                        
                        {isAdmin && (
                          <Link 
                            href="/admin"
                            className="p-2 hover:bg-gray-100 rounded-full"
                            aria-label="Admin panel"
                          >
                            <LayoutDashboard size={20} />
                          </Link>
                        )}
                        
                        <button 
                          onClick={handleSignOut}
                          className="p-2 hover:bg-gray-100 rounded-full"
                          aria-label="გამოსვლა"
                        >
                          <LogOut size={20} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleSignIn}
                        className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        aria-label="Google-ით ავტორიზაცია"
                      >
                        <User size={18} />
                        <span className="hidden md:inline">Google-ით ავტორიზაცია</span>
                      </button>
                    )}
                  </>
                )}
                
                <Link 
                  href="/shop/cart" 
                  className="relative p-2 hover:bg-gray-100 rounded-full"
                  aria-label="კალათა"
                >
                  <ShoppingBag size={22} />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
              </div>
            </div>
            
            {/* მობილური საძიებო - ყოველთვის ჩანს */}
            <div className="mt-3 md:hidden">
              <Suspense fallback={
                <div className="w-full h-8 bg-gray-100 animate-pulse rounded-md" aria-hidden="true"></div>
              }>
                <MobileSearchSection
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  showSearchResults={showSearchResults}
                  setShowSearchResults={setShowSearchResults}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-b">
          <div className="container mx-auto px-4 py-4">
            {/* ზედა საძიებო ველი ამოვშალოთ, რადგან header-ში გადავიტანეთ */}
            <nav className="mb-2">
              <div className="pt-1">
                <h2 className="font-medium mb-2 text-sm">კატეგორიები</h2>
                <div className="grid grid-cols-3 xs:grid-cols-4 gap-x-2 gap-y-1.5 pl-1 xs:pl-2 sm:pl-0">
                  {isLoading ? (
                    <div className="text-xs text-gray-500">იტვირთება...</div>
                  ) : categories.length > 0 ? (
                    categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/shop?category=${category.id}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="block text-xs xs:text-sm py-1 px-2 border rounded-md text-center text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                      >
                        {category.name}
                      </Link>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500">კატეგორიები არ მოიძებნა</div>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {/* {isLoading ? ( // <- ვშლით ამ ბლოკს
          // Placeholder for category loading or similar, REMOVE THIS
          <div className="w-full h-10 bg-gray-200 rounded animate-pulse mb-4"></div>
        ) : null} */}
        {children}
      </main>

      {/* Footer მემოიზებული */}
      <FooterSection settings={settings} />
    </div>
  );
} 