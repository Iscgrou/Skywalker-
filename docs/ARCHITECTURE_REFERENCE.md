# Fullstack App Reference Format (Express + React + Vite + TypeScript + Drizzle + Replit)

> نسخه مرجع استاندارد برای ساختار، کانفیگ‌ها، و الزامات تشخیص خودکار دستیار (Replit AI) جهت پروژه فول‌استک.

---
## 1. اهداف طراحی (Design Goals)
- Startup سریع (Single-process dev: Express + Vite middleware)
- Build قابل پیش‌بینی (Client با Vite، Server با esbuild)
- ایندکس‌پذیری حداکثری برای ابزار هوشمند (Static imports, واضح بودن entry ها)
- جداسازی concerns: `client/`, `server/`, `shared/`
- Type-safety سرتاسری با TypeScript + Drizzle ORM
- حداقل نویز در فایل‌های حیاتی (.replit, vite.config.ts, package.json)

## 2. درخت پوشه پیشنهادی (Canonical Directory Tree)
```
root/
├─ .replit
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ drizzle.config.ts (اختیاری/توصیه‌شده)
├─ README.md
├─ docs/
│  ├─ ARCHITECTURE_REFERENCE.md
│  └─ specs/ (اختیاری: قراردادها، مدل‌های دامنه)
├─ client/
│  ├─ index.html
│  └─ src/
│     ├─ main.tsx
│     ├─ App.tsx
│     ├─ components/
│     ├─ pages/
│     ├─ hooks/
│     ├─ lib/
│     └─ styles/ (index.css, tailwind.css)
├─ server/
│  ├─ index.ts          (Entrypoint)
│  ├─ routes/           (Segmented route modules: auth, billing, users, etc.)
│  ├─ middleware/
│  ├─ services/
│  ├─ db.ts
│  ├─ vite.ts           (Vite dev middleware setup & static serve)
│  ├─ health.ts         (Extracted health endpoints)
│  ├─ session.ts        (Session config)
│  └─ utils/
├─ shared/
│  ├─ schema.ts         (Drizzle schema)
│  └─ types/ (اختیاری)
├─ migrations/          (Drizzle migrations + snapshots)
└─ dist/
   ├─ public/           (Client build output)
   └─ index.js          (Bundled server)
```

## 3. فایل .replit (حداقل/مرجع)
```toml
modules = ["nodejs-20", "web", "postgresql-16"]
run = "npm run dev"

[nix]
channel = "stable-24_05"
packages = []

[deployment]
deploymentTarget = "autoscale"
build = ["npm", "run", "build"]
run = ["npm", "run", "start"]

[[ports]]
localPort = 5000
externalPort = 80

[workflows]
runButton = "Project"

[[workflows.workflow]]
name = "Start application"
[[workflows.workflow.tasks]]
task = "shell.exec"
args = "npm run dev"
waitForPort = 5000

[[workflows.workflow]]
name = "Project"
mode = "parallel"
[[workflows.workflow.tasks]]
task = "workflow.run"
args = "Start application"
```
نکات:
- از PORT ثابت در [env] اجتناب کن؛ در کد: `const port = parseInt(process.env.PORT||'5000',10)`
- بخش hidden فقط برای کاهش شلوغی UI؛ حذف بیش‌ازحد مانع ایندکس نشود.

## 4. package.json (الگوی Scripts و Dependencies)
```jsonc
{
  "type": "module",
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "client:dev": "vite",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc --noEmit",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "express": "^4.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "drizzle-orm": "^0.39.x",
    "pg": "^8.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "esbuild": "^0.25.x",
    "tsx": "^4.x",
    "@vitejs/plugin-react": "^4.x",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@replit/vite-plugin-cartographer": "^0.2.x"
  }
}
```
نکات:
- وجود `client:dev` سیگنال روشن برای حضور Vite است اگر heuristic به کلمه vite در scripts نیاز داشته باشد.
- از نصب devDependencyهای غیرضروری (حجم بالا) پرهیز کن.

## 5. tsconfig.json (Paths و Module Resolution)
```jsonc
{
  "include": ["client/src", "server", "shared"],
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["client/src/*"],
      "@shared/*": ["shared/*"]
    },
    "types": ["node", "vite/client"]
  }
}
```

## 6. vite.config.ts (Static Plugin Imports)
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { cartographer } from '@replit/vite-plugin-cartographer';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'client'),
  plugins: [react(), runtimeErrorOverlay(), cartographer()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared')
    }
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true
  },
  server: {
    fs: { strict: true, deny: ['**/.*'] }
  }
});
```
نکات:
- از dynamic import برای پلاگین‌های حیاتی اجتناب کن.
- root = client برای تفکیک تمیز منابع Frontend.

## 7. الگوی سرور (server/index.ts) مینیمال پیشنهادی
```ts
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { setupVite, serveStatic } from './vite';
import { registerRoutes } from './routes';

const app = express();
app.set('trust proxy', true);
app.use(express.json());

registerRoutes(app);

