# Ethereal Perfumes — Inventory Website

Walang demo mode na. Lahat ng products, stock at theme ay naka-save sa **Supabase** (libre), kaya pareho ang nakikita ng lahat ng customer sa kahit anong device, at hindi nawawala pag nag-refresh.

- **Customer site:** index.html, shop.html, product.html
- **Admin (walang link sa public site):** `yoursite.com/admin-login.html` — email + password ng admin mo sa Supabase.

## Setup (isang beses lang)

1. supabase.com → **New project**.
2. **SQL Editor → New query** → i-paste ang laman ng `supabase-setup.sql` → **Run**.
3. **Authentication → Users → Add user → Create new user**: email at password mo bilang admin (i-check ang "Auto Confirm User").
4. **Authentication → Sign In / Providers → Email**: i-**OFF** ang "Allow new users to sign up".
5. **Project Settings → API**: kopyahin ang **Project URL** at **anon public** (o publishable) key.
6. Ilagay sa `js/config.js`, i-save, i-push/i-deploy ulit sa Vercel.
7. Buksan ang `/admin-login.html` at mag-sign in. Wala nang sample products — i-add mo na mismo ang mga totoong perfume.

## Paano gumagana
- Pag nag-add/edit/delete ka o nagbago ng stock/theme, lalabas ang "Saved online ✓" sa admin. Ibig sabihin nasa database na at makikita na ng customers (agad pag nag-refresh sila, o sa loob ng ~30 segundo).
- Kung walang laman ang `js/config.js`, hindi gagana ang admin login at walang lalabas na products (may babalang "Database not configured").
- Ligtas ang public anon key: ang database rules (RLS) mismo ang tumatanggi sa pag-edit ng hindi naka-sign in.
- **Palitan ang images:** sa Admin → Products, mag-upload ng photo (napupunta sa Supabase Storage).
