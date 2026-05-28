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
    sign_token text DEFAULT encode(extensions.gen_random_bytes(18), 'hex'::text)
);


--
-- Name: icd10_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.icd10_codes (
    code text NOT NULL,
    label_id text NOT NULL,
    category text
);


--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ingredients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    unit text DEFAULT 'pcs'::text NOT NULL,
    current_stock numeric DEFAULT 0 NOT NULL,
    min_stock numeric DEFAULT 0 NOT NULL,
    cost_per_unit numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text,
    default_supplier_id uuid
);


--
-- Name: job_deliverables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_deliverables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    custom_order_id uuid,
    customer_name text NOT NULL,
    customer_contact text NOT NULL,
    title text NOT NULL,
    description text,
    file_url text,
    file_name text,
    file_size_bytes bigint,
    external_url text,
    delivery_token text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text) NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    sent_at timestamp with time zone,
    received_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT job_deliverables_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'received'::text, 'revision'::text, 'completed'::text])))
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    source text DEFAULT 'sales_inquiry'::text NOT NULL,
    linked_id uuid,
    linked_type text,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text,
    message text,
    status text DEFAULT 'new'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    watch_seconds integer DEFAULT 0 NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    delta integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0 NOT NULL,
    total_earned integer DEFAULT 0 NOT NULL,
    total_redeemed integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_settings (
    shop_id uuid NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    rupiah_per_point numeric DEFAULT 10000 NOT NULL,
    point_value numeric DEFAULT 1000 NOT NULL,
    min_redeem_points integer DEFAULT 10 NOT NULL,
    max_redeem_percent integer DEFAULT 50 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    template text DEFAULT ''::text NOT NULL,
    audience_segment text,
    audience_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    variant_id uuid,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(14,2) NOT NULL,
    notes text,
    options jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: marketplace_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    generic_name text,
    dose text,
    unit text,
    form text,
    stock integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 10 NOT NULL,
    expiry_date date,
    price numeric(12,2),
    manufacturer text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_hpp_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.menu_hpp_view AS
SELECT
    NULL::uuid AS menu_item_id,
    NULL::uuid AS shop_id,
    NULL::text AS name,
    NULL::numeric(12,2) AS price,
    NULL::numeric AS hpp,
    NULL::numeric AS margin,
    NULL::numeric AS margin_percent,
    NULL::timestamp with time zone AS last_updated,
    NULL::bigint AS recipe_count;


--
-- Name: menu_item_option_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_option_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    max_select integer DEFAULT 1 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_item_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    price_adjustment numeric DEFAULT 0 NOT NULL,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: menu_item_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_item_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    name text NOT NULL,
    sku text,
    price numeric DEFAULT 0 NOT NULL,
    stock integer,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    barcode text
);


--
-- Name: menu_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    description text,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    image_url text,
    is_available boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    track_stock boolean DEFAULT false NOT NULL,
    recipe_yield numeric DEFAULT 1 NOT NULL,
    slug text,
    sku text,
    compare_price numeric(15,2),
    cost_price numeric(15,2),
    stock integer,
    low_stock_threshold integer DEFAULT 5,
    weight_grams integer,
    length_cm numeric(8,2),
    width_cm numeric(8,2),
    height_cm numeric(8,2),
    is_digital boolean DEFAULT false NOT NULL,
    digital_file_url text,
    digital_file_name text,
    is_pre_order boolean DEFAULT false NOT NULL,
    pre_order_days integer,
    images jsonb DEFAULT '[]'::jsonb NOT NULL,
    video_url text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    total_sold integer DEFAULT 0 NOT NULL,
    total_views integer DEFAULT 0 NOT NULL,
    average_rating numeric(3,2),
    review_count integer DEFAULT 0 NOT NULL,
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    flash_price numeric,
    flash_starts_at timestamp with time zone,
    flash_ends_at timestamp with time zone,
    pre_order_open_at timestamp with time zone,
    pre_order_close_at timestamp with time zone,
    pre_order_estimated_ship_at date,
    pre_order_min_qty integer,
    pre_order_current_qty integer DEFAULT 0 NOT NULL,
    accepts_custom_order boolean DEFAULT false NOT NULL,
    skin_type_tags text[],
    restock_deadline timestamp with time zone,
    nutrition_info jsonb,
    production_days integer,
    condition_grade text,
    auto_disable_on_empty boolean DEFAULT false NOT NULL,
    item_type text DEFAULT 'regular'::text NOT NULL,
    allergens text[] DEFAULT '{}'::text[] NOT NULL,
    is_halal boolean,
    nutrition jsonb DEFAULT '{}'::jsonb NOT NULL,
    available_modes text[] DEFAULT ARRAY['dine-in'::text, 'takeaway'::text, 'delivery'::text] NOT NULL,
    barcode text,
    CONSTRAINT menu_items_recipe_yield_positive CHECK ((recipe_yield > (0)::numeric))
);


