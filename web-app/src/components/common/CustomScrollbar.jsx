import React, { useRef, useEffect, useState } from 'react';
import '../../styles/CustomScrollbar.css';

const CustomScrollbar = ({
  children,
  className = '',
  variant = 'default', // 'default', 'thin', 'thick', 'rounded', 'hide'
  color = 'primary', // 'primary', 'success', 'warning', 'danger', 'info'
  smooth = true,
  maxHeight = 'auto',
  maxWidth = 'auto',
  onScroll,
  ...props
}) => {
  const scrollRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState(null);

  // Handle scroll events
  const handleScroll = (e) => {
    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    // Set new timeout to detect when scrolling stops
    const timeout = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
    
    setScrollTimeout(timeout);
    
    // Call external onScroll handler if provided
    if (onScroll) {
      onScroll(e);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  // Build className based on props
  const buildClassName = () => {
    const classes = ['custom-scrollbar'];
    
    // Add variant classes
    switch (variant) {
      case 'thin':
        classes.push('scrollbar-thin');
        break;
      case 'thick':
        classes.push('scrollbar-thick');
        break;
      case 'rounded':
        classes.push('scrollbar-rounded');
        break;
      case 'hide':
        classes.push('hide-scrollbar');
        break;
      default:
        // Default scrollbar
        break;
    }
    
    // Add color classes
    if (color !== 'primary') {
      classes.push(`scrollbar-${color}`);
    }
    
    // Add smooth scrolling
    if (smooth) {
      classes.push('smooth-scroll');
    }
    
    // Add animation class when scrolling
    if (isScrolling) {
      classes.push('scrollbar-animated');
    }
    
    // Add custom className
    if (className) {
      classes.push(className);
    }
    
    return classes.join(' ');
  };

  // Build inline styles
  const buildStyles = () => {
    const styles = {};
    
    if (maxHeight !== 'auto') {
      styles.maxHeight = typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
    }
    
    if (maxWidth !== 'auto') {
      styles.maxWidth = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth;
    }
    
    return styles;
  };

  return (
    <div
      ref={scrollRef}
      className={buildClassName()}
      style={buildStyles()}
      onScroll={handleScroll}
      {...props}
    >
      {children}
    </div>
  );
};

// Higher-order component for easy wrapping
export const withCustomScrollbar = (WrappedComponent, scrollbarProps = {}) => {
  return React.forwardRef((props, ref) => (
    <CustomScrollbar {...scrollbarProps}>
      <WrappedComponent ref={ref} {...props} />
    </CustomScrollbar>
  ));
};

// Hook for scrollbar functionality
export const useCustomScrollbar = (options = {}) => {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } = e.target;
    
    setScrollPosition({ x: scrollLeft, y: scrollTop });
    setIsAtTop(scrollTop === 0);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 1);
    setIsScrolling(true);
    
    // Reset scrolling state after delay
    setTimeout(() => setIsScrolling(false), 150);
    
    if (options.onScroll) {
      options.onScroll(e);
    }
  };

  const scrollToTop = (smooth = true) => {
    const element = document.querySelector('.custom-scrollbar');
    if (element) {
      element.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const scrollToBottom = (smooth = true) => {
    const element = document.querySelector('.custom-scrollbar');
    if (element) {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  return {
    scrollPosition,
    isAtTop,
    isAtBottom,
    isScrolling,
    handleScroll,
    scrollToTop,
    scrollToBottom
  };
};

export default CustomScrollbar;
