"use client";

import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DateBoxEvent {
  title: string;
  dateTime?: string;
  date_time?: string;
  type: string;
  status?: string;
}

interface DateBoxProps {
  value: string; // Expected format: YYYY-MM-DDTHH:mm
  min?: string;   // Expected format: YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  hasError?: boolean;
  highlightedDates?: string[]; // Array of YYYY-MM-DD local strings representing dates with events
  calendarEvents?: DateBoxEvent[]; // Array of active event objects
}

export function DateBox({ value, min, onChange, hasError, highlightedDates, calendarEvents }: DateBoxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [activeMonth, setActiveMonth] = useState<Date>(new Date());
  const [canOpen, setCanOpen] = useState(false);

  // Debounce mount to prevent click/touch pass-through when transitioning sidebar panels on mobile
  useEffect(() => {
    const timer = setTimeout(() => setCanOpen(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Compute highlighted dates from calendarEvents if passed
  const computedHighlightedDates = React.useMemo(() => {
    if (highlightedDates) return highlightedDates;
    if (!calendarEvents) return [];
    return calendarEvents
      .filter((e) => e.status !== "cancelled" && e.status !== "canceled" && e.status !== "denied")
      .map((e) => {
        const dtStr = e.date_time || e.dateTime;
        if (!dtStr) return "";
        const d = new Date(dtStr);
        if (isNaN(d.getTime())) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      })
      .filter(Boolean);
  }, [highlightedDates, calendarEvents]);

  // Compute scheduled events for the currently selected date (tempDate)
  const selectedDateEvents = React.useMemo(() => {
    if (!calendarEvents || !tempDate) return [];
    const y = tempDate.getFullYear();
    const m = String(tempDate.getMonth() + 1).padStart(2, "0");
    const d = String(tempDate.getDate()).padStart(2, "0");
    const targetKey = `${y}-${m}-${d}`;

    return calendarEvents.filter((e) => {
      if (e.status === "cancelled" || e.status === "canceled" || e.status === "denied") return false;
      const dtStr = e.date_time || e.dateTime;
      if (!dtStr) return false;
      const dateObj = new Date(dtStr);
      if (isNaN(dateObj.getTime())) return false;
      const ey = dateObj.getFullYear();
      const em = String(dateObj.getMonth() + 1).padStart(2, "0");
      const ed = String(dateObj.getDate()).padStart(2, "0");
      return `${ey}-${em}-${ed}` === targetKey;
    });
  }, [calendarEvents, tempDate]);

  // Sync internal tempDate with value prop when value changes or popover opens
  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setTempDate(parsed);
        setActiveMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
        return;
      }
    }
    // Default to current date/time rounded to minutes
    const now = new Date();
    now.setSeconds(0, 0);
    setTempDate(now);
    setActiveMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [value, isOpen]);

  // Format date-time for display input: "m/d/yyyy, hh:mm AM/PM"
  const getFormattedText = (valStr: string) => {
    if (!valStr) return "dd/mm/yyyy --:-- --";
    const d = new Date(valStr);
    if (isNaN(d.getTime())) return "dd/mm/yyyy --:-- --";

    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();

    let hours = d.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
  };

  // Convert Date to YYYY-MM-DDTHH:mm local string
  const toLocalISOString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Month navigation
  const prevMonth = () => {
    setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1));
  };

  // Calendar calculations
  const year = activeMonth.getFullYear();
  const month = activeMonth.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const numDays = new Date(year, month + 1, 0).getDate();
  const prevNumDays = new Date(year, month, 0).getDate();

  const cells: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

  // Previous month overflow
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevNumDays - i;
    cells.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(year, month - 1, d),
    });
  }

  // Current month days
  for (let d = 1; d <= numDays; d++) {
    cells.push({
      day: d,
      isCurrentMonth: true,
      date: new Date(year, month, d),
    });
  }

  // Next month overflow to pad grid to 42 cells (6 rows)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(year, month + 1, d),
    });
  }

  const handleSelectDate = (cellDate: Date) => {
    const newTemp = new Date(tempDate);
    newTemp.setFullYear(cellDate.getFullYear());
    newTemp.setMonth(cellDate.getMonth());
    newTemp.setDate(cellDate.getDate());
    setTempDate(newTemp);
    setActiveMonth(new Date(cellDate.getFullYear(), cellDate.getMonth(), 1));
  };

  // Hour/Minute adjustments
  const incrementHour = () => {
    const newTemp = new Date(tempDate);
    newTemp.setHours((newTemp.getHours() + 1) % 24);
    setTempDate(newTemp);
  };

  // Decrement hour
  const decrementHour = () => {
    const newTemp = new Date(tempDate);
    newTemp.setHours((newTemp.getHours() - 1 + 24) % 24);
    setTempDate(newTemp);
  };

  const incrementMinute = () => {
    const newTemp = new Date(tempDate);
    newTemp.setMinutes((newTemp.getMinutes() + 1) % 60);
    setTempDate(newTemp);
  };

  const decrementMinute = () => {
    const newTemp = new Date(tempDate);
    newTemp.setMinutes((newTemp.getMinutes() - 1 + 60) % 60);
    setTempDate(newTemp);
  };

  const toggleAmPm = () => {
    const newTemp = new Date(tempDate);
    const h = newTemp.getHours();
    if (h >= 12) {
      newTemp.setHours(h - 12);
    } else {
      newTemp.setHours(h + 12);
    }
    setTempDate(newTemp);
  };

  const handleToday = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    setTempDate(now);
    setActiveMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const handleDone = () => {
    onChange(toLocalISOString(tempDate));
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  // Clock Hand angles
  const hours = tempDate.getHours();
  const minutes = tempDate.getMinutes();
  const hourAngle = (hours % 12) * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;

  // Display values
  const displayHourVal = hours % 12 === 0 ? 12 : hours % 12;
  const displayHourStr = String(displayHourVal).padStart(2, "0");
  const displayMinuteStr = String(minutes).padStart(2, "0");
  const ampmStr = hours >= 12 ? "PM" : "AM";

  // State for typing in spinners directly
  const [hourInputStr, setHourInputStr] = useState(displayHourStr);
  const [minuteInputStr, setMinuteInputStr] = useState(displayMinuteStr);

  useEffect(() => {
    setHourInputStr(displayHourStr);
  }, [displayHourStr]);

  useEffect(() => {
    setMinuteInputStr(displayMinuteStr);
  }, [displayMinuteStr]);

  // Hour text changes
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/\D/g, "");
    setHourInputStr(cleanVal);

    if (cleanVal === "") return;

    let valNum = parseInt(cleanVal, 10);
    if (isNaN(valNum)) return;

    if (valNum < 1) valNum = 1;
    if (valNum > 12) valNum = 12;

    const newTemp = new Date(tempDate);
    const isPm = newTemp.getHours() >= 12;
    let finalHours = valNum;
    if (isPm) {
      if (valNum < 12) finalHours = valNum + 12;
    } else {
      if (valNum === 12) finalHours = 0;
    }
    newTemp.setHours(finalHours);
    setTempDate(newTemp);
  };

  const handleHourBlur = () => {
    setHourInputStr(displayHourStr);
  };

  // Minute text changes
  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/\D/g, "");
    setMinuteInputStr(cleanVal);

    if (cleanVal === "") return;

    let valNum = parseInt(cleanVal, 10);
    if (isNaN(valNum)) return;

    if (valNum < 0) valNum = 0;
    if (valNum > 59) valNum = 59;

    const newTemp = new Date(tempDate);
    newTemp.setMinutes(valNum);
    setTempDate(newTemp);
  };

  const handleMinuteBlur = () => {
    setMinuteInputStr(displayMinuteStr);
  };

  // Keyboard navigation inside text spinners
  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      incrementHour();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrementHour();
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      incrementMinute();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      decrementMinute();
    }
  };

  const isSelectedDate = (cellDate: Date) => {
    return (
      cellDate.getDate() === tempDate.getDate() &&
      cellDate.getMonth() === tempDate.getMonth() &&
      cellDate.getFullYear() === tempDate.getFullYear()
    );
  };

  const isTodayDate = (cellDate: Date) => {
    const today = new Date();
    return (
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="relative w-full">
      {/* Input Field Display */}
      <div
        onClick={() => canOpen && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-black/40 border cursor-pointer select-none rounded-xl px-4 py-3 text-sm outline-none transition-all
          ${hasError ? "border-red-500/50" : isOpen ? "border-[#722f37]" : "border-white/10 hover:border-white/25"}
        `}
      >
        <span className={`${value ? "text-white" : "text-gray-500 font-normal"}`}>
          {getFormattedText(value)}
        </span>
        <CalendarIcon size={16} className={`transition-colors ${isOpen ? "text-[#722f37]" : "text-white/60"}`} />
      </div>

      {/* Backdrop overlay to isolate the calendar and prevent overlap mess */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[1.5px] z-[90]"
          onClick={handleCancel}
        />
      )}

      {/* Date & Time Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay (Only active/visible on desktop) */}
            <div
              className="hidden md:block fixed inset-0 bg-black/60 backdrop-blur-[2px] z-[90]"
              onClick={handleCancel}
            />

            {/* Wrapper Container for Responsive Centering */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-0 md:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`pointer-events-auto bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.95)] transition-all duration-300 flex flex-col
                  w-full h-full rounded-none border-none overflow-y-auto
                  md:h-auto md:max-h-[90vh] md:rounded-2xl md:border md:border-white/10 md:overflow-hidden md:w-[760px]
                `}
              >
                <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-y-auto md:overflow-hidden">
              {/* Left Panel: Calendar */}
              <div className="p-4 flex-1 select-none">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    type="button"
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-white tracking-wider text-center flex-1">
                    {activeMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}
                  </span>
                  <button
                    onClick={nextMonth}
                    type="button"
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Weekday Initials */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-500 tracking-wider mb-2">
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                    <div key={day} className="py-0.5">{day}</div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {cells.map((cell, idx) => {
                    const isSelected = isSelectedDate(cell.date);
                    const isToday = isTodayDate(cell.date);
                    
                    const year = cell.date.getFullYear();
                    const month = String(cell.date.getMonth() + 1).padStart(2, "0");
                    const dayStr = String(cell.date.getDate()).padStart(2, "0");
                    const dateKey = `${year}-${month}-${dayStr}`;
                    const hasEvent = computedHighlightedDates.includes(dateKey);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectDate(cell.date)}
                        className={`py-1 rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center font-medium relative h-9
                          ${!cell.isCurrentMonth ? "text-white/20 hover:bg-white/5" : "text-white/80 hover:bg-[#722f37]/25 hover:text-white"}
                          ${isSelected ? "!bg-[#722f37] !text-white font-bold shadow-md shadow-[#722f37]/20" : ""}
                          ${isToday && !isSelected ? "border border-[#722f37]/45 text-[#ffb2b8]" : ""}
                        `}
                      >
                        <span className={hasEvent ? "relative -top-0.5" : ""}>{cell.day}</span>
                        {hasEvent && (
                          <span
                            className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#e9c176] shadow-sm shadow-[#e9c176]/50"}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Today button */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center">
                  <button
                    onClick={handleToday}
                    type="button"
                    className="text-[11px] font-bold text-gray-400 hover:text-white transition-colors"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* Right Panel: Analog Clock & Time Spinners */}
              <div className="p-4 w-full md:w-[220px] flex flex-col justify-between select-none bg-black/20">
                <div className="flex flex-col items-center">
                  {/* Premium Static Analog Clock Face */}
                  <div className="relative w-[120px] h-[120px] flex items-center justify-center mb-4">
                    <svg
                      width="100%"
                      height="100%"
                      viewBox="0 0 100 100"
                      className="select-none"
                    >
                      {/* Face */}
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="2"
                        fill="rgba(0,0,0,0.3)"
                      />
                      {/* Minor tick marks or numbers */}
                      <text x="50" y="16" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="bold" textAnchor="middle">12</text>
                      <text x="86" y="53" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="bold" textAnchor="middle">3</text>
                      <text x="50" y="90" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="bold" textAnchor="middle">6</text>
                      <text x="14" y="53" fill="rgba(255,255,255,0.35)" fontSize="9" fontWeight="bold" textAnchor="middle">9</text>

                      {/* Hour Hand (Instant mathematically-precise update) */}
                      <line
                        x1="50"
                        y1="50"
                        x2="50"
                        y2="28"
                        stroke="#722f37"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        transform={`rotate(${hourAngle} 50 50)`}
                      />

                      {/* Minute Hand (Instant mathematically-precise update) */}
                      <line
                        x1="50"
                        y1="50"
                        x2="50"
                        y2="20"
                        stroke="rgba(255,255,255,0.7)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        transform={`rotate(${minuteAngle} 50 50)`}
                      />

                      {/* Center Pin */}
                      <circle cx="50" cy="50" r="3" fill="#722f37" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5" />
                    </svg>
                  </div>

                  {/* Time Spinners */}
                  <div className="flex items-center justify-center gap-2">
                    {/* Hour spinner */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={incrementHour}
                        type="button"
                        className="p-0.5 text-white/40 hover:text-white transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <input
                        type="text"
                        value={hourInputStr}
                        onChange={handleHourChange}
                        onBlur={handleHourBlur}
                        onKeyDown={handleHourKeyDown}
                        className="bg-black/60 border border-white/10 focus:border-[#722f37] px-2 py-1 rounded-lg text-xs font-semibold text-center text-white w-10 focus:outline-none focus:ring-1 focus:ring-[#722f37]/50"
                        placeholder="12"
                        maxLength={2}
                      />
                      <button
                        onClick={decrementHour}
                        type="button"
                        className="p-0.5 text-white/40 hover:text-white transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    <span className="text-white/40 font-bold self-center -mt-1">:</span>

                    {/* Minute spinner */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={incrementMinute}
                        type="button"
                        className="p-0.5 text-white/40 hover:text-white transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <input
                        type="text"
                        value={minuteInputStr}
                        onChange={handleMinuteChange}
                        onBlur={handleMinuteBlur}
                        onKeyDown={handleMinuteKeyDown}
                        className="bg-black/60 border border-white/10 focus:border-[#722f37] px-2 py-1 rounded-lg text-xs font-semibold text-center text-white w-10 focus:outline-none focus:ring-1 focus:ring-[#722f37]/50"
                        placeholder="00"
                        maxLength={2}
                      />
                      <button
                        onClick={decrementMinute}
                        type="button"
                        className="p-0.5 text-white/40 hover:text-white transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* AM/PM toggle */}
                    <button
                      onClick={toggleAmPm}
                      type="button"
                      className="bg-black/60 border border-white/10 hover:border-[#722f37]/40 px-2 py-1 rounded-lg text-[10px] font-bold text-center text-white/80 hover:text-white hover:bg-[#722f37]/20 transition-all uppercase self-center w-10 h-[26px] mt-3.5 flex items-center justify-center"
                    >
                      {ampmStr}
                    </button>
                  </div>
                </div>

                {/* Cancel & Done buttons */}
                <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-white/5">
                  <button
                    onClick={handleCancel}
                    type="button"
                    className="px-2.5 py-1 border border-white/10 hover:bg-white/5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDone}
                    type="button"
                    className="px-3 py-1 bg-[#722f37] hover:bg-[#722f37]/80 rounded-lg text-[10px] font-bold text-white transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>

              {/* Rightmost Panel: Daily Agenda */}
              <div className="p-4 w-full md:w-[240px] flex flex-col justify-start select-none bg-[#111112] border-t md:border-t-0 md:border-l border-white/5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e9c176]" />
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    Agenda • {selectedDateEvents.length} Event{selectedDateEvents.length !== 1 ? "s" : ""}
                  </h4>
                </div>
                
                {selectedDateEvents.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-10">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-2">No events</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                    {selectedDateEvents.map((evt, idx) => {
                      const timeStr = evt.date_time || evt.dateTime
                        ? new Date(evt.date_time || evt.dateTime || "").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "--:--";
                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white/5 rounded-xl border border-white/5 hover:border-[#722f37]/45 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold text-[#e9c176]">{timeStr}</span>
                            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-[#722f37]/40 bg-[#722f37]/15 text-[#ffb2b8]">
                              {evt.type}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-white/95 truncate" title={evt.title}>
                            {evt.title}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </>
        )}
      </AnimatePresence>
    </div>
  );
}