--
-- Name: menu_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.menu_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    order_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_visible boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT menu_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_user_id uuid NOT NULL,
    shop_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    severity text DEFAULT 'info'::text NOT NULL,
    read_at timestamp with time zone,
    dedupe_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: open_bills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.open_bills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    outlet_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    label text DEFAULT 'Cart'::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text,
    created_by uuid NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    order_id uuid,
    order_no text,
    action text NOT NULL,
    reason text,
    previous_status text,
    new_status text,
    total numeric(14,2),
    actor_id uuid,
    actor_name text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_audit_log_action_check CHECK ((action = ANY (ARRAY['void'::text, 'cancel'::text, 'refund'::text, 'reopen'::text, 'edit'::text, 'qr_unlock'::text])))
);


--
-- Name: order_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    opened_by uuid NOT NULL,
    reason text NOT NULL,
    description text,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    refund_amount numeric,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    menu_item_id uuid,
    name text NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);

ALTER TABLE ONLY public.order_items REPLICA IDENTITY FULL;


--
-- Name: order_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    attachment_url text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outlet_couriers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outlet_couriers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    courier_name text NOT NULL,
    service_type text DEFAULT 'regular'::text NOT NULL,
    logo_url text,
    base_fee numeric(12,2) DEFAULT 0 NOT NULL,
    per_km_fee numeric(12,2) DEFAULT 0 NOT NULL,
    min_order numeric(12,2) DEFAULT 0 NOT NULL,
    free_above numeric(12,2),
    max_distance_km numeric(8,2),
    eta_min_minutes integer DEFAULT 30 NOT NULL,
    eta_max_minutes integer DEFAULT 90 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outlets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outlets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    timezone text DEFAULT 'Asia/Jakarta'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: owner_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.owner_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    severity text DEFAULT 'info'::text NOT NULL,
    read_at timestamp with time zone,
    dismissed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    dedupe_key text
);

ALTER TABLE ONLY public.owner_notifications REPLICA IDENTITY FULL;


--
-- Name: page_layout_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_layout_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    layout_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    puck_data jsonb NOT NULL,
    title text,
    is_published_snapshot boolean DEFAULT false NOT NULL,
    reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: page_layouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_layouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    page_type text NOT NULL,
    slug text,
    title text DEFAULT 'Halaman'::text NOT NULL,
    puck_data jsonb DEFAULT '{"root": {"props": {}}, "content": []}'::jsonb NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_publish_at timestamp with time zone,
    CONSTRAINT page_layouts_page_type_check CHECK ((page_type = ANY (ARRAY['home'::text, 'menu_detail'::text, 'cart'::text, 'checkout'::text, 'custom'::text])))
);


--
-- Name: parked_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parked_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    label text DEFAULT 'Cart'::text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: patient_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    patient_name text NOT NULL,
    patient_contact text,
    birth_date date,
    gender text,
    blood_type text,
    allergies text,
    medical_history text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nik text,
    bpjs_number text,
    payer_type text,
    CONSTRAINT patient_records_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['L'::text, 'P'::text, 'other'::text])))),
    CONSTRAINT patient_records_payer_type_check CHECK (((payer_type IS NULL) OR (payer_type = ANY (ARRAY['umum'::text, 'bpjs'::text, 'asuransi'::text]))))
);


--
-- Name: patient_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.patient_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    visit_date timestamp with time zone DEFAULT now() NOT NULL,
    complaint text,
    diagnosis text,
    treatment text,
    prescription text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    icd10_code text,
    icd10_label text,
    icd10_secondary jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_features (
    plan_id uuid NOT NULL,
    feature_key text NOT NULL,
    requires_min_months integer DEFAULT 0 NOT NULL,
    limit_value integer,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    invoice_no text NOT NULL,
    amount_idr integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text,
    payment_proof_url text,
    paid_at timestamp with time zone,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_ref text,
    checkout_url text,
    subscription_id uuid
);


