SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--

ALTER TABLE ONLY public.withdrawal_requests
    DROP CONSTRAINT IF EXISTS withdrawal_requests_pkey;
ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: coffee_shops_custom_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS coffee_shops_custom_domain_key ON public.shops USING btree (lower(custom_domain)) WHERE (custom_domain IS NOT NULL);


--
-- Name: couriers_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS couriers_email_unique ON public.couriers USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: domain_audit_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS domain_audit_shop_idx ON public.domain_audit USING btree (shop_id);


--
-- Name: idx_ad_requests_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ad_requests_shop ON public.ad_requests USING btree (shop_id);


--
-- Name: idx_ad_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON public.ad_requests USING btree (status);


--
-- Name: idx_attendances_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendances_shop ON public.attendances USING btree (shop_id, business_date DESC);


--
-- Name: idx_attendances_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_attendances_user ON public.attendances USING btree (user_id, business_date DESC);


--
-- Name: idx_banners_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON public.banners USING btree (is_active, sort_order);


--
-- Name: idx_booking_slots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_booking_slots_active ON public.booking_slots USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_booking_slots_shop_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_booking_slots_shop_date ON public.booking_slots USING btree (shop_id, slot_date);


--
-- Name: idx_booking_slots_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_booking_slots_type ON public.booking_slots USING btree (shop_id, booking_type, slot_date);


--
-- Name: idx_bookings_cancel_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_cancel_token ON public.bookings USING btree (cancel_token);


--
-- Name: idx_bookings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings USING btree (customer_user_id) WHERE (customer_user_id IS NOT NULL);


--
-- Name: idx_bookings_photographer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_photographer ON public.bookings USING btree (photographer_id);


--
-- Name: idx_bookings_shop_deposit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_shop_deposit_status ON public.bookings USING btree (shop_id, deposit_status);


--
-- Name: idx_bookings_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_shop_status ON public.bookings USING btree (shop_id, status);


--
-- Name: idx_bookings_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.bookings USING btree (slot_id);


--
-- Name: idx_bookings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bookings_type ON public.bookings USING btree (shop_id, booking_type, status);


--
-- Name: idx_branding_audit_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_branding_audit_shop ON public.branding_audit USING btree (shop_id, created_at DESC);


--
-- Name: idx_bulk_pricing_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_menu ON public.bulk_pricing_rules USING btree (menu_item_id);


--
-- Name: idx_bulk_pricing_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_shop ON public.bulk_pricing_rules USING btree (shop_id);


--
-- Name: idx_bundle_items_bundle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON public.bundle_items USING btree (bundle_id);


--
-- Name: idx_bundle_items_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_bundle_items_component_id ON public.bundle_items USING btree (component_id);


--
-- Name: idx_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.marketplace_cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cart_items_shop ON public.marketplace_cart_items USING btree (cart_id, shop_id);


--
-- Name: idx_cash_movements_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cash_movements_shift ON public.cash_movements USING btree (shift_id);


--
-- Name: idx_cash_shifts_outlet_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cash_shifts_outlet_status ON public.cash_shifts USING btree (outlet_id, status);


--
-- Name: idx_cash_shifts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cash_shifts_shop ON public.cash_shifts USING btree (shop_id);


--
-- Name: idx_categories_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_shop ON public.categories USING btree (shop_id, sort_order);


--
-- Name: idx_categories_shop_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_categories_shop_active ON public.categories USING btree (shop_id, is_active);


--
-- Name: idx_cert_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cert_course ON public.course_certificates USING btree (course_id);


--
-- Name: idx_cert_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cert_user ON public.course_certificates USING btree (user_id);


--
-- Name: idx_coffee_shops_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coffee_shops_is_featured ON public.shops USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_coffee_shops_kyc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_coffee_shops_kyc_status ON public.shops USING btree (kyc_status);


--
-- Name: idx_cor_history_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cor_history_request ON public.custom_order_status_history USING btree (request_id, created_at);


--
-- Name: idx_couriers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_couriers_shop ON public.couriers USING btree (shop_id);


--
-- Name: idx_couriers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_couriers_user ON public.couriers USING btree (user_id);


--
-- Name: idx_course_enrollments_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_enrollments_menu_item ON public.course_enrollments USING btree (menu_item_id);


--
-- Name: idx_course_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments USING btree (user_id);


--
-- Name: idx_course_lessons_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON public.course_lessons USING btree (module_id);


--
-- Name: idx_course_lessons_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_lessons_status ON public.course_lessons USING btree (status);


--
-- Name: idx_course_modules_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_modules_menu_item ON public.course_modules USING btree (menu_item_id);


--
-- Name: idx_course_modules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_course_modules_status ON public.course_modules USING btree (status);


--
-- Name: idx_cron_runs_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cron_runs_job ON public.cron_runs USING btree (job_name, started_at DESC);


--
-- Name: idx_cron_runs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cron_runs_started ON public.cron_runs USING btree (started_at DESC);


--
-- Name: idx_cust_memberships_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_memberships_active ON public.customer_memberships USING btree (customer_user_id, shop_id) WHERE (status = 'active'::text);


--
-- Name: idx_cust_memberships_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_memberships_shop ON public.customer_memberships USING btree (shop_id);


--
-- Name: idx_cust_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_cust_memberships_user ON public.customer_memberships USING btree (customer_user_id);


--
-- Name: idx_custom_order_quotes_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_order_quotes_request ON public.custom_order_quotes USING btree (request_id, created_at DESC);


--
-- Name: idx_custom_order_requests_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_order_requests_contract ON public.custom_order_requests USING btree (contract_id);


--
-- Name: idx_custom_orders_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_orders_shop ON public.custom_order_requests USING btree (shop_id, created_at DESC);


--
-- Name: idx_custom_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_custom_orders_user ON public.custom_order_requests USING btree (user_id, created_at DESC);


--
-- Name: idx_customer_addresses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON public.customer_addresses USING btree (user_id);


--
-- Name: idx_delivery_zones_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_delivery_zones_shop ON public.delivery_zones USING btree (shop_id);


--
-- Name: idx_disputes_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.order_disputes USING btree (order_id);


