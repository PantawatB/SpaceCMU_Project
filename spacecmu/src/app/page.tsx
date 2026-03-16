"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import styles from "./TermsCheckbox.module.css";

export default function HomePage() {
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white text-gray-800">
      {/* Logo & Title */}
      <div className="flex flex-col items-center mb-2">
        <Image
          src="/SpaceCMUlogo1.png"
          alt="SpaceCMU Logo"
          width={90}
          height={90}
          className="mb-4"
        />
        <h1 className="text-3xl font-bold mb-3">SpaceCMU</h1>
      </div>
      <p className="mb-8 text-gray-500">Social Media For CMU</p>

      {/* Terms Agreement Row */}
      <div className="flex items-center gap-3 mb-5">
        <label className={styles.container}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <div className={styles.checkmark} />
        </label>
        <span className="text-sm text-gray-600">
          ฉันยอมรับ{" "}
          <button
            onClick={() => setShowTerms(true)}
            className="text-slate-600 underline hover:text-slate-800 font-medium transition"
          >
            ข้อกำหนดการใช้งาน SpaceCMU
          </button>
        </span>
      </div>

      {/* CMU Login Button */}
      <div className="flex gap-4 items-center mb-4">
        {agreed ? (
          <Link
            href={`${process.env.NEXT_PUBLIC_API_URL}/api/auth/cmu/login`}
            className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 bg-purple-600 text-white hover:bg-purple-700 transition"
          >
            <Image
              src="/cmu.png"
              alt="CMU Logo"
              width={28}
              height={28}
              className="inline-block"
            />
            CONTINUE WITH CMU ACCOUNT
          </Link>
        ) : (
          <button
            disabled
            className="px-6 py-2 rounded-lg font-semibold flex items-center gap-2 bg-gray-300 text-gray-400 cursor-not-allowed select-none"
            title="กรุณายอมรับข้อกำหนดการใช้งานก่อน"
          >
            <Image
              src="/cmu.png"
              alt="CMU Logo"
              width={28}
              height={28}
              className="inline-block opacity-40"
            />
            CONTINUE WITH CMU ACCOUNT
          </button>
        )}
      </div>

      {/* Terms of Use Popup */}
      {showTerms && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowTerms(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Image
                  src="/SpaceCMUlogo1.png"
                  alt="SpaceCMU"
                  width={28}
                  height={28}
                />
                <h2 className="text-lg font-bold text-gray-800">
                  ข้อกำหนดการใช้งาน SpaceCMU
                </h2>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-6 py-5 text-sm text-gray-700 leading-relaxed space-y-4">
              <p className="text-xs text-gray-400">
                มีผลบังคับใช้: 14 มีนาคม 2569
              </p>

              <section>
                <p>
                  ยินดีต้อนรับสู่ SpaceCMU
                  แพลตฟอร์มสำหรับนักศึกษาและบุคลากรของมหาวิทยาลัยเชียงใหม่
                  การเข้าใช้งานเว็บไซต์หรือบริการของ SpaceCMU
                  ถือว่าผู้ใช้งานยอมรับข้อกำหนดต่อไปนี้
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  1. การใช้งานแพลตฟอร์ม
                </h3>
                <p>
                  SpaceCMU เป็นพื้นที่เปิดสำหรับการสื่อสาร แลกเปลี่ยนความคิดเห็น
                  ซื้อขาย และทำกิจกรรมต่าง ๆ ภายในชุมชนมหาวิทยาลัย
                  ผู้ใช้งานสามารถใช้งานแพลตฟอร์มได้อย่างอิสระ
                  ตราบใดที่การใช้งานนั้นไม่ขัดต่อกฎหมาย
                  และไม่ละเมิดสิทธิของผู้อื่น
                </p>
                <p>การกระทำที่ห้ามโดยเด็ดขาด ได้แก่ (แต่ไม่จำกัดเพียง)</p>
                <p className="ml-4"> 1.1 การกระทำที่ผิดกฎหมาย</p>
                <p className="ml-4">
                  {" "}
                  1.2 การคุกคาม ข่มขู่ หรือกลั่นแกล้งผู้อื่น
                </p>
                <p className="ml-4">
                  {" "}
                  1.3 การเผยแพร่ข้อมูลที่เป็นอันตรายหรือผิดกฎหมาย
                </p>
                <p className="ml-4">
                  {" "}
                  1.4 การใช้แพลตฟอร์มเพื่อการหลอกลวงหรือฉ้อโกง
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  2. คุณสมบัติของผู้ใช้งาน
                </h3>
                <p>
                  SpaceCMU เป็นแพลตฟอร์มโซเชียลมีเดียสำหรับนักศึกษา และบุคลากร
                  ของมหาวิทยาลัยเชียงใหม่ (CMU) เท่านั้น
                  ผู้ใช้ต้องเข้าสู่ระบบด้วยบัญชี CMU Account
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  3. ความเป็นส่วนตัวและการไม่เปิดเผยตัวตน
                </h3>
                <p>
                  SpaceCMU ให้ความสำคัญกับความเป็นส่วนตัวของผู้ใช้งานอย่างสูงสุด
                  ผู้พัฒนา ไม่มีนโยบายเปิดเผยตัวตน ข้อมูล ของผู้ใช้งานโดยเด็ดขาด
                  ไม่ว่าด้วยเหตุผลด้านผลประโยชน์ทางธุรกิจ การเมือง
                  หรือแรงกดดันทางสังคมใด ๆ แม้ว่าจะเกิดเหตุการณ์ดราม่า
                  ความขัดแย้ง หรือกระแสสังคมใด ๆ ผู้พัฒนาจะยังคงยึดมั่นในหลักการ
                  ไม่เปิดเผยข้อมูลส่วนบุคคลของผู้ใช้งาน
                </p>
              </section>
              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  4. ข้อยกเว้นในการเปิดเผยข้อมูล
                </h3>
                <p>
                  อย่างไรก็ตาม หากมี การกระทำผิดกฎหมายร้ายแรง เช่น
                  การกระทำความผิดทางอาญา การคุกคามอย่างรุนแรง การหลอกลวง
                  หรือความผิดที่ส่งผลกระทบต่อความปลอดภัยของบุคคลหรือสาธารณะ
                </p>
                <p>ผู้พัฒนาอาจต้องดำเนินการดังต่อไปนี้</p>
                <p className="ml-4">
                  {" "}
                  4.1 ให้ความร่วมมือกับหน่วยงานที่มีอำนาจตามกฎหมาย
                </p>
                <p className="ml-4"> 4.2 สนับสนุนกระบวนการยุติธรรมตามสมควร</p>
                <p className="ml-4">
                  {" "}
                  4.3 เปิดเผยข้อมูลที่จำเป็นตามคำสั่งทางกฎหมาย
                </p>
                <p>
                  ทั้งนี้ การดำเนินการดังกล่าวจะเกิดขึ้น
                  เฉพาะกรณีที่มีกระบวนการทางกฎหมายที่ชัดเจนเท่านั้น
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  5. ความรับผิดชอบของผู้ใช้งาน
                </h3>
                <p>
                  เนื้อหา ข้อความ ความคิดเห็น หรือการกระทำใด ๆ
                  ที่ผู้ใช้งานโพสต์หรือดำเนินการบนแพลตฟอร์ม
                  ถือเป็นความรับผิดชอบของผู้ใช้งานเอง SpaceCMU ทำหน้าที่เป็น
                  แพลตฟอร์มตัวกลาง (Platform Provider)
                  และไม่รับผิดชอบต่อเนื้อหาที่ผู้ใช้งานสร้างขึ้น
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  6. การดูแลชุมชน
                </h3>
                <p>
                  ผู้พัฒนาขอความร่วมมือจากผู้ใช้งานทุกคนในการสร้างสังคมออนไลน์ที่ปลอดภัย
                  สุภาพ และเคารพซึ่งกันและกัน เพื่อให้ SpaceCMU
                  เป็นพื้นที่ที่ดีสำหรับชุมชนมหาวิทยาลัยเชียงใหม่
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  7. การระงับบัญชี
                </h3>
                <p>
                  SpaceCMU
                  ขอสงวนสิทธิ์ในการระงับหรือลบบัญชีที่ละเมิดข้อกำหนดการใช้งาน
                  โดยไม่ต้องแจ้งล่วงหน้า
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-gray-800 mb-1">
                  8. การเปลี่ยนแปลงข้อกำหนด
                </h3>
                <p>
                  SpaceCMU ขอสงวนสิทธิ์ในการแก้ไขข้อกำหนดการใช้งานได้ตลอดเวลา
                  โดยจะมีการแจ้งให้ผู้ใช้ทราบถึงข้อกำหนดที่เปลี่ยนแปลง
                  การใช้งานต่อเนื่องหลังจากการเปลี่ยนแปลงถือว่าผู้ใช้งานยอมรับ และ เห็นด้วยกับข้อกำหนดใหม่
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowTerms(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  setAgreed(true);
                  setShowTerms(false);
                }}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-600 text-white hover:bg-slate-700 transition"
              >
                ยอมรับข้อกำหนด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
