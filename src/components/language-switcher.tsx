'use client';

import React from 'react';
import { useLanguage } from '@/components/providers/language-provider';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="ენის შეცვლა">
          <Globe size={18} />
          <span className="sr-only">ენის შეცვლა</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setLocale('ka')}
          className={locale === 'ka' ? 'bg-muted' : ''}
        >
          🇬🇪 {t('language.ka')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLocale('en')}
          className={locale === 'en' ? 'bg-muted' : ''}
        >
          🇬🇧 {t('language.en')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 