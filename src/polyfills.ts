// React Native polyfills for Three.js DOM dependencies
// This must be imported before any Three.js usage

// Polyfill document object
if (typeof document === 'undefined') {
  const mockElement = {
    remove: () => {},
    style: {},
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  (global as any).document = {
    getElementById: (id: string) => mockElement,
    createElement: (tag: string) => mockElement,
    head: mockElement,
    body: mockElement,
    documentElement: mockElement,
  };
}

// Polyfill window object if needed
if (typeof window === 'undefined') {
  (global as any).window = global;
}

// Polyfill navigator if needed
if (typeof navigator === 'undefined') {
  (global as any).navigator = {
    userAgent: 'React Native',
  };
}

// Polyfill structuredClone for Supabase compatibility
if (typeof structuredClone === 'undefined') {
  (global as any).structuredClone = (obj: any) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => structuredClone(item));
    if (typeof obj === 'object') {
      const cloned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = structuredClone(obj[key]);
        }
      }
      return cloned;
    }
    return obj;
  };
}

export {};