'use client';

import React, { useState, useEffect, useCallback, Suspense, memo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CategoryDropdown } from '@/components/shop/category-dropdown';
import { Category } from '@/types';
import { getCategories, getUserRole, getSettings } from '@/lib/firebase-service';
import { Menu, X, ShoppingBag, User, LogOut, LayoutDashboard, Search, MapPinIcon, MailIcon, PhoneIcon } from 'lucide-react';
import { useCart } from '@/components/providers/cart-provider';
import { auth } from '@/lib/firebase-config';
import { signInWithGoogle, signOut } from '@/lib/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import SearchResults from '@/components/shop/search-results';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/components/providers/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

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
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <Image 
        src={src} 
        alt={alt} 
        width={width}
        height={height}
        className={className}
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
        priority
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
  const { t } = useLanguage();

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
            placeholder={t('search.placeholder')}
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
  const { t } = useLanguage();

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
            placeholder={t('search.placeholder')}
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
  const { t } = useLanguage();
  const year = new Date().getFullYear();
  
  const footerNavItems = [
    { href: '/shop', label: t('footer.home') },
    { href: '/shop', label: t('footer.categories') },
    { href: '/shop/about', label: t('footer.about') },
    { href: '/shop/promo-checker', label: t('footer.promocodes') },
  ];
  
  return (
    <footer className="bg-gray-800 text-gray-100 pt-12 pb-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* ჩვენს შესახებ */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Online Store</h3>
            <p className="text-sm text-gray-200 line-clamp-4">
              {settings?.aboutUsContent || 'ჩვენ გთავაზობთ საუკეთესო ხარისხის პროდუქციას ხელმისაწვდომ ფასად. აღმოაჩინეთ მრავალფეროვანი არჩევანი ჩვენს ონლაინ მაღაზიაში.'}
            </p>
          </div>
          
          {/* სწრაფი ბმულები */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">{t('footer.quickLinks')}</h3>
            <ul className="text-sm space-y-2">
              {footerNavItems.map((item, index) => (
                <li key={index}>
                  <Link href={item.href} className="text-gray-200 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* საკონტაქტო ინფორმაცია */}
            <div>
            <h3 className="text-lg font-semibold text-white mb-4">{t('footer.subscribe')}</h3>
            <p className="text-sm text-gray-200 mb-4">
              {t('footer.subscribeDescription')}
            </p>
            
            {settings?.address && (
              <div className="mt-4 flex items-start space-x-2">
                <MapPinIcon className="h-4 w-4 text-gray-200 mt-0.5" />
                <span className="text-sm text-gray-200">{settings.address}</span>
              </div>
            )}
            
            {settings?.email && (
              <div className="mt-2 flex items-start space-x-2">
                <MailIcon className="h-4 w-4 text-gray-200 mt-0.5" />
                <a 
                  href={`mailto:${settings.email}`} 
                  className="text-sm text-gray-200 hover:text-white transition-colors"
                >
                  {settings.email}
                </a>
              </div>
            )}
            
            {settings?.phone && (
              <div className="mt-2 flex items-start space-x-2">
                <PhoneIcon className="h-4 w-4 text-gray-200 mt-0.5" />
                <a 
                  href={`tel:${settings.phone}`} 
                  className="text-sm text-gray-200 hover:text-white transition-colors"
                >
                  {settings.phone}
                </a>
            </div>
            )}
          </div>
        </div>
        <div className="pt-6 border-t border-gray-700 text-center text-xs text-gray-300">
          <p>© {year} Online Store. {t('footer.rights')}</p>
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
  const { t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({});
  
  const headerRef = useRef<HTMLElement>(null);

  const navItems = [
    { href: '/shop', label: t('header.home') },
    { href: '/shop', label: t('header.categories') },
    { href: '/shop/about', label: t('header.about') },
    { href: '/shop/promo-checker', label: t('header.promocodes') },
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

  // ჰედერის სიმაღლის დაყენება CSS ცვლადში
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
        console.log(`Header height updated: ${headerHeight}px`); // Debugging log
      }
    };

    // Initial measurement
    updateHeaderHeight();

    // Update on resize
    window.addEventListener('resize', updateHeaderHeight);
    
    // Update after a short delay to account for potential layout shifts
    const timeoutId = setTimeout(updateHeaderHeight, 100); 

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header ref={headerRef} className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col">
            {/* მთავარი ნავიგაცია */}
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-6">
                <Link href="/shop" className="text-xl font-bold tracking-tight">
                  Online Store
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
              
              {/* User Interface */}
              <div className="flex items-center gap-3">
                {/* Language Switcher */}
                <LanguageSwitcher />
                
                {/* Menu Toggle for mobile */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-full"
                  aria-label={isMenuOpen ? "დახურვა" : "მენიუს გახსნა"}
                >
                  {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                
                {/* User Menu - visible all sizes */}
                {!loadingAuth && (
                  <>
                    {user ? (
                      <div className="flex items-center space-x-3">
                        {isAdmin && (
                          <Link 
                            href="/admin" 
                            className="hidden md:flex items-center space-x-1 px-3 py-2 text-sm hover:bg-gray-100 rounded-md transition-colors"
                            aria-label={t('header.dashboard')}
                          >
                            <LayoutDashboard size={18} />
                            <span>{t('header.dashboard')}</span>
                          </Link>
                        )}
                        
                        <button 
                          onClick={handleSignOut}
                          className="flex items-center space-x-1 p-2 hover:bg-gray-100 rounded-full"
                          aria-label={t('header.logout')}
                        >
                          <LogOut size={18} />
                          <span className="hidden md:inline">{t('header.logout')}</span>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={handleSignIn}
                        className="flex items-center space-x-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        aria-label={t('header.signin')}
                      >
                        <User size={18} />
                        <span className="hidden md:inline">{t('header.signin')}</span>
                      </button>
                    )}
                  </>
                )}
                
                <Link 
                  href="/shop/cart" 
                  className="relative p-2 hover:bg-gray-100 rounded-full"
                  aria-label={t('header.cart')}
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