--
-- Name: plan_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    plan_id uuid,
    plan_code text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    billing_interval text DEFAULT 'monthly'::text NOT NULL,
    next_billing_at timestamp with time zone NOT NULL,
    payment_provider text,
    provider_subscription_id text,
    provider_token text,
    amount_idr integer DEFAULT 0 NOT NULL,
    last_invoice_id uuid,
    last_charge_at timestamp with time zone,
    failure_count integer DEFAULT 0 NOT NULL,
    cancelled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_themes (
    plan_id uuid NOT NULL,
    theme_key text NOT NULL,
    requires_min_months integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    price_idr integer NOT NULL,
    duration_days integer NOT NULL,
    features jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text,
    value_encrypted text,
    is_encrypted boolean DEFAULT false NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: platform_voucher_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_voucher_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    voucher_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    min_order numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    usage_limit integer,
    per_user_limit integer DEFAULT 1,
    usage_count integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'nominal'::text])))
);


--
-- Name: po_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    action text NOT NULL,
    from_status text,
    to_status text,
    reason text,
    metadata jsonb,
    actor_id uuid,
    actor_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pos_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pos_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    order_id uuid,
    order_no text,
    action text NOT NULL,
    reason text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    cashier_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pos_audit_log_action_check CHECK ((action = ANY (ARRAY['checkout_error'::text, 'checkout_retry'::text, 'checkout_success'::text, 'void'::text, 'cancel'::text])))
);


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    medication_id uuid,
    name_snapshot text NOT NULL,
    dose text,
    frequency text,
    duration text,
    qty integer DEFAULT 1 NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    patient_id uuid,
    visit_id uuid,
    doctor_name text,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    diagnosis text,
    notes text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescriptions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'dispensed'::text, 'cancelled'::text])))
);


--
-- Name: printers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.printers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'thermal'::text NOT NULL,
    connection_type text NOT NULL,
    address text,
    paper_size text DEFAULT '58'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT printers_connection_type_check CHECK ((connection_type = ANY (ARRAY['bluetooth'::text, 'usb'::text, 'wifi'::text, 'network'::text])))
);


--
-- Name: product_attribute_defs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_attribute_defs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    category_id uuid,
    name text NOT NULL,
    key text NOT NULL,
    field_type text DEFAULT 'text'::text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    placeholder text,
    unit text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_qa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_qa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    question text NOT NULL,
    answer text,
    answered_by uuid,
    answered_at timestamp with time zone,
    is_hidden boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_returns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    order_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    reason text NOT NULL,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    refund_amount numeric(12,2),
    refund_method text,
    restock boolean DEFAULT false NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    processed_at timestamp with time zone,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_returns_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])))
);


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    order_id uuid,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    photos text[] DEFAULT '{}'::text[],
    is_verified_purchase boolean DEFAULT false NOT NULL,
    shop_reply text,
    shop_replied_at timestamp with time zone,
    is_hidden boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: product_upsell_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_upsell_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    suggested_id uuid NOT NULL,
    score numeric(10,2) DEFAULT 0 NOT NULL,
    "position" smallint DEFAULT 0 NOT NULL,
    source text DEFAULT 'auto'::text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_upsell_suggestions_source_check CHECK ((source = ANY (ARRAY['auto'::text, 'manual'::text]))),
    CONSTRAINT upsell_no_self CHECK ((product_id <> suggested_id))
);


