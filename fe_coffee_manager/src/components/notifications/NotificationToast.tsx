import { memo } from 'react';

interface NotificationToastProps {
  visible: boolean;
  title: string;
  content?: string | null;
}

export const NotificationToast = memo(function NotificationToast({
  visible,
  title,
  content,
}: NotificationToastProps) {
  return (
    <div
      className="w-72 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg transition-all"
      style={{ opacity: visible ? 1 : 0.6, transform: `translateY(${visible ? 0 : -4}px)` }}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {content && <p className="mt-1 text-xs text-slate-600">{content}</p>}
    </div>
  );
});

