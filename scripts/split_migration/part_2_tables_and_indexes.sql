SET statement_timeout = 0;
2	SET lock_timeout = 0;
3	SET idle_in_transaction_session_timeout = 0;
4	SET transaction_timeout = 0;
5	SET client_encoding = 'UTF8';
6	SET standard_conforming_strings = on;
7	SELECT pg_catalog.set_config('search_path', 'public,storage', false);
8	SET check_function_bodies = false;
9	SET xmloption = content;
10	SET client_min_messages = warning;
11	SET row_security = off;
12	
13	

--
-- Name: billing_settings billing_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_settings
    ADD CONSTRAINT billing_settings_pkey PRIMARY KEY (id);


--
-- Name: booking_reschedule_tokens booking_reschedule_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reschedule_tokens
    ADD CONSTRAINT booking_reschedule_tokens_pkey PRIMARY KEY (id);


--
-- Name: booking_reschedule_tokens booking_reschedule_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reschedule_tokens
    ADD CONSTRAINT booking_reschedule_tokens_token_key UNIQUE (token);


--
-- Name: booking_review_requests booking_review_requests_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_booking_id_key UNIQUE (booking_id);


--
-- Name: booking_review_requests booking_review_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_pkey PRIMARY KEY (id);


--
-- Name: booking_reviews booking_reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: booking_reviews booking_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_pkey PRIMARY KEY (id);


--
-- Name: booking_slots booking_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT booking_slots_pkey PRIMARY KEY (id);


--
-- Name: booking_waitlist booking_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: branding_audit branding_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branding_audit
    ADD CONSTRAINT branding_audit_pkey PRIMARY KEY (id);


--
-- Name: bulk_pricing_rules bulk_pricing_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_pkey PRIMARY KEY (id);


--
-- Name: bundle_items bundle_items_bundle_id_component_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_component_id_key UNIQUE (bundle_id, component_id);


--
-- Name: bundle_items bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);


--
-- Name: business_categories business_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_categories
    ADD CONSTRAINT business_categories_slug_key UNIQUE (slug);


--
-- Name: campaign_recipients campaign_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_pkey PRIMARY KEY (id);


--
-- Name: cash_movements cash_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_pkey PRIMARY KEY (id);


--
-- Name: cash_shifts cash_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_shifts
    ADD CONSTRAINT cash_shifts_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: shops coffee_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_pkey PRIMARY KEY (id);


--
-- Name: shops coffee_shops_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_slug_key UNIQUE (slug);


--
-- Name: couriers couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.couriers
    ADD CONSTRAINT couriers_pkey PRIMARY KEY (id);


--
-- Name: course_certificates course_certificates_certificate_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_certificate_number_key UNIQUE (certificate_number);


--
-- Name: course_certificates course_certificates_course_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_course_id_user_id_key UNIQUE (course_id, user_id);


--
-- Name: course_certificates course_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_user_id_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_menu_item_id_key UNIQUE (user_id, menu_item_id);


--
-- Name: course_lessons course_lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_pkey PRIMARY KEY (id);


--
-- Name: course_modules course_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_pkey PRIMARY KEY (id);


--
-- Name: cron_runs cron_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cron_runs
    ADD CONSTRAINT cron_runs_pkey PRIMARY KEY (id);


--
-- Name: custom_order_quotes custom_order_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_pkey PRIMARY KEY (id);


--
-- Name: custom_order_requests custom_order_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_pkey PRIMARY KEY (id);


--
-- Name: custom_order_status_history custom_order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_status_history
    ADD CONSTRAINT custom_order_status_history_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_favorites customer_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorites
    ADD CONSTRAINT customer_favorites_pkey PRIMARY KEY (id);


--
-- Name: customer_favorites customer_favorites_user_id_shop_id_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_favorites
    ADD CONSTRAINT customer_favorites_user_id_shop_id_menu_item_id_key UNIQUE (user_id, shop_id, menu_item_id);


--
-- Name: customer_memberships customer_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_pkey PRIMARY KEY (id);


--
-- Name: customer_profiles customer_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_profiles
    ADD CONSTRAINT customer_profiles_user_id_key UNIQUE (user_id);


--
-- Name: customer_segments customer_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_pkey PRIMARY KEY (id);


--
-- Name: customer_segments customer_segments_shop_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_segments
    ADD CONSTRAINT customer_segments_shop_id_name_key UNIQUE (shop_id, name);


--
-- Name: customer_treatments customer_treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_pkey PRIMARY KEY (id);


--
-- Name: customer_wallet_transactions customer_wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallet_transactions
    ADD CONSTRAINT customer_wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: customer_wallets customer_wallets_customer_user_id_shop_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_customer_user_id_shop_id_key UNIQUE (customer_user_id, shop_id);


--
-- Name: customer_wallets customer_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_pkey PRIMARY KEY (id);


--
-- Name: delivery_settings delivery_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_settings
    ADD CONSTRAINT delivery_settings_pkey PRIMARY KEY (shop_id);


--
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- Name: domain_audit domain_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_audit
    ADD CONSTRAINT domain_audit_pkey PRIMARY KEY (id);


--
-- Name: domain_blacklist domain_blacklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_blacklist
    ADD CONSTRAINT domain_blacklist_pkey PRIMARY KEY (domain);


--
-- Name: domain_verify_attempts domain_verify_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_verify_attempts
    ADD CONSTRAINT domain_verify_attempts_pkey PRIMARY KEY (id);


--
-- Name: expiry_reminder_rules expiry_reminder_rules_audience_days_before_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_rules
    ADD CONSTRAINT expiry_reminder_rules_audience_days_before_key UNIQUE (audience, days_before);


--
-- Name: expiry_reminder_rules expiry_reminder_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_rules
    ADD CONSTRAINT expiry_reminder_rules_pkey PRIMARY KEY (id);


--
-- Name: expiry_reminder_shop_rules expiry_reminder_shop_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_pkey PRIMARY KEY (id);


--
-- Name: expiry_reminder_shop_rules expiry_reminder_shop_rules_shop_id_audience_days_before_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_shop_id_audience_days_before_key UNIQUE (shop_id, audience, days_before);


