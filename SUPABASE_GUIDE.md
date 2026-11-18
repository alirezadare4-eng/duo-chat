# راهنمای اتصال ۲۴ ساعته کلود (Supabase) - ۱۰۰٪ رایگان

برای اینکه برنامه بدون نیاز به روشن بودن کامپیوتر شما به صورت ۲۴ ساعته در ۷ روز هفته کار کند:

### گام اول: ساخت پروژه در Supabase (۲ دقیقه)
1. وارد سایت [supabase.com](https://supabase.com) شوید و با یک ایمیل یا گیت‌هاب حساب رایگان بسازید.
2. روی دکمه **New Project** کلیک کنید و نامی برای پروژه‌تان انتخاب کنید (مثلاً `duo-chat`).

### گام دوم: ساخت جدول پیام‌ها (SQL Editor)
در منوی سمت چپ پنل Supabase، بخش **SQL Editor** را باز کنید و کد زیر را داخل آن کپی کرده و دکمه **Run** را بزنید:

```sql
create table messages (
  id text primary key,
  sender text not null,
  text text,
  type text default 'text',
  time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- فعال‌سازی پیام‌رسانی ریل‌تایم و زنده
alter publication supabase_realtime add table messages;
```

### گام سوم: دریافت کلیدهای اتصال
1. در پنل Supabase به بخش **Project Settings (آیکون چرخ‌دنده) -> API** بروید.
2. دو مقدار زیر را کپی کنید:
   * **Project URL** (مثلاً: `https://abcdefgh.supabase.co`)
   * **Project API Keys -> anon / public**

### گام چهارم: فعال‌سازی در برنامه
1. برنامه چت را باز کنید و روی آیکون **چرخ‌دنده تنظیمات (⚙️)** بزنید.
2. در کادر سبز رنگ «اتصال کلود ۲۴ ساعته»، دو مقدار بالا را وارد کرده و دکمه **«ذخیره و فعال‌سازی کلود ۲۴ ساعته»** را بزنید.

🎉 **تبریک! از این لحظه به بعد سیستم کامپیوتر شما می‌تواند برای همیشه خاموش باشد و پیام‌ها ۲۴ ساعته در اینترنت رد و بدل می‌شوند.**

