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
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_chat_messages owner_update_messages_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_messages_read ON public.shop_chat_messages FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_chats owner_update_shop_chat; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_update_shop_chat ON public.shop_chats FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: shop_wallets owner_view_wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_view_wallet ON public.shop_wallets FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_wallets.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: wallet_transactions owner_view_wallet_txn; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_view_wallet_txn ON public.wallet_transactions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_transactions.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: withdrawal_requests owner_view_withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_view_withdrawals ON public.withdrawal_requests FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = withdrawal_requests.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: page_layout_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_layout_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: page_layouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_layouts ENABLE ROW LEVEL SECURITY;

--
-- Name: page_layouts page_layouts_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY page_layouts_owner_all ON public.page_layouts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layouts.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = page_layouts.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: page_layouts page_layouts_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY page_layouts_public_read ON public.page_layouts FOR SELECT USING ((is_published = true));


--
-- Name: parked_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parked_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

--
-- Name: patient_visits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_photographers photographers_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY photographers_owner_all ON public.studio_photographers TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: studio_photographers photographers_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY photographers_staff_read ON public.studio_photographers FOR SELECT TO authenticated USING ((shop_id IN ( SELECT staff_members.shop_id
   FROM public.staff_members
  WHERE ((staff_members.user_id = auth.uid()) AND (staff_members.is_active = true)))));


--
-- Name: plan_features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_features plan_features_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_features_public_read ON public.plan_features FOR SELECT USING (true);


--
-- Name: plan_features plan_features_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_features_super_admin_write ON public.plan_features TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: plan_invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_invoices plan_invoices_owner_cancel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_invoices_owner_cancel ON public.plan_invoices FOR UPDATE USING (((status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))))) WITH CHECK (((status = ANY (ARRAY['pending'::text, 'cancelled'::text])) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: plan_invoices plan_invoices_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_invoices_owner_insert ON public.plan_invoices FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: plan_invoices plan_invoices_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_invoices_owner_select ON public.plan_invoices FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: plan_invoices plan_invoices_owner_update_proof; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_invoices_owner_update_proof ON public.plan_invoices FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))) AND (status = ANY (ARRAY['pending'::text, 'awaiting_review'::text])))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = plan_invoices.shop_id) AND (s.owner_id = auth.uid())))) AND (status = ANY (ARRAY['pending'::text, 'awaiting_review'::text]))));


--
-- Name: plan_invoices plan_invoices_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_invoices_super_admin_all ON public.plan_invoices TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: plan_subscriptions plan_subs_owner_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_subs_owner_modify ON public.plan_subscriptions TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: plan_subscriptions plan_subs_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_subs_owner_read ON public.plan_subscriptions FOR SELECT TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: plan_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_themes ENABLE ROW LEVEL SECURITY;

--
-- Name: plan_themes plan_themes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_themes_public_read ON public.plan_themes FOR SELECT USING (true);


--
-- Name: plan_themes plan_themes_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plan_themes_super_admin_write ON public.plan_themes TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

--
-- Name: plans plans_read_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_read_all ON public.plans FOR SELECT TO authenticated USING (true);


--
-- Name: plans plans_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_super_admin_write ON public.plans TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings platform_settings_public_branding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_settings_public_branding ON public.platform_settings FOR SELECT USING ((key = ANY (ARRAY['platform_name'::text, 'platform_logo_url'::text, 'platform_tagline'::text, 'platform_primary_color'::text])));


--
-- Name: platform_settings platform_settings_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_settings_super_admin_all ON public.platform_settings TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: platform_voucher_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_voucher_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_vouchers platform_vouchers_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_vouchers_admin_all ON public.platform_vouchers TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: platform_vouchers platform_vouchers_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_vouchers_public_read ON public.platform_vouchers FOR SELECT USING (((is_active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((expires_at IS NULL) OR (expires_at >= now()))));


--
-- Name: po_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.po_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders po_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY po_owner_all ON public.purchase_orders TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = purchase_orders.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = purchase_orders.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: purchase_orders po_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY po_staff_read ON public.purchase_orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = purchase_orders.shop_id)))));


--
-- Name: purchase_order_items poi_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY poi_owner_all ON public.purchase_order_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.purchase_orders po
     JOIN public.shops s ON ((s.id = po.shop_id)))
  WHERE ((po.id = purchase_order_items.po_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.purchase_orders po
     JOIN public.shops s ON ((s.id = po.shop_id)))
  WHERE ((po.id = purchase_order_items.po_id) AND (s.owner_id = auth.uid())))));


--
-- Name: purchase_order_items poi_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY poi_staff_read ON public.purchase_order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.purchase_orders po
     JOIN public.user_roles r ON ((r.shop_id = po.shop_id)))
  WHERE ((po.id = purchase_order_items.po_id) AND (r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: pos_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pos_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: pos_audit_log pos_audit_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pos_audit_owner_all ON public.pos_audit_log TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = pos_audit_log.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = pos_audit_log.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: pos_audit_log pos_audit_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pos_audit_staff_insert ON public.pos_audit_log FOR INSERT TO authenticated WITH CHECK ((cashier_id = auth.uid()));


--
-- Name: pos_audit_log pos_audit_staff_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pos_audit_staff_read_own ON public.pos_audit_log FOR SELECT TO authenticated USING ((cashier_id = auth.uid()));


--
-- Name: user_preferences prefs_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prefs_select_own ON public.user_preferences FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_preferences prefs_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prefs_update_own ON public.user_preferences FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_preferences prefs_upsert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prefs_upsert_own ON public.user_preferences FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: prescription_items presc_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presc_items_owner_all ON public.prescription_items TO authenticated USING ((prescription_id IN ( SELECT p.id
   FROM (public.prescriptions p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid())))) WITH CHECK ((prescription_id IN ( SELECT p.id
   FROM (public.prescriptions p
     JOIN public.shops s ON ((s.id = p.shop_id)))
  WHERE (s.owner_id = auth.uid()))));


--
-- Name: prescription_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions prescriptions_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prescriptions_owner_all ON public.prescriptions TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: printers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_attribute_defs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_attribute_defs ENABLE ROW LEVEL SECURITY;

--
-- Name: product_qa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;

--
-- Name: product_returns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: product_upsell_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_upsell_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_owner_read_staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_owner_read_staff ON public.profiles FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.user_roles r
     JOIN public.shops s ON ((s.id = r.shop_id)))
  WHERE ((r.user_id = profiles.id) AND (s.owner_id = auth.uid())))));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: promo_redemptions promo_red_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promo_red_insert ON public.promo_redemptions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = promo_redemptions.order_id) AND (public.has_outlet_access(auth.uid(), o.outlet_id) OR (o.customer_user_id = auth.uid()))))));


--
-- Name: promo_redemptions promo_red_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promo_red_owner_read ON public.promo_redemptions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promo_redemptions.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: promo_redemptions promo_red_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promo_red_self_read ON public.promo_redemptions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: promo_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: promos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;

--
-- Name: promos promos_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promos_owner_all ON public.promos TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promos.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promos.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: promos promos_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promos_public_read ON public.promos FOR SELECT USING (((is_active = true) AND (channel = ANY (ARRAY['online'::public.promo_channel, 'all'::public.promo_channel])) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = promos.shop_id) AND (s.is_active = true))))));


--
-- Name: promos promos_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY promos_staff_read ON public.promos FOR SELECT TO authenticated USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = promos.shop_id))))));


--
-- Name: outlet_couriers public read active outlet couriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read active outlet couriers" ON public.outlet_couriers FOR SELECT TO authenticated, anon USING ((is_active = true));


--
-- Name: travel_itineraries public read itineraries of active packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read itineraries of active packages" ON public.travel_itineraries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.umroh_packages p
  WHERE ((p.id = travel_itineraries.package_id) AND (p.is_active = true)))));


--
-- Name: course_certificates public verify cert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public verify cert" ON public.course_certificates FOR SELECT USING (true);


--
-- Name: custom_order_requests public_insert_custom_order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_insert_custom_order ON public.custom_order_requests FOR INSERT WITH CHECK (true);


--
-- Name: rental_bookings public_insert_rental_booking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_insert_rental_booking ON public.rental_bookings FOR INSERT WITH CHECK (true);


--
-- Name: freelance_contracts public_read_contract_by_token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_contract_by_token ON public.freelance_contracts FOR SELECT TO authenticated, anon USING ((sign_token IS NOT NULL));


--
-- Name: custom_order_quotes public_read_custom_order_quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_custom_order_quotes ON public.custom_order_quotes FOR SELECT USING ((status = ANY (ARRAY['sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])));


--
-- Name: fnb_combos public_read_fnb_combos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_fnb_combos ON public.fnb_combos FOR SELECT USING ((is_active = true));


--
-- Name: job_deliverables public_read_job_deliverables_by_token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_job_deliverables_by_token ON public.job_deliverables FOR SELECT USING ((status = ANY (ARRAY['sent'::text, 'received'::text, 'revision'::text, 'completed'::text])));


--
-- Name: shop_portfolio public_read_portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_portfolio ON public.shop_portfolio FOR SELECT USING (true);


--
-- Name: rental_units public_read_rental_units; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_rental_units ON public.rental_units FOR SELECT USING ((is_active = true));


--
-- Name: shop_size_charts public_read_size_charts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_size_charts ON public.shop_size_charts FOR SELECT USING ((is_active = true));


--
-- Name: studio_locations public_read_studio_locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_studio_locations ON public.studio_locations FOR SELECT USING ((is_active = true));


--
-- Name: studio_packages public_read_studio_packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_read_studio_packages ON public.studio_packages FOR SELECT USING ((is_active = true));


--
-- Name: freelance_contracts public_sign_contract; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_sign_contract ON public.freelance_contracts FOR UPDATE TO authenticated, anon USING (((sign_token IS NOT NULL) AND (status = ANY (ARRAY['draft'::text, 'sent'::text])))) WITH CHECK ((status = 'signed'::text));


--
-- Name: product_reviews public_view_reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_view_reviews ON public.product_reviews FOR SELECT USING ((NOT is_hidden));


--
-- Name: purchase_order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_voucher_redemptions pvr_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pvr_owner_read ON public.platform_voucher_redemptions FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: product_qa qa_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_owner_delete ON public.product_qa FOR DELETE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_qa qa_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_owner_read ON public.product_qa FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_qa qa_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_owner_update ON public.product_qa FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: product_qa qa_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_public_read ON public.product_qa FOR SELECT USING ((is_hidden = false));


--
-- Name: product_qa qa_user_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_user_insert ON public.product_qa FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: product_qa qa_user_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qa_user_read_own ON public.product_qa FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: recipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

--
-- Name: recipes recipes_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recipes_owner_all ON public.recipes TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.menu_items m
     JOIN public.shops s ON ((s.id = m.shop_id)))
  WHERE ((m.id = recipes.menu_item_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.menu_items m
     JOIN public.shops s ON ((s.id = m.shop_id)))
  WHERE ((m.id = recipes.menu_item_id) AND (s.owner_id = auth.uid())))));


--
-- Name: recipes recipes_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY recipes_staff_read ON public.recipes FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.menu_items m
     JOIN public.user_roles r ON ((r.shop_id = m.shop_id)))
  WHERE ((m.id = recipes.menu_item_id) AND (r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: refunds refunds_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY refunds_owner_all ON public.refunds TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = refunds.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = refunds.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: refunds refunds_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY refunds_staff_read ON public.refunds FOR SELECT TO authenticated USING (public.has_outlet_access(auth.uid(), outlet_id));


--
-- Name: rental_bookings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_inspections rental_insp_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rental_insp_owner_all ON public.rental_inspections TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: rental_inspections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rental_inspections ENABLE ROW LEVEL SECURITY;

--
-- Name: rental_units; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;

--
-- Name: booking_reschedule_tokens reschedule_tokens_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reschedule_tokens_public_read ON public.booking_reschedule_tokens FOR SELECT USING (((used_at IS NULL) AND (expires_at > now())));


--
-- Name: restock_subscribers restock_sub_insert_anyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restock_sub_insert_anyone ON public.restock_subscribers FOR INSERT WITH CHECK (true);


--
-- Name: restock_subscribers restock_sub_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restock_sub_owner_delete ON public.restock_subscribers FOR DELETE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: restock_subscribers restock_sub_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restock_sub_owner_select ON public.restock_subscribers FOR SELECT USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: restock_subscribers restock_sub_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY restock_sub_owner_update ON public.restock_subscribers FOR UPDATE USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: restock_subscribers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.restock_subscribers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_returns returns_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY returns_owner_all ON public.product_returns TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: booking_reviews review_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_insert_owner ON public.booking_reviews FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));


--
-- Name: booking_reviews review_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_owner_update ON public.booking_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: booking_reviews review_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_public_read ON public.booking_reviews FOR SELECT USING (true);


--
-- Name: booking_review_requests rrq_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rrq_insert ON public.booking_review_requests FOR INSERT WITH CHECK (true);


--
-- Name: booking_review_requests rrq_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rrq_read ON public.booking_review_requests FOR SELECT USING (true);


--
-- Name: booking_review_requests rrq_update_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rrq_update_scoped ON public.booking_review_requests FOR UPDATE TO authenticated USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = ( SELECT b.shop_id
           FROM public.bookings b
          WHERE (b.id = booking_review_requests.id))) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: sales_offerings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales_offerings ENABLE ROW LEVEL SECURITY;

--
-- Name: sales_offerings sales_offerings owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sales_offerings owner all" ON public.sales_offerings USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = sales_offerings.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = sales_offerings.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: sales_offerings sales_offerings public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sales_offerings public read" ON public.sales_offerings FOR SELECT USING (true);


--
-- Name: service_bundle_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_bundle_items ENABLE ROW LEVEL SECURITY;

--
-- Name: service_bundle_items service_bundle_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_bundle_items_owner_all ON public.service_bundle_items TO authenticated USING ((bundle_id IN ( SELECT service_bundles.id
   FROM public.service_bundles
  WHERE (service_bundles.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid())))))) WITH CHECK ((bundle_id IN ( SELECT service_bundles.id
   FROM public.service_bundles
  WHERE (service_bundles.shop_id IN ( SELECT shops.id
           FROM public.shops
          WHERE (shops.owner_id = auth.uid()))))));


--
-- Name: service_bundle_items service_bundle_items_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_bundle_items_public_read ON public.service_bundle_items FOR SELECT USING ((bundle_id IN ( SELECT service_bundles.id
   FROM public.service_bundles
  WHERE (service_bundles.is_active = true))));


--
-- Name: service_bundles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.service_bundles ENABLE ROW LEVEL SECURITY;

--
-- Name: service_bundles service_bundles_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_bundles_owner_all ON public.service_bundles TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: service_bundles service_bundles_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_bundles_public_read ON public.service_bundles FOR SELECT USING ((is_active = true));


--
-- Name: shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: shifts shifts_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shifts_owner_all ON public.shifts TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shifts.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shifts.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shifts shifts_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shifts_self_read ON public.shifts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: order_audit_log shop members insert order audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop members insert order audit" ON public.order_audit_log FOR INSERT TO authenticated WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: travel_itineraries shop members manage itineraries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop members manage itineraries" ON public.travel_itineraries USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_itineraries.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_itineraries.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: travel_jamaah_documents shop members manage jamaah docs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop members manage jamaah docs" ON public.travel_jamaah_documents USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_jamaah_documents.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = travel_jamaah_documents.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: outlet_couriers shop members manage outlet couriers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop members manage outlet couriers" ON public.outlet_couriers TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id)) WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: order_audit_log shop members read order audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop members read order audit" ON public.order_audit_log FOR SELECT TO authenticated USING (public.user_belongs_to_shop(auth.uid(), shop_id));


--
-- Name: course_certificates shop owner reads certs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop owner reads certs" ON public.course_certificates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = course_certificates.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_about; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_about ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_about shop_about owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop_about owner all" ON public.shop_about USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_about.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_about.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_about shop_about public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "shop_about public read" ON public.shop_about FOR SELECT USING (true);


--
-- Name: shop_backups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_backups ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_backups shop_backups_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_backups_owner_insert ON public.shop_backups FOR INSERT TO authenticated WITH CHECK (((requested_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_backups.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: shop_backups shop_backups_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_backups_owner_read ON public.shop_backups FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_backups.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: shop_backups shop_backups_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_backups_super_admin_write ON public.shop_backups TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: shop_chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_chats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_chats ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_customers shop_customers_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_customers_owner_all ON public.shop_customers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_customers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_customers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_customers shop_customers_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_customers_self_read ON public.shop_customers FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: shop_membership_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_membership_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_portfolio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_portfolio ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_size_charts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_size_charts ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_verifications shop_verifications_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_verifications_owner_insert ON public.shop_verifications FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_verifications shop_verifications_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_verifications_owner_read ON public.shop_verifications FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_verifications shop_verifications_owner_update_pending; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_verifications_owner_update_pending ON public.shop_verifications FOR UPDATE TO authenticated USING (((status = ANY (ARRAY['rejected'::text, 'expired'::text])) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = shop_verifications.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: shop_verifications shop_verifications_super_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shop_verifications_super_admin_all ON public.shop_verifications TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: shop_vouchers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_vouchers ENABLE ROW LEVEL SECURITY;

--
-- Name: shop_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shop_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: shops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

--
-- Name: shops shops_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shops_owner_all ON public.shops TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


--
-- Name: shops shops_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY shops_public_read_active ON public.shops FOR SELECT USING (((is_active = true) AND (suspended_at IS NULL)));


--
-- Name: booking_slots slots_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY slots_owner_all ON public.booking_slots USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_slots.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_slots.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: booking_slots slots_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY slots_public_read ON public.booking_slots FOR SELECT USING ((is_active = true));


--
-- Name: staff_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_invitations staff_inv_accept; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_inv_accept ON public.staff_invitations FOR UPDATE TO authenticated USING (((accepted_at IS NULL) AND (expires_at > now()) AND (lower(email) = lower((auth.jwt() ->> 'email'::text))))) WITH CHECK ((accepted_by = auth.uid()));


--
-- Name: staff_invitations staff_inv_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_inv_owner_all ON public.staff_invitations TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_invitations.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_invitations.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: staff_invitations staff_inv_token_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_inv_token_read ON public.staff_invitations FOR SELECT TO authenticated, anon USING (((accepted_at IS NULL) AND (expires_at > now())));


--
-- Name: staff_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_members staff_members_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_members_owner_all ON public.staff_members TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_members.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = staff_members.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: staff_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_movements stock_movements_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_movements_owner_all ON public.stock_movements TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_movements.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_movements.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: stock_movements stock_movements_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_movements_staff_read ON public.stock_movements FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = stock_movements.shop_id)))));


--
-- Name: stock_opname_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_opname_items stock_opname_items_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_opname_items_owner_all ON public.stock_opname_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.stock_opnames o
     JOIN public.shops s ON ((s.id = o.shop_id)))
  WHERE ((o.id = stock_opname_items.stock_opname_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.stock_opnames o
     JOIN public.shops s ON ((s.id = o.shop_id)))
  WHERE ((o.id = stock_opname_items.stock_opname_id) AND (s.owner_id = auth.uid())))));


--
-- Name: stock_opname_items stock_opname_items_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_opname_items_staff_read ON public.stock_opname_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.stock_opnames o
     JOIN public.user_roles r ON ((r.shop_id = o.shop_id)))
  WHERE ((o.id = stock_opname_items.stock_opname_id) AND (r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: stock_opnames; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_opnames ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_opnames stock_opnames_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_opnames_owner_all ON public.stock_opnames TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_opnames.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = stock_opnames.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: stock_opnames stock_opnames_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stock_opnames_staff_read ON public.stock_opnames FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.shop_id = stock_opnames.shop_id) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role]))))));


--
-- Name: course_certificates student reads own cert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "student reads own cert" ON public.course_certificates FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: studio_galleries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_galleries ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_gallery_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_gallery_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: studio_photographers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.studio_photographers ENABLE ROW LEVEL SECURITY;

--
-- Name: expiry_reminder_rules super_admin_all_expiry_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_expiry_rules ON public.expiry_reminder_rules TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: expiry_reminder_shop_rules super_admin_all_shop_reminder_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_shop_reminder_rules ON public.expiry_reminder_shop_rules TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: expiry_reminder_shop_settings super_admin_all_shop_reminder_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_shop_reminder_settings ON public.expiry_reminder_shop_settings TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers suppliers_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY suppliers_owner_all ON public.suppliers TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = suppliers.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = suppliers.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: suppliers suppliers_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY suppliers_staff_read ON public.suppliers FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = suppliers.shop_id)))));


