"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import MarketCard from "../../components/MarketCard";
import { API_CONFIG } from "@/lib/config";

interface MarketItemSeller {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface MarketItemAPI {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string | null;
  status: string;
  createdAt: string;
  seller: MarketItemSeller;
  category: string | null;
}

export default function MarketMainPage() {
  const [showAddProductPopup, setShowAddProductPopup] = React.useState(false);
  const [productTitle, setProductTitle] = React.useState("");
  const [productDescription, setProductDescription] = React.useState("");
  const [productPrice, setProductPrice] = React.useState("");
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]); // Store actual files
  const [apiMarketItems, setApiMarketItems] = useState<MarketItemAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch market items from API
  useEffect(() => {
    const fetchMarketItems = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(
          `${API_CONFIG.BASE_URL}/api/market/items`,
          {
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Market items raw response:', data);
        
        setApiMarketItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching market items:', err);
        setError('Failed to load market items');
        setApiMarketItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketItems();
  }, []);

  // Handle multiple image uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const newPreviews: string[] = [];
      let filesProcessed = 0;

      // Store the actual files
      setUploadedFiles((prev) => [...prev, ...fileArray]);

      fileArray.forEach((file, index) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews[index] = reader.result as string;
          filesProcessed++;

          if (filesProcessed === fileArray.length) {
            setImagePreviews((prev) => [...prev, ...newPreviews]);
          }
        };
        reader.readAsDataURL(file);
      });
      
      // Reset the input value so the same file can be selected again
      e.target.value = '';
    }
  };

  // Remove a specific image
  const removeImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    // Also remove from uploaded files
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // mock data เพิ่ม sellerName, sellerImage
  const [marketItems] = React.useState([
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
              Add Product
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 pb-8 min-w-0">
          <div className="max-w-9xl pt-8 mx-auto w-full">
            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <div className="text-gray-500">Loading market items...</div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <div className="text-red-500">{error}</div>
              </div>
            )}

            {/* Market Items Grid */}
            {!loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {/* API Market Items */}
                {apiMarketItems.map((item) => {
                  // Construct proper image URL
                  const imageUrl = item.imageUrl 
                    ? (item.imageUrl.startsWith('http') 
                        ? item.imageUrl 
                        : `${API_CONFIG.BASE_URL}${item.imageUrl}`)
                    : undefined; // Use undefined for gray placeholder
                  
                  const sellerAvatarUrl = item.seller.avatarUrl
                    ? (item.seller.avatarUrl.startsWith('http')
                        ? item.seller.avatarUrl
                        : `${API_CONFIG.BASE_URL}${item.seller.avatarUrl}`)
                    : "/noobcat.png";

                  console.log('Market Item:', {
                    title: item.title,
                    rawImageUrl: item.imageUrl,
                    processedImageUrl: imageUrl,
                    rawAvatarUrl: item.seller.avatarUrl,
                    processedAvatarUrl: sellerAvatarUrl
                  });

                  return (
                    <MarketCard 
                      key={item.id} 
                      price={`฿${parseFloat(item.price).toFixed(0)}`}
                      title={item.title} 
                      jobTitle={item.description} 
                      image={imageUrl} 
                      sellerName={`${item.seller.firstName} ${item.seller.lastName}`}
                      sellerImage={sellerAvatarUrl} 
                    />
                  );
                })}
                
                {/* Mock Market Items */}
                {marketItems.map((item, idx) => (
                  <MarketCard 
                    key={`mock-${idx}`} 
                    price={item.price} 
                    title={item.title} 
                    jobTitle={item.jobTitle} 
                    image={item.image} 
                    sellerName={item.sellerName} 
                    sellerImage={item.sellerImage} 
                  />
                ))}
              </div>
            )}
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
                  image={imagePreviews.length > 0 ? imagePreviews[0] : undefined}
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    
                    try {
                      // Use FormData for file upload
                      const formData = new FormData();
                      formData.append('title', productTitle);
                      formData.append('description', productDescription);
                      formData.append('price', productPrice);
                      formData.append('categoryName', 'Electronics'); // You can modify this or add a category selector
                      
                      // Append the first image file if available
                      if (uploadedFiles.length > 0) {
                        formData.append('image', uploadedFiles[0]);
                      }

                      console.log('Creating market item with FormData');

                      // Call the API with upload endpoint
                      const response = await fetch(
                        `${API_CONFIG.BASE_URL}/api/market/items/upload`,
                        {
                          method: 'POST',
                          credentials: 'include',
                          body: formData,
                          // Don't set Content-Type header - browser will set it with boundary
                        }
                      );

                      if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                      }

                      const newItem = await response.json();
                      console.log('Market item created successfully:', newItem);

                      // Add the new item to the API items list
                      setApiMarketItems(prev => [newItem, ...prev]);

                      // Close popup and reset form
                      setShowAddProductPopup(false);
                      setProductTitle("");
                      setProductDescription("");
                      setProductPrice("");
                      setImagePreviews([]);
                      setUploadedFiles([]);

                      // Show success message (optional)
                      alert('สินค้าถูกเพิ่มเรียบร้อยแล้ว!');
                    } catch (err) {
                      console.error('Error creating market item:', err);
                      alert(`เกิดข้อผิดพลาดในการเพิ่มสินค้า: ${err instanceof Error ? err.message : 'กรุณาลองใหม่อีกครั้ง'}`);
                    }
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
                      className="w-full max-w-[292px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none wrap-break-word text-sm text-gray-500 px-3 py-2"
                      style={{ 
                        lineHeight: '1.25rem',
                        height: 'auto',
                        minHeight: '2.5rem'
                      }}
                      rows={2}
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
                    <div className="space-y-3">
                      {/* Multiple Image Previews - Vertical Display */}
                      {imagePreviews.length > 0 && (
                        <div className="space-y-3">
                          {imagePreviews.map((preview, index) => (
                            <div
                              key={index}
                              className="relative w-full border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-100"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-auto object-contain"
                                style={{ maxHeight: '200px' }}
                              />
                              {/* Image Index Badge */}
                              <div className="absolute top-2 left-2 bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                                {index + 1}
                                {index === 0 && " (ปก)"}
                              </div>
                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Upload Button */}
                      <div className="flex items-center justify-center w-full">
                        <label
                          htmlFor="productImage"
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg
                              className="w-8 h-8 mb-3 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">คลิกเพื่ออัพโหลด</span> หรือลากไฟล์มาวาง
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP (เลือกได้หลายไฟล์)</p>
                          </div>
                          <input
                            id="productImage"
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                    </div>
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
