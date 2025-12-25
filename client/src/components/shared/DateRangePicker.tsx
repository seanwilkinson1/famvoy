import { useState } from "react";
import { format, isSameDay, isWithinInterval, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (startDate) {
      return new Date(startDate + "T00:00:00");
    }
    return new Date();
  });
  const [selecting, setSelecting] = useState<"start" | "end">("start");

  const parsedStartDate = startDate ? startOfDay(new Date(startDate + "T00:00:00")) : null;
  const parsedEndDate = endDate ? startOfDay(new Date(endDate + "T00:00:00")) : null;

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    const dateStr = format(clickedDate, "yyyy-MM-dd");

    if (selecting === "start") {
      onStartDateChange(dateStr);
      if (parsedEndDate && clickedDate > parsedEndDate) {
        onEndDateChange("");
      }
      setSelecting("end");
    } else {
      if (parsedStartDate && clickedDate < parsedStartDate) {
        onStartDateChange(dateStr);
        onEndDateChange("");
        setSelecting("end");
      } else {
        onEndDateChange(dateStr);
        setSelecting("start");
      }
    }
  };

  const isInRange = (day: number) => {
    if (!parsedStartDate || !parsedEndDate) return false;
    const date = startOfDay(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    ));
    return isWithinInterval(date, { start: parsedStartDate, end: parsedEndDate });
  };

  const isStart = (day: number) => {
    if (!parsedStartDate) return false;
    const date = startOfDay(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    ));
    return isSameDay(date, parsedStartDate);
  };

  const isEnd = (day: number) => {
    if (!parsedEndDate) return false;
    const date = startOfDay(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    ));
    return isSameDay(date, parsedEndDate);
  };

  const isToday = (day: number) => {
    const today = startOfDay(new Date());
    const date = startOfDay(new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    ));
    return isSameDay(date, today);
  };

  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  const renderCalendarDays = () => {
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const inRange = isInRange(day);
      const isStartDay = isStart(day);
      const isEndDay = isEnd(day);
      const isTodayDay = isToday(day);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDayClick(day)}
          className={cn(
            "aspect-square flex items-center justify-center text-sm font-medium relative transition-colors",
            inRange && !isStartDay && !isEndDay && "bg-gray-100",
            isStartDay && "bg-charcoal text-white rounded-full z-10",
            isEndDay && "bg-charcoal text-white rounded-full z-10",
            !inRange && !isStartDay && !isEndDay && "hover:bg-gray-50 rounded-full",
            isTodayDay && !isStartDay && !isEndDay && "ring-1 ring-gray-300 rounded-full"
          )}
          data-testid={`calendar-day-${day}`}
        >
          {isStartDay && inRange && parsedEndDate && (
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gray-100 -z-10" />
          )}
          {isEndDay && inRange && parsedStartDate && (
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gray-100 -z-10" />
          )}
          {day}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div 
          className={cn(
            "flex-1 p-3 rounded-xl border cursor-pointer transition-colors",
            selecting === "start" ? "border-primary bg-primary/5" : "border-gray-200"
          )}
          onClick={() => setSelecting("start")}
        >
          <div className="text-xs text-gray-500 mb-1">Start Date</div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span className={cn("text-sm font-medium", !startDate && "text-gray-400")}>
              {startDate ? format(new Date(startDate + "T00:00:00"), "MMM d, yyyy") : "Select date"}
            </span>
          </div>
        </div>
        <div className="text-gray-300">→</div>
        <div 
          className={cn(
            "flex-1 p-3 rounded-xl border cursor-pointer transition-colors",
            selecting === "end" ? "border-primary bg-primary/5" : "border-gray-200"
          )}
          onClick={() => setSelecting("end")}
        >
          <div className="text-xs text-gray-500 mb-1">End Date</div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span className={cn("text-sm font-medium", !endDate && "text-gray-400")}>
              {endDate ? format(new Date(endDate + "T00:00:00"), "MMM d, yyyy") : "Select date"}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="calendar-prev-month"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h3 className="font-semibold text-charcoal">
            {format(currentMonth, "MMMM yyyy")}
          </h3>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="calendar-next-month"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="aspect-square flex items-center justify-center text-xs font-medium text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {renderCalendarDays()}
        </div>
      </div>

      {startDate && endDate && (
        <p className="text-xs text-center text-gray-500">
          {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected
        </p>
      )}
    </div>
  );
}
