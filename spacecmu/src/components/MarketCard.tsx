import React from "react";

type MarketCardProps = {
  price: string;
  title: string;
  jobTitle: string;
  image?: string;
  sellerName: string;
  sellerImage: string;
  sellerRole?: string | null;
  status?: string; // "available" | "sold"
  onViewClick?: () => void;
};

function VerifiedBadge() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-3.5 h-3.5 text-blue-500 shrink-0"
      aria-label="Verified official account"
    >
      <path
        fillRule="evenodd"
        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function MarketCard({ price, title, jobTitle, image, sellerName, sellerImage, sellerRole, status, onViewClick }: MarketCardProps) {
  const isSold = status === "sold";
  const isOfficial = sellerRole === "official_account";

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
              <div className="w-8 h-8 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sellerImage} alt={sellerName} className="rounded-full object-cover aspect-square border border-gray-200 w-full h-full" />
              </div>
              <span className={`text-sm font-medium flex items-center gap-1 ${isSold ? "text-gray-400" : "text-gray-700"}`}>
                {sellerName}
                {isOfficial && <VerifiedBadge />}
              </span>
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
