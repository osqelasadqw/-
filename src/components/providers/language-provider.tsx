'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type Locale = 'ka' | 'en';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// შევქმნათ მემოიზებული მესიჯების ქეში
let messagesCache: Record<string, Record<string, any>> = {
  ka: {},
  en: {}
};

// წინასწარ ჩავტვირთოთ მესიჯები თუ აპლიკაცია არის კლიენტ-მხარეს
if (typeof window !== 'undefined') {
  // წინასწარ ჩავტვირთოთ ორივე ენის მესიჯები რაც დაგვეხმარება გადართვის დროს
  const preloadMessages = async () => {
    try {
      console.log('Trying to preload messages...');
      
      // კა
      const kaCommonMessages = await import(`../../messages/ka/common.json`);
      console.log('Loaded KA messages:', Object.keys(kaCommonMessages).length, 'keys');
      
      // სპეციფიური გასაღებების შემოწმება
      if (kaCommonMessages.product) {
        console.log('KA product keys:', Object.keys(kaCommonMessages.product));
        console.log('KA product.featured =', kaCommonMessages.product.featured);
        console.log('KA product.specialOffer =', kaCommonMessages.product.specialOffer);
      }
      
      const kaShopMessages = await import(`../../messages/ka/shop.json`);
      messagesCache.ka = {
        ...kaCommonMessages,
        ...kaShopMessages
      };
      
      // ინგლისური
      const enCommonMessages = await import(`../../messages/en/common.json`);
      console.log('Loaded EN messages:', Object.keys(enCommonMessages).length, 'keys');
      
      // სპეციფიური გასაღებების შემოწმება
      if (enCommonMessages.product) {
        console.log('EN product keys:', Object.keys(enCommonMessages.product));
        console.log('EN product.featured =', enCommonMessages.product.featured);
        console.log('EN product.specialOffer =', enCommonMessages.product.specialOffer);
      }
      
      const enShopMessages = await import(`../../messages/en/shop.json`);
      messagesCache.en = {
        ...enCommonMessages,
        ...enShopMessages
      };
      
      console.log('Preloaded all language messages');
    } catch (error) {
      console.error('Error preloading messages:', error);
    }
  };
  
  // გამოვიძახოთ წინასწარი ჩატვირთვის ფუნქცია
  preloadMessages();
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  // ვიყენებთ preventDefault ოფციას, რომ არ მოხდეს default-ად ენის ჩატვირთვა საწყის რენდერზე
  const [locale, setLocaleState] = useState<Locale>('ka');
  const [messages, setMessages] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // ენის შეცვლა - ოპტიმიზებული
  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return; // არ შევცვალოთ თუ იგივეა
    
    setIsLoading(true);
    
    // შევამოწმოთ გვაქვს თუ არა ქეშში ეს მესიჯები
    if (Object.keys(messagesCache[newLocale]).length > 0) {
      // თუ ქეშში არის, გამოვიყენოთ - გვეხმარება სწრაფ გადართვაში
      setMessages(messagesCache[newLocale]);
      setLocaleState(newLocale);
      setIsLoading(false);
      
      // დავიმახსოვროთ ლოკალურად
      if (typeof window !== 'undefined') {
        localStorage.setItem('locale', newLocale);
      }
      return;
    }
    
    // თუ ქეშში არ არის, ჩავტვირთოთ
    const loadMessages = async () => {
      try {
        const commonMessages = await import(`../../messages/${newLocale}/common.json`);
        const shopMessages = await import(`../../messages/${newLocale}/shop.json`);
        
        const allMessages = {
          ...commonMessages,
          ...shopMessages
        };
        
        messagesCache[newLocale] = allMessages;
        setMessages(allMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        messagesCache[newLocale] = {};
        setMessages({});
      } finally {
        setLocaleState(newLocale);
        setIsLoading(false);
        
        // დავიმახსოვროთ ლოკალურად
        if (typeof window !== 'undefined') {
          localStorage.setItem('locale', newLocale);
        }
      }
    };
    
    loadMessages();
  };

  // თარგმანების ჩატვირთვა - ოპტიმიზებული ქეშირებით
  useEffect(() => {
    // თუ ლოკალის ცვლილებას აკეთებს setLocale ფუნქცია, იქვე ხდება მესიჯების დაყენებაც
    // ამიტომ აქ მხოლოდ პირველადი ინიციალიზაციისას ხდება ჩატვირთვა
    
    // შევამოწმოთ ქეშია თუ არა უკვე ჩატვირთული
    if (Object.keys(messagesCache[locale]).length > 0) {
      setMessages(messagesCache[locale]);
      return;
    }
    
    const initialLoadMessages = async () => {
      setIsLoading(true);
      try {
        // თუ ქეშში არ არის, მაშინ ვტვირთავთ
        const commonMessages = await import(`../../messages/${locale}/common.json`);
        const shopMessages = await import(`../../messages/${locale}/shop.json`);
        
        // გავაერთიანოთ ყველა თარგმანი ერთ ობიექტში
        const allMessages = {
          ...commonMessages,
          ...shopMessages
        };
        
        messagesCache[locale] = allMessages;
        setMessages(allMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
        // ნაგულისხმევი თარგმანები, თუ ფაილი ვერ ჩაიტვირთა
        messagesCache[locale] = {};
        setMessages({});
      } finally {
        setIsLoading(false);
      }
    };

    initialLoadMessages();
  }, []); // ეს ეფექტი მხოლოდ ერთხელ გაეშვება აპლიკაციის ინიციალიზაციისას

  // ლოკალური შენახვის ჩატვირთვა პირველად რენდერზე - ოპტიმიზებული
  useEffect(() => {
    const loadSavedLocale = () => {
      if (typeof window !== 'undefined') {
        const savedLocale = localStorage.getItem('locale') as Locale;
        if (savedLocale && (savedLocale === 'ka' || savedLocale === 'en')) {
          // თუ savedLocale განსხვავდება მიმდინარე locale-სგან, მხოლოდ მაშინ გამოვიძახოთ setLocale
          if (savedLocale !== locale) {
            setLocale(savedLocale);
          }
        }
      }
    };

    loadSavedLocale();
  }, []); // მხოლოდ ერთხელ გაეშვება კომპონენტის მაუნთისას

  // თარგმნის ფუნქცია - მემოიზებული
  const t = useMemo(() => {
    return (key: string): string => {
      if (isLoading || !messages) return key;

      const keys = key.split('.');
      let result: any = messages;

      // დებაგინგი
      console.log('Translation attempt:', key, 'Current locale:', locale);
      
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          console.log('Key not found:', key, 'Current path:', keys.slice(0, keys.indexOf(k)).join('.'));
          return key; // საკვანძო სიტყვა ვერ მოიძებნა
        }
      }

      console.log('Translation result:', key, '=', result);
      return typeof result === 'string' ? result : key;
    };
  }, [messages, isLoading, locale]);

  // ვქმნით მემოიზებულ კონტექსტს
  const contextValue = useMemo(() => ({
    locale,
    setLocale,
    t,
    isLoading
  }), [locale, t, isLoading]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}; 