"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Chatbox from "../../components/Chatbox";
import MarketCard from "../../components/MarketCard";
import NotificationsPanel from "../../components/NotificationsPanel";
import { API_CONFIG } from "@/lib/config";
import { useUser } from "@/contexts/UserContext";
import { apiService, fetchWithToken } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface MarketItemSeller {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role?: string | null;
}

interface MarketItemAPI {
  id: string;
  title: string;
  description: string;
  price: string;
  imageUrl: string | null;
  imageUrls: string | null; // JSON string of array
  status: string;
  createdAt: string;
  seller: MarketItemSeller;
  category: string | null;
}

export default function MarketMainPage() {
  const { activeMode, refreshUser, activeUser, user } = useUser();
  const { showSuccess, showError, showWarning } = useToast();
  const [showMobileNotif, setShowMobileNotif] = React.useState(false);
  const [mobileNotifUnread, setMobileNotifUnread] = React.useState(0);
  const [showAddProductPopup, setShowAddProductPopup] = React.useState(false);
  const [showProductDetailPopup, setShowProductDetailPopup] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<MarketItemAPI | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  // ── Chat popup state ─────────────────────────────────────────────────────
  const [showChatPopup, setShowChatPopup] = React.useState(false);
  const [chatPopupMessage, setChatPopupMessage] = React.useState("");
  const [isSendingChat, setIsSendingChat] = React.useState(false);
  const chatPopupTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ── Manage item state (owner only) ───────────────────────────────────────
  const [isManaging, setIsManaging] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [productTitle, setProductTitle] = React.useState("");
  const [productDescription, setProductDescription] = React.useState("");
  const [productPrice, setProductPrice] = React.useState("");
  const [imagePreviews, setImagePreviews] = React.useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]); // Store actual files
  const [apiMarketItems, setApiMarketItems] = useState<MarketItemAPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModeWarning, setShowModeWarning] = useState(false);
  const [addProductStep, setAddProductStep] = useState<"form" | "preview">("form");

  // ── Ban detection state ──────────────────────────────────────────────────
  const isPublicBanned = user?.status === 'banned';
  const [showMarketBanPopup, setShowMarketBanPopup] = useState(false);

  // Show ban popup as soon as we know the public user is banned
  useEffect(() => {
    if (isPublicBanned) {
      setShowMarketBanPopup(true);
    }
  }, [isPublicBanned]);

  // ── Infinite scroll state ────────────────────────────────────────────────
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const marketScrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  // Force switch to PUBLIC mode when entering Market page
  // (but NOT if the public account is banned — ban overlay handles that case)
  useEffect(() => {
    const switchToPublicMode = async () => {
      if (activeMode === "ANONYMOUS" && !isPublicBanned) {
        try {
          // Show warning toast
          setShowModeWarning(true);
          
          // Auto-hide toast after 4 seconds
          setTimeout(() => {
            setShowModeWarning(false);
          }, 4000);

          // Switch to PUBLIC mode
          await apiService.switchMode("PUBLIC");
          await refreshUser(true); // Silent refresh
        } catch {
          // Switch failed silently — ban overlay handles the state
        }
      }
    };

    switchToPublicMode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  // Fetch initial market items from API
  useEffect(() => {
    const fetchMarketItems = async () => {
      setLoading(true);
      setError(null);
      setNextCursor(null);
      setHasMore(false);

      try {
        const response = await fetchWithToken(
          `${API_CONFIG.BASE_URL}/api/market/items?limit=20`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setApiMarketItems(Array.isArray(data) ? data : (data.items ?? []));
        setNextCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore ?? false);
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

  // Load more items when sentinel enters viewport
  const loadMoreItems = useCallback(async () => {
    if (!nextCursor || !hasMore || isLoadingMoreRef.current) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const response = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/market/items?limit=20&cursor=${encodeURIComponent(nextCursor)}`,
      );

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const moreItems: MarketItemAPI[] = Array.isArray(data) ? data : (data.items ?? []);

      setApiMarketItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        return [...prev, ...moreItems.filter((i) => !existingIds.has(i.id))];
      });
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      console.error('Error loading more market items:', err);
    } finally {
      setIsLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [nextCursor, hasMore]);

  // IntersectionObserver — trigger loadMoreItems when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMoreRef.current) {
          loadMoreItems();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMoreItems]);

  // Handle multiple image uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      
      // Check if adding these files would exceed the limit
      const totalFiles = uploadedFiles.length + fileArray.length;
      if (totalFiles > 10) {
        showWarning(`สามารถอัพโหลดได้สูงสุด 10 รูปเท่านั้น\nปัจจุบันมี ${uploadedFiles.length} รูป กำลังเพิ่ม ${fileArray.length} รูป`);
        e.target.value = '';
        return;
      }

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

  // ── ส่งแชทหาผู้ขาย ────────────────────────────────────────────────────────
  const handleSendChatToSeller = async () => {
    if (!selectedProduct || !chatPopupMessage.trim()) return;
    setIsSendingChat(true);
    try {
      // 1) หา / สร้าง direct room กับผู้ขาย (idempotent)
      const roomResult = await apiService.post<{ room: { id: string } }>(
        "/api/chat-rooms/direct",
        { otherUserId: selectedProduct.seller.id }
      );
      const roomId = roomResult?.room?.id;
      if (!roomId) throw new Error("ไม่สามารถสร้างห้องแชทได้");

      // 2) สร้าง Market Card message เป็น JSON payload พิเศษ
      // Build absolute URLs for all images
      const toAbsUrl = (url: string) =>
        url.startsWith("http") ? url : `${API_CONFIG.BASE_URL}${url}`;

      // Parse imageUrls (JSON string array from API)
      let allImageUrls: string[] = [];
      if (selectedProduct.imageUrls) {
        try {
          const parsed = JSON.parse(selectedProduct.imageUrls);
          if (Array.isArray(parsed)) {
            allImageUrls = parsed.map(toAbsUrl);
          }
        } catch { /* ignore parse error */ }
      }
      // Fallback: use single imageUrl if no imageUrls array
      if (allImageUrls.length === 0 && selectedProduct.imageUrl) {
        allImageUrls = [toAbsUrl(selectedProduct.imageUrl)];
      }

      const sellerAvatarAbs = selectedProduct.seller.avatarUrl
        ? toAbsUrl(selectedProduct.seller.avatarUrl)
        : null;

      const cardContent = JSON.stringify({
        __type: "market_card",
        itemId: selectedProduct.id,
        title: selectedProduct.title,
        price: parseFloat(selectedProduct.price).toFixed(0),
        description: selectedProduct.description,
        imageUrl: allImageUrls[0] ?? null,
        imageUrls: allImageUrls,
        sellerName: `${selectedProduct.seller.firstName} ${selectedProduct.seller.lastName}`,
        sellerAvatarUrl: sellerAvatarAbs,
        sellerRole: selectedProduct.seller.role ?? null,
      });

      // ส่ง Market Card ก่อน
      await apiService.post("/api/messages", {
        roomId,
        content: cardContent,
      });

      // 3) ส่งข้อความของ user ต่อท้าย (ถ้ามี)
      const userMsg = chatPopupMessage.trim();
      if (userMsg) {
        await apiService.post("/api/messages", {
          roomId,
          content: userMsg,
        });
      }

      setShowChatPopup(false);
      setChatPopupMessage("");
      showSuccess(`ส่งข้อความหา ${selectedProduct.seller.firstName} ${selectedProduct.seller.lastName} แล้ว!`);
    } catch (err) {
      showError(`ส่งข้อความไม่สำเร็จ: ${err instanceof Error ? err.message : "กรุณาลองใหม่"}`);
    } finally {
      setIsSendingChat(false);
    }
  };

  // ── Mark item as sold ────────────────────────────────────────────────────
  const handleMarkAsSold = async () => {
    if (!selectedProduct) return;
    setIsManaging(true);
    try {
      const response = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/market/items/${selectedProduct.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: selectedProduct.status === "sold" ? "available" : "sold" }),
        }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const newStatus = selectedProduct.status === "sold" ? "available" : "sold";
      setApiMarketItems((prev) =>
        prev.map((item) =>
          item.id === selectedProduct.id ? { ...item, status: newStatus } : item
        )
      );
      setSelectedProduct((prev) => prev ? { ...prev, status: newStatus } : prev);
      showSuccess(newStatus === "sold" ? "ทำเครื่องหมายว่าขายแล้ว!" : "เปิดขายอีกครั้งแล้ว!");
    } catch (err) {
      showError(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : "กรุณาลองใหม่"}`);
    } finally {
      setIsManaging(false);
    }
  };

  // ── Delete item ──────────────────────────────────────────────────────────
  const handleDeleteItem = async () => {
    if (!selectedProduct) return;
    setIsManaging(true);
    try {
      const response = await fetchWithToken(
        `${API_CONFIG.BASE_URL}/api/market/items/${selectedProduct.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setApiMarketItems((prev) => prev.filter((item) => item.id !== selectedProduct.id));
      setSelectedProduct(null);
      setShowDeleteConfirm(false);
      setCurrentImageIndex(0);
      showSuccess("ลบสินค้าเรียบร้อยแล้ว!");
    } catch (err) {
      showError(`ลบไม่สำเร็จ: ${err instanceof Error ? err.message : "กรุณาลองใหม่"}`);
    } finally {
      setIsManaging(false);
    }
  };

  return (
    <div className="flex h-dvh bg-white text-gray-800 overflow-hidden" style={{ height: '100dvh' }}>
      {/* Sidebar: keep fixed/sticky so it won't scroll with the main content */}
      <div className="flex-none h-screen sticky top-0 z-30">
        <Sidebar />
      </div>

      {/* Main Content: fixed container with internal scroll */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative">

        {/* ── Public-ban overlay ── */}
        {isPublicBanned && (
          <div className="absolute inset-0 z-40 backdrop-blur-md bg-white/60 flex items-center justify-center">
            {showMarketBanPopup && (
              <div className="bg-white rounded-2xl shadow-2xl border border-red-100 max-w-sm w-full p-8 mx-4 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-lg font-bold text-slate-900">คุณถูกแบนจาก Market</h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    บัญชี Public ของคุณถูกระงับการใช้งาน Market
                    กรุณาติดต่อผู้ดูแลระบบหากคิดว่าเกิดข้อผิดพลาด
                  </p>
                </div>
                <button
                  onClick={() => setShowMarketBanPopup(false)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
                >
                  รับทราบ
                </button>
              </div>
            )}
          </div>
        )}
        {/* Fixed header area (Search + Title) */}
        <div className="flex-none pt-4 lg:pt-8 px-4 lg:px-8 pb-4 bg-white z-10">
          {/* Search bar */}
          <div className="mb-4 lg:mb-6 pl-14 lg:pl-0">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" />
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
            <h1 className="text-xl lg:text-2xl font-bold">Markets</h1>

            {/* Add Product Button — icon only on mobile, full on desktop */}
            <button
              onClick={() => setShowAddProductPopup(true)}
              className="flex items-center gap-2 bg-slate-600 text-white px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
            >
              <svg className="w-5 h-5 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Add Product</span>
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div ref={marketScrollRef} className="flex-1 overflow-y-auto px-4 lg:px-8 pb-8 min-w-0">
          <div className="max-w-9xl pt-4 lg:pt-8 mx-auto w-full">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-8">
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
                    : "/default-avatar.svg";

                  return (
                    <MarketCard 
                      key={item.id} 
                      price={`฿${parseFloat(item.price).toFixed(0)}`}
                      title={item.title} 
                      jobTitle={item.description} 
                      image={imageUrl} 
                      sellerName={`${item.seller.firstName} ${item.seller.lastName}`}
                      sellerImage={sellerAvatarUrl}
                      sellerRole={item.seller.role}
                      status={item.status}
                      onViewClick={() => {
                        setSelectedProduct(item);
                        setShowProductDetailPopup(true);
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Sentinel for IntersectionObserver */}
            <div ref={sentinelRef} className="h-1" />

            {/* Load more indicator */}
            {isLoadingMore && (
              <div className="flex justify-center items-center py-6">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  กำลังโหลดสินค้าเพิ่มเติม...
                </div>
              </div>
            )}

            {/* End of list */}
            {!loading && !hasMore && apiMarketItems.length > 0 && (
              <div className="flex justify-center items-center py-6 text-gray-300 text-xs">
                — แสดงสินค้าทั้งหมดแล้ว —
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Chatbox - Bottom Right */}
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

      {/* Add Product Popup Modal */}
      {showAddProductPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => { setShowAddProductPopup(false); setAddProductStep("form"); }}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-xl lg:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => { setShowAddProductPopup(false); setAddProductStep("form"); }}
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
            <div className="flex flex-1 overflow-hidden">

              {/* Left Side - Preview Panel (hidden on mobile unless step=preview) */}
              <div className={`lg:w-72 xl:w-80 lg:border-r border-gray-200 bg-gray-50 flex flex-col transition-all duration-300 ${addProductStep === "preview" ? "flex w-full" : "hidden lg:flex"}`}>
                {/* Mobile preview header with back button */}
                <div className="lg:hidden flex items-center gap-3 px-5 pt-5 pb-3">
                  <button
                    type="button"
                    onClick={() => setAddProductStep("form")}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    กลับ
                  </button>
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Preview</span>
                </div>

                <div className="px-5 lg:px-6 pt-0 lg:pt-6 pb-6 flex-1 overflow-y-auto">
                  <h3 className="hidden lg:block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Preview</h3>
                  <MarketCard
                    price={productPrice ? `฿${productPrice}` : "฿0"}
                    title={productTitle || "ชื่อสินค้า"}
                    jobTitle={productDescription || "รายละเอียดสินค้า..."}
                    image={imagePreviews.length > 0 ? imagePreviews[0] : undefined}
                    sellerName="Your Name"
                    sellerImage="/default-avatar.svg"
                  />
                </div>
              </div>

              {/* Right Side - Form Panel */}
              <div className={`flex-1 flex flex-col overflow-y-auto transition-all duration-300 ${addProductStep === "preview" ? "hidden lg:flex" : "flex"}`}>
                {/* Mobile step header — title + Preview button side by side */}
                <div className="lg:hidden flex items-center gap-3 px-5 pt-5 pb-2">
                  <h2 className="text-xl font-semibold text-gray-800">เพิ่มสินค้าใหม่</h2>
                  <button
                    type="button"
                    onClick={() => setAddProductStep("preview")}
                    className="flex items-center gap-1 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                </div>

                <div className="px-5 lg:px-8 pt-0 lg:pt-8 pb-5 lg:pb-8">
                  <h2 className="hidden lg:block text-2xl font-semibold text-gray-800 mb-6 pr-8">
                    เพิ่มสินค้าใหม่
                  </h2>

                <form
                  id="addProductForm"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    
                    try {
                      // Validate images (optional now - can upload without images)
                      if (uploadedFiles.length > 10) {
                        showWarning('สามารถอัพโหลดได้สูงสุด 10 รูปเท่านั้น');
                        return;
                      }

                      // Use FormData for file upload
                      const formData = new FormData();
                      formData.append('title', productTitle);
                      formData.append('description', productDescription);
                      formData.append('price', productPrice);
                      formData.append('categoryName', 'Electronics'); // You can modify this or add a category selector
                      
                      // Append images if available
                      if (uploadedFiles.length > 0) {
                        // Append all images (up to 10)
                        const filesToUpload = uploadedFiles.slice(0, 10);
                        filesToUpload.forEach((file) => {
                          formData.append('images', file);
                        });
                      }

                      for (const [, value] of formData.entries()) {
                        if (value instanceof File) {
                        } else {
                        }
                      }

                      // Call the API with upload endpoint
                      const response = await fetchWithToken(
                        `${API_CONFIG.BASE_URL}/api/market/items/upload`,
                        {
                          method: 'POST',
                          body: formData,
                          // Don't set Content-Type header - browser will set it with boundary
                        }
                      );

                      const responseText = await response.text();

                      if (!response.ok) {
                        let errorMessage = `HTTP error! status: ${response.status}`;
                        try {
                          const errorData = JSON.parse(responseText);
                          errorMessage = errorData.message || errorMessage;
                        } catch {
                          // Response is not JSON
                        }
                        throw new Error(errorMessage);
                      }

                      const newItem = JSON.parse(responseText);

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
                      showSuccess('สินค้าถูกเพิ่มเรียบร้อยแล้ว!');
                    } catch (err) {
                      console.error('Error creating market item:', err);
                      showError(`เกิดข้อผิดพลาดในการเพิ่มสินค้า: ${err instanceof Error ? err.message : 'กรุณาลองใหม่อีกครั้ง'}`);
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
                      className="w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm text-gray-800 px-3 py-2"
                      style={{ 
                        lineHeight: '1.5rem',
                        minHeight: '5rem'
                      }}
                      rows={3}
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
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP (สูงสุด 10 รูป, 5MB/รูป)</p>
                            {uploadedFiles.length > 0 && (
                              <p className="text-xs text-blue-600 font-medium mt-2">
                                เลือกแล้ว {uploadedFiles.length}/10 รูป
                              </p>
                            )}
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
                  <div className="flex gap-3 pt-4 pb-2">
                    <button
                      type="submit"
                      form="addProductForm"
                      className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                    >
                      เพิ่มสินค้า
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowAddProductPopup(false); setAddProductStep("form"); }}
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
        </div>
      )}

      {/* Product Detail Popup Modal */}
      {showProductDetailPopup && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setShowProductDetailPopup(false);
              setSelectedProduct(null);
              setCurrentImageIndex(0);
              setShowDeleteConfirm(false);
            }}
          />

          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl lg:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowProductDetailPopup(false);
                setSelectedProduct(null);
                setCurrentImageIndex(0);
                setShowDeleteConfirm(false);
              }}
              className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded-full p-2 shadow-lg"
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
            <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
              {/* Left Side - Product Image with Navigation */}
              <div className="w-full md:w-1/2 bg-gray-50 p-5 sm:p-8 flex items-center justify-center relative flex-none md:flex-none md:overflow-y-auto">

                {/* SOLD full-panel overlay */}
                {selectedProduct.status === "sold" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-tl-2xl rounded-bl-2xl pointer-events-none">
                    <div className="border-[3px] border-white rounded-lg px-8 py-3 -rotate-12">
                      <span className="text-white font-black tracking-[0.3em] text-3xl uppercase" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                        SOLD
                      </span>
                    </div>
                  </div>
                )}

                <div className="w-full aspect-square max-w-md bg-white rounded-2xl overflow-hidden shadow-md relative flex items-center justify-center">
                  {(() => {
                    // Parse imageUrls if available, otherwise use single imageUrl
                    let images: string[] = [];
                    if (selectedProduct.imageUrls) {
                      try {
                        const parsed = JSON.parse(selectedProduct.imageUrls);
                        images = Array.isArray(parsed) ? parsed : [];
                      } catch (e) {
                        console.error('Failed to parse imageUrls:', e);
                      }
                    }
                    
                    // Fallback to single imageUrl if no imageUrls
                    if (images.length === 0 && selectedProduct.imageUrl) {
                      images = [selectedProduct.imageUrl];
                    }

                    const totalImages = images.length;
                    const hasMultipleImages = totalImages > 1;

                    // Get current image URL
                    const currentImageUrl = images[currentImageIndex] || null;

                    if (currentImageUrl) {
                      const fullImageUrl = currentImageUrl.startsWith('http') 
                        ? currentImageUrl 
                        : `${API_CONFIG.BASE_URL}${currentImageUrl}`;

                      return (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fullImageUrl}
                            alt={`${selectedProduct.title} - ${currentImageIndex + 1}`}
                            className="w-full h-full object-contain"
                          />
                          
                          {/* Navigation Arrows - Show only if multiple images */}
                          {hasMultipleImages && (
                            <>
                              {/* Previous Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex((prev) => 
                                    prev === 0 ? totalImages - 1 : prev - 1
                                  );
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                                aria-label="Previous image"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>

                              {/* Next Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentImageIndex((prev) => 
                                    prev === totalImages - 1 ? 0 : prev + 1
                                  );
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2.5 shadow-lg transition-all hover:scale-110 z-10"
                                aria-label="Next image"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </>
                          )}
                          
                          {/* Image Counter */}
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm z-10">
                            {currentImageIndex + 1} / {totalImages}
                          </div>
                        </>
                      );
                    } else {
                      // No image placeholder
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg 
                            className="w-32 h-32 text-gray-400" 
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
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Right Side - Product Details */}
              <div className="w-full md:w-1/2 p-5 sm:p-8 flex flex-col md:overflow-y-auto">
                {/* Product Title and Price */}
                <div className="mb-6">
                  <div className="flex items-start gap-3 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex-1">
                      {selectedProduct.title}
                    </h2>
                    {selectedProduct.status === "sold" && (
                      <span className="shrink-0 mt-1 inline-flex items-center gap-1 bg-gray-900 text-white text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-md">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Sold
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className={`text-3xl sm:text-4xl font-bold ${selectedProduct.status === "sold" ? "text-gray-300 line-through" : "text-orange-600"}`}>
                      ฿{parseFloat(selectedProduct.price).toFixed(0)}
                    </span>
                    {selectedProduct.status === "sold" && (
                      <span className="text-sm text-gray-400 font-medium">สินค้าชิ้นนี้ขายแล้ว</span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200 my-6"></div>

                {/* Product Description */}
                <div className="mb-6 flex-1">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    รายละเอียดสินค้า
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedProduct.description}
                  </p>
                </div>

                {/* Category (if available) */}
                {selectedProduct.category && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      หมวดหมู่
                    </h3>
                    <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {selectedProduct.category}
                    </span>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-gray-200 my-6"></div>

                {/* Seller Information */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    ผู้ขาย
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedProduct.seller.avatarUrl
                          ? (selectedProduct.seller.avatarUrl.startsWith('http')
                              ? selectedProduct.seller.avatarUrl
                              : `${API_CONFIG.BASE_URL}${selectedProduct.seller.avatarUrl}`)
                          : "/default-avatar.svg"}
                        alt={`${selectedProduct.seller.firstName} ${selectedProduct.seller.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 flex items-center gap-1">
                        {selectedProduct.seller.firstName} {selectedProduct.seller.lastName}
                        {selectedProduct.seller.role === "official_account" && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 shrink-0" aria-label="Verified official account">
                            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                          </svg>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedProduct.seller.id === activeUser?.id ? "ผู้ขาย (คุณ)" : "ผู้ขาย"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Seller Button — ซ่อนถ้าเป็นสินค้าของตัวเอง */}
                {selectedProduct.seller.id !== activeUser?.id ? (
                  <button
                    onClick={() => {
                      setShowChatPopup(true);
                      setTimeout(() => chatPopupTextareaRef.current?.focus(), 100);
                    }}
                    className="w-full bg-slate-600 text-white py-3 sm:py-4 px-6 rounded-xl hover:bg-slate-700 transition-colors font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
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
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
                      />
                    </svg>
                    ทักแชทหาผู้ขาย
                  </button>
                ) : (
                  /* Owner actions */
                  <div className="flex flex-col gap-3">
                    {/* Status badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
                        selectedProduct.status === "sold"
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${selectedProduct.status === "sold" ? "bg-red-500" : "bg-green-500"}`} />
                        {selectedProduct.status === "sold" ? "ขายแล้ว" : "กำลังขาย"}
                      </span>
                      <span className="text-xs text-gray-400">สินค้าของคุณ</span>
                    </div>

                    {/* Mark as sold / reopen button */}
                    <button
                      onClick={handleMarkAsSold}
                      disabled={isManaging}
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-base transition-all flex items-center justify-center gap-2 shadow ${
                        selectedProduct.status === "sold"
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-orange-500 hover:bg-orange-600 text-white"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isManaging ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                      ) : selectedProduct.status === "sold" ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {selectedProduct.status === "sold" ? "เปิดขายอีกครั้ง" : "ทำเครื่องหมายว่าขายแล้ว"}
                    </button>

                    {/* Delete button */}
                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isManaging}
                        className="w-full py-3 px-6 rounded-xl font-semibold text-base border-2 border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        ลบสินค้า
                      </button>
                    ) : (
                      <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3">
                        <p className="text-sm text-red-600 font-medium text-center mb-3">ยืนยันการลบสินค้านี้?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeleteItem}
                            disabled={isManaging}
                            className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-1"
                          >
                            {isManaging ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : null}
                            ยืนยันลบ
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isManaging}
                            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold text-sm transition-colors"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Posted Date */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-400">
                    โพสต์เมื่อ {new Date(selectedProduct.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Popup Modal ─────────────────────────────────────────────────── */}
      {showChatPopup && selectedProduct && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowChatPopup(false); setChatPopupMessage(""); }}
          />
          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedProduct.seller.avatarUrl
                    ? (selectedProduct.seller.avatarUrl.startsWith("http")
                        ? selectedProduct.seller.avatarUrl
                        : `${API_CONFIG.BASE_URL}${selectedProduct.seller.avatarUrl}`)
                    : "/default-avatar.svg"}
                  alt={selectedProduct.seller.firstName}
                  className="w-9 h-9 rounded-full object-cover border border-gray-200"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/default-avatar.svg"; }}
                />
                <div>
                  <p className="text-gray-900 font-semibold text-sm leading-tight">
                    {selectedProduct.seller.firstName} {selectedProduct.seller.lastName}
                  </p>
                  <p className="text-gray-400 text-xs">ทักแชทหาผู้ขาย</p>
                </div>
              </div>
              <button
                onClick={() => { setShowChatPopup(false); setChatPopupMessage(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Market Card Preview */}
            <div className="mx-5 mt-4 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex gap-3 p-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex-none bg-gray-200">
                {selectedProduct.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.imageUrl.startsWith("http")
                      ? selectedProduct.imageUrl
                      : `${API_CONFIG.BASE_URL}${selectedProduct.imageUrl}`}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{selectedProduct.title}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{selectedProduct.description}</p>
                <p className="text-orange-600 font-bold text-sm mt-1">฿{parseFloat(selectedProduct.price).toFixed(0)}</p>
              </div>
            </div>

            {/* Message input */}
            <div className="px-5 py-4">
              <textarea
                ref={chatPopupTextareaRef}
                rows={3}
                placeholder="พิมพ์ข้อความถึงผู้ขาย..."
                value={chatPopupMessage}
                onChange={(e) => setChatPopupMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChatToSeller();
                  }
                }}
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-200 transition resize-none leading-relaxed"
              />
            </div>

            {/* Send button */}
            <div className="px-5 pb-5">
              <button
                disabled={!chatPopupMessage.trim() || isSendingChat}
                onClick={handleSendChatToSeller}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  chatPopupMessage.trim() && !isSendingChat
                    ? "bg-slate-700 hover:bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                {isSendingChat ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
                {isSendingChat ? "กำลังส่ง..." : "ส่งข้อความ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mode Warning Toast */}
      {showModeWarning && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className="relative w-[330px] h-20 rounded-lg bg-white shadow-[rgba(149,157,165,0.2)_0px_8px_24px] overflow-hidden flex items-center justify-around gap-4 px-4 py-2.5">
            {/* Wave Background */}
            <svg 
              className="absolute left-[-31px] top-8 w-20 rotate-90 fill-[#ffa30d3a]" 
              viewBox="0 0 1440 320" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M0,256L11.4,240C22.9,224,46,192,69,192C91.4,192,114,224,137,234.7C160,245,183,235,206,213.3C228.6,192,251,160,274,149.3C297.1,139,320,149,343,181.3C365.7,213,389,267,411,282.7C434.3,299,457,277,480,250.7C502.9,224,526,192,549,181.3C571.4,171,594,181,617,208C640,235,663,277,686,256C708.6,235,731,149,754,122.7C777.1,96,800,128,823,165.3C845.7,203,869,245,891,224C914.3,203,937,117,960,112C982.9,107,1006,181,1029,197.3C1051.4,213,1074,171,1097,144C1120,117,1143,107,1166,133.3C1188.6,160,1211,224,1234,218.7C1257.1,213,1280,139,1303,133.3C1325.7,128,1349,192,1371,192C1394.3,192,1417,128,1429,96L1440,64L1440,320L1428.6,320C1417.1,320,1394,320,1371,320C1348.6,320,1326,320,1303,320C1280,320,1257,320,1234,320C1211.4,320,1189,320,1166,320C1142.9,320,1120,320,1097,320C1074.3,320,1051,320,1029,320C1005.7,320,983,320,960,320C937.1,320,914,320,891,320C868.6,320,846,320,823,320C800,320,777,320,754,320C731.4,320,709,320,686,320C662.9,320,640,320,617,320C594.3,320,571,320,549,320C525.7,320,503,320,480,320C457.1,320,434,320,411,320C388.6,320,366,320,343,320C320,320,297,320,274,320C251.4,320,229,320,206,320C182.9,320,160,320,137,320C114.3,320,91,320,69,320C45.7,320,23,320,11,320L0,320Z" 
                fillOpacity={1} 
              />
            </svg>

            {/* Icon Container */}
            <div className="relative w-[35px] h-[35px] flex justify-center items-center bg-[#ffa30d48] rounded-full ml-2 shrink-0">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 256 256" 
                strokeWidth={0} 
                fill="currentColor" 
                className="w-[17px] h-[17px] text-[#db970e]"
              >
                <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z" />
              </svg>
            </div>

            {/* Message Text */}
            <div className="flex flex-col justify-center items-start grow">
              <p className="m-0 text-[#db970e] text-[17px] font-bold cursor-default">
                ไม่สามารถใช้งาน Market
              </p>
              <p className="m-0 text-sm text-[#555] cursor-default">
                ระบบเปลี่ยนเป็นโหมด Public แล้ว
              </p>
            </div>

            {/* Close Icon */}
            <button
              onClick={() => setShowModeWarning(false)}
              className="shrink-0"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 15 15" 
                strokeWidth={0} 
                fill="none" 
                className="w-[18px] h-[18px] text-[#555] cursor-pointer hover:text-[#333] transition-colors"
              >
                <path 
                  fill="currentColor" 
                  d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" 
                  clipRule="evenodd" 
                  fillRule="evenodd" 
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