--
-- Name: products; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products WITH (security_invoker='on') AS
 SELECT id,
    shop_id,
    category_id AS product_category_id,
    name,
    slug,
    description,
    price,
    compare_price,
    cost_price,
    sku,
    weight_grams,
    length_cm,
    width_cm,
    height_cm,
    stock,
    low_stock_threshold,
    is_digital,
    digital_file_url,
    digital_file_name,
    is_pre_order,
    pre_order_days,
    images,
    video_url,
    attributes,
    tags,
    is_available,
    is_featured,
    sort_order,
    total_sold,
    total_views,
    average_rating,
    review_count,
    track_stock,
    recipe_yield,
    image_url,
    created_at,
    updated_at
   FROM public.menu_items;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promo_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promo_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    promo_id uuid NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid,
    amount numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: promos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.promos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    type public.promo_type DEFAULT 'percent'::public.promo_type NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    min_order numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    channel public.promo_channel DEFAULT 'all'::public.promo_channel NOT NULL,
    usage_limit integer,
    usage_count integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric DEFAULT 0 NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    received_qty numeric DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    supplier_id uuid,
    po_no text NOT NULL,
    status public.po_status DEFAULT 'draft'::public.po_status NOT NULL,
    order_date date DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta'::text))::date NOT NULL,
    expected_date date,
    received_date date,
    subtotal numeric DEFAULT 0 NOT NULL,
    tax numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    note text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    subscription jsonb NOT NULL,
    user_agent text,
    shop_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: recipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    menu_item_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    reason text,
    refund_method text DEFAULT 'cash'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rental_bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rental_bookings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    unit_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    customer_name text NOT NULL,
    customer_phone text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    total_days integer GENERATED ALWAYS AS ((end_date - start_date)) STORED,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    kyc_status text DEFAULT 'pending'::text NOT NULL,
    kyc_id_url text,
    kyc_drivers_license_url text,
    kyc_selfie_url text,
    kyc_verified_at timestamp with time zone,
    addons jsonb DEFAULT '[]'::jsonb NOT NULL,
    deposit_paid numeric(12,2),
    total_amount numeric(12,2),
    CONSTRAINT rental_bookings_check CHECK ((end_date > start_date)),
    CONSTRAINT rental_bookings_kyc_status_check CHECK ((kyc_status = ANY (ARRAY['pending'::text, 'submitted'::text, 'verified'::text, 'rejected'::text]))),
    CONSTRAINT rental_bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: rental_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rental_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    booking_id uuid NOT NULL,
    kind text NOT NULL,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    checklist jsonb DEFAULT '{}'::jsonb NOT NULL,
    condition_score integer,
    notes text,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    recorded_by uuid,
    CONSTRAINT rental_inspections_condition_score_check CHECK (((condition_score >= 1) AND (condition_score <= 10))),
    CONSTRAINT rental_inspections_kind_check CHECK ((kind = ANY (ARRAY['before'::text, 'after'::text])))
);


--
-- Name: rental_units; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rental_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    unit_code text,
    category text,
    description text,
    condition text DEFAULT 'good'::text NOT NULL,
    daily_price numeric(12,2),
    deposit_amount numeric(12,2),
    image_url text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subtype text,
    plate_number text,
    production_year integer,
    transmission text,
    fuel_type text,
    capacity integer,
    color text,
    odometer integer,
    next_service_at date,
    CONSTRAINT rental_units_condition_check CHECK ((condition = ANY (ARRAY['excellent'::text, 'good'::text, 'fair'::text, 'maintenance'::text])))
);


--
-- Name: restock_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.restock_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    product_id uuid NOT NULL,
    product_name text NOT NULL,
    customer_wa text NOT NULL,
    customer_name text,
    subscribed_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone
);


--
-- Name: sales_offerings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_offerings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    title text NOT NULL,
    short_desc text,
    long_desc text,
    price_label text,
    cover_image_url text,
    category text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: service_bundle_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_bundle_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bundle_id uuid NOT NULL,
    service_name text NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    unit_price_idr integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);


--
-- Name: service_bundles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_bundles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    total_price_idr integer DEFAULT 0 NOT NULL,
    original_price_idr integer DEFAULT 0 NOT NULL,
    duration_min integer DEFAULT 60 NOT NULL,
    max_uses integer,
    validity_days integer DEFAULT 30,
    is_active boolean DEFAULT true NOT NULL,
    cover_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shifts_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);

ALTER TABLE ONLY public.shifts REPLICA IDENTITY FULL;


--
-- Name: shop_about; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_about (
    shop_id uuid NOT NULL,
    story text,
    vision text,
    certifications jsonb DEFAULT '[]'::jsonb NOT NULL,
    team jsonb DEFAULT '[]'::jsonb NOT NULL,
    credentials jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_backups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_backups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    file_path text,
    size_bytes bigint,
    includes jsonb DEFAULT '[]'::jsonb NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone
);


--
-- Name: shop_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    chat_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    sender_role text NOT NULL,
    body text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text,
    attachment_type text,
    product_id uuid,
    CONSTRAINT shop_chat_messages_sender_role_check CHECK ((sender_role = ANY (ARRAY['buyer'::text, 'seller'::text])))
);


