## Tujuan

Owner toko (paket **Pro**) bisa menyusun tampilan storefront-nya sendiri secara drag-and-drop pakai **Puck editor** — mirip Elementor versi ringan. Berlaku untuk: homepage `/s/$slug`, landing page custom (multi-page), halaman menu detail, dan halaman storefront lain. Owner non-Pro tetap pakai tema preset (classic/minimal/umroh/sales-pro) seperti sekarang.

## Arsitektur

### 1. Database (1 migration)

```text
page_layouts
├── id (uuid)
├── shop_id (fk shops)
├── page_type (enum: 'home' | 'menu_detail' | 'cart' | 'checkout' | 'custom')
├── slug (text, nullable)         -- untuk custom page: /s/$slug/p/$pageSlug
├── title (text)
├── puck_data (jsonb)             -- {content, root, zones} dari Puck
├── is_published (boolean)
├── published_at (timestamptz)
├── created_at, updated_at
└── unique (shop_id, page_type, slug)
```

RLS:
- SELECT: public bila `is_published = true` (untuk render storefront)
- ALL: owner shop + entitlement `builder_pro` aktif

### 2. Entitlement

Tambah feature flag `builder_pro` ke plan Pro+ (manfaatkan sistem entitlements yang sudah ada di `src/server/entitlements.functions.ts`). Builder UI di-gate via `useEntitlement('builder_pro')`.

### 3. Library

```bash
bun add @measured/puck
```

Puck = drag-drop editor open-source untuk React. Output JSON yang bisa di-render via `<Render />`. Cocok untuk block builder menengah.

### 4. Block library (`src/builder/blocks/`)

Block siap pakai untuk owner:
- **Layout**: Section, Columns (2/3/4), Spacer, Divider
- **Content**: Heading, Text, Image, Button, Video Embed
- **Storefront**: MenuGrid (auto-fetch dari shop), CategoryTabs, FeaturedItem, ShopInfo, OpeningHours, ContactBox, WhatsAppCTA, Testimonials, FAQ, Gallery, Map
- **Form**: ContactForm, NewsletterSignup

Setiap block punya config Puck: fields (text, color picker, select, image upload via Supabase storage), default props, render component pakai design tokens dari `src/styles.css`.

### 5. Routing

```text
/app/builder                        -> daftar page layouts (Pro only)
/app/builder/$layoutId              -> Puck editor full-screen
/s/$slug/                           -> render custom layout bila ada & published, fallback ke ThemedHome
/s/$slug/menu/$menuId               -> idem untuk page_type='menu_detail'
/s/$slug/p/$pageSlug                -> custom landing page
```

### 6. Render flow di storefront

`s.$slug.index.tsx`:
1. Query `page_layouts` untuk shop ini, `page_type='home'`, `is_published=true`.
2. Bila ada → render `<Puck.Render data={puck_data} config={blockConfig} />`.
3. Bila tidak ada → fallback ke `<ThemedHome />` (perilaku saat ini).

### 7. Server functions baru

`src/server/page-layouts.functions.ts`:
- `listLayouts(shopId)` — Pro only
- `getLayout(layoutId)` — Pro only
- `saveLayout(layoutId, puckData, title)` — Pro only
- `publishLayout(layoutId)` / `unpublishLayout(layoutId)`
- `getPublishedLayout(shopSlug, pageType, slug?)` — public, dipakai storefront

### 8. UI di /app

Halaman baru `pos-app.builder.tsx`:
- List page layouts dengan status (draft/published)
- Tombol "Buat halaman baru" → pilih page_type + (optional slug)
- Tombol "Edit" → buka editor Puck full-screen
- Untuk owner non-Pro: tampilkan paywall card "Upgrade ke Pro untuk fitur Website Builder"

Editor (`pos-app.builder.$layoutId.tsx`):
- Full-screen `<Puck>` dengan toolbar simpan/publish/preview
- Sidebar kiri: block palette
- Sidebar kanan: properties panel (auto dari Puck fields)
- Preview button → buka tab baru ke storefront

### 9. Image upload di builder

Block Image pakai Supabase storage bucket `shop-assets` (yang sudah ada). Custom field di Puck untuk uploader.

## Skema bertahap (rekomendasi 3 fase)

**Fase 1 — MVP builder (~2 milestone)**
- Migration + entitlement gating
- Install Puck, setup editor route
- 8 block dasar: Section, Heading, Text, Image, Button, MenuGrid, ShopInfo, WhatsAppCTA
- Edit homepage saja, save/publish, render di `/s/$slug`

**Fase 2 — Block library lengkap**
- Tambah Columns, Gallery, Testimonials, FAQ, ContactForm, dll
- Custom landing page (multi-page dengan slug)
- Image upload terintegrasi

**Fase 3 — Polish**
- Halaman menu detail
- Template starter (import dari tema yang ada → jadi block tree)
- Responsive preview (desktop/tablet/mobile)
- Undo/redo, version history

## Catatan teknis

- Puck `Config` di-share antara editor dan render — taruh di `src/builder/config.ts`.
- Render component MUST pakai semantic token (`bg-primary`, `text-foreground`, dsb), bukan hex langsung — agar konsisten dengan design system shop.
- Data dinamis (menu items, shop info) di-fetch di dalam render component pakai `slug` dari context, jadi block-nya zero-config buat owner.
- SSR-aman: Puck Render bisa SSR; editor (`<Puck>`) hanya dimuat client-side via dynamic import.
- Saat `is_published=false`, tetap simpan draft tapi storefront tidak menampilkannya.

## Konfirmasi sebelum mulai

Saya akan **mulai dari Fase 1** (MVP: homepage saja, 8 block, gate Pro). Setuju lanjut, atau mau ubah scope?
