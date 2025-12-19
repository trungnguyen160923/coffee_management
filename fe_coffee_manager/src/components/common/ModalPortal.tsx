import React from 'react';
import ReactDOM from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

// Render modal content into the top-level app container to avoid clipping/stacking issues
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const root = document.getElementById('root') || document.body;
  return ReactDOM.createPortal(children, root);
};

export default ModalPortal;
