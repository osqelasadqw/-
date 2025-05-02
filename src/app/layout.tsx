// იმპორტი why-did-you-render - დროებით ვცდით აქ
// import '@/wdyr'; // -> პირდაპირი იმპორტის მაგივრად გამოვიყენებთ კლიენტის კომპონენტს
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/providers/cart-provider';
import { Toaster } from '@/components/ui/toaster';
import ConsoleBlocker from './console-block';

// Add polyfill for ErrorEvent if it doesn't exist in the browser
const addErrorEventPolyfill = `
  if (typeof window !== 'undefined' && typeof ErrorEvent === 'undefined') {
    window.ErrorEvent = window.Event || function(type, options) {
      const event = document.createEvent('Event');
      event.initEvent(type, options?.bubbles || false, options?.cancelable || false);
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
  title: 'OnLyne Store - High Quality Products',
  description: 'Shop for high quality products at OnLyne Store',
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
    <html lang="en">
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
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ConsoleBlocker />
        <CartProvider>{children}</CartProvider>
        <Toaster />
      </body>
    </html>
  );
}
