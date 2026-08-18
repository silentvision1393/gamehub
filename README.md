# GameHub - شبکه اجتماعی گیمرها

پلتفرم اجتماعی شبیه X (Twitter) مخصوص گیمرها با طراحی مدرن دارک‌مود و نئون آبی.

## اطلاعات پروژه شما

- **Supabase URL:** `https://inoobpxzivbcraemmtnz.supabase.co`
- **Anon Key:** از قبل داخل `js/supabase.js` قرار داده شده است.

## راه‌اندازی سریع (کمتر از ۱۵ دقیقه)

### ۱. اجرای Schema در Supabase

1. به [Supabase Dashboard](https://supabase.com/dashboard) بروید و پروژه `inoobpxzivbcraemmtnz` را باز کنید.
2. از منوی سمت چپ روی **SQL Editor** کلیک کنید.
3. فایل `supabase-schema.sql` را باز کنید و تمام محتوای آن را کپی کنید.
4. در SQL Editor پیست کنید و روی **Run** بزنید.

### ۲. تنظیمات Authentication

1. به **Authentication → Providers** بروید.
2. Email را فعال کنید.
3. برای تست سریع، گزینه **Confirm email** را خاموش کنید (تا بلافاصله بعد از ثبت‌نام وارد شوید).

### ۳. بررسی Storage

بعد از اجرای SQL، سه باکت باید ساخته شده باشند:
- `avatars`
- `covers`
- `media`

اگر ساخته نشدند، از بخش **Storage** دستی بسازید و Public کنید.

### ۴. اجرای پروژه

پروژه کاملاً استاتیک است. می‌توانید:

**روش ساده (محلی):**
```bash
# با Python
cd gamehub
python -m http.server 3000

# یا با VS Code Live Server
```

سپس مرورگر را باز کنید: `http://localhost:3000/auth.html`

**یا آپلود روی Netlify / Vercel / GitHub Pages**

## ساختار فایل‌ها

```
gamehub/
├── index.html          # فید اصلی
├── auth.html           # ورود و ثبت‌نام
├── profile.html        # پروفایل کاربر
├── post.html           # جزئیات پست + کامنت
├── search.html         # جستجو
├── settings.html       # تنظیمات حساب
├── css/style.css       # تمام استایل‌ها
├── js/
│   ├── supabase.js     # کلاینت Supabase (کلیدها داخلش است)
│   ├── auth.js
│   ├── feed.js
│   ├── profile.js
│   ├── post.js
│   ├── search.js
│   └── settings.js
├── supabase-schema.sql # اسکیما کامل دیتابیس
└── README.md
```

## امکانات پیاده‌سازی‌شده

- ثبت‌نام / ورود / خروج
- پروفایل کامل (نام، یوزرنیم، بیو، آواتار، کاور)
- پست متن + عکس + ویدیو + هشتگ
- لایک / آنلایک
- کامنت
- حذف پست (توسط صاحب)
- فالو / آنفالو
- جستجوی کاربر، هشتگ و پست
- ترندینگ هشتگ‌ها
- پیشنهاد کاربران برای دنبال کردن
- تنظیمات حساب + حذف حساب
- طراحی ریسپانسیو موبایل و دسکتاپ
- دارک‌مود + Glassmorphism + نئون آبی

## نکات مهم

- کلیدهای Supabase داخل `js/supabase.js` قرار داده شده‌اند.
- برای پروداکشن، Confirm email را دوباره فعال کنید.
- حذف کامل کاربر از Auth نیاز به Service Role یا Edge Function دارد (در حال حاضر فقط پروفایل و داده‌های مرتبط حذف می‌شود).
