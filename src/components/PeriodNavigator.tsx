import React from 'react';
import type { PeriodFilter } from '../types';
import { formatMonthYear } from '../utils/date';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

interface PeriodNavigatorProps {
  period: PeriodFilter;
  onPeriodChange: (newPeriod: PeriodFilter) => void;
}

export const PeriodNavigator: React.FC<PeriodNavigatorProps> = ({
  period,
  onPeriodChange,
}) => {
  const [currentDate] = React.useState(() => new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const isCurrentMonth = period.year === currentYear && period.month === currentMonth;

  const handlePrevMonth = () => {
    let newYear = period.year;
    let newMonth = period.month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    const lastDay = new Date(newYear, newMonth, 0).getDate();
    const mStr = String(newMonth).padStart(2, '0');
    onPeriodChange({
      type: 'month',
      year: newYear,
      month: newMonth,
      startDate: `${newYear}-${mStr}-01`,
      endDate: `${newYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    });
  };

  const handleNextMonth = () => {
    let newYear = period.year;
    let newMonth = period.month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const lastDay = new Date(newYear, newMonth, 0).getDate();
    const mStr = String(newMonth).padStart(2, '0');
    onPeriodChange({
      type: 'month',
      year: newYear,
      month: newMonth,
      startDate: `${newYear}-${mStr}-01`,
      endDate: `${newYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    });
  };

  const handleResetCurrentMonth = () => {
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const mStr = String(currentMonth).padStart(2, '0');
    onPeriodChange({
      type: 'month',
      year: currentYear,
      month: currentMonth,
      startDate: `${currentYear}-${mStr}-01`,
      endDate: `${currentYear}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    });
  };

  return (
    <div className="period-navigator-container" aria-label="Bộ chọn thời gian">
      {/* Fixed-width capsule: never shifts left/right on rapid clicking */}
      <div className="period-navigator-capsule">
        <button
          type="button"
          className="btn-period-nav-arrow"
          onClick={handlePrevMonth}
          title="Tháng trước"
          aria-label="Tháng trước"
        >
          <ChevronLeft size={16} />
        </button>

        <div
          className={`period-navigator-label ${!isCurrentMonth ? 'clickable' : ''}`}
          onClick={!isCurrentMonth ? handleResetCurrentMonth : undefined}
          title={!isCurrentMonth ? 'Nhấn để quay về tháng hiện tại' : undefined}
        >
          <Calendar size={15} className="period-nav-calendar-icon" />
          <span className="period-nav-text">{formatMonthYear(period.year, period.month)}</span>
        </div>

        <button
          type="button"
          className="btn-period-nav-arrow"
          onClick={handleNextMonth}
          title="Tháng sau"
          aria-label="Tháng sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Floating reset button: Absolute positioned to guarantee ZERO layout shift */}
      <button
        type="button"
        className={`btn-period-reset-today ${!isCurrentMonth ? 'visible' : ''}`}
        onClick={handleResetCurrentMonth}
        title="Quay về tháng hiện tại"
        aria-label="Quay về tháng hiện tại"
      >
        <RotateCcw size={12} />
        <span className="btn-period-reset-label">Tháng này</span>
      </button>
    </div>
  );
};
