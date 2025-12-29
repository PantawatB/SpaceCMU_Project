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
  const [showAddTaskPopup, setShowAddTaskPopup] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskTime, setTaskTime] = useState("17:00");
  
  // Store tasks by date (key format: "YYYY-MM-DD")
  const [tasks, setTasks] = useState<Record<string, Array<{
    title: string;
    details: string;
    time: string;
    id: string;
  }>>>({});

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
                  <div className="p-4 flex-1 overflow-y-auto">
                    {(() => {
                      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                      const dayTasks = tasks[dateKey] || [];
                      
                      if (dayTasks.length === 0) {
                        return (
                          <div className="flex items-center justify-center h-full">
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
                                transform="translate(0 2)"
                              />
                            </svg>
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-3">
                          {dayTasks.map((task) => (
                            <div
                              key={task.id}
                              className="bg-[#f2f3f7] rounded-xl cursor-pointer transition-all duration-200 shadow-[0.5em_0.5em_0.5em_#d8dae0b1,-0.375em_-0.375em_0.5em_#ffffff] border-[1.5px] border-[#f2f3f7] hover:bg-[#d3ddf1] hover:border-[#1677ff]"
                            >
                              <div className="p-3 flex flex-row gap-2">
                                {/* Left - Status Indicator */}
                                <div className="pt-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                                </div>

                                {/* Right - Content */}
                                <div className="flex-1 flex flex-col gap-2">
                                  {/* Text Wrap */}
                                  <div className="flex flex-col gap-1 text-[#333]">
                                    <p className="text-sm">
                                      <span className="font-medium text-black">
                                        {task.title}
                                      </span>{" "}
                                      {task.details}
                                    </p>
                                    <p className="text-xs text-[#777]">2 hours ago</p>
                                    <p className="text-xs text-[#777]">{task.time}</p>
                                  </div>

                                  {/* Button Wrap */}
                                  <div className="flex flex-row gap-3 items-center">
                                    <button className="text-xs bg-transparent font-semibold text-[#1677ff] border-none rounded-[1.5em] cursor-pointer hover:underline">
                                      Success
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTasks(prev => ({
                                          ...prev,
                                          [dateKey]: prev[dateKey].filter(t => t.id !== task.id)
                                        }));
                                      }}
                                      className="bg-transparent border-none text-xs font-normal text-[#666] cursor-pointer hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Add Task Button */}
                  <div className="border-t border-gray-300 p-4">
                    <button
                      onClick={() => setShowAddTaskPopup(true)}
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

      {/* Add Task Popup Modal */}
      {showAddTaskPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowAddTaskPopup(false)}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-[900px] h-[650px] overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowAddTaskPopup(false)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="flex h-full overflow-y-auto">
              {/* Left Side - Preview */}
              <div className="w-[400px] bg-gray-50 p-8 flex flex-col">
                <h3 className="text-md font-semibold text-gray-500 uppercase tracking-wide mb-6">
                  Preview
                </h3>

                {/* Preview Card - Matching the exact design */}
                <div className="w-fit bg-[#f2f3f7] rounded-xl cursor-pointer transition-all duration-200 shadow-[1em_1em_1em_#d8dae0b1,-0.75em_-0.75em_1em_#ffffff] border-[1.5px] border-[#f2f3f7] hover:bg-[#d3ddf1] hover:border-[#1677ff]">
                  <div className="mt-5 mb-[1.375em] ml-[1.375em] mr-8 flex flex-row gap-3">
                    {/* Left - Status Indicator */}
                    <div className="left">
                      <div className="w-[0.625em] h-[0.625em] bg-red-500 my-[0.375em] rounded-lg" />
                    </div>

                    {/* Right - Content */}
                    <div className="right flex flex-col gap-[0.875em]">
                      {/* Text Wrap */}
                      <div className="flex flex-col gap-1 text-[#333]">
                        <p className="text-content">
                          <span className="font-medium text-black">
                            {taskTitle || "Jane Doe"}
                          </span>{" "}
                          {taskDetails || "invited you to edit the Web Design file."}
                        </p>
                        <p className="text-[0.875em] text-[#777]">2 hours ago</p>
                        <p className="text-[0.875em] text-[#777]">{taskTime}</p>
                      </div>

                      {/* Button Wrap */}
                      <div className="flex flex-row gap-4 items-center">
                        <button className="text-[15px] bg-transparent font-semibold text-[#1677ff] border-none rounded-[1.5em] cursor-pointer hover:underline">
                          Success
                        </button>
                        <button className="bg-transparent border-none text-[15px] font-normal text-[#666] cursor-pointer hover:underline">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Form */}
              <div className="flex-1 p-8">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  เพิ่มงานใหม่
                </h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    // Create date key
                    const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                    
                    // Create new task
                    const newTask = {
                      id: Date.now().toString(),
                      title: taskTitle,
                      details: taskDetails,
                      time: taskTime,
                    };
                    
                    // Add task to the tasks object
                    setTasks(prev => ({
                      ...prev,
                      [dateKey]: [...(prev[dateKey] || []), newTask]
                    }));
                    
                    setShowAddTaskPopup(false);
                    // Reset form
                    setTaskTitle("");
                    setTaskDetails("");
                    setTaskTime("17:00");
                  }}
                  className="space-y-6"
                >
                  {/* Task Title */}
                  <div>
                    <label
                      htmlFor="taskTitle"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      ชื่องาน
                    </label>
                    <input
                      type="text"
                      id="taskTitle"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="เช่น ประชุมทีม, ส่งงาน, ..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Task Details */}
                  <div>
                    <label
                      htmlFor="taskDetails"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      รายละเอียด
                    </label>
                    <textarea
                      id="taskDetails"
                      value={taskDetails}
                      onChange={(e) => setTaskDetails(e.target.value)}
                      placeholder="อธิบายรายละเอียดของงาน..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                      required
                    />
                  </div>

                  {/* Task Time */}
                  <div>
                    <label
                      htmlFor="taskTime"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      เวลา
                    </label>
                    <input
                      type="time"
                      id="taskTime"
                      value={taskTime}
                      onChange={(e) => setTaskTime(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Selected Date Display */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      วันที่:{" "}
                      <span className="font-medium text-gray-800">
                        {selectedDate} {monthsInThai[selectedMonth]}{" "}
                        {selectedYear}
                      </span>
                    </p>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                      เพิ่มงาน
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddTaskPopup(false)}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