--
-- Name: system_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: system_audit system_audit_super_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_audit_super_admin_read ON public.system_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: testimonials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

--
-- Name: testimonials testimonials owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "testimonials owner all" ON public.testimonials USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = testimonials.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = testimonials.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: testimonials testimonials public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "testimonials public read" ON public.testimonials FOR SELECT USING (true);


--
-- Name: themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

--
-- Name: themes themes_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY themes_public_read ON public.themes FOR SELECT USING (true);


--
-- Name: themes themes_super_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY themes_super_admin_write ON public.themes TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));


--
-- Name: travel_installments travel_inst_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_inst_owner_all ON public.travel_installments TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: travel_installments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_installments ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_itineraries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_itineraries ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_jamaah_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_jamaah_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_jamaah_manifest; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.travel_jamaah_manifest ENABLE ROW LEVEL SECURITY;

--
-- Name: travel_jamaah_manifest travel_manifest_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY travel_manifest_owner_all ON public.travel_jamaah_manifest TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: customer_treatments treatments_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treatments_owner_all ON public.customer_treatments TO authenticated USING ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid())))) WITH CHECK ((shop_id IN ( SELECT shops.id
   FROM public.shops
  WHERE (shops.owner_id = auth.uid()))));


--
-- Name: umroh_facilities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.umroh_facilities ENABLE ROW LEVEL SECURITY;

--
-- Name: umroh_facilities umroh_facilities owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "umroh_facilities owner all" ON public.umroh_facilities USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_facilities.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_facilities.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: umroh_facilities umroh_facilities public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "umroh_facilities public read" ON public.umroh_facilities FOR SELECT USING (true);


--
-- Name: umroh_faqs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.umroh_faqs ENABLE ROW LEVEL SECURITY;

--
-- Name: umroh_faqs umroh_faqs owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "umroh_faqs owner all" ON public.umroh_faqs USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_faqs.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_faqs.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: umroh_faqs umroh_faqs public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "umroh_faqs public read" ON public.umroh_faqs FOR SELECT USING (true);


--
-- Name: umroh_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.umroh_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: umroh_packages umroh_packages owner all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "umroh_packages owner all" ON public.umroh_packages USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_packages.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = umroh_packages.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: umroh_packages umroh_packages public read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "umroh_packages public read" ON public.umroh_packages FOR SELECT USING (true);


--
-- Name: product_upsell_suggestions upsell_owner_manage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upsell_owner_manage ON public.product_upsell_suggestions TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_upsell_suggestions.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = product_upsell_suggestions.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: product_upsell_suggestions upsell_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY upsell_public_read ON public.product_upsell_suggestions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: product_reviews user_create_review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_create_review ON public.product_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: product_reviews user_delete_own_review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_delete_own_review ON public.product_reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: marketplace_carts user_own_cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_own_cart ON public.marketplace_carts USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: marketplace_cart_items user_own_cart_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_own_cart_items ON public.marketplace_cart_items USING ((EXISTS ( SELECT 1
   FROM public.marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = auth.uid())))));


--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_owner_delete ON public.user_roles FOR DELETE TO authenticated USING (((shop_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = user_roles.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: user_roles user_roles_owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_owner_read ON public.user_roles FOR SELECT TO authenticated USING (((shop_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = user_roles.shop_id) AND (s.owner_id = auth.uid()))))));


--
-- Name: user_roles user_roles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: product_reviews user_update_own_review; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_update_own_review ON public.product_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: push_subscriptions users manage own push subs delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own push subs delete" ON public.push_subscriptions FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: push_subscriptions users manage own push subs insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own push subs insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: push_subscriptions users manage own push subs select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own push subs select" ON public.push_subscriptions FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: push_subscriptions users manage own push subs update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "users manage own push subs update" ON public.push_subscriptions FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications users_update_own_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_notifications ON public.notifications FOR UPDATE USING ((auth.uid() = recipient_user_id));


--
-- Name: notifications users_view_own_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_own_notifications ON public.notifications FOR SELECT USING ((auth.uid() = recipient_user_id));


--
-- Name: menu_item_variants variants_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_owner_all ON public.menu_item_variants USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_variants.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_variants.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: menu_item_variants variants_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_public_read ON public.menu_item_variants FOR SELECT USING (((is_available = true) AND (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = menu_item_variants.shop_id) AND (s.is_active = true))))));


--
-- Name: menu_item_variants variants_staff_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY variants_staff_read ON public.menu_item_variants FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles r
  WHERE ((r.user_id = auth.uid()) AND (r.role = ANY (ARRAY['cashier'::public.app_role, 'barista'::public.app_role])) AND (r.shop_id = menu_item_variants.shop_id)))));


--
-- Name: wallet_topups view_own_topups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_own_topups ON public.wallet_topups FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = wallet_topups.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: customer_wallet_transactions view_own_wallet_tx; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_own_wallet_tx ON public.customer_wallet_transactions FOR SELECT USING (((customer_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = customer_wallet_transactions.shop_id) AND (s.owner_id = auth.uid())))) OR public.has_role(auth.uid(), 'super_admin'::public.app_role)));


--
-- Name: booking_waitlist waitlist_customer_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY waitlist_customer_select ON public.booking_waitlist FOR SELECT USING ((auth.uid() = customer_user_id));


--
-- Name: booking_waitlist waitlist_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY waitlist_owner_all ON public.booking_waitlist USING ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_waitlist.shop_id) AND (s.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.shops s
  WHERE ((s.id = booking_waitlist.shop_id) AND (s.owner_id = auth.uid())))));


--
-- Name: booking_waitlist waitlist_public_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY waitlist_public_insert ON public.booking_waitlist FOR INSERT WITH CHECK (((auth.uid() = customer_user_id) OR (customer_user_id IS NULL)));


--
-- Name: booking_waitlist waitlist_public_read_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY waitlist_public_read_anon ON public.booking_waitlist FOR SELECT USING (true);


--
-- Name: wallet_topup_presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_topup_presets ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_topups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events webhook_events_no_client_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_events_no_client_read ON public.webhook_events FOR SELECT TO authenticated, anon USING (false);


--
-- Name: wishlists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('admin-banners', 'admin-banners', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('builder-assets', 'builder-assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('chat-attachments', 'chat-attachments', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('contract-signatures', 'contract-signatures', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('custom-order-attachments', 'custom-order-attachments', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('customer-exports', 'customer-exports', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('delivery-proofs', 'delivery-proofs', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('flyers', 'flyers', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('menu-images', 'menu-images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('payment-proofs', 'payment-proofs', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('platform-assets', 'platform-assets', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('rental-inspections', 'rental-inspections', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('review-photos', 'review-photos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-backups', 'shop-backups', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-images', 'shop-images', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-logos', 'shop-logos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('shop-verifications', 'shop-verifications', false, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('staff-avatars', 'staff-avatars', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('studio-galleries', 'studio-galleries', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('studio-watermarks', 'studio-watermarks', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('treatment-photos', 'treatment-photos', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('umroh-brochures', 'umroh-brochures', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('umroh-covers', 'umroh-covers', true, NULL, NULL) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES (69 policies on storage.objects)
-- ============================================================
CREATE POLICY "Authenticated users can delete staff avatars" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((bucket_id = 'staff-avatars'::text));
CREATE POLICY "Authenticated users can update staff avatars" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((bucket_id = 'staff-avatars'::text));
CREATE POLICY "Authenticated users can upload staff avatars" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((bucket_id = 'staff-avatars'::text));
CREATE POLICY "Shop owners delete builder assets" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'builder-assets'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
CREATE POLICY "Shop owners update builder assets" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((bucket_id = 'builder-assets'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
CREATE POLICY "Shop owners upload builder assets" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'builder-assets'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'chat-attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "Users can upload their own chat attachments" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'chat-attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "admin-banners admin delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])) AND has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "admin-banners admin update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])) AND has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "admin-banners admin write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])) AND has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "admin-banners public read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = ANY (ARRAY['admin-banners'::text, 'platform-assets'::text])));
CREATE POLICY "brochures owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'umroh-brochures'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "brochures owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((bucket_id = 'umroh-brochures'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "brochures owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'umroh-brochures'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "custom_order_attach_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'custom-order-attachments'::text) AND (auth.role() = 'authenticated'::text)));
CREATE POLICY "customer_exports_bucket_self_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'customer-exports'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "customer_exports_bucket_self_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'customer-exports'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY "delivery_proofs_courier_upload" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'delivery-proofs'::text) AND (EXISTS ( SELECT 1
   FROM couriers c
  WHERE ((c.user_id = auth.uid()) AND (c.is_active = true))))));
CREATE POLICY "flyers owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'flyers'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "flyers owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO public
  USING (((bucket_id = 'flyers'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "flyers owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'flyers'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "menu_images_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'menu-images'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(s.name))[1]))))));
CREATE POLICY "menu_images_owner_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'menu-images'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(s.name))[1]))))));
CREATE POLICY "menu_images_owner_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'menu-images'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(s.name))[1]))))));
CREATE POLICY "owner delete rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'rental-inspections'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner delete studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'studio-galleries'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner delete treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'treatment-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner update rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'rental-inspections'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner update studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'studio-galleries'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner update treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'treatment-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner upload rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'rental-inspections'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner upload studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'studio-galleries'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "owner upload treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'treatment-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "payment_proofs_customer_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE (((o.id)::text = (storage.foldername(objects.name))[2]) AND ((o.shop_id)::text = (storage.foldername(objects.name))[1]) AND (o.customer_user_id = auth.uid()))))));
CREATE POLICY "payment_proofs_customer_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM orders o
  WHERE (((o.id)::text = (storage.foldername(objects.name))[2]) AND (o.customer_user_id = auth.uid()))))));
CREATE POLICY "payment_proofs_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO public
  USING (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(objects.name))[1]))))));
CREATE POLICY "payment_proofs_owner_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (((bucket_id = 'payment-proofs'::text) AND ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(objects.name))[1])))) OR has_role(auth.uid(), 'super_admin'::app_role))));
CREATE POLICY "payment_proofs_owner_write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO public
  WITH CHECK (((bucket_id = 'payment-proofs'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((s.id)::text = (storage.foldername(objects.name))[1]))))));
CREATE POLICY "payment_proofs_super_admin_all" ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (((bucket_id = 'payment-proofs'::text) AND has_role(auth.uid(), 'super_admin'::app_role)))
  WITH CHECK (((bucket_id = 'payment-proofs'::text) AND has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "public read rental-inspections" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'rental-inspections'::text));
CREATE POLICY "public read studio-galleries" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'studio-galleries'::text));
CREATE POLICY "public read treatment-photos" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'treatment-photos'::text));
CREATE POLICY "public_read_contract_signatures" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'contract-signatures'::text));
CREATE POLICY "public_upload_contract_signatures" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO anon,authenticated
  WITH CHECK ((bucket_id = 'contract-signatures'::text));
CREATE POLICY "review_photos_user_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "review_photos_user_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "review_photos_user_upload" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'review-photos'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
CREATE POLICY "shop-images owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'shop-images'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
CREATE POLICY "shop-images owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'shop-images'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
CREATE POLICY "shop-images owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-images'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
CREATE POLICY "shop-images public read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'shop-images'::text));
CREATE POLICY "shop_backups_bucket_owner_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-backups'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "shop_backups_bucket_owner_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'shop-backups'::text) AND ((EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid())))) OR has_role(auth.uid(), 'super_admin'::app_role))));
CREATE POLICY "shop_backups_bucket_super_admin_write" ON storage.objects
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (((bucket_id = 'shop-backups'::text) AND has_role(auth.uid(), 'super_admin'::app_role)))
  WITH CHECK (((bucket_id = 'shop-backups'::text) AND has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "shop_logos_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'shop-logos'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
CREATE POLICY "shop_logos_owner_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'shop-logos'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
CREATE POLICY "shop_logos_owner_write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-logos'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.owner_id = auth.uid()) AND ((storage.foldername(s.name))[1] = (s.id)::text))))));
CREATE POLICY "shop_verifications_storage_owner_insert" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'shop-verifications'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "shop_verifications_storage_owner_select" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'shop-verifications'::text) AND (EXISTS ( SELECT 1
   FROM shops s
  WHERE (((s.id)::text = (storage.foldername(s.name))[1]) AND (s.owner_id = auth.uid()))))));
CREATE POLICY "shop_verifications_storage_super_admin" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'shop-verifications'::text) AND has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "umroh-covers owner delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'umroh-covers'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
CREATE POLICY "umroh-covers owner update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'umroh-covers'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
CREATE POLICY "umroh-covers owner write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'umroh-covers'::text) AND is_shop_owner(((storage.foldername(name))[1])::uuid, auth.uid())));
CREATE POLICY "umroh-covers public read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'umroh-covers'::text));
CREATE POLICY "watermarks_owner_delete" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'studio-watermarks'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "watermarks_owner_update" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'studio-watermarks'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "watermarks_owner_write" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'studio-watermarks'::text) AND ((storage.foldername(name))[1] IN ( SELECT (shops.id)::text AS id
   FROM shops
  WHERE (shops.owner_id = auth.uid())))));
CREATE POLICY "watermarks_public_read" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((bucket_id = 'studio-watermarks'::text));

-- ============================================================
-- SECTION 3 — SEED DATA (reference tables)
-- ============================================================
-- ============================================================================
-- UMKMgo — FRESH BOOTSTRAP SCHEMA (consolidated from 126 migrations)
-- ============================================================================
-- Generated: 2026-05-18
-- Source: pg_dump --schema-only from production (single source of truth)
--
-- ⚠️  PERINGATAN — DO NOT APPLY TO EXISTING CLOUD INSTANCE
-- File ini hanya untuk bootstrap project Supabase BARU / fresh clone.
-- Cloud instance yang sekarang sudah berisi 126 migration history terapply.
-- Apply ulang akan konflik (tabel sudah ada).
--
-- Cara pakai (untuk project baru):
--   1. Buat project Supabase baru.
--   2. Pindah/hapus folder _archive_pre_consolidation jika perlu.
--   3. supabase db push (file ini akan jadi satu-satunya migrasi awal).
--
-- Isi:
--   - 15 enum, 115 function, 163 tabel, 119 trigger, 385 RLS policy
--   - 23 storage bucket + 69 storage policy
--   - Seed data untuk 10 tabel referensi (business_categories, plans, dll)
-- ============================================================================

-- ============================================================
-- SECTION 1 — SCHEMA (extensions, types, functions, tables, views, triggers, RLS policies)
-- ============================================================

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public; (already exists)


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'super_admin',
    'owner',
    'cashier',
    'barista',
    'customer',
    'manager',
    'courier',
    'pelayan',
    'gudang',
    'koki',
    'helper',
    'supervisor'
);


--
-- Name: cash_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.cash_movement_type AS ENUM (
    'in',
    'out',
    'sale',
    'refund',
    'opening',
    'closing'
);


--
-- Name: delivery_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.delivery_mode AS ENUM (
    'flat',
    'zone'
);


--
-- Name: fulfillment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fulfillment_type AS ENUM (
    'dine_in',
    'pickup',
    'delivery'
);


--
-- Name: order_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_channel AS ENUM (
    'pos',
    'online'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'completed',
    'voided',
    'refunded',
    'pending',
    'preparing',
    'ready',
    'delivering',
    'cancelled'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'qris',
    'manual_transfer',
    'cod'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'awaiting_verification',
    'paid',
    'refunded'
);


--
-- Name: po_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_status AS ENUM (
    'draft',
    'ordered',
    'received',
    'cancelled'
);


--
-- Name: promo_channel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promo_channel AS ENUM (
    'pos',
    'online',
    'all'
);


--
-- Name: promo_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.promo_type AS ENUM (
    'percent',
    'nominal'
);


--
-- Name: shift_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_status AS ENUM (
    'open',
    'closed'
);


--
-- Name: stock_movement_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_movement_type AS ENUM (
    'purchase',
    'adjustment',
    'sale',
    'waste'
);


--
-- Name: wallet_txn_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_txn_type AS ENUM (
    'sale_pending',
    'sale_release',
    'commission',
    'withdrawal_hold',
    'withdrawal_paid',
    'withdrawal_refund',
    'refund',
    'adjustment'
);


--
-- Name: withdrawal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.withdrawal_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'paid',
    'cancelled'
);