--
-- Name: expiry_reminder_shop_settings expiry_reminder_shop_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_settings
    ADD CONSTRAINT expiry_reminder_shop_settings_pkey PRIMARY KEY (shop_id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (key);


--
-- Name: flash_sales flash_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_pkey PRIMARY KEY (id);


--
-- Name: flyers flyers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyers
    ADD CONSTRAINT flyers_pkey PRIMARY KEY (id);


--
-- Name: fnb_combos fnb_combos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fnb_combos
    ADD CONSTRAINT fnb_combos_pkey PRIMARY KEY (id);


--
-- Name: freelance_contracts freelance_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_pkey PRIMARY KEY (id);


--
-- Name: freelance_contracts freelance_contracts_sign_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_sign_token_key UNIQUE (sign_token);


--
-- Name: icd10_codes icd10_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.icd10_codes
    ADD CONSTRAINT icd10_codes_pkey PRIMARY KEY (code);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (id);


--
-- Name: job_deliverables job_deliverables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_user_id_lesson_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_user_id_lesson_id_key UNIQUE (user_id, lesson_id);


--
-- Name: loyalty_ledger loyalty_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_ledger
    ADD CONSTRAINT loyalty_ledger_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_pkey PRIMARY KEY (id);


--
-- Name: loyalty_points loyalty_points_shop_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_shop_id_user_id_key UNIQUE (shop_id, user_id);


--
-- Name: loyalty_points loyalty_points_shop_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_points
    ADD CONSTRAINT loyalty_points_shop_user_unique UNIQUE (shop_id, user_id);


--
-- Name: loyalty_settings loyalty_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_settings
    ADD CONSTRAINT loyalty_settings_pkey PRIMARY KEY (shop_id);


--
-- Name: marketing_campaigns marketing_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_campaigns
    ADD CONSTRAINT marketing_campaigns_pkey PRIMARY KEY (id);


--
-- Name: marketplace_cart_items marketplace_cart_items_cart_id_product_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_cart_id_product_id_variant_id_key UNIQUE (cart_id, product_id, variant_id);


--
-- Name: marketplace_cart_items marketplace_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_pkey PRIMARY KEY (id);


--
-- Name: marketplace_carts marketplace_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_pkey PRIMARY KEY (id);


--
-- Name: marketplace_carts marketplace_carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_user_id_key UNIQUE (user_id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: menu_item_option_groups menu_item_option_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_option_groups
    ADD CONSTRAINT menu_item_option_groups_pkey PRIMARY KEY (id);


--
-- Name: menu_item_options menu_item_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_pkey PRIMARY KEY (id);


--
-- Name: menu_item_variants menu_item_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_pkey PRIMARY KEY (id);


--
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- Name: menu_reviews menu_reviews_order_id_menu_item_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_reviews
    ADD CONSTRAINT menu_reviews_order_id_menu_item_id_user_id_key UNIQUE (order_id, menu_item_id, user_id);


--
-- Name: menu_reviews menu_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_reviews
    ADD CONSTRAINT menu_reviews_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_recipient_user_id_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_recipient_user_id_dedupe_key_key UNIQUE (recipient_user_id, dedupe_key);


--
-- Name: open_bills open_bills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_pkey PRIMARY KEY (id);


--
-- Name: order_audit_log order_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_pkey PRIMARY KEY (id);


--
-- Name: order_disputes order_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_disputes
    ADD CONSTRAINT order_disputes_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_messages order_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_messages
    ADD CONSTRAINT order_messages_pkey PRIMARY KEY (id);


--
-- Name: orders orders_outlet_id_business_date_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_outlet_id_business_date_order_no_key UNIQUE (outlet_id, business_date, order_no);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: outlet_couriers outlet_couriers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_pkey PRIMARY KEY (id);


--
-- Name: outlets outlets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_pkey PRIMARY KEY (id);


--
-- Name: owner_notifications owner_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_notifications
    ADD CONSTRAINT owner_notifications_pkey PRIMARY KEY (id);


--
-- Name: owner_notifications owner_notifications_shop_dedupe_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.owner_notifications
    ADD CONSTRAINT owner_notifications_shop_dedupe_unique UNIQUE (shop_id, dedupe_key);


--
-- Name: page_layout_versions page_layout_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layout_versions
    ADD CONSTRAINT page_layout_versions_pkey PRIMARY KEY (id);


--
-- Name: page_layouts page_layouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layouts
    ADD CONSTRAINT page_layouts_pkey PRIMARY KEY (id);


--
-- Name: parked_carts parked_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_pkey PRIMARY KEY (id);


--
-- Name: patient_records patient_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_records
    ADD CONSTRAINT patient_records_pkey PRIMARY KEY (id);


--
-- Name: patient_visits patient_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (plan_id, feature_key);


--
-- Name: plan_invoices plan_invoices_invoice_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_invoice_no_key UNIQUE (invoice_no);


--
-- Name: plan_invoices plan_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_pkey PRIMARY KEY (id);


--
-- Name: plan_subscriptions plan_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: plan_subscriptions plan_subscriptions_shop_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_shop_id_key UNIQUE (shop_id);


--
-- Name: plan_themes plan_themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_pkey PRIMARY KEY (plan_id, theme_key);


--
-- Name: plans plans_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_code_key UNIQUE (code);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_key_key UNIQUE (key);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: platform_voucher_redemptions platform_voucher_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_voucher_redemptions
    ADD CONSTRAINT platform_voucher_redemptions_pkey PRIMARY KEY (id);


--
-- Name: platform_vouchers platform_vouchers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_vouchers
    ADD CONSTRAINT platform_vouchers_code_key UNIQUE (code);


--
-- Name: platform_vouchers platform_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_vouchers
    ADD CONSTRAINT platform_vouchers_pkey PRIMARY KEY (id);


--
-- Name: po_audit_log po_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_audit_log
    ADD CONSTRAINT po_audit_log_pkey PRIMARY KEY (id);


--
-- Name: pos_audit_log pos_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_pkey PRIMARY KEY (id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);


--
-- Name: product_attribute_defs product_attribute_defs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_pkey PRIMARY KEY (id);


--
-- Name: product_attribute_defs product_attribute_defs_shop_id_category_id_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_shop_id_category_id_key_key UNIQUE (shop_id, category_id, key);


--
-- Name: product_qa product_qa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_pkey PRIMARY KEY (id);


--
-- Name: product_returns product_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_product_id_user_id_order_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_user_id_order_id_key UNIQUE (product_id, user_id, order_id);


--
-- Name: product_upsell_suggestions product_upsell_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_pkey PRIMARY KEY (id);


--
-- Name: product_upsell_suggestions product_upsell_suggestions_product_id_suggested_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_product_id_suggested_id_key UNIQUE (product_id, suggested_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: promo_redemptions promo_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promo_redemptions
    ADD CONSTRAINT promo_redemptions_pkey PRIMARY KEY (id);


--
-- Name: promos promos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promos
    ADD CONSTRAINT promos_pkey PRIMARY KEY (id);


--
-- Name: promos promos_shop_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.promos
    ADD CONSTRAINT promos_shop_id_code_key UNIQUE (shop_id, code);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_user_id_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_endpoint_key UNIQUE (user_id, endpoint);


--
-- Name: recipes recipes_menu_item_id_ingredient_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_menu_item_id_ingredient_id_key UNIQUE (menu_item_id, ingredient_id);


--
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- Name: refunds refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refunds
    ADD CONSTRAINT refunds_pkey PRIMARY KEY (id);


--
-- Name: rental_bookings rental_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_pkey PRIMARY KEY (id);


--
-- Name: rental_inspections rental_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_pkey PRIMARY KEY (id);


--
-- Name: rental_units rental_units_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_units
    ADD CONSTRAINT rental_units_pkey PRIMARY KEY (id);


--
-- Name: restock_subscribers restock_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_pkey PRIMARY KEY (id);


--
-- Name: restock_subscribers restock_subscribers_product_id_customer_wa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_product_id_customer_wa_key UNIQUE (product_id, customer_wa);


--
-- Name: sales_offerings sales_offerings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_offerings
    ADD CONSTRAINT sales_offerings_pkey PRIMARY KEY (id);


--
-- Name: service_bundle_items service_bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundle_items
    ADD CONSTRAINT service_bundle_items_pkey PRIMARY KEY (id);


--
-- Name: service_bundles service_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundles
    ADD CONSTRAINT service_bundles_pkey PRIMARY KEY (id);


--
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- Name: shop_about shop_about_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_about
    ADD CONSTRAINT shop_about_pkey PRIMARY KEY (shop_id);


--
-- Name: shop_backups shop_backups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_backups
    ADD CONSTRAINT shop_backups_pkey PRIMARY KEY (id);


--
-- Name: shop_chat_messages shop_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: shop_chats shop_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_pkey PRIMARY KEY (id);


--
-- Name: shop_chats shop_chats_shop_id_buyer_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_shop_id_buyer_user_id_key UNIQUE (shop_id, buyer_user_id);


--
-- Name: shop_customers shop_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customers
    ADD CONSTRAINT shop_customers_pkey PRIMARY KEY (id);


--
-- Name: shop_customers shop_customers_shop_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_customers
    ADD CONSTRAINT shop_customers_shop_id_user_id_key UNIQUE (shop_id, user_id);


--
-- Name: shop_membership_tiers shop_membership_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_membership_tiers
    ADD CONSTRAINT shop_membership_tiers_pkey PRIMARY KEY (id);


--
-- Name: shop_portfolio shop_portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_portfolio
    ADD CONSTRAINT shop_portfolio_pkey PRIMARY KEY (id);


--
-- Name: shop_size_charts shop_size_charts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_size_charts
    ADD CONSTRAINT shop_size_charts_pkey PRIMARY KEY (id);


--
-- Name: shop_verifications shop_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_verifications
    ADD CONSTRAINT shop_verifications_pkey PRIMARY KEY (id);


--
-- Name: shop_vouchers shop_vouchers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_pkey PRIMARY KEY (id);


--
-- Name: shop_vouchers shop_vouchers_shop_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_shop_id_code_key UNIQUE (shop_id, code);


--
-- Name: shop_wallets shop_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_wallets
    ADD CONSTRAINT shop_wallets_pkey PRIMARY KEY (shop_id);


--
-- Name: staff_audit_logs staff_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audit_logs
    ADD CONSTRAINT staff_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: staff_invitations staff_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_pkey PRIMARY KEY (id);


--
-- Name: staff_invitations staff_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_invitations
    ADD CONSTRAINT staff_invitations_token_key UNIQUE (token);


--
-- Name: staff_members staff_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_shop_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_shop_id_user_id_key UNIQUE (shop_id, user_id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: stock_opname_items stock_opname_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_pkey PRIMARY KEY (id);


--
-- Name: stock_opnames stock_opnames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opnames
    ADD CONSTRAINT stock_opnames_pkey PRIMARY KEY (id);


--
-- Name: studio_galleries studio_galleries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_pkey PRIMARY KEY (id);


--
-- Name: studio_galleries studio_galleries_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_share_token_key UNIQUE (share_token);


--
-- Name: studio_gallery_photos studio_gallery_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_gallery_photos
    ADD CONSTRAINT studio_gallery_photos_pkey PRIMARY KEY (id);


--
-- Name: studio_locations studio_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_locations
    ADD CONSTRAINT studio_locations_pkey PRIMARY KEY (id);


--
-- Name: studio_packages studio_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_packages
    ADD CONSTRAINT studio_packages_pkey PRIMARY KEY (id);


--
-- Name: studio_photographers studio_photographers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_photographers
    ADD CONSTRAINT studio_photographers_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: system_audit system_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_audit
    ADD CONSTRAINT system_audit_pkey PRIMARY KEY (id);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.themes
    ADD CONSTRAINT themes_pkey PRIMARY KEY (key);


--
-- Name: travel_installments travel_installments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_pkey PRIMARY KEY (id);


--
-- Name: travel_itineraries travel_itineraries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_pkey PRIMARY KEY (id);


--
-- Name: travel_jamaah_documents travel_jamaah_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_pkey PRIMARY KEY (id);


--
-- Name: travel_jamaah_manifest travel_jamaah_manifest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_pkey PRIMARY KEY (id);


--
-- Name: umroh_facilities umroh_facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_facilities
    ADD CONSTRAINT umroh_facilities_pkey PRIMARY KEY (id);


--
-- Name: umroh_faqs umroh_faqs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_faqs
    ADD CONSTRAINT umroh_faqs_pkey PRIMARY KEY (id);


--
-- Name: umroh_packages umroh_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_packages
    ADD CONSTRAINT umroh_packages_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_shop_id_outlet_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_shop_id_outlet_id_key UNIQUE (user_id, role, shop_id, outlet_id);


--
-- Name: wallet_topup_presets wallet_topup_presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topup_presets
    ADD CONSTRAINT wallet_topup_presets_pkey PRIMARY KEY (id);


--
-- Name: wallet_topups wallet_topups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);


--
-- Name: webhook_events webhook_events_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events
    ADD CONSTRAINT webhook_events_unique UNIQUE (provider, event_id);


--
-- Name: wishlists wishlists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_pkey PRIMARY KEY (id);


--
-- Name: wishlists wishlists_user_id_menu_item_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_menu_item_id_key UNIQUE (user_id, menu_item_id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
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
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: coffee_shops_custom_domain_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX coffee_shops_custom_domain_key ON public.shops USING btree (lower(custom_domain)) WHERE (custom_domain IS NOT NULL);


--
-- Name: couriers_email_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX couriers_email_unique ON public.couriers USING btree (lower(email)) WHERE (email IS NOT NULL);


--
-- Name: domain_audit_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX domain_audit_shop_idx ON public.domain_audit USING btree (shop_id);


--
-- Name: idx_ad_requests_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_requests_shop ON public.ad_requests USING btree (shop_id);


--
-- Name: idx_ad_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_requests_status ON public.ad_requests USING btree (status);


--
-- Name: idx_attendances_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendances_shop ON public.attendances USING btree (shop_id, business_date DESC);


--
-- Name: idx_attendances_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attendances_user ON public.attendances USING btree (user_id, business_date DESC);


--
-- Name: idx_banners_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_banners_active_sort ON public.banners USING btree (is_active, sort_order);


--
-- Name: idx_booking_slots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_slots_active ON public.booking_slots USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_booking_slots_shop_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_slots_shop_date ON public.booking_slots USING btree (shop_id, slot_date);


--
-- Name: idx_booking_slots_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_slots_type ON public.booking_slots USING btree (shop_id, booking_type, slot_date);


--
-- Name: idx_bookings_cancel_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_cancel_token ON public.bookings USING btree (cancel_token);


--
-- Name: idx_bookings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_customer ON public.bookings USING btree (customer_user_id) WHERE (customer_user_id IS NOT NULL);


--
-- Name: idx_bookings_photographer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_photographer ON public.bookings USING btree (photographer_id);


--
-- Name: idx_bookings_shop_deposit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_shop_deposit_status ON public.bookings USING btree (shop_id, deposit_status);


--
-- Name: idx_bookings_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_shop_status ON public.bookings USING btree (shop_id, status);


--
-- Name: idx_bookings_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_slot ON public.bookings USING btree (slot_id);


--
-- Name: idx_bookings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_type ON public.bookings USING btree (shop_id, booking_type, status);


--
-- Name: idx_branding_audit_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branding_audit_shop ON public.branding_audit USING btree (shop_id, created_at DESC);


--
-- Name: idx_bulk_pricing_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_pricing_menu ON public.bulk_pricing_rules USING btree (menu_item_id);


--
-- Name: idx_bulk_pricing_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bulk_pricing_shop ON public.bulk_pricing_rules USING btree (shop_id);


--
-- Name: idx_bundle_items_bundle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_items_bundle_id ON public.bundle_items USING btree (bundle_id);


--
-- Name: idx_bundle_items_component_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bundle_items_component_id ON public.bundle_items USING btree (component_id);


--
-- Name: idx_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_cart ON public.marketplace_cart_items USING btree (cart_id);


--
-- Name: idx_cart_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_items_shop ON public.marketplace_cart_items USING btree (cart_id, shop_id);


--
-- Name: idx_cash_movements_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_movements_shift ON public.cash_movements USING btree (shift_id);


--
-- Name: idx_cash_shifts_outlet_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_shifts_outlet_status ON public.cash_shifts USING btree (outlet_id, status);


--
-- Name: idx_cash_shifts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cash_shifts_shop ON public.cash_shifts USING btree (shop_id);


--
-- Name: idx_categories_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_shop ON public.categories USING btree (shop_id, sort_order);


--
-- Name: idx_categories_shop_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_shop_active ON public.categories USING btree (shop_id, is_active);


--
-- Name: idx_cert_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_course ON public.course_certificates USING btree (course_id);


--
-- Name: idx_cert_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cert_user ON public.course_certificates USING btree (user_id);


--
-- Name: idx_coffee_shops_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coffee_shops_is_featured ON public.shops USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_coffee_shops_kyc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coffee_shops_kyc_status ON public.shops USING btree (kyc_status);


--
-- Name: idx_cor_history_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cor_history_request ON public.custom_order_status_history USING btree (request_id, created_at);


--
-- Name: idx_couriers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_shop ON public.couriers USING btree (shop_id);


--
-- Name: idx_couriers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_couriers_user ON public.couriers USING btree (user_id);


--
-- Name: idx_course_enrollments_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_enrollments_menu_item ON public.course_enrollments USING btree (menu_item_id);


--
-- Name: idx_course_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_enrollments_user ON public.course_enrollments USING btree (user_id);


--
-- Name: idx_course_lessons_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_lessons_module ON public.course_lessons USING btree (module_id);


--
-- Name: idx_course_lessons_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_lessons_status ON public.course_lessons USING btree (status);


--
-- Name: idx_course_modules_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_modules_menu_item ON public.course_modules USING btree (menu_item_id);


--
-- Name: idx_course_modules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_modules_status ON public.course_modules USING btree (status);


--
-- Name: idx_cron_runs_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_runs_job ON public.cron_runs USING btree (job_name, started_at DESC);


--
-- Name: idx_cron_runs_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cron_runs_started ON public.cron_runs USING btree (started_at DESC);


--
-- Name: idx_cust_memberships_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cust_memberships_active ON public.customer_memberships USING btree (customer_user_id, shop_id) WHERE (status = 'active'::text);


--
-- Name: idx_cust_memberships_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cust_memberships_shop ON public.customer_memberships USING btree (shop_id);


--
-- Name: idx_cust_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cust_memberships_user ON public.customer_memberships USING btree (customer_user_id);


--
-- Name: idx_custom_order_quotes_request; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_order_quotes_request ON public.custom_order_quotes USING btree (request_id, created_at DESC);


--
-- Name: idx_custom_order_requests_contract; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_order_requests_contract ON public.custom_order_requests USING btree (contract_id);


--
-- Name: idx_custom_orders_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_orders_shop ON public.custom_order_requests USING btree (shop_id, created_at DESC);


--
-- Name: idx_custom_orders_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_orders_user ON public.custom_order_requests USING btree (user_id, created_at DESC);


--
-- Name: idx_customer_addresses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_addresses_user ON public.customer_addresses USING btree (user_id);


--
-- Name: idx_delivery_zones_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_zones_shop ON public.delivery_zones USING btree (shop_id);


--
-- Name: idx_disputes_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disputes_order ON public.order_disputes USING btree (order_id);


--
-- Name: idx_disputes_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_disputes_shop_status ON public.order_disputes USING btree (shop_id, status);


--
-- Name: idx_dva_shop_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dva_shop_time ON public.domain_verify_attempts USING btree (shop_id, created_at DESC);


--
-- Name: idx_expiry_reminder_shop_rules_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expiry_reminder_shop_rules_shop ON public.expiry_reminder_shop_rules USING btree (shop_id, audience, is_active);


--
-- Name: idx_flash_sales_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flash_sales_shop ON public.flash_sales USING btree (shop_id);


--
-- Name: idx_flash_sales_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flash_sales_window ON public.flash_sales USING btree (starts_at, ends_at);


--
-- Name: idx_flyers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flyers_shop ON public.flyers USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_fnb_combos_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_fnb_combos_shop ON public.fnb_combos USING btree (shop_id, sort_order);


--
-- Name: idx_freelance_contracts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_freelance_contracts_shop ON public.freelance_contracts USING btree (shop_id, created_at DESC);


--
-- Name: idx_freelance_contracts_sign_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_freelance_contracts_sign_token ON public.freelance_contracts USING btree (sign_token);


--
-- Name: idx_galleries_photographer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_galleries_photographer ON public.studio_galleries USING btree (photographer_id);


--
-- Name: idx_galleries_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_galleries_shop ON public.studio_galleries USING btree (shop_id);


--
-- Name: idx_galleries_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_galleries_token ON public.studio_galleries USING btree (share_token);


--
-- Name: idx_gallery_photos_gallery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gallery_photos_gallery ON public.studio_gallery_photos USING btree (gallery_id);


--
-- Name: idx_ingredients_default_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredients_default_supplier ON public.ingredients USING btree (default_supplier_id);


--
-- Name: idx_ingredients_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ingredients_shop ON public.ingredients USING btree (shop_id);


--
-- Name: idx_jamaah_docs_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jamaah_docs_expiry ON public.travel_jamaah_documents USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_jamaah_docs_jamaah; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jamaah_docs_jamaah ON public.travel_jamaah_documents USING btree (jamaah_id);


--
-- Name: idx_job_deliverables_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_deliverables_shop ON public.job_deliverables USING btree (shop_id, created_at DESC);


--
-- Name: idx_job_deliverables_token; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_job_deliverables_token ON public.job_deliverables USING btree (delivery_token);


--
-- Name: idx_leads_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leads_shop ON public.leads USING btree (shop_id, status, created_at DESC);


--
-- Name: idx_lesson_progress_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lesson_progress_user ON public.lesson_progress USING btree (user_id);


--
-- Name: idx_loyalty_ledger_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_loyalty_ledger_user ON public.loyalty_ledger USING btree (user_id, shop_id);


--
-- Name: idx_medications_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_shop ON public.medications USING btree (shop_id, is_active);


--
-- Name: idx_membership_tiers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_membership_tiers_shop ON public.shop_membership_tiers USING btree (shop_id) WHERE (is_active = true);


--
-- Name: idx_menu_item_variants_attributes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_variants_attributes ON public.menu_item_variants USING gin (attributes);


--
-- Name: idx_menu_item_variants_barcode_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_variants_barcode_shop ON public.menu_item_variants USING btree (shop_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_menu_item_variants_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_variants_item ON public.menu_item_variants USING btree (menu_item_id);


--
-- Name: idx_menu_item_variants_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_variants_shop ON public.menu_item_variants USING btree (shop_id);


--
-- Name: idx_menu_item_variants_sku_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_item_variants_sku_shop ON public.menu_item_variants USING btree (shop_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_menu_items_barcode_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_barcode_shop ON public.menu_items USING btree (shop_id, barcode) WHERE (barcode IS NOT NULL);


--
-- Name: idx_menu_items_flash_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_flash_active ON public.menu_items USING btree (flash_ends_at) WHERE (flash_price IS NOT NULL);


--
-- Name: idx_menu_items_is_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_is_featured ON public.menu_items USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_menu_items_item_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_item_type ON public.menu_items USING btree (item_type);


--
-- Name: idx_menu_items_preorder_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_preorder_window ON public.menu_items USING btree (is_pre_order, pre_order_close_at) WHERE (is_pre_order = true);


--
-- Name: idx_menu_items_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_shop ON public.menu_items USING btree (shop_id, category_id, sort_order);


--
-- Name: idx_menu_items_shop_available; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_shop_available ON public.menu_items USING btree (shop_id, is_available);


--
-- Name: idx_menu_items_sku_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_items_sku_shop ON public.menu_items USING btree (shop_id, sku) WHERE (sku IS NOT NULL);


--
-- Name: idx_menu_reviews_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_reviews_menu ON public.menu_reviews USING btree (menu_item_id, created_at DESC);


--
-- Name: idx_menu_reviews_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_reviews_shop ON public.menu_reviews USING btree (shop_id, created_at DESC);


--
-- Name: idx_menu_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_menu_reviews_user ON public.menu_reviews USING btree (user_id);


--
-- Name: idx_notifications_recipient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient ON public.notifications USING btree (recipient_user_id, created_at DESC);


--
-- Name: idx_notifications_recipient_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recipient_unread ON public.notifications USING btree (recipient_user_id, created_at DESC) WHERE (read_at IS NULL);


--
-- Name: idx_open_bills_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_open_bills_outlet ON public.open_bills USING btree (outlet_id, updated_at DESC);


--
-- Name: idx_option_groups_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_option_groups_menu_item ON public.menu_item_option_groups USING btree (menu_item_id);


--
-- Name: idx_options_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_options_group ON public.menu_item_options USING btree (group_id);


--
-- Name: idx_order_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_audit_log_actor ON public.order_audit_log USING btree (actor_id);


--
-- Name: idx_order_audit_log_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_audit_log_order ON public.order_audit_log USING btree (order_id);


--
-- Name: idx_order_audit_log_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_audit_log_shop_created ON public.order_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_order_messages_order_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_messages_order_created ON public.order_messages USING btree (order_id, created_at);


--
-- Name: idx_orders_channel_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_channel_status ON public.orders USING btree (channel, status);


--
-- Name: idx_orders_customer_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_customer_user ON public.orders USING btree (customer_user_id);


--
-- Name: idx_orders_escrow_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_escrow_status ON public.orders USING btree (escrow_status) WHERE (escrow_status = ANY (ARRAY['holding'::text, 'released'::text]));


--
-- Name: idx_orders_order_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_order_source ON public.orders USING btree (shop_id, business_date, order_source);


--
-- Name: idx_orders_outlet_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_outlet_date ON public.orders USING btree (outlet_id, business_date DESC, created_at DESC);


--
-- Name: idx_orders_outlet_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_outlet_status_created ON public.orders USING btree (outlet_id, status, created_at DESC);


--
-- Name: idx_orders_requires_deposit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_requires_deposit ON public.orders USING btree (shop_id, requires_deposit) WHERE (requires_deposit = true);


--
-- Name: idx_orders_shift; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_shift ON public.orders USING btree (shift_id);


--
-- Name: idx_orders_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_shop_created ON public.orders USING btree (shop_id, created_at DESC);


--
-- Name: idx_orders_tracking_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tracking_number ON public.orders USING btree (tracking_number) WHERE (tracking_number IS NOT NULL);


--
-- Name: idx_outlet_couriers_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outlet_couriers_outlet ON public.outlet_couriers USING btree (outlet_id, sort_order);


--
-- Name: idx_outlet_couriers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outlet_couriers_shop ON public.outlet_couriers USING btree (shop_id);


--
-- Name: idx_owner_notif_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_owner_notif_dedupe ON public.owner_notifications USING btree (shop_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);


--
-- Name: idx_owner_notif_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_notif_shop ON public.owner_notifications USING btree (shop_id, created_at DESC);


--
-- Name: idx_owner_notif_shop_dismissed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_owner_notif_shop_dismissed ON public.owner_notifications USING btree (shop_id, dismissed_at) WHERE (dismissed_at IS NULL);


--
-- Name: idx_page_layout_versions_layout; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_layout_versions_layout ON public.page_layout_versions USING btree (layout_id, created_at DESC);


--
-- Name: idx_page_layouts_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_layouts_scheduled ON public.page_layouts USING btree (scheduled_publish_at) WHERE ((scheduled_publish_at IS NOT NULL) AND (is_published = false));


--
-- Name: idx_parked_carts_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parked_carts_outlet ON public.parked_carts USING btree (outlet_id, created_at DESC);


--
-- Name: idx_parked_carts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parked_carts_shop ON public.parked_carts USING btree (shop_id);


--
-- Name: idx_patient_records_bpjs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_records_bpjs ON public.patient_records USING btree (shop_id, bpjs_number);


--
-- Name: idx_patient_records_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_records_shop ON public.patient_records USING btree (shop_id, patient_name);


--
-- Name: idx_patient_visits_icd10; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_visits_icd10 ON public.patient_visits USING btree (shop_id, icd10_code);


--
-- Name: idx_patient_visits_patient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patient_visits_patient ON public.patient_visits USING btree (patient_id, visit_date DESC);


--
-- Name: idx_photographers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photographers_shop ON public.studio_photographers USING btree (shop_id);


--
-- Name: idx_plan_subs_next_billing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plan_subs_next_billing ON public.plan_subscriptions USING btree (next_billing_at) WHERE (status = 'active'::text);


--
-- Name: idx_po_audit_log_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_audit_log_po_id ON public.po_audit_log USING btree (po_id, created_at DESC);


--
-- Name: idx_po_audit_log_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_audit_log_shop_id ON public.po_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_po_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_shop ON public.purchase_orders USING btree (shop_id, status);


--
-- Name: idx_poi_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_poi_po ON public.purchase_order_items USING btree (po_id);


--
-- Name: idx_portfolio_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_shop ON public.shop_portfolio USING btree (shop_id, sort_order);


--
-- Name: idx_pos_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_audit_action ON public.pos_audit_log USING btree (shop_id, action, created_at DESC);


--
-- Name: idx_pos_audit_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_audit_outlet ON public.pos_audit_log USING btree (outlet_id, created_at DESC);


--
-- Name: idx_pos_audit_shop_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pos_audit_shop_date ON public.pos_audit_log USING btree (shop_id, created_at DESC);


--
-- Name: idx_presc_items_presc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presc_items_presc ON public.prescription_items USING btree (prescription_id);


--
-- Name: idx_prescriptions_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_shop ON public.prescriptions USING btree (shop_id, issued_at DESC);


--
-- Name: idx_printers_outlet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_printers_outlet ON public.printers USING btree (outlet_id);


--
-- Name: idx_printers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_printers_shop ON public.printers USING btree (shop_id);


--
-- Name: idx_product_attribute_defs_cat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_attribute_defs_cat ON public.product_attribute_defs USING btree (category_id);


--
-- Name: idx_product_attribute_defs_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_attribute_defs_shop ON public.product_attribute_defs USING btree (shop_id);


--
-- Name: idx_product_reviews_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_product ON public.product_reviews USING btree (product_id, created_at DESC) WHERE (NOT is_hidden);


--
-- Name: idx_product_reviews_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_shop ON public.product_reviews USING btree (shop_id, created_at DESC) WHERE (NOT is_hidden);


--
-- Name: idx_product_reviews_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_user ON public.product_reviews USING btree (user_id, created_at DESC);


--
-- Name: idx_promo_red_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_red_order ON public.promo_redemptions USING btree (order_id);


--
-- Name: idx_promo_red_promo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promo_red_promo ON public.promo_redemptions USING btree (promo_id);


--
-- Name: idx_promos_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_promos_shop ON public.promos USING btree (shop_id);


--
-- Name: idx_push_subscriptions_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_shop ON public.push_subscriptions USING btree (shop_id);


--
-- Name: idx_push_subscriptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions USING btree (user_id);


--
-- Name: idx_pvr_voucher_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pvr_voucher_user ON public.platform_voucher_redemptions USING btree (voucher_id, user_id);


--
-- Name: idx_qa_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_product ON public.product_qa USING btree (product_id);


--
-- Name: idx_qa_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qa_shop ON public.product_qa USING btree (shop_id);


--
-- Name: idx_recipes_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_ingredient ON public.recipes USING btree (ingredient_id);


--
-- Name: idx_recipes_menu; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recipes_menu ON public.recipes USING btree (menu_item_id);


--
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_order ON public.refunds USING btree (order_id);


--
-- Name: idx_refunds_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_shop ON public.refunds USING btree (shop_id);


--
-- Name: idx_rental_bookings_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rental_bookings_shop ON public.rental_bookings USING btree (shop_id, start_date);


--
-- Name: idx_rental_bookings_unit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rental_bookings_unit ON public.rental_bookings USING btree (unit_id, start_date, end_date);


--
-- Name: idx_rental_insp_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rental_insp_booking ON public.rental_inspections USING btree (booking_id);


--
-- Name: idx_rental_units_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rental_units_shop ON public.rental_units USING btree (shop_id);


--
-- Name: idx_reschedule_tokens_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reschedule_tokens_token ON public.booking_reschedule_tokens USING btree (token);


--
-- Name: idx_restock_sub_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_restock_sub_shop ON public.restock_subscribers USING btree (shop_id);


--
-- Name: idx_returns_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_returns_shop ON public.product_returns USING btree (shop_id, status);


--
-- Name: idx_sales_offerings_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_offerings_shop ON public.sales_offerings USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_service_bundle_items_bundle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bundle_items_bundle ON public.service_bundle_items USING btree (bundle_id, sort_order);


--
-- Name: idx_service_bundles_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_bundles_shop ON public.service_bundles USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_shifts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_shop ON public.shifts USING btree (shop_id);


--
-- Name: idx_shifts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shifts_user ON public.shifts USING btree (user_id);


--
-- Name: idx_shop_chat_messages_chat; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_chat_messages_chat ON public.shop_chat_messages USING btree (chat_id, created_at);


--
-- Name: idx_shop_chat_messages_unread_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_chat_messages_unread_buyer ON public.shop_chat_messages USING btree (chat_id) WHERE ((read_at IS NULL) AND (sender_role = 'seller'::text));


--
-- Name: idx_shop_chats_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_chats_buyer ON public.shop_chats USING btree (buyer_user_id, last_message_at DESC);


--
-- Name: idx_shop_chats_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_chats_shop ON public.shop_chats USING btree (shop_id, last_message_at DESC);


--
-- Name: idx_shop_customers_segment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_customers_segment ON public.shop_customers USING btree (shop_id, segment);


--
-- Name: idx_shop_customers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_customers_shop ON public.shop_customers USING btree (shop_id);


--
-- Name: idx_shop_customers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_customers_user ON public.shop_customers USING btree (user_id);


--
-- Name: idx_shop_size_charts_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_size_charts_shop ON public.shop_size_charts USING btree (shop_id);


--
-- Name: idx_shop_verifications_shop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_verifications_shop_id ON public.shop_verifications USING btree (shop_id);


--
-- Name: idx_shop_verifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_verifications_status ON public.shop_verifications USING btree (status);


--
-- Name: idx_shop_vouchers_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shop_vouchers_shop ON public.shop_vouchers USING btree (shop_id);


--
-- Name: idx_staff_audit_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audit_shop_created ON public.staff_audit_logs USING btree (shop_id, created_at DESC);


--
-- Name: idx_staff_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_invitations_email ON public.staff_invitations USING btree (email);


--
-- Name: idx_staff_invitations_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_invitations_shop ON public.staff_invitations USING btree (shop_id);


--
-- Name: idx_staff_members_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_members_shop ON public.staff_members USING btree (shop_id);


--
-- Name: idx_staff_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_members_user ON public.staff_members USING btree (user_id);


--
-- Name: idx_stock_movements_ingredient; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_ingredient ON public.stock_movements USING btree (ingredient_id, created_at DESC);


--
-- Name: idx_stock_movements_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_movements_shop ON public.stock_movements USING btree (shop_id, created_at DESC);


--
-- Name: idx_stock_opname_items_opname; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_opname_items_opname ON public.stock_opname_items USING btree (stock_opname_id);


--
-- Name: idx_stock_opnames_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_opnames_shop ON public.stock_opnames USING btree (shop_id, created_at DESC);


--
-- Name: idx_studio_locations_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_studio_locations_shop ON public.studio_locations USING btree (shop_id, sort_order);


--
-- Name: idx_studio_packages_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_studio_packages_shop ON public.studio_packages USING btree (shop_id, sort_order);


--
-- Name: idx_system_audit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_created ON public.system_audit USING btree (created_at DESC);


--
-- Name: idx_system_audit_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_event ON public.system_audit USING btree (event_type, created_at DESC);


--
-- Name: idx_system_audit_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_audit_shop ON public.system_audit USING btree (shop_id, created_at DESC);


--
-- Name: idx_testimonials_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_testimonials_shop ON public.testimonials USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_topup_presets_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topup_presets_shop ON public.wallet_topup_presets USING btree (shop_id) WHERE (is_active = true);


--
-- Name: idx_topups_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_shop ON public.wallet_topups USING btree (shop_id, created_at DESC);


--
-- Name: idx_topups_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_status ON public.wallet_topups USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_topups_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_topups_user ON public.wallet_topups USING btree (customer_user_id, created_at DESC);


--
-- Name: idx_travel_inst_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_inst_shop ON public.travel_installments USING btree (shop_id);


--
-- Name: idx_travel_itineraries_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_itineraries_pkg ON public.travel_itineraries USING btree (package_id, day_number, sort_order);


--
-- Name: idx_travel_manifest_pkg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_manifest_pkg ON public.travel_jamaah_manifest USING btree (package_id);


--
-- Name: idx_travel_manifest_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_travel_manifest_shop ON public.travel_jamaah_manifest USING btree (shop_id);


--
-- Name: idx_treatments_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_treatments_shop ON public.customer_treatments USING btree (shop_id, performed_at DESC);


--
-- Name: idx_umroh_facilities_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_umroh_facilities_shop ON public.umroh_facilities USING btree (shop_id, sort_order);


--
-- Name: idx_umroh_faqs_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_umroh_faqs_shop ON public.umroh_faqs USING btree (shop_id, category, sort_order);


--
-- Name: idx_umroh_packages_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_umroh_packages_shop ON public.umroh_packages USING btree (shop_id, is_active, sort_order);


--
-- Name: idx_upsell_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upsell_product ON public.product_upsell_suggestions USING btree (product_id, "position");


--
-- Name: idx_upsell_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upsell_shop ON public.product_upsell_suggestions USING btree (shop_id);


--
-- Name: idx_upsell_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upsell_source ON public.product_upsell_suggestions USING btree (source);


--
-- Name: idx_waitlist_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_waitlist_shop_status ON public.booking_waitlist USING btree (shop_id, status);


--
-- Name: idx_wallet_tx_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_tx_user ON public.customer_wallet_transactions USING btree (customer_user_id, created_at DESC);


--
-- Name: idx_wallet_tx_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_tx_wallet ON public.customer_wallet_transactions USING btree (wallet_id, created_at DESC);


--
-- Name: idx_wallet_txn_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_txn_order ON public.wallet_transactions USING btree (order_id);


--
-- Name: idx_wallet_txn_shop_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_txn_shop_created ON public.wallet_transactions USING btree (shop_id, created_at DESC);


--
-- Name: idx_webhook_events_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_events_created ON public.webhook_events USING btree (created_at DESC);


--
-- Name: idx_wishlists_menu_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_menu_item ON public.wishlists USING btree (menu_item_id);


--
-- Name: idx_wishlists_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wishlists_user ON public.wishlists USING btree (user_id);


--
-- Name: idx_withdrawals_shop_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_shop_status ON public.withdrawal_requests USING btree (shop_id, status, created_at DESC);


--
-- Name: idx_withdrawals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawals_status ON public.withdrawal_requests USING btree (status, created_at DESC);


--
-- Name: orders_courier_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_courier_id_idx ON public.orders USING btree (courier_id);


--
-- Name: orders_shop_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_shop_status_idx ON public.orders USING btree (shop_id, status);


--
-- Name: page_layouts_published_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_layouts_published_idx ON public.page_layouts USING btree (shop_id, page_type) WHERE (is_published = true);


--
-- Name: page_layouts_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX page_layouts_shop_idx ON public.page_layouts USING btree (shop_id);


--
-- Name: page_layouts_shop_page_slug_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX page_layouts_shop_page_slug_uniq ON public.page_layouts USING btree (shop_id, page_type, COALESCE(slug, ''::text));


--
-- Name: plan_invoices_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_invoices_shop_idx ON public.plan_invoices USING btree (shop_id);


--
-- Name: plan_invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_invoices_status_idx ON public.plan_invoices USING btree (status);


--
-- Name: shop_backups_shop_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shop_backups_shop_idx ON public.shop_backups USING btree (shop_id, created_at DESC);


--
-- Name: uq_orders_idem_shop; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_orders_idem_shop ON public.orders USING btree (shop_id, client_idempotency_key) WHERE (client_idempotency_key IS NOT NULL);


--
-- Name: uq_orders_outlet_order_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_orders_outlet_order_no ON public.orders USING btree (outlet_id, order_no);


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

CREATE TRIGGER backup_schedules_touch_updated_at BEFORE UPDATE ON public.backup_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: cash_shifts cash_shifts_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cash_shifts_touch BEFORE UPDATE ON public.cash_shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: categories categories_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: loyalty_settings loyalty_settings_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER loyalty_settings_touch BEFORE UPDATE ON public.loyalty_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: menu_items menu_items_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER menu_items_touch BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: open_bills open_bills_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER open_bills_touch BEFORE UPDATE ON public.open_bills FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders orders_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: plan_invoices plan_invoices_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER plan_invoices_touch BEFORE UPDATE ON public.plan_invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: plans plans_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER plans_touch BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: promos promos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER promos_touch BEFORE UPDATE ON public.promos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: push_subscriptions push_subscriptions_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER push_subscriptions_touch BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shop_verifications shop_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER shop_verifications_updated_at BEFORE UPDATE ON public.shop_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ad_requests trg_ad_requests_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ad_requests_updated BEFORE UPDATE ON public.ad_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: stock_movements trg_apply_stock_movement; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_apply_stock_movement AFTER INSERT ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();


--
-- Name: attendances trg_attendances_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_attendances_updated BEFORE UPDATE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders trg_auto_release_escrow; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_release_escrow AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.auto_release_escrow_on_complete();


--
-- Name: booking_slots trg_booking_slots_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_booking_slots_updated BEFORE UPDATE ON public.booking_slots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bookings trg_bookings_fill_shop; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bookings_fill_shop BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.bookings_fill_shop_id();


--
-- Name: bookings trg_bookings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: attendances trg_calc_attendance_duration; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calc_attendance_duration BEFORE INSERT OR UPDATE ON public.attendances FOR EACH ROW EXECUTE FUNCTION public.calc_attendance_duration();


--
-- Name: marketplace_cart_items trg_cart_items_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cart_items_updated BEFORE UPDATE ON public.marketplace_cart_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: marketplace_carts trg_carts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.marketplace_carts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: bookings trg_check_booking_capacity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_check_booking_capacity BEFORE INSERT OR UPDATE OF slot_id, party_size, status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.check_booking_capacity();


--
-- Name: order_items trg_consume_stock_for_order_item; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_consume_stock_for_order_item AFTER INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.consume_stock_for_order_item();


--
-- Name: custom_order_requests trg_cor_status_history_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cor_status_history_ins AFTER INSERT ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.log_custom_order_status_change();


--
-- Name: custom_order_requests trg_cor_status_history_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cor_status_history_upd AFTER UPDATE OF status ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.log_custom_order_status_change();


--
-- Name: couriers trg_couriers_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_couriers_updated BEFORE UPDATE ON public.couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_memberships trg_cust_memberships_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cust_memberships_updated BEFORE UPDATE ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_wallets trg_cust_wallets_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cust_wallets_updated BEFORE UPDATE ON public.customer_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: custom_order_quotes trg_custom_order_quotes_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_custom_order_quotes_updated BEFORE UPDATE ON public.custom_order_quotes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_addresses trg_customer_addresses_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_customer_addresses_updated BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: customer_profiles trg_customer_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_customer_profiles_updated BEFORE UPDATE ON public.customer_profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: delivery_settings trg_delivery_settings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_delivery_settings_updated BEFORE UPDATE ON public.delivery_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: delivery_zones trg_delivery_zones_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_delivery_zones_updated BEFORE UPDATE ON public.delivery_zones FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: order_disputes trg_disputes_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_disputes_updated BEFORE UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders trg_enforce_qr_table_lock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_enforce_qr_table_lock BEFORE UPDATE OF table_label, order_source ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_qr_table_lock();


--
-- Name: features trg_features_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_features_touch BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: flyers trg_flyers_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_flyers_updated BEFORE UPDATE ON public.flyers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: studio_galleries trg_galleries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_galleries_updated_at BEFORE UPDATE ON public.studio_galleries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ingredients trg_ingredients_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ingredients_updated BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: lesson_progress trg_issue_course_certificate; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_issue_course_certificate AFTER INSERT OR UPDATE OF completed_at ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION public.fn_issue_course_certificate();


--
-- Name: travel_jamaah_documents trg_jamaah_docs_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jamaah_docs_updated BEFORE UPDATE ON public.travel_jamaah_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_deliverables trg_job_deliverables_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_job_deliverables_updated BEFORE UPDATE ON public.job_deliverables FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: leads trg_leads_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_leads_updated BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shifts trg_log_shift_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_shift_change AFTER INSERT OR DELETE OR UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.log_shift_change();


--
-- Name: medications trg_medications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_membership_tiers trg_membership_tiers_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_membership_tiers_updated BEFORE UPDATE ON public.shop_membership_tiers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: order_disputes trg_notify_dispute_event; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_dispute_event AFTER INSERT OR UPDATE ON public.order_disputes FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_event();


--
-- Name: ingredients trg_notify_low_stock; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_low_stock AFTER INSERT OR UPDATE OF current_stock, min_stock ON public.ingredients FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();


--
-- Name: customer_memberships trg_notify_membership; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_membership AFTER INSERT ON public.customer_memberships FOR EACH ROW EXECUTE FUNCTION public.notify_membership_event();


--
-- Name: orders trg_notify_new_marketplace_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_new_marketplace_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_marketplace_order();


--
-- Name: orders trg_notify_order_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_order_status_change AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: wallet_topups trg_notify_wallet_topup; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_wallet_topup AFTER INSERT OR UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_topup_event();


--
-- Name: withdrawal_requests trg_notify_withdrawal_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_withdrawal_status AFTER UPDATE OF status ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.notify_withdrawal_status();


--
-- Name: outlet_couriers trg_outlet_couriers_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_outlet_couriers_touch BEFORE UPDATE ON public.outlet_couriers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: outlets trg_outlets_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_outlets_updated BEFORE UPDATE ON public.outlets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: parked_carts trg_parked_carts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_parked_carts_updated_at BEFORE UPDATE ON public.parked_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: patient_records trg_patient_records_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_patient_records_updated BEFORE UPDATE ON public.patient_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: studio_photographers trg_photographers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_photographers_updated_at BEFORE UPDATE ON public.studio_photographers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_vouchers trg_platform_vouchers_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_platform_vouchers_updated BEFORE UPDATE ON public.platform_vouchers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: purchase_orders trg_po_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: user_preferences trg_prefs_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prefs_updated BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: prescriptions trg_prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_qa trg_product_qa_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_qa_updated BEFORE UPDATE ON public.product_qa FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: product_reviews trg_product_reviews_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_product_reviews_updated BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: profiles trg_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: product_reviews trg_refresh_product_rating; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_refresh_product_rating AFTER INSERT OR DELETE OR UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();


--
-- Name: restock_subscribers trg_restock_sub_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_restock_sub_updated BEFORE UPDATE ON public.restock_subscribers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: sales_offerings trg_sales_offerings_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sales_offerings_updated BEFORE UPDATE ON public.sales_offerings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings trg_set_booking_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_booking_type BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_type_from_slot();


--
-- Name: orders trg_set_order_no; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_order_no BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_no();


--
-- Name: shifts trg_shifts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shifts_updated BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shop_about trg_shop_about_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shop_about_updated BEFORE UPDATE ON public.shop_about FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_chat_messages trg_shop_chat_last_msg; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shop_chat_last_msg AFTER INSERT ON public.shop_chat_messages FOR EACH ROW EXECUTE FUNCTION public.shop_chat_set_last_message_at();


--
-- Name: shop_wallets trg_shop_wallets_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shop_wallets_updated BEFORE UPDATE ON public.shop_wallets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: shops trg_shops_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_shops_updated BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: studio_locations trg_studio_locations_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_studio_locations_updated BEFORE UPDATE ON public.studio_locations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: suppliers trg_suppliers_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: testimonials trg_testimonials_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_testimonials_updated BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: themes trg_themes_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_themes_touch BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: wallet_topup_presets trg_topup_presets_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_topup_presets_updated BEFORE UPDATE ON public.wallet_topup_presets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: travel_installments trg_travel_inst_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_travel_inst_updated_at BEFORE UPDATE ON public.travel_installments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_itineraries trg_travel_itineraries_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_travel_itineraries_updated BEFORE UPDATE ON public.travel_itineraries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: travel_jamaah_manifest trg_travel_manifest_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_travel_manifest_updated_at BEFORE UPDATE ON public.travel_jamaah_manifest FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_facilities trg_umroh_facilities_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_umroh_facilities_updated BEFORE UPDATE ON public.umroh_facilities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_faqs trg_umroh_faqs_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_umroh_faqs_updated BEFORE UPDATE ON public.umroh_faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: umroh_packages trg_umroh_packages_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_umroh_packages_updated BEFORE UPDATE ON public.umroh_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_chat_messages trg_update_shop_chat_last_message; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_shop_chat_last_message AFTER INSERT ON public.shop_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_shop_chat_last_message();


--
-- Name: product_upsell_suggestions trg_upsell_fill_shop; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_upsell_fill_shop BEFORE INSERT ON public.product_upsell_suggestions FOR EACH ROW EXECUTE FUNCTION public.upsell_fill_shop_id();


--
-- Name: product_upsell_suggestions trg_upsell_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_upsell_updated_at BEFORE UPDATE ON public.product_upsell_suggestions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: orders trg_upsert_shop_customer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_upsert_shop_customer AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.upsert_shop_customer_on_order();


--
-- Name: business_categories trg_validate_business_category_flow_types; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_business_category_flow_types BEFORE INSERT OR UPDATE ON public.business_categories FOR EACH ROW EXECUTE FUNCTION public.validate_business_category_flow_types();


--
-- Name: plan_features trg_validate_plan_feature_min_months; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_plan_feature_min_months BEFORE INSERT OR UPDATE ON public.plan_features FOR EACH ROW EXECUTE FUNCTION public.validate_plan_feature_min_months();


--
-- Name: plan_themes trg_validate_plan_theme_min_months; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_plan_theme_min_months BEFORE INSERT OR UPDATE ON public.plan_themes FOR EACH ROW EXECUTE FUNCTION public.validate_plan_theme_min_months();


--
-- Name: shifts trg_validate_shift_no_overlap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_shift_no_overlap BEFORE INSERT OR UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.validate_shift_no_overlap();


--
-- Name: wallet_topups trg_wallet_topups_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wallet_topups_updated BEFORE UPDATE ON public.wallet_topups FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: withdrawal_requests trg_withdrawals_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_withdrawals_updated BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: banners update_banners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bulk_pricing_rules update_bulk_pricing_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bulk_pricing_rules_updated_at BEFORE UPDATE ON public.bulk_pricing_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_order_requests update_custom_order_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_order_requests_updated_at BEFORE UPDATE ON public.custom_order_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_segments update_customer_segments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_segments_updated_at BEFORE UPDATE ON public.customer_segments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_rules update_expiry_reminder_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expiry_reminder_rules_updated_at BEFORE UPDATE ON public.expiry_reminder_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_shop_rules update_expiry_reminder_shop_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expiry_reminder_shop_rules_updated_at BEFORE UPDATE ON public.expiry_reminder_shop_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: expiry_reminder_shop_settings update_expiry_reminder_shop_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_expiry_reminder_shop_settings_updated_at BEFORE UPDATE ON public.expiry_reminder_shop_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: flash_sales update_flash_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_flash_sales_updated_at BEFORE UPDATE ON public.flash_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketing_campaigns update_marketing_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketing_campaigns_updated_at BEFORE UPDATE ON public.marketing_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_variants update_menu_item_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_menu_item_variants_updated_at BEFORE UPDATE ON public.menu_item_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_reviews update_menu_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_menu_reviews_updated_at BEFORE UPDATE ON public.menu_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_option_groups update_option_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_option_groups_updated_at BEFORE UPDATE ON public.menu_item_option_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: menu_item_options update_options_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_options_updated_at BEFORE UPDATE ON public.menu_item_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: page_layouts update_page_layouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_page_layouts_updated_at BEFORE UPDATE ON public.page_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plan_subscriptions update_plan_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plan_subscriptions_updated_at BEFORE UPDATE ON public.plan_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: printers update_printers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_printers_updated_at BEFORE UPDATE ON public.printers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_attribute_defs update_product_attribute_defs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_attribute_defs_updated_at BEFORE UPDATE ON public.product_attribute_defs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: service_bundles update_service_bundles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_service_bundles_updated_at BEFORE UPDATE ON public.service_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_customers update_shop_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shop_customers_updated_at BEFORE UPDATE ON public.shop_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shop_vouchers update_shop_vouchers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_shop_vouchers_updated_at BEFORE UPDATE ON public.shop_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_members update_staff_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_opnames update_stock_opnames_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_opnames_updated_at BEFORE UPDATE ON public.stock_opnames FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
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
-- Name: ad_requests ad_requests_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_review_requests booking_review_requests_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_reviews booking_reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: booking_reviews booking_reviews_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_slots booking_slots_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT booking_slots_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_waitlist booking_waitlist_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: booking_waitlist booking_waitlist_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.studio_locations(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_photographer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.studio_photographers(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE RESTRICT;


--
-- Name: bulk_pricing_rules bulk_pricing_rules_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: bulk_pricing_rules bulk_pricing_rules_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: bundle_items bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: bundle_items bundle_items_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;


--
-- Name: campaign_recipients campaign_recipients_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE;


--
-- Name: cash_movements cash_movements_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE CASCADE;


--
-- Name: categories categories_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON DELETE SET NULL;


--
-- Name: categories categories_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shops coffee_shops_business_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_business_category_id_fkey FOREIGN KEY (business_category_id) REFERENCES public.business_categories(id);


--
-- Name: shops coffee_shops_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: course_certificates course_certificates_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: course_certificates course_certificates_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: course_lessons course_lessons_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id) ON DELETE CASCADE;


--
-- Name: course_modules course_modules_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: custom_order_quotes custom_order_quotes_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_order_requests(id) ON DELETE CASCADE;


--
-- Name: custom_order_quotes custom_order_quotes_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: custom_order_requests custom_order_requests_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.freelance_contracts(id) ON DELETE SET NULL;


--
-- Name: custom_order_requests custom_order_requests_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: custom_order_requests custom_order_requests_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: custom_order_status_history custom_order_status_history_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_order_status_history
    ADD CONSTRAINT custom_order_status_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_order_requests(id) ON DELETE CASCADE;


--
-- Name: customer_memberships customer_memberships_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: customer_memberships customer_memberships_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.shop_membership_tiers(id) ON DELETE RESTRICT;


--
-- Name: customer_treatments customer_treatments_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: customer_treatments customer_treatments_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: customer_wallet_transactions customer_wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallet_transactions
    ADD CONSTRAINT customer_wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.customer_wallets(id) ON DELETE CASCADE;


--
-- Name: customer_wallets customer_wallets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: domain_audit domain_audit_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.domain_audit
    ADD CONSTRAINT domain_audit_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: expiry_reminder_shop_rules expiry_reminder_shop_rules_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: expiry_reminder_shop_settings expiry_reminder_shop_settings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expiry_reminder_shop_settings
    ADD CONSTRAINT expiry_reminder_shop_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: flash_sales flash_sales_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: flash_sales flash_sales_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: flyers flyers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flyers
    ADD CONSTRAINT flyers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: fnb_combos fnb_combos_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fnb_combos
    ADD CONSTRAINT fnb_combos_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: freelance_contracts freelance_contracts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: ingredients ingredients_default_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_default_supplier_id_fkey FOREIGN KEY (default_supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: job_deliverables job_deliverables_custom_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_custom_order_id_fkey FOREIGN KEY (custom_order_id) REFERENCES public.custom_order_requests(id) ON DELETE SET NULL;


--
-- Name: job_deliverables job_deliverables_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: leads leads_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lesson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON DELETE CASCADE;


--
-- Name: marketplace_cart_items marketplace_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.marketplace_carts(id) ON DELETE CASCADE;


--
-- Name: marketplace_cart_items marketplace_cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: marketplace_cart_items marketplace_cart_items_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: marketplace_carts marketplace_carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: medications medications_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: menu_item_options menu_item_options_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.menu_item_option_groups(id) ON DELETE CASCADE;


--
-- Name: menu_item_variants menu_item_variants_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: menu_item_variants menu_item_variants_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: menu_items menu_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: menu_items menu_items_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: open_bills open_bills_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: open_bills open_bills_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: order_audit_log order_audit_log_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: order_audit_log order_audit_log_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: order_audit_log order_audit_log_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_membership_tier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_membership_tier_id_fkey FOREIGN KEY (membership_tier_id) REFERENCES public.shop_membership_tiers(id) ON DELETE SET NULL;


--
-- Name: orders orders_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: orders orders_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: outlet_couriers outlet_couriers_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: outlet_couriers outlet_couriers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: outlets outlets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: page_layout_versions page_layout_versions_layout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layout_versions
    ADD CONSTRAINT page_layout_versions_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.page_layouts(id) ON DELETE CASCADE;


--
-- Name: page_layouts page_layouts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_layouts
    ADD CONSTRAINT page_layouts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: parked_carts parked_carts_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: parked_carts parked_carts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: patient_records patient_records_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_records
    ADD CONSTRAINT patient_records_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: patient_visits patient_visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_records(id) ON DELETE CASCADE;


--
-- Name: patient_visits patient_visits_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_feature_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.features(key) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_invoices plan_invoices_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: plan_invoices plan_invoices_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: plan_subscriptions plan_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: plan_subscriptions plan_subscriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: plan_themes plan_themes_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: plan_themes plan_themes_theme_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_theme_key_fkey FOREIGN KEY (theme_key) REFERENCES public.themes(key) ON DELETE CASCADE;


--
-- Name: platform_voucher_redemptions platform_voucher_redemptions_voucher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_voucher_redemptions
    ADD CONSTRAINT platform_voucher_redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.platform_vouchers(id) ON DELETE CASCADE;


--
-- Name: po_audit_log po_audit_log_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_audit_log
    ADD CONSTRAINT po_audit_log_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: pos_audit_log pos_audit_log_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: prescription_items prescription_items_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_records(id) ON DELETE SET NULL;


--
-- Name: prescriptions prescriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.patient_visits(id) ON DELETE SET NULL;


--
-- Name: printers printers_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE;


--
-- Name: printers printers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_attribute_defs product_attribute_defs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: product_attribute_defs product_attribute_defs_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_qa product_qa_answered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_qa product_qa_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: product_qa product_qa_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_qa product_qa_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_returns product_returns_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: product_returns product_returns_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: product_returns product_returns_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: product_upsell_suggestions product_upsell_suggestions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: product_upsell_suggestions product_upsell_suggestions_suggested_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_suggested_id_fkey FOREIGN KEY (suggested_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- Name: push_subscriptions push_subscriptions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: rental_bookings rental_bookings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: rental_bookings rental_bookings_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.rental_units(id) ON DELETE CASCADE;


--
-- Name: rental_inspections rental_inspections_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.rental_bookings(id) ON DELETE CASCADE;


--
-- Name: rental_inspections rental_inspections_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: rental_inspections rental_inspections_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: rental_units rental_units_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_units
    ADD CONSTRAINT rental_units_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: restock_subscribers restock_subscribers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: restock_subscribers restock_subscribers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: sales_offerings sales_offerings_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_offerings
    ADD CONSTRAINT sales_offerings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: service_bundle_items service_bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundle_items
    ADD CONSTRAINT service_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.service_bundles(id) ON DELETE CASCADE;


--
-- Name: service_bundles service_bundles_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_bundles
    ADD CONSTRAINT service_bundles_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_about shop_about_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_about
    ADD CONSTRAINT shop_about_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_chat_messages shop_chat_messages_chat_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.shop_chats(id) ON DELETE CASCADE;


--
-- Name: shop_chat_messages shop_chat_messages_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_chats shop_chats_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_membership_tiers shop_membership_tiers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_membership_tiers
    ADD CONSTRAINT shop_membership_tiers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_portfolio shop_portfolio_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_portfolio
    ADD CONSTRAINT shop_portfolio_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_size_charts shop_size_charts_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_size_charts
    ADD CONSTRAINT shop_size_charts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_verifications shop_verifications_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_verifications
    ADD CONSTRAINT shop_verifications_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_vouchers shop_vouchers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: shop_wallets shop_wallets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shop_wallets
    ADD CONSTRAINT shop_wallets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: staff_audit_logs staff_audit_logs_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audit_logs
    ADD CONSTRAINT staff_audit_logs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: staff_members staff_members_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: staff_members staff_members_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: stock_opname_items stock_opname_items_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;


--
-- Name: stock_opname_items stock_opname_items_stock_opname_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_stock_opname_id_fkey FOREIGN KEY (stock_opname_id) REFERENCES public.stock_opnames(id) ON DELETE CASCADE;


--
-- Name: studio_galleries studio_galleries_photographer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.studio_photographers(id) ON DELETE SET NULL;


--
-- Name: studio_galleries studio_galleries_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: studio_gallery_photos studio_gallery_photos_gallery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_gallery_photos
    ADD CONSTRAINT studio_gallery_photos_gallery_id_fkey FOREIGN KEY (gallery_id) REFERENCES public.studio_galleries(id) ON DELETE CASCADE;


--
-- Name: studio_locations studio_locations_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_locations
    ADD CONSTRAINT studio_locations_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: studio_packages studio_packages_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_packages
    ADD CONSTRAINT studio_packages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: studio_photographers studio_photographers_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.studio_photographers
    ADD CONSTRAINT studio_photographers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: testimonials testimonials_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_installments travel_installments_jamaah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_jamaah_id_fkey FOREIGN KEY (jamaah_id) REFERENCES public.travel_jamaah_manifest(id) ON DELETE SET NULL;


--
-- Name: travel_installments travel_installments_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE SET NULL;


--
-- Name: travel_installments travel_installments_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_itineraries travel_itineraries_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE CASCADE;


--
-- Name: travel_itineraries travel_itineraries_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_jamaah_documents travel_jamaah_documents_jamaah_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_jamaah_id_fkey FOREIGN KEY (jamaah_id) REFERENCES public.travel_jamaah_manifest(id) ON DELETE CASCADE;


--
-- Name: travel_jamaah_documents travel_jamaah_documents_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: travel_jamaah_manifest travel_jamaah_manifest_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE SET NULL;


--
-- Name: travel_jamaah_manifest travel_jamaah_manifest_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: umroh_facilities umroh_facilities_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_facilities
    ADD CONSTRAINT umroh_facilities_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: umroh_faqs umroh_faqs_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_faqs
    ADD CONSTRAINT umroh_faqs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: umroh_packages umroh_packages_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.umroh_packages
    ADD CONSTRAINT umroh_packages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_default_outlet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_default_outlet_id_fkey FOREIGN KEY (default_outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_topup_presets wallet_topup_presets_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topup_presets
    ADD CONSTRAINT wallet_topup_presets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: wallet_topups wallet_topups_preset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.wallet_topup_presets(id) ON DELETE SET NULL;


--
-- Name: wallet_topups wallet_topups_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- Name: wishlists wishlists_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: withdrawal_requests withdrawal_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: withdrawal_requests withdrawal_requests_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;
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
-- Name: banners Banners are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Banners are viewable by everyone" ON public.banners FOR SELECT USING (true);


--
-- Name: bundle_items Bundle items are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bundle items are viewable by everyone" ON public.bundle_items FOR SELECT USING (true);


--
-- Name: bundle_items Bundle items managed by shop owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Bundle items managed by shop owner" ON public.bundle_items USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops s ON ((s.id = mi.shop_id)))
  WHERE ((mi.id = bundle_items.bundle_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops s ON ((s.id = mi.shop_id)))
  WHERE ((mi.id = bundle_items.bundle_id) AND (s.owner_id = auth.uid())))));


--
-- Name: orders Couriers can claim and update assigned orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Couriers can claim and update assigned orders" ON public.orders FOR UPDATE TO authenticated USING (((courier_id IN ( SELECT couriers.id
   FROM public.couriers
  WHERE (couriers.user_id = auth.uid()))) OR ((courier_id IS NULL) AND public.is_courier_of_shop(auth.uid(), shop_id)))) WITH CHECK ((courier_id IN ( SELECT couriers.id
   FROM public.couriers
  WHERE (couriers.user_id = auth.uid()))));


--
-- Name: orders Couriers can view assigned orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Couriers can view assigned orders" ON public.orders FOR SELECT TO authenticated USING (((courier_id IN ( SELECT couriers.id
   FROM public.couriers
  WHERE (couriers.user_id = auth.uid()))) OR ((courier_id IS NULL) AND (status = ANY (ARRAY['ready'::public.order_status, 'preparing'::public.order_status])) AND (fulfillment = 'delivery'::public.fulfillment_type) AND public.is_courier_of_shop(auth.uid(), shop_id))));


