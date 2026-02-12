import React from "react";

type MarketCardProps = {
  price: string;
  title: string;
  jobTitle: string;
  image?: string; // Make image optional
  sellerName: string;
  sellerImage: string;
  onViewClick?: () => void;
};

export default function MarketCard({ price, title, jobTitle, image, sellerName, sellerImage, onViewClick }: MarketCardProps) {
  return (
    <article className="bg-white rounded-xl shadow-md w-full max-w-[300px] mx-auto mb-8 border border-gray-100 flex flex-col" style={{ minHeight: 350 }}>
      {/* Product Image */}
      <div className="w-full h-40 bg-gray-200 rounded-t-xl">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt={title} className="w-full h-full object-cover rounded-t-xl" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 rounded-t-xl">
            <svg 
              className="w-16 h-16 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
          </div>
        )}
      </div>
      {/* Card Content */}
      <div className="flex-1 flex flex-col justify-between p-4 pb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{title}</h3>
          <p className="text-sm text-gray-500 mb-2 line-clamp-2 min-h-10 wrap-break-word">{jobTitle}</p>
          <span className="text-sm font-semibold text-orange-600 block mb-3 truncate">{price}</span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sellerImage} alt={sellerName} className="rounded-full object-cover aspect-square border border-gray-200 w-full h-full" />
              </div>
              <span className="text-sm font-medium text-gray-700">{sellerName}</span>
            </div>
            <button className="card__btn bg-black text-white rounded-xl px-4 py-2 text-sm font-medium" onClick={onViewClick}>view</button>
          </div>
        </div>
      </div>
    </article>
  );
}
