"use client";
import { fetchWithToken } from '@/lib/api';

import { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import NoteCard from "../../components/NoteCard";
import NotificationsPanel from "../../components/NotificationsPanel";
import { API_CONFIG, API_ENDPOINTS } from "@/lib/config";
import { useUser } from "@/contexts/UserContext";

export default function CalendarPage() {
  const today = new Date();
  const { activeUser } = useUser();
  const [showMobileNotif, setShowMobileNotif] = useState(false);
  const [mobileNotifUnread, setMobileNotifUnread] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [showAddTaskPopup, setShowAddTaskPopup] = useState(false);
  const [addTaskStep, setAddTaskStep] = useState<"form" | "preview">("form");
  const [showDayViewPopup, setShowDayViewPopup] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDetails, setTaskDetails] = useState("");
  const [taskTime, setTaskTime] = useState("17:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store tasks by date (key format: "YYYY-MM-DD")
  const [tasks, setTasks] = useState<Record<string, Array<{
    title: string;
    details: string;
    time: string;
    id: string;
    completed: boolean;
    type?: string;
  }>>>({});

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const dateKey = useCallback(
    (d: number, m: number, y: number) =>
      `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    []
  );

  /** Fetch events for a given date from the backend and merge into local state */
  const fetchEventsForDate = useCallback(
    async (d: number, m: number, y: number) => {
      const key = dateKey(d, m, y);
      try {
        const res = await fetchWithToken(
          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.BY_DATE(key)}`,
        );
        if (!res.ok) return;
        const events: Array<{
          id: string;
          title: string;
          description: string;
          startTime: string;
          status: string;
          type?: string;
        }> = await res.json();

        const mapped = events.map((e) => ({
          id: e.id,
          title: e.title,
          details: e.description ?? "",
          // toLocaleTimeString with explicit Asia/Bangkok ensures correct local time
          // regardless of server/deployment timezone
          time: new Date(e.startTime).toLocaleTimeString("th-TH", {
            timeZone: "Asia/Bangkok",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          completed: e.status === "completed",
          type: e.type,
        }));

        setTasks((prev) => ({ ...prev, [key]: mapped }));
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    },
    [dateKey]
  );

  /** Fetch all events for every day in the given month */
  const fetchEventsForMonth = useCallback(
    async (m: number, y: number) => {
      const days = new Date(y, m + 1, 0).getDate();
      await Promise.all(
        Array.from({ length: days }, (_, i) => fetchEventsForDate(i + 1, m, y))
      );
    },
    [fetchEventsForDate]
  );

  // Load events for the current month on mount
  useEffect(() => {
    fetchEventsForMonth(today.getMonth(), today.getFullYear());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload all events whenever the displayed month/year changes
  useEffect(() => {
    fetchEventsForMonth(currentMonth, currentYear);
  }, [currentMonth, currentYear, fetchEventsForMonth]);

  // Reload events whenever the selected date changes
  useEffect(() => {
    fetchEventsForDate(selectedDate, selectedMonth, selectedYear);
  }, [selectedDate, selectedMonth, selectedYear, fetchEventsForDate]);

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

  /** คำนวณสีจุดของ task:
   *  green  = เสร็จแล้ว (ทุก type)
   *  slate  = เลยเวลาแล้วแต่ยังไม่เสร็จ (ทุก type)
   *  purple = post_event ที่ยังไม่ถึงและยังไม่เสร็จ
   *  red    = task ธรรมดาที่ยังไม่ถึงและยังไม่เสร็จ
   */
  const getTaskDotStatus = (task: { completed: boolean; time: string; type?: string }, dateStr: string): "green" | "red" | "slate" | "purple" => {
    if (task.completed) return "green";
    const [th, tm] = task.time.split(":").map(Number);
    const [y, m, d] = dateStr.split("-").map(Number);
    const taskDateTime = new Date(y, m - 1, d, th || 0, tm || 0);
    if (taskDateTime < new Date()) return "slate";
    return task.type === "post_event" ? "purple" : "red";
  };

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
    <div className="flex h-dvh bg-white text-gray-800" style={{ height: '100dvh' }}>
      {/* Sidebar (Left) */}
      <Sidebar />

      {/* Main Content (Center) */}
      <main className="flex-1 p-6 md:p-6 bg-white overflow-auto min-h-0">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl ml-12 lg:ml-0 font-bold text-gray-800 mb-2">Calendar</h1>
            <p className="text-sm md:text-base mt-4 text-gray-600">
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

                      // Tasks for this cell
                      const cellKey = isCurrentMonth
                        ? dateKey(dayNumber, currentMonth, currentYear)
                        : null;
                      const cellTasks = cellKey ? (tasks[cellKey] || []) : [];

                      // Determine if this date is strictly in the past (before today's date)
                      const cellDate = isCurrentMonth
                        ? new Date(currentYear, currentMonth, dayNumber)
                        : null;
                      const todayMidnight = new Date(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        new Date().getDate()
                      );
                      const isPastDay = cellDate
                        ? cellDate < todayMidnight
                        : false;

                      return (
                        <div
                          key={index}
                          className={`flex-1 p-2 hover:bg-gray-50 transition-colors cursor-pointer overflow-hidden ${
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
                            <>
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

                              {/* Task Pills */}
                              {cellTasks.length > 0 && (
                                <div className="mt-1 flex flex-col gap-0.5 overflow-hidden">
                                  {cellTasks.slice(0, 3).map((task) => {
                                    // Determine dot color per-task
                                    let dotColor: string;
                                    let pillBg: string;
                                    let pillText: string;

                                    if (task.completed) {
                                      dotColor = "bg-green-500";
                                      pillBg = "bg-green-50";
                                      pillText = "text-green-800";
                                    } else {
                                      // Build the task's full datetime to compare with now
                                      const [th, tm] = task.time.split(":").map(Number);
                                      const taskDateTime = cellDate
                                        ? new Date(currentYear, currentMonth, dayNumber, th || 0, tm || 0)
                                        : null;
                                      const isTaskPast = taskDateTime
                                        ? taskDateTime < new Date()
                                        : isPastDay;
                                      if (isTaskPast) {
                                        dotColor = "bg-slate-400";
                                        pillBg = "bg-slate-100";
                                        pillText = "text-slate-600";
                                      } else if (task.type === "post_event") {
                                        dotColor = "bg-purple-500";
                                        pillBg = "bg-purple-100";
                                        pillText = "text-purple-800";
                                      } else {
                                        dotColor = "bg-red-500";
                                        pillBg = "bg-red-50";
                                        pillText = "text-red-800";
                                      }
                                    }

                                    return (
                                      <div
                                        key={task.id}
                                        className={`flex items-center gap-1 ${pillBg} rounded px-1 py-0.5 min-w-0`}
                                      >
                                        <span
                                          className={`shrink-0 w-1.5 h-1.5 rounded-full ${dotColor}`}
                                        />
                                        <span className={`${pillText} text-[10px] leading-tight truncate`}>
                                          {task.title}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {cellTasks.length > 3 && (
                                    <div className="text-[10px] text-gray-400 pl-1">
                                      +{cellTasks.length - 3} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
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
                      const key = dateKey(selectedDate, selectedMonth, selectedYear);
                      const dayTasks = tasks[key] || [];
                      
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
                              date={key}
                              completed={task.completed}
                              dotStatus={getTaskDotStatus(task, key)}
                              onSuccess={async () => {
                                await fetchWithToken(
                                  `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.TOGGLE(task.id)}`,
                                  { method: "PATCH" }
                                );
                                setTasks(prev => ({
                                  ...prev,
                                  [key]: prev[key].map(t =>
                                    t.id === task.id ? { ...t, completed: true } : t
                                  )
                                }));
                              }}
                              onDelete={async () => {
                                await fetchWithToken(
                                  `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.DELETE(task.id)}`,
                                  { method: "DELETE" }
                                );
                                setTasks(prev => ({
                                  ...prev,
                                  [key]: prev[key].filter(t => t.id !== task.id)
                                }));
                              }}
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
                              date={key}
                              completed={task.completed}
                              dotStatus={getTaskDotStatus(task, key)}
                              onSuccess={async () => {
                                await fetchWithToken(
                                  `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.TOGGLE(task.id)}`,
                                  { method: "PATCH" }
                                );
                                setTasks(prev => ({
                                  ...prev,
                                  [key]: prev[key].map(t =>
                                    t.id === task.id ? { ...t, completed: false } : t
                                  )
                                }));
                              }}
                              onDelete={async () => {
                                await fetchWithToken(
                                  `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.DELETE(task.id)}`,
                                  { method: "DELETE" }
                                );
                                setTasks(prev => ({
                                  ...prev,
                                  [key]: prev[key].filter(t => t.id !== task.id)
                                }));
                              }}
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

      {/* Notifications Panel */}
      <NotificationsPanel
        userId={activeUser?.id ?? null}
        mobileOpen={showMobileNotif}
        onMobileClose={() => setShowMobileNotif(false)}
        onUnreadChange={setMobileNotifUnread}
      />

      {/* Mobile Notification Bell — above chatbox, hidden on lg+ */}
      <div className="lg:hidden fixed bottom-24 right-4 z-30">
        <button
          onClick={() => setShowMobileNotif((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-white shadow-2xl flex items-center justify-center border border-gray-200 hover:scale-110 transition-all duration-200 active:scale-95 relative"
          aria-label="Notifications"
        >
          <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {mobileNotifUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {mobileNotifUnread > 99 ? "99+" : mobileNotifUnread}
            </span>
          )}
        </button>
      </div>

      {/* Overlay for closing pickers */}
      {(showMonthPicker || showYearPicker) && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => {
            setShowMonthPicker(false);
            setShowYearPicker(false);
          }}
        />
      )}

      {/* Month Picker — fixed centered modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setShowMonthPicker(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-64">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">เลือกเดือน</span>
              <button
                onClick={() => setShowMonthPicker(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => {
                    setCurrentMonth(index);
                    setShowMonthPicker(false);
                  }}
                  className={`py-2.5 text-sm rounded-xl font-medium transition-colors ${
                    index === currentMonth
                      ? "bg-slate-700 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {month.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Year Picker — fixed centered modal */}
      {showYearPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            onClick={() => setShowYearPicker(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-72">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">เลือกปี</span>
              <button
                onClick={() => setShowYearPicker(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1">
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    onClick={() => {
                      setCurrentYear(year);
                      setShowYearPicker(false);
                    }}
                    className={`py-2 text-sm rounded-lg font-medium transition-colors ${
                      year === currentYear
                        ? "bg-slate-700 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day View Popup — fixed centered modal */}
      {showDayViewPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowDayViewPopup(false)}
          />

          {/* Popup Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => setShowDayViewPopup(false)}
              className="absolute top-3 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="border-b border-gray-300 px-6 py-4 bg-slate-100">
              <div className="text-lg font-bold text-gray-800 text-center">
                {selectedDate} {monthsInThai[selectedMonth]} {selectedYear}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto">
              {(() => {
                const key = dateKey(selectedDate, selectedMonth, selectedYear);
                const dayTasks = tasks[key] || [];
                
                if (dayTasks.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full py-8">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300 mb-3">
                        <path d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7.5 13.5H13.5M7.5 16.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <p className="text-gray-400 text-sm">ไม่มีงานในวันนี้</p>
                    </div>
                  );
                }
                
                const incompleteTasks = dayTasks.filter(task => !task.completed);
                const completedTasks = dayTasks.filter(task => task.completed);
                
                return (
                  <div className="space-y-3">
                    {incompleteTasks.map((task) => (
                      <NoteCard
                        key={task.id}
                        title={task.title}
                        details={task.details}
                        time={task.time}
                        date={key}
                        completed={task.completed}
                        dotStatus={getTaskDotStatus(task, key)}
                        onSuccess={async () => {
                          await fetchWithToken(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.TOGGLE(task.id)}`, { method: "PATCH", credentials: "include" });
                          setTasks(prev => ({ ...prev, [key]: prev[key].map(t => t.id === task.id ? { ...t, completed: true } : t) }));
                        }}
                        onDelete={async () => {
                          await fetchWithToken(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.DELETE(task.id)}`, { method: "DELETE", credentials: "include" });
                          setTasks(prev => ({ ...prev, [key]: prev[key].filter(t => t.id !== task.id) }));
                        }}
                      />
                    ))}
                    {incompleteTasks.length > 0 && completedTasks.length > 0 && (
                      <div className="py-2"><div className="border-t-2 border-gray-300" /></div>
                    )}
                    {completedTasks.map((task) => (
                      <NoteCard
                        key={task.id}
                        title={task.title}
                        details={task.details}
                        time={task.time}
                        date={key}
                        completed={task.completed}
                        dotStatus={getTaskDotStatus(task, key)}
                        onSuccess={async () => {
                          await fetchWithToken(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.TOGGLE(task.id)}`, { method: "PATCH", credentials: "include" });
                          setTasks(prev => ({ ...prev, [key]: prev[key].map(t => t.id === task.id ? { ...t, completed: false } : t) }));
                        }}
                        onDelete={async () => {
                          await fetchWithToken(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.DELETE(task.id)}`, { method: "DELETE", credentials: "include" });
                          setTasks(prev => ({ ...prev, [key]: prev[key].filter(t => t.id !== task.id) }));
                        }}
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
                  setAddTaskStep("form");
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => { setShowAddTaskPopup(false); setAddTaskStep("form"); }}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => { setShowAddTaskPopup(false); setAddTaskStep("form"); }}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Content */}
            <div className="flex flex-1 overflow-hidden">

              {/* ── Preview Panel ── (left on desktop, toggled on mobile) */}
              <div className={`lg:w-72 xl:w-80 lg:border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-300 ${addTaskStep === "preview" ? "flex w-full" : "hidden lg:flex"}`}>
                {/* Mobile preview header with back button */}
                <div className="lg:hidden flex items-center gap-3 px-5 pt-5 pb-3">
                  <button
                    type="button"
                    onClick={() => setAddTaskStep("form")}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    กลับ
                  </button>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
                </div>

                <div className="px-5 sm:px-6 pt-0 lg:pt-6 pb-6 flex-1 overflow-y-auto">
                  <h3 className="hidden lg:block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Preview</h3>
                  <NoteCard
                    title={taskTitle || "Preview"}
                    details={taskDetails || "This is an example that will be displayed here."}
                    time={taskTime}
                  />
                </div>

                {/* Mobile: submit button also in preview panel */}
                <div className="lg:hidden border-t border-gray-200 p-4 bg-white">
                  <button
                    form="addTaskForm"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-slate-600 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-60 text-base"
                  >
                    {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มงาน"}
                  </button>
                </div>
              </div>

              {/* ── Form Panel ── (right on desktop, toggled on mobile) */}
              <div className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${addTaskStep === "preview" ? "hidden lg:flex" : "flex"}`}>
                {/* Mobile step header — title + Preview button side by side */}
                <div className="lg:hidden flex items-center gap-3 px-5 pt-5 pb-2">
                  <h2 className="text-xl font-semibold text-gray-800">เพิ่มงานใหม่</h2>
                  <button
                    type="button"
                    onClick={() => setAddTaskStep("preview")}
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                </div>

                <div className="px-5 sm:px-8 pt-0 lg:pt-8 pb-5 sm:pb-8">
                  <h2 className="hidden lg:block text-2xl font-semibold text-gray-800 mb-6 pr-8">เพิ่มงานใหม่</h2>

                  <form
                    id="addTaskForm"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setIsSubmitting(true);

                      const [hours, minutes] = taskTime.split(":").map(Number);
                      const startDateTime = new Date(selectedYear, selectedMonth, selectedDate, hours, minutes);

                      try {
                        const res = await fetchWithToken(
                          `${API_CONFIG.BASE_URL}${API_ENDPOINTS.CALENDAR.CREATE}`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              title: taskTitle,
                              description: taskDetails,
                              startTime: startDateTime.toISOString(),
                              type: "task",
                            }),
                          }
                        );

                        if (res.ok) {
                          const created = await res.json();
                          const key = dateKey(selectedDate, selectedMonth, selectedYear);
                          setTasks((prev) => ({
                            ...prev,
                            [key]: [...(prev[key] || []), {
                              id: created.id,
                              title: created.title,
                              details: created.description ?? taskDetails,
                              time: taskTime,
                              completed: created.status === "completed",
                              type: created.type ?? "task",
                            }],
                          }));
                        } else {
                          console.error("Failed to create event:", await res.text());
                        }
                      } catch (err) {
                        console.error("Error creating event:", err);
                      } finally {
                        setIsSubmitting(false);
                        setShowAddTaskPopup(false);
                        setAddTaskStep("form");
                        setTaskTitle("");
                        setTaskDetails("");
                        setTaskTime("17:00");
                      }
                    }}
                    className="space-y-4 mt-3 lg:mt-0"
                  >
                    <div>
                      <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-1.5">ชื่องาน</label>
                      <input
                        type="text"
                        id="taskTitle"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="เช่น ประชุมทีม, ส่งงาน, ..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-base"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="taskDetails" className="block text-sm font-medium text-gray-700 mb-1.5">รายละเอียด</label>
                      <textarea
                        id="taskDetails"
                        value={taskDetails}
                        onChange={(e) => setTaskDetails(e.target.value)}
                        placeholder="อธิบายรายละเอียดของงาน..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-base"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="taskTime" className="block text-sm font-medium text-gray-700 mb-1.5">เวลา</label>
                      <input
                        type="time"
                        id="taskTime"
                        value={taskTime}
                        onChange={(e) => setTaskTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-base"
                        required
                      />
                    </div>
                    <div className="bg-gray-50 rounded-lg px-4 py-3">
                      <p className="text-sm text-gray-600">
                        วันที่: <span className="font-medium text-gray-800">{selectedDate} {monthsInThai[selectedMonth]} {selectedYear}</span>
                      </p>
                    </div>
                    <div className="flex gap-3 pt-1 pb-1">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed text-base"
                      >
                        {isSubmitting ? "กำลังเพิ่ม..." : "เพิ่มงาน"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddTaskPopup(false); setAddTaskStep("form"); }}
                        className="px-5 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-base"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
