"use client";

import { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import NoteCard from "../../components/NoteCard";

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
  const [showDayViewPopup, setShowDayViewPopup] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskTime, setTaskTime] = useState("17:00");
  
  // Store tasks by date (key format: "YYYY-MM-DD")
  const [tasks, setTasks] = useState<Record<string, Array<{
    title: string;
    details: string;
    time: string;
    id: string;
    completed: boolean;
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
      <main className="flex-1 p-4 md:p-8 bg-white overflow-auto min-h-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Calendar</h1>
            <p className="text-sm md:text-base text-gray-600">
              จัดการตารางเรียน กิจกรรม และนัดหมายต่างๆ ของคุณ
            </p>
          </div>

          {/* Calendar Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-8 overflow-hidden" style={{ height: 'calc(100vh - 250px)', minHeight: '500px' }}>
            {/* Calendar Layout - Flex container */}
            <div className="flex gap-8 h-full">
              {/* Calendar Grid - Left side */}
              <div className="flex-1 flex flex-col min-w-0 max-w-full">
                {/* Month Header with Clickable Month/Year */}
                <div className="flex items-center justify-between mb-8 shrink-0 flex-wrap gap-4">
                  <div className="flex items-center gap-8">
                    {/* Month Name - Clickable */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMonthPicker(!showMonthPicker)}
                        className="text-2xl md:text-4xl font-light text-gray-700 tracking-wider hover:text-gray-900 transition-colors cursor-pointer"
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
                    {/* Add Task Button - Visible only on small screens */}
                    <button
                      onClick={() => setShowAddTaskPopup(true)}
                      className="lg:hidden border px-3 py-1 text-sm text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                      title="เพิ่มงาน"
                    >
                      + งาน
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="grid grid-cols-7 gap-0 border border-gray-300 h-full">
                    {/* Day Headers */}
                    <div className="border-r border-gray-300 px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
                        SUN
                      </div>
                    </div>
                    <div className="border-r border-gray-300 px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
                        MON
                      </div>
                    </div>
                    <div className="border-r border-gray-300 px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
                        TUE
                      </div>
                    </div>
                    <div className="border-r border-gray-300 px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
                        WED
                      </div>
                    </div>
                    <div className="border-r border-gray-300 px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
                        THU
                      </div>
                    </div>
                    <div className="border-r border-gray-300 px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
                        FRI
                      </div>
                    </div>
                    <div className="px-2 md:px-4 py-3 bg-gray-100 flex items-center justify-center">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 text-center">
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
                          className={`flex-1 p-2 hover:bg-gray-50 transition-colors cursor-pointer ${
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
                              // On small screens, show popup instead
                              if (window.innerWidth < 1024) {
                                setShowDayViewPopup(true);
                              }
                            }
                            setShowMonthPicker(false);
                            setShowYearPicker(false);
                          }}
                        >
                          {isCurrentMonth && (
                            <div
                              className={`text-xs sm:text-sm italic ${
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
              </div>

              {/* Note Area - Right side - Hidden on small screens */}
              <div className="w-80 shrink-0 h-full min-h-0 hidden lg:block">
                <div className="border border-gray-300 h-full flex flex-col overflow-hidden relative min-h-0">
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
                  <div className="p-4 flex-1 overflow-y-auto min-h-0">
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
                      
                      // Separate completed and incomplete tasks
                      const incompleteTasks = dayTasks.filter(task => !task.completed);
                      const completedTasks = dayTasks.filter(task => task.completed);
                      
                      return (
                        <div className="space-y-3">
                          {/* Incomplete Tasks */}
                          {incompleteTasks.map((task) => (
                            <NoteCard
                              key={task.id}
                              title={task.title}
                              details={task.details}
                              time={task.time}
                              completed={task.completed}
                              onSuccess={() => setTasks(prev => ({
                                ...prev,
                                [dateKey]: prev[dateKey].map(t => 
                                  t.id === task.id ? { ...t, completed: true } : t
                                )
                              }))}
                              onDelete={() => setTasks(prev => ({
                                ...prev,
                                [dateKey]: prev[dateKey].filter(t => t.id !== task.id)
                              }))}
                            />
                          ))}
                          
                          {/* Divider - Only show if there are both incomplete and completed tasks */}
                          {incompleteTasks.length > 0 && completedTasks.length > 0 && (
                            <div className="py-2">
                              <div className="border-t-2 border-gray-300"></div>
                            </div>
                          )}
                          
                          {/* Completed Tasks */}
                          {completedTasks.map((task) => (
                            <NoteCard
                              key={task.id}
                              title={task.title}
                              details={task.details}
                              time={task.time}
                              completed={task.completed}
                              onSuccess={() => setTasks(prev => ({
                                ...prev,
                                [dateKey]: prev[dateKey].map(t => 
                                  t.id === task.id ? { ...t, completed: false } : t
                                )
                              }))}
                              onDelete={() => setTasks(prev => ({
                                ...prev,
                                [dateKey]: prev[dateKey].filter(t => t.id !== task.id)
                              }))}
                            />
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Add Task Button (sticky at bottom) */}
                  <div className="border-t border-gray-300 p-4 bg-white z-10">
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

      {/* Day View Popup - For small screens */}
      {showDayViewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDayViewPopup(false)}
          />

          {/* Popup Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setShowDayViewPopup(false)}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="border-b border-gray-300 px-6 py-4 bg-slate-100">
              <div className="text-xl font-bold text-gray-800 text-center">
                {selectedDate} {monthsInThai[selectedMonth]} {selectedYear}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {(() => {
                const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;
                const dayTasks = tasks[dateKey] || [];
                
                if (dayTasks.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                      <svg
                        width="100"
                        height="100"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-gray-300 mb-4"
                      >
                        <path
                          d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M7.5 13.5H13.5M7.5 16.5H11"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <p className="text-gray-400 text-sm">ไม่มีงานในวันนี้</p>
                    </div>
                  );
                }
                
                // Separate completed and incomplete tasks
                const incompleteTasks = dayTasks.filter(task => !task.completed);
                const completedTasks = dayTasks.filter(task => task.completed);
                
                return (
                  <div className="space-y-3">
                    {/* Incomplete Tasks */}
                    {incompleteTasks.map((task) => (
                      <NoteCard
                        key={task.id}
                        title={task.title}
                        details={task.details}
                        time={task.time}
                        completed={task.completed}
                        onSuccess={() => setTasks(prev => ({
                          ...prev,
                          [dateKey]: prev[dateKey].map(t => 
                            t.id === task.id ? { ...t, completed: true } : t
                          )
                        }))}
                        onDelete={() => setTasks(prev => ({
                          ...prev,
                          [dateKey]: prev[dateKey].filter(t => t.id !== task.id)
                        }))}
                      />
                    ))}
                    
                    {/* Divider - Only show if there are both incomplete and completed tasks */}
                    {incompleteTasks.length > 0 && completedTasks.length > 0 && (
                      <div className="py-2">
                        <div className="border-t-2 border-gray-300"></div>
                      </div>
                    )}
                    
                    {/* Completed Tasks */}
                    {completedTasks.map((task) => (
                      <NoteCard
                        key={task.id}
                        title={task.title}
                        details={task.details}
                        time={task.time}
                        completed={task.completed}
                        onSuccess={() => setTasks(prev => ({
                          ...prev,
                          [dateKey]: prev[dateKey].map(t => 
                            t.id === task.id ? { ...t, completed: false } : t
                          )
                        }))}
                        onDelete={() => setTasks(prev => ({
                          ...prev,
                          [dateKey]: prev[dateKey].filter(t => t.id !== task.id)
                        }))}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Footer - Add Task Button */}
            <div className="border-t border-gray-300 p-4 bg-white">
              <button
                onClick={() => {
                  setShowDayViewPopup(false);
                  setShowAddTaskPopup(true);
                }}
                className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                + เพิ่มงานในวันนี้
              </button>
            </div>
          </div>
        </div>
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
              <div className="w-80 bg-gray-50 p-4 flex flex-col">
                <h3 className="text-md font-semibold text-gray-500 uppercase tracking-wide mb-6">
                  Preview
                </h3>

                {/* Preview Card - use NoteCard component so preview and real note match exactly */}
                <NoteCard title={taskTitle || "Preview"} details={taskDetails || "This is an example that will be displayed here."} time={taskTime} />
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
                      completed: false,
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