--
-- Name: idx_disputes_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_disputes_shop_status ON public.order_disputes USING btree (shop_id, status);


--
-- Name: idx_dva_shop_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_dva_shop_time ON public.domain_verify_attempts USING btree (shop_id, created_at DESC);


--
-- Name: idx_expiry_reminder_shop_rules_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_expiry_reminder_shop_rules_shop ON public.expiry_reminder_shop_rules USING btree (shop_id, audience, is_active);


--
-- Name: idx_flash_sales_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_flash_sales_shop ON public.flash_sales USING btree (shop_id);


--
-- Name: idx_flash_sales_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_flash_sales_window ON public.flash_sales USING btree (starts_at, ends_at);


--
-- Name: idx_flyers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_flyers_shop ON public.flyers USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_fnb_combos_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_fnb_combos_shop ON public.fnb_combos USING btree (shop_id, sort_order);


--
-- Name: idx_freelance_contracts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_freelance_contracts_shop ON public.freelance_contracts USING btree (shop_id, created_at DESC);


--
-- Name: idx_freelance_contracts_sign_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_freelance_contracts_sign_token ON public.freelance_contracts USING btree (sign_token);


--
-- Name: idx_galleries_photographer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_galleries_photographer ON public.studio_galleries USING btree (photographer_id);


--
-- Name: idx_galleries_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_galleries_shop ON public.studio_galleries USING btree (shop_id);


--
-- Name: idx_galleries_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_galleries_token ON public.studio_galleries USING btree (share_token);


--
-- Name: idx_gallery_photos_gallery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON public.studio_gallery_photos USING btree (gallery_id);


--
-- Name: idx_ingredients_default_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ingredients_default_supplier ON public.ingredients USING btree (default_supplier_id);


--
-- Name: idx_ingredients_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_ingredients_shop ON public.ingredients USING btree (shop_id);


--
-- Name: idx_jamaah_docs_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_jamaah_docs_expiry ON public.travel_jamaah_documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_jamaah_docs_jamaah; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_jamaah_docs_jamaah ON public.travel_jamaah_documents USING btree (jamaah_id);


--
-- Name: idx_job_deliverables_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_job_deliverables_shop ON public.job_deliverables USING btree (shop_id, created_at DESC);


--
-- Name: idx_job_deliverables_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_deliverables_token ON public.job_deliverables USING btree (delivery_token);


--
-- Name: idx_leads_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_leads_shop ON public.leads USING btree (shop_id, status, created_at DESC);


--
-- Name: idx_lesson_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON public.lesson_progress USING btree (user_id);


--
-- Name: idx_loyalty_ledger_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_user ON public.loyalty_ledger USING btree (user_id, shop_id);


--
-- Name: idx_medications_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_medications_shop ON public.medications USING btree (shop_id, is_active);


--
-- Name: idx_membership_tiers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_membership_tiers_shop ON public.shop_membership_tiers USING btree (shop_id) WHERE (is_active = true);


--
-- Name: idx_menu_item_variants_attributes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_attributes ON public.menu_item_variants USING gin (attributes);


