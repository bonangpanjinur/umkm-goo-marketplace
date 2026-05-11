DROP VIEW IF EXISTS public.products;
CREATE VIEW public.products
WITH (security_invoker=on) AS
  SELECT
    id, shop_id, category_id AS product_category_id,
    name, slug, description, price, compare_price, cost_price, sku,
    weight_grams, length_cm, width_cm, height_cm,
    stock, low_stock_threshold,
    is_digital, digital_file_url, digital_file_name,
    is_pre_order, pre_order_days,
    images, video_url, attributes, tags,
    is_available, is_featured, sort_order,
    total_sold, total_views, average_rating, review_count,
    track_stock, recipe_yield, image_url,
    created_at, updated_at
  FROM public.menu_items;