--
-- Name: shop_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    buyer_user_id uuid NOT NULL,
    last_message_at timestamp with time zone,
    buyer_archived boolean DEFAULT false NOT NULL,
    seller_archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    phone text,
    email text,
    total_orders integer DEFAULT 0 NOT NULL,
    total_spent numeric DEFAULT 0 NOT NULL,
    last_order_at timestamp with time zone,
    first_order_at timestamp with time zone,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    segment text DEFAULT 'new'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    phone text,
    email text,
    address text,
    instagram text,
    whatsapp text,
    tagline text,
    currency text DEFAULT 'IDR'::text NOT NULL,
    open_hours jsonb DEFAULT '{"fri": {"open": "08:00", "close": "22:00", "closed": false}, "mon": {"open": "08:00", "close": "22:00", "closed": false}, "sat": {"open": "08:00", "close": "22:00", "closed": false}, "sun": {"open": "08:00", "close": "22:00", "closed": false}, "thu": {"open": "08:00", "close": "22:00", "closed": false}, "tue": {"open": "08:00", "close": "22:00", "closed": false}, "wed": {"open": "08:00", "close": "22:00", "closed": false}}'::jsonb NOT NULL,
    qris_image_url text,
    qris_merchant_name text,
    payment_methods_enabled text[] DEFAULT ARRAY['cash'::text, 'qris'::text] NOT NULL,
    prep_minutes integer DEFAULT 20 NOT NULL,
    tax_percent numeric DEFAULT 0 NOT NULL,
    service_charge_percent numeric DEFAULT 0 NOT NULL,
    tax_inclusive boolean DEFAULT false NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    plan_expires_at timestamp with time zone,
    custom_domain text,
    custom_domain_verified_at timestamp with time zone,
    custom_domain_verify_token text,
    last_dns_check_at timestamp with time zone,
    suspended_at timestamp with time zone,
    suspended_reason text,
    active_theme_key text DEFAULT 'classic'::text NOT NULL,
    plan_started_at timestamp with time zone,
    receipt_header text,
    receipt_footer text,
    business_category_id uuid,
    marketplace_visible boolean DEFAULT true NOT NULL,
    verification_status text DEFAULT 'pending'::text NOT NULL,
    verified_at timestamp with time zone,
    total_sales_count integer DEFAULT 0 NOT NULL,
    total_gmv numeric(15,2) DEFAULT 0 NOT NULL,
    average_rating numeric(3,2),
    review_count integer DEFAULT 0 NOT NULL,
    commission_rate_override numeric(5,4),
    rating_avg numeric(3,2) DEFAULT 0,
    rating_count integer DEFAULT 0,
    is_featured boolean DEFAULT false NOT NULL,
    kyc_status text,
    kyc_document_url text,
    kyc_submitted_at timestamp with time zone,
    kyc_reviewed_at timestamp with time zone,
    kyc_reviewer_id uuid,
    kyc_reject_reason text,
    deposit_enabled boolean DEFAULT false NOT NULL,
    deposit_min_total numeric DEFAULT 0 NOT NULL,
    auto_reply_enabled boolean DEFAULT false NOT NULL,
    auto_reply_message text,
    business_subtype text,
    trial_ends_at timestamp with time zone,
    latitude numeric,
    longitude numeric,
    city text,
    deposit_notes text,
    deposit_percentage numeric DEFAULT 0 NOT NULL,
    require_id_upload boolean DEFAULT false NOT NULL,
    feature_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
    theme_key text DEFAULT 'classic'::text NOT NULL,
    onboarded_at timestamp with time zone,
    watermark_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT coffee_shops_kyc_status_check CHECK (((kyc_status IS NULL) OR (kyc_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])))),
    CONSTRAINT coffee_shops_verification_status_check CHECK ((verification_status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text]))),
    CONSTRAINT shops_deposit_percentage_check CHECK (((deposit_percentage >= (0)::numeric) AND (deposit_percentage <= (100)::numeric)))
);


