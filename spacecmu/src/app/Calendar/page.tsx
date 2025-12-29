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
  const [selectedDate, setSelectedDate] = useState(today.getDate()); // Selected day
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth()); // Selected month
  const [selectedYear, setSelectedYear] = useState(today.getFullYear()); // Selected year

  const months = [
    "JANUARY",
    "FEBRUARY",
    "MARCH",
    "APRIL",
    "MAY",
    "JUNE",
    "JULY",
    "AUGUST",
    "SEPTEMBER",
    "OCTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];

  const monthsInThai = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
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
                        <span className="text-lg font-medium text-gray-700">
                          {currentYear}
                        </span>
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
                        setSelectedDate(today.getDate());
                        setSelectedMonth(today.getMonth());
                        setSelectedYear(today.getFullYear());
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
                    <div className="text-sm font-medium text-gray-600 text-center">
                      SUN
                    </div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">
                      MON
                    </div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">
                      TUE
                    </div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">
                      WED
                    </div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">
                      THU
                    </div>
                  </div>
                  <div className="border-r border-gray-300 px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">
                      FRI
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-gray-100">
                    <div className="text-sm font-medium text-gray-600 text-center">
                      SAT
                    </div>
                  </div>

                  {/* Calendar Days */}
                  {Array.from({ length: totalCells }, (_, index) => {
                    const dayNumber = index - firstDay + 1;
                    const isCurrentMonth =
                      dayNumber > 0 && dayNumber <= daysInMonth;
                    const isToday =
                      isCurrentMonth &&
                      dayNumber === new Date().getDate() &&
                      currentMonth === new Date().getMonth() &&
                      currentYear === new Date().getFullYear();
                    const isSelected =
                      isCurrentMonth &&
                      dayNumber === selectedDate &&
                      currentMonth === selectedMonth &&
                      currentYear === selectedYear;

                    return (
                      <div
                        key={index}
                        className={`h-20 p-2 hover:bg-gray-50 transition-colors cursor-pointer ${
                          isToday
                            ? "border-2 border-gray-400 bg-gray-100"
                            : isSelected
                            ? "border-2 border-blue-400 bg-blue-50"
                            : `border-r border-t border-gray-300 ${
                                index % 7 === 6 ? "border-r-0" : ""
                              }`
                        }`}
                        onClick={() => {
                          if (isCurrentMonth) {
                            setSelectedDate(dayNumber);
                            setSelectedMonth(currentMonth);
                            setSelectedYear(currentYear);
                          }
                          setShowMonthPicker(false);
                          setShowYearPicker(false);
                        }}
                      >
                        {isCurrentMonth && (
                          <div
                            className={`text-sm italic ${
                              isToday
                                ? "text-gray-800 font-bold"
                                : isSelected
                                ? "text-blue-700 font-semibold"
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
                <div className="border border-gray-300 h-full flex flex-col">
                  {/* Note Header */}
                  <div className="border-b border-gray-300 px-4 py-3 bg-slate-100">
                    <div className="text-medium font-medium text-gray-800 text-center">
                      NOTE
                    </div>
                  </div>

                  {/* Selected Date Info */}
                  <div className="border-b border-gray-200 px-4 py-3 bg-slate-50">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-800">
                        {selectedDate} {monthsInThai[selectedMonth]}{" "}
                        {selectedYear}
                      </div>
                      {/* <div className="text-xs text-blue-600 mt-1">
                        วันที่เลือก
                      </div> */}
                    </div>
                  </div>

                  {/* Note Content Area */}
                  <div className="p-4 flex-1 flex items-center justify-center">
                    {/* Calendar SVG Icon when no data */}
                    <svg
                      width="120"
                      height="120"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-gray-300"
                    >
                      {/* Calendar body */}
                      <path
                        d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Inner text lines */}
                      <path
                        d="M7.5 13.5H13.5M7.5 16.5H11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Pencil (edit) */}
                      <path
                        d="M14.8 14.8L20.2 9.4C20.8 8.8 21.7 8.8 22.3 9.4C22.9 10 22.9 10.9 22.3 11.5L16.9 16.9L14 17.6L14.8 14.8Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        transform="translate(0 2)" // 👈 เลื่อนลง 2px
                      />
                    </svg>
                  </div>

                  {/* Add Task Button */}
                  <div className="border-t border-gray-300 p-4">
                    <button
                      onClick={() => {
                        // Handle add task functionality here
                        alert(
                          `เพิ่มงานสำหรับวันที่ ${selectedDate} ${monthsInThai[selectedMonth]} ${selectedYear}`
                        );
                      }}
                      className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                      + เพิ่มงานในวันนี้
                    </button>
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