if (app.get('env') === 'development') await setupVite(app); else serveStatic(app);

const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, '0.0.0.0', () => console.log('listening', port));
```
نکات:
- Logic سنگین (health, logging, session advanced) به فایل‌های جدا منتقل شود.
- استفاده از 0.0.0.0 برای سازگاری محیط.

## 8. Vite Dev Middleware (server/vite.ts)
```ts
import { createServer } from 'vite';
import path from 'path';
import { type Express } from 'express';

export async function setupVite(app: Express) {
  const vite = await createServer({
    root: path.resolve(process.cwd(), 'client'),
    server: { middlewareMode: true }
  });
  app.use(vite.middlewares);
}

export function serveStatic(app: Express) {
  // Serve pre-built assets from dist/public
}
```

## 9. تقسیم Routes (server/routes/)
- `index.ts` فقط aggregator.
- مثال ساختار:
```
server/routes/
  index.ts
  auth.ts
  billing.ts
  representatives.ts
  reports.ts
```

## 10. Drizzle Schema (shared/schema.ts)
- نگه داشتن یک entry مرکزی برای import ساده.
- مثال:
```ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

## 11. Build Flow
1. `vite build` → تولید `dist/public/*`
2. `esbuild server/index.ts` → تولید `dist/index.js`
3. `npm start` → `node dist/index.js` + سرو static.

## 12. سیگنال‌های مهم تشخیص (Heuristic Signals)
| Signal | فایل/محل | توضیح |
|--------|----------|-------|
| express dependency | package.json | وجود backend framework |
| react + @vitejs/plugin-react | package.json/vite.config.ts | SPA frontend |
| TypeScript strict | tsconfig.json | قابلیت refactor دقیق |
| static plugin imports | vite.config.ts | تحلیل گراف پایدار |
| alias paths synced | tsconfig + vite | جلوگیری از خطای resolve |
| dynamic PORT usage | server/index.ts | سازگاری پلتفرم |
| dev script with tsx | package.json | single-process dev + TS ESM |

## 13. Anti-Patterns (اجتناب شود)
- dynamic import پلاگین‌های core Vite
- قراردادن فایل‌های حجیم چندمنظوره (monolithic index.ts)
- مخفی کردن پوشه‌های حاوی schema / config ضروری
- dev script بدون اشاره روشن به server یا vite در هیچ‌یک از scripts

## 14. Feature Readiness Mapping
| قابلیت AI | نیازها | پیامد فقدان |
|-----------|--------|--------------|
| Refactor (rename) | paths + strict TS | دقت پایین یا خطای scope |
| Endpoint generation | express_signals + routes structure | عدم پیشنهاد route جدید |
| DB-aware suggestions | drizzle schema import | پیشنهادهای generic |
| Frontend component assist | react + plugin-react presence | پیشنهاد محدود JSX |

## 15. چک‌لیست ایجاد پروژه جدید
- [ ] ایجاد پوشه‌های client/server/shared
- [ ] افزودن .replit طبق قالب
- [ ] نوشتن vite.config.ts با import ثابت پلاگین‌ها
- [ ] تنظیم tsconfig با paths هماهنگ
- [ ] افزودن scripts dev/build/start + client:dev
- [ ] افزودن schema اولیه drizzle (اختیاری)
- [ ] نوشتن server/index.ts مینیمال
- [ ] ثبت README با Architecture Overview

## 16. گام‌های دیباگ اگر دستیار پشتیبانی نکرد
1. بررسی وجود express + react + vite + typescript در dependencies
2. تایید static بودن imports در vite.config.ts
3. حذف PORT ثابت از .replit
4. افزودن script حاوی کلمه vite در package.json
5. کوچک‌سازی server/index.ts و شکستن concern ها
6. اطمینان از عدم پنهان‌سازی پوشه‌های حیاتی
7. اجرای مجدد build و مشاهده لاگ‌های dev

## 17. توسعه‌های آینده پیشنهادی
- Modular chunk splitting با manualChunks
- اضافه کردن test setup (Vitest + React Testing Library)
- افزودن ESLint + Prettier یا Biome برای کیفیت پایدار
- Health endpoint غنی جدا از index

## 18. نسخه‌گذاری و پایداری
- قفل نسخه‌های core (express/react/vite/typescript) در رنج minor
- پایش هشدارهای chunk Vite برای کدنویسی پویا

## 19. پرسش‌های استاندارد هنگام ارزیابی مشکل
- آیا dev script اجرا می‌شود و فقط یک پروسه اسپان می‌کند؟
- آیا vite.config.ts تغییری در root یا alias ناسازگار ایجاد کرده؟
- آیا schema drizzle واقعاً import شده یا dead code است؟

## 20. خلاصه کلیدی (TL;DR)
یک پروژه فول‌استک قابل پشتیبانی: ساختار سه‌لایه (client/server/shared)، کانفیگ شفاف، imports استاتیک، scripts واضح، و اجتناب از نویز در فایل‌های entry.

---
Generated: (local reference)
