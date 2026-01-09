"use client";

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-800">
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center">
          <div className="flex flex-col items-center">
            <Image
              src="/SpaceCMUlogo1.png"
              alt="SpaceCMU Logo"
              width={90}
              height={90}
              className="mb-4"
            />
            <h1 className="text-3xl font-bold mb-3">SpaceCMU</h1>
          </div>
        </div>
      </div>
      <p className="mb-6 text-gray-500">Social Media For CMU</p>
      <div className="flex gap-4 items-center mb-4"> 
        <button
          disabled
          className="px-6 py-2 rounded-lg bg-gray-300 text-gray-500 font-semibold cursor-not-allowed opacity-60 flex items-center gap-2"
        >
          <Image
            src="/cmu.png"
            alt="CMU Logo"
            width={28}
            height={28}
            className="inline-block"
          />
          CONTINUE WITH CMU ACCOUNT
        </button>
        <Link
          href="/Feeds"
          className="px-6 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
        >
          Dev
        </Link> 
      </div>
    </div>
  );
}