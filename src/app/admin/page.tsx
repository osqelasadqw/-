'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { getProducts, getCategories } from '@/lib/firebase-service';
import { Package, FolderOpen, DollarSign } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [productCount, setProductCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const products = await getProducts();
        const categories = await getCategories();
        
        setProductCount(products.length);
        setCategoryCount(categories.length);
        
        // Calculate total inventory value
        const total = products.reduce((sum, product) => sum + product.price, 0);
        setTotalValue(total);
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6 w-full overflow-x-hidden">
        <div className="max-w-full">
          <h1 className="text-xl sm:text-2xl font-bold">ადმინისტრატორის პანელი</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            მართეთ თქვენი ონლაინ მაღაზიის პროდუქტები და კატეგორიები
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 sm:p-6 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-200 mb-4"></div>
                <div className="h-7 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard 
              title="პროდუქტები"
              value={productCount.toString()}
              icon={<Package className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500" />}
              linkHref="/admin/products"
              linkText="პროდუქტების მართვა"
            />
            <StatCard 
              title="კატეგორიები"
              value={categoryCount.toString()}
              icon={<FolderOpen className="h-6 sm:h-8 w-6 sm:w-8 text-amber-500" />}
              linkHref="/admin/categories"
              linkText="კატეგორიების მართვა"
            />
            <StatCard 
              title="მთლიანი ღირებულება"
              value={new Intl.NumberFormat('ka-GE', {
                style: 'currency',
                currency: 'GEL',
                maximumFractionDigits: 0,
              }).format(totalValue)}
              icon={<DollarSign className="h-6 sm:h-8 w-6 sm:w-8 text-green-500" />}
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-medium mb-4">სწრაფი მოქმედებები</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction 
              title="პროდუქტის დამატება"
              description="შექმენით და დაამატეთ ახალი პროდუქტი მაღაზიაში"
              href="/admin/products/new"
            />
            <QuickAction 
              title="კატეგორიის დამატება"
              description="შექმენით ახალი კატეგორია პროდუქტების დაჯგუფებისთვის"
              href="/admin/categories/new"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  linkHref?: string;
  linkText?: string;
}

function StatCard({ title, value, icon, linkHref, linkText }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="overflow-hidden">
          <h3 className="text-base sm:text-lg font-medium text-gray-700 truncate">{title}</h3>
          <p className="text-xl sm:text-2xl font-bold mt-2 truncate">{value}</p>
        </div>
        <div className="flex-shrink-0">{icon}</div>
      </div>
      {linkHref && linkText && (
        <div className="mt-4 pt-4 border-t">
          <Link 
            href={linkHref}
            className="text-sm text-primary hover:underline"
          >
            {linkText}
          </Link>
        </div>
      )}
    </div>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  href: string;
}

function QuickAction({ title, description, href }: QuickActionProps) {
  return (
    <Link 
      href={href}
      className="block p-4 border rounded-md hover:bg-gray-50 transition-colors"
    >
      <h3 className="font-medium truncate">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
    </Link>
  );
} 