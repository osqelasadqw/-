// იმპორტი why-did-you-render - დროებით ვცდით აქ
// import '@/wdyr'; // -> პირდაპირი იმპორტის მაგივრად გამოვიყენებთ კლიენტის კომპონენტს
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/providers/cart-provider';
import { Toaster } from '@/components/ui/toaster';
import ConsoleBlocker from './console-block';
// Providers იმპორტი ამოვიღოთ, რადგან არ არსებობს
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import Script from 'next/script';

// Add polyfill for ErrorEvent if it doesn't exist in the browser
const addErrorEventPolyfill = `
  if (typeof window.ErrorEvent !== 'function') {
    window.ErrorEvent = function(type, options) {
      const event = document.createEvent('ErrorEvent');
      event.initErrorEvent(
        type,
        options.bubbles || false,
        options.cancelable || false,
        options.message || '',
        options.filename || '',
        options.lineno || 0
      );
      return event;
    };
  }
`;

// Add script to clean fdprocessedid attributes that cause hydration errors
const cleanFdProcessedIdScript = `
  if (typeof window !== 'undefined') {
    // მოუსმინოს DOM-ის ცვლილებებს და ავტომატურად წაშალოს fdprocessedid ატრიბუტები
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'fdprocessedid') {
          mutation.target.removeAttribute('fdprocessedid');
        }
        
        if (mutation.type === 'childList' && mutation.addedNodes && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node && node.nodeType === 1) { // შემოწმება, რომ არის Element ტიპის
              try {
                // თავი ავარიდოთ Element-ად კასტინგს, მოვსინჯოთ უფრო უსაფრთხო მიდგომა
                if (node && typeof node === 'object') {
                  const elem = node;
                  // შევამოწმოთ ფუნქციების არსებობა პირდაპირ ობიექტზე
                  if (typeof elem.querySelectorAll === 'function') {
                    try {
                      const elements = elem.querySelectorAll('[fdprocessedid]');
                      if (elements && typeof elements.forEach === 'function') {
                        elements.forEach(el => {
                          if (el && typeof el.removeAttribute === 'function') {
                            el.removeAttribute('fdprocessedid');
                          }
                        });
                      }
                    } catch (err) {
                      // იგნორირება querySelectorAll შეცდომების
                    }
                  }
                  
                  // შევამოწმოთ hasAttribute და removeAttribute მეთოდები
                  if (elem && 
                      typeof elem.hasAttribute === 'function' && 
                      typeof elem.removeAttribute === 'function' && 
                      elem.hasAttribute('fdprocessedid')) {
                    elem.removeAttribute('fdprocessedid');
                  }
                }
              } catch (e) {
                // იგნორირება
              }
            }
          });
        }
      });
    });
    
    // გაწმენდა მაშინვე დატვირთვისას
    setTimeout(() => {
      try {
        document.querySelectorAll('[fdprocessedid]').forEach(el => {
          el.removeAttribute('fdprocessedid');
        });
        
        // დავიწყოთ მოვლენების მოსმენა
        observer.observe(document.body, { 
          attributes: true,
          attributeFilter: ['fdprocessedid'],
          childList: true,
          subtree: true
        });
      } catch (e) {
        console.error('Error initializing observer:', e);
      }
    }, 0);
  }
`;

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnLyne Store - ონლაინ მაღაზია',
  description: 'ონლაინ მაღაზია სადაც შეგიძლიათ შეიძინოთ ყველაფერი',
  authors: [{ name: 'OnLyne Team' }],
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: addErrorEventPolyfill }} />
        <script dangerouslySetInnerHTML={{ __html: cleanFdProcessedIdScript }} />
        <script dangerouslySetInnerHTML={{ __html: `
          // აქტიურდება მაშინვე საიტის ჩატვირთვისას
          if (typeof window !== 'undefined') {
            try {
              // ვინახავთ ორიგინალ მეთოდებს დეველოპმენტისთვის
              window._originalConsole = {
                log: console.log,
                error: console.error,
                warn: console.warn,
                info: console.info,
                debug: console.debug
              };
              
              // ყველა კონსოლის მეთოდის გადაწერა
              const noop = function() {};
              console.log = noop;
              console.info = noop; 
              console.warn = noop;
              console.error = noop;
              console.debug = noop;
              console.trace = noop;
              console.dir = noop;
              console.table = noop;
            } catch (e) {
              // იგნორირება
            }
          }
        `}} />
        <link 
          rel="preload" 
          href="/fonts/your-main-font.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous" 
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="preload" href="/styles/critical.css" as="style" />
        <link rel="stylesheet" href="/styles/critical.css" />
        <style dangerouslySetInnerHTML={{ __html: `
          .swiper { width: 100%; height: auto; }
          .image-container { position: relative; width: 100%; height: 0; padding-bottom: 100%; }
          .image-container img { position: absolute; width: 100%; height: 100%; object-fit: cover; }
          
          /* ტრანზიციების გამორთვა საიტის სრულად ჩატვირთვამდე */
          .no-transitions * {
            transition: none !important;
            animation: none !important;
          }
        `}} />
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
      )}>
        {/* Providers კომპონენტის ნაცვლად პირდაპირ გავხსნათ შვილი კომპონენტები */}
        <ConsoleBlocker />
        <CartProvider>{children}</CartProvider>
        <Toaster />
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            // კონსოლის ბლოკირება
            (function() {
              var _log = console.log;
              var _error = console.error;
              var _warning = console.warn;
              
              window.console.log = function() {};
              window.console.error = function() {};
              window.console.warn = function() {};
              
              // მხოლოდ APP_LOG: პრეფიქსიანი ლოგების დაშვება
              window.console.appLog = function() {
                _log.apply(console, ["APP_LOG:", ...arguments]);
              };
            })();
            
            // დოკუმენტში პრელოადერის გაუქმება
            const preloader = document.getElementById('app-preloader');
            if (preloader) {
              setTimeout(() => {
                preloader.classList.add('hide');
                setTimeout(() => {
                  preloader.remove();
                }, 300);
              }, 300);
            }
          });
          
          // გამოვრთოთ ტრანზიციები და ანიმაციები საიტის ჩატვირთვამდე
          document.documentElement.classList.add('no-transitions');
          window.addEventListener('load', function() {
            requestAnimationFrame(function() {
              document.documentElement.classList.remove('no-transitions');
            });
          });
        `}} />
        <Script 
          src="/scripts/main.js" 
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
