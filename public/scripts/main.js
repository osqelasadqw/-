/**
 * ძირითადი JavaScript ფაილი პერფორმანსის გასაუმჯობესებლად
 */

// სურათების ჩატვირთვის ანიმაციების პრობლემის ფიქსი
document.addEventListener('DOMContentLoaded', function() {
  // სურათების ფორსირებული ჩატვირთვა
  const preloadImages = () => {
    document.querySelectorAll('img').forEach(img => {
      if (img.complete) {
        // თუ სურათი უკვე ჩატვირთულია, შევამოწმოთ ლოადერი
        const parent = img.closest('.relative');
        if (parent) {
          const loader = parent.querySelector('.animate-spin');
          if (loader) {
            loader.parentNode.style.display = 'none';
          }
        }
      } else {
        // თუ ჯერ არ ჩატვირთულა, დავამატოთ მოვლენა
        img.addEventListener('load', function() {
          const parent = img.closest('.relative');
          if (parent) {
            const loader = parent.querySelector('.animate-spin');
            if (loader) {
              loader.parentNode.style.display = 'none';
            }
          }
        });
        
        // შეცდომის შემთხვევაშიც დავმალოთ ლოადერი
        img.addEventListener('error', function() {
          const parent = img.closest('.relative');
          if (parent) {
            const loader = parent.querySelector('.animate-spin');
            if (loader) {
              loader.parentNode.style.display = 'none';
            }
          }
        });
      }
    });
  };

  // გამოვიძახოთ თავიდანვე და შემდეგ პერიოდულად
  preloadImages();
  
  // დავამატოთ დაკვირვება DOM ცვლილებებზე
  const observer = new MutationObserver(mutations => {
    let hasNewImages = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeName === 'IMG' || 
              (node.nodeType === 1 && node.querySelector('img'))) {
            hasNewImages = true;
          }
        });
      }
    });
    
    if (hasNewImages) {
      preloadImages();
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
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