# راهنمای استقرار و اجرای MarFaNet (گام‌به‌گام برای افراد غیرتخصصی)

این راهنما مراحل نصب و اجرای سامانه مدیریت مالی MarFaNet را بر روی سرور Ubuntu 22.04 (یا 22) به‌صورت کامل و ساده توضیح می‌دهد. پایگاه داده مورد استفاده PostgreSQL است و برنامه با Node.js اجرا می‌شود.

## 1) پیش‌نیازها
- یک سرور Ubuntu 22.04 به‌همراه دسترسی SSH
- نصب بودن Node.js نسخه 18 یا بالاتر (ترجیحاً 20)
- نصب بودن PostgreSQL نسخه 14 یا بالاتر
- دسترسی به دامنه (اختیاری ولی توصیه‌شده)

اگر Node.js و PostgreSQL نصب نیستند، مراحل زیر را دنبال کنید.

## 2) نصب ابزارهای لازم روی Ubuntu 22
1. به‌روزرسانی سیستم:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. نصب Node.js LTS (v20):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   node -v
   npm -v
   ```
3. نصب Git:
   ```bash
   sudo apt install -y git
   ```
4. نصب PostgreSQL:
   ```bash
   sudo apt install -y postgresql postgresql-contrib
   sudo systemctl enable postgresql
   sudo systemctl start postgresql
   ```

## 3) آماده‌سازی پایگاه داده PostgreSQL
1. ورود به محیط PostgreSQL:
   ```bash
   sudo -u postgres psql
   ```
2. ساخت پایگاه داده و کاربر اختصاصی (نام‌ها قابل تغییر هستند):
   ```sql
   CREATE DATABASE marfanet;
   CREATE USER marfanet WITH ENCRYPTED PASSWORD 'strong-password';
   GRANT ALL PRIVILEGES ON DATABASE marfanet TO marfanet;
   \q
   ```
3. فعال‌سازی حقوق لازم روی اسکیما (پس از اولین اتصال Drizzle هم تنظیم می‌شود):
   - در صورت نیاز بعداً با کاربر marfanet متصل شوید و دسترسی‌ها را روی جداول جدید بدهید.

## 4) دریافت کد و نصب وابستگی‌ها
1. دریافت کد از گیت:
   ```bash
   cd /opt
   sudo git clone <REPO_URL> marfanet
   sudo chown -R $USER:$USER marfanet
   cd marfanet
   ```
2. نصب وابستگی‌ها:
   ```bash
   npm install
   ```

## 5) تنظیمات محیطی (.env)
1. فایل نمونه را کپی کنید و مقدارها را تنظیم کنید:
   ```bash
   cp .env.example .env
   ```
2. فایل `.env` را باز کنید و این مقادیر را ویرایش کنید:
   - DATABASE_URL: آدرس اتصال به PostgreSQL (مثال: `postgresql://marfanet:strong-password@localhost:5432/marfanet`)
   - SESSION_SECRET: یک عبارت تصادفی و طولانی برای امنیت نشست‌ها
   - PORT: پورت اجرا (پیش‌فرض 3000)
   - GEMINI_API_KEY: در صورت استفاده از هوش مصنوعی گوگل
   - TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID: در صورت استفاده از ربات تلگرام

نمونه کامل در فایل `.env.example` موجود است.

## 6) آماده‌سازی دیتابیس با Drizzle
1. ساخت جداول بر اساس شِما:
   ```bash
   npm run db:push
   ```
2. (اختیاری) مشاهده دیتابیس در Drizzle Studio:
   ```bash
   npm run db:studio
   ```

## 7) اجرای برنامه
دو حالت اجرا وجود دارد:

- حالت توسعه (برای تست سریع):
  ```bash
  npm run dev
  ```
- حالت تولید (پیشنهادی برای سرور واقعی):
  ```bash
  npm run build
  npm start
  ```

پس از اجرا، سامانه روی آدرس زیر در دسترس است:
- اگر روی همان سرور هستید: http://localhost:3000
- اگر از بیرون سرور دسترسی می‌گیرید: http://SERVER_IP:3000

اگر دامنه دارید، پیشنهاد می‌شود یک Nginx معکوس‌پراکسی تنظیم کنید.

## 8) راه‌اندازی سرویس پایدار با PM2 (اختیاری ولی توصیه‌شده)
1. نصب PM2:
   ```bash
   sudo npm install -g pm2
   ```
2. ساخت نسخه تولیدی و اجرای سرویس:
   ```bash
   npm run build
   pm2 start dist/index.js --name marfanet
   pm2 save
   pm2 startup systemd
   # دستور چاپ‌شده توسط PM2 را اجرا کنید تا سرویس پس از ریبوت خودکار بالا بیاید
   ```
3. مشاهده لاگ‌ها:
   ```bash
   pm2 logs marfanet
   ```

## 9) تنظیم Nginx به‌عنوان Reverse Proxy (اختیاری)
1. نصب Nginx:
   ```bash
   sudo apt install -y nginx
   ```
2. ساخت کانفیگ دامنه:
   ```bash
   sudo nano /etc/nginx/sites-available/marfanet
   ```
   محتوای نمونه:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
3. فعال‌سازی سایت و راه‌اندازی مجدد Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/marfanet /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. (اختیاری) دریافت SSL رایگان با Certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## 10) ورود به پنل و حساب پیش‌فرض
- آدرس پنل مدیریت: http://SERVER_IP:3000
- نام کاربری پیش‌فرض: mgr
- رمز عبور پیش‌فرض: 8679
پس از اولین ورود، رمز عبور را تغییر دهید.

## 11) نکات امنیتی مهم
- حتماً SESSION_SECRET را به مقدار کاملاً تصادفی و طولانی تغییر دهید.
- پورت 3000 را در فایروال فقط برای Nginx باز بگذارید و از Reverse Proxy استفاده کنید.
- دسترسی SSH را محدود کرده و از کلید عمومی به‌جای رمز عبور استفاده کنید.
- از دیتابیس به‌صورت دوره‌ای بکاپ تهیه کنید.

## 12) مشکلات متداول و راه‌حل‌ها
- خطای اتصال به دیتابیس: مقدار DATABASE_URL در .env را بررسی کنید؛ سرویس PostgreSQL روشن باشد.
- اجرا نشدن سرویس: خروجی `npm run build` و `npm start` و لاگ‌های PM2 را بررسی کنید.
- عدم دسترسی از بیرون: فایروال و تنظیمات Nginx را چک کنید.
- مشکل تاریخ‌های فارسی: کتابخانه و تنظیمات تاریخ فارسی سمت سرور از قبل یکپارچه شده است.

## 13) ساختار پروژه (برای آشنایی کلی)
```
client/           # رابط کاربری React + Vite
server/           # API و منطق سرور (Express + TypeScript)
shared/           # شِماهای اشتراکی (TypeScript)
dist/             # خروجی build تولیدی
```

## 14) متغیرهای محیطی مهم
نمونه کامل در `.env.example` آمده است. مهم‌ترین‌ها:
```env
DATABASE_URL=postgresql://marfanet:strong-password@localhost:5432/marfanet
SESSION_SECRET=یک_عبارت_خیلی_قوی
PORT=3000
GEMINI_API_KEY=اختیاری
TELEGRAM_BOT_TOKEN=اختیاری
TELEGRAM_CHAT_ID=اختیاری
```

## 15) به‌روزرسانی سامانه
```bash
cd /opt/marfanet
git pull
npm install
npm run build
pm2 restart marfanet
```

---

و بس! اکنون سامانه MarFaNet روی سرور Ubuntu 22 شما آماده استفاده است.