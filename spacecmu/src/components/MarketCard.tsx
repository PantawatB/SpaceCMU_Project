import React from "react";
import Image from "next/image";

type MarketCardProps = {
  price: string;
  title: string;
  jobTitle: string;
  image: string;
  sellerName: string;
  sellerImage: string;
};

export default function MarketCard({ price, title, jobTitle, image, sellerName, sellerImage }: MarketCardProps) {
  return (
    <article className="bg-white rounded-xl shadow-md w-full max-w-[300px] mx-auto mb-8 border border-gray-100 flex flex-col" style={{ minHeight: 350 }}>
      {/* Product Image */}
      <div className="w-full h-40">
        <Image src={image} alt={title} width={300} height={160} className="w-full h-full object-cover rounded-t-xl" />
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
                <Image src={sellerImage} alt={sellerName} width={32} height={32} className="rounded-full object-cover aspect-square border border-gray-200 w-full h-full" />
              </div>
              <span className="text-sm font-medium text-gray-700">{sellerName}</span>
            </div>
            <button className="card__btn bg-black text-white rounded-xl px-4 py-2 text-sm font-medium">view</button>
          </div>
        </div>
      </div>
    </article>
  );
}