--
-- Name: course_lessons Course lessons viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Course lessons viewable by everyone" ON public.course_lessons FOR SELECT USING (true);


--
-- Name: course_modules Course modules viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Course modules viewable by everyone" ON public.course_modules FOR SELECT USING (true);


--
-- Name: staff_permissions Owner manages staff permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner manages staff permissions" ON public.staff_permissions USING ((EXISTS ( SELECT 1
   FROM public.shops
  WHERE ((shops.id = staff_permissions.shop_id) AND (shops.owner_id = auth.uid())))));


--
-- Name: staff_audit_logs Owners can insert staff audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can insert staff audit" ON public.staff_audit_logs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops c
  WHERE ((c.id = staff_audit_logs.shop_id) AND (c.owner_id = auth.uid())))));


--
-- Name: staff_audit_logs Owners can view staff audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view staff audit" ON public.staff_audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops c
  WHERE ((c.id = staff_audit_logs.shop_id) AND (c.owner_id = auth.uid())))));


--
-- Name: bulk_pricing_rules Owners manage bulk pricing (delete); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage bulk pricing (delete)" ON public.bulk_pricing_rules FOR DELETE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: bulk_pricing_rules Owners manage bulk pricing (insert); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage bulk pricing (insert)" ON public.bulk_pricing_rules FOR INSERT TO authenticated WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: bulk_pricing_rules Owners manage bulk pricing (update); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage bulk pricing (update)" ON public.bulk_pricing_rules FOR UPDATE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_vouchers Owners manage own shop vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage own shop vouchers" ON public.shop_vouchers TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: flash_sales Owners manage their flash sales (delete); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their flash sales (delete)" ON public.flash_sales FOR DELETE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: flash_sales Owners manage their flash sales (insert); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their flash sales (insert)" ON public.flash_sales FOR INSERT TO authenticated WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: flash_sales Owners manage their flash sales (update); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their flash sales (update)" ON public.flash_sales FOR UPDATE TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: page_layout_versions Owners manage their layout versions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners manage their layout versions" ON public.page_layout_versions USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layout_versions.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layout_versions.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: studio_locations Public can view active studio locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active studio locations" ON public.studio_locations FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: bulk_pricing_rules Public can view bulk pricing; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view bulk pricing" ON public.bulk_pricing_rules FOR SELECT USING (true);