--
-- Name: shop_health_score; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.shop_health_score WITH (security_invoker='true') AS
 SELECT s.id AS shop_id,
    s.name AS shop_name,
    s.slug,
    s.owner_id,
    (COALESCE(prod.cnt, (0)::bigint))::integer AS product_count,
    (COALESCE(ord30.cnt, (0)::bigint))::integer AS orders_last_30d,
    COALESCE(ord30.total, (0)::numeric) AS revenue_last_30d,
    (COALESCE(rev.avg_rating, (0)::numeric))::numeric(3,2) AS avg_rating,
    (COALESCE(rev.cnt, (0)::bigint))::integer AS review_count,
    s.created_at AS shop_created_at,
    (LEAST((100)::bigint, (((
        CASE
            WHEN (COALESCE(prod.cnt, (0)::bigint) >= 5) THEN (20)::bigint
            ELSE (COALESCE(prod.cnt, (0)::bigint) * 4)
        END +
        CASE
            WHEN (COALESCE(ord30.cnt, (0)::bigint) >= 20) THEN 30
            ELSE (((COALESCE(ord30.cnt, (0)::bigint))::numeric * 1.5))::integer
        END) +
        CASE
            WHEN (COALESCE(rev.avg_rating, (0)::numeric) >= (4)::numeric) THEN 25
            ELSE ((COALESCE(rev.avg_rating, (0)::numeric) * (5)::numeric))::integer
        END) +
        CASE
            WHEN ((now() - s.created_at) < '30 days'::interval) THEN 25
            ELSE 15
        END)))::integer AS health_score
   FROM (((public.shops s
     LEFT JOIN ( SELECT menu_items.shop_id,
            count(*) AS cnt
           FROM public.menu_items
          WHERE (menu_items.is_available = true)
          GROUP BY menu_items.shop_id) prod ON ((prod.shop_id = s.id)))
     LEFT JOIN ( SELECT orders.shop_id,
            count(*) AS cnt,
            sum(orders.total) AS total
           FROM public.orders
          WHERE ((orders.created_at > (now() - '30 days'::interval)) AND ((orders.status)::text <> ALL (ARRAY['cancelled'::text, 'refunded'::text])))
          GROUP BY orders.shop_id) ord30 ON ((ord30.shop_id = s.id)))
     LEFT JOIN ( SELECT product_reviews.shop_id,
            avg(product_reviews.rating) AS avg_rating,
            count(*) AS cnt
           FROM public.product_reviews
          WHERE (product_reviews.is_hidden = false)
          GROUP BY product_reviews.shop_id) rev ON ((rev.shop_id = s.id)));


--
-- Name: shop_membership_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_membership_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(14,2) NOT NULL,
    duration_days integer DEFAULT 30 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0 NOT NULL,
    perks jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_membership_tiers_discount_percent_check CHECK (((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))),
    CONSTRAINT shop_membership_tiers_duration_days_check CHECK ((duration_days > 0)),
    CONSTRAINT shop_membership_tiers_price_check CHECK ((price >= (0)::numeric))
);


--
-- Name: shop_portfolio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_portfolio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    image_url text NOT NULL,
    caption text,
    category text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    before_image_url text,
    after_image_url text,
    is_before_after boolean DEFAULT false NOT NULL
);


--
-- Name: shop_size_charts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_size_charts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    unit text DEFAULT 'cm'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    rows jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shop_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    ktp_url text NOT NULL,
    ktp_full_name text,
    ktp_number text,
    selfie_ktp_url text,
    npwp_url text,
    business_license_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    notes text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_verifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: shop_vouchers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_vouchers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    value numeric NOT NULL,
    min_order numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    usage_limit integer,
    per_user_limit integer,
    starts_at timestamp with time zone,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shop_vouchers_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'fixed'::text]))),
    CONSTRAINT shop_vouchers_value_check CHECK ((value > (0)::numeric))
);


--
-- Name: shop_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shop_wallets (
    shop_id uuid NOT NULL,
    available_balance numeric(14,2) DEFAULT 0 NOT NULL,
    pending_balance numeric(14,2) DEFAULT 0 NOT NULL,
    total_earned numeric(14,2) DEFAULT 0 NOT NULL,
    total_withdrawn numeric(14,2) DEFAULT 0 NOT NULL,
    total_commission_paid numeric(14,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    actor_id uuid,
    target_user_id uuid,
    target_email text,
    target_name text,
    action text NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    email text NOT NULL,
    role public.app_role NOT NULL,
    token text DEFAULT replace((gen_random_uuid())::text, '-'::text, ''::text) NOT NULL,
    invited_by uuid NOT NULL,
    accepted_at timestamp with time zone,
    accepted_by uuid,
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    allowed_modules text[]
);


--
-- Name: staff_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    outlet_id uuid,
    name text NOT NULL,
    role public.app_role DEFAULT 'cashier'::public.app_role NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    hire_date date,
    hourly_rate numeric,
    notes text,
    user_id uuid
);

