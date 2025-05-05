'use client';

import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSettings, updateSettings } from '@/lib/firebase-service';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/components/providers/language-provider';

interface SiteSettings {
  address: string;
  email: string;
  phone: string;
  aboutUsContent: string;
  loadingType: 'infinite' | 'button';
  productsPerLoad: number;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({ 
    address: '', 
    email: '', 
    phone: '', 
    aboutUsContent: '',
    loadingType: 'infinite',
    productsPerLoad: 20
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productsPerLoadInput, setProductsPerLoadInput] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedSettings = await getSettings();
        if (fetchedSettings) {
          setSettings(fetchedSettings as SiteSettings);
          setProductsPerLoadInput(fetchedSettings.productsPerLoad?.toString() || '20');
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        setError(t('admin.loadingSettingsError'));
        toast.error(t('admin.loadingSettingsError'));
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [t]);

  useEffect(() => {
    setProductsPerLoadInput(settings.productsPerLoad?.toString() || '');
  }, [settings.productsPerLoad]);

  const handleProductsPerLoadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    if (value === '') {
      setProductsPerLoadInput('');
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    const numericValue = parseInt(value);
    
    if (numericValue > 50) {
      setProductsPerLoadInput('50');
      return;
    }
    
    setProductsPerLoadInput(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Validate productsPerLoadInput before saving
    const numValue = parseInt(productsPerLoadInput);

    if (isNaN(numValue) || numValue < 1 || numValue > 50) {
      setError(t('admin.invalidProductCount'));
      toast.error(t('admin.invalidProductCount'));
      setIsSaving(false); // Ensure saving state is reset if validation fails early
      return; // Stop the saving process
    }

    // If validation passes, create the object to save with the correct number type
    const settingsToSave = {
      ...settings,
      productsPerLoad: numValue
    };

    try {
      setIsSaving(true);
      setError(null);
      await updateSettings(settingsToSave);
      // Update the main state as well after successful save
      setSettings(settingsToSave);
      toast.success(t('admin.settingsUpdated'));
    } catch (error) {
      console.error("Error saving settings:", error);
      setError(t('admin.savingSettingsError'));
      toast.error(t('admin.savingSettingsError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin.siteSettings')}</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('admin.error')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t('admin.contactInfo')}</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="address">{t('admin.address')}</Label>
              <Input 
                id="address"
                name="address"
                value={settings.address}
                onChange={handleInputChange}
                placeholder={t('admin.enterAddress')}
              />
            </div>
            <div>
              <Label htmlFor="email">{t('admin.email')}</Label>
              <Input 
                id="email"
                name="email"
                type="email"
                value={settings.email}
                onChange={handleInputChange}
                placeholder={t('admin.enterEmail')}
              />
            </div>
            <div>
              <Label htmlFor="phone">{t('admin.phone')}</Label>
              <Input 
                id="phone"
                name="phone"
                value={settings.phone}
                onChange={handleInputChange}
                placeholder={t('admin.enterPhone')}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t('admin.aboutPageText')}</h2>
          <div>
            <Label htmlFor="aboutUsContent">{t('admin.text')}</Label>
            <Textarea
              id="aboutUsContent"
              name="aboutUsContent"
              value={settings.aboutUsContent}
              onChange={handleInputChange}
              placeholder={t('admin.enterAboutText')}
              rows={10}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('admin.simpleText')}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">{t('admin.shopProductsLoadingSettings')}</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="loadingType">{t('admin.loadingType')}</Label>
              <Select
                value={settings.loadingType}
                onValueChange={(value) => setSettings(prev => ({ ...prev, loadingType: value as 'infinite' | 'button' }))}
              >
                <SelectTrigger id="loadingType" className="w-full">
                  <SelectValue placeholder={t('admin.selectLoadingType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="infinite">{t('admin.infiniteLoading')}</SelectItem>
                  <SelectItem value="button">{t('admin.buttonLoading')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.infiniteLoadingDescription')}
                <br />
                {t('admin.buttonLoadingDescription')}
              </p>
            </div>
            
            <div>
              <Label htmlFor="productsPerLoad">{t('admin.productsPerLoad')}</Label>
              <Input
                id="productsPerLoad"
                name="productsPerLoad"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={productsPerLoadInput}
                onChange={handleProductsPerLoadChange}
                placeholder="1-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('admin.productsPerLoadDescription')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('admin.saving') : t('admin.saveChanges')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
} 