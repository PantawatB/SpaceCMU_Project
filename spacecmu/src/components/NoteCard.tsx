import React, { useState, useEffect } from "react";

type Props = {
  title: string;
  details?: string;
  time?: string;       // "HH:MM"
  date?: string;       // "YYYY-MM-DD"  (ถ้าไม่ส่งมาจะใช้วันนี้)
  completed?: boolean;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSuccess?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

/** คำนวณ relative time เทียบกับ event datetime */
function getRelativeTime(time?: string, date?: string): string {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);
  const baseDate = date ?? new Date().toISOString().slice(0, 10);
  const [year, month, day] = baseDate.split("-").map(Number);

  const eventDate = new Date(year, month - 1, day, hours, minutes, 0);
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);

  // ใช้ Math.round เพื่อปัดเศษวินาทีที่เหลือให้แม่นขึ้น
  const totalMins = Math.round(absDiff / 60000);
  const totalHours = Math.floor(totalMins / 60);
  const totalDays = Math.floor(totalHours / 24);

  const remMins = totalMins % 60;
  const remHours = totalHours % 24;

  // อนาคต
  if (diffMs > 0) {
    if (totalDays > 0) {
      return `อีก ${totalDays} วัน ${remHours > 0 ? `${remHours} ชม.` : ""} โดยประมาณ`.trim();
    }
    if (totalHours > 0) {
      return `อีก ${totalHours} ชม. ${remMins > 0 ? `${remMins} นาที` : ""} โดยประมาณ`.trim();
    }
    if (totalMins > 0) return `อีก ${totalMins} นาที โดยประมาณ`;
    return "กำลังจะถึง";
  }

  // อดีต
  if (totalDays > 0) {
    return `ผ่านมาแล้ว ${totalDays} วัน ${remHours > 0 ? `${remHours} ชม.` : ""} โดยประมาณ`.trim();
  }
  if (totalHours > 0) {
    return `ผ่านมาแล้ว ${totalHours} ชม. ${remMins > 0 ? `${remMins} นาที` : ""} โดยประมาณ`.trim();
  }
  if (totalMins > 0) return `ผ่านมาแล้ว ${totalMins} นาที โดยประมาณ`;
  return "เพิ่งผ่านไป";
}

export default function NoteCard({ title, details, time, date, completed = false, onDelete, onSuccess, className = "" }: Props) {
  const [relativeTime, setRelativeTime] = useState(() => getRelativeTime(time, date));

  // Re-compute ทันทีเมื่อ time หรือ date เปลี่ยน
  // และ sync interval ให้ตรงกับจุดเริ่มนาทีถัดไปพอดี เพื่อความแม่นยำ
  useEffect(() => {
    const update = () => setRelativeTime(getRelativeTime(time, date));
    update();

    // รอจนถึงต้นนาทีถัดไปก่อน แล้วค่อย tick ทุก 60 วินาที
    const msUntilNextMinute = 60000 - (Date.now() % 60000);
    let interval: ReturnType<typeof setInterval>;

    const timeout = setTimeout(() => {
      update();
      interval = setInterval(update, 60000);
    }, msUntilNextMinute);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [time, date]);

  return (
    <div className={`bg-[#f2f3f7] rounded-xl cursor-pointer transition-all duration-200 shadow-[0.5em_0.5em_0.5em_#d8dae0b1,-0.375em_-0.375em_0.5em_#ffffff] border-[1.5px] border-[#f2f3f7] hover:bg-[#d3ddf1] hover:border-[#1677ff] ${className}`}>
      <div className="p-3 flex flex-row gap-2">
        {/* Left - Status Indicator */}
        <div className="pt-1">
          <div className={`w-2 h-2 rounded-full ${completed ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        {/* Right - Content */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Text Wrap */}
          <div className={`flex flex-col gap-1 text-[#333] ${completed ? 'opacity-60' : ''}`}>
            <p className="text-sm wrap-break-word break-all whitespace-normal">
              <span className={`font-medium text-black wrap-break-word break-all whitespace-normal ${completed ? 'line-through' : ''}`}>{title}</span>{" "}
              <span className={`inline wrap-break-word break-all whitespace-normal ${completed ? 'line-through' : ''}`}>{details}</span>
            </p>
            {relativeTime && (
              <p className={`text-xs font-medium ${
                !completed && relativeTime.startsWith("อีก")
                  ? "text-red-500"
                  : "text-[#999]"
              }`}>
                {relativeTime}
              </p>
            )}
            {time && <p className="text-xs text-[#777]">{time}</p>}
          </div>

          {/* Button Wrap */}
          <div className="flex flex-row gap-3 items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSuccess?.(e);
              }}
              className="text-xs bg-transparent font-semibold text-[#1677ff] border-none rounded-[1.5em] cursor-pointer hover:underline"
            >
              {completed ? 'Undo' : 'Success'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(e);
              }}
              className="bg-transparent border-none text-xs font-normal text-[#666] cursor-pointer hover:underline"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
