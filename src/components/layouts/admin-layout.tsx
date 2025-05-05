'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import { LayoutDashboard, Package, FolderOpen, Settings, LogOut, ArrowLeft, Tag, Percent, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';
import { getUserRole } from '@/lib/firebase-service';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useLanguage } from '@/components/providers/language-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

// Removing hardcoded ADMIN_EMAILS as we'll use Firestore now

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

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
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Redirect non-admin users back to the shop
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push('/shop');
    }
  }, [loading, user, isAdmin, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/shop');
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Only render the admin layout when the user is authenticated and is an admin
  if (!user || !isAdmin) {
    return null;
  }

  const navItems = [
    { href: '/admin', label: t('admin.home'), icon: <LayoutDashboard className="h-5 w-5" /> },
    { href: '/admin/products', label: t('admin.products'), icon: <Package className="h-5 w-5" /> },
    { href: '/admin/categories', label: t('admin.categories'), icon: <FolderOpen className="h-5 w-5" /> },
    { href: '/admin/discounts', label: t('admin.discounts'), icon: <Percent className="h-5 w-5" /> },
    { href: '/admin/settings', label: t('admin.settings'), icon: <Settings className="h-5 w-5" /> },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b">
        <h1 className="text-lg font-bold">{t('admin.title')}</h1>
      </div>
      
      <div className="py-4">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md group ${
                pathname === item.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.icon}
              <span className="ml-3">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 w-full border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {user.photoURL && (
              <Image 
                src={user.photoURL} 
                alt="User profile" 
                width={32}
                height={32}
                className="rounded-full mr-2"
              />
            )}
            <div className="text-sm font-medium truncate">
              {user.displayName || user.email}
            </div>
          </div>
          <div className="flex items-center">
            <LanguageSwitcher />
            <button 
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full"
              aria-label="გამოსვლა"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <Link href="/shop" className="mt-4 flex items-center text-sm text-gray-600 hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('admin.backToShop')}
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block w-64 bg-white shadow-md z-20 fixed h-full overflow-y-auto">
        <SidebarContent />
      </div>

      {/* Mobile Header Bar with Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-30 border-b p-4 flex items-center justify-between">
        <h1 className="text-lg font-bold">{t('admin.title')}</h1>
        <div className="flex items-center">
          <LanguageSwitcher />
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64 w-full overflow-x-hidden">
        <main className="p-4 md:p-6 pt-20 md:pt-6 max-w-full">
          {children}
        </main>
      </div>
    </div>
  );
} 