# 🚀 วิธี Deploy บน GitHub Pages

## ขั้นตอนที่ 1: สร้าง Repository

1. ไปที่ [github.com/new](https://github.com/new)
2. ตั้งชื่อ repository: `socialfi-dapp`
3. เลือก **Public**
4. อย่าเพิ่งสร้าง README (เพราะเรามีแล้ว)
5. คลิก **Create repository**

## ขั้นตอนที่ 2: Push โค้ดขึ้น GitHub

```bash
# เข้าไปในโฟลเดอร์โปรเจค
cd /mnt/okcomputer/output/app

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: SocialFi dApp with NFT showcase"

# Add remote (แทน YOUR_USERNAME ด้วยชื่อ GitHub ของคุณ)
git remote add origin https://github.com/YOUR_USERNAME/socialfi-dapp.git

# Push
git branch -M main
git push -u origin main
```

## ขั้นตอนที่ 3: ตั้งค่า GitHub Pages

1. ไปที่ repository ของคุณบน GitHub
2. คลิก **Settings** → **Pages**
3. ที่ **Source** เลือก **GitHub Actions**
4. รอสักครู่ให้ GitHub Actions ทำงาน (ประมาณ 2-3 นาที)

## ขั้นตอนที่ 4: เข้าชื่อเว็บไซต์

หลังจาก deploy เสร็จ จะได้ URL:
```
https://YOUR_USERNAME.github.io/socialfi-dapp/
```

## 🔄 การอัปเดตโค้ด

หากต้องการแก้ไขโค้ด:

```bash
git add .
git commit -m "Update: อธิบายสิ่งที่แก้ไข"
git push origin main
```

GitHub Actions จะ build และ deploy อัตโนมัติ!

## 📁 โครงสร้างโปรเจค

```
socialfi-dapp/
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions สำหรับ deploy
├── public/
│   └── images/             # รูปภาพทั้งหมด
├── src/
│   ├── components/ui/      # shadcn/ui components
│   ├── App.tsx             # โค้ดหลัก
│   ├── index.css           # สไตล์
│   └── main.tsx            # Entry point
├── .gitignore
├── README.md
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## 🛠️ การพัฒนาในเครื่อง

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build
npm run build
```

## ⚠️ หมายเหตุ

- อย่าลืมเปลี่ยน `YOUR_USERNAME` เป็นชื่อ GitHub ของคุณ
- หากใช้ Windows อาจต้องใช้ Git Bash หรือ PowerShell
- หากมีปัญหา ลองเช็คที่ **Actions** tab บน GitHub