ALTER TABLE ONLY public.staff_members REPLICA IDENTITY FULL;


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'cashier'::text NOT NULL,
    allowed_modules text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    type public.stock_movement_type NOT NULL,
    quantity numeric NOT NULL,
    unit_cost numeric,
    note text,
    order_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_opname_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_opname_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_opname_id uuid NOT NULL,
    ingredient_id uuid NOT NULL,
    system_stock numeric DEFAULT 0 NOT NULL,
    actual_stock numeric DEFAULT 0 NOT NULL,
    adjustment numeric DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stock_opnames; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_opnames (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    notes text,
    status text DEFAULT 'completed'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_galleries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_galleries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    title text NOT NULL,
    client_name text,
    client_email text,
    share_token text DEFAULT encode(extensions.gen_random_bytes(16), 'hex'::text) NOT NULL,
    expires_at timestamp with time zone,
    watermark_enabled boolean DEFAULT true NOT NULL,
    max_selections integer,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    photographer_id uuid,
    CONSTRAINT studio_galleries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'reviewed'::text, 'closed'::text])))
);


--
-- Name: studio_gallery_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_gallery_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gallery_id uuid NOT NULL,
    photo_url text NOT NULL,
    thumbnail_url text,
    is_selected boolean DEFAULT false NOT NULL,
    customer_note text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    location_type text NOT NULL,
    address text,
    description text,
    extra_fee numeric DEFAULT 0 NOT NULL,
    travel_radius_km numeric,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT studio_locations_location_type_check CHECK ((location_type = ANY (ARRAY['studio'::text, 'outdoor'::text, 'client'::text])))
);


--
-- Name: studio_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    duration_minutes integer DEFAULT 60 NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    includes text[] DEFAULT '{}'::text[] NOT NULL,
    max_capacity integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: studio_photographers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.studio_photographers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    role text DEFAULT 'photographer'::text NOT NULL,
    color text DEFAULT '#6366f1'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    contact_name text,
    phone text,
    email text,
    address text,
    note text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    lead_time_days integer DEFAULT 0 NOT NULL,
    payment_terms text
);


--
-- Name: system_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    event_type text NOT NULL,
    shop_id uuid,
    actor_id uuid,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    notes text
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    role_or_trip text,
    quote text NOT NULL,
    photo_url text,
    rating smallint,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: themes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.themes (
    key text NOT NULL,
    name text NOT NULL,
    description text,
    preview_image_url text,
    component_id text NOT NULL,
    tier_hint text,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: travel_installments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_installments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    package_id uuid,
    jamaah_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    total_amount numeric(14,2) NOT NULL,
    paid_amount numeric(14,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    schedule jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_installments_status_check CHECK ((status = ANY (ARRAY['open'::text, 'partial'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text])))
);


--
-- Name: travel_itineraries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_itineraries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    package_id uuid NOT NULL,
    day_number integer NOT NULL,
    time_label text,
    title text NOT NULL,
    description text,
    location text,
    image_url text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_itineraries_day_number_check CHECK ((day_number >= 1))
);


--
-- Name: travel_jamaah_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_jamaah_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    jamaah_id uuid NOT NULL,
    doc_type text NOT NULL,
    doc_number text,
    issued_at date,
    expiry_date date,
    file_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_jamaah_documents_doc_type_check CHECK ((doc_type = ANY (ARRAY['paspor'::text, 'visa'::text, 'vaksin'::text, 'ktp'::text, 'identitas_lain'::text]))),
    CONSTRAINT travel_jamaah_documents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: travel_jamaah_manifest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travel_jamaah_manifest (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    package_id uuid,
    full_name text NOT NULL,
    nik text,
    passport_number text,
    passport_expiry date,
    birth_date date,
    gender text,
    phone text,
    email text,
    address text,
    emergency_contact text,
    special_needs text,
    room_assignment text,
    document_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT travel_jamaah_manifest_gender_check CHECK (((gender IS NULL) OR (gender = ANY (ARRAY['L'::text, 'P'::text])))),
    CONSTRAINT travel_jamaah_manifest_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'docs-incomplete'::text, 'ready'::text, 'departed'::text, 'returned'::text, 'cancelled'::text])))
);


