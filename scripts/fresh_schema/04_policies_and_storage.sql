

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
