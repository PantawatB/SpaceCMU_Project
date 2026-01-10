"use client";

import React from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import MarketCard from "../../components/MarketCard";

export default function MarketMainPage() {
  const [showAddProductPopup, setShowAddProductPopup] = React.useState(false);
  const [productTitle, setProductTitle] = React.useState("");
  const [productDescription, setProductDescription] = React.useState("");
  const [productPrice, setProductPrice] = React.useState("");
  const [productImage, setProductImage] = React.useState("/noobcat.png");

  // mock data เพิ่ม sellerName, sellerImage
  const [marketItems, setMarketItems] = React.useState([
    { price: "฿450", title: "รองเท้าแตะ", jobTitle: "รองเท้าแตะ 2 ข้าง ฟหกดฟหกดหฟกดหฟกดหฟฟหกดฟหกดฟหกดฟหกดฟหก", image: "/shoe.webp", sellerName: "Kamado Tanjiro", sellerImage: "/tanjiro.jpg" },
    { price: "฿80", title: "โทรศัพท์", jobTitle: "iphone ฟหกดหกดฟหกดฟหฟหกดหฟกดกดหฟดหฟดฟห", image: "/iphone.jpg", sellerName: "Nezuko Kamado", sellerImage: "/nezuko.jpg" },
    { price: "฿70", title: "กาแฟ", jobTitle: "ฟหกดฟหกดฟกดฟหกดฟหกดหฟดฟหกดหฟกดหฟดฟหด", image: "/coffee.jpeg", sellerName: "Zenitsu Agatsuma", sellerImage: "/zenitsu.jpg" },
    { price: "฿300", title: "รถบรรทุก", jobTitle: "ฟหกดานราืนรสาหฟนากสฟราสาฟรฟนาหนรกสานรฟหกด", image: "/toy.webp", sellerName: "Inosuke Hashibira", sellerImage: "/inosuke.jpeg" },
    { price: "฿400", title: "ยาสีฟัน", jobTitle: "ฟหกนดร่นฟรห่กดนรฟหนกยรด่ฟหนรกด่ยฟหนกร่ดฟหกนรด่ฟหยนดร่", image: "/tt.webp", sellerName: "Giyu Tomioka", sellerImage: "/giyu.webp" },
    { price: "฿150", title: "กาน้ำร้อน", jobTitle: "หฟกดร้ฟหนรนร้สไฟหกดฟห่กดฟาสดนานรฟห้สาก่นรฟห่นดรา", image: "/kk.jpg", sellerName: "Shinobu Kocho", sellerImage: "/shinobu.jpg" },
    { price: "฿120", title: "ตุ๊กตาหมี", jobTitle: "ฟหกดฟหดฟหกดฟหกดนหฟกรดฟหบกดฟหกดฟหกดฟหกด", image: "/bear.webp", sellerName: "Kyojuro Rengoku", sellerImage: "/kyojuro.jpg" },
    { price: "฿200", title: "ปลากระป๋อง", jobTitle: "ฟหสกด้่ฟหรก้ดนหฟร้กดนฟหกร้ดฟหนยกรด้ฟหกนดร้หฟด", image: "/fishcan.jpg", sellerName: "Mitsuri Kanroji", sellerImage: "/mitsuri.webp" },
  ]);

  return (
    <div className="flex h-screen bg-white text-gray-800 overflow-hidden">
      {/* Sidebar: keep fixed/sticky so it won't scroll with the main content */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>

      {/* Main Content: fixed container with internal scroll */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Fixed header area (Search + Title) */}
        <div className="flex-none pt-8 px-8 pb-4 bg-white z-10">
          {/* Search bar */}
          <div className="mb-6">
            <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                />
                <line
                  x1="21"
                  y1="21"
                  x2="16.65"
                  y2="16.65"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-3 py-2 rounded-full bg-white text-sm placeholder-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Markets</h1>
            
            {/* Add Product Button */}
            <button
              onClick={() => setShowAddProductPopup(true)}
              className="flex items-center gap-2 bg-slate-600 text-white px-5 py-2.5 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              เพิ่มสินค้า
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 min-w-0">
          <div className="max-w-9xl pt-8 mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {marketItems.map((item, idx) => (
              <MarketCard key={idx} price={item.price} title={item.title} jobTitle={item.jobTitle} image={item.image} sellerName={item.sellerName} sellerImage={item.sellerImage} />
            ))}
            </div>
          </div>
        </div>
      </main>

      {/* Chatbox - Bottom Right */}
      <Chatbox />

      {/* Add Product Popup Modal */}
      {showAddProductPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowAddProductPopup(false)}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-[900px] h-[650px] overflow-hidden">
            {/* Close Button */}
            <button
              onClick={() => setShowAddProductPopup(false)}
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
              <div className="w-100 bg-gray-50 p-6 flex flex-col">
                <h3 className="text-md font-semibold text-gray-500 uppercase tracking-wide mb-6">
                  Preview
                </h3>

                {/* Preview Card */}
                <MarketCard
                  price={productPrice ? `฿${productPrice}` : "฿0"}
                  title={productTitle || "ชื่อสินค้า"}
                  jobTitle={productDescription || "รายละเอียดสินค้า..."}
                  image={productImage}
                  sellerName="Your Name"
                  sellerImage="/noobcat.png"
                />
              </div>

              {/* Right Side - Form */}
              <div className="flex-1 p-8 overflow-y-auto">
                <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                  เพิ่มสินค้าใหม่
                </h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    
                    // Create new product
                    const newProduct = {
                      price: `฿${productPrice}`,
                      title: productTitle,
                      jobTitle: productDescription,
                      image: productImage,
                      sellerName: "Your Name",
                      sellerImage: "/noobcat.png",
                    };
                    
                    // Add product to the list
                    setMarketItems(prev => [newProduct, ...prev]);
                    
                    setShowAddProductPopup(false);
                    // Reset form
                    setProductTitle("");
                    setProductDescription("");
                    setProductPrice("");
                    setProductImage("/noobcat.png");
                  }}
                  className="space-y-6"
                >
                  {/* Product Title */}
                  <div>
                    <label
                      htmlFor="productTitle"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      ชื่อสินค้า
                    </label>
                    <input
                      type="text"
                      id="productTitle"
                      value={productTitle}
                      onChange={(e) => setProductTitle(e.target.value)}
                      placeholder="เช่น รองเท้าแตะ, โทรศัพท์, ..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                  </div>

                  {/* Product Description */}
                  <div>
                    <label
                      htmlFor="productDescription"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      รายละเอียดสินค้า
                    </label>
                    <textarea
                      id="productDescription"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      placeholder="อธิบายรายละเอียดของสินค้า..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                      required
                    />
                  </div>

                  {/* Product Price */}
                  <div>
                    <label
                      htmlFor="productPrice"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      ราคา (บาท)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        ฿
                      </span>
                      <input
                        type="number"
                        id="productPrice"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Product Image */}
                  <div>
                    <label
                      htmlFor="productImage"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      รูปภาพสินค้า
                    </label>
                    <select
                      id="productImage"
                      value={productImage}
                      onChange={(e) => setProductImage(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    >
                      <option value="/noobcat.png">Noob Cat (Default)</option>
                      <option value="/shoe.webp">รองเท้า</option>
                      <option value="/iphone.jpg">โทรศัพท์</option>
                      <option value="/coffee.jpeg">กาแฟ</option>
                      <option value="/toy.webp">ของเล่น</option>
                      <option value="/tt.webp">ยาสีฟัน</option>
                      <option value="/kk.jpg">กาน้ำร้อน</option>
                      <option value="/bear.webp">ตุ๊กตาหมี</option>
                      <option value="/fishcan.jpg">ปลากระป๋อง</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      เลือกรูปภาพจากตัวอย่างที่มี
                    </p>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                      เพิ่มสินค้า
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddProductPopup(false)}
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
