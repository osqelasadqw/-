/**
 * ძირითადი JavaScript ფაილი პერფორმანსის გასაუმჯობესებლად
 */

// Image-ების ლაზი ჩატვირთვა
document.addEventListener('DOMContentLoaded', function() {
  // სურათების მონიშვნა როგორც "loaded" ჩატვირთვის შემდეგ
  const handleImageLoad = (img) => {
    img.classList.add('loaded');
    img.style.opacity = '1';
  };

  // ლაზი ლოადინგის დამხმარე ფუნქცია
  const setupLazyLoading = () => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src');
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              img.addEventListener('load', () => handleImageLoad(img));
            }
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // ფოლბექი ძველი ბრაუზერებისთვის
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        img.addEventListener('load', () => handleImageLoad(img));
      });
    }
  };

  setupLazyLoading();

  // ფიქსირებული ზომების განსაზღვრა იმიჯ კონტეინერებისთვის
  const fixImageContainerSizes = () => {
    document.querySelectorAll('.image-container').forEach(container => {
      if (!container.style.paddingBottom && !container.hasAttribute('data-ratio-fixed')) {
        container.setAttribute('data-ratio-fixed', 'true');
        
        // თუ დატვირთული სურათის სპეციფიური შეფარდება არსებობს
        const img = container.querySelector('img');
        if (img && img.hasAttribute('width') && img.hasAttribute('height')) {
          const width = parseInt(img.getAttribute('width'), 10);
          const height = parseInt(img.getAttribute('height'), 10);
          if (width && height) {
            const ratio = (height / width) * 100;
            container.style.paddingBottom = `${ratio}%`;
          }
        }
      }
    });
  };

  fixImageContainerSizes();

  // ფონტების ოპტიმიზაცია
  if ('fonts' in document) {
    // შრიფტების ჩატვირთვის დასრულებისას
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-loaded');
    });
  }

  // გამოვრთოთ და ხელახლა ჩავრთოთ ტრანზიციები საიტის ჩატვირთვისას
  // ეს თავიდან აგვაცილებს CLS პრობლემებს
  setTimeout(() => {
    document.documentElement.classList.remove('no-transitions');
  }, 500);

  // დამატებითი ივენთ მსმენელები
  window.addEventListener('resize', () => {
    fixImageContainerSizes();
  });

  // გავასუფთაოთ console
  function clearConsole() {
    if (!window.APP_DEBUG_MODE) {
      console.clear();
      
      // გადავაწეროთ კონსოლის მეთოდები 
      ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
        const originalMethod = console[method];
        console[method] = function(...args) {
          // გამოვფილტროთ სისტემური შეტყობინებები Next.js-დან
          if (args.length > 0 && 
              (typeof args[0] === 'string' && args[0].includes('APP_LOG:') || 
               window.APP_DEBUG_MODE)) {
            originalMethod.apply(console, args);
          }
        };
      });
    }
  }

  clearConsole();
}); 