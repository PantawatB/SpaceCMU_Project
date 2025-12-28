"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";

export default function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // Start with current month
  const [currentYear, setCurrentYear] = useState(today.getFullYear()); // Start with current year
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  const monthsInThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  // Get number of days in month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;

  // Generate year options (1800 - 2200)
  const yearOptions = Array.from({ length: 401 }, (_, i) => 1800 + i);
  return (
    <div className="flex h-screen bg-white text-gray-800">
      {/* Sidebar (Left) */}
      <Sidebar />

      {/* Main Content (Center) */}
      <main className="flex-1 p-8 bg-white">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Calendar</h1>
            <p className="text-gray-600">
              จัดการตารางเรียน กิจกรรม และนัดหมายต่างๆ ของคุณ
            </p>
          </div>

          {/* Calendar Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Calendar Layout - Flex container */}
            <div className="flex gap-8">
              {/* Calendar Grid - Left side */}
              <div className="flex-1">
                {/* Month Header with Clickable Month/Year */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-8">
                    {/* Month Name - Clickable */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMonthPicker(!showMonthPicker)}
                        className="text-4xl font-light text-gray-700 tracking-wider hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        {months[currentMonth]}
                      </button>
                      
                      {/* Month Picker Popup */}
                      {showMonthPicker && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-2 grid grid-cols-3 gap-1 w-64">
                          {months.map((month, index) => (
                            <button
                              key={month}
                              onClick={() => {
                                setCurrentMonth(index);
                                setShowMonthPicker(false);
                              }}
                              className={`px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                                index === currentMonth 
                                  ? "bg-blue-100 text-blue-600 font-medium" 
                                  : "text-gray-600"
                              }`}
                            >
                              {month.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Year - Clickable */}
                    <div className="relative">
                      <button
                        onClick={() => setShowYearPicker(!showYearPicker)}
                        className="border-2 border-gray-600 rounded-full px-4 py-1 hover:border-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <span className="text-lg font-medium text-gray-700">{currentYear}</span>
                      </button>

                      {/* Year Picker Popup */}
                      {showYearPicker && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-2 max-h-48 overflow-y-auto">
                          <div className="grid grid-cols-4 gap-1 w-48">
                            {yearOptions.map((year) => (
                              <button
                                key={year}
                                onClick={() => {
                                  setCurrentYear(year);
                                  setShowYearPicker(false);
                                }}
                                className={`px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors ${
                                  year === currentYear
                                    ? "bg-blue-100 text-blue-600 font-medium"
                                    : "text-gray-600"
                                }`}
                              >
                                {year}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Navigation */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const today = new Date();
                        setCurrentMonth(today.getMonth());
                        setCurrentYear(today.getFullYear());
                        setShowMonthPicker(false);
                        setShowYearPicker(false);
                      }}
                      className="border px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                      title="กลับไปวันนี้"
                    >
                      Today
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-0 border border-gray-300">
                  {/* Day Headers */}
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">SUN</div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">MON</div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">TUE</div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">WED</div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">THU</div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">FRI</div>
                  </div>
                  <div className="px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">SAT</div>
                  </div>

                  {/* Calendar Days */}
                  {Array.from({ length: totalCells }, (_, index) => {
                    const dayNumber = index - firstDay + 1;
                    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
                    const isToday = isCurrentMonth && 
                      dayNumber === new Date().getDate() && 
                      currentMonth === new Date().getMonth() && 
                      currentYear === new Date().getFullYear();
                    
                    return (
                      <div
                        key={index}
                        className={`h-20 p-2 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isToday 
                            ? "border-2 border-gray-400 bg-gray-100" 
                            : `border-r border-t border-gray-300 ${index % 7 === 6 ? "border-r-0" : ""}`
                        }`}
                        onClick={() => {
                          setShowMonthPicker(false);
                          setShowYearPicker(false);
                        }}
                      >
                        {isCurrentMonth && (
                          <div
                            className={`text-sm italic ${
                              isToday
                                ? "text-gray-800 font-bold"
                                : "text-gray-500"
                            }`}
                          >
                            {dayNumber}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note Area - Right side */}
              <div className="w-80">
                <div className="border border-gray-300 h-full">
                  {/* Note Header */}
                  <div className="border-b border-gray-300 px-4 py-3 bg-gray-50">
                    <div className="text-sm font-medium text-gray-600 text-center">NOTE</div>
                  </div>
                  
                  {/* Current Month Info */}
                  <div className="border-b border-gray-200 px-4 py-2 bg-blue-50">
                    <div className="text-xs text-blue-700 text-center font-medium">
                      {monthsInThai[currentMonth]} {currentYear}
                    </div>
                  </div>
                  
                  {/* Note Content Area */}
                  <div className="p-4 h-80">
                    <div className="grid grid-cols-12 gap-1 h-full">
                      {/* Dotted lines pattern */}
                      {Array.from({ length: 18 }).map((_, rowIndex) => (
                        Array.from({ length: 12 }).map((_, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className="w-1 h-1 bg-gray-300 rounded-full"
                          />
                        ))
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Chatbox (Right) */}
      <Chatbox />

      {/* Overlay for closing popups */}
      {(showMonthPicker || showYearPicker) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowMonthPicker(false);
            setShowYearPicker(false);
          }}
        />
      )}
    </div>
  );
}
