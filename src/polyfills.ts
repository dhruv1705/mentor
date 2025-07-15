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

export {};