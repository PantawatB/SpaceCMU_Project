import React from "react";

type Props = {
  title: string;
  details?: string;
  time?: string;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onSuccess?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export default function NoteCard({ title, details, time, onDelete, onSuccess, className = "" }: Props) {
  return (
    <div className={`bg-[#f2f3f7] rounded-xl cursor-pointer transition-all duration-200 shadow-[0.5em_0.5em_0.5em_#d8dae0b1,-0.375em_-0.375em_0.5em_#ffffff] border-[1.5px] border-[#f2f3f7] hover:bg-[#d3ddf1] hover:border-[#1677ff] ${className}`}>
      <div className="p-3 flex flex-row gap-2">
        {/* Left - Status Indicator */}
        <div className="pt-1">
          <div className="w-2 h-2 bg-red-500 rounded-full" />
        </div>

        {/* Right - Content */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Text Wrap */}
          <div className="flex flex-col gap-1 text-[#333]">
            <p className="text-sm wrap-break-word break-all whitespace-normal">
              <span className="font-medium text-black wrap-break-word break-all whitespace-normal">{title}</span>{" "}
              <span className="inline wrap-break-word break-all whitespace-normal">{details}</span>
            </p>
            <p className="text-xs text-[#777]">2 hours ago</p>
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
              Success
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
