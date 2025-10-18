// Touch Optimization Utilities
// This module provides utilities to optimize touch events and prevent passive listener warnings

/**
 * Add meta tags for touch optimization
 */
export const addTouchOptimizationMetaTags = () => {
  // Check if meta tags already exist
  if (document.querySelector('meta[name="viewport"]')) {
    return;
  }

  // Add viewport meta tag for touch optimization
  const viewportMeta = document.createElement('meta');
  viewportMeta.name = 'viewport';
  viewportMeta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  document.head.appendChild(viewportMeta);

  // Add touch-action meta tag
  const touchActionMeta = document.createElement('meta');
  touchActionMeta.name = 'touch-action';
  touchActionMeta.content = 'pan-y pinch-zoom';
  document.head.appendChild(touchActionMeta);

};

/**
 * Add CSS for global touch optimization
 */
export const addTouchOptimizationCSS = () => {
  const style = document.createElement('style');
  style.id = 'touch-optimization-styles';
  
  // Check if styles already exist
  if (document.getElementById('touch-optimization-styles')) {
    return;
  }

  style.textContent = `
    /* Global touch optimization */
    * {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      touch-action: manipulation;
    }
    
    /* Allow text selection in input fields */
    input, textarea, [contenteditable] {
      -webkit-user-select: text;
      -khtml-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
      user-select: text;
    }
    
    /* Optimize carousel touch events */
    .owl-carousel,
    .owl-carousel .owl-stage,
    .owl-carousel .owl-stage-outer,
    .owl-carousel .owl-item {
      touch-action: pan-y pinch-zoom !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    
    /* Optimize scroll containers */
    .custom-scrollbar,
    .table-scrollbar,
    .modal-scrollbar {
      touch-action: pan-y pinch-zoom;
      -webkit-overflow-scrolling: touch;
    }
    
    /* Optimize touch targets */
    button, a, [role="button"] {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    
    /* Prevent zoom on double tap */
    * {
      touch-action: manipulation;
    }
    
    /* Optimize for mobile devices */
    @media (max-width: 768px) {
      * {
        touch-action: manipulation;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      input, textarea, [contenteditable] {
        -webkit-user-select: text;
        -khtml-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
      }
    }
  `;
  
  document.head.appendChild(style);
};

/**
 * Override jQuery's event handling for passive listeners
 */
export const patchJQueryForPassiveEvents = () => {
  if (typeof window.jQuery === 'undefined') {
    return;
  }

  const $ = window.jQuery;
  const originalOn = $.fn.on;
  const originalOff = $.fn.off;

  // Events that should be passive
  const passiveEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel', 'mousewheel'];

  // Override on method
  $.fn.on = function(types, selector, data, fn) {
    // Handle different parameter combinations
    if (typeof selector === 'function') {
      fn = selector;
      selector = undefined;
    }
    if (typeof data === 'function') {
      fn = data;
      data = undefined;
    }

    if (typeof fn !== 'function') {
      return originalOn.apply(this, arguments);
    }

    // Check if any event types should be passive
    const eventTypes = types.split(' ');
    const hasPassiveEvents = eventTypes.some(type => 
      passiveEvents.some(passiveEvent => type.includes(passiveEvent))
    );

    if (hasPassiveEvents) {
      // Create wrapper with passive option
      const wrappedFn = function(event) {
        // Mark as passive
        if (event && passiveEvents.includes(event.type)) {
          event.preventDefault = function() {
            if (this._shouldPreventDefault) {
              this.defaultPrevented = true;
            }
          };
        }
        return fn.apply(this, arguments);
      };

      return originalOn.call(this, types, selector, data, wrappedFn, { passive: true });
    }

    return originalOn.apply(this, arguments);
  };

};

/**
 * Initialize all touch optimizations
 */
export const initializeTouchOptimizations = () => {
  try {
    // Add meta tags
    addTouchOptimizationMetaTags();
    
    // Add CSS
    addTouchOptimizationCSS();
    
    // Patch jQuery
    patchJQueryForPassiveEvents();
    
  } catch (error) {
    console.error('Error initializing touch optimizations:', error);
  }
};

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeTouchOptimizations();
  
  // Also initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTouchOptimizations);
  }
}
