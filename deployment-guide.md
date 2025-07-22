# راهنمای استقرار در محیط‌های مختلف توسعه

## مشکلات رایج و راه‌حل‌ها

### ۱. مشکل Timeout و عدم نمایش پیش‌نمایش

**دلیل احتمالی:**
- پورت‌های محیط توسعه مسدود یا متفاوت
- Network binding مشکل دارد
- تنظیمات Firewall محیط توسعه

**راه‌حل‌ها:**

#### الف) تغییر پورت در محیط جدید
```bash
# در فایل .env یا environment variables محیط جدید:
PORT=3000
# یا پورت دیگری که در محیط شما باز است
```

#### ب) اجرا با پورت دستی
```bash
PORT=3000 npm run dev
# یا
PORT=8080 npm run dev
```

#### ج) بررسی وضعیت سرور
```bash
# تست API endpoints:
curl http://localhost:5000/health
curl http://localhost:5000/api/dashboard

# اگر local host کار نمی‌کند، IP داخلی را تست کنید:
curl http://0.0.0.0:5000/health
```

### ۲. مشکل Database Connection

**اگر خطای database دریافت می‌کنید:**

```bash
# متغیر DATABASE_URL را تنظیم کنید:
export DATABASE_URL="postgresql://user:password@host:port/database"

# یا در فایل .env:
DATABASE_URL=postgresql://user:password@host:port/database
```

### ۳. محیط‌های ابری (Cloud IDEs)

**برای محیط‌هایی مثل GitHub Codespaces، Gitpod، یا Cloud9:**

1. پورت‌ها باید Public شوند
2. URL preview معمولاً به شکل `https://port-workspace-id.region.provider.com` است
3. اگر preview کار نمی‌کند، به آدرس `http://0.0.0.0:5000` دسترسی داشته باشید

### ۴. تست سریع عملکرد

```bash
# ۱. سرور را اجرا کنید
npm run dev

# ۲. در terminal جدید این دستورات را اجرا کنید:
curl http://localhost:5000/health
curl http://localhost:5000/api/auth/check
curl http://localhost:5000/api/dashboard

# ۳. اگر همه جواب دادند، مشکل از frontend است
# ۴. اگر API کار نمی‌کند، مشکل از backend است
```

### ۵. راه‌حل نهایی - اجرای Production Mode

```bash
# Build کنید
npm run build

# در حالت production اجرا کنید
NODE_ENV=production npm start
```

## نکات مهم

1. **پورت پیش‌فرض**: سیستم روی پورت 5000 کار می‌کند
2. **Host binding**: سرور روی 0.0.0.0 bind می‌شود (همه interfaces)
3. **CORS**: برای تمام origin ها فعال است
4. **Authentication**: غیرفعال شده و نیازی به login نیست
5. **Database**: PostgreSQL نیاز دارد - URL باید تنظیم شود

## تشخیص مشکل

```bash
# بررسی port در حال استفاده:
netstat -tlnp | grep :5000

# بررسی process های در حال اجرا:
ps aux | grep node

# Kill کردن process های قدیمی:
pkill -f "tsx server"
```

اگر هنوز مشکل دارید، لطفاً خطاهای console را به اشتراک بگذارید.