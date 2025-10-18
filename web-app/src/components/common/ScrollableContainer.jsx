import React from 'react';
import CustomScrollbar from './CustomScrollbar';

// Container với scrollbar cho nội dung dài
export const ScrollableContainer = ({ 
  children, 
  maxHeight = '400px', 
  className = '',
  ...props 
}) => (
  <CustomScrollbar
    className={`table-scrollbar ${className}`}
    maxHeight={maxHeight}
    variant="default"
    {...props}
  >
    {children}
  </CustomScrollbar>
);

// Container cho modal với scrollbar
export const ModalScrollableContainer = ({ 
  children, 
  maxHeight = '80vh', 
  className = '',
  ...props 
}) => (
  <CustomScrollbar
    className={`modal-scrollbar ${className}`}
    maxHeight={maxHeight}
    variant="thin"
    {...props}
  >
    {children}
  </CustomScrollbar>
);

// Container cho table với scrollbar
export const TableScrollableContainer = ({ 
  children, 
  maxHeight = '400px', 
  className = '',
  ...props 
}) => (
  <div className={`table-scrollbar ${className}`} style={{ maxHeight }}>
    {children}
  </div>
);

// Container cho sidebar với scrollbar
export const SidebarScrollableContainer = ({ 
  children, 
  maxHeight = '100vh', 
  className = '',
  ...props 
}) => (
  <CustomScrollbar
    className={`sidebar-scrollbar ${className}`}
    maxHeight={maxHeight}
    variant="thin"
    color="primary"
    {...props}
  >
    {children}
  </CustomScrollbar>
);

// Container cho content area với scrollbar
export const ContentScrollableContainer = ({ 
  children, 
  maxHeight = '100vh', 
  className = '',
  ...props 
}) => (
  <CustomScrollbar
    className={`content-scrollbar ${className}`}
    maxHeight={maxHeight}
    variant="default"
    smooth={true}
    {...props}
  >
    {children}
  </CustomScrollbar>
);

// Container ẩn scrollbar nhưng vẫn có thể scroll
export const HiddenScrollbarContainer = ({ 
  children, 
  maxHeight = 'auto', 
  className = '',
  ...props 
}) => (
  <CustomScrollbar
    className={`hide-scrollbar ${className}`}
    maxHeight={maxHeight}
    variant="hide"
    {...props}
  >
    {children}
  </CustomScrollbar>
);
