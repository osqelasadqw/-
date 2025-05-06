"use client";

// იმპორტი why-did-you-render - დროებით ვცდით აქ
// import '@/wdyr'; // -> პირდაპირი იმპორტის მაგივრად გამოვიყენებთ კლიენტის კომპონენტს
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/providers/cart-provider';
import { LanguageProvider } from '@/components/providers/language-provider';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { useEffect } from "react";
import Head from 'next/head';

// დინამიური იმპორტები პერფორმანსისთვის - გადავდოთ ჩატვირთვა
const ConsoleBlocker = dynamic(() => import('./console-block'), {
  ssr: false,
  loading: () => null
});

// შევუცვალოთ ფონტს ოფციები
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: false // ეს შეამცირებს ფონტის ჩატვირთვის დროს
});

// metadata და viewport ექსპორტები გადატანილია metadata.ts ფაილში, 
// მაგრამ ისინი აქ გამოყენებული არ არის, რადგან ეს კლიენტის კომპონენტია

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Firestore მონიტორინგის გააქტიურება კლიენტის მხარეს
  useEffect(() => {
    // მონიტორინგის გამორთვა - აღარ ვიყენებთ Firestore მონიტორინგს
    return () => {
      // არაფერი საჭირო აღარ არის აქ
    }
  }, []);

  // ოპტიმიზებული სკრიპტი fdprocessedid ატრიბუტების გასაწმენდად - გავუშვათ მხოლოდ 
  // პირველი რენდერის შემდეგ, გავატანოთ დეფერი რომ არ დაბლოკოს კრიტიკული CSS
  useEffect(() => {
    // გადავდოთ შესრულება იდლ დროისთვის
    const timeoutId = setTimeout(() => {
    if (typeof window !== 'undefined') {
        // გამოვიყენოთ requestIdleCallback თუ ხელმისაწვდომია
        const runWhenIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 50));
        
        runWhenIdle(() => {
          document.querySelectorAll('[fdprocessedid]').forEach(el => {
            el.removeAttribute('fdprocessedid');
          });
          
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && 
              mutation.attributeName === 'fdprocessedid' && 
              mutation.target instanceof Element) {
            mutation.target.removeAttribute('fdprocessedid');
          }
        }
      });
      
      observer.observe(document.body, { 
        attributes: true,
        attributeFilter: ['fdprocessedid'],
        subtree: true
      });
        });
      }
    }, 500);
      
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <html lang="ka" suppressHydrationWarning>
      <head>
        <title>Online Store - ონლაინ მაღაზია</title>
        <meta name="description" content="ონლაინ მაღაზია სადაც შეგიძლიათ შეიძინოთ ყველაფერი" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* წინასწარ ვტვირთავთ დომენებს */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        
        {/* კრიტიკული CSS */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* კრიტიკული CSS */
          .image-container{position:relative;width:100%;height:0;padding-bottom:100%}
          .image-container img{position:absolute;width:100%;height:100%;object-fit:cover}
          .relative.w-full.h-full{position:relative;width:100%;height:100%}
          .relative.w-full.h-full img{display:block;width:100%;height:100%;object-fit:contain}
        `}} />

        {/* გადავდოთ არა-კრიტიკული JS */}
        <Script 
          id="fdprocessed-cleanup" 
          strategy="lazyOnload"
          defer
        >
          {`
            if (typeof window !== 'undefined') {
              document.querySelectorAll('[fdprocessedid]').forEach(el => {
                el.removeAttribute('fdprocessedid');
              });
              
              const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                  if (mutation.type === 'attributes' && 
                      mutation.attributeName === 'fdprocessedid' && 
                      mutation.target instanceof Element) {
                    mutation.target.removeAttribute('fdprocessedid');
                  }
                }
              });
              
              observer.observe(document.body, { 
                attributes: true,
                attributeFilter: ['fdprocessedid'],
                subtree: true
              });
            }
          `}
        </Script>
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        inter.className
      )}>
        <LanguageProvider>
        <CartProvider>{children}</CartProvider>
        </LanguageProvider>
        <Toaster />
        
        {/* გადავდოთ ConsoleBlocker-ის რენდერი */}
        <ConsoleBlocker />
      </body>
    </html>
  );
}
