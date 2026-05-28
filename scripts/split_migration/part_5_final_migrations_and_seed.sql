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

INSERT INTO public.icd10_codes VALUES ('J00', 'Nasofaringitis akut (common cold)', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J02.9', 'Faringitis akut, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J03.9', 'Tonsilitis akut, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J06.9', 'Infeksi saluran napas atas akut', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J11', 'Influenza, virus tidak teridentifikasi', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J20.9', 'Bronkitis akut, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J45.9', 'Asma, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('A09', 'Diare & gastroenteritis (dugaan infeksi)', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K29.7', 'Gastritis, tidak spesifik', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K30', 'Dispepsia fungsional', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K59.0', 'Konstipasi', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('B34.9', 'Infeksi virus, tidak spesifik', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('A01.0', 'Demam tifoid', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('A91', 'Demam berdarah dengue (DBD)', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('B54', 'Malaria, tidak spesifik', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('A15.0', 'TB paru, dengan konfirmasi bakteriologis', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('R50.9', 'Demam, tidak spesifik', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R51', 'Sefalgia (sakit kepala)', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R10.4', 'Nyeri perut, tidak spesifik', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R11', 'Mual & muntah', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R05', 'Batuk', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R07.4', 'Nyeri dada, tidak spesifik', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R42', 'Pusing & vertigo', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('I10', 'Hipertensi esensial', 'Kardiovaskular');
INSERT INTO public.icd10_codes VALUES ('I20.9', 'Angina pektoris, tidak spesifik', 'Kardiovaskular');
INSERT INTO public.icd10_codes VALUES ('E11.9', 'Diabetes melitus tipe 2, tanpa komplikasi', 'Endokrin');
INSERT INTO public.icd10_codes VALUES ('E78.5', 'Hiperlipidemia, tidak spesifik', 'Endokrin');
INSERT INTO public.icd10_codes VALUES ('E03.9', 'Hipotiroidisme, tidak spesifik', 'Endokrin');
INSERT INTO public.icd10_codes VALUES ('N39.0', 'Infeksi saluran kemih, lokasi tidak spesifik', 'Urogenital');
INSERT INTO public.icd10_codes VALUES ('N76.0', 'Vaginitis akut', 'Urogenital');
INSERT INTO public.icd10_codes VALUES ('L20.9', 'Dermatitis atopik', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('L30.9', 'Dermatitis, tidak spesifik', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('L50.9', 'Urtikaria, tidak spesifik', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('L08.9', 'Infeksi kulit dan jaringan lunak', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('M54.5', 'Low back pain', 'Muskuloskeletal');
INSERT INTO public.icd10_codes VALUES ('M25.5', 'Nyeri sendi', 'Muskuloskeletal');
INSERT INTO public.icd10_codes VALUES ('M79.1', 'Mialgia', 'Muskuloskeletal');
INSERT INTO public.icd10_codes VALUES ('H10.9', 'Konjungtivitis, tidak spesifik', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('H66.9', 'Otitis media, tidak spesifik', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('H81.1', 'Vertigo paroksismal jinak (BPPV)', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('Z00.0', 'Pemeriksaan kesehatan umum', 'Preventif');
INSERT INTO public.icd10_codes VALUES ('Z23', 'Imunisasi', 'Preventif');
INSERT INTO public.icd10_codes VALUES ('F41.1', 'Gangguan cemas menyeluruh', 'Psikiatri');
INSERT INTO public.icd10_codes VALUES ('F32.9', 'Episode depresi, tidak spesifik', 'Psikiatri');


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wallet_topup_presets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Seed default business categories (idempotent)
INSERT INTO public.business_categories (slug, name, description, is_active, sort_order)
VALUES
  ('fnb', 'Makanan & Minuman', 'Restoran, kafe, warung, kedai kopi, katering', true, 1),
  ('retail', 'Retail / Toko', 'Toko fisik, fashion, aksesoris, kelontong', true, 2),
  ('jasa', 'Jasa Umum', 'Layanan profesional dan jasa custom', true, 3),
  ('rental', 'Rental / Sewa', 'Sewa kendaraan, alat, kostum, properti', true, 4),
  ('kursus', 'Kursus / Edukasi', 'Les, pelatihan, workshop, bimbel', true, 5),
  ('salon', 'Salon & Beauty', 'Salon, barbershop, spa, nail art', true, 6),
  ('klinik', 'Klinik & Kesehatan', 'Klinik dokter, fisioterapi, konsultasi kesehatan', true, 7),
  ('studio-foto', 'Studio Foto', 'Studio foto, pas foto, dokumentasi event', true, 8),
  ('travel', 'Travel & Tour', 'Paket wisata, open trip, tiket', true, 9),
  ('custom-order', 'Custom Order', 'Pesanan custom dengan DP & brief', true, 10),
  ('lainnya', 'Lainnya', 'Kategori umum untuk usaha lain', true, 99)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true;

-- Reload again after seed
NOTIFY pgrst, 'reload schema';

-- 1. booking_waitlist
DROP POLICY IF EXISTS "waitlist_public_read_anon" ON public.booking_waitlist;

CREATE OR REPLACE FUNCTION public.get_public_waitlist_summary(_shop_id uuid)
RETURNS TABLE (
  id uuid,
  queue_number integer,
  party_size integer,
  status text,
  estimated_wait_minutes integer,
  created_at timestamptz,
  served_at timestamptz,
  requested_date date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, queue_number, party_size, status, estimated_wait_minutes,
         created_at, served_at, requested_date
  FROM public.booking_waitlist
  WHERE shop_id = _shop_id
    AND status IN ('waiting','notified')
    AND (requested_date = CURRENT_DATE OR requested_date IS NULL)
  ORDER BY created_at ASC
$$;
GRANT EXECUTE ON FUNCTION public.get_public_waitlist_summary(uuid) TO anon, authenticated;

-- 2. booking_review_requests
DROP POLICY IF EXISTS "rrq_read" ON public.booking_review_requests;

CREATE POLICY "rrq_customer_self_read"
  ON public.booking_review_requests FOR SELECT
  TO authenticated
  USING (customer_user_id = auth.uid());

CREATE POLICY "rrq_owner_read"
  ON public.booking_review_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.shops s ON s.id = b.shop_id
    WHERE b.id = booking_review_requests.id
      AND s.owner_id = auth.uid()
  ));

-- 3. course_certificates (course = menu_items row)
DROP POLICY IF EXISTS "public verify cert" ON public.course_certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(_cert_number text)
RETURNS TABLE (
  certificate_number text,
  course_title text,
  shop_name text,
  issued_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    cc.certificate_number,
    mi.name AS course_title,
    s.name AS shop_name,
    cc.issued_at
  FROM public.course_certificates cc
  LEFT JOIN public.menu_items mi ON mi.id = cc.course_id
  LEFT JOIN public.shops s ON s.id = cc.shop_id
  WHERE cc.certificate_number = _cert_number
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 4. shops.custom_domain_verify_token
REVOKE SELECT (custom_domain_verify_token) ON public.shops FROM anon;

DROP POLICY IF EXISTS "public read rental-inspections" ON storage.objects;
DROP POLICY IF EXISTS "public read treatment-photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_contract_signatures" ON storage.objects;

CREATE POLICY "owner_list_rental_inspections"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rental-inspections'
    AND (storage.foldername(name))[1] IN (
      SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_list_treatment_photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'treatment-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_list_contract_signatures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()
    )
  );
INSERT INTO public.business_categories (
  slug,
  name,
  description,
  sort_order,
  is_active,
  enabled_features,
  flow_types,
  booking_enabled,
  booking_type,
  recommended_theme_key,
  subtypes
) VALUES
(
  'fnb',
  'F&B',
  'Warung, kafe, bakery, katering, dan usaha makanan minuman lainnya.',
  1,
  true,
  ARRAY['POS','MENU','KDS','TABLES','INVENTORY','VARIANTS','RECIPES','COMBO_BUILDER','ORDER_MODE']::text[],
  ARRAY['T1']::text[],
  false,
  null,
  'kuliner-warm',
  '[{"slug":"warung","label":"Warung"},{"slug":"kafe","label":"Kafe"},{"slug":"bakery","label":"Bakery"},{"slug":"katering","label":"Katering"}]'::jsonb
),
(
  'retail',
  'Retail',
  'Toko pakaian, sembako, aksesoris, elektronik, dan penjualan produk fisik.',
  2,
  true,
  ARRAY['POS','MENU','INVENTORY','VARIANTS','BUNDLES','PRODUCT_RETURNS','VARIANT_MATRIX']::text[],
  ARRAY['T1']::text[],
  false,
  null,
  'retail-bold',
  '[{"slug":"fashion","label":"Fashion"},{"slug":"sembako","label":"Sembako"},{"slug":"aksesoris","label":"Aksesoris"},{"slug":"elektronik","label":"Elektronik"}]'::jsonb
),
(
  'jasa',
  'Jasa',
  'Usaha jasa umum seperti servis, bengkel ringan, perbaikan, dan layanan profesional.',
  3,
  true,
  ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS','JOB_DELIVERABLES']::text[],
  ARRAY['T3','T5']::text[],
  true,
  'session',
  'service-clean',
  '[{"slug":"servis","label":"Servis"},{"slug":"konsultasi","label":"Konsultasi"},{"slug":"perbaikan","label":"Perbaikan"}]'::jsonb
),
(
  'rental',
  'Rental',
  'Sewa kendaraan, alat, perlengkapan acara, dan unit rental lainnya.',
  4,
  true,
  ARRAY['RENTAL','RENTAL_AVAILABILITY','RENTAL_DEPOSIT','RENTAL_FINES','RENTAL_CHECKLIST','RENTAL_TNC','RENTAL_EXTEND','RENTAL_UNIT_READY','RENTAL_KYC','RENTAL_INSPECTIONS']::text[],
  ARRAY['T4']::text[],
  true,
  'rental',
  'rental-bold',
  '[{"slug":"kendaraan","label":"Kendaraan"},{"slug":"alat","label":"Alat"},{"slug":"properti-acara","label":"Properti Acara"}]'::jsonb
),
(
  'kursus',
  'Kursus',
  'Kelas privat, bimbel, kursus online, dan pelatihan berjadwal.',
  5,
  true,
  ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','KURSUS','LESSON_PROGRESS','COURSE_CERTIFICATES','SESSION_MEMBERSHIP']::text[],
  ARRAY['T2','T3']::text[],
  true,
  'session',
  'course-bright',
  '[{"slug":"bimbel","label":"Bimbel"},{"slug":"kursus-online","label":"Kursus Online"},{"slug":"les-privat","label":"Les Privat"}]'::jsonb
),
(
  'salon',
  'Salon & Barbershop',
  'Salon kecantikan, barbershop, nail studio, dan treatment berjadwal.',
  6,
  true,
  ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','ANTRIAN','WAITLIST','CUSTOMER_TREATMENTS','SESSION_MEMBERSHIP']::text[],
  ARRAY['T3']::text[],
  true,
  'session',
  'beauty-soft',
  '[{"slug":"salon","label":"Salon"},{"slug":"barbershop","label":"Barbershop"},{"slug":"nail-art","label":"Nail Art"},{"slug":"spa","label":"Spa"}]'::jsonb
),
(
  'klinik',
  'Klinik',
  'Klinik umum, klinik kecantikan, praktik mandiri, dan layanan kesehatan.',
  7,
  true,
  ARRAY['BOOKING','STAFF_PICKER','ANTRIAN','WAITLIST','ANAMNESIS','MEDICAL_INVOICE','PATIENT_RECORDS','MEDICATIONS','PRESCRIPTIONS']::text[],
  ARRAY['T3']::text[],
  true,
  'session',
  'medical-clean',
  '[{"slug":"klinik-umum","label":"Klinik Umum"},{"slug":"klinik-kecantikan","label":"Klinik Kecantikan"},{"slug":"dokter-gigi","label":"Dokter Gigi"}]'::jsonb
),
(
  'studio-foto',
  'Studio Foto',
  'Studio foto keluarga, wisuda, produk, dan layanan dokumentasi.',
  8,
  true,
  ARRAY['BOOKING','SERVICE_BUNDLES','PORTFOLIO','STUDIO_PACKAGES','STUDIO_DELIVERY','STUDIO_BRIEF','STUDIO_ADDONS','STUDIO_GALLERY']::text[],
  ARRAY['T3']::text[],
  true,
  'session',
  'studio-editorial',
  '[{"slug":"foto-keluarga","label":"Foto Keluarga"},{"slug":"foto-produk","label":"Foto Produk"},{"slug":"wisuda","label":"Wisuda"}]'::jsonb
),
(
  'travel',
  'Travel',
  'Agen travel, tour, open trip, dan penjualan paket perjalanan.',
  9,
  true,
  ARRAY['UMROH_PACKAGES','UMROH_FACILITIES','UMROH_FAQ','FLYERS','TESTIMONIALS','LEADS','ABOUT_PAGE','TRAVEL_MANIFEST','TRAVEL_INSTALLMENTS','TRAVEL_ITINERARY','JAMAAH_DOCUMENTS']::text[],
  ARRAY['T1']::text[],
  false,
  null,
  'travel-vivid',
  '[{"slug":"open-trip","label":"Open Trip"},{"slug":"tour","label":"Tour"},{"slug":"umroh","label":"Umroh"}]'::jsonb
),
(
  'custom-order',
  'Custom Order',
  'Produksi by order, jasa desain, percetakan, dan pesanan sesuai brief.',
  10,
  true,
  ARRAY['CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS','JOB_DELIVERABLES','PRE_ORDERS']::text[],
  ARRAY['T5']::text[],
  false,
  null,
  'custom-craft',
  '[{"slug":"desain","label":"Desain"},{"slug":"percetakan","label":"Percetakan"},{"slug":"produksi","label":"Produksi"}]'::jsonb
),
(
  'lainnya',
  'Lainnya',
  'Kategori umum untuk usaha yang belum masuk kategori khusus.',
  11,
  true,
  ARRAY['POS','MENU','BOOKING','CUSTOM_ORDER']::text[],
  ARRAY['T1','T3','T5']::text[],
  false,
  null,
  'generic-flex',
  '[]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  enabled_features = EXCLUDED.enabled_features,
  flow_types = EXCLUDED.flow_types,
  booking_enabled = EXCLUDED.booking_enabled,
  booking_type = EXCLUDED.booking_type,
  recommended_theme_key = EXCLUDED.recommended_theme_key,
  subtypes = EXCLUDED.subtypes,
  updated_at = now();-- Allow owner to insert their own owner role on a shop they own,
-- and allow owners to add staff roles for their shop.
CREATE POLICY "user_roles_owner_insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  shop_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = user_roles.shop_id
      AND s.owner_id = auth.uid()
  )
);

-- Allow owner to update staff roles in their shop (e.g. is_active toggles)
CREATE POLICY "user_roles_owner_update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  shop_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = user_roles.shop_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  shop_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = user_roles.shop_id
      AND s.owner_id = auth.uid()
  )
);DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_review_requests
    ADD CONSTRAINT booking_review_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_reviews
    ADD CONSTRAINT booking_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_slots
    ADD CONSTRAINT booking_slots_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_waitlist
    ADD CONSTRAINT booking_waitlist_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.studio_locations(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.studio_photographers(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE RESTRICT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bulk_pricing_rules
    ADD CONSTRAINT bulk_pricing_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bundle_items
    ADD CONSTRAINT bundle_items_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.campaign_recipients
    ADD CONSTRAINT campaign_recipients_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.cash_movements
    ADD CONSTRAINT cash_movements_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.cash_shifts(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_business_category_id_fkey FOREIGN KEY (business_category_id) REFERENCES public.business_categories(id)'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shops
    ADD CONSTRAINT coffee_shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.course_certificates
    ADD CONSTRAINT course_certificates_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.course_lessons
    ADD CONSTRAINT course_lessons_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.course_modules(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.course_modules
    ADD CONSTRAINT course_modules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_order_requests(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.custom_order_quotes
    ADD CONSTRAINT custom_order_quotes_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.freelance_contracts(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.custom_order_requests
    ADD CONSTRAINT custom_order_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.custom_order_status_history
    ADD CONSTRAINT custom_order_status_history_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.custom_order_requests(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.customer_memberships
    ADD CONSTRAINT customer_memberships_tier_id_fkey FOREIGN KEY (tier_id) REFERENCES public.shop_membership_tiers(id) ON DELETE RESTRICT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.customer_treatments
    ADD CONSTRAINT customer_treatments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.customer_wallet_transactions
    ADD CONSTRAINT customer_wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.customer_wallets(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.customer_wallets
    ADD CONSTRAINT customer_wallets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.domain_audit
    ADD CONSTRAINT domain_audit_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.expiry_reminder_shop_rules
    ADD CONSTRAINT expiry_reminder_shop_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.expiry_reminder_shop_settings
    ADD CONSTRAINT expiry_reminder_shop_settings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.flash_sales
    ADD CONSTRAINT flash_sales_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.flyers
    ADD CONSTRAINT flyers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.fnb_combos
    ADD CONSTRAINT fnb_combos_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.freelance_contracts
    ADD CONSTRAINT freelance_contracts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_default_supplier_id_fkey FOREIGN KEY (default_supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_custom_order_id_fkey FOREIGN KEY (custom_order_id) REFERENCES public.custom_order_requests(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.job_deliverables
    ADD CONSTRAINT job_deliverables_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.course_lessons(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.marketplace_carts(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.marketplace_cart_items
    ADD CONSTRAINT marketplace_cart_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.marketplace_carts
    ADD CONSTRAINT marketplace_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.menu_item_options
    ADD CONSTRAINT menu_item_options_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.menu_item_option_groups(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.menu_item_variants
    ADD CONSTRAINT menu_item_variants_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.open_bills
    ADD CONSTRAINT open_bills_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.order_audit_log
    ADD CONSTRAINT order_audit_log_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_membership_tier_id_fkey FOREIGN KEY (membership_tier_id) REFERENCES public.shop_membership_tiers(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.outlet_couriers
    ADD CONSTRAINT outlet_couriers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.outlets
    ADD CONSTRAINT outlets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.page_layout_versions
    ADD CONSTRAINT page_layout_versions_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.page_layouts(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.page_layouts
    ADD CONSTRAINT page_layouts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.parked_carts
    ADD CONSTRAINT parked_carts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.patient_records
    ADD CONSTRAINT patient_records_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_records(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.patient_visits
    ADD CONSTRAINT patient_visits_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_feature_key_fkey FOREIGN KEY (feature_key) REFERENCES public.features(key) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id)'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_invoices
    ADD CONSTRAINT plan_invoices_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id)'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_subscriptions
    ADD CONSTRAINT plan_subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.plan_themes
    ADD CONSTRAINT plan_themes_theme_key_fkey FOREIGN KEY (theme_key) REFERENCES public.themes(key) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.platform_voucher_redemptions
    ADD CONSTRAINT platform_voucher_redemptions_voucher_id_fkey FOREIGN KEY (voucher_id) REFERENCES public.platform_vouchers(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.po_audit_log
    ADD CONSTRAINT po_audit_log_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.pos_audit_log
    ADD CONSTRAINT pos_audit_log_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patient_records(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.patient_visits(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_attribute_defs
    ADD CONSTRAINT product_attribute_defs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_qa
    ADD CONSTRAINT product_qa_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_returns
    ADD CONSTRAINT product_returns_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.product_upsell_suggestions
    ADD CONSTRAINT product_upsell_suggestions_suggested_id_fkey FOREIGN KEY (suggested_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.rental_bookings
    ADD CONSTRAINT rental_bookings_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.rental_units(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.rental_bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.rental_inspections
    ADD CONSTRAINT rental_inspections_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.rental_units
    ADD CONSTRAINT rental_units_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.restock_subscribers
    ADD CONSTRAINT restock_subscribers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.sales_offerings
    ADD CONSTRAINT sales_offerings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.service_bundle_items
    ADD CONSTRAINT service_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.service_bundles(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.service_bundles
    ADD CONSTRAINT service_bundles_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_about
    ADD CONSTRAINT shop_about_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.shop_chats(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_chat_messages
    ADD CONSTRAINT shop_chat_messages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_chats
    ADD CONSTRAINT shop_chats_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_membership_tiers
    ADD CONSTRAINT shop_membership_tiers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_portfolio
    ADD CONSTRAINT shop_portfolio_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_size_charts
    ADD CONSTRAINT shop_size_charts_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_verifications
    ADD CONSTRAINT shop_verifications_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_vouchers
    ADD CONSTRAINT shop_vouchers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shop_wallets
    ADD CONSTRAINT shop_wallets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.staff_audit_logs
    ADD CONSTRAINT staff_audit_logs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_outlet_id_fkey FOREIGN KEY (outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.staff_members
    ADD CONSTRAINT staff_members_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.stock_opname_items
    ADD CONSTRAINT stock_opname_items_stock_opname_id_fkey FOREIGN KEY (stock_opname_id) REFERENCES public.stock_opnames(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_photographer_id_fkey FOREIGN KEY (photographer_id) REFERENCES public.studio_photographers(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.studio_galleries
    ADD CONSTRAINT studio_galleries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.studio_gallery_photos
    ADD CONSTRAINT studio_gallery_photos_gallery_id_fkey FOREIGN KEY (gallery_id) REFERENCES public.studio_galleries(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.studio_locations
    ADD CONSTRAINT studio_locations_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.studio_packages
    ADD CONSTRAINT studio_packages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.studio_photographers
    ADD CONSTRAINT studio_photographers_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_jamaah_id_fkey FOREIGN KEY (jamaah_id) REFERENCES public.travel_jamaah_manifest(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_installments
    ADD CONSTRAINT travel_installments_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_itineraries
    ADD CONSTRAINT travel_itineraries_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_jamaah_id_fkey FOREIGN KEY (jamaah_id) REFERENCES public.travel_jamaah_manifest(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_jamaah_documents
    ADD CONSTRAINT travel_jamaah_documents_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.umroh_packages(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.travel_jamaah_manifest
    ADD CONSTRAINT travel_jamaah_manifest_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.umroh_facilities
    ADD CONSTRAINT umroh_facilities_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.umroh_faqs
    ADD CONSTRAINT umroh_faqs_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.umroh_packages
    ADD CONSTRAINT umroh_packages_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_default_outlet_id_fkey FOREIGN KEY (default_outlet_id) REFERENCES public.outlets(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wallet_topup_presets
    ADD CONSTRAINT wallet_topup_presets_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_preset_id_fkey FOREIGN KEY (preset_id) REFERENCES public.wallet_topup_presets(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wallet_topups
    ADD CONSTRAINT wallet_topups_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.wishlists
    ADD CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;-- Create missing storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('booking-documents', 'booking-documents', false),
  ('custom-deliveries', 'custom-deliveries', false),
  ('digital-products', 'digital-products', false),
  ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- shop-assets: public read, owner write (folder = shop_id, owner determined via shops.owner_id)
CREATE POLICY "shop-assets public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');

CREATE POLICY "shop-assets owner write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "shop-assets owner update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'shop-assets'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "shop-assets owner delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'shop-assets'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

-- Private buckets: user folder = auth.uid()
CREATE POLICY "booking-documents user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "booking-documents user write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "booking-documents user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "booking-documents user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "custom-deliveries user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "custom-deliveries user write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "custom-deliveries user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "custom-deliveries user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "digital-products user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "digital-products user write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "digital-products user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "digital-products user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);-- Alias views untuk kompatibilitas dengan function/script lama yang masih
-- mereferensi nama tabel sebelumnya. Updatable views (single-table simple SELECT)
-- otomatis mendukung INSERT/UPDATE/DELETE di PostgreSQL.

DROP VIEW IF EXISTS public.coffee_shops CASCADE;
CREATE VIEW public.coffee_shops AS SELECT * FROM public.shops;
ALTER VIEW public.coffee_shops OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_shops TO authenticated, service_role;
GRANT SELECT ON public.coffee_shops TO anon;

DROP VIEW IF EXISTS public.shops__bootstrap_placeholder CASCADE;
CREATE VIEW public.shops__bootstrap_placeholder AS SELECT * FROM public.shops;
ALTER VIEW public.shops__bootstrap_placeholder OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops__bootstrap_placeholder TO authenticated, service_role;
GRANT SELECT ON public.shops__bootstrap_placeholder TO anon;ALTER VIEW public.coffee_shops SET (security_invoker = true);
ALTER VIEW public.shops__bootstrap_placeholder SET (security_invoker = true);CREATE OR REPLACE VIEW public.coffee_shops
WITH (security_invoker = true) AS
SELECT * FROM public.shops;

ALTER VIEW public.coffee_shops OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coffee_shops TO authenticated, service_role;
GRANT SELECT ON public.coffee_shops TO anon;

CREATE OR REPLACE VIEW public.shops__bootstrap_placeholder
WITH (security_invoker = true) AS
SELECT * FROM public.shops;

ALTER VIEW public.shops__bootstrap_placeholder OWNER TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops__bootstrap_placeholder TO authenticated, service_role;
GRANT SELECT ON public.shops__bootstrap_placeholder TO anon;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(_from timestamp with time zone, _to timestamp with time zone)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'gmv', COALESCE(SUM(o.total), 0),
    'commission', COALESCE(SUM(o.commission_amount), 0),
    'net_to_shops', COALESCE(SUM(o.net_to_shop), 0),
    'orders', COUNT(*),
    'aov', COALESCE(AVG(o.total), 0),
    'take_rate', CASE WHEN COALESCE(SUM(o.total),0) > 0
                      THEN ROUND((COALESCE(SUM(o.commission_amount),0) / SUM(o.total) * 100)::numeric, 2)
                      ELSE 0 END,
    'shops_active', COUNT(DISTINCT o.shop_id),
    'customers', COUNT(DISTINCT o.customer_user_id)
  )
  INTO v_result
  FROM public.orders o
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(_from timestamp with time zone, _to timestamp with time zone)
RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    (o.created_at AT TIME ZONE 'Asia/Jakarta')::date AS day,
    COALESCE(SUM(o.total), 0)::numeric AS gmv,
    COALESCE(SUM(o.commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM public.orders o
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY 1
  ORDER BY 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(_from timestamp with time zone, _to timestamp with time zone, _limit integer DEFAULT 10)
RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    o.shop_id,
    s.name AS shop_name,
    COALESCE(SUM(o.total), 0)::numeric AS gmv,
    COALESCE(SUM(o.commission_amount), 0)::numeric AS commission,
    COUNT(*)::bigint AS orders
  FROM public.orders o
  JOIN public.shops s ON s.id = o.shop_id
  WHERE o.marketplace_order = true
    AND o.status NOT IN ('cancelled', 'pending')
    AND o.created_at >= _from
    AND o.created_at <= _to
  GROUP BY o.shop_id, s.name
  ORDER BY gmv DESC
  LIMIT GREATEST(COALESCE(_limit, 10), 1);
END;
$function$;
-- 1) create_plan_invoice: builds invoice from current plans row (live pricing)
CREATE OR REPLACE FUNCTION public.create_plan_invoice(_plan_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_shop_id uuid;
  v_plan plans%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_no text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  SELECT id INTO v_shop_id FROM shops WHERE owner_id = v_caller LIMIT 1;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no_shop'; END IF;

  SELECT * INTO v_plan FROM plans WHERE code = _plan_code AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found_or_inactive'; END IF;

  v_invoice_no := 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO plan_invoices (shop_id, plan_id, invoice_no, amount_idr, status, payment_method)
  VALUES (v_shop_id, v_plan.id, v_invoice_no, v_plan.price_idr, 'pending', 'manual')
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_plan_invoice(text) TO authenticated;

-- 2) approve_plan_invoice: use actual plan code, sync plan_subscriptions
CREATE OR REPLACE FUNCTION public.approve_plan_invoice(_invoice_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO v_base
    FROM shops WHERE id = v_inv.shop_id;
  v_new_expiry := v_base + (v_plan.duration_days || ' days')::interval;

  UPDATE plan_invoices
    SET status = 'paid', paid_at = now(),
        reviewed_by = v_caller, reviewed_at = now(),
        updated_at = now()
    WHERE id = _invoice_id;

  UPDATE shops
    SET plan = v_plan.code,
        plan_expires_at = v_new_expiry,
        updated_at = now()
    WHERE id = v_inv.shop_id;

  -- Sync subscription record (upsert)
  INSERT INTO plan_subscriptions (shop_id, plan_id, plan_code, status, billing_interval, next_billing_at, amount_idr, last_invoice_id, last_charge_at)
  VALUES (v_inv.shop_id, v_plan.id, v_plan.code, 'active', 'monthly', v_new_expiry, v_plan.price_idr, _invoice_id, now())
  ON CONFLICT (shop_id) DO UPDATE
    SET plan_id = EXCLUDED.plan_id,
        plan_code = EXCLUDED.plan_code,
        amount_idr = EXCLUDED.amount_idr,
        next_billing_at = EXCLUDED.next_billing_at,
        last_invoice_id = EXCLUDED.last_invoice_id,
        last_charge_at = EXCLUDED.last_charge_at,
        status = 'active',
        failure_count = 0,
        updated_at = now();

  RETURN jsonb_build_object('shop_id', v_inv.shop_id, 'plan_code', v_plan.code, 'plan_expires_at', v_new_expiry);
END;
$$;

-- 3) admin_set_shop_plan: accept any active plan code, sync subscription
CREATE OR REPLACE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  old_plan text;
  old_exp timestamptz;
  v_plan plans%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Allow 'free' as a non-catalog reset, else require a matching active plan
  IF _plan <> 'free' THEN
    SELECT * INTO v_plan FROM plans WHERE code = _plan AND is_active = true;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_plan'; END IF;
  END IF;

  SELECT plan, plan_expires_at INTO old_plan, old_exp FROM shops WHERE id = _shop_id;

  UPDATE shops
    SET plan = _plan,
        plan_expires_at = CASE WHEN _plan = 'free' THEN NULL ELSE _expires_at END,
        updated_at = now()
    WHERE id = _shop_id;

  -- Sync subscription mirror
  IF _plan = 'free' THEN
    UPDATE plan_subscriptions
      SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE shop_id = _shop_id;
  ELSE
    INSERT INTO plan_subscriptions (shop_id, plan_id, plan_code, status, billing_interval, next_billing_at, amount_idr)
    VALUES (_shop_id, v_plan.id, v_plan.code, 'active', 'monthly', COALESCE(_expires_at, now() + (v_plan.duration_days || ' days')::interval), v_plan.price_idr)
    ON CONFLICT (shop_id) DO UPDATE
      SET plan_id = EXCLUDED.plan_id,
          plan_code = EXCLUDED.plan_code,
          amount_idr = EXCLUDED.amount_idr,
          next_billing_at = EXCLUDED.next_billing_at,
          status = 'active',
          updated_at = now();
  END IF;

  INSERT INTO system_audit (event_type, shop_id, actor_id, payload, notes)
  VALUES ('plan_manual_set', _shop_id, auth.uid(),
    jsonb_build_object('old_plan', old_plan, 'old_expires_at', old_exp, 'new_plan', _plan, 'new_expires_at', _expires_at),
    'super-admin manual override');
END;
$$;
-- Backward-compat aliases & missing tables/columns for admin pages

-- 1. orders: add generated alias columns for legacy code (total_price, total_amount, order_number, commission_fee)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS order_number text GENERATED ALWAYS AS (order_no) STORED,
  ADD COLUMN IF NOT EXISTS commission_fee numeric(14,2) GENERATED ALWAYS AS (COALESCE(commission_amount, 0)) STORED;

-- 2. product_reviews: add columns the moderation page expects
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS body text GENERATED ALWAYS AS (comment) STORED;

-- 3. disputes: minimal table so the count widget works
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid,
  status text NOT NULL DEFAULT 'open',
  reason text,
  description text,
  refund_amount numeric(14,2),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_disputes" ON public.disputes;
CREATE POLICY "admin_manage_disputes" ON public.disputes
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "shop_owner_view_disputes" ON public.disputes;
CREATE POLICY "shop_owner_view_disputes" ON public.disputes
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = disputes.shop_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "customer_view_own_disputes" ON public.disputes;
CREATE POLICY "customer_view_own_disputes" ON public.disputes
  FOR SELECT USING (auth.uid() = user_id);

-- 4. webhook_logs: minimal table so the failure-count widget works
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb,
  response jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_webhook_logs" ON public.webhook_logs;
CREATE POLICY "admin_view_webhook_logs" ON public.webhook_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "service_role_insert_webhook_logs" ON public.webhook_logs;
CREATE POLICY "service_role_insert_webhook_logs" ON public.webhook_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON public.webhook_logs(status, created_at DESC);
CREATE OR REPLACE FUNCTION public.admin_buyer_segments()
RETURNS TABLE(total bigint, active bigint, inactive bigint, new_buyers bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH buyers AS (
    SELECT DISTINCT u.id, u.created_at
    FROM auth.users u
    WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'customer')
       OR EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_user_id = u.id)
  ),
  last_order AS (
    SELECT customer_user_id, max(created_at) AS last_at
    FROM public.orders
    WHERE customer_user_id IS NOT NULL
    GROUP BY customer_user_id
  )
  SELECT
    (SELECT count(*) FROM buyers)::bigint,
    (SELECT count(*) FROM last_order WHERE last_at >= now() - interval '30 days')::bigint,
    (SELECT count(*) FROM buyers b LEFT JOIN last_order lo ON lo.customer_user_id = b.id
       WHERE lo.last_at IS NULL OR lo.last_at < now() - interval '60 days')::bigint,
    (SELECT count(*) FROM buyers WHERE created_at >= now() - interval '7 days')::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_buyer_segments() TO authenticated;CREATE TABLE IF NOT EXISTS public.buyer_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  channel text NOT NULL DEFAULT 'in_app',
  sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_broadcasts_admin_all"
ON public.buyer_broadcasts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));CREATE OR REPLACE FUNCTION public.ensure_owner_role_for_shop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id, is_active)
  VALUES (NEW.owner_id, 'owner', NEW.id, NULL, true)
  ON CONFLICT (user_id, role, shop_id, outlet_id) DO UPDATE
  SET is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shops_ensure_owner_role ON public.shops;

CREATE TRIGGER trg_shops_ensure_owner_role
AFTER INSERT OR UPDATE OF owner_id ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.ensure_owner_role_for_shop();

INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id, is_active)
SELECT s.owner_id, 'owner', s.id, NULL, true
FROM public.shops s
WHERE s.owner_id IS NOT NULL
ON CONFLICT (user_id, role, shop_id, outlet_id) DO UPDATE
SET is_active = true;

CREATE OR REPLACE FUNCTION public.approve_invoice(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_inv plan_invoices%ROWTYPE;
  v_plan plans%ROWTYPE;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_inv FROM plan_invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status = 'paid' THEN RETURN; END IF;

  SELECT * INTO v_plan FROM plans WHERE id = v_inv.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;

  UPDATE plan_invoices
    SET status='paid', paid_at=now(), reviewed_by=v_caller, reviewed_at=now(), updated_at=now()
    WHERE id=_invoice_id;

  SELECT GREATEST(COALESCE(plan_expires_at, now()), now()) INTO v_start FROM shops WHERE id = v_inv.shop_id;
  v_end := v_start + make_interval(days => v_plan.duration_days);

  UPDATE shops
    SET plan = v_plan.code,
        plan_started_at = COALESCE(plan_started_at, now()),
        plan_expires_at = v_end,
        suspended_at = NULL,
        suspended_reason = NULL,
        updated_at = now()
    WHERE id = v_inv.shop_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller, 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE plan_invoices
    SET status='rejected',
        reviewed_by=v_caller,
        reviewed_at=now(),
        notes=COALESCE(_reason, notes),
        updated_at=now()
    WHERE id=_invoice_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_invoice(uuid, text) TO authenticated;

-- 1. Seed plans (idempotent)
INSERT INTO public.plans (code, name, price_idr, duration_days, is_active, sort_order)
VALUES
  ('basic',    'Basic',    0,       3650, true, 1),
  ('pro',      'Pro',      99000,   30,   true, 2),
  ('business', 'Bisnis',   249000,  30,   true, 3)
ON CONFLICT (code) DO NOTHING;

-- 2. Seed features (idempotent)
INSERT INTO public.features (key, name, description, category, is_active, sort_order)
VALUES
  ('website_builder',    'Website Builder',    'Builder halaman drag-and-drop berbasis Puck', 'appearance', true, 10),
  ('custom_css',         'Custom CSS',         'Tambah CSS sendiri untuk kustomisasi tampilan toko', 'appearance', true, 20),
  ('storefront_builder', 'Storefront Builder', 'Susun section toko (banner, produk unggulan, dll)', 'appearance', true, 30),
  ('premium_themes',     'Tema Premium',       'Akses semua tema premium', 'appearance', true, 40),
  ('custom_domain',      'Custom Domain',      'Hubungkan domain sendiri ke toko', 'appearance', true, 50)
ON CONFLICT (key) DO NOTHING;

-- 3. Map plan -> features (idempotent)
-- Basic: storefront_builder only (free entry-level builder)
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, 'storefront_builder' FROM public.plans p WHERE p.code = 'basic'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Pro: storefront_builder + website_builder + custom_css + premium_themes
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p,
  unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes']) k
WHERE p.code = 'pro'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- Business: semua fitur Pro + custom_domain
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p,
  unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes','custom_domain']) k
WHERE p.code = 'business'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

-- 4. Fix get_my_entitlements to actually read shops.plan and merge with plan_features
CREATE OR REPLACE FUNCTION public.get_my_entitlements() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_theme_key text;
  v_plan_code text := 'basic';
  v_started timestamptz;
  v_expires timestamptz;
  v_months numeric := 0;
  v_themes jsonb;
  v_features jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT id, theme_key, plan_started_at, plan_expires_at, COALESCE(plan, 'basic')
    INTO v_shop_id, v_theme_key, v_started, v_expires, v_plan_code
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;

  -- normalize legacy / null values
  IF v_plan_code IS NULL OR v_plan_code = '' OR v_plan_code = 'free' THEN
    v_plan_code := 'basic';
  END IF;

  -- enforce expiry: if plan expired, fall back to basic
  IF v_plan_code <> 'basic' AND v_expires IS NOT NULL AND v_expires < now() THEN
    v_plan_code := 'basic';
  END IF;

  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;

  -- themes
  SELECT jsonb_agg(jsonb_build_object(
    'key', t.key, 'name', t.name, 'description', t.description,
    'preview_image_url', t.preview_image_url,
    'allowed', true, 'reason', NULL,
    'component_id', t.component_id,
    'requires_min_months', 0
  ) ORDER BY t.sort_order)
  INTO v_themes FROM public.themes t WHERE t.is_active = true;

  -- features: every active feature, marked allowed if plan grants it
  SELECT jsonb_agg(jsonb_build_object(
    'key', f.key,
    'name', f.name,
    'description', f.description,
    'category', f.category,
    'requires_min_months', COALESCE(pf.requires_min_months, 0),
    'limit_value', pf.limit_value,
    'allowed', (pf.feature_key IS NOT NULL) AND (COALESCE(pf.requires_min_months, 0) <= v_months),
    'reason', CASE
                WHEN pf.feature_key IS NULL THEN 'plan_not_eligible'
                WHEN COALESCE(pf.requires_min_months, 0) > v_months THEN 'requires_min_months'
                ELSE NULL
              END
  ) ORDER BY f.sort_order)
  INTO v_features
  FROM public.features f
  LEFT JOIN public.plan_features pf
    ON pf.feature_key = f.key
   AND pf.plan_id = (SELECT id FROM public.plans WHERE code = v_plan_code LIMIT 1)
  WHERE f.is_active = true;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'plan_started_at', v_started,
    'plan_expires_at', v_expires,
    'months_active', v_months,
    'active_theme_key', COALESCE(v_theme_key, 'classic'),
    'features', COALESCE(v_features, '[]'::jsonb),
    'themes', COALESCE(v_themes, '[]'::jsonb)
  );
END $$;
CREATE OR REPLACE FUNCTION public.get_my_entitlements()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid;
  v_theme_key text;
  v_plan_code text := 'basic';
  v_started timestamptz;
  v_expires timestamptz;
  v_months numeric := 0;
  v_themes jsonb;
  v_features jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT id, COALESCE(active_theme_key, theme_key), plan_started_at, plan_expires_at, COALESCE(plan, 'basic')
    INTO v_shop_id, v_theme_key, v_started, v_expires, v_plan_code
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;

  IF v_plan_code IS NULL OR v_plan_code = '' OR v_plan_code = 'free' THEN
    v_plan_code := 'basic';
  END IF;

  IF v_plan_code <> 'basic' AND v_expires IS NOT NULL AND v_expires < now() THEN
    v_plan_code := 'basic';
  END IF;

  IF v_started IS NOT NULL THEN
    v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30);
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'key', t.key, 'name', t.name, 'description', t.description,
    'preview_image_url', t.preview_image_url,
    'allowed', true, 'reason', NULL,
    'component_id', t.component_id,
    'requires_min_months', 0
  ) ORDER BY t.sort_order)
  INTO v_themes FROM public.themes t WHERE t.is_active = true;

  SELECT jsonb_agg(jsonb_build_object(
    'key', f.key,
    'name', f.name,
    'description', f.description,
    'category', f.category,
    'requires_min_months', COALESCE(pf.requires_min_months, 0),
    'limit_value', pf.limit_value,
    'allowed', (pf.feature_key IS NOT NULL) AND (COALESCE(pf.requires_min_months, 0) <= v_months),
    'reason', CASE
                WHEN pf.feature_key IS NULL THEN 'plan_not_eligible'
                WHEN COALESCE(pf.requires_min_months, 0) > v_months THEN 'requires_min_months'
                ELSE NULL
              END
  ) ORDER BY f.sort_order)
  INTO v_features
  FROM public.features f
  LEFT JOIN public.plan_features pf
    ON pf.feature_key = f.key
   AND pf.plan_id = (SELECT id FROM public.plans WHERE code = v_plan_code LIMIT 1)
  WHERE f.is_active = true;

  RETURN jsonb_build_object(
    'plan_code', v_plan_code,
    'plan_started_at', v_started,
    'plan_expires_at', v_expires,
    'months_active', v_months,
    'active_theme_key', COALESCE(v_theme_key, 'classic'),
    'features', COALESCE(v_features, '[]'::jsonb),
    'themes', COALESCE(v_themes, '[]'::jsonb)
  );
END $function$;
CREATE TABLE IF NOT EXISTS public.shop_bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_bank_accounts_shop ON public.shop_bank_accounts(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shop_bank_primary
  ON public.shop_bank_accounts(shop_id) WHERE is_primary = true;

ALTER TABLE public.shop_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop owners can view their bank accounts"
  ON public.shop_bank_accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Shop owners can insert their bank accounts"
  ON public.shop_bank_accounts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Shop owners can update their bank accounts"
  ON public.shop_bank_accounts FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Shop owners can delete their bank accounts"
  ON public.shop_bank_accounts FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER update_shop_bank_accounts_updated_at
  BEFORE UPDATE ON public.shop_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid());
$$;

-- Antrian
CREATE TABLE IF NOT EXISTS public.queue_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  is_active boolean NOT NULL DEFAULT true,
  avg_service_minutes int NOT NULL DEFAULT 10,
  current_number int NOT NULL DEFAULT 0,
  label text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_queue_sessions_shop_date ON public.queue_sessions(shop_id, session_date);

CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.queue_sessions(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  queue_number int NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  notes text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','serving','done','skipped')),
  called_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queue_entries_session ON public.queue_entries(session_id, queue_number);

-- Studio
CREATE TABLE IF NOT EXISTS public.studio_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  location_preference text, mood_vibe text, outfit_count int NOT NULL DEFAULT 1,
  reference_style text, special_requests text, props_needed text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','reviewed')),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_briefs_shop ON public.studio_briefs(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  file_urls text[] NOT NULL DEFAULT '{}', drive_link text,
  download_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  expires_at timestamptz, download_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','delivered','downloaded','expired')),
  notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_deliveries_shop ON public.studio_deliveries(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_photo_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text, photos text[] NOT NULL DEFAULT '{}',
  is_hidden boolean NOT NULL DEFAULT false, shop_reply text, shop_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_photo_reviews_shop ON public.studio_photo_reviews(shop_id, created_at DESC);

-- Klinik
CREATE TABLE IF NOT EXISTS public.medical_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  patient_name text NOT NULL, patient_dob date, doctor_name text,
  visit_date date NOT NULL DEFAULT current_date,
  diagnosis text, prescription text,
  items jsonb NOT NULL DEFAULT '[]', total numeric(14,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medical_invoices_shop ON public.medical_invoices(shop_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS public.anamnesis_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid, patient_name text NOT NULL,
  chief_complaint text DEFAULT '', history text DEFAULT '',
  allergies text DEFAULT '', current_medications text DEFAULT '', vital_notes text DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_anamnesis_shop ON public.anamnesis_forms(shop_id, submitted_at DESC);

-- Digital
CREATE TABLE IF NOT EXISTS public.digital_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  license_key text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
  license_type text NOT NULL DEFAULT 'personal' CHECK (license_type IN ('personal','commercial','extended')),
  download_count int NOT NULL DEFAULT 0, max_downloads int,
  last_downloaded_at timestamptz, is_active boolean NOT NULL DEFAULT true,
  customer_name text, order_no text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_shop ON public.digital_licenses(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_order ON public.digital_licenses(order_id, product_id);

CREATE TABLE IF NOT EXISTS public.digital_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.digital_licenses(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text
);
CREATE INDEX IF NOT EXISTS idx_digital_dl_logs_license ON public.digital_download_logs(license_id, downloaded_at DESC);

CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name text, version text NOT NULL, changelog text, file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digital_versions_shop ON public.digital_product_versions(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.authenticity_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_name text NOT NULL, edition text,
  serial_no text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  materials text, dimensions text, creation_year text,
  buyer_name text, sale_date date, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, serial_no)
);
CREATE INDEX IF NOT EXISTS idx_authenticity_shop ON public.authenticity_certificates(shop_id, created_at DESC);

-- Kreatif
CREATE TABLE IF NOT EXISTS public.wip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL, caption text, image_url text NOT NULL,
  stage text NOT NULL DEFAULT 'sketch',
  is_published boolean NOT NULL DEFAULT true, linked_product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wip_shop ON public.wip_gallery(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shop_lookbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text, model_name text, tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL, is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  linked_product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lookbook_shop ON public.shop_lookbook(shop_id, sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL, customer_phone text,
  project_name text NOT NULL, total_value numeric(14,2) NOT NULL DEFAULT 0,
  milestones jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_shop ON public.project_milestones(shop_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.limited_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  stock_total int NOT NULL DEFAULT 0, stock_sold int NOT NULL DEFAULT 0,
  image_url text, launch_date date, end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_limited_shop ON public.limited_editions(shop_id, created_at DESC);

-- Promo / engagement
CREATE TABLE IF NOT EXISTS public.shop_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_follows_shop ON public.shop_follows(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_follows_user ON public.shop_follows(user_id);

CREATE TABLE IF NOT EXISTS public.happy_hour_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, days_of_week int[] NOT NULL DEFAULT '{}',
  start_time time NOT NULL, end_time time NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_happy_hour_shop ON public.happy_hour_rules(shop_id, is_active);

CREATE TABLE IF NOT EXISTS public.wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  segment_label text NOT NULL, message_template text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0, sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'done',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_broadcasts_shop ON public.wa_broadcasts(shop_id, created_at DESC);

-- Booking add-on / packages / vouchers / reschedule logs
CREATE TABLE IF NOT EXISTS public.booking_service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bsp_shop ON public.booking_service_packages(shop_id, sort_order);

CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_baddon_shop ON public.booking_addons(shop_id, sort_order);

CREATE TABLE IF NOT EXISTS public.booking_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_slot_price numeric(12,2) NOT NULL DEFAULT 0,
  max_uses int, used_count int NOT NULL DEFAULT 0,
  valid_from date, valid_until date,
  description text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);
CREATE INDEX IF NOT EXISTS idx_bvouchers_shop ON public.booking_vouchers(shop_id, is_active);

CREATE TABLE IF NOT EXISTS public.booking_reschedule_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  old_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  new_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  reason text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_breschedule_booking ON public.booking_reschedule_logs(booking_id, created_at DESC);

-- Rental checklist
CREATE TABLE IF NOT EXISTS public.rental_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.rental_units(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('before','after')),
  customer_name text NOT NULL, customer_phone text,
  odometer_km int, fuel_level text,
  items jsonb NOT NULL DEFAULT '[]',
  signature_data text, signed_by text, signed_at timestamptz,
  general_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rchecklist_shop ON public.rental_checklists(shop_id, created_at DESC);

-- Buyer ratings + order status logs
CREATE TABLE IF NOT EXISTS public.buyer_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rated_user_id uuid, customer_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, shop_id)
);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_user ON public.buyer_ratings(rated_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_shop ON public.buyer_ratings(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL, note text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON public.order_status_logs(order_id, created_at);

-- RLS shop-scoped
DO $$
DECLARE
  t text;
  shop_scoped text[] := ARRAY[
    'queue_sessions','queue_entries','studio_briefs','studio_deliveries','studio_photo_reviews',
    'medical_invoices','anamnesis_forms','digital_licenses','digital_product_versions',
    'authenticity_certificates','wip_gallery','shop_lookbook','project_milestones','limited_editions',
    'happy_hour_rules','wa_broadcasts','booking_service_packages','booking_addons',
    'booking_vouchers','booking_reschedule_logs','rental_checklists','buyer_ratings'
  ];
BEGIN
  FOREACH t IN ARRAY shop_scoped LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_owner_all" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%s_owner_all" ON public.%I
        FOR ALL TO authenticated
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
    $p$, t, t);
  END LOOP;
END $$;

ALTER TABLE public.digital_download_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dl_logs_owner_all" ON public.digital_download_logs;
CREATE POLICY "dl_logs_owner_all" ON public.digital_download_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id AND public.is_shop_owner(l.shop_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id));

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "osl_shop_all" ON public.order_status_logs;
CREATE POLICY "osl_shop_all" ON public.order_status_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())));

ALTER TABLE public.shop_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_self_write" ON public.shop_follows;
DROP POLICY IF EXISTS "follows_public_count" ON public.shop_follows;
CREATE POLICY "follows_self_write" ON public.shop_follows
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "follows_public_count" ON public.shop_follows
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wip_public_read" ON public.wip_gallery;
CREATE POLICY "wip_public_read" ON public.wip_gallery FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "lookbook_public_read" ON public.shop_lookbook;
CREATE POLICY "lookbook_public_read" ON public.shop_lookbook FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "studio_reviews_public_read" ON public.studio_photo_reviews;
CREATE POLICY "studio_reviews_public_read" ON public.studio_photo_reviews FOR SELECT TO anon, authenticated USING (is_hidden = false);

DROP POLICY IF EXISTS "buyer_ratings_self_read" ON public.buyer_ratings;
CREATE POLICY "buyer_ratings_self_read" ON public.buyer_ratings
  FOR SELECT TO authenticated USING (rated_user_id = auth.uid());

DROP POLICY IF EXISTS "limited_public_read" ON public.limited_editions;
CREATE POLICY "limited_public_read" ON public.limited_editions FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "cert_public_read" ON public.authenticity_certificates;
CREATE POLICY "cert_public_read" ON public.authenticity_certificates FOR SELECT TO anon, authenticated USING (true);

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS shipping_origin_province_id integer,
  ADD COLUMN IF NOT EXISTS shipping_origin_city_id integer,
  ADD COLUMN IF NOT EXISTS shipping_couriers text[] NOT NULL DEFAULT '{}';

-- email_campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  segment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_shop ON public.email_campaigns(shop_id, created_at DESC);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_campaigns_owner_all" ON public.email_campaigns;
CREATE POLICY "email_campaigns_owner_all" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_email_campaigns_updated
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- email_campaign_recipients
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','bounced')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_shop ON public.email_campaign_recipients(shop_id);
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_recipients_owner_all" ON public.email_campaign_recipients;
CREATE POLICY "email_recipients_owner_all" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- storefront_layouts
CREATE TABLE IF NOT EXISTS public.storefront_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_layouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "storefront_layouts_owner_all" ON public.storefront_layouts;
CREATE POLICY "storefront_layouts_owner_all" ON public.storefront_layouts
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP POLICY IF EXISTS "storefront_layouts_public_read" ON public.storefront_layouts;
CREATE POLICY "storefront_layouts_public_read" ON public.storefront_layouts
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE TRIGGER trg_storefront_layouts_updated
  BEFORE UPDATE ON public.storefront_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shop_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_shop_api_keys_shop ON public.shop_api_keys(shop_id);

ALTER TABLE public.shop_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_api_keys_owner_all" ON public.shop_api_keys;
CREATE POLICY "shop_api_keys_owner_all" ON public.shop_api_keys
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_shop_api_keys_updated
  BEFORE UPDATE ON public.shop_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- P0 Guard: pastikan is_shop_owner(uuid) 1-arg ada sebelum dipakai RLS lain
CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = _shop_id AND s.owner_id = auth.uid()
  );
$$;

-- Tabel API keys per toko (idempotent)
CREATE TABLE IF NOT EXISTS public.shop_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_shop_api_keys_shop ON public.shop_api_keys(shop_id);

ALTER TABLE public.shop_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_api_keys_owner_all" ON public.shop_api_keys;
CREATE POLICY "shop_api_keys_owner_all" ON public.shop_api_keys
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP TRIGGER IF EXISTS trg_shop_api_keys_updated ON public.shop_api_keys;
CREATE TRIGGER trg_shop_api_keys_updated
  BEFORE UPDATE ON public.shop_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP VIEW IF EXISTS public.shop_health_score CASCADE;
DROP VIEW IF EXISTS public.courier_earnings CASCADE;
DROP VIEW IF EXISTS public.menu_hpp_view CASCADE;
DROP VIEW IF EXISTS public.v_shop_capabilities CASCADE;

-- LOYALTY
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, min_points integer NOT NULL DEFAULT 0,
  multiplier numeric NOT NULL DEFAULT 1, color text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb, sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_shop ON public.loyalty_tiers(shop_id);
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lt owner" ON public.loyalty_tiers;
CREATE POLICY "lt owner" ON public.loyalty_tiers USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lt public" ON public.loyalty_tiers;
CREATE POLICY "lt public" ON public.loyalty_tiers FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text, cost_points integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'discount', reward_value numeric,
  image_url text, stock integer, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_shop ON public.loyalty_rewards(shop_id);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr owner" ON public.loyalty_rewards;
CREATE POLICY "lr owner" ON public.loyalty_rewards USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lr public" ON public.loyalty_rewards;
CREATE POLICY "lr public" ON public.loyalty_rewards FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward_id uuid REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  points_used integer NOT NULL, status text NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz NOT NULL DEFAULT now(), fulfilled_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_lred_shop ON public.loyalty_redemptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_lred_user ON public.loyalty_redemptions(user_id);
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lred owner" ON public.loyalty_redemptions;
CREATE POLICY "lred owner" ON public.loyalty_redemptions USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lred self r" ON public.loyalty_redemptions;
CREATE POLICY "lred self r" ON public.loyalty_redemptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "lred self i" ON public.loyalty_redemptions;
CREATE POLICY "lred self i" ON public.loyalty_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Referral',
  reward_referrer_points integer NOT NULL DEFAULT 0,
  reward_referrer_cashback numeric NOT NULL DEFAULT 0,
  reward_referee_points integer NOT NULL DEFAULT 0,
  reward_referee_cashback numeric NOT NULL DEFAULT 0,
  min_referee_spend numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS uq_refprog_shop ON public.referral_programs(shop_id);
ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp owner" ON public.referral_programs;
CREATE POLICY "rp owner" ON public.referral_programs USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rp public" ON public.referral_programs;
CREATE POLICY "rp public" ON public.referral_programs FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL, referee_user_id uuid, referee_email text,
  code text NOT NULL, status text NOT NULL DEFAULT 'pending',
  reward_points integer NOT NULL DEFAULT 0, reward_cashback numeric NOT NULL DEFAULT 0,
  first_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  qualified_at timestamptz, rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_refer_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_refer_code ON public.referrals(code);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ref read" ON public.referrals;
CREATE POLICY "ref read" ON public.referrals FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=referrer_user_id OR auth.uid()=referee_user_id);
DROP POLICY IF EXISTS "ref ins" ON public.referrals;
CREATE POLICY "ref ins" ON public.referrals FOR INSERT WITH CHECK (auth.uid()=referrer_user_id);

-- CASHBACK
CREATE TABLE IF NOT EXISTS public.cashback_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0, total_redeemed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.cashback_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cw self" ON public.cashback_wallets;
CREATE POLICY "cw self" ON public.cashback_wallets USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL, type text NOT NULL, description text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_ctx_user ON public.cashback_transactions(user_id);
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ctx read" ON public.cashback_transactions;
CREATE POLICY "ctx read" ON public.cashback_transactions FOR SELECT USING (auth.uid()=user_id OR public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ctx ins" ON public.cashback_transactions;
CREATE POLICY "ctx ins" ON public.cashback_transactions FOR INSERT WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- TABLES
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  label text NOT NULL, capacity integer NOT NULL DEFAULT 2, zone text,
  is_active boolean NOT NULL DEFAULT true, qr_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_tables_shop ON public.tables(shop_id);
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t owner" ON public.tables;
CREATE POLICY "t owner" ON public.tables USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "t public" ON public.tables;
CREATE POLICY "t public" ON public.tables FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.table_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  name text NOT NULL, layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.table_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm owner" ON public.table_maps;
CREATE POLICY "tm owner" ON public.table_maps USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.reservation_settings (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false, slot_minutes integer NOT NULL DEFAULT 60,
  min_party_size integer NOT NULL DEFAULT 1, max_party_size integer NOT NULL DEFAULT 10,
  buffer_minutes integer NOT NULL DEFAULT 15, deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric NOT NULL DEFAULT 0, advance_days integer NOT NULL DEFAULT 30,
  open_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs owner" ON public.reservation_settings;
CREATE POLICY "rs owner" ON public.reservation_settings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rs public" ON public.reservation_settings;
CREATE POLICY "rs public" ON public.reservation_settings FOR SELECT USING (is_enabled);

CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  slot_date date NOT NULL, slot_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 10, booked integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS uq_rslots ON public.reservation_slots(shop_id, slot_date, slot_time);
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rslots owner" ON public.reservation_slots;
CREATE POLICY "rslots owner" ON public.reservation_slots USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rslots public" ON public.reservation_slots;
CREATE POLICY "rslots public" ON public.reservation_slots FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  slot_id uuid REFERENCES public.reservation_slots(id) ON DELETE SET NULL,
  user_id uuid, customer_name text NOT NULL, customer_phone text, customer_email text,
  party_size integer NOT NULL DEFAULT 1, reserved_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  deposit_amount numeric NOT NULL DEFAULT 0, deposit_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_resv_shop_date ON public.reservations(shop_id, reserved_at);
CREATE INDEX IF NOT EXISTS idx_resv_user ON public.reservations(user_id);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resv owner" ON public.reservations;
CREATE POLICY "resv owner" ON public.reservations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "resv self r" ON public.reservations;
CREATE POLICY "resv self r" ON public.reservations FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "resv self i" ON public.reservations;
CREATE POLICY "resv self i" ON public.reservations FOR INSERT WITH CHECK (auth.uid()=user_id OR user_id IS NULL);

-- RETURN
CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL, reason text NOT NULL, description text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', resolution text, refund_amount numeric,
  resolved_by uuid, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_ret_shop ON public.return_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_ret_user ON public.return_requests(user_id);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ret owner" ON public.return_requests;
CREATE POLICY "ret owner" ON public.return_requests USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ret self r" ON public.return_requests;
CREATE POLICY "ret self r" ON public.return_requests FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "ret self i" ON public.return_requests;
CREATE POLICY "ret self i" ON public.return_requests FOR INSERT WITH CHECK (auth.uid()=user_id);

-- THIRD PARTY
CREATE TABLE IF NOT EXISTS public.third_party_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL, name text, config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted text, status text NOT NULL DEFAULT 'inactive',
  last_sync_at timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_tpi_shop ON public.third_party_integrations(shop_id);
ALTER TABLE public.third_party_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tpi" ON public.third_party_integrations;
CREATE POLICY "tpi" ON public.third_party_integrations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.integration_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  local_type text NOT NULL, local_id uuid, remote_id text NOT NULL, data jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_imap_shop ON public.integration_mappings(shop_id);
ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imap" ON public.integration_mappings;
CREATE POLICY "imap" ON public.integration_mappings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  event text NOT NULL, payload jsonb, signature text,
  status text NOT NULL DEFAULT 'received', error text,
  received_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_iwh_shop ON public.integration_webhooks(shop_id);
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iwh" ON public.integration_webhooks;
CREATE POLICY "iwh" ON public.integration_webhooks FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, key_prefix text NOT NULL, key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}', rate_limit_per_minute integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_apik_shop ON public.api_keys(shop_id);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apik" ON public.api_keys;
CREATE POLICY "apik" ON public.api_keys USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.api_usage (
  id bigserial PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL, method text NOT NULL,
  status_code integer, duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_apiu_shop_time ON public.api_usage(shop_id, created_at DESC);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apiu" ON public.api_usage;
CREATE POLICY "apiu" ON public.api_usage FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- SUPER ADMIN
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, display_name text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true, invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "au sa" ON public.admin_users;
CREATE POLICY "au sa" ON public.admin_users USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, code text NOT NULL UNIQUE,
  display_name text, email text, commission_rate numeric NOT NULL DEFAULT 0.05,
  total_clicks integer NOT NULL DEFAULT 0, total_signups integer NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0, paid_commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aff" ON public.affiliates;
CREATE POLICY "aff" ON public.affiliates USING (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, request_type text NOT NULL, status text NOT NULL DEFAULT 'pending',
  notes text, result_url text, processed_by uuid, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_dr_user ON public.data_requests(user_id);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr self" ON public.data_requests;
CREATE POLICY "dr self" ON public.data_requests USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "dr admin upd" ON public.data_requests;
CREATE POLICY "dr admin upd" ON public.data_requests FOR UPDATE USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.shop_health_score (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0, sla_score integer NOT NULL DEFAULT 0,
  fulfillment_score integer NOT NULL DEFAULT 0, rating_score integer NOT NULL DEFAULT 0,
  complaint_score integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.shop_health_score ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shs" ON public.shop_health_score;
CREATE POLICY "shs" ON public.shop_health_score USING (public.has_role(auth.uid(),'super_admin'::app_role) OR public.is_shop_owner(shop_id)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- CLINIC
CREATE TABLE IF NOT EXISTS public.shop_skin_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid, customer_name text, customer_phone text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  skin_type text, concerns text[], recommended_products jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_sq_shop ON public.shop_skin_quiz(shop_id);
ALTER TABLE public.shop_skin_quiz ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sq r" ON public.shop_skin_quiz;
CREATE POLICY "sq r" ON public.shop_skin_quiz FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);
DROP POLICY IF EXISTS "sq i" ON public.shop_skin_quiz;
CREATE POLICY "sq i" ON public.shop_skin_quiz FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.shop_product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  claim_type text NOT NULL, claim_value text, certificate_url text, expires_at date,
  is_verified boolean NOT NULL DEFAULT false, verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_spc_shop ON public.shop_product_claims(shop_id);
ALTER TABLE public.shop_product_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spc owner" ON public.shop_product_claims;
CREATE POLICY "spc owner" ON public.shop_product_claims USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "spc pub" ON public.shop_product_claims;
CREATE POLICY "spc pub" ON public.shop_product_claims FOR SELECT USING (is_verified);

-- VIEWS
CREATE VIEW public.courier_earnings WITH (security_invoker=on) AS
SELECT o.courier_id, o.shop_id,
  date_trunc('day', COALESCE(o.delivered_at, o.created_at))::date AS earning_date,
  count(*) AS deliveries,
  COALESCE(sum(o.delivery_fee),0) AS total_fee,
  COALESCE(sum(o.tip_amount),0) AS total_tip,
  COALESCE(sum(o.delivery_fee + COALESCE(o.tip_amount,0)),0) AS total_earnings
FROM public.orders o WHERE o.courier_id IS NOT NULL
GROUP BY o.courier_id, o.shop_id, date_trunc('day', COALESCE(o.delivered_at, o.created_at));

CREATE VIEW public.menu_hpp_view WITH (security_invoker=on) AS
SELECT mi.id AS menu_item_id, mi.shop_id, mi.name, mi.price,
  COALESCE(sum(r.quantity * i.cost_per_unit), 0) AS hpp,
  CASE WHEN mi.price > 0
    THEN ROUND(((mi.price - COALESCE(sum(r.quantity * i.cost_per_unit),0)) / mi.price * 100)::numeric, 2)
    ELSE 0 END AS margin_percent
FROM public.menu_items mi
LEFT JOIN public.recipes r ON r.menu_item_id = mi.id
LEFT JOIN public.ingredients i ON i.id = r.ingredient_id
GROUP BY mi.id, mi.shop_id, mi.name, mi.price;

CREATE VIEW public.v_shop_capabilities WITH (security_invoker=on) AS
SELECT s.id AS shop_id, s.name AS shop_name,
  s.plan AS plan_code, s.business_category_id,
  bc.slug AS business_category_slug, bc.name AS business_category_name,
  p.features AS plan_features,
  s.is_active AS shop_active, s.suspended_at,
  s.plan_expires_at AS subscription_active_until
FROM public.shops s
LEFT JOIN public.plans p ON p.code = s.plan
LEFT JOIN public.business_categories bc ON bc.id = s.business_category_id;

-- RPCs
CREATE OR REPLACE FUNCTION public.start_queue_session(_shop_id uuid, _label text DEFAULT NULL, _avg_minutes integer DEFAULT 5)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_sessions SET is_active=false, ended_at=now() WHERE shop_id=_shop_id AND is_active=true;
  INSERT INTO public.queue_sessions(shop_id, session_date, label, avg_service_minutes, is_active, started_at)
  VALUES (_shop_id, CURRENT_DATE, _label, COALESCE(_avg_minutes,5), true, now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.take_queue_number(_shop_id uuid, _customer_name text DEFAULT NULL, _customer_phone text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _session_id uuid; _num integer; _id uuid;
BEGIN
  SELECT id INTO _session_id FROM public.queue_sessions WHERE shop_id=_shop_id AND is_active=true ORDER BY started_at DESC LIMIT 1;
  IF _session_id IS NULL THEN
    INSERT INTO public.queue_sessions(shop_id, session_date, is_active, started_at) VALUES (_shop_id, CURRENT_DATE, true, now()) RETURNING id INTO _session_id;
  END IF;
  SELECT COALESCE(MAX(queue_number),0)+1 INTO _num FROM public.queue_entries WHERE session_id=_session_id;
  INSERT INTO public.queue_entries(session_id, shop_id, queue_number, customer_name, customer_phone, notes, status)
  VALUES (_session_id, _shop_id, _num, _customer_name, _customer_phone, _notes, 'waiting') RETURNING id INTO _id;
  RETURN jsonb_build_object('id', _id, 'session_id', _session_id, 'queue_number', _num);
END $$;

CREATE OR REPLACE FUNCTION public.call_next_queue(_shop_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _entry public.queue_entries%ROWTYPE;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _entry FROM public.queue_entries WHERE shop_id=_shop_id AND status='waiting' ORDER BY queue_number ASC LIMIT 1;
  IF _entry.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.queue_entries SET status='called', called_at=now() WHERE id=_entry.id;
  UPDATE public.queue_sessions SET current_number=_entry.queue_number WHERE id=_entry.session_id;
  RETURN to_jsonb(_entry);
END $$;

CREATE OR REPLACE FUNCTION public.skip_queue_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.queue_entries WHERE id=_entry_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_entries SET status='skipped', done_at=now() WHERE id=_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.generate_reservation_slots(_shop_id uuid, _date date, _start time, _end time, _slot_minutes integer DEFAULT 60, _capacity integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _t time := _start; _n integer := 0;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WHILE _t < _end LOOP
    INSERT INTO public.reservation_slots(shop_id, slot_date, slot_time, capacity) VALUES (_shop_id, _date, _t, _capacity)
    ON CONFLICT (shop_id, slot_date, slot_time) DO NOTHING;
    _t := _t + (_slot_minutes || ' minutes')::interval; _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION public.check_table_availability(_shop_id uuid, _reserved_at timestamptz, _party_size integer DEFAULT 1)
RETURNS TABLE(table_id uuid, label text, capacity integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT t.id, t.label, t.capacity FROM public.tables t
  WHERE t.shop_id=_shop_id AND t.is_active AND t.capacity >= _party_size
    AND NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.table_id=t.id AND r.status IN ('pending','confirmed','seated') AND abs(extract(epoch FROM (r.reserved_at - _reserved_at))) < 3600)
  ORDER BY t.capacity ASC;
$$;

CREATE OR REPLACE FUNCTION public.increment_slot_booked(_slot_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.reservation_slots SET booked=booked+1 WHERE id=_slot_id AND booked<capacity; END $$;

CREATE OR REPLACE FUNCTION public.decrement_slot_booked(_slot_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.reservation_slots SET booked=GREATEST(booked-1,0) WHERE id=_slot_id; END $$;

CREATE OR REPLACE FUNCTION public.fn_use_booking_voucher(_booking_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _v public.booking_vouchers%ROWTYPE;
BEGIN
  SELECT * INTO _v FROM public.booking_vouchers WHERE code=_code AND is_active=true LIMIT 1;
  IF _v.id IS NULL THEN RAISE EXCEPTION 'voucher tidak ditemukan'; END IF;
  RETURN jsonb_build_object('voucher_id', _v.id, 'discount', COALESCE(_v.discount_amount, 0));
END $$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(_booking_id uuid, _new_start timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.bookings WHERE id=_booking_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.bookings SET start_at=_new_start, updated_at=now() WHERE id=_booking_id;
END $$;

CREATE OR REPLACE FUNCTION public.award_referral_bonus(_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _r public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.referrals WHERE id=_referral_id;
  IF _r.id IS NULL OR _r.status='rewarded' THEN RETURN; END IF;
  UPDATE public.referrals SET status='rewarded', rewarded_at=now() WHERE id=_referral_id;
  IF _r.reward_cashback>0 AND _r.referrer_user_id IS NOT NULL THEN
    INSERT INTO public.cashback_wallets(user_id, balance, total_earned)
    VALUES (_r.referrer_user_id, _r.reward_cashback, _r.reward_cashback)
    ON CONFLICT (user_id) DO UPDATE SET balance=cashback_wallets.balance+EXCLUDED.balance, total_earned=cashback_wallets.total_earned+EXCLUDED.total_earned, updated_at=now();
    INSERT INTO public.cashback_transactions(user_id, shop_id, amount, type, description)
    VALUES (_r.referrer_user_id, _r.shop_id, _r.reward_cashback, 'earn', 'Bonus referral');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_download(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.digital_licenses SET download_count=COALESCE(download_count,0)+1, last_downloaded_at=now() WHERE id=_license_id;
  INSERT INTO public.digital_download_logs(license_id, downloaded_at) VALUES (_license_id, now());
END $$;

CREATE OR REPLACE FUNCTION public.reset_download_count(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.digital_licenses WHERE id=_license_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.digital_licenses SET download_count=0 WHERE id=_license_id;
END $$;

CREATE OR REPLACE FUNCTION public.request_customer_export(_user_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid; _id uuid;
BEGIN
  _uid := COALESCE(_user_id, auth.uid());
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.data_requests(user_id, request_type, status) VALUES (_uid, 'export', 'pending') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.request_shop_backup(_shop_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.shop_backups(shop_id, status, requested_by, requested_at) VALUES (_shop_id, 'pending', auth.uid(), now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.run_plan_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _expired integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.shops SET plan='basic'
   WHERE plan_expires_at IS NOT NULL AND plan_expires_at < now() AND plan <> 'basic';
  GET DIAGNOSTICS _expired = ROW_COUNT;
  RETURN jsonb_build_object('expired', _expired);
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_min_months(_plan_id uuid, _feature_key text, _min_months integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.plan_features SET min_months=_min_months WHERE plan_id=_plan_id AND feature_key=_feature_key;
END $$;

CREATE OR REPLACE FUNCTION public.admin_undo_min_months(_plan_id uuid, _feature_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.plan_features SET min_months=0 WHERE plan_id=_plan_id AND feature_key=_feature_key;
END $$;

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(_api_key_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _limit integer; _count integer;
BEGIN
  SELECT rate_limit_per_minute INTO _limit FROM public.api_keys WHERE id=_api_key_id AND is_active;
  IF _limit IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO _count FROM public.api_usage WHERE api_key_id=_api_key_id AND created_at > now() - interval '1 minute';
  RETURN _count < _limit;
END $$;

CREATE OR REPLACE FUNCTION public.record_api_usage(_api_key_id uuid, _shop_id uuid, _endpoint text, _method text, _status integer DEFAULT 200, _duration_ms integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.api_usage(shop_id, api_key_id, endpoint, method, status_code, duration_ms) VALUES (_shop_id, _api_key_id, _endpoint, _method, _status, _duration_ms);
  UPDATE public.api_keys SET last_used_at=now() WHERE id=_api_key_id;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['loyalty_tiers','loyalty_rewards','referral_programs','tables','table_maps','reservation_settings','reservations','return_requests','third_party_integrations']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END $$;

ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_required integer,
  ADD COLUMN IF NOT EXISTS reward_item_id uuid,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer integer,
  ADD COLUMN IF NOT EXISTS total_redemptions_limit integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.loyalty_rewards SET points_required = COALESCE(points_required, cost_points) WHERE points_required IS NULL;

ALTER TABLE public.loyalty_redemptions
  ADD COLUMN IF NOT EXISTS points_redeemed integer,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
UPDATE public.loyalty_redemptions SET points_redeemed = COALESCE(points_redeemed, points_used) WHERE points_redeemed IS NULL;

ALTER TABLE public.referral_programs
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS referrer_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_value_for_bonus numeric,
  ADD COLUMN IF NOT EXISTS max_referrals_per_user integer;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.referral_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
UPDATE public.referrals SET referral_code = COALESCE(referral_code, code) WHERE referral_code IS NULL;

CREATE TABLE IF NOT EXISTS public.loyalty_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date date NOT NULL,
  new_members integer NOT NULL DEFAULT 0,
  points_issued integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  rewards_claimed integer NOT NULL DEFAULT 0,
  referral_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, date)
);
ALTER TABLE public.loyalty_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la owner" ON public.loyalty_analytics;
CREATE POLICY "la owner" ON public.loyalty_analytics
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- Auto-fill kolom legacy ↔ baru via trigger
CREATE OR REPLACE FUNCTION public.sync_loyalty_reward_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_required IS NULL AND NEW.cost_points IS NOT NULL THEN NEW.points_required := NEW.cost_points; END IF;
  IF NEW.cost_points IS NULL AND NEW.points_required IS NOT NULL THEN NEW.cost_points := NEW.points_required; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lr_sync ON public.loyalty_rewards;
CREATE TRIGGER trg_lr_sync BEFORE INSERT OR UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_reward_cols();

CREATE OR REPLACE FUNCTION public.sync_loyalty_redemption_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_redeemed IS NULL AND NEW.points_used IS NOT NULL THEN NEW.points_redeemed := NEW.points_used; END IF;
  IF NEW.points_used IS NULL AND NEW.points_redeemed IS NOT NULL THEN NEW.points_used := NEW.points_redeemed; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lred_sync ON public.loyalty_redemptions;
CREATE TRIGGER trg_lred_sync BEFORE INSERT OR UPDATE ON public.loyalty_redemptions FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_redemption_cols();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_recipient_active_idx
  ON public.notifications (recipient_user_id, created_at DESC)
  WHERE dismissed_at IS NULL;-- =========================================================
-- GUARD MIGRATION: Loyalty & Referral (idempotent, schema-aware)
-- =========================================================

-- 1) BASE TABLES -------------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cost_points integer NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr owner" ON public.loyalty_rewards;
CREATE POLICY "lr owner" ON public.loyalty_rewards
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lr public read" ON public.loyalty_rewards;
CREATE POLICY "lr public read" ON public.loyalty_rewards FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid,
  reward_id uuid,
  points_used integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Build owner policy dinamis (kompatibel dengan user_id atau customer_user_id)
DO $$
DECLARE
  uid_col text;
BEGIN
  SELECT column_name INTO uid_col
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='loyalty_redemptions'
    AND column_name IN ('user_id','customer_user_id')
  ORDER BY CASE column_name WHEN 'user_id' THEN 1 ELSE 2 END
  LIMIT 1;

  EXECUTE 'DROP POLICY IF EXISTS "lred owner" ON public.loyalty_redemptions';
  IF uid_col IS NOT NULL THEN
    EXECUTE format($f$
      CREATE POLICY "lred owner" ON public.loyalty_redemptions
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR %I = auth.uid())
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR %I = auth.uid())
    $f$, uid_col, uid_col);
  ELSE
    EXECUTE $f$
      CREATE POLICY "lred owner" ON public.loyalty_redemptions
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
    $f$;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp owner" ON public.referral_programs;
CREATE POLICY "rp owner" ON public.referral_programs
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rp public read" ON public.referral_programs;
CREATE POLICY "rp public read" ON public.referral_programs FOR SELECT USING (is_active = true);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  referrer_user_id uuid,
  referee_user_id uuid,
  code text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ref owner" ON public.referrals;
CREATE POLICY "ref owner" ON public.referrals
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR referrer_user_id = auth.uid() OR referee_user_id = auth.uid())
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR referrer_user_id = auth.uid() OR referee_user_id = auth.uid());

-- 2) ENHANCED COLUMNS --------------------------------------

ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_required integer,
  ADD COLUMN IF NOT EXISTS reward_item_id uuid,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer integer,
  ADD COLUMN IF NOT EXISTS total_redemptions_limit integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.loyalty_rewards SET points_required = COALESCE(points_required, cost_points) WHERE points_required IS NULL;

-- FK reward_id pada loyalty_redemptions (jika belum ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='loyalty_redemptions'
      AND constraint_type='FOREIGN KEY' AND constraint_name='loyalty_redemptions_reward_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE public.loyalty_redemptions
        ADD CONSTRAINT loyalty_redemptions_reward_id_fkey
        FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL;
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

ALTER TABLE public.loyalty_redemptions
  ADD COLUMN IF NOT EXISTS points_redeemed integer,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
UPDATE public.loyalty_redemptions SET points_redeemed = COALESCE(points_redeemed, points_used) WHERE points_redeemed IS NULL;

ALTER TABLE public.referral_programs
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS referrer_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_value_for_bonus numeric,
  ADD COLUMN IF NOT EXISTS max_referrals_per_user integer;

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.referral_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
UPDATE public.referrals SET referral_code = COALESCE(referral_code, code) WHERE referral_code IS NULL;

-- 3) ANALYTICS TABLE ---------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date date NOT NULL,
  new_members integer NOT NULL DEFAULT 0,
  points_issued integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  rewards_claimed integer NOT NULL DEFAULT 0,
  referral_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, date)
);
ALTER TABLE public.loyalty_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la owner" ON public.loyalty_analytics;
CREATE POLICY "la owner" ON public.loyalty_analytics
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- 4) SYNC TRIGGERS (legacy ↔ baru) -------------------------

CREATE OR REPLACE FUNCTION public.sync_loyalty_reward_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_required IS NULL AND NEW.cost_points IS NOT NULL THEN NEW.points_required := NEW.cost_points; END IF;
  IF NEW.cost_points IS NULL AND NEW.points_required IS NOT NULL THEN NEW.cost_points := NEW.points_required; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lr_sync ON public.loyalty_rewards;
CREATE TRIGGER trg_lr_sync BEFORE INSERT OR UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_reward_cols();

CREATE OR REPLACE FUNCTION public.sync_loyalty_redemption_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_redeemed IS NULL AND NEW.points_used IS NOT NULL THEN NEW.points_redeemed := NEW.points_used; END IF;
  IF NEW.points_used IS NULL AND NEW.points_redeemed IS NOT NULL THEN NEW.points_used := NEW.points_redeemed; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_lred_sync ON public.loyalty_redemptions;
CREATE TRIGGER trg_lred_sync BEFORE INSERT OR UPDATE ON public.loyalty_redemptions FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_redemption_cols();ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS latitude numeric;
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS longitude numeric;

CREATE INDEX IF NOT EXISTS shops_geo_idx
  ON public.shops (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE OR REPLACE FUNCTION public.shops_nearby(
  _lat double precision,
  _lng double precision,
  _radius_km double precision DEFAULT 10,
  _limit integer DEFAULT 50,
  _category_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  tagline text,
  logo_url text,
  address text,
  city text,
  latitude numeric,
  longitude numeric,
  business_category_id uuid,
  rating_avg numeric,
  review_count integer,
  distance_km double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    s.id, s.slug, s.name, s.tagline, s.logo_url,
    s.address, s.city, s.latitude, s.longitude, s.business_category_id,
    s.rating_avg, s.review_count,
    (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(s.latitude::float8))
          * cos(radians(s.longitude::float8) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(s.latitude::float8))
        ))
      )
    ) AS distance_km
  FROM public.shops s
  WHERE s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND COALESCE(s.is_active, true) = true
    AND COALESCE(s.marketplace_visible, true) = true
    AND (_category_id IS NULL OR s.business_category_id = _category_id)
    AND (
      6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(_lat)) * cos(radians(s.latitude::float8))
          * cos(radians(s.longitude::float8) - radians(_lng))
          + sin(radians(_lat)) * sin(radians(s.latitude::float8))
        ))
      )
    ) <= _radius_km
  ORDER BY distance_km ASC
  LIMIT GREATEST(1, LEAST(_limit, 200));
$$;

GRANT EXECUTE ON FUNCTION public.shops_nearby(double precision, double precision, double precision, integer, uuid) TO anon, authenticated;-- Phase 1 housekeeping: drop legacy coffee_shops view (kosong dari referensi kode)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema='public' AND table_name='coffee_shops') THEN
    EXECUTE 'DROP VIEW public.coffee_shops';
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='coffee_shops') THEN
    -- Jika legacy table, biarkan (defensive)
    NULL;
  END IF;
END $$;SET statement_timeout = 0;
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

INSERT INTO public.icd10_codes VALUES ('J00', 'Nasofaringitis akut (common cold)', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J02.9', 'Faringitis akut, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J03.9', 'Tonsilitis akut, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J06.9', 'Infeksi saluran napas atas akut', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J11', 'Influenza, virus tidak teridentifikasi', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J20.9', 'Bronkitis akut, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('J45.9', 'Asma, tidak spesifik', 'Respirasi');
INSERT INTO public.icd10_codes VALUES ('A09', 'Diare & gastroenteritis (dugaan infeksi)', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K29.7', 'Gastritis, tidak spesifik', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K30', 'Dispepsia fungsional', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('K59.0', 'Konstipasi', 'Digestif');
INSERT INTO public.icd10_codes VALUES ('B34.9', 'Infeksi virus, tidak spesifik', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('A01.0', 'Demam tifoid', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('A91', 'Demam berdarah dengue (DBD)', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('B54', 'Malaria, tidak spesifik', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('A15.0', 'TB paru, dengan konfirmasi bakteriologis', 'Infeksi');
INSERT INTO public.icd10_codes VALUES ('R50.9', 'Demam, tidak spesifik', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R51', 'Sefalgia (sakit kepala)', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R10.4', 'Nyeri perut, tidak spesifik', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R11', 'Mual & muntah', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R05', 'Batuk', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R07.4', 'Nyeri dada, tidak spesifik', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('R42', 'Pusing & vertigo', 'Gejala');
INSERT INTO public.icd10_codes VALUES ('I10', 'Hipertensi esensial', 'Kardiovaskular');
INSERT INTO public.icd10_codes VALUES ('I20.9', 'Angina pektoris, tidak spesifik', 'Kardiovaskular');
INSERT INTO public.icd10_codes VALUES ('E11.9', 'Diabetes melitus tipe 2, tanpa komplikasi', 'Endokrin');
INSERT INTO public.icd10_codes VALUES ('E78.5', 'Hiperlipidemia, tidak spesifik', 'Endokrin');
INSERT INTO public.icd10_codes VALUES ('E03.9', 'Hipotiroidisme, tidak spesifik', 'Endokrin');
INSERT INTO public.icd10_codes VALUES ('N39.0', 'Infeksi saluran kemih, lokasi tidak spesifik', 'Urogenital');
INSERT INTO public.icd10_codes VALUES ('N76.0', 'Vaginitis akut', 'Urogenital');
INSERT INTO public.icd10_codes VALUES ('L20.9', 'Dermatitis atopik', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('L30.9', 'Dermatitis, tidak spesifik', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('L50.9', 'Urtikaria, tidak spesifik', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('L08.9', 'Infeksi kulit dan jaringan lunak', 'Kulit');
INSERT INTO public.icd10_codes VALUES ('M54.5', 'Low back pain', 'Muskuloskeletal');
INSERT INTO public.icd10_codes VALUES ('M25.5', 'Nyeri sendi', 'Muskuloskeletal');
INSERT INTO public.icd10_codes VALUES ('M79.1', 'Mialgia', 'Muskuloskeletal');
INSERT INTO public.icd10_codes VALUES ('H10.9', 'Konjungtivitis, tidak spesifik', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('H66.9', 'Otitis media, tidak spesifik', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('H81.1', 'Vertigo paroksismal jinak (BPPV)', 'THT/Mata');
INSERT INTO public.icd10_codes VALUES ('Z00.0', 'Pemeriksaan kesehatan umum', 'Preventif');
INSERT INTO public.icd10_codes VALUES ('Z23', 'Imunisasi', 'Preventif');
INSERT INTO public.icd10_codes VALUES ('F41.1', 'Gangguan cemas menyeluruh', 'Psikiatri');
INSERT INTO public.icd10_codes VALUES ('F32.9', 'Episode depresi, tidak spesifik', 'Psikiatri');


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plan_themes; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: wallet_topup_presets; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--
