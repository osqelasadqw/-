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
        setError("პარამეტრების ჩატვირთვისას მოხდა შეცდომა. გთხოვთ, სცადოთ თავიდან.");
        toast.error("პარამეტრების ჩატვირთვისას მოხდა შეცდომა");
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

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
      setError("პროდუქტების რაოდენობა ერთ ჩატვირთვაზე უნდა იყოს 1-დან 50-მდე.");
      toast.error("არასწორი მნიშვნელობა: პროდუქტების რაოდენობა.");
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
      toast.success("პარამეტრები წარმატებით განახლდა");
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("პარამეტრების შენახვისას მოხდა შეცდომა. გთხოვთ, სცადოთ თავიდან.");
      toast.error("პარამეტრების შენახვისას მოხდა შეცდომა");
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
        <h1 className="text-2xl font-bold">საიტის პარამეტრები</h1>
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>შეცდომა</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">საკონტაქტო ინფორმაცია (Footer)</h2>
          <div className="space-y-3">
            <div>
              <Label htmlFor="address">მისამართი</Label>
              <Input 
                id="address"
                name="address"
                value={settings.address}
                onChange={handleInputChange}
                placeholder="მაგ: თბილისი, საქართველო"
              />
            </div>
            <div>
              <Label htmlFor="email">ელ-ფოსტა</Label>
              <Input 
                id="email"
                name="email"
                type="email"
                value={settings.email}
                onChange={handleInputChange}
                placeholder="მაგ: info@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">ტელეფონის ნომერი</Label>
              <Input 
                id="phone"
                name="phone"
                value={settings.phone}
                onChange={handleInputChange}
                placeholder="მაგ: +995 555 123 456"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">&quot;ჩვენს შესახებ&quot; გვერდის ტექსტი</h2>
          <div>
            <Label htmlFor="aboutUsContent">ტექსტი</Label>
            <Textarea
              id="aboutUsContent"
              name="aboutUsContent"
              value={settings.aboutUsContent}
              onChange={handleInputChange}
              placeholder="შეიყვანეთ ტექსტი, რომელიც გამოჩნდება &apos;ჩვენს შესახებ&apos; გვერდზე"
              rows={10}
            />
            <p className="text-xs text-muted-foreground mt-1">შეგიძლიათ გამოიყენოთ მარტივი ტექსტი.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold border-b pb-2">მაღაზიის პროდუქტების ჩატვირთვის პარამეტრები</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="loadingType">ჩატვირთვის ტიპი</Label>
              <Select
                value={settings.loadingType}
                onValueChange={(value) => setSettings(prev => ({ ...prev, loadingType: value as 'infinite' | 'button' }))}
              >
                <SelectTrigger id="loadingType" className="w-full">
                  <SelectValue placeholder="აირჩიეთ ჩატვირთვის ტიპი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="infinite">ეტაპობრივი ჩატვირთვა (სქროლით)</SelectItem>
                  <SelectItem value="button">მეტის ჩატვირთვა (ღილაკით)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                ეტაპობრივი ჩატვირთვა: მომხმარებელი ბოლომდე ჩასქროლვისას ავტომატურად ჩაიტვირთება მეტი პროდუქტი.
                <br />
                მეტის ჩატვირთვა: ნაჩვენები იქნება ღილაკი, რომელზე დაჭერითაც მომხმარებელი ჩატვირთავს მეტ პროდუქტს.
              </p>
            </div>
            
            <div>
              <Label htmlFor="productsPerLoad">პროდუქტების რაოდენობა ერთ ჩატვირთვაზე</Label>
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
                სვეტების რაოდენობა, რომელიც ჩატვირთული იქნება ერთ ჯერზე. 
                ეკრანის ზომის მიხედვით სვეტების რიცხვი მერყეობს 2-დან 5-მდე, შესაბამისად ეს რიცხვი გამრავლდება ეკრანზე ნაჩვენები სვეტების რაოდენობაზე.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'მიმდინარეობს შენახვა...' : 'ცვლილებების შენახვა'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
} 