--
-- Name: idx_menu_item_variants_barcode_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_barcode_shop ON public.menu_item_variants USING btree (shop_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_menu_item_variants_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON public.menu_item_variants USING btree (menu_item_id);


--
-- Name: idx_menu_item_variants_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_shop ON public.menu_item_variants USING btree (shop_id);


--
-- Name: idx_menu_item_variants_sku_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_sku_shop ON public.menu_item_variants USING btree (shop_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_menu_items_barcode_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_barcode_shop ON public.menu_items USING btree (shop_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_menu_items_flash_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_flash_active ON public.menu_items USING btree (flash_ends_at) WHERE (flash_price IS NOT NULL);


--
-- Name: idx_menu_items_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_is_featured ON public.menu_items USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_menu_items_item_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_item_type ON public.menu_items USING btree (item_type);


--
-- Name: idx_menu_items_preorder_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_preorder_window ON public.menu_items USING btree (is_pre_order, pre_order_close_at) WHERE (is_pre_order = true);


--
-- Name: idx_menu_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_shop ON public.menu_items USING btree (shop_id, category_id, sort_order);


--
-- Name: idx_menu_items_shop_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_shop_available ON public.menu_items USING btree (shop_id, is_available);


--
-- Name: idx_menu_items_sku_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_items_sku_shop ON public.menu_items USING btree (shop_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_menu_reviews_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_reviews_menu ON public.menu_reviews USING btree (menu_item_id, created_at DESC);


--
-- Name: idx_menu_reviews_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_reviews_shop ON public.menu_reviews USING btree (shop_id, created_at DESC);


--
-- Name: idx_menu_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_menu_reviews_user ON public.menu_reviews USING btree (user_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications USING btree (recipient_user_id, created_at DESC);


--
-- Name: idx_notifications_recipient_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications USING btree (recipient_user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: idx_open_bills_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_open_bills_outlet ON public.open_bills USING btree (outlet_id, updated_at DESC);


--
-- Name: idx_option_groups_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_option_groups_menu_item ON public.menu_item_option_groups USING btree (menu_item_id);


--
-- Name: idx_options_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_options_group ON public.menu_item_options USING btree (group_id);


--
-- Name: idx_order_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_audit_log_actor ON public.order_audit_log USING btree (actor_id);


--
-- Name: idx_order_audit_log_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_audit_log_order ON public.order_audit_log USING btree (order_id);


--
-- Name: idx_order_audit_log_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_audit_log_shop_created ON public.order_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_messages_order_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_order_messages_order_created ON public.order_messages USING btree (order_id, created_at);


--
-- Name: idx_orders_channel_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_channel_status ON public.orders USING btree (channel, status);


--
-- Name: idx_orders_customer_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_customer_user ON public.orders USING btree (customer_user_id);


--
-- Name: idx_orders_escrow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON public.orders USING btree (escrow_status) WHERE (escrow_status = ANY (ARRAY['holding'::text, 'released'::text]));


--
-- Name: idx_orders_order_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_order_source ON public.orders USING btree (shop_id, business_date, order_source);


--
-- Name: idx_orders_outlet_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_outlet_date ON public.orders USING btree (outlet_id, business_date DESC, created_at DESC);


--
-- Name: idx_orders_outlet_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_outlet_status_created ON public.orders USING btree (outlet_id, status, created_at DESC);


--
-- Name: idx_orders_requires_deposit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_requires_deposit ON public.orders USING btree (shop_id, requires_deposit) WHERE (requires_deposit = true);


--
-- Name: idx_orders_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_shift ON public.orders USING btree (shift_id);


--
-- Name: idx_orders_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_shop_created ON public.orders USING btree (shop_id, created_at DESC);


--
-- Name: idx_orders_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON public.orders USING btree (tracking_number) WHERE (tracking_number IS NOT NULL);


--
-- Name: idx_outlet_couriers_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_outlet_couriers_outlet ON public.outlet_couriers USING btree (outlet_id, sort_order);


--
-- Name: idx_outlet_couriers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_outlet_couriers_shop ON public.outlet_couriers USING btree (shop_id);


--
-- Name: idx_owner_notif_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_notif_dedupe ON public.owner_notifications USING btree (shop_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: idx_owner_notif_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_owner_notif_shop ON public.owner_notifications USING btree (shop_id, created_at DESC);


--
-- Name: idx_owner_notif_shop_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_owner_notif_shop_dismissed ON public.owner_notifications USING btree (shop_id, dismissed_at) WHERE (dismissed_at IS NULL);


--
-- Name: idx_page_layout_versions_layout; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_page_layout_versions_layout ON public.page_layout_versions USING btree (layout_id, created_at DESC);


--
-- Name: idx_page_layouts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_page_layouts_scheduled ON public.page_layouts USING btree (scheduled_publish_at) WHERE ((scheduled_publish_at IS NOT NULL) AND (is_published = false));


--
-- Name: idx_parked_carts_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_parked_carts_outlet ON public.parked_carts USING btree (outlet_id, created_at DESC);


--
-- Name: idx_parked_carts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_parked_carts_shop ON public.parked_carts USING btree (shop_id);


--
-- Name: idx_patient_records_bpjs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_records_bpjs ON public.patient_records USING btree (shop_id, bpjs_number);


--
-- Name: idx_patient_records_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_records_shop ON public.patient_records USING btree (shop_id, patient_name);


--
-- Name: idx_patient_visits_icd10; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_visits_icd10 ON public.patient_visits USING btree (shop_id, icd10_code);


--
-- Name: idx_patient_visits_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON public.patient_visits USING btree (patient_id, visit_date DESC);


--
-- Name: idx_photographers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_photographers_shop ON public.studio_photographers USING btree (shop_id);


--
-- Name: idx_plan_subs_next_billing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_plan_subs_next_billing ON public.plan_subscriptions USING btree (next_billing_at) WHERE (status = 'active'::text);


--
-- Name: idx_po_audit_log_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_audit_log_po_id ON public.po_audit_log USING btree (po_id, created_at DESC);


--
-- Name: idx_po_audit_log_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_audit_log_shop_id ON public.po_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_po_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_po_shop ON public.purchase_orders USING btree (shop_id, status);


--
-- Name: idx_poi_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poi_po ON public.purchase_order_items USING btree (po_id);


--
-- Name: idx_portfolio_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_portfolio_shop ON public.shop_portfolio USING btree (shop_id, sort_order);


--
-- Name: idx_pos_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pos_audit_action ON public.pos_audit_log USING btree (shop_id, action, created_at DESC);


--
-- Name: idx_pos_audit_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pos_audit_outlet ON public.pos_audit_log USING btree (outlet_id, created_at DESC);


--
-- Name: idx_pos_audit_shop_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pos_audit_shop_date ON public.pos_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_presc_items_presc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_presc_items_presc ON public.prescription_items USING btree (prescription_id);


--
-- Name: idx_prescriptions_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_prescriptions_shop ON public.prescriptions USING btree (shop_id, issued_at DESC);


--
-- Name: idx_printers_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_printers_outlet ON public.printers USING btree (outlet_id);


--
-- Name: idx_printers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_printers_shop ON public.printers USING btree (shop_id);


--
-- Name: idx_product_attribute_defs_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_attribute_defs_cat ON public.product_attribute_defs USING btree (category_id);


--
-- Name: idx_product_attribute_defs_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_attribute_defs_shop ON public.product_attribute_defs USING btree (shop_id);


--
-- Name: idx_product_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews USING btree (product_id, created_at DESC) WHERE (NOT is_hidden);


--
-- Name: idx_product_reviews_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_reviews_shop ON public.product_reviews USING btree (shop_id, created_at DESC) WHERE (NOT is_hidden);


--
-- Name: idx_product_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_product_reviews_user ON public.product_reviews USING btree (user_id, created_at DESC);


--
-- Name: idx_promo_red_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_promo_red_order ON public.promo_redemptions USING btree (order_id);


--
-- Name: idx_promo_red_promo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_promo_red_promo ON public.promo_redemptions USING btree (promo_id);


--
-- Name: idx_promos_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_promos_shop ON public.promos USING btree (shop_id);


--
-- Name: idx_push_subscriptions_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_shop ON public.push_subscriptions USING btree (shop_id);


--
-- Name: idx_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_pvr_voucher_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_pvr_voucher_user ON public.platform_voucher_redemptions USING btree (voucher_id, user_id);


--
-- Name: idx_qa_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_product ON public.product_qa USING btree (product_id);


--
-- Name: idx_qa_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_qa_shop ON public.product_qa USING btree (shop_id);


--
-- Name: idx_recipes_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recipes_ingredient ON public.recipes USING btree (ingredient_id);


--
-- Name: idx_recipes_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_recipes_menu ON public.recipes USING btree (menu_item_id);


--
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.refunds USING btree (order_id);


--
-- Name: idx_refunds_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_refunds_shop ON public.refunds USING btree (shop_id);


--
-- Name: idx_rental_bookings_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_bookings_shop ON public.rental_bookings USING btree (shop_id, start_date);


--
-- Name: idx_rental_bookings_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_bookings_unit ON public.rental_bookings USING btree (unit_id, start_date, end_date);


--
-- Name: idx_rental_insp_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_insp_booking ON public.rental_inspections USING btree (booking_id);


--
-- Name: idx_rental_units_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_rental_units_shop ON public.rental_units USING btree (shop_id);


--
-- Name: idx_reschedule_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_token ON public.booking_reschedule_tokens USING btree (token);


--
-- Name: idx_restock_sub_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_restock_sub_shop ON public.restock_subscribers USING btree (shop_id);


--
-- Name: idx_returns_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_returns_shop ON public.product_returns USING btree (shop_id, status);


--
-- Name: idx_sales_offerings_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_sales_offerings_shop ON public.sales_offerings USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_service_bundle_items_bundle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_service_bundle_items_bundle ON public.service_bundle_items USING btree (bundle_id, sort_order);


--
-- Name: idx_service_bundles_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_service_bundles_shop ON public.service_bundles USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_shifts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_shop ON public.shifts USING btree (shop_id);


--
-- Name: idx_shifts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shifts_user ON public.shifts USING btree (user_id);


--
-- Name: idx_shop_chat_messages_chat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_chat ON public.shop_chat_messages USING btree (chat_id, created_at);


--
-- Name: idx_shop_chat_messages_unread_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_unread_buyer ON public.shop_chat_messages USING btree (chat_id) WHERE ((read_at IS NULL) AND (sender_role = 'seller'::text));


--
-- Name: idx_shop_chats_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chats_buyer ON public.shop_chats USING btree (buyer_user_id, last_message_at DESC);


--
-- Name: idx_shop_chats_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_chats_shop ON public.shop_chats USING btree (shop_id, last_message_at DESC);


--
-- Name: idx_shop_customers_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_customers_segment ON public.shop_customers USING btree (shop_id, segment);


--
-- Name: idx_shop_customers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_customers_shop ON public.shop_customers USING btree (shop_id);


--
-- Name: idx_shop_customers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_customers_user ON public.shop_customers USING btree (user_id);


--
-- Name: idx_shop_size_charts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_size_charts_shop ON public.shop_size_charts USING btree (shop_id);


--
-- Name: idx_shop_verifications_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_verifications_shop_id ON public.shop_verifications USING btree (shop_id);


--
-- Name: idx_shop_verifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_verifications_status ON public.shop_verifications USING btree (status);


--
-- Name: idx_shop_vouchers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_shop_vouchers_shop ON public.shop_vouchers USING btree (shop_id);


--
-- Name: idx_staff_audit_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_audit_shop_created ON public.staff_audit_logs USING btree (shop_id, created_at DESC);


--
-- Name: idx_staff_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON public.staff_invitations USING btree (email);


--
-- Name: idx_staff_invitations_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_invitations_shop ON public.staff_invitations USING btree (shop_id);


--
-- Name: idx_staff_members_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_members_shop ON public.staff_members USING btree (shop_id);


--
-- Name: idx_staff_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_staff_members_user ON public.staff_members USING btree (user_id);


--
-- Name: idx_stock_movements_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON public.stock_movements USING btree (ingredient_id, created_at DESC);


--
-- Name: idx_stock_movements_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_movements_shop ON public.stock_movements USING btree (shop_id, created_at DESC);


--
-- Name: idx_stock_opname_items_opname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname ON public.stock_opname_items USING btree (stock_opname_id);


--
-- Name: idx_stock_opnames_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_stock_opnames_shop ON public.stock_opnames USING btree (shop_id, created_at DESC);


--
-- Name: idx_studio_locations_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_studio_locations_shop ON public.studio_locations USING btree (shop_id, sort_order);


--
-- Name: idx_studio_packages_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_studio_packages_shop ON public.studio_packages USING btree (shop_id, sort_order);


--
-- Name: idx_system_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_system_audit_created ON public.system_audit USING btree (created_at DESC);


--
-- Name: idx_system_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_system_audit_event ON public.system_audit USING btree (event_type, created_at DESC);


--
-- Name: idx_system_audit_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_system_audit_shop ON public.system_audit USING btree (shop_id, created_at DESC);


--
-- Name: idx_testimonials_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_testimonials_shop ON public.testimonials USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_topup_presets_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topup_presets_shop ON public.wallet_topup_presets USING btree (shop_id) WHERE (is_active = true);


--
-- Name: idx_topups_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topups_shop ON public.wallet_topups USING btree (shop_id, created_at DESC);


--
-- Name: idx_topups_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topups_status ON public.wallet_topups USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_topups_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_topups_user ON public.wallet_topups USING btree (customer_user_id, created_at DESC);


--
-- Name: idx_travel_inst_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_inst_shop ON public.travel_installments USING btree (shop_id);


--
-- Name: idx_travel_itineraries_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_itineraries_pkg ON public.travel_itineraries USING btree (package_id, day_number, sort_order);


--
-- Name: idx_travel_manifest_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_manifest_pkg ON public.travel_jamaah_manifest USING btree (package_id);


--
-- Name: idx_travel_manifest_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_travel_manifest_shop ON public.travel_jamaah_manifest USING btree (shop_id);


--
-- Name: idx_treatments_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_treatments_shop ON public.customer_treatments USING btree (shop_id, performed_at DESC);


--
-- Name: idx_umroh_facilities_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_umroh_facilities_shop ON public.umroh_facilities USING btree (shop_id, sort_order);


--
-- Name: idx_umroh_faqs_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_umroh_faqs_shop ON public.umroh_faqs USING btree (shop_id, category, sort_order);


--
-- Name: idx_umroh_packages_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_umroh_packages_shop ON public.umroh_packages USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_upsell_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_upsell_product ON public.product_upsell_suggestions USING btree (product_id, "position");


--
-- Name: idx_upsell_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_upsell_shop ON public.product_upsell_suggestions USING btree (shop_id);


--
-- Name: idx_upsell_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_upsell_source ON public.product_upsell_suggestions USING btree (source);


--
-- Name: idx_waitlist_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_waitlist_shop_status ON public.booking_waitlist USING btree (shop_id, status);


--
-- Name: idx_wallet_tx_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.customer_wallet_transactions USING btree (customer_user_id, created_at DESC);


--
-- Name: idx_wallet_tx_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.customer_wallet_transactions USING btree (wallet_id, created_at DESC);


--
-- Name: idx_wallet_txn_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_order ON public.wallet_transactions USING btree (order_id);


--
-- Name: idx_wallet_txn_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wallet_txn_shop_created ON public.wallet_transactions USING btree (shop_id, created_at DESC);


--
-- Name: idx_webhook_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON public.webhook_events USING btree (created_at DESC);


--
-- Name: idx_wishlists_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wishlists_menu_item ON public.wishlists USING btree (menu_item_id);


--
-- Name: idx_wishlists_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists USING btree (user_id);


--
-- Name: idx_withdrawals_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawals_shop_status ON public.withdrawal_requests USING btree (shop_id, status, created_at DESC);


--
-- Name: idx_withdrawals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawal_requests USING btree (status, created_at DESC);


--
-- Name: orders_courier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS orders_courier_id_idx ON public.orders USING btree (courier_id);


--
-- Name: orders_shop_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS orders_shop_status_idx ON public.orders USING btree (shop_id, status);


--
-- Name: page_layouts_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS page_layouts_published_idx ON public.page_layouts USING btree (shop_id, page_type) WHERE (is_published = true);


--
-- Name: page_layouts_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS page_layouts_shop_idx ON public.page_layouts USING btree (shop_id);


--
-- Name: page_layouts_shop_page_slug_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS page_layouts_shop_page_slug_uniq ON public.page_layouts USING btree (shop_id, page_type, COALESCE(slug, ''::text));


--
-- Name: plan_invoices_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS plan_invoices_shop_idx ON public.plan_invoices USING btree (shop_id);


--
-- Name: plan_invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS plan_invoices_status_idx ON public.plan_invoices USING btree (status);


--
-- Name: shop_backups_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS shop_backups_shop_idx ON public.shop_backups USING btree (shop_id, created_at DESC);


--
-- Name: uq_orders_idem_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idem_shop ON public.orders USING btree (shop_id, client_idempotency_key) WHERE (client_idempotency_key IS NOT NULL);


--
-- Name: uq_orders_outlet_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_outlet_order_no ON public.orders USING btree (outlet_id, order_no);


--
-- Name: menu_hpp_view _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.menu_hpp_view WITH (security_invoker='true') AS
 SELECT m.id AS menu_item_id,
    m.shop_id,
    m.name,
    m.price,
    COALESCE(sum((r.quantity * i.cost_per_unit)), (0)::numeric) AS hpp,
    (m.price - COALESCE(sum((r.quantity * i.cost_per_unit)), (0)::numeric)) AS margin,
        CASE
            WHEN (m.price > (0)::numeric) THEN round((((m.price - COALESCE(sum((r.quantity * i.cost_per_unit)), (0)::numeric)) / m.price) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS margin_percent,
    GREATEST(m.updated_at, COALESCE(max(i.updated_at), m.updated_at)) AS last_updated,
    count(r.id) AS recipe_count
   FROM ((public.menu_items m
     LEFT JOIN public.recipes r ON ((r.menu_item_id = m.id)))
     LEFT JOIN public.ingredients i ON ((i.id = r.ingredient_id)))
  GROUP BY m.id;


--
-- Name: backup_schedules backup_schedules_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS backup_schedules_touch_updated_at ON public.backup_schedules;
CREATE TRIGGER backup_schedules_touch_updated_at BEFORE UPDATE ON public.backup_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: cash_shifts cash_shifts_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS cash_shifts_touch ON public.cash_shifts;
CREATE TRIGGER cash_shifts_touch BEFORE UPDATE ON public.cash_shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: categories categories_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS categories_touch ON public.categories;
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: loyalty_settings loyalty_settings_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS loyalty_settings_touch ON public.loyalty_settings;
CREATE TRIGGER loyalty_settings_touch BEFORE UPDATE ON public.loyalty_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: menu_items menu_items_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS menu_items_touch ON public.menu_items;
CREATE TRIGGER menu_items_touch BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: open_bills open_bills_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS open_bills_touch ON public.open_bills;
CREATE TRIGGER open_bills_touch BEFORE UPDATE ON public.open_bills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders orders_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS orders_touch ON public.orders;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: plan_invoices plan_invoices_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS plan_invoices_touch ON public.plan_invoices;
CREATE TRIGGER plan_invoices_touch BEFORE UPDATE ON public.plan_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: plans plans_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS plans_touch ON public.plans;
CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: promos promos_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS promos_touch ON public.promos;
CREATE TRIGGER promos_touch BEFORE UPDATE ON public.promos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: push_subscriptions push_subscriptions_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS push_subscriptions_touch ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_touch BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shop_verifications shop_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS shop_verifications_updated_at ON public.shop_verifications;
CREATE TRIGGER shop_verifications_updated_at BEFORE UPDATE ON public.shop_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_requests trg_ad_requests_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_ad_requests_updated ON public.ad_requests;
CREATE TRIGGER trg_ad_requests_updated BEFORE UPDATE ON public.ad_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: stock_movements trg_apply_stock_movement; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_apply_stock_movement ON public.stock_movements;
CREATE TRIGGER trg_apply_stock_movement AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();


--
-- Name: attendances trg_attendances_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_attendances_updated ON public.attendances;
CREATE TRIGGER trg_attendances_updated BEFORE UPDATE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders trg_auto_release_escrow; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_auto_release_escrow ON public.orders;
CREATE TRIGGER trg_auto_release_escrow AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_release_escrow_on_complete();


--
-- Name: booking_slots trg_booking_slots_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_booking_slots_updated ON public.booking_slots;
CREATE TRIGGER trg_booking_slots_updated BEFORE UPDATE ON public.booking_slots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bookings trg_bookings_fill_shop; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_bookings_fill_shop ON public.bookings;
CREATE TRIGGER trg_bookings_fill_shop BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_fill_shop_id();


--
-- Name: bookings trg_bookings_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_bookings_updated ON public.bookings;
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: attendances trg_calc_attendance_duration; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_calc_attendance_duration ON public.attendances;
CREATE TRIGGER trg_calc_attendance_duration BEFORE INSERT OR UPDATE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.calc_attendance_duration();


--
-- Name: marketplace_cart_items trg_cart_items_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cart_items_updated ON public.marketplace_cart_items;
CREATE TRIGGER trg_cart_items_updated BEFORE UPDATE ON public.marketplace_cart_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: marketplace_carts trg_carts_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_carts_updated ON public.marketplace_carts;
CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.marketplace_carts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bookings trg_check_booking_capacity; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_check_booking_capacity ON public.bookings;
CREATE TRIGGER trg_check_booking_capacity BEFORE INSERT OR UPDATE OF slot_id, party_size, status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.check_booking_capacity();


--
-- Name: order_items trg_consume_stock_for_order_item; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_consume_stock_for_order_item ON public.order_items;
CREATE TRIGGER trg_consume_stock_for_order_item AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.consume_stock_for_order_item();


--
-- Name: custom_order_requests trg_cor_status_history_ins; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cor_status_history_ins ON public.custom_order_requests;
CREATE TRIGGER trg_cor_status_history_ins AFTER INSERT ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.log_custom_order_status_change();


--
-- Name: custom_order_requests trg_cor_status_history_upd; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cor_status_history_upd ON public.custom_order_requests;
CREATE TRIGGER trg_cor_status_history_upd AFTER UPDATE OF status ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.log_custom_order_status_change();


--
-- Name: couriers trg_couriers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_couriers_updated ON public.couriers;
CREATE TRIGGER trg_couriers_updated BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_memberships trg_cust_memberships_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cust_memberships_updated ON public.customer_memberships;
CREATE TRIGGER trg_cust_memberships_updated BEFORE UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_wallets trg_cust_wallets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_cust_wallets_updated ON public.customer_wallets;
CREATE TRIGGER trg_cust_wallets_updated BEFORE UPDATE ON public.customer_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: custom_order_quotes trg_custom_order_quotes_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_custom_order_quotes_updated ON public.custom_order_quotes;
CREATE TRIGGER trg_custom_order_quotes_updated BEFORE UPDATE ON public.custom_order_quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_addresses trg_customer_addresses_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_customer_addresses_updated ON public.customer_addresses;
CREATE TRIGGER trg_customer_addresses_updated BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_profiles trg_customer_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_customer_profiles_updated ON public.customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: delivery_settings trg_delivery_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_delivery_settings_updated ON public.delivery_settings;
CREATE TRIGGER trg_delivery_settings_updated BEFORE UPDATE ON public.delivery_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: delivery_zones trg_delivery_zones_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_delivery_zones_updated ON public.delivery_zones;
CREATE TRIGGER trg_delivery_zones_updated BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: order_disputes trg_disputes_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_disputes_updated ON public.order_disputes;
CREATE TRIGGER trg_disputes_updated BEFORE UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders trg_enforce_qr_table_lock; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_enforce_qr_table_lock ON public.orders;
CREATE TRIGGER trg_enforce_qr_table_lock BEFORE UPDATE OF table_label, order_source ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_qr_table_lock();


--
-- Name: features trg_features_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_features_touch ON public.features;
CREATE TRIGGER trg_features_touch BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: flyers trg_flyers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_flyers_updated ON public.flyers;
CREATE TRIGGER trg_flyers_updated BEFORE UPDATE ON public.flyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: studio_galleries trg_galleries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_galleries_updated_at ON public.studio_galleries;
CREATE TRIGGER trg_galleries_updated_at BEFORE UPDATE ON public.studio_galleries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ingredients trg_ingredients_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_ingredients_updated ON public.ingredients;
CREATE TRIGGER trg_ingredients_updated BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: lesson_progress trg_issue_course_certificate; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_issue_course_certificate ON public.lesson_progress;
CREATE TRIGGER trg_issue_course_certificate AFTER INSERT OR UPDATE OF completed_at ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.fn_issue_course_certificate();


--
-- Name: travel_jamaah_documents trg_jamaah_docs_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_jamaah_docs_updated ON public.travel_jamaah_documents;
CREATE TRIGGER trg_jamaah_docs_updated BEFORE UPDATE ON public.travel_jamaah_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_deliverables trg_job_deliverables_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_job_deliverables_updated ON public.job_deliverables;
CREATE TRIGGER trg_job_deliverables_updated BEFORE UPDATE ON public.job_deliverables FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: leads trg_leads_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_leads_updated ON public.leads;
CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts trg_log_shift_change; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_log_shift_change ON public.shifts;
CREATE TRIGGER trg_log_shift_change AFTER INSERT OR DELETE OR UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.log_shift_change();


--
-- Name: medications trg_medications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_medications_updated_at ON public.medications;
CREATE TRIGGER trg_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_membership_tiers trg_membership_tiers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_membership_tiers_updated ON public.shop_membership_tiers;
CREATE TRIGGER trg_membership_tiers_updated BEFORE UPDATE ON public.shop_membership_tiers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: order_disputes trg_notify_dispute_event; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_dispute_event ON public.order_disputes;
CREATE TRIGGER trg_notify_dispute_event AFTER INSERT OR UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_event();


--
-- Name: ingredients trg_notify_low_stock; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.ingredients;
CREATE TRIGGER trg_notify_low_stock AFTER INSERT OR UPDATE OF current_stock, min_stock ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();


--
-- Name: customer_memberships trg_notify_membership; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_membership ON public.customer_memberships;
CREATE TRIGGER trg_notify_membership AFTER INSERT ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.notify_membership_event();


--
-- Name: orders trg_notify_new_marketplace_order; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_new_marketplace_order ON public.orders;
CREATE TRIGGER trg_notify_new_marketplace_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_marketplace_order();


--
-- Name: orders trg_notify_order_status_change; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: wallet_topups trg_notify_wallet_topup; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_wallet_topup ON public.wallet_topups;
CREATE TRIGGER trg_notify_wallet_topup AFTER INSERT OR UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_topup_event();


--
-- Name: withdrawal_requests trg_notify_withdrawal_status; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_notify_withdrawal_status ON public.withdrawal_requests;
CREATE TRIGGER trg_notify_withdrawal_status AFTER UPDATE OF status ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();


--
-- Name: outlet_couriers trg_outlet_couriers_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_outlet_couriers_touch ON public.outlet_couriers;
CREATE TRIGGER trg_outlet_couriers_touch BEFORE UPDATE ON public.outlet_couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: outlets trg_outlets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_outlets_updated ON public.outlets;
CREATE TRIGGER trg_outlets_updated BEFORE UPDATE ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: parked_carts trg_parked_carts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_parked_carts_updated_at ON public.parked_carts;
CREATE TRIGGER trg_parked_carts_updated_at BEFORE UPDATE ON public.parked_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patient_records trg_patient_records_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_patient_records_updated ON public.patient_records;
CREATE TRIGGER trg_patient_records_updated BEFORE UPDATE ON public.patient_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: studio_photographers trg_photographers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_photographers_updated_at ON public.studio_photographers;
CREATE TRIGGER trg_photographers_updated_at BEFORE UPDATE ON public.studio_photographers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_vouchers trg_platform_vouchers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_platform_vouchers_updated ON public.platform_vouchers;
CREATE TRIGGER trg_platform_vouchers_updated BEFORE UPDATE ON public.platform_vouchers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: purchase_orders trg_po_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_po_updated ON public.purchase_orders;
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: user_preferences trg_prefs_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_prefs_updated ON public.user_preferences;
CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: prescriptions trg_prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_qa trg_product_qa_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_product_qa_updated ON public.product_qa;
CREATE TRIGGER trg_product_qa_updated BEFORE UPDATE ON public.product_qa FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: product_reviews trg_product_reviews_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_product_reviews_updated ON public.product_reviews;
CREATE TRIGGER trg_product_reviews_updated BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles trg_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: product_reviews trg_refresh_product_rating; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_refresh_product_rating ON public.product_reviews;
CREATE TRIGGER trg_refresh_product_rating AFTER INSERT OR DELETE OR UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();


--
-- Name: restock_subscribers trg_restock_sub_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_restock_sub_updated ON public.restock_subscribers;
CREATE TRIGGER trg_restock_sub_updated BEFORE UPDATE ON public.restock_subscribers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: sales_offerings trg_sales_offerings_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_sales_offerings_updated ON public.sales_offerings;
CREATE TRIGGER trg_sales_offerings_updated BEFORE UPDATE ON public.sales_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings trg_set_booking_type; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_set_booking_type ON public.bookings;
CREATE TRIGGER trg_set_booking_type BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_type_from_slot();


--
-- Name: orders trg_set_order_no; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_set_order_no ON public.orders;
CREATE TRIGGER trg_set_order_no BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_no();


--
-- Name: shifts trg_shifts_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shifts_updated ON public.shifts;
CREATE TRIGGER trg_shifts_updated BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shop_about trg_shop_about_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shop_about_updated ON public.shop_about;
CREATE TRIGGER trg_shop_about_updated BEFORE UPDATE ON public.shop_about FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_chat_messages trg_shop_chat_last_msg; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shop_chat_last_msg ON public.shop_chat_messages;
CREATE TRIGGER trg_shop_chat_last_msg AFTER INSERT ON public.shop_chat_messages FOR EACH ROW EXECUTE FUNCTION public.shop_chat_set_last_message_at();


--
-- Name: shop_wallets trg_shop_wallets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shop_wallets_updated ON public.shop_wallets;
CREATE TRIGGER trg_shop_wallets_updated BEFORE UPDATE ON public.shop_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shops trg_shops_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_shops_updated ON public.shops;
CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: studio_locations trg_studio_locations_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_studio_locations_updated ON public.studio_locations;
CREATE TRIGGER trg_studio_locations_updated BEFORE UPDATE ON public.studio_locations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: suppliers trg_suppliers_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: testimonials trg_testimonials_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_testimonials_updated ON public.testimonials;
CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: themes trg_themes_touch; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_themes_touch ON public.themes;
CREATE TRIGGER trg_themes_touch BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: wallet_topup_presets trg_topup_presets_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_topup_presets_updated ON public.wallet_topup_presets;
CREATE TRIGGER trg_topup_presets_updated BEFORE UPDATE ON public.wallet_topup_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: travel_installments trg_travel_inst_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_travel_inst_updated_at ON public.travel_installments;
CREATE TRIGGER trg_travel_inst_updated_at BEFORE UPDATE ON public.travel_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_itineraries trg_travel_itineraries_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_travel_itineraries_updated ON public.travel_itineraries;
CREATE TRIGGER trg_travel_itineraries_updated BEFORE UPDATE ON public.travel_itineraries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_jamaah_manifest trg_travel_manifest_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_travel_manifest_updated_at ON public.travel_jamaah_manifest;
CREATE TRIGGER trg_travel_manifest_updated_at BEFORE UPDATE ON public.travel_jamaah_manifest FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_facilities trg_umroh_facilities_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_umroh_facilities_updated ON public.umroh_facilities;
CREATE TRIGGER trg_umroh_facilities_updated BEFORE UPDATE ON public.umroh_facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_faqs trg_umroh_faqs_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_umroh_faqs_updated ON public.umroh_faqs;
CREATE TRIGGER trg_umroh_faqs_updated BEFORE UPDATE ON public.umroh_faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_packages trg_umroh_packages_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_umroh_packages_updated ON public.umroh_packages;
CREATE TRIGGER trg_umroh_packages_updated BEFORE UPDATE ON public.umroh_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_chat_messages trg_update_shop_chat_last_message; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_update_shop_chat_last_message ON public.shop_chat_messages;
CREATE TRIGGER trg_update_shop_chat_last_message AFTER INSERT ON public.shop_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_shop_chat_last_message();


--
-- Name: product_upsell_suggestions trg_upsell_fill_shop; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_upsell_fill_shop ON public.product_upsell_suggestions;
CREATE TRIGGER trg_upsell_fill_shop BEFORE INSERT ON public.product_upsell_suggestions FOR EACH ROW EXECUTE FUNCTION public.upsell_fill_shop_id();


--
-- Name: product_upsell_suggestions trg_upsell_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_upsell_updated_at ON public.product_upsell_suggestions;
CREATE TRIGGER trg_upsell_updated_at BEFORE UPDATE ON public.product_upsell_suggestions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders trg_upsert_shop_customer; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_upsert_shop_customer ON public.orders;
CREATE TRIGGER trg_upsert_shop_customer AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.upsert_shop_customer_on_order();


--
-- Name: business_categories trg_validate_business_category_flow_types; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_business_category_flow_types ON public.business_categories;
CREATE TRIGGER trg_validate_business_category_flow_types BEFORE INSERT OR UPDATE ON public.business_categories FOR EACH ROW EXECUTE FUNCTION public.validate_business_category_flow_types();


--
-- Name: plan_features trg_validate_plan_feature_min_months; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_plan_feature_min_months ON public.plan_features;
CREATE TRIGGER trg_validate_plan_feature_min_months BEFORE INSERT OR UPDATE ON public.plan_features FOR EACH ROW EXECUTE FUNCTION public.validate_plan_feature_min_months();


--
-- Name: plan_themes trg_validate_plan_theme_min_months; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_plan_theme_min_months ON public.plan_themes;
CREATE TRIGGER trg_validate_plan_theme_min_months BEFORE INSERT OR UPDATE ON public.plan_themes FOR EACH ROW EXECUTE FUNCTION public.validate_plan_theme_min_months();


--
-- Name: shifts trg_validate_shift_no_overlap; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_validate_shift_no_overlap ON public.shifts;
CREATE TRIGGER trg_validate_shift_no_overlap BEFORE INSERT OR UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.validate_shift_no_overlap();


--
-- Name: wallet_topups trg_wallet_topups_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_wallet_topups_updated ON public.wallet_topups;
CREATE TRIGGER trg_wallet_topups_updated BEFORE UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: withdrawal_requests trg_withdrawals_updated; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_withdrawals_updated ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: banners update_banners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_banners_updated_at ON public.banners;
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bulk_pricing_rules update_bulk_pricing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_bulk_pricing_rules_updated_at ON public.bulk_pricing_rules;
CREATE TRIGGER update_bulk_pricing_rules_updated_at BEFORE UPDATE ON public.bulk_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_order_requests update_custom_order_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_custom_order_requests_updated_at ON public.custom_order_requests;
CREATE TRIGGER update_custom_order_requests_updated_at BEFORE UPDATE ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_segments update_customer_segments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_customer_segments_updated_at ON public.customer_segments;
CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_rules update_expiry_reminder_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_expiry_reminder_rules_updated_at ON public.expiry_reminder_rules;
CREATE TRIGGER update_expiry_reminder_rules_updated_at BEFORE UPDATE ON public.expiry_reminder_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_shop_rules update_expiry_reminder_shop_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_expiry_reminder_shop_rules_updated_at ON public.expiry_reminder_shop_rules;
CREATE TRIGGER update_expiry_reminder_shop_rules_updated_at BEFORE UPDATE ON public.expiry_reminder_shop_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_shop_settings update_expiry_reminder_shop_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_expiry_reminder_shop_settings_updated_at ON public.expiry_reminder_shop_settings;
CREATE TRIGGER update_expiry_reminder_shop_settings_updated_at BEFORE UPDATE ON public.expiry_reminder_shop_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: flash_sales update_flash_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_flash_sales_updated_at ON public.flash_sales;
CREATE TRIGGER update_flash_sales_updated_at BEFORE UPDATE ON public.flash_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketing_campaigns update_marketing_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_marketing_campaigns_updated_at ON public.marketing_campaigns;
CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_variants update_menu_item_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_menu_item_variants_updated_at ON public.menu_item_variants;
CREATE TRIGGER update_menu_item_variants_updated_at BEFORE UPDATE ON public.menu_item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_reviews update_menu_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_menu_reviews_updated_at ON public.menu_reviews;
CREATE TRIGGER update_menu_reviews_updated_at BEFORE UPDATE ON public.menu_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_option_groups update_option_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_option_groups_updated_at ON public.menu_item_option_groups;
CREATE TRIGGER update_option_groups_updated_at BEFORE UPDATE ON public.menu_item_option_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_options update_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_options_updated_at ON public.menu_item_options;
CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON public.menu_item_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: page_layouts update_page_layouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_page_layouts_updated_at ON public.page_layouts;
CREATE TRIGGER update_page_layouts_updated_at BEFORE UPDATE ON public.page_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plan_subscriptions update_plan_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_plan_subscriptions_updated_at ON public.plan_subscriptions;
CREATE TRIGGER update_plan_subscriptions_updated_at BEFORE UPDATE ON public.plan_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: printers update_printers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_printers_updated_at ON public.printers;
CREATE TRIGGER update_printers_updated_at BEFORE UPDATE ON public.printers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_attribute_defs update_product_attribute_defs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_product_attribute_defs_updated_at ON public.product_attribute_defs;
CREATE TRIGGER update_product_attribute_defs_updated_at BEFORE UPDATE ON public.product_attribute_defs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_bundles update_service_bundles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_service_bundles_updated_at ON public.service_bundles;
CREATE TRIGGER update_service_bundles_updated_at BEFORE UPDATE ON public.service_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_customers update_shop_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_shop_customers_updated_at ON public.shop_customers;
CREATE TRIGGER update_shop_customers_updated_at BEFORE UPDATE ON public.shop_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_vouchers update_shop_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_shop_vouchers_updated_at ON public.shop_vouchers;
CREATE TRIGGER update_shop_vouchers_updated_at BEFORE UPDATE ON public.shop_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_members update_staff_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_staff_members_updated_at ON public.staff_members;
CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_opnames update_stock_opnames_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS update_stock_opnames_updated_at ON public.stock_opnames;
CREATE TRIGGER update_stock_opnames_updated_at BEFORE UPDATE ON public.stock_opnames FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