--
-- Name: flash_sales Public can view flash sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view flash sales" ON public.flash_sales FOR SELECT USING (true);


--
-- Name: shop_vouchers Public view active vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public view active vouchers" ON public.shop_vouchers FOR SELECT TO authenticated, anon USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())) AND ((starts_at IS NULL) OR (starts_at <= now()))));


--
-- Name: parked_carts Shop members can delete parked carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop members can delete parked carts" ON public.parked_carts FOR DELETE TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: po_audit_log Shop members can insert PO audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop members can insert PO audit log" ON public.po_audit_log FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: parked_carts Shop members can insert parked carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop members can insert parked carts" ON public.parked_carts FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: po_audit_log Shop members can read PO audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop members can read PO audit log" ON public.po_audit_log FOR SELECT TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: parked_carts Shop members can update parked carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop members can update parked carts" ON public.parked_carts FOR UPDATE TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: parked_carts Shop members can view parked carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop members can view parked carts" ON public.parked_carts FOR SELECT TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: product_attribute_defs Shop owner can delete attribute defs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owner can delete attribute defs" ON public.product_attribute_defs FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_attribute_defs Shop owner can insert attribute defs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owner can insert attribute defs" ON public.product_attribute_defs FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_attribute_defs Shop owner can update attribute defs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owner can update attribute defs" ON public.product_attribute_defs FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_attribute_defs Shop owner can view attribute defs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owner can view attribute defs" ON public.product_attribute_defs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_attribute_defs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can delete their printers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners can delete their printers" ON public.printers FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can insert their printers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners can insert their printers" ON public.printers FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can update their printers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners can update their printers" ON public.printers FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: printers Shop owners can view their printers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners can view their printers" ON public.printers FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = printers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: course_lessons Shop owners manage lessons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners manage lessons" ON public.course_lessons USING ((EXISTS ( SELECT 1
   FROM ((public.course_modules cm
     JOIN public.menu_items mi ON ((mi.id = cm.menu_item_id)))
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((cm.id = course_lessons.module_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.course_modules cm
     JOIN public.menu_items mi ON ((mi.id = cm.menu_item_id)))
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((cm.id = course_lessons.module_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: course_modules Shop owners manage modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners manage modules" ON public.course_modules USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = course_modules.menu_item_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = course_modules.menu_item_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: wishlists Shop owners view wishlists of their products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Shop owners view wishlists of their products" ON public.wishlists FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = wishlists.menu_item_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: staff_audit_logs Staff can insert own audit log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert own audit log" ON public.staff_audit_logs FOR INSERT WITH CHECK (((actor_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_audit_logs.shop_id) AND (s.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND (ur.shop_id = staff_audit_logs.shop_id)))))));


--
-- Name: staff_permissions Staff reads own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff reads own permissions" ON public.staff_permissions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: shop_vouchers Staff view shop vouchers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff view shop vouchers" ON public.shop_vouchers FOR SELECT TO authenticated USING ((shop_id IN ( SELECT user_roles.shop_id
   FROM public.user_roles
  WHERE (user_roles.user_id = auth.uid()))));


--
-- Name: banners Super admin can delete banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can delete banners" ON public.banners FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: banners Super admin can insert banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can insert banners" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: banners Super admin can update banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin can update banners" ON public.banners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: course_enrollments Users delete own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own enrollments" ON public.course_enrollments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: lesson_progress Users delete own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own progress" ON public.lesson_progress FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: wishlists Users delete own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own wishlist" ON public.wishlists FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: course_enrollments Users insert own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own enrollments" ON public.course_enrollments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_progress Users insert own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own progress" ON public.lesson_progress FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: wishlists Users insert own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own wishlist" ON public.wishlists FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: lesson_progress Users update own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own progress" ON public.lesson_progress FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: course_enrollments Users view own enrollments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own enrollments" ON public.course_enrollments FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM (public.menu_items mi
     JOIN public.shops cs ON ((cs.id = mi.shop_id)))
  WHERE ((mi.id = course_enrollments.menu_item_id) AND (cs.owner_id = auth.uid()))))));