--
-- Name: umroh_facilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.umroh_facilities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    icon text DEFAULT 'Star'::text NOT NULL,
    title text NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: umroh_faqs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.umroh_faqs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: umroh_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.umroh_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    departure_date date,
    return_date date,
    duration_days integer,
    hotel_makkah text,
    hotel_madinah text,
    airline text,
    room_type text,
    price_quad numeric(14,2),
    price_triple numeric(14,2),
    price_double numeric(14,2),
    currency text DEFAULT 'IDR'::text NOT NULL,
    includes text[] DEFAULT ARRAY[]::text[],
    excludes text[] DEFAULT ARRAY[]::text[],
    cover_image_url text,
    brochure_pdf_url text,
    quota_total integer,
    quota_filled integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    package_type text DEFAULT 'umroh'::text NOT NULL,
    itinerary jsonb DEFAULT '[]'::jsonb NOT NULL,
    price_single numeric(14,2),
    CONSTRAINT umroh_packages_package_type_check CHECK ((package_type = ANY (ARRAY['umroh'::text, 'hajj'::text, 'tour-domestic'::text, 'tour-international'::text, 'event'::text])))
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    user_id uuid NOT NULL,
    default_outlet_id uuid,
    active_carts jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    shop_id uuid,
    outlet_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);

ALTER TABLE ONLY public.user_roles REPLICA IDENTITY FULL;


--
-- Name: v_shop_capabilities; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_shop_capabilities WITH (security_invoker='true') AS
 SELECT s.id AS shop_id,
    s.business_category_id,
    s.business_subtype,
    bc.slug AS category_slug,
    bc.name AS category_name,
    COALESCE(bc.flow_types, '{}'::text[]) AS flow_types,
    bc.booking_type,
    bc.booking_config,
    ( SELECT COALESCE(array_agg(DISTINCT u.f ORDER BY u.f), '{}'::text[]) AS "coalesce"
           FROM ( SELECT unnest(COALESCE(bc.enabled_features, '{}'::text[])) AS f
                UNION
                 SELECT jsonb_array_elements_text(COALESCE((s.feature_overrides -> 'enable'::text), '[]'::jsonb)) AS jsonb_array_elements_text) u
          WHERE (NOT (u.f IN ( SELECT jsonb_array_elements_text(COALESCE((s.feature_overrides -> 'disable'::text), '[]'::jsonb)) AS jsonb_array_elements_text)))) AS enabled_features
   FROM (public.shops s
     LEFT JOIN public.business_categories bc ON ((bc.id = s.business_category_id)));


--
-- Name: wallet_topup_presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_topup_presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    label text,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_topup_presets_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT wallet_topup_presets_bonus_amount_check CHECK ((bonus_amount >= (0)::numeric))
);


--
-- Name: wallet_topups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_topups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    shop_id uuid NOT NULL,
    preset_id uuid,
    amount numeric(14,2) NOT NULL,
    bonus_amount numeric(14,2) DEFAULT 0 NOT NULL,
    total_credit numeric(14,2) NOT NULL,
    payment_method text,
    status text DEFAULT 'pending'::text NOT NULL,
    paid_at timestamp with time zone,
    payment_proof_url text,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_topups_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT wallet_topups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    type public.wallet_txn_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    balance_after numeric(14,2),
    order_id uuid,
    withdrawal_id uuid,
    reference text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    event_id text NOT NULL,
    payload_summary jsonb,
    status text DEFAULT 'received'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wishlists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wishlists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    menu_item_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shop_id uuid NOT NULL,
    amount numeric(14,2) NOT NULL,
    admin_fee numeric(14,2) DEFAULT 0 NOT NULL,
    net_amount numeric(14,2) NOT NULL,
    bank_name text NOT NULL,
    bank_account_no text NOT NULL,
    bank_account_name text NOT NULL,
    status public.withdrawal_status DEFAULT 'pending'::public.withdrawal_status NOT NULL,
    notes text,
    reject_reason text,
    proof_url text,
    requested_by uuid,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric))
);


--
-- Name: ad_requests ad_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_requests
    ADD CONSTRAINT ad_requests_pkey PRIMARY KEY (id);


--
-- Name: attendances attendances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendances
    ADD CONSTRAINT attendances_pkey PRIMARY KEY (id);


--
-- Name: backup_schedules backup_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_schedules
    ADD CONSTRAINT backup_schedules_pkey PRIMARY KEY (shop_id);


--
-- Name: banners banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.banners
    ADD CONSTRAINT banners_pkey PRIMARY KEY (id);


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
