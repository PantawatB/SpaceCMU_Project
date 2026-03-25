# SpaceCMU ภาพรวมโปรเจกต์

> SpaceCMU คือแพลตฟอร์มโซเชียลมีเดียภายในมหาวิทยาลัยเชียงใหม่ ที่ออกแบบมาสำหรับนักศึกษาและบุคลากร CMU โดยเฉพาะ
> เพื่อการสื่อสาร แบ่งปัน และสร้างชุมชนออนไลน์ภายในมหาวิทยาลัยอย่างปลอดภัยและสร้างสรรค์

# ฟีเจอร์หลักของระบบ:
- เข้าสู่ระบบด้วย CMU Authentication
- ฟีดโพสต์ภายในชุมชน พร้อมการแยกประเภทคอนเทนต์
- ระบบเพื่อน ห้องแชตและการส่งข้อความ
- Marketplace สำหรับซื้อขายภายในมหาวิทยาลัย
- Calendar สำหรับจัดการกิจกรรมและตารางงาน
- Notification การแจ้งเตือนกิจกรรม
- รองรับ PWA สำหรับการใช้งานบนอุปกรณ์พกพา

---

## 🧠 Built with the tools and technologies

| ประเภท | เทคโนโลยี |
|---------|-------------|
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js) ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-404D59?style=flat) ![Drizzle ORM](https://img.shields.io/badge/Drizzle%20ORM-C5F74F?style=flat)  ![JWT](https://img.shields.io/badge/JWT-black?style=flat&logo=json-web-tokens) |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white) |
| **Tools & Infra** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white) ![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=flat&logo=eslint&logoColor=white) ![Axios](https://img.shields.io/badge/Axios-671DDF?style=flat) ![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white) |
| **Authentication** | ![OAuth 2.0](https://img.shields.io/badge/OAuth%202.0-EB5424?style=flat) ![Microsoft](https://img.shields.io/badge/CMU%20EntraID-0078D4?style=flat&logo=microsoft&logoColor=white) |

---

## 👨‍💻 ทีมพัฒนา

| ชื่อ | รหัสนักศึกษา | อีเมล |
|------|----------------|--------|
| พันธวัสส์ บุญเฉลย | 650612093 | pantawat_b@cmu.ac.th |
| สิรภพ เหลืองประเสริฐ | 650612102 | siraphob_lu@cmu.ac.th |

---

## 📁 โครงสร้างโปรเจกต์

```bash
SpaceCMU_Project/
├── spacecmu/           # Frontend (Next.js) - Port 3000
├── spacecmu-backend/   # Backend (Express + PostgreSQL) - Port 3001
└── README.md
```

---


## 🚀 เริ่มต้นการพัฒนา (Getting Started)

### 🔧 Prerequisites  
ติดตั้งเครื่องมือเหล่านี้ก่อนเริ่มต้น:
- Node.js `22+` แนะนำสำหรับการพัฒนา
- npm
- Docker และ Docker Compose
- PostgreSQL (กรณีไม่ใช้ Docker)
- CMU EntraID credentials สำหรับทดสอบระบบล็อกอินจริง

---

### ⚙️ ขั้นตอนการติดตั้ง (Installation)

### 1. Clone โปรเจกต์

```bash
git clone https://github.com/PantawatB/SpaceCMU_Project.git
cd SpaceCMU_Project
```
### 2. ติดตั้งและรัน Backend + Database

เข้าไปที่โฟลเดอร์ backend:

```bash
cd spacecmu-backend
```

สร้างไฟล์ `spacecmu-backend/.env` แล้วกำหนดค่าตัวแปรสำคัญ เช่น:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_jwt_secret

POSTGRES_DB=spacecmu
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_APP_USER=spacecmu_app
POSTGRES_APP_PASSWORD=spacecmu_app_password
POSTGRES_PORT=5432
POSTGRES_HOST=database

CMU_ENTRAID_CLIENT_ID=your_client_id
CMU_ENTRAID_CLIENT_SECRET=your_client_secret
CMU_ENTRAID_REDIRECT_URI=http://localhost:3000/cmuEntraIDCallback
```

จากนั้นรัน backend พร้อม PostgreSQL ด้วย Docker Compose:

```bash
docker compose up --build
```

บริการที่ถูกเปิดใช้งาน:
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`

หมายเหตุ:
- สคริปต์เริ่มต้นของ backend จะ `db:push` schema ให้อัตโนมัติเมื่อ container เริ่มทำงาน
- หากยังไม่ได้ตั้งค่า CMU EntraID ระบบจะเปิดได้ แต่ flow ล็อกอินจริงจะยังไม่สมบูรณ์
- ค่า `CMU_ENTRAID_REDIRECT_URI` ต้องตรงกับ callback URL ที่ลงทะเบียนไว้ในระบบ CMU EntraID

### 3. ติดตั้งและรัน Frontend

เปิดอีก terminal แล้วรัน:

```bash
cd spacecmu
npm install
```

สามารถสร้างไฟล์ `spacecmu/.env.local` เพิ่มได้ หากต้องการ override URL ของ backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

จากนั้นเริ่ม frontend:

```bash
npm run dev
```

Frontend จะทำงานที่:
- `http://localhost:3000`

---

## 🌐 พอร์ตที่ใช้ในโปรเจกต์

| Service | Port |
|---------|------|
| Frontend (`spacecmu`) | `3000` |
| Backend (`spacecmu-backend`) | `3001` |
| PostgreSQL | `5432` |

---
## 📝 หมายเหตุเพิ่มเติม

- Frontend ถูกพัฒนาด้วย Next.js App Router
- Backend ใช้ Express, Drizzle ORM และ PostgreSQL
- โปรเจกต์รองรับ PWA ผ่าน `manifest.json`
- ระบบยืนยันตัวตนผูกกับ CMU Account ผ่าน CMU EntraID

