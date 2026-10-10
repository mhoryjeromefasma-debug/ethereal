# Ethereal Perfumes — Inventory Website

Buksan lang ang `index.html` sa browser (walang install o server na kailangan).

- **Customer site:** index.html, shop.html, product.html
- **Admin (walang link sa public site):** buksan mo mismo ang `admin-login.html` sa URL, hal. `yoursite.com/admin-login.html`
  - Demo login: `admin` / `ethereal2026` (palitan sa `js/admin.js`, `CREDENTIALS`)
- **Palitan ang images:** ilagay sa `assets/images/` at i-edit ang image path sa Admin → Products (o mag-upload doon mismo).
- **Data:** nasa localStorage ng browser (`ethereal_products`, `ethereal_settings`, `ethereal_theme`). Reset: Admin → Products → Reset Sample Data.

## Online database setup (para makita ng LAHAT ng customer ang stock)

Gumagamit ng **Supabase** (libre ang free plan). Isang beses lang ito gagawin:

1. Pumunta sa supabase.com → **New project** (maglagay ng pangalan at database password, piliin ang pinakamalapit na region).
2. Sa project: **SQL Editor** → **New query** → i-paste ang laman ng `supabase-setup.sql` → **Run**.
3. **Authentication → Users → Add user → Create new user**: ilagay ang email at password mo bilang admin. (I-check ang "Auto Confirm User".)
4. **Authentication → Sign In / Providers → Email**: i-**OFF** ang "Allow new users to sign up" (importante, para ikaw lang ang makakapag-edit).
5. **Project Settings → API**: kopyahin ang **Project URL** at ang **anon public** key (o "publishable" key).
6. Buksan ang `js/config.js` at i-paste ang dalawa. I-save.
7. I-upload ang BUONG folder (kasama ang admin) sa hosting mo. Buksan ang `/admin-login.html` at mag-sign in gamit ang email/password sa step 3.

Pagka-login mo sa unang beses, awtomatikong maa-upload ang sample catalog sa database. Pagkatapos, lahat ng pagbabago sa Admin (stock, presyo, bagong perfume, photos) ay naka-save online at lalabas sa customers sa loob ng ~30 segundo, o agad pag nag-refresh sila.

Kapag walang laman ang `js/config.js`, babalik ang site sa local demo mode (data sa browser lang, at yung lumang demo login).

Paalala: ang admin page ay nasa public site pa rin (walang link, pero kung alam ng iba ang URL ay makikita nila ang login page). Ligtas pa rin ito dahil ang database mismo ang tumatanggi sa pag-edit ng hindi naka-sign in.

Paalala (lumang demo mode): frontend-only demo ito at hindi secure ang admin login. Para sa maraming customer sa iba't ibang device, kailangan ng backend, shared database, at tunay na authentication.