--
-- Name: lesson_progress Users view own progress; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own progress" ON public.lesson_progress FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: wishlists Users view own wishlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own wishlist" ON public.wishlists FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ad_requests ad_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ad_admin_all ON public.ad_requests USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: ad_requests ad_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ad_owner_insert ON public.ad_requests FOR INSERT WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: ad_requests ad_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ad_owner_select ON public.ad_requests FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: ad_requests ad_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ad_owner_update ON public.ad_requests FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: ad_requests ad_public_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ad_public_active ON public.ad_requests FOR SELECT USING ((status = 'active'::text));


--
-- Name: ad_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews admin_manage_review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_manage_review ON public.product_reviews USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: withdrawal_requests admin_update_withdrawal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_update_withdrawal ON public.withdrawal_requests FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: wallet_topup_presets anyone_view_active_presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_view_active_presets ON public.wallet_topup_presets FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topup_presets.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: shop_membership_tiers anyone_view_active_tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_view_active_tiers ON public.shop_membership_tiers FOR SELECT USING (((is_active = true) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_membership_tiers.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: attendances; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

--
-- Name: attendances attendances_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendances_owner_all ON public.attendances TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = attendances.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = attendances.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: attendances attendances_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendances_self_insert ON public.attendances FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND public.has_outlet_access(auth.uid(), outlet_id)));


