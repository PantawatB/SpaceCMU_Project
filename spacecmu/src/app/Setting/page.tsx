"use client";
import Sidebar from "../../components/Sidebar";

export default function SettingPage() {

  return (
    <div className="flex min-h-screen bg-white text-gray-800">
      {/* Sidebar */}
      <Sidebar />
      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Setting content ไม่มี SearchBar */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4">Setting</h1>
          {/* ...setting content... */}
        </div>
      </main>
    </div>
  )
}
