-- Add per-product restock deadline field
-- Merchant can set an expected restock date shown on the product page
-- and included in the WhatsApp blast to waiting subscribers.

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS restock_deadline date;

COMMENT ON COLUMN public.menu_items.restock_deadline IS
  'Estimasi tanggal produk tersedia kembali — ditampilkan di halaman produk saat stok habis dan disertakan dalam pesan WA blast ke subscriber.';

CREATE INDEX IF NOT EXISTS idx_menu_items_restock_deadline
  ON public.menu_items (restock_deadline)
  WHERE restock_deadline IS NOT NULL;
