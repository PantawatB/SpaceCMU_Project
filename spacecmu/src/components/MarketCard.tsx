import React from "react";

type MarketCardProps = {
  price: string;
  title: string;
  jobTitle: string;
  image?: string;
  sellerName: string;
  sellerImage: string;
  status?: string; // "available" | "sold"
  onViewClick?: () => void;
};

export default function MarketCard({ price, title, jobTitle, image, sellerName, sellerImage, status, onViewClick }: MarketCardProps) {
  const isSold = status === "sold";

  return (
    <article
      className={`bg-white rounded-xl shadow-md w-full max-w-[300px] mx-auto mb-8 border flex flex-col transition-all duration-300 ${
        isSold ? "border-gray-200 opacity-75 grayscale-40" : "border-gray-100"
      }`}
      style={{ minHeight: 350 }}
    >
      {/* Product Image */}
      <div className="relative w-full h-40 bg-gray-200 rounded-t-xl overflow-hidden">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt={title}
            className={`w-full h-full object-cover rounded-t-xl transition-all duration-300 ${isSold ? "brightness-50" : ""}`}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gray-300 rounded-t-xl ${isSold ? "brightness-50" : ""}`}>
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* SOLD stamp overlay */}
        {isSold && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="border-[3px] border-red-500 rounded-md px-3 py-1 rotate-[-18deg]"
              style={{
                boxShadow: "0 0 0 1px rgba(239,68,68,0.25)",
              }}
            >
              <span
                className="text-red-500 font-black tracking-[0.25em] text-xl uppercase"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.35)" }}
              >
                SOLD
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-between p-4 pb-3">
        <div>
          <h3 className={`text-lg font-bold mb-2 truncate ${isSold ? "text-gray-400" : "text-gray-900"}`}>{title}</h3>
          <p className="text-sm text-gray-400 mb-2 line-clamp-2 min-h-10 wrap-break-word">{jobTitle}</p>
          <span className={`text-sm font-semibold block mb-3 truncate ${isSold ? "text-gray-400 line-through" : "text-orange-600"}`}>
            {price}
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sellerImage} alt={sellerName} className="rounded-full object-cover aspect-square border border-gray-200 w-full h-full" />
              </div>
              <span className={`text-sm font-medium ${isSold ? "text-gray-400" : "text-gray-700"}`}>{sellerName}</span>
            </div>
            <button
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                isSold
                  ? "bg-gray-200 text-gray-400 cursor-pointer hover:bg-gray-300"
                  : "bg-black text-white hover:bg-gray-800"
              }`}
              onClick={onViewClick}
            >
              view
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