--
-- Name: attendances attendances_self_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendances_self_select ON public.attendances FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: attendances attendances_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY attendances_self_update ON public.attendances FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: backup_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.backup_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: backup_schedules backup_schedules_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_schedules_owner_all ON public.backup_schedules TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = backup_schedules.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = backup_schedules.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: backup_schedules backup_schedules_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY backup_schedules_super_admin_read ON public.backup_schedules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_settings billing_settings_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_settings_super_admin_read ON public.billing_settings FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: billing_settings billing_settings_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_settings_super_admin_write ON public.billing_settings TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: booking_reschedule_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_reschedule_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_review_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_review_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_waitlist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: bookings bookings_customer_cancel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_customer_cancel ON public.bookings FOR UPDATE USING ((auth.uid() = customer_user_id)) WITH CHECK ((auth.uid() = customer_user_id));


--
-- Name: bookings bookings_customer_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_customer_insert ON public.bookings FOR INSERT WITH CHECK (((auth.uid() = customer_user_id) OR (customer_user_id IS NULL)));


--
-- Name: bookings bookings_customer_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_customer_select ON public.bookings FOR SELECT USING ((auth.uid() = customer_user_id));


--
-- Name: bookings bookings_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_owner_select ON public.bookings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = bookings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: bookings bookings_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bookings_owner_update ON public.bookings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = bookings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: branding_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branding_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: branding_audit branding_audit_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branding_audit_owner_insert ON public.branding_audit FOR INSERT TO authenticated WITH CHECK (((changed_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = branding_audit.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: branding_audit branding_audit_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY branding_audit_owner_read ON public.branding_audit FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = branding_audit.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: bulk_pricing_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bulk_pricing_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: bundle_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: business_categories business_categories_admin_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_categories_admin_read_all ON public.business_categories FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: business_categories business_categories_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_categories_admin_write ON public.business_categories TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: business_categories business_categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY business_categories_public_read ON public.business_categories FOR SELECT USING ((is_active = true));


--
-- Name: custom_order_requests buyer_insert_custom_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_insert_custom_order ON public.custom_order_requests FOR INSERT WITH CHECK (((user_id IS NULL) OR (user_id = auth.uid())));


--
-- Name: shop_chat_messages buyer_insert_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_insert_messages ON public.shop_chat_messages FOR INSERT WITH CHECK (((sender_role = 'buyer'::text) AND (sender_id = auth.uid()) AND (chat_id IN ( SELECT shop_chats.id
   FROM public.shop_chats
  WHERE (shop_chats.buyer_user_id = auth.uid())))));


--
-- Name: shop_chats buyer_insert_own_chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_insert_own_chat ON public.shop_chats FOR INSERT WITH CHECK ((auth.uid() = buyer_user_id));


--
-- Name: shop_chats buyer_select_own_chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_select_own_chat ON public.shop_chats FOR SELECT USING ((auth.uid() = buyer_user_id));


--
-- Name: custom_order_requests buyer_select_own_custom_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_select_own_custom_order ON public.custom_order_requests FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: shop_chat_messages buyer_select_own_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_select_own_messages ON public.shop_chat_messages FOR SELECT USING ((chat_id IN ( SELECT shop_chats.id
   FROM public.shop_chats
  WHERE (shop_chats.buyer_user_id = auth.uid()))));


--
-- Name: shop_chats buyer_update_own_chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_update_own_chat ON public.shop_chats FOR UPDATE USING ((auth.uid() = buyer_user_id));


--
-- Name: shop_chat_messages buyer_update_own_msg_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_update_own_msg_read ON public.shop_chat_messages FOR UPDATE USING ((chat_id IN ( SELECT shop_chats.id
   FROM public.shop_chats
  WHERE (shop_chats.buyer_user_id = auth.uid()))));


--
-- Name: campaign_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: campaign_recipients campaign_recipients_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY campaign_recipients_owner_all ON public.campaign_recipients TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.marketing_campaigns mc
     JOIN public.shops s ON ((s.id = mc.shop_id)))
  WHERE ((mc.id = campaign_recipients.campaign_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.marketing_campaigns mc
     JOIN public.shops s ON ((s.id = mc.shop_id)))
  WHERE ((mc.id = campaign_recipients.campaign_id) AND (s.owner_id = auth.uid())))));


