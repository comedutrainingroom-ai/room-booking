# คู่มือฉบับสมบูรณ์: การนำโปรเจ็คขึ้น Server Ubuntu ภาควิชา (จาก 0 ถึง 100%)

โปรเจ็คนี้ถูกเตรียมไฟล๋โค้ดและตั้งค่า `docker-compose.yml` รวมถึง `.gitignore` ให้ **พร้อม 100%** สำหรับระดับ Production แล้ว
เพื่อให้การ Deploy เป็นไปอย่างปลอดภัย (ไม่เอาข้อมูลความลับต่างๆ และรูปภาพขึ้น Git) โปรดทำตามขั้นตอนนี้แบบ Step-by-Step ครับ

---

## ขั้นตอนที่ 1: นำโค้ดขึ้น Git (เครื่องปัจจุบันของคุณ)

1. เปิด Terminal ในโฟลเดอร์โปรเจ็คหลัก (`Pad`) 
2. รันคำสั่งต่อไปนี้เพื่อ Push โค้ดขึ้น GitHub / GitLab :
   ```bash
   git add .
   git commit -m "Prepare for Production Deployment (Docker + Nginx)"
   git push origin main
   ```
   *(หมายเหตุ: โฟลเดอร์ `db_backup`, `server/uploads`, และไฟล์ `.env`, `serviceAccountKey.json` จะไม่ถูกอัปโหลดขึ้น Git เพราะถูกตั้ง Block ไว้ใน `.gitignore` เพื่อความปลอดภัย)*

---

## ขั้นตอนที่ 2: ดาวน์โหลดโค้ดลง Ubuntu Server

1. **SSH เข้าสู่ Server ภาควิชา:** เปิด Terminal แล้วพิมพ์ 
   ```bash
   ssh username@ip_address_ของ_server
   ```
   *(เปลี่ยน `username` และ `ip_address` เป็นของภาควิชา)*

2. **ไปที่โฟลเดอร์ที่ต้องการลงโปรเจ็ค (เช่น /var/www หรือ /home/user):**
   ```bash
   cd /home/username
   ```

3. **Clone โค้ดจาก Git:**
   ```bash
   git clone <URL_ของ_Git_Repository> room-booking
   cd room-booking
   ```

---

## ขั้นตอนที่ 3: ย้ายไฟล์ความลับ 🔑 และฐานข้อมูลจากเครื่องคุณไปที่ Server

เนื่องจากไฟล์พวกนี้ไม่ได้ขึ้น Git คุณจะต้องส่งตรงจากเครื่อง Windows ของคุณ ไปยัง Ubuntu Server แนะนำให้ใช้โปรแกรม **WinSCP** หรือ **FileZilla** เพื่อลากวางไฟล์ที่ง่ายที่สุด

**สิ่งที่ต้องลากไปวางใน Server (ให้อยู่ในตำแหน่งเดียวกับเครื่องคุณเป๊ะๆ):**

1. ลากไฟล์ `client/.env` ไปไว้ที่ `room-booking/client/.env`
2. ลากไฟล์ `server/.env` ไปไว้ที่ `room-booking/server/.env`
   - ⚠️ **สำคัญ:** เปิดไฟล์ `server/.env` บน Server แล้วแก้บรรทัด `CLIENT_URL=http://<IP_หรือ_โดเมนของเซิร์ฟเวอร์>` ให้ถูกต้อง!
3. ลากไฟล์ Firebase ไปไว้ที่ `room-booking/server/config/serviceAccountKey.json`
4. ลากโฟลเดอร์รูปภาพ `server/uploads/` ทั้งโฟลเดอร์ ไปไว้ที่ `room-booking/server/uploads/`
5. ลากโฟลเดอร์ Backup ฐานข้อมูล `db_backup/` ทั้งโฟลเดอร์ ไปไว้ที่ `room-booking/db_backup/`

---

## ขั้นตอนที่ 4: รันระบบขึ้นมา (Docker Compose)

เมื่อตรวจสอบแล้วว่ามีไฟล์ครบถ้วน (ทั้งโค้ดจาก Git และไฟล์สำคัญที่เซฟผ่าน WinSCP) ให้รันระบบด้วยคำสั่งนี้บน Server Ubuntu:

1. เช็คให้ชัวร์ว่าอยู่ในโฟลเดอร์โปรเจ็คหลัก (`cd room-booking`)
2. สั่งรัน Environment ทั้งหมด:
   ```bash
   sudo docker compose up -d --build
   ```
*(รอให้ Docker ทำการติดตั้ง NodeJS, Nginx, MongoDB และสร้าง Container จนเสร็จ)*

---

## ขั้นตอนที่ 5: กู้คืนฐานข้อมูลเดิม (Restore Database ฐานข้อมูลเก่าที่ Backup ไว้)

เมื่อรันระบบขึ้นมาแล้ว ระบบจะมี Database ใหม่เอี่ยม ให้คุณโยนข้อมูลเดิมของระบบใส่ลงไป:

1. **ก๊อปปี้โฟลเดอร์จาก Ubuntu Server เข้าไปใน Container ของ MongoDB:**
   ```bash
   sudo docker cp ./db_backup booking-mongo:/data/dump_backup
   ```

2. **สั่ง Restore ข้อมูลก้อนนั้นเข้าสู่ Database `room_booking_v2`:**
   ```bash
   sudo docker exec booking-mongo mongorestore --uri="mongodb://localhost:27017/room_booking_v2" /data/dump_backup/room_booking_v2
   ```

---

## 🎉 เสร็จสิ้น 100%!

หากทุกอย่างถูกต้อง ให้ใช้ Web Browser พิมพ์ `http://<IP_หรือ_โดเมนของ_Server>` เข้ามาดูได้เลย:
- ฐานข้อมูลทั้งหมด (ชื่อห้อง / User / ประวัติการจอง) จะอยู่ครบ
- รูปภาพหน้าปกห้องทั้งหมดจะแสดงขึ้นมา
- API และ WebSocket (Socket.io) จะเด้ง Realtime ทะลุ Nginx ได้ตามปกติ 
- ระบบ Login แอดมินจะใช้งานได้ผ่านอีเมลเดิมเหมือนทำบนเครื่องตัวเองครับ!
