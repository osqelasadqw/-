'use client';

import { useEffect } from 'react';
import { disableConsoleOutput, enableSilentMode } from '@/lib/console-blocker';

export default function ConsoleBlocker() {
  useEffect(() => {
    // აქტიურდება მხოლოდ პროდაქშენ რეჟიმში, დეველოპმენტში არ გამოვრთავთ
    if (process.env.NODE_ENV === 'production') {
      // ულტრა ჩუმად რეჟიმი ყველა შეცდომის დასაბლოკად
      enableSilentMode();
    } else {
      // დეველოპმენტშიც გამოვრთოთ - ძალიან მკაცრი ბლოკინგი
      enableSilentMode();
      
      // მინიმალური დაბლოკვისთვის:
      // disableConsoleOutput();
      
      // ან მხოლოდ დაშვება სპეციალური პრეფიქსიანი ლოგებისთვის:
      // setupSmartConsoleBlocking();
      // console.log("APP_LOG: მნიშვნელოვანი ინფორმაცია", data);
    }
    
    // შენიშვნა: თუ გინდა დროებით კონსოლის ნახვა, გააკომენტარე ზედა ლოგიკა
  }, []);

  return null; // არაფერს არ ვაბრუნებთ UI-ში
} 