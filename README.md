# Russian Daily Life — v8.3 Visual Guide

## ما الجديد؟
- تعميم صفحة التفاصيل على كل كلمات وحدة المنزل الحالية: 75 كلمة.
- كل كلمة لديها الآن:
  - جدول مقارنة بثلاث لغات.
  - المفرد.
  - الجمع.
  - نوع الكلمة.
  - الجنس/النوع النحوي في الروسية والعربية والإنجليزية.
  - 3 أمثلة قصيرة.
  - 3 عبارات مهمة.
  - بطاقة مقارنة للجنس الروسي والعربي: أزرق عند التطابق وأحمر عند الاختلاف، مع رموز 👦/👧.
- تحسين عناوين صفحة التفاصيل حتى تتغير حسب لغة الواجهة.

## ملاحظة
بعض التفاصيل الصرفية في هذه المرحلة موضوعة بنظام منظّم وقابل للمراجعة. النسخة القادمة يمكن أن تكون تدقيقًا لغويًا للكلمات كلمة بكلمة.

## تنظيف v8.3
- تصحيح أسئلة المكان العربية لتستخدم التعريف الطبيعي.
- إزالة قيم `related` الوهمية التي كانت تكرر الكلمة نفسها.
- إصلاح الأمثلة الروسية/العربية المتكررة وتصحيح جنس `مطبخ` بالعربية.
- تعريب رسائل الاختبار وإضافة دعم لوحة المفاتيح وأسماء الوصول.
- توحيد اتجاه القائمة الجانبية مع لغة الواجهة.
- إضافة واجهة «دليل بصري» بصورة حقيقية للبيت وبطاقات قابلة لاختيار الغرف.
- منع نطق الشرطة المائلة `/` في المعنى الإنجليزي عند استخدام النطق الاحتياطي.

## التشغيل
```bash
python -m http.server 8000
```

## Demo deployment

This is a static PWA and can be published without a backend.

1. Push the repository to GitHub using the `main` branch.
2. Open `Settings > Pages` and choose `GitHub Actions` as the source.
3. Open the `Deploy demo` workflow under `Actions` and wait for it to finish.
4. Use the URL shown in the completed `github-pages` environment.

The workflow publishes only `index.html`, JavaScript, CSS, PWA files, `assets`, and `data`. The PDF files and development scripts are not included in the demo site.

For local UI validation, run `npm install`, `npx playwright install chromium`, then `npm run test:e2e`.