--
-- Name: cash_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_movements cash_movements_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_movements_owner_all ON public.cash_movements TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.cash_shifts cs
     JOIN public.shops s ON ((s.id = cs.shop_id)))
  WHERE ((cs.id = cash_movements.shift_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.cash_shifts cs
     JOIN public.shops s ON ((s.id = cs.shop_id)))
  WHERE ((cs.id = cash_movements.shift_id) AND (s.owner_id = auth.uid())))));


--
-- Name: cash_movements cash_movements_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_movements_staff_insert ON public.cash_movements FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.cash_shifts cs
  WHERE ((cs.id = cash_movements.shift_id) AND public.has_outlet_access(auth.uid(), cs.outlet_id)))));


--
-- Name: cash_movements cash_movements_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_movements_staff_read ON public.cash_movements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.cash_shifts cs
  WHERE ((cs.id = cash_movements.shift_id) AND public.has_outlet_access(auth.uid(), cs.outlet_id)))));


--
-- Name: cash_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: cash_shifts cash_shifts_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_shifts_owner_all ON public.cash_shifts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = cash_shifts.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = cash_shifts.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: cash_shifts cash_shifts_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_shifts_staff_insert ON public.cash_shifts FOR INSERT TO authenticated WITH CHECK ((public.has_outlet_access(auth.uid(), outlet_id) AND (opened_by = auth.uid())));


--
-- Name: cash_shifts cash_shifts_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_shifts_staff_read ON public.cash_shifts FOR SELECT TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: cash_shifts cash_shifts_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cash_shifts_staff_update ON public.cash_shifts FOR UPDATE TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id)) WITH CHECK (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_owner_all ON public.categories TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = categories.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = categories.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: categories categories_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = categories.shop_id) AND (s.is_active = true))))));


--
-- Name: categories categories_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_staff_read ON public.categories FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = categories.shop_id)))));


--
-- Name: couriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

--
-- Name: couriers couriers_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_owner_all ON public.couriers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = couriers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = couriers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: couriers couriers_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY couriers_self_read ON public.couriers FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: course_certificates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

--
-- Name: course_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: course_lessons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

--
-- Name: course_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cron_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: cron_runs cron_runs_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cron_runs_super_admin_read ON public.cron_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: custom_order_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_order_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_order_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_order_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_order_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_order_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses customer_addresses_self_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_addresses_self_all ON public.customer_addresses TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: customer_memberships customer_create_membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_create_membership ON public.customer_memberships FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: wallet_topups customer_create_topup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_create_topup ON public.wallet_topups FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: customer_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_favorites customer_favorites_self_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_favorites_self_all ON public.customer_favorites TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: customer_wallets customer_insert_own_wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_insert_own_wallet ON public.customer_wallets FOR INSERT WITH CHECK ((customer_user_id = auth.uid()));


--
-- Name: customer_memberships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_topups customer_or_owner_update_topup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_or_owner_update_topup ON public.wallet_topups FOR UPDATE USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topups.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: customer_wallets customer_or_owner_update_wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_or_owner_update_wallet ON public.customer_wallets FOR UPDATE USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallets.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: customer_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_profiles customer_profiles_self_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_profiles_self_all ON public.customer_profiles TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: customer_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_segments customer_segments_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_segments_owner_all ON public.customer_segments TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_segments.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_segments.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: customer_segments customer_segments_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_segments_super_admin_read ON public.customer_segments FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: customer_treatments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_treatments ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_memberships customer_update_own_membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_update_own_membership ON public.customer_memberships FOR UPDATE USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_memberships.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: customer_memberships customer_view_own_memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_view_own_memberships ON public.customer_memberships FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_memberships.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: customer_wallets customer_view_own_wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY customer_view_own_wallet ON public.customer_wallets FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallets.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: customer_wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_settings delivery_settings_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_settings_owner_all ON public.delivery_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_settings.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_settings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: delivery_settings delivery_settings_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_settings_public_read ON public.delivery_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_settings.shop_id) AND (s.is_active = true)))));


--
-- Name: delivery_zones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_zones delivery_zones_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_zones_owner_all ON public.delivery_zones TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_zones.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_zones.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: delivery_zones delivery_zones_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delivery_zones_public_read ON public.delivery_zones FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = delivery_zones.shop_id) AND (s.is_active = true))))));


--
-- Name: order_disputes disputes_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY disputes_admin_update ON public.order_disputes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: order_disputes disputes_customer_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY disputes_customer_read ON public.order_disputes FOR SELECT TO authenticated USING ((opened_by = auth.uid()));


--
-- Name: order_disputes disputes_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY disputes_owner_read ON public.order_disputes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_disputes.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: order_disputes disputes_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY disputes_owner_update ON public.order_disputes FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_disputes.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = order_disputes.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: order_disputes disputes_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY disputes_super_admin_read ON public.order_disputes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: domain_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_audit domain_audit_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY domain_audit_owner_insert ON public.domain_audit FOR INSERT TO authenticated WITH CHECK (((actor_id = auth.uid()) AND ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_audit.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role))));


