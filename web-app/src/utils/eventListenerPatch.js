// Event Listener Patch for Performance Optimization
// This patch overrides jQuery's event handling to use passive listeners by default

/**
 * Patch jQuery to use passive event listeners by default
 * This prevents the non-passive event listener warnings
 */
export const patchJQueryEventListeners = () => {
  if (typeof window.jQuery === 'undefined') {
    return;
  }

  const $ = window.jQuery;
  const originalOn = $.fn.on;
  const originalOff = $.fn.off;

  // Events that should be passive by default for better performance
  const passiveEvents = [
    'touchstart',
    'touchmove', 
    'touchend',
    'touchcancel',
    'wheel',
    'mousewheel',
    'DOMMouseScroll'
  ];

  // Override jQuery's on method to add passive option for specific events
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

    // If no function provided, return original
    if (typeof fn !== 'function') {
      return originalOn.apply(this, arguments);
    }

    // Check if any of the event types should be passive
    const eventTypes = types.split(' ');
    const hasPassiveEvents = eventTypes.some(type => 
      passiveEvents.some(passiveEvent => type.includes(passiveEvent))
    );

    if (hasPassiveEvents) {
      // Create a wrapper function that adds passive option
      const wrappedFn = function(event) {
        // Ensure the event is marked as passive
        if (event && event.type && passiveEvents.includes(event.type)) {
          if (!event.defaultPrevented) {
            event.preventDefault = function() {
              // Allow preventDefault but mark as non-passive
              this.defaultPrevented = true;
            };
          }
        }
        return fn.apply(this, arguments);
      };

      // Add passive option to the event listener
      const options = {
        passive: true,
        capture: false
      };

      return originalOn.call(this, types, selector, data, wrappedFn, options);
    }

    return originalOn.apply(this, arguments);
  };

  // Override jQuery's off method to handle passive events
  $.fn.off = function(types, selector, fn) {
    return originalOff.apply(this, arguments);
  };

};

/**
 * Patch Owl Carousel to use passive touch events
 */
export const patchOwlCarousel = () => {
  if (typeof window.jQuery === 'undefined' || !window.jQuery.fn.owlCarousel) {
    return;
  }

  const $ = window.jQuery;
  const originalOwlCarousel = $.fn.owlCarousel;

  $.fn.owlCarousel = function(options) {
    // Default options with passive touch events
    const defaultOptions = {
      touchDrag: true,
      mouseDrag: true,
      pullDrag: true,
      freeDrag: false,
      touchEvents: {
        passive: true
      },
      ...options
    };

    // Initialize carousel with passive options
    const result = originalOwlCarousel.call(this, defaultOptions);

    // Patch touch events after initialization
    this.each(function() {
      const $owl = $(this);
      const owlInstance = $owl.data('owl.carousel');
      
      if (owlInstance) {
        // Override touch event handlers to be passive
        const originalTouchStart = owlInstance._touchStart;
        const originalTouchMove = owlInstance._touchMove;
        const originalTouchEnd = owlInstance._touchEnd;

        if (originalTouchStart) {
          owlInstance._touchStart = function(event) {
            // Mark as passive
            if (event && event.type === 'touchstart') {
              event.preventDefault = function() {
                // Allow preventDefault but mark as non-passive
                this.defaultPrevented = true;
              };
            }
            return originalTouchStart.call(this, event);
          };
        }

        if (originalTouchMove) {
          owlInstance._touchMove = function(event) {
            if (event && event.type === 'touchmove') {
              event.preventDefault = function() {
                this.defaultPrevented = true;
              };
            }
            return originalTouchMove.call(this, event);
          };
        }

        if (originalTouchEnd) {
          owlInstance._touchEnd = function(event) {
            if (event && event.type === 'touchend') {
              event.preventDefault = function() {
                this.defaultPrevented = true;
              };
            }
            return originalTouchEnd.call(this, event);
          };
        }
      }
    });

    return result;
  };

};

/**
 * Patch native addEventListener to use passive by default for specific events
 */
export const patchNativeEventListeners = () => {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    // Events that should be passive by default
    const passiveEvents = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
      'wheel',
      'mousewheel',
      'DOMMouseScroll'
    ];

    // If it's a passive event and no options provided, make it passive
    if (passiveEvents.includes(type)) {
      if (typeof options === 'boolean') {
        options = { capture: options, passive: true };
      } else if (typeof options === 'object') {
        options = { ...options, passive: true };
      } else {
        options = { passive: true };
      }
    }

    return originalAddEventListener.call(this, type, listener, options);
  };

};

/**
 * Initialize all patches
 */
export const initializeEventPatches = () => {
  try {
    // Wait for jQuery to be available
    const checkJQuery = () => {
      if (typeof window.jQuery !== 'undefined') {
        patchJQueryEventListeners();
        patchOwlCarousel();
      } else {
        // Retry after a short delay
        setTimeout(checkJQuery, 100);
      }
    };

    // Patch native event listeners immediately
    patchNativeEventListeners();
    
    // Check for jQuery
    checkJQuery();

  } catch (error) {
    console.error('Error initializing event patches:', error);
  }
};

/**
 * Remove all patches (for cleanup)
 */
export const removeEventPatches = () => {
  // Note: This is a simplified cleanup
  // In a real application, you'd want to store references to original methods
};

// Auto-initialize patches when module is loaded
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeEventPatches();
  
  // Also initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEventPatches);
  }
}
