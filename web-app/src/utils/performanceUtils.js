// Performance optimization utilities

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
};

/**
 * Throttle function to limit the rate of function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Add passive event listeners for better scroll performance
 * @param {Element} element - DOM element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} options - Event options
 */
export const addPassiveEventListener = (element, event, handler, options = {}) => {
  const passiveOptions = {
    passive: true,
    capture: false,
    ...options
  };
  
  element.addEventListener(event, handler, passiveOptions);
};

/**
 * Optimize scroll events with passive listeners
 * @param {Function} handler - Scroll handler
 * @param {number} throttleMs - Throttle delay in milliseconds
 * @returns {Function} Optimized scroll handler
 */
export const createOptimizedScrollHandler = (handler, throttleMs = 16) => {
  const throttledHandler = throttle(handler, throttleMs);
  
  return (event) => {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
      throttledHandler(event);
    });
  };
};

/**
 * Optimize resize events with debouncing
 * @param {Function} handler - Resize handler
 * @param {number} debounceMs - Debounce delay in milliseconds
 * @returns {Function} Optimized resize handler
 */
export const createOptimizedResizeHandler = (handler, debounceMs = 100) => {
  return debounce(handler, debounceMs);
};

/**
 * Add optimized scroll listener
 * @param {Element} element - DOM element
 * @param {Function} handler - Scroll handler
 * @param {Object} options - Options
 */
export const addOptimizedScrollListener = (element, handler, options = {}) => {
  const {
    throttleMs = 16,
    passive = true,
    capture = false
  } = options;
  
  const optimizedHandler = createOptimizedScrollHandler(handler, throttleMs);
  
  addPassiveEventListener(element, 'scroll', optimizedHandler, { passive, capture });
};

/**
 * Add optimized resize listener
 * @param {Element} element - DOM element
 * @param {Function} handler - Resize handler
 * @param {Object} options - Options
 */
export const addOptimizedResizeListener = (element, handler, options = {}) => {
  const {
    debounceMs = 100,
    passive = true,
    capture = false
  } = options;
  
  const optimizedHandler = createOptimizedResizeHandler(handler, debounceMs);
  
  addPassiveEventListener(element, 'resize', optimizedHandler, { passive, capture });
};

/**
 * Optimize touch events for mobile
 * @param {Element} element - DOM element
 * @param {Object} options - Touch options
 */
export const optimizeTouchEvents = (element, options = {}) => {
  const {
    touchAction = 'manipulation',
    webkitTouchCallout = 'none',
    webkitUserSelect = 'none',
    userSelect = 'none'
  } = options;
  
  element.style.touchAction = touchAction;
  element.style.webkitTouchCallout = webkitTouchCallout;
  element.style.webkitUserSelect = webkitUserSelect;
  element.style.userSelect = userSelect;
};

/**
 * Add GPU acceleration to element
 * @param {Element} element - DOM element
 */
export const addGPUAcceleration = (element) => {
  element.style.willChange = 'transform';
  element.style.transform = 'translateZ(0)';
  element.style.webkitTransform = 'translateZ(0)';
  element.style.backfaceVisibility = 'hidden';
  element.style.webkitBackfaceVisibility = 'hidden';
};

/**
 * Remove GPU acceleration from element
 * @param {Element} element - DOM element
 */
export const removeGPUAcceleration = (element) => {
  element.style.willChange = 'auto';
  element.style.transform = 'none';
  element.style.webkitTransform = 'none';
  element.style.backfaceVisibility = 'visible';
  element.style.webkitBackfaceVisibility = 'visible';
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Optimize animations based on user preferences
 * @param {Element} element - DOM element
 */
export const optimizeAnimations = (element) => {
  if (prefersReducedMotion()) {
    element.style.animationDuration = '0.01ms';
    element.style.animationIterationCount = '1';
    element.style.transitionDuration = '0.01ms';
  }
};

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Measure function execution time
   * @param {Function} func - Function to measure
   * @param {string} name - Name for the measurement
   * @returns {any} Function result
   */
  measure: (func, name = 'Function') => {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  },
  
  /**
   * Measure async function execution time
   * @param {Function} func - Async function to measure
   * @param {string} name - Name for the measurement
   * @returns {Promise<any>} Function result
   */
  measureAsync: async (func, name = 'Async Function') => {
    const start = performance.now();
    const result = await func();
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
};
