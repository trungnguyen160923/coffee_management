import { useState, useRef, useEffect } from 'react';
import { Droplet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { DailyUsageForm } from './DailyUsageForm';

export const UsageFloatingWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formKey, setFormKey] = useState(0); // Key to force re-mount form
  // When null → use responsive bottom-right placement; when user drags → store explicit (x,y)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load saved position from localStorage (desktop + mobile)
  useEffect(() => {
    const saved = localStorage.getItem('usageWidgetPosition');
    if (!saved) return; // keep null → CSS will place it bottom-right responsively

    try {
      const parsed = JSON.parse(saved);

      // New format: relative ratios (more responsive)
      if (
        typeof parsed.xRatio === 'number' &&
        typeof parsed.yRatio === 'number'
      ) {
        const x = parsed.xRatio * window.innerWidth;
        const y = parsed.yRatio * window.innerHeight;
        setPosition({ x, y });
        return;
      }

      // Backward-compatible: absolute pixels (old format)
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setPosition({ x: parsed.x, y: parsed.y });
      }
    } catch {
      // ignore and fall back to responsive CSS placement
    }
  }, []);

  // Save position to localStorage when user has explicitly moved the widget
  useEffect(() => {
    if (!position) return;

    // Save as relative ratios so the button keeps a similar place across resolutions
    const xRatio = window.innerWidth > 0 ? position.x / window.innerWidth : 0;
    const yRatio = window.innerHeight > 0 ? position.y / window.innerHeight : 0;

    localStorage.setItem(
      'usageWidgetPosition',
      JSON.stringify({ xRatio, yRatio }),
    );
  }, [position]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!buttonRef.current || !position) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      setPosition(prev =>
        prev
          ? {
              x: Math.min(prev.x, maxX),
              y: Math.min(prev.y, maxY),
            }
          : prev,
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // If this is the first interaction and we are using CSS bottom/right,
      // capture the current pixel position so subsequent drags use left/top.
      if (!position) {
        setPosition({ x: rect.left, y: rect.top });
      }
      setDragOffset({
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
      });
      setIsDragging(true);
      setHasMoved(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !buttonRef.current) return;

      const rect = buttonRef.current.getBoundingClientRect();
      const currentX = position ? position.x : rect.left;
      const currentY = position ? position.y : rect.top;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Check if mouse has moved significantly (more than 5px)
      const moved =
        Math.abs(e.clientX - (currentX + dragOffset.x)) > 5 ||
        Math.abs(e.clientY - (currentY + dragOffset.y)) > 5;
      if (moved) {
        setHasMoved(true);
      }

      // Constrain to viewport using actual button size
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Reset hasMoved after a short delay to allow click event
      setTimeout(() => setHasMoved(false), 100);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, position]);

  if (user?.role !== 'staff') {
    return null;
  }

  return (
    <>
      {/* Form - Fixed position above button */}
      {isOpen && (
        <div 
          className="fixed z-40 w-80 max-w-full rounded-2xl bg-white shadow-2xl border border-amber-100 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={
            position
              ? {
                  bottom: `${window.innerHeight - position.y + 12}px`,
                  right: `${window.innerWidth - position.x - 56}px`,
                  maxWidth: 'calc(100vw - 24px)',
                  transform: 'translateX(0)',
                }
              : {
                  right: '1.5rem',
                  bottom: '5.5rem', // above the default button position
                  maxWidth: 'calc(100vw - 24px)',
                  transform: 'translateX(0)',
                }
          }
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-amber-50">
            <div>
              <p className="text-sm font-semibold text-amber-800">Quick usage log</p>
              <p className="text-xs text-amber-500">Capture ingredients consumed during the shift</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                // Reset form by changing key
                setFormKey(prev => prev + 1);
              }}
              className="text-amber-400 hover:text-amber-600 transition"
            >
              ✕
            </button>
          </div>
          <div className="p-4">
            <DailyUsageForm 
              key={formKey} 
              compact 
              onSuccess={() => {
                setIsOpen(false);
                // Reset form by changing key
                setFormKey(prev => prev + 1);
              }}
            />
          </div>
        </div>
      )}

      {/* Draggable Button */}
      <button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onClick={() => {
          // Only toggle if not dragging and hasn't moved
          if (!isDragging && !hasMoved) {
            if (isOpen) {
              // Reset form when closing
              setFormKey(prev => prev + 1);
            }
            setIsOpen((prev) => !prev);
          }
        }}
        className={`fixed z-40 group rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 shadow-2xl shadow-amber-400/40 transition-transform ${
          isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-105 cursor-grab'
        }`}
        style={
          position
            ? { left: `${position.x}px`, top: `${position.y}px` }
            : { right: '1.5rem', bottom: '1.5rem' }
        }
        title="Log ingredient usage (drag to move)"
      >
        <Droplet className="w-5 h-5" />
        {/* Tooltip */}
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Log ingredient usage
          <span className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></span>
        </span>
        {!isOpen && (
          <span className="absolute -top-2 -right-2 bg-white text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full shadow">
            New
          </span>
        )}
      </button>
    </>
  );
};

