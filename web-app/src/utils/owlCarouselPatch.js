// Owl Carousel Patch for Passive Touch Events
// This script overrides Owl Carousel's touch event handling

/**
 * Patch Owl Carousel to use passive touch events
 */
export const patchOwlCarouselTouchEvents = () => {
  if (typeof window.jQuery === 'undefined' || !window.jQuery.fn.owlCarousel) {
    return;
  }

  const $ = window.jQuery;
  
  // Store original owlCarousel method
  const originalOwlCarousel = $.fn.owlCarousel;
  
  // Override owlCarousel method
  $.fn.owlCarousel = function(options) {
    // Enhanced options with passive touch events
    const enhancedOptions = {
      touchDrag: true,
      mouseDrag: true,
      pullDrag: true,
      freeDrag: false,
      // Add passive touch event options
      touchEvents: {
        passive: true
      },
      // Override default options
      ...options
    };

    // Initialize with enhanced options
    const result = originalOwlCarousel.call(this, enhancedOptions);

    // Patch each carousel instance
    this.each(function() {
      const $owl = $(this);
      const owlInstance = $owl.data('owl.carousel');
      
      if (owlInstance) {
        // Store original methods
        const originalTouchStart = owlInstance._touchStart;
        const originalTouchMove = owlInstance._touchMove;
        const originalTouchEnd = owlInstance._touchEnd;
        const originalMouseDown = owlInstance._mouseDown;
        const originalMouseMove = owlInstance._mouseMove;
        const originalMouseUp = owlInstance._mouseUp;

        // Override touch start with passive handling
        if (originalTouchStart) {
          owlInstance._touchStart = function(event) {
            // Mark as passive touch event
            if (event && event.type === 'touchstart') {
              // Allow the event to be passive
              event.preventDefault = function() {
                // Only prevent default if explicitly needed
                if (this._shouldPreventDefault) {
                  this.defaultPrevented = true;
                }
              };
            }
            return originalTouchStart.call(this, event);
          };
        }

        // Override touch move with passive handling
        if (originalTouchMove) {
          owlInstance._touchMove = function(event) {
            if (event && event.type === 'touchmove') {
              event.preventDefault = function() {
                if (this._shouldPreventDefault) {
                  this.defaultPrevented = true;
                }
              };
            }
            return originalTouchMove.call(this, event);
          };
        }

        // Override touch end with passive handling
        if (originalTouchEnd) {
          owlInstance._touchEnd = function(event) {
            if (event && event.type === 'touchend') {
              event.preventDefault = function() {
                if (this._shouldPreventDefault) {
                  this.defaultPrevented = true;
                }
              };
            }
            return originalTouchEnd.call(this, event);
          };
        }

        // Override mouse events for consistency
        if (originalMouseDown) {
          owlInstance._mouseDown = function(event) {
            if (event && event.type === 'mousedown') {
              event.preventDefault = function() {
                if (this._shouldPreventDefault) {
                  this.defaultPrevented = true;
                }
              };
            }
            return originalMouseDown.call(this, event);
          };
        }

        if (originalMouseMove) {
          owlInstance._mouseMove = function(event) {
            if (event && event.type === 'mousemove') {
              event.preventDefault = function() {
                if (this._shouldPreventDefault) {
                  this.defaultPrevented = true;
                }
              };
            }
            return originalMouseMove.call(this, event);
          };
        }

        if (originalMouseUp) {
          owlInstance._mouseUp = function(event) {
            if (event && event.type === 'mouseup') {
              event.preventDefault = function() {
                if (this._shouldPreventDefault) {
                  this.defaultPrevented = true;
                }
              };
            }
            return originalMouseUp.call(this, event);
          };
        }

        // Add CSS classes for passive touch behavior
        $owl.addClass('owl-carousel-passive');
        $owl.find('.owl-stage').addClass('owl-stage-passive');
        $owl.find('.owl-stage-outer').addClass('owl-stage-outer-passive');
      }
    });

    return result;
  };

};

/**
 * Apply CSS classes for passive touch behavior
 */
export const applyPassiveTouchCSS = () => {
  const style = document.createElement('style');
  style.textContent = `
    .owl-carousel-passive {
      touch-action: pan-y pinch-zoom !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    
    .owl-stage-passive {
      touch-action: pan-y pinch-zoom !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
    
    .owl-stage-outer-passive {
      touch-action: pan-y pinch-zoom !important;
      -webkit-touch-callout: none !important;
      -webkit-user-select: none !important;
      -khtml-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
    }
  `;
  document.head.appendChild(style);
};

/**
 * Initialize Owl Carousel patches
 */
export const initializeOwlCarouselPatches = () => {
  try {
    // Apply CSS first
    applyPassiveTouchCSS();
    
    // Wait for jQuery and Owl Carousel to be available
    const checkDependencies = () => {
      if (typeof window.jQuery !== 'undefined' && window.jQuery.fn.owlCarousel) {
        patchOwlCarouselTouchEvents();
      } else {
        // Retry after a short delay
        setTimeout(checkDependencies, 100);
      }
    };

    checkDependencies();
  } catch (error) {
    console.error('Error initializing Owl Carousel patches:', error);
  }
};

// Auto-initialize when module is loaded
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeOwlCarouselPatches();
  
  // Also initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOwlCarouselPatches);
  }
}
