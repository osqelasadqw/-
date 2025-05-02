// კონსოლის ლოგების სრულად გათიშვა
export function disableConsoleOutput() {
  if (typeof window !== 'undefined') {
    // შევინახოთ ორიგინალი მეთოდები
    const originalConsole = { ...console };
    
    // შევქმნათ ცარიელი ფუნქცია, რომელიც არაფერს აკეთებს
    const noop = () => {};
    
    // გადავაწეროთ კონსოლის ყველა მეთოდი
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.error = noop;
    console.debug = noop;
    console.trace = noop;
    console.dir = noop;
    console.dirxml = noop;
    console.group = noop;
    console.groupCollapsed = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeLog = noop;
    console.timeEnd = noop;
    console.count = noop;
    console.countReset = noop;
    console.assert = noop;
    console.clear = noop;
    console.profile = noop;
    console.profileEnd = noop;
    console.table = noop;
    
    // თუ საჭიროა კონსოლის ფუნქციონალის დაბრუნება (მაგ. დეველოპმენტში)
    return () => {
      Object.keys(originalConsole).forEach((key) => {
        // @ts-ignore
        console[key] = originalConsole[key];
      });
    };
  }
  return () => {}; // სერვერზე აბრუნებს ცარიელ ფუნქციას
}

// იღებს შემოწმების ფუნქციას, რომელიც გადაწყვეტს როდის დაბლოკოს
export function setupConditionalConsoleBlocking(shouldBlock: () => boolean) {
  if (typeof window !== 'undefined') {
    const originalMethods = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    const noop = () => {};
    
    const overrideMethods = () => {
      if (shouldBlock()) {
        console.log = noop;
        console.info = noop;
        console.warn = noop;
        console.error = noop;
        console.debug = noop;
      } else {
        console.log = originalMethods.log;
        console.info = originalMethods.info;
        console.warn = originalMethods.warn;
        console.error = originalMethods.error;
        console.debug = originalMethods.debug;
      }
    };
    
    // თავიდანვე ვამოწმებთ საჭიროა თუ არა ბლოკირება
    overrideMethods();
    
    // ინტერვალით ვამოწმებთ ბლოკირების პირობას
    setInterval(overrideMethods, 1000);
    
    return () => {
      console.log = originalMethods.log;
      console.info = originalMethods.info;
      console.warn = originalMethods.warn;
      console.error = originalMethods.error;
      console.debug = originalMethods.debug;
    };
  }
  return () => {};
}

// მთლიანად ჩუმად რეჟიმი: აბსოლუტურად ყველა შეცდომა/ლოგი იბლოკება
export function enableSilentMode() {
  if (typeof window !== 'undefined') {
    // 1. კონსოლის გაჩუმება
    disableConsoleOutput();
    
    // 2. window.onerror გადაფარვა
    const originalOnError = window.onerror;
    window.onerror = function() {
      return true; // უბრალოდ ვაბრუნებთ true, რომ შეცდომა დაიბლოკოს
    };
    
    // 3. unhandledrejection დაბლოკვა
    window.addEventListener('unhandledrejection', function(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    });
    
    // 4. დავაბრუნოთ ფუნქცია, რომელიც აღადგენს ყველაფერს
    return () => {
      const restoreConsole = disableConsoleOutput();
      restoreConsole();
      window.onerror = originalOnError;
      // უბედურების შემთხვევაში, რაღაც არ დავიბრუნოთ, სჯობს საერთოდ გადავტვირთოთ გვერდი
    };
  }
  return () => {};
}

// ექსპორტირებული მთავარი ფუნქცია - გამორთავს ყველა ლოგს გარდა იმ შემთხვევისა,
// როდესაც კოდი იძახებს გარკვეული პრეფიქსით (მაგ: "APP_LOG:")
export function setupSmartConsoleBlocking() {
  if (typeof window !== 'undefined') {
    const originalMethods = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    const ALLOWED_PREFIX = 'APP_LOG:';
    
    // წრაპერი ფუნქცია ლოგებისთვის
    function createWrappedMethod(originalMethod: any) {
      return function(...args: any[]) {
        // თუ პირველი არგუმენტი სტრინგია და იწყება დაშვებული პრეფიქსით
        if (typeof args[0] === 'string' && args[0].startsWith(ALLOWED_PREFIX)) {
          originalMethod.apply(console, [args[0].substring(ALLOWED_PREFIX.length), ...args.slice(1)]);
        }
        // ყველა სხვა შემთხვევაში არაფერს ვაკეთებთ
      };
    }
    
    // გადავაწეროთ მეთოდები
    console.log = createWrappedMethod(originalMethods.log);
    console.info = createWrappedMethod(originalMethods.info);
    console.warn = createWrappedMethod(originalMethods.warn);
    console.error = createWrappedMethod(originalMethods.error);
    console.debug = createWrappedMethod(originalMethods.debug);
    
    return () => {
      console.log = originalMethods.log;
      console.info = originalMethods.info;
      console.warn = originalMethods.warn;
      console.error = originalMethods.error;
      console.debug = originalMethods.debug;
    };
  }
  return () => {};
}

// პირდაპირ ექსპორტს ვაკეთებთ მარტივი გამოყენებისთვის
export default disableConsoleOutput; 