--
-- Name: domain_audit domain_audit_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY domain_audit_owner_select ON public.domain_audit FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_audit.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: domain_blacklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_blacklist ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_blacklist domain_blacklist_read_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY domain_blacklist_read_auth ON public.domain_blacklist FOR SELECT TO authenticated USING (true);


--
-- Name: domain_blacklist domain_blacklist_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY domain_blacklist_super_admin_write ON public.domain_blacklist TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: domain_verify_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.domain_verify_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: domain_verify_attempts dva_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dva_owner_insert ON public.domain_verify_attempts FOR INSERT TO authenticated WITH CHECK (((actor_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_verify_attempts.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: domain_verify_attempts dva_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dva_owner_read ON public.domain_verify_attempts FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = domain_verify_attempts.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: expiry_reminder_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expiry_reminder_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_reminder_shop_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expiry_reminder_shop_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_reminder_shop_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expiry_reminder_shop_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

--
-- Name: features features_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY features_public_read ON public.features FOR SELECT USING (true);


--
-- Name: features features_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY features_super_admin_write ON public.features TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: flash_sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: flyers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

--
-- Name: flyers flyers owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flyers owner all" ON public.flyers USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = flyers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = flyers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: flyers flyers public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "flyers public read" ON public.flyers FOR SELECT USING (true);


--
-- Name: fnb_combos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fnb_combos ENABLE ROW LEVEL SECURITY;

--
-- Name: freelance_contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.freelance_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_galleries galleries_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY galleries_owner_all ON public.studio_galleries TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_gallery_photos gallery_photos_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gallery_photos_owner_all ON public.studio_gallery_photos TO authenticated USING ((gallery_id IN ( SELECT g.id
   FROM (public.studio_galleries g
     JOIN public.shops s ON ((s.id = g.shop_id)))
  WHERE (s.owner_id = auth.uid())))) WITH CHECK ((gallery_id IN ( SELECT g.id
   FROM (public.studio_galleries g
     JOIN public.shops s ON ((s.id = g.shop_id)))
  WHERE (s.owner_id = auth.uid()))));


--
-- Name: icd10_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: icd10_codes icd10_read_all_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY icd10_read_all_authenticated ON public.icd10_codes FOR SELECT TO authenticated USING (true);


--
-- Name: ingredients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

--
-- Name: ingredients ingredients_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingredients_owner_all ON public.ingredients TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = ingredients.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = ingredients.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: ingredients ingredients_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ingredients_staff_read ON public.ingredients FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = ingredients.shop_id)))));


--
-- Name: customer_wallet_transactions insert_own_wallet_tx; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_wallet_tx ON public.customer_wallet_transactions FOR INSERT WITH CHECK (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallet_transactions.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: job_deliverables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_deliverables ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: leads leads owner delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leads owner delete" ON public.leads FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = leads.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: leads leads owner read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leads owner read" ON public.leads FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = leads.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: leads leads owner update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leads owner update" ON public.leads FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = leads.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: leads leads public insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "leads public insert" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: lesson_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_ledger loyalty_ledger_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loyalty_ledger_owner_read ON public.loyalty_ledger FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_ledger.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: loyalty_ledger loyalty_ledger_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loyalty_ledger_self_read ON public.loyalty_ledger FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: loyalty_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_points loyalty_points_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loyalty_points_owner_read ON public.loyalty_points FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_points.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: loyalty_points loyalty_points_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loyalty_points_self_read ON public.loyalty_points FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: loyalty_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: loyalty_settings loyalty_settings_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loyalty_settings_owner_all ON public.loyalty_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_settings.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_settings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: loyalty_settings loyalty_settings_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY loyalty_settings_public_read ON public.loyalty_settings FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = loyalty_settings.shop_id) AND (s.is_active = true))))));


--
-- Name: marketing_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_campaigns marketing_campaigns_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY marketing_campaigns_owner_all ON public.marketing_campaigns TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = marketing_campaigns.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = marketing_campaigns.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: marketplace_cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

--
-- Name: medications medications_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medications_owner_all ON public.medications TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: menu_item_option_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_option_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_options ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_item_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_items menu_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_owner_all ON public.menu_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_items.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_items.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_items menu_items_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_public_read ON public.menu_items FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_items.shop_id) AND (s.is_active = true))))));


--
-- Name: menu_items menu_items_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_items_staff_read ON public.menu_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_items.shop_id)))));


--
-- Name: menu_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.menu_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: menu_reviews menu_reviews_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_reviews_owner_all ON public.menu_reviews TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_reviews.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_reviews.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_reviews menu_reviews_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_reviews_public_read ON public.menu_reviews FOR SELECT USING ((is_visible = true));


--
-- Name: menu_reviews menu_reviews_self_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_reviews_self_delete ON public.menu_reviews FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: menu_reviews menu_reviews_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_reviews_self_insert ON public.menu_reviews FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = menu_reviews.order_id) AND (o.customer_user_id = auth.uid()) AND (o.status = 'completed'::public.order_status))))));


--
-- Name: menu_reviews menu_reviews_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY menu_reviews_self_update ON public.menu_reviews FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: open_bills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.open_bills ENABLE ROW LEVEL SECURITY;

--
-- Name: open_bills open_bills_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY open_bills_access ON public.open_bills TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id)) WITH CHECK (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: menu_item_option_groups option_groups_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY option_groups_owner_all ON public.menu_item_option_groups TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_option_groups.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_option_groups.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_item_option_groups option_groups_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY option_groups_public_read ON public.menu_item_option_groups FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_option_groups.shop_id) AND (s.is_active = true)))));


--
-- Name: menu_item_option_groups option_groups_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY option_groups_staff_read ON public.menu_item_option_groups FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_item_option_groups.shop_id)))));


--
-- Name: menu_item_options options_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY options_owner_all ON public.menu_item_options TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_options.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_options.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_item_options options_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY options_public_read ON public.menu_item_options FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_options.shop_id) AND (s.is_active = true))))));


--
-- Name: menu_item_options options_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY options_staff_read ON public.menu_item_options FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_item_options.shop_id)))));


--
-- Name: order_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: order_disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items order_items_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_access ON public.order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_outlet_access(auth.uid(), o.outlet_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND public.has_outlet_access(auth.uid(), o.outlet_id)))));


--
-- Name: order_items order_items_customer_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_customer_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_user_id = auth.uid()) AND ((o.status)::text = 'pending'::text)))));


--
-- Name: order_items order_items_customer_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_customer_self_read ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.customer_user_id = auth.uid())))));


--
-- Name: order_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: order_messages order_messages_participants_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_messages_participants_insert ON public.order_messages FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_messages.order_id) AND (o.shop_id = order_messages.shop_id) AND ((o.customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.shops s
          WHERE ((s.id = o.shop_id) AND (s.owner_id = auth.uid()))))))))));


--
-- Name: order_messages order_messages_participants_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_messages_participants_read ON public.order_messages FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_messages.order_id) AND ((o.customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.shops s
          WHERE ((s.id = o.shop_id) AND (s.owner_id = auth.uid())))))))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: orders orders_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_access ON public.orders TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id)) WITH CHECK (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: orders orders_courier_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_courier_read ON public.orders FOR SELECT TO authenticated USING (((courier_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.couriers c
  WHERE ((c.id = orders.courier_id) AND (c.user_id = auth.uid()))))));


--
-- Name: orders orders_courier_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_courier_update ON public.orders FOR UPDATE TO authenticated USING (((courier_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.couriers c
  WHERE ((c.id = orders.courier_id) AND (c.user_id = auth.uid())))))) WITH CHECK (((courier_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.couriers c
  WHERE ((c.id = orders.courier_id) AND (c.user_id = auth.uid()))))));


--
-- Name: orders orders_customer_insert_online; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_customer_insert_online ON public.orders FOR INSERT TO authenticated WITH CHECK (((channel = 'online'::public.order_channel) AND (customer_user_id = auth.uid()) AND ((status)::text = 'pending'::text)));


--
-- Name: orders orders_customer_pay_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_customer_pay_update ON public.orders FOR UPDATE TO authenticated USING (((customer_user_id = auth.uid()) AND (channel = 'online'::public.order_channel) AND ((status)::text = 'pending'::text))) WITH CHECK (((customer_user_id = auth.uid()) AND (channel = 'online'::public.order_channel)));


--
-- Name: orders orders_customer_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_customer_self_read ON public.orders FOR SELECT TO authenticated USING ((customer_user_id = auth.uid()));


--
-- Name: outlet_couriers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outlet_couriers ENABLE ROW LEVEL SECURITY;

--
-- Name: outlets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

--
-- Name: outlets outlets_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outlets_owner_all ON public.outlets TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = outlets.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = outlets.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: outlets outlets_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outlets_public_read_active ON public.outlets FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = outlets.shop_id) AND (s.is_active = true))))));


--
-- Name: outlets outlets_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outlets_staff_read ON public.outlets FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND ((r.outlet_id = outlets.id) OR (r.shop_id = outlets.shop_id))))));


--
-- Name: custom_order_quotes owner_all_custom_order_quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_custom_order_quotes ON public.custom_order_quotes TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: fnb_combos owner_all_fnb_combos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_fnb_combos ON public.fnb_combos USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: freelance_contracts owner_all_freelance_contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_freelance_contracts ON public.freelance_contracts USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: job_deliverables owner_all_job_deliverables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_job_deliverables ON public.job_deliverables TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: patient_records owner_all_patient_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_patient_records ON public.patient_records TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: patient_visits owner_all_patient_visits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_patient_visits ON public.patient_visits TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_portfolio owner_all_portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_portfolio ON public.shop_portfolio USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: rental_bookings owner_all_rental_bookings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_rental_bookings ON public.rental_bookings USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: rental_units owner_all_rental_units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_rental_units ON public.rental_units USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_size_charts owner_all_size_charts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_size_charts ON public.shop_size_charts USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_locations owner_all_studio_locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_studio_locations ON public.studio_locations TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_packages owner_all_studio_packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_all_studio_packages ON public.studio_packages USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: withdrawal_requests owner_create_withdrawal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_create_withdrawal ON public.withdrawal_requests FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = withdrawal_requests.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: custom_order_requests owner_delete_custom_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_delete_custom_order ON public.custom_order_requests FOR DELETE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: custom_order_status_history owner_insert_cor_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_cor_history ON public.custom_order_status_history FOR INSERT WITH CHECK ((request_id IN ( SELECT cor.id
   FROM (public.custom_order_requests cor
     JOIN public.shops cs ON ((cs.id = cor.shop_id)))
  WHERE (cs.owner_id = auth.uid()))));


--
-- Name: shop_chat_messages owner_insert_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_insert_messages ON public.shop_chat_messages FOR INSERT WITH CHECK (((sender_role = 'seller'::text) AND (sender_id = auth.uid()) AND (shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))));


--
-- Name: expiry_reminder_shop_rules owner_manage_own_shop_reminder_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_manage_own_shop_reminder_rules ON public.expiry_reminder_shop_rules TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_rules.shop_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_rules.shop_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: expiry_reminder_shop_settings owner_manage_own_shop_reminder_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_manage_own_shop_reminder_settings ON public.expiry_reminder_shop_settings TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_settings.shop_id) AND (cs.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops cs
  WHERE ((cs.id = expiry_reminder_shop_settings.shop_id) AND (cs.owner_id = auth.uid())))));


--
-- Name: wallet_topup_presets owner_manage_presets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_manage_presets ON public.wallet_topup_presets USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topup_presets.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topup_presets.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_membership_tiers owner_manage_tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_manage_tiers ON public.shop_membership_tiers USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_membership_tiers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_membership_tiers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: owner_notifications owner_notif_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_notif_owner_read ON public.owner_notifications FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = owner_notifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: owner_notifications owner_notif_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_notif_owner_update ON public.owner_notifications FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = owner_notifications.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = owner_notifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: owner_notifications owner_notif_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_notif_super_admin_all ON public.owner_notifications TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: owner_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.owner_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_order_status_history owner_read_cor_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_read_cor_history ON public.custom_order_status_history FOR SELECT USING ((request_id IN ( SELECT cor.id
   FROM (public.custom_order_requests cor
     JOIN public.shops cs ON ((cs.id = cor.shop_id)))
  WHERE (cs.owner_id = auth.uid()))));


--
-- Name: custom_order_requests owner_read_custom_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_read_custom_order ON public.custom_order_requests FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_reviews owner_reply_review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_reply_review ON public.product_reviews FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_reviews.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_chat_messages owner_select_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_messages ON public.shop_chat_messages FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_chats owner_select_shop_chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_select_shop_chat ON public.shop_chats FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: custom_order_requests owner_update_custom_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_custom_order ON public.custom_order_requests FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