--
-- Name: accept_staff_invitation(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_staff_invitation(_token text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_inv staff_invitations%ROWTYPE;
  v_email text;
BEGIN
  v_email := lower(coalesce((auth.jwt()->>'email'), ''));
  IF v_email = '' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_inv FROM public.staff_invitations
  WHERE token = _token AND accepted_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_or_expired';
  END IF;

  IF lower(v_inv.email) <> v_email THEN
    RAISE EXCEPTION 'email_mismatch';
  END IF;

  -- Create role row (idempotent on user_id+role+shop)
  INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id)
  VALUES (auth.uid(), v_inv.role, v_inv.shop_id, v_inv.outlet_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.staff_invitations
  SET accepted_at = now(), accepted_by = auth.uid()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('shop_id', v_inv.shop_id, 'role', v_inv.role);
END;
$$;


--
-- Name: admin_dashboard_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_dashboard_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
  month_start timestamptz := date_trunc('month', now());
  seven_days timestamptz := now() + interval '7 days';
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'shops', (SELECT count(*) FROM coffee_shops),
    'pro', (SELECT count(*) FROM coffee_shops WHERE plan = 'pro'),
    'pending', (SELECT count(*) FROM plan_invoices WHERE status = 'awaiting_review'),
    'mrr', COALESCE((SELECT sum(amount_idr) FROM plan_invoices WHERE status = 'paid' AND paid_at >= month_start), 0),
    'expiringSoon', (SELECT count(*) FROM coffee_shops WHERE plan = 'pro' AND plan_expires_at >= now() AND plan_expires_at <= seven_days),
    'domainOffline', (SELECT count(*) FROM coffee_shops WHERE custom_domain IS NOT NULL AND custom_domain_verified_at IS NULL),
    'suspended', (SELECT count(*) FROM coffee_shops WHERE suspended_at IS NOT NULL)
  ) INTO result;

  RETURN result;
END;
$$;


--
-- Name: admin_remove_plan_feature(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_remove_plan_feature(_plan_id uuid, _feature_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  DELETE FROM plan_features WHERE plan_id = _plan_id AND feature_key = _feature_key;
END; $$;


--
-- Name: admin_remove_plan_theme(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_remove_plan_theme(_plan_id uuid, _theme_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  DELETE FROM plan_themes WHERE plan_id = _plan_id AND theme_key = _theme_key;
END; $$;


--
-- Name: admin_set_shop_plan(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  old_plan text;
  old_exp timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _plan NOT IN ('free','pro') THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;

  SELECT plan, plan_expires_at INTO old_plan, old_exp FROM coffee_shops WHERE id = _shop_id;

  UPDATE coffee_shops
    SET plan = _plan,
        plan_expires_at = CASE WHEN _plan = 'pro' THEN _expires_at ELSE NULL END,
        updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('plan_manual_set', _shop_id, auth.uid(),
    jsonb_build_object('old_plan', old_plan, 'old_expires_at', old_exp, 'new_plan', _plan, 'new_expires_at', _expires_at),
    'super-admin manual override');
END;
$$;


--
-- Name: admin_shop_detail(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_shop_detail(_shop_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT jsonb_build_object(
    'shop', to_jsonb(s.*),
    'owner', jsonb_build_object(
      'id', s.owner_id,
      'display_name', p.display_name,
      'phone', p.phone
    ),
    'outlets_count', (SELECT count(*) FROM outlets WHERE shop_id = s.id),
    'orders_count', (SELECT count(*) FROM orders WHERE shop_id = s.id),
    'orders_30d', (SELECT count(*) FROM orders WHERE shop_id = s.id AND created_at >= now() - interval '30 days'),
    'menu_count', (SELECT count(*) FROM menu_items WHERE shop_id = s.id),
    'last_order_at', (SELECT max(created_at) FROM orders WHERE shop_id = s.id)
  ) INTO result
  FROM coffee_shops s
  LEFT JOIN profiles p ON p.id = s.owner_id
  WHERE s.id = _shop_id;

  RETURN result;
END;
$$;


--
-- Name: admin_suspend_shop(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_suspend_shop(_shop_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE coffee_shops
    SET suspended_at = now(), suspended_reason = _reason, is_active = false, updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('shop_suspended', _shop_id, auth.uid(), jsonb_build_object('reason', _reason), _reason);

  INSERT INTO owner_notifications (shop_id, type, severity, title, body, dedupe_key)
  VALUES (_shop_id, 'shop_suspended', 'error',
    'Toko Anda dinonaktifkan oleh admin',
    COALESCE(_reason, 'Hubungi admin untuk informasi lebih lanjut.'),
    'shop_suspended:' || to_char(now(), 'YYYY-MM-DD-HH24'))
  ON CONFLICT (shop_id, dedupe_key) DO NOTHING;
END;
$$;


--
-- Name: admin_unsuspend_shop(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_unsuspend_shop(_shop_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE coffee_shops
    SET suspended_at = NULL, suspended_reason = NULL, is_active = true, updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('shop_unsuspended', _shop_id, auth.uid(), '{}'::jsonb, NULL);
END;
$$;


--
-- Name: admin_upsert_feature(text, text, text, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_upsert_feature(_key text, _name text, _description text, _category text, _is_active boolean, _sort_order integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO features (key, name, description, category, is_active, sort_order)
  VALUES (_key, _name, _description, COALESCE(_category, 'general'), COALESCE(_is_active, true), COALESCE(_sort_order, 0))
  ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = now();
END; $$;


--
-- Name: admin_upsert_plan_feature(uuid, text, integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_upsert_plan_feature(_plan_id uuid, _feature_key text, _requires_min_months integer, _limit_value integer, _meta jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO plan_features (plan_id, feature_key, requires_min_months, limit_value, meta)
  VALUES (_plan_id, _feature_key, COALESCE(_requires_min_months, 0), _limit_value, COALESCE(_meta, '{}'::jsonb))
  ON CONFLICT (plan_id, feature_key) DO UPDATE
    SET requires_min_months = EXCLUDED.requires_min_months,
        limit_value = EXCLUDED.limit_value,
        meta = EXCLUDED.meta;
END; $$;


--
-- Name: admin_upsert_plan_theme(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_upsert_plan_theme(_plan_id uuid, _theme_key text, _requires_min_months integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO plan_themes (plan_id, theme_key, requires_min_months)
  VALUES (_plan_id, _theme_key, COALESCE(_requires_min_months, 0))
  ON CONFLICT (plan_id, theme_key) DO UPDATE
    SET requires_min_months = EXCLUDED.requires_min_months;
END; $$;


--
-- Name: admin_upsert_theme(text, text, text, text, text, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.admin_upsert_theme(_key text, _name text, _description text, _component_id text, _preview_image_url text, _tier_hint text, _is_active boolean, _sort_order integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  INSERT INTO themes (key, name, description, component_id, preview_image_url, tier_hint, is_active, sort_order)
  VALUES (_key, _name, _description, _component_id, _preview_image_url, _tier_hint, COALESCE(_is_active, true), COALESCE(_sort_order, 0))
  ON CONFLICT (key) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        component_id = EXCLUDED.component_id,
        preview_image_url = EXCLUDED.preview_image_url,
        tier_hint = EXCLUDED.tier_hint,
        is_active = EXCLUDED.is_active,
        sort_order = EXCLUDED.sort_order,
        updated_at = now();
END; $$;


--
-- Name: apply_loyalty_post_order(uuid, uuid, uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_loyalty_post_order(_shop_id uuid, _user_id uuid, _order_id uuid, _earned integer, _redeemed integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller uuid := auth.uid();
BEGIN
  IF _user_id IS NULL OR (_earned <= 0 AND _redeemed <= 0) THEN
    RETURN;
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;
  IF v_order.shop_id <> _shop_id THEN
    RAISE EXCEPTION 'shop_mismatch';
  END IF;

  -- Authorization: caller must be the customer of this order, or have outlet access (POS)
  IF NOT (
    (v_order.customer_user_id IS NOT NULL AND v_order.customer_user_id = v_caller AND v_caller = _user_id)
    OR public.has_outlet_access(v_caller, v_order.outlet_id)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Upsert balance
  INSERT INTO public.loyalty_points (shop_id, user_id, balance, total_earned, total_redeemed)
  VALUES (_shop_id, _user_id, GREATEST(_earned - _redeemed, 0), GREATEST(_earned, 0), GREATEST(_redeemed, 0))
  ON CONFLICT (shop_id, user_id) DO UPDATE
    SET balance = public.loyalty_points.balance + (_earned - _redeemed),
        total_earned = public.loyalty_points.total_earned + GREATEST(_earned, 0),
        total_redeemed = public.loyalty_points.total_redeemed + GREATEST(_redeemed, 0),
        updated_at = now();

  IF _earned > 0 THEN
    INSERT INTO public.loyalty_ledger (shop_id, user_id, order_id, delta, reason)
    VALUES (_shop_id, _user_id, _order_id, _earned, 'earn');
  END IF;
  IF _redeemed > 0 THEN
    INSERT INTO public.loyalty_ledger (shop_id, user_id, order_id, delta, reason)
    VALUES (_shop_id, _user_id, _order_id, -_redeemed, 'redeem');
  END IF;
END;
$$;


--
-- Name: apply_stock_movement(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.apply_stock_movement() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.type IN ('purchase','adjustment') THEN
    UPDATE public.ingredients SET current_stock = current_stock + NEW.quantity WHERE id = NEW.ingredient_id;
  ELSIF NEW.type IN ('sale','waste') THEN
    UPDATE public.ingredients SET current_stock = current_stock - NEW.quantity WHERE id = NEW.ingredient_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: approve_plan_invoice(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_plan_invoice(_invoice_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inv plan_invoices%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_new_expiry timestamptz;
  v_base timestamptz;
BEGIN
  IF NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_inv FROM plan_invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status = 'paid' THEN RAISE EXCEPTION 'already_paid'; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_inv.plan_id;

  -- Extend from current expiry if still active, else from now
  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO v_base
    FROM coffee_shops WHERE id = v_inv.shop_id;
  v_new_expiry := v_base + (v_plan.duration_days || ' days')::interval;

  UPDATE plan_invoices
    SET status = 'paid', paid_at = now(),
        reviewed_by = v_caller, reviewed_at = now(),
        updated_at = now()
    WHERE id = _invoice_id;

  UPDATE coffee_shops
    SET plan = 'pro', plan_expires_at = v_new_expiry, updated_at = now()
    WHERE id = v_inv.shop_id;

  RETURN jsonb_build_object('shop_id', v_inv.shop_id, 'plan_expires_at', v_new_expiry);
END;
$$;


--
-- Name: approve_wallet_topup(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_wallet_topup(_topup_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _topup RECORD;
  _wallet_id UUID;
  _new_balance NUMERIC(14,2);
  _is_owner BOOLEAN;
BEGIN
  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up tidak ditemukan'; END IF;
  IF _topup.status <> 'pending' THEN RAISE EXCEPTION 'Top-up sudah diproses (status: %)', _topup.status; END IF;

  SELECT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _topup.shop_id AND owner_id = auth.uid()) INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Get or create wallet
  SELECT id INTO _wallet_id FROM public.customer_wallets
    WHERE customer_user_id = _topup.customer_user_id AND shop_id = _topup.shop_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    INSERT INTO public.customer_wallets (customer_user_id, shop_id, balance, total_topped_up)
      VALUES (_topup.customer_user_id, _topup.shop_id, 0, 0)
      RETURNING id INTO _wallet_id;
  END IF;

  -- Credit topup amount
  UPDATE public.customer_wallets
    SET balance = balance + _topup.amount,
        total_topped_up = total_topped_up + _topup.amount
    WHERE id = _wallet_id
    RETURNING balance INTO _new_balance;

  INSERT INTO public.customer_wallet_transactions
    (wallet_id, customer_user_id, shop_id, type, amount, balance_after, ref_topup_id, note)
    VALUES (_wallet_id, _topup.customer_user_id, _topup.shop_id, 'topup', _topup.amount, _new_balance, _topup.id, 'Top-up disetujui');

  -- Credit bonus if any
  IF _topup.bonus_amount > 0 THEN
    UPDATE public.customer_wallets
      SET balance = balance + _topup.bonus_amount
      WHERE id = _wallet_id
      RETURNING balance INTO _new_balance;
    INSERT INTO public.customer_wallet_transactions
      (wallet_id, customer_user_id, shop_id, type, amount, balance_after, ref_topup_id, note)
      VALUES (_wallet_id, _topup.customer_user_id, _topup.shop_id, 'bonus', _topup.bonus_amount, _new_balance, _topup.id, 'Bonus top-up');
  END IF;

  UPDATE public.wallet_topups SET status = 'paid', paid_at = now() WHERE id = _topup.id;
  RETURN _wallet_id;
END;
$$;


--
-- Name: approve_withdrawal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.approve_withdrawal(_id uuid, _proof_url text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF w.status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE withdrawal_requests SET status='paid', proof_url=COALESCE(_proof_url,proof_url),
    reviewed_by=auth.uid(), reviewed_at=now(), paid_at=now(), updated_at=now()
    WHERE id=_id;

  UPDATE shop_wallets SET
    pending_balance = pending_balance - w.amount,
    total_withdrawn = total_withdrawn + w.amount,
    updated_at = now()
  WHERE shop_id = w.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (w.shop_id, 'withdrawal_paid', 0, _id, 'WD-'||substring(_id::text,1,8), 'Penarikan disetujui & dibayar', auth.uid());
END; $$;


--
-- Name: assign_courier_atomic(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_courier_atomic(_order_id uuid, _courier_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_courier couriers%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT * INTO v_courier FROM couriers WHERE id = _courier_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'courier_not_found'; END IF;

  -- Caller must be the courier's user OR have outlet access (owner/cashier assigning)
  IF NOT (
    v_courier.user_id = v_caller
    OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = v_courier.shop_id AND s.owner_id = v_caller)
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Lock the row to prevent double-claim
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;

  IF v_order.shop_id <> v_courier.shop_id THEN
    RAISE EXCEPTION 'shop_mismatch';
  END IF;

  IF v_order.courier_id IS NOT NULL AND v_order.courier_id <> _courier_id THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;

  IF v_order.status NOT IN ('ready', 'preparing') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE orders
    SET courier_id = _courier_id,
        updated_at = now()
    WHERE id = _order_id;

  RETURN jsonb_build_object('order_id', _order_id, 'courier_id', _courier_id);
END;
$$;


--
-- Name: auto_cancel_pending_deposit_bookings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_cancel_pending_deposit_bookings() RETURNS TABLE(cancelled_count integer, cutoff_hours integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cutoff_hours integer;
  v_cancelled integer := 0;
  v_booking record;
BEGIN
  -- Read window from platform_settings; fallback 24h
  SELECT COALESCE(NULLIF(value, '')::integer, 24)
    INTO v_cutoff_hours
  FROM public.platform_settings
  WHERE key = 'booking_auto_cancel_hours';

  IF v_cutoff_hours IS NULL THEN
    v_cutoff_hours := 24;
  END IF;

  -- Find candidates: pending booking with required-but-unpaid deposit, created longer than cutoff
  FOR v_booking IN
    SELECT id, shop_id, customer_name, customer_user_id, deposit_amount, created_at
    FROM public.bookings
    WHERE status = 'pending'
      AND deposit_required = true
      AND deposit_status = 'pending'
      AND created_at < (now() - make_interval(hours => v_cutoff_hours))
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.bookings
    SET status = 'cancelled',
        deposit_status = 'expired',
        cancelled_at = now(),
        cancelled_reason = 'auto_cancel_pending_dp',
        updated_at = now()
    WHERE id = v_booking.id;

    -- Audit log (actor_id NULL = system)
    INSERT INTO public.staff_audit_logs (shop_id, actor_id, target_user_id, target_name, action, meta)
    VALUES (
      v_booking.shop_id,
      NULL,
      v_booking.customer_user_id,
      v_booking.customer_name,
      'auto_cancel_pending_dp',
      jsonb_build_object(
        'booking_id', v_booking.id,
        'deposit_amount', v_booking.deposit_amount,
        'created_at', v_booking.created_at,
        'cutoff_hours', v_cutoff_hours
      )
    );

    v_cancelled := v_cancelled + 1;
  END LOOP;

  RETURN QUERY SELECT v_cancelled, v_cutoff_hours;
END;
$$;


--
-- Name: auto_release_escrow(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_release_escrow() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count int := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT o.id FROM orders o
    WHERE o.escrow_status = 'held'
      AND o.status = 'completed'
      AND o.delivered_at IS NOT NULL
      AND o.delivered_at < now() - interval '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM order_disputes d
        WHERE d.order_id = o.id AND d.status IN ('open','under_review')
      )
  LOOP
    PERFORM escrow_release_order(v_order.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('released', v_count);
END;
$$;


--
-- Name: auto_release_escrow_on_complete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_release_escrow_on_complete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.escrow_status = 'holding'
     AND NEW.status::text IN ('completed','delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_release_order(NEW.id);
  ELSIF NEW.escrow_status IN ('holding','released')
        AND NEW.status::text IN ('voided','cancelled')
        AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_refund_order(NEW.id, 'Order '||NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: auto_unverify_domain(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_unverify_domain(_shop_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.coffee_shops
    SET custom_domain_verified_at = NULL,
        last_dns_check_at = now(),
        updated_at = now()
    WHERE id = _shop_id;
  INSERT INTO public.domain_audit (shop_id, action, notes)
    VALUES (_shop_id, 'auto_unverify', COALESCE(_reason, 'dns recheck failed'));
END;
$$;


--
-- Name: booking_cancel_by_token(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.booking_cancel_by_token(_token uuid, _reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_booking bookings%ROWTYPE; v_slot_dt timestamptz;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE cancel_token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_booking.status IN ('cancelled','completed','no_show') THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_booking.status);
  END IF;

  SELECT (slot_date + slot_time)::timestamptz INTO v_slot_dt
    FROM booking_slots WHERE id = v_booking.slot_id;
  IF v_slot_dt < now() + interval '24 hours' THEN
    RAISE EXCEPTION 'too_late_to_cancel';
  END IF;

  UPDATE bookings
    SET status = 'cancelled', cancelled_at = now(), cancelled_reason = _reason, updated_at = now()
    WHERE id = v_booking.id;

  PERFORM create_notification(
    (SELECT owner_id FROM coffee_shops WHERE id = v_booking.shop_id),
    'booking_cancelled', 'Booking dibatalkan pelanggan',
    v_booking.customer_name || ' membatalkan booking',
    '/pos-app/booking', 'warning', v_booking.shop_id,
    'booking_cancelled:' || v_booking.id::text
  );
  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking.id);
END $$;


--
-- Name: bookings_fill_shop_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bookings_fill_shop_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    SELECT shop_id INTO NEW.shop_id FROM public.booking_slots WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: calc_attendance_duration(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calc_attendance_duration() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.duration_minutes := GREATEST(0, EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in))::int / 60);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: check_booking_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_booking_capacity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_capacity int;
  v_type text;
  v_booked int;
BEGIN
  -- Only validate active bookings
  IF NEW.status IN ('cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT capacity, booking_type INTO v_capacity, v_type
  FROM public.booking_slots WHERE id = NEW.slot_id;

  IF v_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(party_size), 0) INTO v_booked
  FROM public.bookings
  WHERE slot_id = NEW.slot_id
    AND status IN ('pending','confirmed','completed')
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF (v_booked + NEW.party_size) > v_capacity THEN
    IF v_type = 'table' THEN
      RAISE EXCEPTION 'Meja/area ini sudah dipesan pada waktu tersebut. Pilih slot lain.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'Slot ini sudah penuh. Pilih slot lain.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: close_shift(uuid, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.close_shift(_shift_id uuid, _closing_cash numeric, _note text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_shift cash_shifts%ROWTYPE;
  v_cash_sales numeric := 0;
  v_cash_in numeric := 0;
  v_cash_out numeric := 0;
  v_refunds numeric := 0;
  v_expected numeric;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_shift FROM public.cash_shifts WHERE id = _shift_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'shift_not_found'; END IF;
  IF v_shift.status = 'closed' THEN RAISE EXCEPTION 'shift_already_closed'; END IF;
  IF NOT public.has_outlet_access(v_caller, v_shift.outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Sum cash sales linked to this shift
  SELECT COALESCE(SUM(
    CASE
      WHEN o.payment_method = 'cash' THEN o.total
      WHEN jsonb_array_length(o.payment_split) > 0 THEN COALESCE((
        SELECT SUM((elem->>'amount')::numeric)
        FROM jsonb_array_elements(o.payment_split) elem
        WHERE elem->>'method' = 'cash'
      ), 0)
      ELSE 0
    END
  ), 0) INTO v_cash_sales
  FROM public.orders o
  WHERE o.shift_id = _shift_id AND o.status NOT IN ('voided','cancelled');

  SELECT COALESCE(SUM(amount),0) INTO v_cash_in
    FROM public.cash_movements WHERE shift_id = _shift_id AND type = 'in';
  SELECT COALESCE(SUM(amount),0) INTO v_cash_out
    FROM public.cash_movements WHERE shift_id = _shift_id AND type = 'out';
  SELECT COALESCE(SUM(amount),0) INTO v_refunds
    FROM public.cash_movements WHERE shift_id = _shift_id AND type = 'refund';

  v_expected := v_shift.opening_cash + v_cash_sales + v_cash_in - v_cash_out - v_refunds;

  UPDATE public.cash_shifts
    SET status = 'closed',
        closed_by = v_caller,
        closed_at = now(),
        closing_cash = COALESCE(_closing_cash, 0),
        expected_cash = v_expected,
        variance = COALESCE(_closing_cash, 0) - v_expected,
        note = COALESCE(_note, note),
        updated_at = now()
    WHERE id = _shift_id;

  INSERT INTO public.cash_movements (shift_id, type, amount, note, created_by)
  VALUES (_shift_id, 'closing', COALESCE(_closing_cash, 0), 'Tutup shift', v_caller);

  RETURN jsonb_build_object(
    'shift_id', _shift_id,
    'opening_cash', v_shift.opening_cash,
    'cash_sales', v_cash_sales,
    'cash_in', v_cash_in,
    'cash_out', v_cash_out,
    'refunds', v_refunds,
    'expected_cash', v_expected,
    'closing_cash', COALESCE(_closing_cash, 0),
    'variance', COALESCE(_closing_cash, 0) - v_expected
  );
END;
$$;


--
-- Name: compute_upsell_suggestions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_upsell_suggestions() RETURNS TABLE(processed_products integer, inserted_pairs integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_processed int := 0;
  v_inserted  int := 0;
BEGIN
  DELETE FROM public.product_upsell_suggestions
   WHERE source = 'auto' AND is_pinned = false;

  WITH recent_items AS (
    SELECT DISTINCT oi.order_id, oi.menu_item_id
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
     WHERE oi.menu_item_id IS NOT NULL
       AND o.created_at >= now() - INTERVAL '90 days'
       AND COALESCE(o.status::text, '') NOT IN ('cancelled','refunded','draft','pending')
  ),
  pairs AS (
    SELECT a.menu_item_id AS product_id,
           b.menu_item_id AS suggested_id,
           COUNT(*)::numeric AS score
      FROM recent_items a
      JOIN recent_items b ON a.order_id = b.order_id AND a.menu_item_id <> b.menu_item_id
     GROUP BY a.menu_item_id, b.menu_item_id
    HAVING COUNT(*) >= 2
  ),
  ranked AS (
    SELECT p.*,
           m1.shop_id AS product_shop,
           m2.shop_id AS suggested_shop,
           ROW_NUMBER() OVER (PARTITION BY p.product_id ORDER BY p.score DESC) AS rn
      FROM pairs p
      JOIN public.menu_items m1 ON m1.id = p.product_id   AND m1.is_available = true
      JOIN public.menu_items m2 ON m2.id = p.suggested_id AND m2.is_available = true
  ),
  filtered AS (
    SELECT * FROM ranked WHERE rn <= 6 AND product_shop = suggested_shop
  ),
  ins AS (
    INSERT INTO public.product_upsell_suggestions
           (shop_id, product_id, suggested_id, score, position, source)
    SELECT product_shop, product_id, suggested_id, score, rn::smallint, 'auto'
      FROM filtered
    ON CONFLICT (product_id, suggested_id) DO UPDATE
      SET score = EXCLUDED.score, position = EXCLUDED.position, updated_at = now()
    RETURNING 1
  )
  SELECT COUNT(DISTINCT product_id)::int, COUNT(*)::int FROM filtered
    INTO v_processed, v_inserted;

  RETURN QUERY SELECT v_processed, v_inserted;
END;
$$;


--
-- Name: consume_stock_for_order_item(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_stock_for_order_item() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_track boolean;
  v_shop uuid;
  rec RECORD;
BEGIN
  IF NEW.menu_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.track_stock, m.shop_id INTO v_track, v_shop
  FROM public.menu_items m WHERE m.id = NEW.menu_item_id;

  IF NOT COALESCE(v_track, false) THEN
    RETURN NEW;
  END IF;

  FOR rec IN
    SELECT ingredient_id, quantity FROM public.recipes WHERE menu_item_id = NEW.menu_item_id
  LOOP
    INSERT INTO public.stock_movements (shop_id, ingredient_id, type, quantity, note, order_id)
    VALUES (v_shop, rec.ingredient_id, 'sale', rec.quantity * NEW.quantity, 'Auto from order', NEW.order_id);
  END LOOP;

  RETURN NEW;
END;
$$;


--
-- Name: courier_mark_delivered(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.courier_mark_delivered(_order_id uuid, _proof_url text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders o
    JOIN couriers c ON c.id = o.courier_id
    WHERE o.id = _order_id AND c.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE orders
  SET status = 'completed'::order_status,
      delivery_proof_url = _proof_url,
      delivered_at = now(),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(_recipient uuid, _type text, _title text, _body text DEFAULT NULL::text, _link text DEFAULT NULL::text, _severity text DEFAULT 'info'::text, _shop_id uuid DEFAULT NULL::uuid, _dedupe_key text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id UUID;
BEGIN
  IF _recipient IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.notifications
    (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
  VALUES (_recipient, _shop_id, _type, _title, _body, _link, _severity, _dedupe_key)
  ON CONFLICT (recipient_user_id, dedupe_key) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: enforce_qr_table_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_qr_table_lock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only enforce on QR-table orders that remain QR-table.
  IF OLD.order_source = 'qr_table'
     AND NEW.order_source = 'qr_table'
     AND COALESCE(NEW.table_label, '') IS DISTINCT FROM COALESCE(OLD.table_label, '')
  THEN
    RAISE EXCEPTION
      'Meja terkunci untuk order QR. Batalkan QR (dengan alasan) terlebih dahulu.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ensure_shop_wallet(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_shop_wallet(_shop_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO public.shop_wallets (shop_id) VALUES (_shop_id)
  ON CONFLICT (shop_id) DO NOTHING;
$$;


--
-- Name: escrow_hold_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.escrow_hold_order(_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_rate NUMERIC(5,2);
  v_commission NUMERIC(14,2);
  v_net NUMERIC(14,2);
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status <> 'none' THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_order.escrow_status);
  END IF;

  -- Resolve commission rate: shop override > category > global default 5%
  SELECT COALESCE(
    (SELECT (value->>'rate')::numeric FROM platform_settings WHERE key = 'commission_shop_'||v_order.shop_id::text),
    (SELECT (value->>'rate')::numeric FROM platform_settings WHERE key = 'commission_default'),
    5
  ) INTO v_rate;

  v_commission := ROUND(v_order.total * v_rate / 100, 2);
  v_net := v_order.total - v_commission;

  PERFORM public.ensure_shop_wallet(v_order.shop_id);

  UPDATE orders SET
    commission_rate = v_rate,
    commission_amount = v_commission,
    net_to_shop = v_net,
    escrow_status = 'holding',
    updated_at = now()
  WHERE id = _order_id;

  UPDATE shop_wallets SET
    pending_balance = pending_balance + v_net,
    updated_at = now()
  WHERE shop_id = v_order.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'sale_pending', v_net, _order_id, v_order.order_no,
          'Escrow hold: total '||v_order.total||' - komisi '||v_commission);

  RETURN jsonb_build_object('order_id', _order_id, 'commission', v_commission, 'net', v_net);
END; $$;


--
-- Name: escrow_refund_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.escrow_refund_order(_order_id uuid, _reason text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status NOT IN ('holding','released') THEN
    RETURN jsonb_build_object('skipped', true);
  END IF;

  IF v_order.escrow_status = 'holding' THEN
    UPDATE shop_wallets SET pending_balance = pending_balance - v_order.net_to_shop, updated_at=now()
      WHERE shop_id = v_order.shop_id;
  ELSE
    UPDATE shop_wallets SET available_balance = available_balance - v_order.net_to_shop,
      total_earned = GREATEST(total_earned - v_order.net_to_shop, 0), updated_at=now()
      WHERE shop_id = v_order.shop_id;
  END IF;

  UPDATE orders SET escrow_status='refunded', updated_at=now() WHERE id=_order_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'refund', -v_order.net_to_shop, _order_id, v_order.order_no, COALESCE(_reason,'Refund'));

  RETURN jsonb_build_object('order_id', _order_id, 'refunded', v_order.net_to_shop);
END; $$;


--
-- Name: escrow_release_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.escrow_release_order(_order_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller UUID := auth.uid();
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF v_order.escrow_status <> 'holding' THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_order.escrow_status);
  END IF;

  IF NOT public.has_role(v_caller, 'super_admin')
     AND NOT EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = v_order.shop_id AND s.owner_id = v_caller) THEN
    -- allow trigger / system call (no auth.uid())
    IF v_caller IS NOT NULL THEN RAISE EXCEPTION 'not_authorized'; END IF;
  END IF;

  UPDATE shop_wallets SET
    pending_balance = pending_balance - v_order.net_to_shop,
    available_balance = available_balance + v_order.net_to_shop,
    total_earned = total_earned + v_order.net_to_shop,
    total_commission_paid = total_commission_paid + v_order.commission_amount,
    updated_at = now()
  WHERE shop_id = v_order.shop_id;

  UPDATE orders SET
    escrow_status = 'released',
    escrow_released_at = now(),
    updated_at = now()
  WHERE id = _order_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'sale_release', v_order.net_to_shop, _order_id, v_order.order_no, 'Dana cair ke saldo');

  INSERT INTO wallet_transactions (shop_id, type, amount, order_id, reference, notes)
  VALUES (v_order.shop_id, 'commission', -v_order.commission_amount, _order_id, v_order.order_no,
          'Komisi platform '||v_order.commission_rate||'%');

  RETURN jsonb_build_object('order_id', _order_id, 'released', v_order.net_to_shop);
END; $$;


--
-- Name: expire_overdue_plans(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_overdue_plans() RETURNS TABLE(shop_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH affected AS (
    UPDATE public.coffee_shops
      SET plan = 'free',
          custom_domain_verified_at = NULL,
          updated_at = now()
      WHERE plan = 'pro'
        AND plan_expires_at IS NOT NULL
        AND plan_expires_at < now()
      RETURNING id
  )
  SELECT id FROM affected;
END;
$$;


--
-- Name: expire_stale_pending_invoices(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_stale_pending_invoices() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  WITH upd AS (
    UPDATE public.plan_invoices
      SET status = 'expired', updated_at = now()
      WHERE status = 'pending'
        AND payment_proof_url IS NULL
        AND created_at < now() - INTERVAL '7 days'
      RETURNING id
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;


--
-- Name: fn_issue_course_certificate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_issue_course_certificate() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_course_id UUID;
  v_shop_id UUID;
  v_total INT;
  v_done INT;
BEGIN
  IF NEW.completed_at IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cm.menu_item_id, mi.shop_id
    INTO v_course_id, v_shop_id
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  JOIN public.menu_items mi ON mi.id = cm.menu_item_id
  WHERE cl.id = NEW.lesson_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_total
  FROM public.course_lessons cl
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.menu_item_id = v_course_id;

  SELECT COUNT(*) INTO v_done
  FROM public.lesson_progress lp
  JOIN public.course_lessons cl ON cl.id = lp.lesson_id
  JOIN public.course_modules cm ON cm.id = cl.module_id
  WHERE cm.menu_item_id = v_course_id
    AND lp.user_id = NEW.user_id
    AND lp.completed_at IS NOT NULL;

  IF v_total > 0 AND v_done >= v_total THEN
    INSERT INTO public.course_certificates (shop_id, course_id, user_id)
    VALUES (v_shop_id, v_course_id, NEW.user_id)
    ON CONFLICT (course_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_owner_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_owner_reminders() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_expiring int := 0;
  v_expired int := 0;
  v_invoice int := 0;
  v_domain int := 0;
BEGIN
  -- Plan expiring within 7 days (still pro)
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT s.id, 'plan_expiring',
           'Plan Pro akan berakhir',
           'Plan Pro Anda akan berakhir pada ' || to_char(s.plan_expires_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI'),
           '/app/billing', 'warning',
           'plan_expiring:' || to_char(s.plan_expires_at, 'YYYY-MM-DD')
    FROM coffee_shops s
    WHERE s.plan = 'pro'
      AND s.plan_expires_at IS NOT NULL
      AND s.plan_expires_at > now()
      AND s.plan_expires_at < now() + interval '7 days'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_expiring FROM ins;

  -- Plan expired (now free)
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT s.id, 'plan_expired',
           'Plan Pro telah berakhir',
           'Akun Anda otomatis turun ke Free. Custom domain dinonaktifkan sementara.',
           '/app/billing', 'danger',
           'plan_expired:' || to_char(COALESCE(s.plan_expires_at, now()), 'YYYY-MM-DD')
    FROM coffee_shops s
    WHERE s.plan = 'free'
      AND s.plan_expires_at IS NOT NULL
      AND s.plan_expires_at < now()
      AND s.plan_expires_at > now() - interval '14 days'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_expired FROM ins;

  -- Invoice pending > 2 days without proof
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT i.shop_id, 'invoice_pending',
           'Invoice menunggu pembayaran',
           'Invoice ' || i.invoice_no || ' sudah ' || extract(day from now() - i.created_at)::int || ' hari menunggu bukti pembayaran.',
           '/app/billing', 'warning',
           'invoice_pending:' || i.id::text
    FROM plan_invoices i
    WHERE i.status = 'pending'
      AND i.payment_proof_url IS NULL
      AND i.created_at < now() - interval '2 days'
      AND i.created_at > now() - interval '7 days'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_invoice FROM ins;

  -- Domain offline (was verified, now auto-unverified)
  WITH ins AS (
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    SELECT s.id, 'domain_offline',
           'Custom domain offline',
           'Domain ' || s.custom_domain || ' tidak lagi terdeteksi. Periksa pengaturan DNS Anda.',
           '/app/domain', 'danger',
           'domain_offline:' || s.custom_domain || ':' || to_char(s.last_dns_check_at, 'YYYY-MM-DD')
    FROM coffee_shops s
    WHERE s.custom_domain IS NOT NULL
      AND s.custom_domain_verified_at IS NULL
      AND s.last_dns_check_at IS NOT NULL
      AND s.last_dns_check_at > now() - interval '24 hours'
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING
    RETURNING 1
  ) SELECT count(*) INTO v_domain FROM ins;

  RETURN jsonb_build_object(
    'plan_expiring', v_expiring,
    'plan_expired', v_expired,
    'invoice_pending', v_invoice,
    'domain_offline', v_domain
  );
END;
$$;


--
-- Name: get_billing_settings_public(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_billing_settings_public() RETURNS TABLE(bank_name text, account_no text, account_name text, instructions text, qris_image_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT bank_name, account_no, account_name, instructions, qris_image_url
  FROM public.billing_settings
  WHERE id = 1
$$;


--
-- Name: get_customer_custom_orders(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_customer_custom_orders(p_shop_slug text, p_contact text) RETURNS TABLE(id uuid, shop_id uuid, product_id uuid, product_name text, customer_name text, description text, budget_min numeric, budget_max numeric, deadline date, reference_image_url text, status text, owner_note text, created_at timestamp with time zone, updated_at timestamp with time zone, history jsonb)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select cor.id, cor.shop_id, cor.product_id, mi.name as product_name,
         cor.customer_name, cor.description, cor.budget_min, cor.budget_max,
         cor.deadline, cor.reference_image_url, cor.status, cor.owner_note,
         cor.created_at, cor.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'from_status', h.from_status,
             'to_status', h.to_status,
             'note', h.note,
             'created_at', h.created_at
           ) order by h.created_at)
           from public.custom_order_status_history h
           where h.request_id = cor.id
         ), '[]'::jsonb) as history
  from public.custom_order_requests cor
  join public.coffee_shops cs on cs.id = cor.shop_id
  left join public.menu_items mi on mi.id = cor.product_id
  where cs.slug = p_shop_slug
    and regexp_replace(cor.customer_contact, '\D', '', 'g')
        = regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')) >= 6
  order by cor.created_at desc
  limit 50;
$$;


--
-- Name: get_marketplace_admin_daily(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_marketplace_admin_daily(_from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
    COALESCE(SUM(total), 0)::numeric AS gmv,
    COALESCE(SUM(commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM orders
  WHERE marketplace_order = true
    AND status NOT IN ('cancelled', 'pending')
    AND created_at >= _from
    AND created_at <= _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;


--
-- Name: get_marketplace_admin_stats(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_marketplace_admin_stats(_from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'gmv', COALESCE(SUM(total), 0),
    'commission', COALESCE(SUM(commission_amount), 0),
    'net_to_shops', COALESCE(SUM(net_to_shop), 0),
    'orders', COUNT(*),
    'aov', COALESCE(AVG(total), 0),
    'take_rate', CASE WHEN COALESCE(SUM(total),0) > 0
                      THEN ROUND((COALESCE(SUM(commission_amount),0) / SUM(total) * 100)::numeric, 2)
                      ELSE 0 END,
    'shops_active', COUNT(DISTINCT shop_id),
    'customers', COUNT(DISTINCT customer_user_id)
  )
  INTO v_result
  FROM orders
  WHERE marketplace_order = true
    AND status NOT IN ('cancelled', 'pending')
    AND created_at >= _from
    AND created_at <= _to;

  RETURN v_result;
END;
$$;


--
-- Name: get_marketplace_admin_top_shops(timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_marketplace_admin_top_shops(_from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10) RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.shop_id,
    s.name AS shop_name,
    COALESCE(SUM(o.total), 0)::numeric AS gmv,
    COALESCE(SUM(o.commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM orders o
  JOIN coffee_shops s ON s.id = o.shop_id
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY o.shop_id, s.name
  ORDER BY gmv DESC
  LIMIT _limit;
END;
$$;


--
-- Name: get_my_active_memberships(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_active_memberships(_shop_ids uuid[]) RETURNS TABLE(shop_id uuid, tier_id uuid, tier_name text, discount_percent numeric, expires_at timestamp with time zone)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT cm.shop_id, t.id, t.name, t.discount_percent, cm.expires_at
  FROM customer_memberships cm
  JOIN shop_membership_tiers t ON t.id = cm.tier_id
  WHERE cm.customer_user_id = auth.uid()
    AND cm.shop_id = ANY(_shop_ids)
    AND cm.status = 'active'
    AND cm.expires_at > now()
  ORDER BY t.discount_percent DESC;
$$;


--
-- Name: get_my_entitlements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_entitlements() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_theme_key text;
  v_plan_code text := 'basic';
  v_started timestamptz;
  v_months numeric := 0;
  v_themes jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT id, theme_key, plan_started_at INTO v_shop_id, v_theme_key, v_started
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;
  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'key', key,
    'name', name,
    'description', description,
    'preview_image_url', preview_image_url,
    'allowed', true,
    'reason', NULL,
    'component_id', component_id
  ) ORDER BY sort_order)
  INTO v_themes FROM public.themes WHERE is_active = true;
  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'months_active', v_months,
    'active_theme_key', COALESCE(v_theme_key, 'classic'),
    'features', '[]'::jsonb,
    'themes', COALESCE(v_themes, '[]'::jsonb)
  );
END $$;


--
-- Name: get_or_create_marketplace_cart(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_marketplace_cart() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cart_id UUID;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;
  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN
    INSERT INTO marketplace_carts (user_id) VALUES (_user_id) RETURNING id INTO _cart_id;
  END IF;
  RETURN _cart_id;
END;
$$;


--
-- Name: get_order_tracking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_order_tracking(_order_id uuid) RETURNS TABLE(id uuid, order_no text, status public.order_status, fulfillment public.fulfillment_type, channel public.order_channel, total numeric, delivery_fee numeric, delivery_address text, customer_name text, created_at timestamp with time zone, updated_at timestamp with time zone, shop_name text, shop_slug text, courier_name text, courier_phone text, courier_plate text, delivery_proof_url text, delivered_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    o.id, o.order_no, o.status, o.fulfillment, o.channel,
    o.total, o.delivery_fee, o.delivery_address, o.customer_name,
    o.created_at, o.updated_at,
    s.name, s.slug,
    c.name, c.phone, c.plate_number,
    o.delivery_proof_url, o.delivered_at
  FROM public.orders o
  JOIN public.coffee_shops s ON s.id = o.shop_id
  LEFT JOIN public.couriers c ON c.id = o.courier_id
  WHERE o.id = _order_id
    AND o.channel = 'online'
$$;


--
-- Name: get_profit_report(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profit_report(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_revenue numeric := 0;
  v_cogs numeric := 0;
  v_orders int := 0;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = v_caller)
     AND NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT
    COALESCE(SUM(o.subtotal - COALESCE(o.discount,0)), 0),
    COUNT(*)
  INTO v_revenue, v_orders
  FROM orders o
  WHERE o.shop_id = _shop_id
    AND o.created_at >= _from
    AND o.created_at < _to
    AND o.status NOT IN ('voided','cancelled');

  SELECT COALESCE(SUM(oi.quantity * r.quantity * COALESCE(i.cost_per_unit, 0)), 0)
  INTO v_cogs
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN recipes r ON r.menu_item_id = oi.menu_item_id
  JOIN ingredients i ON i.id = r.ingredient_id
  WHERE o.shop_id = _shop_id
    AND o.created_at >= _from
    AND o.created_at < _to
    AND o.status NOT IN ('voided','cancelled');

  RETURN jsonb_build_object(
    'revenue', v_revenue,
    'cogs', v_cogs,
    'gross_profit', v_revenue - v_cogs,
    'margin_percent', CASE WHEN v_revenue > 0 THEN ROUND((v_revenue - v_cogs) / v_revenue * 100, 2) ELSE 0 END,
    'orders', v_orders
  );
END;
$$;


--
-- Name: get_profit_report_daily(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profit_report_daily(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, revenue numeric, cogs numeric, gross_profit numeric, orders integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = v_caller)
     AND NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  RETURN QUERY
  WITH rev AS (
    SELECT o.business_date AS d,
           SUM(o.subtotal - COALESCE(o.discount,0)) AS rev,
           COUNT(*)::int AS ord
    FROM orders o
    WHERE o.shop_id = _shop_id
      AND o.created_at >= _from AND o.created_at < _to
      AND o.status NOT IN ('voided','cancelled')
    GROUP BY o.business_date
  ),
  cogs AS (
    SELECT o.business_date AS d,
           SUM(oi.quantity * r.quantity * COALESCE(i.cost_per_unit, 0)) AS c
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN recipes r ON r.menu_item_id = oi.menu_item_id
    JOIN ingredients i ON i.id = r.ingredient_id
    WHERE o.shop_id = _shop_id
      AND o.created_at >= _from AND o.created_at < _to
      AND o.status NOT IN ('voided','cancelled')
    GROUP BY o.business_date
  )
  SELECT rev.d, COALESCE(rev.rev,0), COALESCE(cogs.c,0),
         COALESCE(rev.rev,0) - COALESCE(cogs.c,0), COALESCE(rev.ord,0)
  FROM rev FULL OUTER JOIN cogs ON cogs.d = rev.d
  ORDER BY rev.d;
END;
$$;


--
-- Name: get_shop_entitlements(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_shop_entitlements(_shop_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_shop coffee_shops%ROWTYPE;
  v_plan_code text;
  v_effective_plan_id uuid;
  v_months_active numeric;
  v_features jsonb;
  v_themes jsonb;
BEGIN
  SELECT * INTO v_shop FROM coffee_shops WHERE id = _shop_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'shop_not_found');
  END IF;

  -- Resolve effective plan: kalau pro/pro_plus expired → fallback ke basic
  v_plan_code := v_shop.plan;
  IF v_shop.plan_expires_at IS NOT NULL AND v_shop.plan_expires_at < now() THEN
    v_plan_code := 'basic';
  END IF;
  IF v_plan_code IN ('free', 'basic') THEN
    v_plan_code := 'basic';
  END IF;

  SELECT id INTO v_effective_plan_id FROM plans WHERE code = v_plan_code;
  IF v_effective_plan_id IS NULL THEN
    SELECT id INTO v_effective_plan_id FROM plans WHERE code = 'basic';
  END IF;

  v_months_active := GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(v_shop.plan_started_at, v_shop.created_at))) / 2592000.0);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', f.key,
    'name', f.name,
    'description', f.description,
    'category', f.category,
    'requires_min_months', pf.requires_min_months,
    'limit_value', pf.limit_value,
    'allowed', v_months_active >= pf.requires_min_months,
    'reason', CASE WHEN v_months_active >= pf.requires_min_months THEN NULL
                   ELSE 'Tersedia setelah ' || pf.requires_min_months || ' bulan berlangganan' END
  ) ORDER BY f.sort_order), '[]'::jsonb)
  INTO v_features
  FROM plan_features pf
  JOIN features f ON f.key = pf.feature_key
  WHERE pf.plan_id = v_effective_plan_id AND f.is_active = true;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'key', t.key,
    'name', t.name,
    'description', t.description,
    'preview_image_url', t.preview_image_url,
    'component_id', t.component_id,
    'requires_min_months', pt.requires_min_months,
    'allowed', v_months_active >= pt.requires_min_months,
    'reason', CASE WHEN v_months_active >= pt.requires_min_months THEN NULL
                   ELSE 'Tersedia setelah ' || pt.requires_min_months || ' bulan berlangganan' END
  ) ORDER BY t.sort_order), '[]'::jsonb)
  INTO v_themes
  FROM plan_themes pt
  JOIN themes t ON t.key = pt.theme_key
  WHERE pt.plan_id = v_effective_plan_id AND t.is_active = true;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'plan_expires_at', v_shop.plan_expires_at,
    'plan_started_at', v_shop.plan_started_at,
    'months_active', round(v_months_active, 2),
    'active_theme_key', v_shop.active_theme_key,
    'features', v_features,
    'themes', v_themes
  );
END;
$$;


--
-- Name: get_shop_marketplace_daily(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_shop_marketplace_daily(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS TABLE(day date, revenue numeric, orders bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
    COALESCE(SUM(o.total), 0)::numeric AS revenue,
    COUNT(*)::bigint AS orders
  FROM orders o
  WHERE o.shop_id = _shop_id
    AND o.marketplace_order = true
    AND o.status NOT IN ('cancelled','pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY 1
  ORDER BY 1;
END;
$$;


--
-- Name: get_shop_marketplace_stats(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_shop_marketplace_stats(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'gross_sales', COALESCE(SUM(total), 0),
    'commission_paid', COALESCE(SUM(commission_amount), 0),
    'net_revenue', COALESCE(SUM(net_to_shop), 0),
    'orders', COUNT(*),
    'aov', COALESCE(AVG(total), 0),
    'unique_customers', COUNT(DISTINCT customer_user_id),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled'))
  )
  INTO v_result
  FROM orders
  WHERE shop_id = _shop_id
    AND marketplace_order = true
    AND created_at >= _from
    AND created_at <= _to;

  RETURN v_result;
END;
$$;


--
-- Name: get_shop_marketplace_top_products(uuid, timestamp with time zone, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_shop_marketplace_top_products(_shop_id uuid, _from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10) RETURNS TABLE(menu_item_id uuid, item_name text, qty bigint, revenue numeric)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = auth.uid())
     AND NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    oi.menu_item_id,
    COALESCE(mi.name, oi.name) AS item_name,
    SUM(oi.quantity)::bigint AS qty,
    SUM(oi.subtotal)::numeric AS revenue
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
  WHERE o.shop_id = _shop_id
    AND o.marketplace_order = true
    AND o.status NOT IN ('cancelled','pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY oi.menu_item_id, mi.name, oi.name
  ORDER BY revenue DESC
  LIMIT _limit;
END;
$$;


--
-- Name: handle_new_customer_signup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_customer_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'is_customer') = 'true' THEN
    INSERT INTO public.customer_profiles (user_id, display_name, email, phone)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;


--
-- Name: has_outlet_access(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_outlet_access(_user_id uuid, _outlet_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.outlets o
    JOIN public.coffee_shops s ON s.id = o.shop_id
    WHERE o.id = _outlet_id
      AND (
        s.owner_id = _user_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles r
          WHERE r.user_id = _user_id
            AND r.role IN ('cashier','barista','owner')
            AND (r.outlet_id = o.id OR r.shop_id = s.id)
        )
      )
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: has_shop_role(uuid, public.app_role, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_shop_role(_user_id uuid, _role public.app_role, _shop_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role and (shop_id = _shop_id or shop_id is null)
  )
$$;


--
-- Name: increment_promo_usage(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_promo_usage(_promo_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.promos SET usage_count = usage_count + 1 WHERE id = _promo_id;
$$;


--
-- Name: is_courier_of_shop(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_courier_of_shop(_user_id uuid, _shop_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couriers
    WHERE user_id = _user_id AND shop_id = _shop_id AND is_active = true
  )
$$;


--
-- Name: is_shop_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_shop_owner(_shop_id uuid, _user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops WHERE id = _shop_id AND owner_id = _user_id
  );
$$;


--
-- Name: link_courier_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_courier_account() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _email text;
  _updated int;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN RETURN 0; END IF;

  UPDATE public.couriers
     SET user_id = auth.uid()
   WHERE lower(email) = lower(_email)
     AND user_id IS NULL;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;


--
-- Name: list_available_delivery_orders(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_available_delivery_orders(_courier_id uuid) RETURNS TABLE(id uuid, order_no text, status public.order_status, total numeric, delivery_fee numeric, delivery_address text, customer_name text, customer_phone text, note text, created_at timestamp with time zone)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT o.id, o.order_no, o.status, o.total, o.delivery_fee,
         o.delivery_address, o.customer_name, o.customer_phone, o.note, o.created_at
  FROM orders o
  JOIN couriers c ON c.id = _courier_id
  WHERE o.shop_id = c.shop_id
    AND o.courier_id IS NULL
    AND o.fulfillment = 'delivery'
    AND o.status IN ('ready', 'preparing')
    AND (
      c.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = c.shop_id AND s.owner_id = auth.uid())
    )
  ORDER BY o.created_at ASC
  LIMIT 50
$$;


--
-- Name: log_custom_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_custom_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    insert into public.custom_order_status_history(request_id, from_status, to_status, note, changed_by)
    values (new.id, null, new.status, 'Permintaan dibuat', null);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.custom_order_status_history(request_id, from_status, to_status, note, changed_by)
    values (new.id, old.status, new.status, new.owner_note, auth.uid());
  end if;
  return new;
end;
$$;


--
-- Name: log_shift_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_shift_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action text;
  v_shop uuid;
  v_target uuid;
  v_meta jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'shift_create';
    v_shop := NEW.shop_id;
    v_target := NEW.user_id;
    v_meta := jsonb_build_object(
      'shift_id', NEW.id,
      'day_of_week', NEW.day_of_week,
      'outlet_id', NEW.outlet_id,
      'after', jsonb_build_object('start_time', NEW.start_time, 'end_time', NEW.end_time, 'note', NEW.note)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'shift_update';
    v_shop := NEW.shop_id;
    v_target := NEW.user_id;
    v_meta := jsonb_build_object(
      'shift_id', NEW.id,
      'day_of_week', NEW.day_of_week,
      'outlet_id', NEW.outlet_id,
      'before', jsonb_build_object('start_time', OLD.start_time, 'end_time', OLD.end_time, 'outlet_id', OLD.outlet_id, 'note', OLD.note),
      'after',  jsonb_build_object('start_time', NEW.start_time, 'end_time', NEW.end_time, 'outlet_id', NEW.outlet_id, 'note', NEW.note)
    );
  ELSE
    v_action := 'shift_delete';
    v_shop := OLD.shop_id;
    v_target := OLD.user_id;
    v_meta := jsonb_build_object(
      'shift_id', OLD.id,
      'day_of_week', OLD.day_of_week,
      'outlet_id', OLD.outlet_id,
      'before', jsonb_build_object('start_time', OLD.start_time, 'end_time', OLD.end_time, 'note', OLD.note)
    );
  END IF;

  INSERT INTO public.staff_audit_logs (shop_id, actor_id, target_user_id, action, meta)
  VALUES (v_shop, auth.uid(), v_target, v_action, v_meta);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_system_event(text, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_system_event(_event_type text, _shop_id uuid, _payload jsonb DEFAULT '{}'::jsonb, _notes text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  INSERT INTO public.system_audit (event_type, shop_id, payload, notes)
  VALUES (_event_type, _shop_id, COALESCE(_payload, '{}'::jsonb), _notes)
  RETURNING id;
$$;


--
-- Name: mark_all_notifications_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_all_notifications_read() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_count INT;
BEGIN
  WITH upd AS (
    UPDATE public.notifications
    SET read_at = now()
    WHERE recipient_user_id = auth.uid() AND read_at IS NULL
    RETURNING 1
  ) SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;


--
-- Name: mark_notification_read(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notification_read(_id uuid) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = _id AND recipient_user_id = auth.uid() AND read_at IS NULL;
$$;


--
-- Name: marketplace_checkout(text, text, text, text, text, text, jsonb, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.marketplace_checkout(_recipient_name text, _phone text, _address text, _fulfillment text DEFAULT 'delivery'::text, _payment_method text DEFAULT 'manual_transfer'::text, _notes text DEFAULT NULL::text, _shipping jsonb DEFAULT '{}'::jsonb, _shop_voucher_codes jsonb DEFAULT '{}'::jsonb, _platform_voucher_code text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cart_id UUID;
  _shop RECORD;
  _order_id UUID;
  _outlet_id UUID;
  _order_no TEXT;
  _subtotal NUMERIC;
  _commission_rate NUMERIC;
  _commission_amount NUMERIC;
  _net_to_shop NUMERIC;
  _global_rate NUMERIC;
  _order_ids UUID[] := ARRAY[]::UUID[];
  _zone_id UUID;
  _delivery_fee NUMERIC;
  _total NUMERIC;
  _shop_voucher_code TEXT;
  _shop_voucher RECORD;
  _shop_discount NUMERIC;
  _platform_voucher RECORD;
  _platform_discount NUMERIC := 0;
  _platform_total_subtotal NUMERIC := 0;
  _used_count_user INTEGER;
  _shop_subtotals jsonb := '{}'::jsonb;
  _membership RECORD;
  _membership_discount NUMERIC;
  _membership_pct NUMERIC;
  _membership_tier_id UUID;
  _pm text;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Auth required';
  END IF;

  -- Normalize payment method from client (transfer / cod / qris / cash / manual_transfer)
  _pm := lower(coalesce(_payment_method, 'manual_transfer'));
  IF _pm = 'transfer' THEN _pm := 'manual_transfer'; END IF;
  IF _pm NOT IN ('cash','qris','manual_transfer','cod') THEN
    _pm := 'manual_transfer';
  END IF;

  SELECT COALESCE((value)::numeric, 0.05) INTO _global_rate
  FROM platform_settings WHERE key = 'commission_global_rate';
  IF _global_rate IS NULL THEN _global_rate := 0.05; END IF;

  SELECT id INTO _cart_id FROM marketplace_carts WHERE user_id = _user_id LIMIT 1;
  IF _cart_id IS NULL THEN RAISE EXCEPTION 'Cart kosong'; END IF;

  IF _platform_voucher_code IS NOT NULL AND _platform_voucher_code <> '' THEN
    SELECT * INTO _platform_voucher FROM platform_vouchers
    WHERE code = _platform_voucher_code AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (expires_at IS NULL OR expires_at >= now());
    IF _platform_voucher.id IS NULL THEN
      RAISE EXCEPTION 'Voucher platform tidak valid';
    END IF;
    IF _platform_voucher.usage_limit IS NOT NULL AND _platform_voucher.usage_count >= _platform_voucher.usage_limit THEN
      RAISE EXCEPTION 'Voucher platform habis';
    END IF;
    SELECT COUNT(*) INTO _used_count_user FROM platform_voucher_redemptions
      WHERE voucher_id = _platform_voucher.id AND user_id = _user_id;
    IF _platform_voucher.per_user_limit IS NOT NULL AND _used_count_user >= _platform_voucher.per_user_limit THEN
      RAISE EXCEPTION 'Voucher platform sudah pernah dipakai';
    END IF;
  END IF;

  FOR _shop IN
    SELECT ci.shop_id
    FROM marketplace_cart_items ci
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id
  LOOP
    SELECT COALESCE(SUM(
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END * ci.quantity
    ), 0)
    INTO _subtotal
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;
    _shop_subtotals := _shop_subtotals || jsonb_build_object(_shop.shop_id::text, _subtotal);
    _platform_total_subtotal := _platform_total_subtotal + _subtotal;
  END LOOP;

  FOR _shop IN
    SELECT ci.shop_id, s.commission_rate_override, s.business_category_id
    FROM marketplace_cart_items ci
    JOIN coffee_shops s ON s.id = ci.shop_id
    WHERE ci.cart_id = _cart_id
    GROUP BY ci.shop_id, s.commission_rate_override, s.business_category_id
  LOOP
    SELECT id INTO _outlet_id FROM outlets WHERE shop_id = _shop.shop_id AND is_active = true ORDER BY created_at LIMIT 1;
    IF _outlet_id IS NULL THEN
      INSERT INTO outlets (shop_id, name) VALUES (_shop.shop_id, 'Outlet Utama') RETURNING id INTO _outlet_id;
    END IF;

    _subtotal := COALESCE((_shop_subtotals->>(_shop.shop_id::text))::numeric, 0);

    _zone_id := NULL; _delivery_fee := 0;
    IF _fulfillment = 'delivery' THEN
      _zone_id := NULLIF(_shipping->>(_shop.shop_id::text), '')::uuid;
      IF _zone_id IS NOT NULL THEN
        SELECT fee INTO _delivery_fee FROM delivery_zones
        WHERE id = _zone_id AND shop_id = _shop.shop_id AND is_active = true;
        IF _delivery_fee IS NULL THEN _delivery_fee := 0; _zone_id := NULL; END IF;
      END IF;
      IF _zone_id IS NULL THEN
        SELECT COALESCE(base_fee, 0) INTO _delivery_fee FROM delivery_settings WHERE shop_id = _shop.shop_id;
        _delivery_fee := COALESCE(_delivery_fee, 0);
      END IF;
    END IF;

    _shop_voucher_code := _shop_voucher_codes->>(_shop.shop_id::text);
    _shop_discount := 0;
    IF _shop_voucher_code IS NOT NULL AND _shop_voucher_code <> '' THEN
      SELECT * INTO _shop_voucher FROM promos
      WHERE shop_id = _shop.shop_id AND code = _shop_voucher_code AND is_active = true
        AND channel IN ('online','all')
        AND (starts_at IS NULL OR starts_at <= now())
        AND (expires_at IS NULL OR expires_at >= now())
        AND (usage_limit IS NULL OR usage_count < usage_limit)
        AND (min_order IS NULL OR _subtotal >= min_order);
      IF _shop_voucher.id IS NOT NULL THEN
        IF _shop_voucher.type = 'percent' THEN
          _shop_discount := ROUND(_subtotal * _shop_voucher.value / 100, 2);
        ELSE
          _shop_discount := _shop_voucher.value;
        END IF;
        IF _shop_voucher.max_discount IS NOT NULL AND _shop_discount > _shop_voucher.max_discount THEN
          _shop_discount := _shop_voucher.max_discount;
        END IF;
        IF _shop_discount > _subtotal THEN _shop_discount := _subtotal; END IF;
        UPDATE promos SET usage_count = usage_count + 1 WHERE id = _shop_voucher.id;
      ELSE
        _shop_voucher_code := NULL;
      END IF;
    END IF;

    _membership_discount := 0;
    _membership_pct := 0;
    _membership_tier_id := NULL;
    SELECT cm.tier_id, t.discount_percent
      INTO _membership
      FROM customer_memberships cm
      JOIN shop_membership_tiers t ON t.id = cm.tier_id
      WHERE cm.customer_user_id = _user_id
        AND cm.shop_id = _shop.shop_id
        AND cm.status = 'active'
        AND cm.expires_at > now()
      ORDER BY t.discount_percent DESC
      LIMIT 1;
    IF _membership.tier_id IS NOT NULL AND _membership.discount_percent > 0 THEN
      _membership_tier_id := _membership.tier_id;
      _membership_pct := _membership.discount_percent;
      _membership_discount := ROUND((_subtotal - _shop_discount) * _membership_pct / 100, 2);
      IF _membership_discount < 0 THEN _membership_discount := 0; END IF;
    END IF;

    _platform_discount := 0;
    IF _platform_voucher.id IS NOT NULL AND _platform_total_subtotal >= COALESCE(_platform_voucher.min_order, 0) THEN
      DECLARE
        _platform_total_disc NUMERIC;
        _share NUMERIC;
      BEGIN
        IF _platform_voucher.discount_type = 'percent' THEN
          _platform_total_disc := ROUND(_platform_total_subtotal * _platform_voucher.value / 100, 2);
        ELSE
          _platform_total_disc := _platform_voucher.value;
        END IF;
        IF _platform_voucher.max_discount IS NOT NULL AND _platform_total_disc > _platform_voucher.max_discount THEN
          _platform_total_disc := _platform_voucher.max_discount;
        END IF;
        _share := CASE WHEN _platform_total_subtotal > 0
          THEN (_subtotal - _shop_discount - _membership_discount) / NULLIF(_platform_total_subtotal, 0) ELSE 0 END;
        _platform_discount := ROUND(_platform_total_disc * _share, 2);
        IF _platform_discount < 0 THEN _platform_discount := 0; END IF;
      END;
    END IF;

    _commission_rate := _shop.commission_rate_override;
    IF _commission_rate IS NULL AND _shop.business_category_id IS NOT NULL THEN
      SELECT commission_override INTO _commission_rate FROM business_categories WHERE id = _shop.business_category_id;
    END IF;
    IF _commission_rate IS NULL THEN _commission_rate := _global_rate; END IF;

    DECLARE _net_subtotal NUMERIC := _subtotal - _shop_discount - _membership_discount;
    BEGIN
      IF _net_subtotal < 0 THEN _net_subtotal := 0; END IF;
      _commission_amount := ROUND(_net_subtotal * _commission_rate, 2);
      _net_to_shop := _net_subtotal - _commission_amount;
      _total := _net_subtotal - _platform_discount + _delivery_fee;
      IF _total < 0 THEN _total := 0; END IF;
    END;

    _order_no := 'MKT-' || to_char(now(),'YYMMDD') || '-' || substring(gen_random_uuid()::text from 1 for 6);

    INSERT INTO orders (
      shop_id, outlet_id, order_no, customer_name, customer_phone, customer_user_id,
      delivery_address, fulfillment, channel, status, payment_status, payment_method,
      subtotal, discount, total, delivery_fee, delivery_zone_id,
      commission_rate, commission_amount, net_to_shop,
      escrow_status, marketplace_order, note,
      shop_voucher_code, shop_voucher_discount,
      platform_voucher_code, platform_voucher_discount,
      membership_tier_id, membership_discount, membership_discount_percent
    ) VALUES (
      _shop.shop_id, _outlet_id, _order_no, _recipient_name, _phone, _user_id,
      _address, _fulfillment::fulfillment_type, 'online'::order_channel, 'pending'::order_status,
      'unpaid'::payment_status, _pm::payment_method,
      _subtotal, _shop_discount + _platform_discount + _membership_discount, _total, _delivery_fee, _zone_id,
      ROUND(_commission_rate * 100, 2), _commission_amount, _net_to_shop,
      'held', true, _notes,
      _shop_voucher_code, _shop_discount,
      CASE WHEN _platform_voucher.id IS NOT NULL THEN _platform_voucher.code ELSE NULL END,
      _platform_discount,
      _membership_tier_id, _membership_discount, _membership_pct
    ) RETURNING id INTO _order_id;

    INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, subtotal, note)
    SELECT _order_id, ci.product_id, mi.name,
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END,
      ci.quantity,
      CASE
        WHEN mi.flash_price IS NOT NULL
          AND (mi.flash_starts_at IS NULL OR mi.flash_starts_at <= now())
          AND (mi.flash_ends_at IS NULL OR mi.flash_ends_at >= now())
        THEN mi.flash_price ELSE ci.unit_price
      END * ci.quantity,
      ci.notes
    FROM marketplace_cart_items ci
    JOIN menu_items mi ON mi.id = ci.product_id
    WHERE ci.cart_id = _cart_id AND ci.shop_id = _shop.shop_id;

    PERFORM escrow_hold_order(_order_id);
    _order_ids := _order_ids || _order_id;
  END LOOP;

  IF _platform_voucher.id IS NOT NULL THEN
    INSERT INTO platform_voucher_redemptions (voucher_id, user_id, order_ids, amount)
    VALUES (_platform_voucher.id, _user_id, _order_ids,
      (SELECT COALESCE(SUM(platform_voucher_discount),0) FROM orders WHERE id = ANY(_order_ids)));
    UPDATE platform_vouchers SET usage_count = usage_count + 1 WHERE id = _platform_voucher.id;
  END IF;

  DELETE FROM marketplace_cart_items WHERE cart_id = _cart_id;
  RETURN jsonb_build_object('order_ids', to_jsonb(_order_ids));
END;
$$;


--
-- Name: next_order_no(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.next_order_no(_outlet_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  bd date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  n int;
BEGIN
  SELECT COUNT(*) + 1 INTO n
  FROM public.orders
  WHERE outlet_id = _outlet_id AND business_date = bd;
  RETURN LPAD(n::text, 3, '0');
END;
$$;


--
-- Name: notify_dispute_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_dispute_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      DECLARE
        v_order orders%ROWTYPE;
        v_owner UUID;
      BEGIN
        SELECT * INTO v_order FROM orders WHERE id = NEW.order_id;
        IF NOT FOUND THEN RETURN NEW; END IF;
        SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = v_order.shop_id;

        IF TG_OP = 'INSERT' THEN
          PERFORM public.create_notification(
            v_owner, 'dispute_opened', 'Sengketa baru pada ' || v_order.order_no,
            'Customer melaporkan masalah, silakan tinjau.',
            '/pos-app/marketplace-orders', 'warning', v_order.shop_id,
            'dispute_open:' || NEW.id::text
          );
        ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
          IF NEW.status IN ('resolved','rejected') THEN
            PERFORM public.create_notification(
              v_order.customer_user_id, 'dispute_resolved',
              'Sengketa pesanan ' || v_order.order_no || ' diperbarui',
              'Status sengketa: ' || NEW.status,
              '/akun/pesanan/' || v_order.id::text,
              CASE WHEN NEW.status='resolved' THEN 'success' ELSE 'warning' END,
              v_order.shop_id,
              'dispute_resolved:' || NEW.id::text || ':' || NEW.status
            );
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;


--
-- Name: notify_low_stock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_low_stock() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_today text := to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD');
BEGIN
  IF NEW.is_active = false THEN RETURN NEW; END IF;
  IF NEW.min_stock IS NULL OR NEW.min_stock <= 0 THEN RETURN NEW; END IF;
  IF NEW.current_stock <= NEW.min_stock
     AND (TG_OP = 'INSERT' OR OLD.current_stock > OLD.min_stock OR OLD.current_stock > NEW.current_stock) THEN
    INSERT INTO public.owner_notifications (shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (
      NEW.shop_id,
      'low_stock',
      'Stok bahan menipis',
      NEW.name || ' tinggal ' || NEW.current_stock || ' ' || NEW.unit || ' (min ' || NEW.min_stock || ')',
      '/app/inventory',
      'warning',
      'low_stock:' || NEW.id::text || ':' || v_today
    )
    ON CONFLICT (shop_id, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_membership_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_membership_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _shop_name TEXT;
  _owner_id UUID;
  _tier_name TEXT;
BEGIN
  SELECT name, owner_user_id INTO _shop_name, _owner_id
  FROM coffee_shops WHERE id = NEW.shop_id;
  SELECT name INTO _tier_name FROM shop_membership_tiers WHERE id = NEW.tier_id;

  IF TG_OP = 'INSERT' THEN
    -- Notify customer (welcome)
    PERFORM create_notification(
      NEW.customer_user_id,
      'membership_active',
      format('Membership %s aktif!', COALESCE(_tier_name, 'baru')),
      format('Diskon otomatis berlaku di %s sampai %s.',
        COALESCE(_shop_name, 'toko'),
        to_char(NEW.expires_at, 'DD Mon YYYY')),
      '/akun/saldo',
      'success'
    );
    -- Notify owner
    IF _owner_id IS NOT NULL THEN
      PERFORM create_notification(
        _owner_id,
        'membership_purchased',
        'Member baru bergabung',
        format('Pelanggan baru aktif di tier %s.', COALESCE(_tier_name, '-')),
        '/pos-app/membership',
        'info'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_new_marketplace_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_new_marketplace_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE v_owner UUID;
BEGIN
  IF NEW.marketplace_order = true THEN
    SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = NEW.shop_id;
    PERFORM public.create_notification(
      v_owner,
      'order_new',
      'Pesanan baru: ' || NEW.order_no,
      'Total Rp ' || to_char(NEW.total, 'FM999G999G999'),
      '/pos-app/marketplace-orders',
      'info',
      NEW.shop_id,
      'order_new:' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_label TEXT;
  v_sev TEXT := 'info';
BEGIN
  IF NEW.customer_user_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  v_label := CASE NEW.status::text
    WHEN 'preparing' THEN 'Pesanan sedang disiapkan'
    WHEN 'ready' THEN 'Pesanan siap'
    WHEN 'delivered' THEN 'Pesanan dikirim'
    WHEN 'completed' THEN 'Pesanan selesai'
    WHEN 'cancelled' THEN 'Pesanan dibatalkan'
    WHEN 'voided' THEN 'Pesanan dibatalkan'
    ELSE 'Status pesanan diperbarui'
  END;

  IF NEW.status::text IN ('cancelled','voided') THEN v_sev := 'warning'; END IF;

  PERFORM public.create_notification(
    NEW.customer_user_id,
    'order_status',
    v_label,
    'Pesanan ' || NEW.order_no,
    '/akun/pesanan/' || NEW.id::text,
    v_sev,
    NEW.shop_id,
    'order_status:' || NEW.id::text || ':' || NEW.status::text
  );
  RETURN NEW;
END;
$$;


--
-- Name: notify_wallet_topup_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_wallet_topup_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _shop_name TEXT;
  _owner_id UUID;
  _customer_name TEXT;
BEGIN
  SELECT name, owner_user_id INTO _shop_name, _owner_id
  FROM coffee_shops WHERE id = NEW.shop_id;

  IF TG_OP = 'INSERT' AND _owner_id IS NOT NULL THEN
    -- Notify owner of new pending topup
    PERFORM create_notification(
      _owner_id,
      'wallet_topup_request',
      'Permintaan top-up saldo baru',
      format('Top-up Rp %s menunggu persetujuan.', to_char(NEW.amount, 'FM999G999G999')),
      '/pos-app/wallet-approvals',
      'info'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> OLD.status THEN
    -- Notify customer
    IF NEW.status = 'paid' THEN
      PERFORM create_notification(
        NEW.customer_user_id,
        'wallet_topup_approved',
        format('Top-up disetujui — %s', COALESCE(_shop_name, 'Toko')),
        format('Saldo Rp %s telah ditambahkan%s.',
          to_char(NEW.amount + COALESCE(NEW.bonus_amount,0), 'FM999G999G999'),
          CASE WHEN COALESCE(NEW.bonus_amount,0) > 0
               THEN format(' (termasuk bonus Rp %s)', to_char(NEW.bonus_amount, 'FM999G999G999'))
               ELSE '' END),
        '/akun/saldo',
        'success'
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM create_notification(
        NEW.customer_user_id,
        'wallet_topup_rejected',
        format('Top-up ditolak — %s', COALESCE(_shop_name, 'Toko')),
        COALESCE(NEW.notes, 'Hubungi toko untuk informasi lebih lanjut.'),
        '/akun/saldo',
        'warning'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: notify_withdrawal_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_withdrawal_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
      DECLARE v_owner UUID;
      BEGIN
        IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
        SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = NEW.shop_id;
        IF NEW.status IN ('approved','paid') THEN
          PERFORM public.create_notification(
            v_owner, 'withdrawal_'||NEW.status,
            CASE NEW.status WHEN 'approved' THEN 'Penarikan dana disetujui' ELSE 'Penarikan dana sudah dibayar' END,
            'Jumlah Rp '||to_char(NEW.amount,'FM999G999G999'),
            '/pos-app/wallet','success',NEW.shop_id,
            'withdrawal_'||NEW.status||':'||NEW.id::text
          );
        ELSIF NEW.status = 'rejected' THEN
          PERFORM public.create_notification(
            v_owner,'withdrawal_rejected','Penarikan dana ditolak',
            COALESCE(NEW.reject_reason,'Hubungi admin untuk detail.'),
            '/pos-app/wallet','warning',NEW.shop_id,
            'withdrawal_rejected:'||NEW.id::text
          );
        END IF;
        RETURN NEW;
      END;
      $$;


--
-- Name: open_dispute(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_dispute(_order_id uuid, _reason text, _description text DEFAULT NULL::text, _photos jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Order tidak ditemukan';
  END IF;
  IF v_order.customer_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Bukan pesanan Anda';
  END IF;
  IF v_order.status NOT IN ('completed','delivering','ready') THEN
    RAISE EXCEPTION 'Sengketa hanya dapat dibuka untuk pesanan yang sudah dikirim/selesai';
  END IF;
  IF EXISTS (SELECT 1 FROM order_disputes WHERE order_id = _order_id AND status IN ('open','under_review')) THEN
    RAISE EXCEPTION 'Sengketa untuk pesanan ini sudah ada';
  END IF;
  INSERT INTO order_disputes(order_id, shop_id, opened_by, reason, description, photos)
  VALUES (_order_id, v_order.shop_id, auth.uid(), _reason, _description, COALESCE(_photos, '[]'::jsonb))
  RETURNING id INTO v_id;
  -- Hold escrow if currently released? Mark escrow as held.
  UPDATE orders SET escrow_status = 'disputed', updated_at = now()
  WHERE id = _order_id AND escrow_status IN ('held','released');
  RETURN v_id;
END;
$$;


--
-- Name: open_shift(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_shift(_outlet_id uuid, _opening_cash numeric) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_shop uuid;
  v_existing uuid;
  v_shift_id uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_outlet_access(v_caller, _outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT shop_id INTO v_shop FROM public.outlets WHERE id = _outlet_id;
  IF v_shop IS NULL THEN RAISE EXCEPTION 'outlet_not_found'; END IF;

  SELECT id INTO v_existing FROM public.cash_shifts
   WHERE outlet_id = _outlet_id AND status = 'open' LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  INSERT INTO public.cash_shifts (shop_id, outlet_id, opened_by, opening_cash)
  VALUES (v_shop, _outlet_id, v_caller, COALESCE(_opening_cash, 0))
  RETURNING id INTO v_shift_id;

  INSERT INTO public.cash_movements (shift_id, type, amount, note, created_by)
  VALUES (v_shift_id, 'opening', COALESCE(_opening_cash, 0), 'Modal awal', v_caller);

  RETURN v_shift_id;
END;
$$;


--
-- Name: process_booking_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_booking_reminders() RETURNS TABLE(h1_count integer, h1h_count integer, review_count integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_h1 INT := 0; v_h1h INT := 0; v_review INT := 0; v_booking RECORD;
BEGIN
  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN coffee_shops cs ON cs.id=b.shop_id
    WHERE b.status IN ('pending','confirmed') AND b.reminded_h1_at IS NULL AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '23 hours') AND (now() + interval '25 hours')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1', 'Pengingat: booking besok',
      format('Booking %s di %s besok jam %s.', v_booking.service_name, v_booking.shop_name, to_char(v_booking.slot_time, 'HH24:MI')),
      '/akun/bookings', 'info', 'booking_h1_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1_at = now() WHERE id = v_booking.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN coffee_shops cs ON cs.id=b.shop_id
    WHERE b.status IN ('pending','confirmed') AND b.reminded_h1h_at IS NULL AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '50 minutes') AND (now() + interval '70 minutes')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1h', 'Booking 1 jam lagi',
      format('%s di %s mulai 1 jam lagi.', v_booking.service_name, v_booking.shop_name),
      '/akun/bookings', 'warning', 'booking_h1h_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1h_at = now() WHERE id = v_booking.id;
    v_h1h := v_h1h + 1;
  END LOOP;

  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.customer_phone, b.shop_id, s.service_name, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN coffee_shops cs ON cs.id=b.shop_id
    LEFT JOIN booking_reviews r ON r.booking_id = b.id
    WHERE b.status IN ('confirmed','completed') AND b.feedback_requested_at IS NULL AND r.id IS NULL
      AND (s.slot_date + s.slot_time + (s.duration_minutes || ' minutes')::interval) < (now() - interval '2 hours')
      AND (s.slot_date + s.slot_time) > (now() - interval '7 days')
  LOOP
    INSERT INTO booking_review_requests (booking_id, customer_phone, customer_user_id)
    VALUES (v_booking.id, v_booking.customer_phone, v_booking.customer_user_id)
    ON CONFLICT (booking_id) DO NOTHING;
    IF v_booking.customer_user_id IS NOT NULL THEN
      INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
      VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_review_request',
        'Bagaimana pengalamanmu di ' || v_booking.shop_name || '?',
        'Bagikan rating untuk booking ' || v_booking.service_name || '.',
        '/akun/bookings', 'info', 'booking_review_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    END IF;
    UPDATE bookings SET feedback_requested_at = now() WHERE id = v_booking.id;
    v_review := v_review + 1;
  END LOOP;

  RETURN QUERY SELECT v_h1, v_h1h, v_review;
END;
$$;


--
-- Name: process_subscription_renewals(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_subscription_renewals() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  sub RECORD;
  new_invoice_id uuid;
  total_processed integer := 0;
  total_failed integer := 0;
BEGIN
  FOR sub IN
    SELECT * FROM public.plan_subscriptions
    WHERE status = 'active'
      AND next_billing_at <= now() + interval '1 day'
  LOOP
    BEGIN
      -- Buat invoice baru via RPC create_plan_invoice (jika function ada)
      BEGIN
        new_invoice_id := (SELECT public.create_plan_invoice(sub.plan_code))::uuid;
      EXCEPTION WHEN OTHERS THEN
        new_invoice_id := NULL;
      END;

      IF new_invoice_id IS NOT NULL THEN
        UPDATE public.plan_invoices
        SET subscription_id = sub.id,
            payment_method = sub.payment_provider
        WHERE id = new_invoice_id;

        UPDATE public.plan_subscriptions
        SET last_invoice_id = new_invoice_id,
            last_charge_at = now(),
            next_billing_at = next_billing_at + (CASE WHEN sub.billing_interval = 'yearly' THEN interval '365 days' ELSE interval '30 days' END),
            failure_count = 0
        WHERE id = sub.id;
        total_processed := total_processed + 1;
      ELSE
        UPDATE public.plan_subscriptions
        SET failure_count = failure_count + 1,
            status = CASE WHEN failure_count >= 3 THEN 'past_due' ELSE status END
        WHERE id = sub.id;
        total_failed := total_failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      total_failed := total_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object('processed', total_processed, 'failed', total_failed, 'ran_at', now());
END;
$$;


--
-- Name: receive_purchase_order(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.receive_purchase_order(_po_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_po purchase_orders%ROWTYPE;
  rec RECORD;
  v_old_stock numeric;
  v_old_cost numeric;
  v_new_cost numeric;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_po FROM purchase_orders WHERE id = _po_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'po_not_found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = v_po.shop_id AND s.owner_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_po.status = 'received' THEN RAISE EXCEPTION 'already_received'; END IF;

  FOR rec IN
    SELECT ingredient_id, quantity, unit_cost FROM purchase_order_items WHERE po_id = _po_id
  LOOP
    -- Insert stock movement (purchase) — trigger will increment ingredient stock
    INSERT INTO stock_movements (shop_id, ingredient_id, type, quantity, unit_cost, note, created_by)
    VALUES (v_po.shop_id, rec.ingredient_id, 'purchase', rec.quantity, rec.unit_cost,
            'PO ' || v_po.po_no, v_caller);

    -- Weighted moving average cost update
    SELECT current_stock, cost_per_unit INTO v_old_stock, v_old_cost
      FROM ingredients WHERE id = rec.ingredient_id;
    -- v_old_stock here is post-increment (trigger already applied)
    IF v_old_stock > 0 THEN
      v_new_cost := ROUND(((COALESCE(v_old_cost,0) * (v_old_stock - rec.quantity)) + (rec.unit_cost * rec.quantity)) / v_old_stock, 4);
      UPDATE ingredients SET cost_per_unit = GREATEST(v_new_cost, 0), updated_at = now()
        WHERE id = rec.ingredient_id;
    END IF;

    UPDATE purchase_order_items SET received_qty = rec.quantity WHERE po_id = _po_id AND ingredient_id = rec.ingredient_id;
  END LOOP;

  UPDATE purchase_orders
    SET status = 'received', received_date = (now() AT TIME ZONE 'Asia/Jakarta')::date, updated_at = now()
    WHERE id = _po_id;
END;
$$;


--
-- Name: refresh_product_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_product_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_product UUID := COALESCE(NEW.product_id, OLD.product_id);
  v_shop UUID := COALESCE(NEW.shop_id, OLD.shop_id);
BEGIN
  UPDATE public.menu_items SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM product_reviews WHERE product_id = v_product AND NOT is_hidden), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE product_id = v_product AND NOT is_hidden), 0)
  WHERE id = v_product;

  UPDATE public.coffee_shops SET
    rating_avg = COALESCE((SELECT ROUND(AVG(rating)::numeric, 2) FROM product_reviews WHERE shop_id = v_shop AND NOT is_hidden), 0),
    rating_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE shop_id = v_shop AND NOT is_hidden), 0)
  WHERE id = v_shop;
  RETURN COALESCE(NEW, OLD);
END; $$;


--
-- Name: refund_order(uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refund_order(_order_id uuid, _amount numeric, _reason text DEFAULT NULL::text, _method text DEFAULT 'cash'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_order orders%ROWTYPE;
  v_refund_id uuid;
  v_open_shift uuid;
  v_already_refunded numeric;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'order_not_found'; END IF;
  IF NOT public.has_outlet_access(v_caller, v_order.outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _amount <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;

  SELECT COALESCE(SUM(amount),0) INTO v_already_refunded
    FROM public.refunds WHERE order_id = _order_id;
  IF v_already_refunded + _amount > v_order.total THEN
    RAISE EXCEPTION 'amount_exceeds_total';
  END IF;

  INSERT INTO public.refunds (order_id, shop_id, outlet_id, amount, reason, refund_method, created_by)
  VALUES (_order_id, v_order.shop_id, v_order.outlet_id, _amount, _reason, COALESCE(_method,'cash'), v_caller)
  RETURNING id INTO v_refund_id;

  -- If cash refund and there's an open shift, log cash movement
  IF COALESCE(_method,'cash') = 'cash' THEN
    SELECT id INTO v_open_shift FROM public.cash_shifts
      WHERE outlet_id = v_order.outlet_id AND status = 'open' LIMIT 1;
    IF v_open_shift IS NOT NULL THEN
      INSERT INTO public.cash_movements (shift_id, type, amount, note, order_id, created_by)
      VALUES (v_open_shift, 'refund', _amount, COALESCE('Refund: ' || _reason, 'Refund'), _order_id, v_caller);
    END IF;
  END IF;

  -- Update order payment_status
  IF v_already_refunded + _amount >= v_order.total THEN
    UPDATE public.orders SET payment_status = 'refunded',
      note = COALESCE(note || ' | ', '') || 'REFUND ' || _amount || ': ' || COALESCE(_reason,''),
      updated_at = now()
    WHERE id = _order_id;
  ELSE
    UPDATE public.orders SET
      note = COALESCE(note || ' | ', '') || 'PARTIAL REFUND ' || _amount || ': ' || COALESCE(_reason,''),
      updated_at = now()
    WHERE id = _order_id;
  END IF;

  RETURN v_refund_id;
END;
$$;


--
-- Name: reject_plan_invoice(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_plan_invoice(_invoice_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE plan_invoices
    SET status = 'rejected', notes = COALESCE(_reason, notes),
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
    WHERE id = _invoice_id;
END;
$$;


--
-- Name: reject_wallet_topup(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_wallet_topup(_topup_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _topup RECORD;
  _is_owner BOOLEAN;
BEGIN
  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up tidak ditemukan'; END IF;
  IF _topup.status <> 'pending' THEN RAISE EXCEPTION 'Top-up sudah diproses'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _topup.shop_id AND owner_id = auth.uid()) INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;
  UPDATE public.wallet_topups SET status = 'cancelled', note = COALESCE(_reason, note) WHERE id = _topup.id;
END;
$$;


--
-- Name: reject_withdrawal(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reject_withdrawal(_id uuid, _reason text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE w withdrawal_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO w FROM withdrawal_requests WHERE id=_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF w.status <> 'pending' THEN RAISE EXCEPTION 'invalid_state'; END IF;

  UPDATE withdrawal_requests SET status='rejected', reject_reason=_reason,
    reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
    WHERE id=_id;

  -- Return funds: pending → available
  UPDATE shop_wallets SET
    pending_balance = pending_balance - w.amount,
    available_balance = available_balance + w.amount,
    updated_at = now()
  WHERE shop_id = w.shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (w.shop_id, 'withdrawal_refund', w.amount, _id, 'WD-'||substring(_id::text,1,8),
          'Penarikan ditolak: '||_reason, auth.uid());
END; $$;


--
-- Name: reload_postgrest_schema(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reload_postgrest_schema() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;


--
-- Name: request_withdrawal(uuid, numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.request_withdrawal(_shop_id uuid, _amount numeric, _bank_name text, _bank_account_no text, _bank_account_name text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_wallet shop_wallets%ROWTYPE;
  v_min NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_id UUID;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coffee_shops WHERE id = _shop_id AND owner_id = v_caller) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT COALESCE((value->>'amount')::numeric, 50000) INTO v_min FROM platform_settings WHERE key='withdrawal_min';
  SELECT COALESCE((value->>'amount')::numeric, 5000) INTO v_fee FROM platform_settings WHERE key='withdrawal_fee';

  IF _amount < v_min THEN RAISE EXCEPTION 'below_minimum: %', v_min; END IF;

  PERFORM public.ensure_shop_wallet(_shop_id);
  SELECT * INTO v_wallet FROM shop_wallets WHERE shop_id = _shop_id FOR UPDATE;
  IF v_wallet.available_balance < _amount THEN
    RAISE EXCEPTION 'insufficient_balance: available %', v_wallet.available_balance;
  END IF;

  v_net := _amount - v_fee;

  INSERT INTO withdrawal_requests (shop_id, amount, admin_fee, net_amount, bank_name, bank_account_no, bank_account_name, requested_by)
  VALUES (_shop_id, _amount, v_fee, v_net, _bank_name, _bank_account_no, _bank_account_name, v_caller)
  RETURNING id INTO v_id;

  UPDATE shop_wallets SET
    available_balance = available_balance - _amount,
    pending_balance = pending_balance + _amount,
    updated_at = now()
  WHERE shop_id = _shop_id;

  INSERT INTO wallet_transactions (shop_id, type, amount, withdrawal_id, reference, notes, created_by)
  VALUES (_shop_id, 'withdrawal_hold', -_amount, v_id, 'WD-'||substring(v_id::text,1,8), 'Tahan untuk request penarikan', v_caller);

  RETURN v_id;
END; $$;


--
-- Name: resolve_dispute(uuid, text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_dispute(_dispute_id uuid, _status text, _resolution text DEFAULT NULL::text, _refund_amount numeric DEFAULT NULL::numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_d order_disputes%ROWTYPE;
  v_is_owner boolean;
  v_is_admin boolean;
BEGIN
  SELECT * INTO v_d FROM order_disputes WHERE id = _dispute_id;
  IF v_d.id IS NULL THEN RAISE EXCEPTION 'Sengketa tidak ditemukan'; END IF;
  v_is_admin := has_role(auth.uid(), 'super_admin'::app_role);
  SELECT EXISTS (SELECT 1 FROM coffee_shops WHERE id = v_d.shop_id AND owner_id = auth.uid())
    INTO v_is_owner;
  IF NOT (v_is_owner OR v_is_admin) THEN
    RAISE EXCEPTION 'Tidak berwenang';
  END IF;
  IF _status NOT IN ('resolved','rejected','under_review') THEN
    RAISE EXCEPTION 'Status tidak valid';
  END IF;

  UPDATE order_disputes
  SET status = _status,
      resolution = _resolution,
      refund_amount = _refund_amount,
      resolved_by = CASE WHEN _status IN ('resolved','rejected') THEN auth.uid() ELSE resolved_by END,
      resolved_at = CASE WHEN _status IN ('resolved','rejected') THEN now() ELSE resolved_at END,
      updated_at = now()
  WHERE id = _dispute_id;

  -- If resolved with refund, trigger escrow refund (partial supported via amount)
  IF _status = 'resolved' AND COALESCE(_refund_amount, 0) > 0 THEN
    PERFORM escrow_refund_order(v_d.order_id);
  ELSIF _status = 'rejected' THEN
    -- Restore escrow status held -> released eligible
    UPDATE orders SET escrow_status = 'held', updated_at = now()
    WHERE id = v_d.order_id AND escrow_status = 'disputed';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _status);
END;
$$;


--
-- Name: run_expiry_reminders_v2(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_expiry_reminders_v2() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  shop_row RECORD;
  rule_row RECORD;
  total_sent integer := 0;
  total_skipped integer := 0;
  use_override boolean;
  audience_now text;
  days_diff integer;
BEGIN
  FOR shop_row IN
    SELECT cs.id, cs.name, cs.owner_id, cs.plan_expires_at, cs.trial_ends_at,
           COALESCE(p.code,'free') AS plan_code, COALESCE(p.name,'Free') AS plan_name,
           COALESCE(s.override_rules, FALSE) AS override_rules
    FROM public.coffee_shops cs
    LEFT JOIN public.plans p ON p.id = cs.plan_id
    LEFT JOIN public.expiry_reminder_shop_settings s ON s.shop_id = cs.id
    WHERE cs.plan_expires_at IS NOT NULL OR cs.trial_ends_at IS NOT NULL
  LOOP
    use_override := shop_row.override_rules;

    -- Determine audience per shop
    IF shop_row.trial_ends_at IS NOT NULL AND shop_row.trial_ends_at >= now() THEN
      audience_now := 'trial';
      days_diff := DATE(shop_row.trial_ends_at) - CURRENT_DATE;
    ELSIF shop_row.plan_expires_at IS NOT NULL THEN
      audience_now := 'paid';
      days_diff := DATE(shop_row.plan_expires_at) - CURRENT_DATE;
    ELSE
      CONTINUE;
    END IF;

    IF days_diff < 0 OR days_diff > 90 THEN CONTINUE; END IF;

    FOR rule_row IN
      SELECT * FROM (
        SELECT id, audience, days_before, channels, template_subject, template_body, is_active, sort_order
        FROM public.expiry_reminder_shop_rules
        WHERE shop_id = shop_row.id AND is_active = true AND use_override = true
        UNION ALL
        SELECT id, audience, days_before, channels, template_subject, template_body, is_active, sort_order
        FROM public.expiry_reminder_rules
        WHERE is_active = true AND NOT use_override
      ) r
      WHERE r.audience = audience_now AND r.days_before = days_diff
    LOOP
      BEGIN
        INSERT INTO public.notifications (shop_id, recipient_user_id, title, body, severity, category)
        VALUES (
          shop_row.id,
          shop_row.owner_id,
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_subject,'Paket akan habis'),
            '{{shop_name}}', shop_row.name),
            '{{plan_name}}', shop_row.plan_name),
            '{{days_left}}', rule_row.days_before::text),
            '{{expires_at}}', COALESCE(shop_row.plan_expires_at::text, shop_row.trial_ends_at::text)),
          REPLACE(REPLACE(REPLACE(REPLACE(
            COALESCE(rule_row.template_body,'Paket {{plan_name}} berakhir {{days_left}} hari lagi'),
            '{{shop_name}}', shop_row.name),
            '{{plan_name}}', shop_row.plan_name),
            '{{days_left}}', rule_row.days_before::text),
            '{{expires_at}}', COALESCE(shop_row.plan_expires_at::text, shop_row.trial_ends_at::text)),
          'warning',
          'billing'
        );
        total_sent := total_sent + 1;
      EXCEPTION WHEN OTHERS THEN
        total_skipped := total_skipped + 1;
      END;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('total_sent', total_sent, 'total_skipped', total_skipped, 'ran_at', now());
END;
$$;


--
-- Name: run_scheduled_publishes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.run_scheduled_publishes() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, shop_id, puck_data, title, is_published
    FROM public.page_layouts
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
      AND is_published = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.page_layout_versions
      (layout_id, shop_id, puck_data, title, is_published_snapshot, reason)
    VALUES (rec.id, rec.shop_id, rec.puck_data, rec.title, true, 'scheduled-publish');

    UPDATE public.page_layouts
      SET is_published = true,
          published_at = now(),
          scheduled_publish_at = NULL
      WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('published', v_count, 'ran_at', now());
END $$;


--
-- Name: send_booking_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_booking_reminders() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_h1 int := 0;
  v_h3 int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT b.id, b.customer_user_id, b.customer_name, b.shop_id,
           s.service_name, s.slot_date, s.slot_time,
           c.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops c ON c.id = b.shop_id
    WHERE b.status = 'confirmed'
      AND b.reminded_h1_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND s.slot_date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1
  LOOP
    PERFORM create_notification(
      rec.customer_user_id, 'booking_reminder',
      'Pengingat: booking besok di ' || rec.shop_name,
      rec.service_name || ' - ' || to_char(rec.slot_date, 'DD Mon YYYY') || ' jam ' || to_char(rec.slot_time, 'HH24:MI'),
      '/akun/bookings', 'info', rec.shop_id,
      'booking_reminder_h1:' || rec.id::text
    );
    UPDATE bookings SET reminded_h1_at = now() WHERE id = rec.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  FOR rec IN
    SELECT b.id, b.customer_user_id, b.customer_name, b.shop_id,
           s.service_name, s.slot_date, s.slot_time,
           c.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops c ON c.id = b.shop_id
    WHERE b.status = 'confirmed'
      AND b.reminded_h3_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND s.slot_date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 3
  LOOP
    PERFORM create_notification(
      rec.customer_user_id, 'booking_reminder',
      '3 hari lagi booking di ' || rec.shop_name,
      rec.service_name || ' - ' || to_char(rec.slot_date, 'DD Mon YYYY') || ' jam ' || to_char(rec.slot_time, 'HH24:MI'),
      '/akun/bookings', 'info', rec.shop_id,
      'booking_reminder_h3:' || rec.id::text
    );
    UPDATE bookings SET reminded_h3_at = now() WHERE id = rec.id;
    v_h3 := v_h3 + 1;
  END LOOP;

  RETURN jsonb_build_object('h1_sent', v_h1, 'h3_sent', v_h3, 'run_at', now());
END $$;


--
-- Name: send_membership_expiry_reminders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_membership_expiry_reminders() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _row RECORD;
  _count INTEGER := 0;
  _shop_name TEXT;
  _days INTEGER;
BEGIN
  FOR _row IN
    SELECT cm.id, cm.customer_user_id, cm.shop_id, cm.expires_at,
           t.name AS tier_name
    FROM customer_memberships cm
    JOIN shop_membership_tiers t ON t.id = cm.tier_id
    WHERE cm.status = 'active'
      AND cm.expires_at BETWEEN now() AND now() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.recipient_user_id = cm.customer_user_id
          AND n.type = 'membership_expiring'
          AND n.created_at > now() - INTERVAL '3 days'
          AND (n.body LIKE '%' || cm.id::text || '%' OR n.link LIKE '%' || cm.shop_id::text || '%')
      )
  LOOP
    SELECT name INTO _shop_name FROM coffee_shops WHERE id = _row.shop_id;
    _days := GREATEST(0, EXTRACT(DAY FROM (_row.expires_at - now()))::INTEGER);
    PERFORM create_notification(
      _row.customer_user_id,
      'membership_expiring',
      format('Membership akan kedaluwarsa dalam %s hari', _days),
      format('Membership %s di %s berakhir %s. Perpanjang sekarang agar tetap dapat diskon.',
        _row.tier_name, COALESCE(_shop_name, 'toko'),
        to_char(_row.expires_at, 'DD Mon YYYY')),
      '/akun/saldo',
      'warning'
    );
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;


--
-- Name: send_order_message(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.send_order_message(_order_id uuid, _body text, _attachment_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_role text;
  v_id uuid;
BEGIN
  IF length(trim(_body)) = 0 THEN RAISE EXCEPTION 'Pesan kosong'; END IF;
  IF length(_body) > 2000 THEN RAISE EXCEPTION 'Pesan terlalu panjang'; END IF;
  SELECT * INTO v_order FROM orders WHERE id = _order_id;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Order tidak ditemukan'; END IF;
  IF v_order.customer_user_id = auth.uid() THEN
    v_role := 'customer';
  ELSIF EXISTS (SELECT 1 FROM coffee_shops WHERE id = v_order.shop_id AND owner_id = auth.uid()) THEN
    v_role := 'seller';
  ELSE
    RAISE EXCEPTION 'Bukan peserta percakapan';
  END IF;
  INSERT INTO order_messages(order_id, shop_id, sender_id, sender_role, body, attachment_url)
  VALUES (_order_id, v_order.shop_id, auth.uid(), v_role, _body, _attachment_url)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


--
-- Name: set_booking_type_from_slot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_booking_type_from_slot() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.slot_id IS NOT NULL THEN
    SELECT booking_type INTO NEW.booking_type
    FROM public.booking_slots
    WHERE id = NEW.slot_id;
    IF NEW.booking_type IS NULL THEN
      NEW.booking_type := 'service';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_custom_domain_verified(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_custom_domain_verified(_shop_id uuid, _verified boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE coffee_shops
    SET custom_domain_verified_at = CASE WHEN _verified THEN now() ELSE NULL END,
        updated_at = now()
    WHERE id = _shop_id;

  INSERT INTO domain_audit (shop_id, action, actor_id, notes)
  VALUES (_shop_id, CASE WHEN _verified THEN 'verify' ELSE 'unverify' END, auth.uid(), 'super admin');
END;
$$;


--
-- Name: set_order_no(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_order_no() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_date text;
  v_seq int;
BEGIN
  IF NEW.order_no IS NOT NULL AND NEW.order_no <> '' THEN
    RETURN NEW;
  END IF;

  v_date := to_char(COALESCE(NEW.business_date, (now() AT TIME ZONE 'Asia/Jakarta')::date), 'YYYYMMDD');

  SELECT COALESCE(MAX(NULLIF(regexp_replace(order_no, '^.*-', ''), '')::int), 0) + 1
    INTO v_seq
  FROM public.orders
  WHERE outlet_id = NEW.outlet_id
    AND business_date = COALESCE(NEW.business_date, (now() AT TIME ZONE 'Asia/Jakarta')::date)
    AND order_no ~ ('^' || v_date || '-[0-9]+$');

  NEW.order_no := v_date || '-' || lpad(v_seq::text, 4, '0');
  RETURN NEW;
END;
$_$;


--
-- Name: set_shop_theme(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_shop_theme(_shop_id uuid, _theme_key text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_owner uuid;
  v_ent jsonb;
  v_allowed boolean := false;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT owner_id INTO v_owner FROM coffee_shops WHERE id = _shop_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'shop_not_found'; END IF;
  IF v_owner <> v_caller AND NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  v_ent := public.get_shop_entitlements(_shop_id);

  SELECT bool_or((t->>'allowed')::boolean) INTO v_allowed
  FROM jsonb_array_elements(v_ent->'themes') t
  WHERE t->>'key' = _theme_key;

  IF NOT COALESCE(v_allowed, false) THEN
    RAISE EXCEPTION 'theme_not_entitled';
  END IF;

  UPDATE coffee_shops SET active_theme_key = _theme_key, updated_at = now() WHERE id = _shop_id;
END;
$$;


--
-- Name: shop_chat_set_last_message_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shop_chat_set_last_message_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.shop_chats SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;


--
-- Name: test_qr_table_lock(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_qr_table_lock() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_shop uuid;
  v_outlet uuid;
  v_order uuid;
  v_after text;
  v_blocked boolean := false;
BEGIN
  SELECT s.id, o.id INTO v_shop, v_outlet
  FROM public.coffee_shops s JOIN public.outlets o ON o.shop_id = s.id LIMIT 1;
  IF v_shop IS NULL THEN RETURN 'skipped — no shop/outlet'; END IF;

  INSERT INTO public.orders (shop_id, outlet_id, channel, fulfillment, order_source, table_label, payment_method, status)
  VALUES (v_shop, v_outlet, 'online', 'dine_in', 'qr_table', 'TEST-LOCK', 'cash', 'pending')
  RETURNING id INTO v_order;

  BEGIN
    UPDATE public.orders SET table_label = 'CHANGED' WHERE id = v_order;
  EXCEPTION WHEN check_violation THEN v_blocked := true;
  END;

  IF NOT v_blocked THEN
    DELETE FROM public.orders WHERE id = v_order;
    RAISE EXCEPTION 'FAILED — edit not blocked';
  END IF;

  UPDATE public.orders SET order_source = 'pos' WHERE id = v_order;
  UPDATE public.orders SET table_label = 'NEW' WHERE id = v_order;
  SELECT table_label INTO v_after FROM public.orders WHERE id = v_order;
  DELETE FROM public.orders WHERE id = v_order;

  IF v_after <> 'NEW' THEN RAISE EXCEPTION 'FAILED — post-unlock edit lost'; END IF;
  RETURN 'PASSED';
END;
$$;


--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: update_shop_chat_last_message(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_shop_chat_last_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.shop_chats
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: upsell_fill_shop_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsell_fill_shop_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    SELECT shop_id INTO NEW.shop_id FROM public.menu_items WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: upsert_shop_customer_on_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_shop_customer_on_order() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.customer_user_id IS NOT NULL AND NEW.status::text IN ('completed', 'delivered') THEN
    INSERT INTO public.shop_customers (shop_id, user_id, display_name, phone, total_orders, total_spent, last_order_at, first_order_at)
    VALUES (
      NEW.shop_id,
      NEW.customer_user_id,
      COALESCE(NEW.customer_name, ''),
      NEW.customer_phone,
      1,
      NEW.total,
      NEW.created_at,
      NEW.created_at
    )
    ON CONFLICT (shop_id, user_id) DO UPDATE SET
      display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), shop_customers.display_name),
      phone = COALESCE(EXCLUDED.phone, shop_customers.phone),
      total_orders = shop_customers.total_orders + 1,
      total_spent = shop_customers.total_spent + EXCLUDED.total_spent,
      last_order_at = GREATEST(shop_customers.last_order_at, EXCLUDED.last_order_at),
      first_order_at = LEAST(shop_customers.first_order_at, EXCLUDED.first_order_at),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: user_belongs_to_shop(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_belongs_to_shop(_user_id uuid, _shop_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.coffee_shops WHERE id = _shop_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.staff_permissions WHERE shop_id = _shop_id AND user_id = _user_id
  );
$$;


--
-- Name: validate_business_category_flow_types(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_business_category_flow_types() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v text;
BEGIN
  IF NEW.flow_types IS NULL THEN
    NEW.flow_types := '{}'::text[];
  END IF;
  FOREACH v IN ARRAY NEW.flow_types LOOP
    IF v NOT IN ('T1','T2','T3','T4','T5') THEN
      RAISE EXCEPTION 'Invalid flow_type "%": must be one of T1,T2,T3,T4,T5', v;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;


--
-- Name: validate_plan_feature_min_months(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_plan_feature_min_months() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.requires_min_months IS NOT NULL THEN
    IF NEW.requires_min_months < 0 OR NEW.requires_min_months > 120 THEN
      RAISE EXCEPTION 'requires_min_months must be between 0 and 120, got %', NEW.requires_min_months;
    END IF;
    IF NEW.requires_min_months != TRUNC(NEW.requires_min_months) THEN
      RAISE EXCEPTION 'requires_min_months must be an integer, got %', NEW.requires_min_months;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_plan_theme_min_months(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_plan_theme_min_months() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.requires_min_months IS NOT NULL THEN
    IF NEW.requires_min_months < 0 OR NEW.requires_min_months > 120 THEN
      RAISE EXCEPTION 'requires_min_months must be between 0 and 120, got %', NEW.requires_min_months;
    END IF;
    IF NEW.requires_min_months != TRUNC(NEW.requires_min_months) THEN
      RAISE EXCEPTION 'requires_min_months must be an integer, got %', NEW.requires_min_months;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_promo(uuid, text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_promo(_shop_id uuid, _code text, _subtotal numeric, _channel text) RETURNS TABLE(promo_id uuid, code text, discount numeric, error text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  p promos%ROWTYPE;
  d numeric := 0;
BEGIN
  SELECT * INTO p FROM promos
  WHERE shop_id = _shop_id AND lower(code) = lower(_code) AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, _code, 0::numeric, 'Kode promo tidak ditemukan';
    RETURN;
  END IF;

  IF p.starts_at IS NOT NULL AND p.starts_at > now() THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Promo belum berlaku';
    RETURN;
  END IF;
  IF p.expires_at IS NOT NULL AND p.expires_at < now() THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Promo sudah expired';
    RETURN;
  END IF;
  IF p.channel <> 'all' AND p.channel::text <> _channel THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Promo tidak berlaku untuk channel ini';
    RETURN;
  END IF;
  IF _subtotal < p.min_order THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Belum mencapai minimum order';
    RETURN;
  END IF;
  IF p.usage_limit IS NOT NULL AND p.usage_count >= p.usage_limit THEN
    RETURN QUERY SELECT p.id, p.code, 0::numeric, 'Kuota promo habis';
    RETURN;
  END IF;

  IF p.type = 'percent' THEN
    d := round(_subtotal * p.value / 100);
    IF p.max_discount IS NOT NULL AND d > p.max_discount THEN
      d := p.max_discount;
    END IF;
  ELSE
    d := p.value;
  END IF;
  IF d > _subtotal THEN d := _subtotal; END IF;

  RETURN QUERY SELECT p.id, p.code, d, NULL::text;
END;
$$;


--
-- Name: validate_shift_no_overlap(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_shift_no_overlap() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_conflict RECORD;
BEGIN
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'shift_invalid_range: jam selesai harus setelah jam mulai';
  END IF;

  SELECT s.id, s.start_time, s.end_time
    INTO v_conflict
    FROM public.shifts s
   WHERE s.shop_id = NEW.shop_id
     AND s.user_id = NEW.user_id
     AND s.day_of_week = NEW.day_of_week
     AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND s.start_time < NEW.end_time
     AND s.end_time   > NEW.start_time
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'shift_overlap: bentrok dengan shift % – %',
      to_char(v_conflict.start_time, 'HH24:MI'),
      to_char(v_conflict.end_time, 'HH24:MI');
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: void_order(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.void_order(_order_id uuid, _reason text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_caller uuid := auth.uid();
  rec RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF NOT public.has_outlet_access(v_caller, v_order.outlet_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_order.status IN ('voided','cancelled') THEN
    RETURN;
  END IF;

  -- Reverse stock for tracked menu items
  FOR rec IN
    SELECT oi.menu_item_id, oi.quantity AS sold_qty, r.ingredient_id, r.quantity AS recipe_qty, m.shop_id, m.track_stock
    FROM public.order_items oi
    JOIN public.menu_items m ON m.id = oi.menu_item_id
    JOIN public.recipes r ON r.menu_item_id = m.id
    WHERE oi.order_id = _order_id AND m.track_stock = true
  LOOP
    INSERT INTO public.stock_movements (shop_id, ingredient_id, type, quantity, note, order_id, created_by)
    VALUES (rec.shop_id, rec.ingredient_id, 'adjustment', rec.recipe_qty * rec.sold_qty,
            COALESCE('Void order: ' || _reason, 'Void order'),
            _order_id, v_caller);
  END LOOP;

  -- Reverse loyalty points if any (best effort)
  IF v_order.customer_user_id IS NOT NULL AND (v_order.points_earned > 0 OR v_order.points_redeemed > 0) THEN
    INSERT INTO public.loyalty_points (shop_id, user_id, balance, total_earned, total_redeemed)
    VALUES (v_order.shop_id, v_order.customer_user_id,
            v_order.points_redeemed - v_order.points_earned, 0, 0)
    ON CONFLICT (shop_id, user_id) DO UPDATE
      SET balance = public.loyalty_points.balance + (v_order.points_redeemed - v_order.points_earned),
          updated_at = now();

    INSERT INTO public.loyalty_ledger (shop_id, user_id, order_id, delta, reason)
    VALUES (v_order.shop_id, v_order.customer_user_id, _order_id,
            v_order.points_redeemed - v_order.points_earned, 'void');
  END IF;

  UPDATE public.orders
  SET status = 'voided',
      payment_status = 'refunded',
      note = COALESCE(note || ' | ', '') || 'VOID: ' || COALESCE(_reason, ''),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ad_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid,
    ad_type text DEFAULT 'product'::text,
    target_id uuid,
    target_name text,
    target_image text,
    "position" text,
    budget_idr numeric DEFAULT 0,
    duration_days integer DEFAULT 7,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    status text DEFAULT 'payment_pending'::text,
    reject_reason text,
    payment_method text,
    payment_tx_id text,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ad_requests_ad_type_check CHECK ((ad_type = ANY (ARRAY['product'::text, 'shop'::text]))),
    CONSTRAINT ad_requests_position_check CHECK (("position" = ANY (ARRAY['hero_carousel'::text, 'homepage_middle'::text, 'search_top'::text, 'category_top'::text, 'product_sidebar'::text]))),
    CONSTRAINT ad_requests_status_check CHECK ((status = ANY (ARRAY['payment_pending'::text, 'pending'::text, 'active'::text, 'rejected'::text, 'expired'::text, 'paused'::text])))
);


--
-- Name: attendances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    clock_in timestamp with time zone DEFAULT now() NOT NULL,
    clock_out timestamp with time zone,
    duration_minutes integer,
    business_date date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: backup_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_schedules (
    shop_id uuid NOT NULL,
    frequency text DEFAULT 'weekly'::text NOT NULL,
    retention_days integer DEFAULT 30 NOT NULL,
    last_run_at timestamp with time zone,
    next_run_at timestamp with time zone DEFAULT (now() + '1 day'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    subtitle text,
    cta_text text,
    cta_link text,
    image_url text,
    bg_color text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: billing_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_settings (
    id integer DEFAULT 1 NOT NULL,
    bank_name text,
    account_no text,
    account_name text,
    qris_image_url text,
    instructions text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    cron_secret text,
    CONSTRAINT billing_settings_id_check CHECK ((id = 1))
);


--
-- Name: booking_reschedule_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_reschedule_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: booking_review_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_review_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    customer_phone text,
    customer_user_id uuid,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    clicked_at timestamp with time zone
);


--
-- Name: booking_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    body text,
    customer_phone text,
    CONSTRAINT booking_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: booking_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    service_name text NOT NULL,
    slot_date date NOT NULL,
    slot_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    price numeric(12,2),
    deposit_percent integer DEFAULT 0 NOT NULL,
    staff_user_id uuid,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    booking_type text DEFAULT 'service'::text NOT NULL,
    CONSTRAINT booking_slots_booking_type_check CHECK ((booking_type = ANY (ARRAY['service'::text, 'table'::text]))),
    CONSTRAINT booking_slots_deposit_percent_check CHECK (((deposit_percent >= 0) AND (deposit_percent <= 100)))
);


--
-- Name: booking_waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    slot_id uuid,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    party_size integer DEFAULT 1 NOT NULL,
    requested_date date,
    requested_time time without time zone,
    status text DEFAULT 'waiting'::text NOT NULL,
    notified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    queue_number integer,
    served_at timestamp with time zone,
    estimated_wait_minutes integer,
    CONSTRAINT booking_waitlist_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'notified'::text, 'converted'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    customer_email text,
    party_size integer DEFAULT 1 NOT NULL,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    deposit_amount numeric(12,2) DEFAULT 0 NOT NULL,
    deposit_paid boolean DEFAULT false NOT NULL,
    deposit_paid_at timestamp with time zone,
    cancel_token uuid DEFAULT gen_random_uuid() NOT NULL,
    cancelled_at timestamp with time zone,
    cancelled_reason text,
    reminded_h3_at timestamp with time zone,
    reminded_h1_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_id uuid,
    location_address text,
    location_name text,
    location_type text,
    location_fee numeric DEFAULT 0 NOT NULL,
    booking_type text DEFAULT 'service'::text NOT NULL,
    reminded_h1h_at timestamp with time zone,
    feedback_requested_at timestamp with time zone,
    rating_submitted_at timestamp with time zone,
    deposit_required boolean DEFAULT false NOT NULL,
    deposit_status text DEFAULT 'none'::text NOT NULL,
    photographer_id uuid,
    CONSTRAINT bookings_booking_type_check CHECK ((booking_type = ANY (ARRAY['service'::text, 'table'::text]))),
    CONSTRAINT bookings_deposit_status_check CHECK ((deposit_status = ANY (ARRAY['none'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'expired'::text, 'refunded'::text]))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text])))
);


--
-- Name: branding_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branding_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    field text NOT NULL,
    old_value text,
    new_value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bulk_pricing_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bulk_pricing_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    min_qty integer NOT NULL,
    max_qty integer,
    price numeric(10,2) NOT NULL,
    label text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_id uuid NOT NULL,
    component_id uuid NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT bundle_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: business_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    icon_url text,
    banner_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    commission_override numeric(5,4),
    product_attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    enabled_features text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    booking_enabled boolean DEFAULT false NOT NULL,
    booking_type text,
    booking_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    flow_types text[] DEFAULT '{}'::text[] NOT NULL,
    recommended_theme_key text,
    subtypes jsonb DEFAULT '[]'::jsonb NOT NULL,
    CONSTRAINT business_categories_booking_type_check CHECK (((booking_type IS NULL) OR (booking_type = ANY (ARRAY['session'::text, 'rental'::text, 'both'::text]))))
);


--
-- Name: campaign_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    campaign_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shift_id uuid NOT NULL,
    type public.cash_movement_type NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    note text,
    order_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    opened_at timestamp with time zone DEFAULT now() NOT NULL,
    opening_cash numeric DEFAULT 0 NOT NULL,
    closed_by uuid,
    closed_at timestamp with time zone,
    closing_cash numeric,
    expected_cash numeric,
    variance numeric,
    status public.shift_status DEFAULT 'open'::public.shift_status NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kds_station text,
    printer_id uuid
);


--
-- Name: couriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.couriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid,
    name text NOT NULL,
    phone text NOT NULL,
    plate_number text,
    is_active boolean DEFAULT true NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    order_no text NOT NULL,
    business_date date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
    customer_name text,
    subtotal numeric(12,2) DEFAULT 0 NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    payment_method public.payment_method NOT NULL,
    amount_tendered numeric(12,2),
    change_due numeric(12,2) DEFAULT 0 NOT NULL,
    status public.order_status DEFAULT 'completed'::public.order_status NOT NULL,
    cashier_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    channel public.order_channel DEFAULT 'pos'::public.order_channel NOT NULL,
    fulfillment public.fulfillment_type DEFAULT 'dine_in'::public.fulfillment_type NOT NULL,
    customer_user_id uuid,
    customer_phone text,
    delivery_address text,
    delivery_fee numeric DEFAULT 0 NOT NULL,
    scheduled_for timestamp with time zone,
    delivery_zone_id uuid,
    courier_id uuid,
    promo_id uuid,
    promo_code text,
    points_earned integer DEFAULT 0 NOT NULL,
    points_redeemed integer DEFAULT 0 NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    payment_proof_url text,
    paid_at timestamp with time zone,
    shift_id uuid,
    tip_amount numeric DEFAULT 0 NOT NULL,
    service_charge numeric DEFAULT 0 NOT NULL,
    payment_split jsonb DEFAULT '[]'::jsonb NOT NULL,
    commission_rate numeric(5,2) DEFAULT 0,
    commission_amount numeric(14,2) DEFAULT 0,
    net_to_shop numeric(14,2) DEFAULT 0,
    escrow_status text DEFAULT 'none'::text,
    escrow_released_at timestamp with time zone,
    marketplace_order boolean DEFAULT false,
    delivery_proof_url text,
    delivered_at timestamp with time zone,
    shop_voucher_code text,
    shop_voucher_discount numeric DEFAULT 0 NOT NULL,
    platform_voucher_code text,
    platform_voucher_discount numeric DEFAULT 0 NOT NULL,
    tracking_number text,
    courier_name text,
    tracking_url text,
    tracking_set_at timestamp with time zone,
    membership_tier_id uuid,
    membership_discount numeric(14,2) DEFAULT 0 NOT NULL,
    membership_discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    requires_deposit boolean DEFAULT false NOT NULL,
    deposit_amount numeric DEFAULT 0 NOT NULL,
    deposit_paid boolean DEFAULT false NOT NULL,
    deposit_paid_at timestamp with time zone,
    balance_due numeric DEFAULT 0 NOT NULL,
    balance_paid boolean DEFAULT false NOT NULL,
    balance_paid_at timestamp with time zone,
    client_idempotency_key text,
    table_label text,
    order_source text,
    assigned_at timestamp with time zone,
    picked_up_at timestamp with time zone,
    customer_signature_url text,
    order_mode text,
    CONSTRAINT orders_order_mode_check CHECK (((order_mode IS NULL) OR (order_mode = ANY (ARRAY['dine_in'::text, 'takeaway'::text, 'delivery'::text, 'online'::text])))),
    CONSTRAINT orders_order_source_check CHECK (((order_source IS NULL) OR (order_source = ANY (ARRAY['pos'::text, 'qr_table'::text, 'website'::text, 'marketplace'::text]))))
);

ALTER TABLE ONLY public.orders REPLICA IDENTITY FULL;


--
-- Name: courier_earnings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.courier_earnings WITH (security_invoker='true') AS
 SELECT c.id AS courier_id,
    c.user_id,
    c.shop_id,
    date_trunc('day'::text, o.delivered_at) AS day,
    count(*) AS deliveries,
    COALESCE(sum(o.delivery_fee), (0)::numeric) AS gross_fee
   FROM (public.couriers c
     JOIN public.orders o ON ((o.courier_id = c.id)))
  WHERE ((o.status = 'completed'::public.order_status) AND (o.delivered_at IS NOT NULL))
  GROUP BY c.id, c.user_id, c.shop_id, (date_trunc('day'::text, o.delivered_at));


--
-- Name: course_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    course_id uuid NOT NULL,
    user_id uuid NOT NULL,
    certificate_number text DEFAULT ((('CERT-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || substr(replace((gen_random_uuid())::text, '-'::text, ''::text), 1, 8)) NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    pdf_url text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: course_lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_lessons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    video_url text,
    duration_minutes integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_free_preview boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT course_lessons_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: course_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    CONSTRAINT course_modules_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: cron_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cron_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text DEFAULT 'running'::text NOT NULL,
    result jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_message text,
    duration_ms integer
);


--
-- Name: custom_order_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_order_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    total numeric NOT NULL,
    breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    valid_until date,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT custom_order_quotes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: custom_order_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_order_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid,
    customer_name text NOT NULL,
    customer_contact text NOT NULL,
    description text NOT NULL,
    budget_min numeric,
    budget_max numeric,
    deadline date,
    reference_image_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    owner_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id uuid,
    attachment_urls text[] DEFAULT ARRAY[]::text[],
    contract_id uuid
);

ALTER TABLE ONLY public.custom_order_requests REPLICA IDENTITY FULL;


--
-- Name: custom_order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    from_status text,
    to_status text NOT NULL,
    note text,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.custom_order_status_history REPLICA IDENTITY FULL;


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text DEFAULT 'Rumah'::text NOT NULL,
    recipient_name text NOT NULL,
    phone text NOT NULL,
    address_line text NOT NULL,
    notes text,
    latitude numeric,
    longitude numeric,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    tier_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    payment_method text,
    auto_renew boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sessions_total integer,
    sessions_remaining integer,
    CONSTRAINT customer_memberships_status_check CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: customer_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    default_address text,
    default_city text,
    default_postal_code text
);


--
-- Name: customer_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1'::text,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_auto boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    service_name text NOT NULL,
    staff_name text,
    formula text,
    allergies_noted text,
    before_photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    after_photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    notes text,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    type text NOT NULL,
    amount numeric(14,2) NOT NULL,
    balance_after numeric(14,2) NOT NULL,
    ref_order_id uuid,
    ref_topup_id uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_wallet_transactions_type_check CHECK ((type = ANY (ARRAY['topup'::text, 'bonus'::text, 'spend'::text, 'refund'::text, 'adjustment'::text])))
);


--
-- Name: customer_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    balance numeric(14,2) DEFAULT 0 NOT NULL,
    total_topped_up numeric(14,2) DEFAULT 0 NOT NULL,
    total_spent numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT customer_wallets_balance_check CHECK ((balance >= (0)::numeric))
);


--
-- Name: delivery_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_settings (
    shop_id uuid NOT NULL,
    mode public.delivery_mode DEFAULT 'flat'::public.delivery_mode NOT NULL,
    base_fee numeric DEFAULT 0 NOT NULL,
    free_above numeric,
    min_order numeric DEFAULT 0 NOT NULL,
    pickup_enabled boolean DEFAULT true NOT NULL,
    delivery_enabled boolean DEFAULT true NOT NULL,
    open_time time without time zone,
    close_time time without time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    min_eta_minutes integer DEFAULT 30 NOT NULL,
    max_eta_minutes integer DEFAULT 60 NOT NULL
);


--
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    fee numeric DEFAULT 0 NOT NULL,
    area_note text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    min_eta_minutes integer DEFAULT 30 NOT NULL,
    max_eta_minutes integer DEFAULT 60 NOT NULL
);


--
-- Name: domain_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    old_domain text,
    new_domain text,
    action text NOT NULL,
    actor_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_blacklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_blacklist (
    domain text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: domain_verify_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.domain_verify_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    actor_id uuid,
    domain text,
    result text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expiry_reminder_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_reminder_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audience text NOT NULL,
    days_before integer NOT NULL,
    channels text[] DEFAULT ARRAY['inapp'::text] NOT NULL,
    template_subject text NOT NULL,
    template_body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expiry_reminder_rules_audience_check CHECK ((audience = ANY (ARRAY['trial'::text, 'paid'::text]))),
    CONSTRAINT expiry_reminder_rules_days_before_check CHECK (((days_before >= 0) AND (days_before <= 90)))
);


--
-- Name: expiry_reminder_shop_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_reminder_shop_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    audience text NOT NULL,
    days_before integer NOT NULL,
    channels text[] DEFAULT ARRAY['inapp'::text] NOT NULL,
    template_subject text NOT NULL,
    template_body text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expiry_reminder_shop_rules_audience_check CHECK ((audience = ANY (ARRAY['trial'::text, 'paid'::text]))),
    CONSTRAINT expiry_reminder_shop_rules_days_before_check CHECK (((days_before >= 0) AND (days_before <= 90)))
);


--
-- Name: expiry_reminder_shop_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expiry_reminder_shop_settings (
    shop_id uuid NOT NULL,
    override_schedule boolean DEFAULT false NOT NULL,
    override_rules boolean DEFAULT false NOT NULL,
    send_hour_local integer DEFAULT 9 NOT NULL,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    max_per_shop_per_day integer DEFAULT 2 NOT NULL,
    on_expiry_action text DEFAULT 'grace_then_suspend'::text NOT NULL,
    grace_days integer DEFAULT 3 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT expiry_reminder_shop_settings_grace_days_check CHECK (((grace_days >= 0) AND (grace_days <= 90))),
    CONSTRAINT expiry_reminder_shop_settings_max_per_shop_per_day_check CHECK (((max_per_shop_per_day >= 1) AND (max_per_shop_per_day <= 20))),
    CONSTRAINT expiry_reminder_shop_settings_on_expiry_action_check CHECK ((on_expiry_action = ANY (ARRAY['none'::text, 'suspend'::text, 'grace_then_suspend'::text]))),
    CONSTRAINT expiry_reminder_shop_settings_send_hour_local_check CHECK (((send_hour_local >= 0) AND (send_hour_local <= 23)))
);


--
-- Name: features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.features (
    key text NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'general'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flash_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flash_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    flash_price numeric(10,2) NOT NULL,
    original_price numeric(10,2) NOT NULL,
    stock_limit integer,
    stock_sold integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: flyers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flyers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    image_url text NOT NULL,
    file_url text,
    linked_id uuid,
    linked_type text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fnb_combos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fnb_combos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    image_url text,
    combo_price numeric(12,2) NOT NULL,
    original_price numeric(12,2) DEFAULT 0 NOT NULL,
    discount_pct numeric(5,2) DEFAULT 0,
    is_active boolean DEFAULT true NOT NULL,
    tag text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: freelance_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.freelance_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    client_name text NOT NULL,
    client_phone text,
    client_email text,
    project_name text NOT NULL,
    project_description text NOT NULL,
    total_value numeric(12,2) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    deliverables text NOT NULL,
    revision_count integer DEFAULT 2 NOT NULL,
    payment_terms text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    signed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    signature_url text,
    signed_by_name text,
    signed_ip text,
