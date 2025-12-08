import { format, endOfWeek } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigationProps {
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
}

export default function WeekNavigation({
  currentWeekStart,
  onPreviousWeek,
  onNextWeek,
}: WeekNavigationProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onPreviousWeek}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-900">
            {format(currentWeekStart, 'dd/MM/yyyy')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
          </span>
        </div>
        <button
          onClick={onNextWeek}
          className="p-2 hover:bg-slate-100 rounded-lg"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

