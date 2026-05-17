export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_requests: {
        Row: {
          ad_type: string | null
          budget_idr: number | null
          clicks: number | null
          created_at: string
          duration_days: number | null
          ends_at: string | null
          id: string
          impressions: number | null
          payment_method: string | null
          payment_tx_id: string | null
          position: string | null
          reject_reason: string | null
          shop_id: string | null
          starts_at: string | null
          status: string | null
          target_id: string | null
          target_image: string | null
          target_name: string | null
          updated_at: string
        }
        Insert: {
          ad_type?: string | null
          budget_idr?: number | null
          clicks?: number | null
          created_at?: string
          duration_days?: number | null
          ends_at?: string | null
          id?: string
          impressions?: number | null
          payment_method?: string | null
          payment_tx_id?: string | null
          position?: string | null
          reject_reason?: string | null
          shop_id?: string | null
          starts_at?: string | null
          status?: string | null
          target_id?: string | null
          target_image?: string | null
          target_name?: string | null
          updated_at?: string
        }
        Update: {
          ad_type?: string | null
          budget_idr?: number | null
          clicks?: number | null
          created_at?: string
          duration_days?: number | null
          ends_at?: string | null
          id?: string
          impressions?: number | null
          payment_method?: string | null
          payment_tx_id?: string | null
          position?: string | null
          reject_reason?: string | null
          shop_id?: string | null
          starts_at?: string | null
          status?: string | null
          target_id?: string | null
          target_image?: string | null
          target_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "ad_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      attendances: {
        Row: {
          business_date: string
          clock_in: string
          clock_out: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          note: string | null
          outlet_id: string
          shop_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_date?: string
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          note?: string | null
          outlet_id: string
          shop_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_date?: string
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          note?: string | null
          outlet_id?: string
          shop_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          created_at: string
          frequency: string
          last_run_at: string | null
          next_run_at: string
          retention_days: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          frequency?: string
          last_run_at?: string | null
          next_run_at?: string
          retention_days?: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          frequency?: string
          last_run_at?: string | null
          next_run_at?: string
          retention_days?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          bg_color: string | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          bg_color?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          bg_color?: string | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_settings: {
        Row: {
          account_name: string | null
          account_no: string | null
          bank_name: string | null
          cron_secret: string | null
          id: number
          instructions: string | null
          qris_image_url: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_no?: string | null
          bank_name?: string | null
          cron_secret?: string | null
          id?: number
          instructions?: string | null
          qris_image_url?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_no?: string | null
          bank_name?: string | null
          cron_secret?: string | null
          id?: number
          instructions?: string | null
          qris_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      booking_reschedule_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at?: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      booking_review_requests: {
        Row: {
          booking_id: string
          clicked_at: string | null
          customer_phone: string | null
          customer_user_id: string | null
          id: string
          sent_at: string
        }
        Insert: {
          booking_id: string
          clicked_at?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          sent_at?: string
        }
        Update: {
          booking_id?: string
          clicked_at?: string | null
          customer_phone?: string | null
          customer_user_id?: string | null
          id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_review_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_reviews: {
        Row: {
          body: string | null
          booking_id: string
          comment: string | null
          created_at: string
          customer_phone: string | null
          id: string
          rating: number
          shop_id: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          booking_id: string
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          id?: string
          rating: number
          shop_id: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          booking_id?: string
          comment?: string | null
          created_at?: string
          customer_phone?: string | null
          id?: string
          rating?: number
          shop_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "booking_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      booking_slots: {
        Row: {
          booking_type: string
          capacity: number
          created_at: string
          deposit_percent: number
          duration_minutes: number
          id: string
          is_active: boolean
          notes: string | null
          price: number | null
          service_name: string
          shop_id: string
          slot_date: string
          slot_time: string
          staff_user_id: string | null
          updated_at: string
        }
        Insert: {
          booking_type?: string
          capacity?: number
          created_at?: string
          deposit_percent?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          price?: number | null
          service_name: string
          shop_id: string
          slot_date: string
          slot_time: string
          staff_user_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_type?: string
          capacity?: number
          created_at?: string
          deposit_percent?: number
          duration_minutes?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          price?: number | null
          service_name?: string
          shop_id?: string
          slot_date?: string
          slot_time?: string
          staff_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_slots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "booking_slots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_slots_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      booking_waitlist: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          customer_user_id: string | null
          estimated_wait_minutes: number | null
          id: string
          notified_at: string | null
          party_size: number
          queue_number: number | null
          requested_date: string | null
          requested_time: string | null
          served_at: string | null
          shop_id: string
          slot_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          customer_user_id?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notified_at?: string | null
          party_size?: number
          queue_number?: number | null
          requested_date?: string | null
          requested_time?: string | null
          served_at?: string | null
          shop_id: string
          slot_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          estimated_wait_minutes?: number | null
          id?: string
          notified_at?: string | null
          party_size?: number
          queue_number?: number | null
          requested_date?: string | null
          requested_time?: string | null
          served_at?: string | null
          shop_id?: string
          slot_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_waitlist_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "booking_waitlist_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_waitlist_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "booking_waitlist_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "booking_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_type: string
          cancel_token: string
          cancelled_at: string | null
          cancelled_reason: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_user_id: string | null
          deposit_amount: number
          deposit_paid: boolean
          deposit_paid_at: string | null
          deposit_required: boolean
          deposit_status: string
          feedback_requested_at: string | null
          id: string
          location_address: string | null
          location_fee: number
          location_id: string | null
          location_name: string | null
          location_type: string | null
          notes: string | null
          party_size: number
          rating_submitted_at: string | null
          reminded_h1_at: string | null
          reminded_h1h_at: string | null
          reminded_h3_at: string | null
          shop_id: string
          slot_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_type?: string
          cancel_token?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_user_id?: string | null
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          deposit_required?: boolean
          deposit_status?: string
          feedback_requested_at?: string | null
          id?: string
          location_address?: string | null
          location_fee?: number
          location_id?: string | null
          location_name?: string | null
          location_type?: string | null
          notes?: string | null
          party_size?: number
          rating_submitted_at?: string | null
          reminded_h1_at?: string | null
          reminded_h1h_at?: string | null
          reminded_h3_at?: string | null
          shop_id: string
          slot_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_type?: string
          cancel_token?: string
          cancelled_at?: string | null
          cancelled_reason?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          deposit_required?: boolean
          deposit_status?: string
          feedback_requested_at?: string | null
          id?: string
          location_address?: string | null
          location_fee?: number
          location_id?: string | null
          location_name?: string | null
          location_type?: string | null
          notes?: string | null
          party_size?: number
          rating_submitted_at?: string | null
          reminded_h1_at?: string | null
          reminded_h1h_at?: string | null
          reminded_h3_at?: string | null
          shop_id?: string
          slot_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "studio_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "bookings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "booking_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      branding_audit: {
        Row: {
          changed_by: string
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          shop_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          shop_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          shop_id?: string
        }
        Relationships: []
      }
      bulk_pricing_rules: {
        Row: {
          created_at: string
          id: string
          label: string | null
          max_qty: number | null
          menu_item_id: string
          min_qty: number
          price: number
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          max_qty?: number | null
          menu_item_id: string
          min_qty: number
          price: number
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          max_qty?: number | null
          menu_item_id?: string
          min_qty?: number
          price?: number
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_pricing_rules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "bulk_pricing_rules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_pricing_rules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_pricing_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "bulk_pricing_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_pricing_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      bundle_items: {
        Row: {
          bundle_id: string
          component_id: string
          created_at: string
          id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          component_id: string
          created_at?: string
          id?: string
          quantity?: number
        }
        Update: {
          bundle_id?: string
          component_id?: string
          created_at?: string
          id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "bundle_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_items_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          banner_url: string | null
          booking_config: Json
          booking_enabled: boolean
          booking_type: string | null
          commission_override: number | null
          created_at: string
          description: string | null
          enabled_features: string[]
          flow_types: string[]
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          product_attributes: Json
          recommended_theme_key: string | null
          slug: string
          sort_order: number
          subtypes: Json
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          booking_config?: Json
          booking_enabled?: boolean
          booking_type?: string | null
          commission_override?: number | null
          created_at?: string
          description?: string | null
          enabled_features?: string[]
          flow_types?: string[]
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_attributes?: Json
          recommended_theme_key?: string | null
          slug: string
          sort_order?: number
          subtypes?: Json
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          booking_config?: Json
          booking_enabled?: boolean
          booking_type?: string | null
          commission_override?: number | null
          created_at?: string
          description?: string | null
          enabled_features?: string[]
          flow_types?: string[]
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_attributes?: Json
          recommended_theme_key?: string | null
          slug?: string
          sort_order?: number
          subtypes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          customer_id: string
          error: string | null
          id: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_id: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_id?: string
          error?: string | null
          id?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string | null
          shift_id: string
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          shift_id: string
          type: Database["public"]["Enums"]["cash_movement_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          shift_id?: string
          type?: Database["public"]["Enums"]["cash_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "cash_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_shifts: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_cash: number | null
          created_at: string
          expected_cash: number | null
          id: string
          note: string | null
          opened_at: string
          opened_by: string
          opening_cash: number
          outlet_id: string
          shop_id: string
          status: Database["public"]["Enums"]["shift_status"]
          updated_at: string
          variance: number | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by: string
          opening_cash?: number
          outlet_id: string
          shop_id: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
          variance?: number | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string
          expected_cash?: number | null
          id?: string
          note?: string | null
          opened_at?: string
          opened_by?: string
          opening_cash?: number
          outlet_id?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["shift_status"]
          updated_at?: string
          variance?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          kds_station: string | null
          name: string
          printer_id: string | null
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          kds_station?: string | null
          name: string
          printer_id?: string | null
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          kds_station?: string | null
          name?: string
          printer_id?: string | null
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_printer_id_fkey"
            columns: ["printer_id"]
            isOneToOne: false
            referencedRelation: "printers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      couriers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          note: string | null
          phone: string
          plate_number: string | null
          shop_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          note?: string | null
          phone: string
          plate_number?: string | null
          shop_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          note?: string | null
          phone?: string
          plate_number?: string | null
          shop_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      course_certificates: {
        Row: {
          certificate_number: string
          course_id: string
          id: string
          issued_at: string
          metadata: Json
          pdf_url: string | null
          shop_id: string
          user_id: string
        }
        Insert: {
          certificate_number?: string
          course_id: string
          id?: string
          issued_at?: string
          metadata?: Json
          pdf_url?: string | null
          shop_id: string
          user_id: string
        }
        Update: {
          certificate_number?: string
          course_id?: string
          id?: string
          issued_at?: string
          metadata?: Json
          pdf_url?: string | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "course_certificates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          enrolled_at: string
          id: string
          menu_item_id: string
          user_id: string
        }
        Insert: {
          enrolled_at?: string
          id?: string
          menu_item_id: string
          user_id: string
        }
        Update: {
          enrolled_at?: string
          id?: string
          menu_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "course_enrollments_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          is_free_preview: boolean
          module_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean
          module_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean
          module_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          menu_item_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          menu_item_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          menu_item_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "course_modules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_modules_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_runs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          job_name: string
          result: Json
          started_at: string
          status: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_name: string
          result?: Json
          started_at?: string
          status?: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string
          result?: Json
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      custom_order_quotes: {
        Row: {
          breakdown: Json
          created_at: string
          id: string
          notes: string | null
          request_id: string
          responded_at: string | null
          sent_at: string | null
          shop_id: string
          status: string
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          id?: string
          notes?: string | null
          request_id: string
          responded_at?: string | null
          sent_at?: string | null
          shop_id: string
          status?: string
          total: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          breakdown?: Json
          created_at?: string
          id?: string
          notes?: string | null
          request_id?: string
          responded_at?: string | null
          sent_at?: string | null
          shop_id?: string
          status?: string
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "custom_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_quotes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "custom_order_quotes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_quotes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      custom_order_requests: {
        Row: {
          attachment_urls: string[] | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          customer_contact: string
          customer_name: string
          deadline: string | null
          description: string
          id: string
          owner_note: string | null
          product_id: string | null
          reference_image_url: string | null
          shop_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          customer_contact: string
          customer_name: string
          deadline?: string | null
          description: string
          id?: string
          owner_note?: string | null
          product_id?: string | null
          reference_image_url?: string | null
          shop_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          customer_contact?: string
          customer_name?: string
          deadline?: string | null
          description?: string
          id?: string
          owner_note?: string | null
          product_id?: string | null
          reference_image_url?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "custom_order_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "custom_order_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_order_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      custom_order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          note: string | null
          request_id: string
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id: string
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          note?: string | null
          request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_order_status_history_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "custom_order_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone: string
          recipient_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_favorites: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_memberships: {
        Row: {
          auto_renew: boolean
          created_at: string
          customer_user_id: string
          expires_at: string
          id: string
          paid_amount: number
          payment_method: string | null
          sessions_remaining: number | null
          sessions_total: number | null
          shop_id: string
          started_at: string
          status: string
          tier_id: string
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          customer_user_id: string
          expires_at: string
          id?: string
          paid_amount?: number
          payment_method?: string | null
          sessions_remaining?: number | null
          sessions_total?: number | null
          shop_id: string
          started_at?: string
          status?: string
          tier_id: string
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          customer_user_id?: string
          expires_at?: string
          id?: string
          paid_amount?: number
          payment_method?: string | null
          sessions_remaining?: number | null
          sessions_total?: number | null
          shop_id?: string
          started_at?: string
          status?: string
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "customer_memberships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "customer_memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "shop_membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_profiles: {
        Row: {
          created_at: string
          default_address: string | null
          default_city: string | null
          default_postal_code: string | null
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_address?: string | null
          default_city?: string | null
          default_postal_code?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_address?: string | null
          default_city?: string | null
          default_postal_code?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          color: string | null
          created_at: string
          criteria: Json
          description: string | null
          id: string
          is_auto: boolean
          name: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_auto?: boolean
          name: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          is_auto?: boolean
          name?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_treatments: {
        Row: {
          after_photos: Json
          allergies_noted: string | null
          before_photos: Json
          created_at: string
          customer_name: string
          customer_phone: string | null
          customer_user_id: string | null
          formula: string | null
          id: string
          notes: string | null
          performed_at: string
          service_name: string
          shop_id: string
          staff_name: string | null
        }
        Insert: {
          after_photos?: Json
          allergies_noted?: string | null
          before_photos?: Json
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          customer_user_id?: string | null
          formula?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          service_name: string
          shop_id: string
          staff_name?: string | null
        }
        Update: {
          after_photos?: Json
          allergies_noted?: string | null
          before_photos?: Json
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          customer_user_id?: string | null
          formula?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          service_name?: string
          shop_id?: string
          staff_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_treatments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "customer_treatments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_treatments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      customer_wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          customer_user_id: string
          id: string
          note: string | null
          ref_order_id: string | null
          ref_topup_id: string | null
          shop_id: string
          type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          customer_user_id: string
          id?: string
          note?: string | null
          ref_order_id?: string | null
          ref_topup_id?: string | null
          shop_id: string
          type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          customer_user_id?: string
          id?: string
          note?: string | null
          ref_order_id?: string | null
          ref_topup_id?: string | null
          shop_id?: string
          type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "customer_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wallets: {
        Row: {
          balance: number
          created_at: string
          customer_user_id: string
          id: string
          shop_id: string
          total_spent: number
          total_topped_up: number
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          customer_user_id: string
          id?: string
          shop_id: string
          total_spent?: number
          total_topped_up?: number
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          customer_user_id?: string
          id?: string
          shop_id?: string
          total_spent?: number
          total_topped_up?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wallets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "customer_wallets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wallets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      delivery_settings: {
        Row: {
          base_fee: number
          close_time: string | null
          created_at: string
          delivery_enabled: boolean
          free_above: number | null
          max_eta_minutes: number
          min_eta_minutes: number
          min_order: number
          mode: Database["public"]["Enums"]["delivery_mode"]
          notes: string | null
          open_time: string | null
          pickup_enabled: boolean
          shop_id: string
          updated_at: string
        }
        Insert: {
          base_fee?: number
          close_time?: string | null
          created_at?: string
          delivery_enabled?: boolean
          free_above?: number | null
          max_eta_minutes?: number
          min_eta_minutes?: number
          min_order?: number
          mode?: Database["public"]["Enums"]["delivery_mode"]
          notes?: string | null
          open_time?: string | null
          pickup_enabled?: boolean
          shop_id: string
          updated_at?: string
        }
        Update: {
          base_fee?: number
          close_time?: string | null
          created_at?: string
          delivery_enabled?: boolean
          free_above?: number | null
          max_eta_minutes?: number
          min_eta_minutes?: number
          min_order?: number
          mode?: Database["public"]["Enums"]["delivery_mode"]
          notes?: string | null
          open_time?: string | null
          pickup_enabled?: boolean
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          area_note: string | null
          created_at: string
          fee: number
          id: string
          is_active: boolean
          max_eta_minutes: number
          min_eta_minutes: number
          name: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area_note?: string | null
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          max_eta_minutes?: number
          min_eta_minutes?: number
          name: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area_note?: string | null
          created_at?: string
          fee?: number
          id?: string
          is_active?: boolean
          max_eta_minutes?: number
          min_eta_minutes?: number
          name?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      domain_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_domain: string | null
          notes: string | null
          old_domain: string | null
          shop_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_domain?: string | null
          notes?: string | null
          old_domain?: string | null
          shop_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_domain?: string | null
          notes?: string | null
          old_domain?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_audit_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "domain_audit_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_audit_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      domain_blacklist: {
        Row: {
          created_at: string
          domain: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          reason?: string | null
        }
        Relationships: []
      }
      domain_verify_attempts: {
        Row: {
          actor_id: string | null
          created_at: string
          domain: string | null
          id: string
          result: string | null
          shop_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          result?: string | null
          shop_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          domain?: string | null
          id?: string
          result?: string | null
          shop_id?: string
        }
        Relationships: []
      }
      expiry_reminder_rules: {
        Row: {
          audience: string
          channels: string[]
          created_at: string
          days_before: number
          id: string
          is_active: boolean
          sort_order: number
          template_body: string
          template_subject: string
          updated_at: string
        }
        Insert: {
          audience: string
          channels?: string[]
          created_at?: string
          days_before: number
          id?: string
          is_active?: boolean
          sort_order?: number
          template_body: string
          template_subject: string
          updated_at?: string
        }
        Update: {
          audience?: string
          channels?: string[]
          created_at?: string
          days_before?: number
          id?: string
          is_active?: boolean
          sort_order?: number
          template_body?: string
          template_subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      expiry_reminder_shop_rules: {
        Row: {
          audience: string
          channels: string[]
          created_at: string
          days_before: number
          id: string
          is_active: boolean
          shop_id: string
          sort_order: number
          template_body: string
          template_subject: string
          updated_at: string
        }
        Insert: {
          audience: string
          channels?: string[]
          created_at?: string
          days_before: number
          id?: string
          is_active?: boolean
          shop_id: string
          sort_order?: number
          template_body: string
          template_subject: string
          updated_at?: string
        }
        Update: {
          audience?: string
          channels?: string[]
          created_at?: string
          days_before?: number
          id?: string
          is_active?: boolean
          shop_id?: string
          sort_order?: number
          template_body?: string
          template_subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiry_reminder_shop_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "expiry_reminder_shop_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expiry_reminder_shop_rules_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      expiry_reminder_shop_settings: {
        Row: {
          created_at: string
          grace_days: number
          max_per_shop_per_day: number
          notes: string | null
          on_expiry_action: string
          override_rules: boolean
          override_schedule: boolean
          send_hour_local: number
          shop_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grace_days?: number
          max_per_shop_per_day?: number
          notes?: string | null
          on_expiry_action?: string
          override_rules?: boolean
          override_schedule?: boolean
          send_hour_local?: number
          shop_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grace_days?: number
          max_per_shop_per_day?: number
          notes?: string | null
          on_expiry_action?: string
          override_rules?: boolean
          override_schedule?: boolean
          send_hour_local?: number
          shop_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiry_reminder_shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "expiry_reminder_shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expiry_reminder_shop_settings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          is_active: boolean
          key: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      flash_sales: {
        Row: {
          created_at: string
          ends_at: string
          flash_price: number
          id: string
          is_active: boolean
          menu_item_id: string
          original_price: number
          shop_id: string
          starts_at: string
          stock_limit: number | null
          stock_sold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          flash_price: number
          id?: string
          is_active?: boolean
          menu_item_id: string
          original_price: number
          shop_id: string
          starts_at: string
          stock_limit?: number | null
          stock_sold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          flash_price?: number
          id?: string
          is_active?: boolean
          menu_item_id?: string
          original_price?: number
          shop_id?: string
          starts_at?: string
          stock_limit?: number | null
          stock_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flash_sales_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "flash_sales_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "flash_sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flash_sales_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      flyers: {
        Row: {
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          image_url: string
          is_active: boolean
          linked_id: string | null
          linked_type: string | null
          shop_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          linked_id?: string | null
          linked_type?: string | null
          shop_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          linked_id?: string | null
          linked_type?: string | null
          shop_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flyers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "flyers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flyers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      fnb_combos: {
        Row: {
          combo_price: number
          created_at: string
          description: string | null
          discount_pct: number | null
          id: string
          image_url: string | null
          is_active: boolean
          items: Json
          name: string
          original_price: number
          shop_id: string
          sort_order: number
          tag: string | null
        }
        Insert: {
          combo_price: number
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          items?: Json
          name: string
          original_price?: number
          shop_id: string
          sort_order?: number
          tag?: string | null
        }
        Update: {
          combo_price?: number
          created_at?: string
          description?: string | null
          discount_pct?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          items?: Json
          name?: string
          original_price?: number
          shop_id?: string
          sort_order?: number
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fnb_combos_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "fnb_combos_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fnb_combos_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      freelance_contracts: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          deliverables: string
          end_date: string
          id: string
          payment_terms: string
          project_description: string
          project_name: string
          revision_count: number
          shop_id: string
          signed_at: string | null
          start_date: string
          status: string
          total_value: number
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          deliverables: string
          end_date: string
          id?: string
          payment_terms: string
          project_description: string
          project_name: string
          revision_count?: number
          shop_id: string
          signed_at?: string | null
          start_date: string
          status?: string
          total_value: number
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          deliverables?: string
          end_date?: string
          id?: string
          payment_terms?: string
          project_description?: string
          project_name?: string
          revision_count?: number
          shop_id?: string
          signed_at?: string | null
          start_date?: string
          status?: string
          total_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "freelance_contracts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "freelance_contracts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "freelance_contracts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      ingredients: {
        Row: {
          category: string | null
          cost_per_unit: number
          created_at: string
          current_stock: number
          default_supplier_id: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          shop_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          default_supplier_id?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          shop_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string
          current_stock?: number
          default_supplier_id?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          shop_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_deliverables: {
        Row: {
          created_at: string
          custom_order_id: string | null
          customer_contact: string
          customer_name: string
          delivery_token: string
          description: string | null
          external_url: string | null
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          received_at: string | null
          sent_at: string | null
          shop_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_order_id?: string | null
          customer_contact: string
          customer_name: string
          delivery_token?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          received_at?: string | null
          sent_at?: string | null
          shop_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_order_id?: string | null
          customer_contact?: string
          customer_name?: string
          delivery_token?: string
          description?: string | null
          external_url?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          received_at?: string | null
          sent_at?: string | null
          shop_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_deliverables_custom_order_id_fkey"
            columns: ["custom_order_id"]
            isOneToOne: false
            referencedRelation: "custom_order_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_deliverables_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "job_deliverables_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_deliverables_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          linked_id: string | null
          linked_type: string | null
          message: string | null
          notes: string | null
          phone: string
          shop_id: string
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          message?: string | null
          notes?: string | null
          phone: string
          shop_id: string
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          linked_id?: string | null
          linked_type?: string | null
          message?: string | null
          notes?: string | null
          phone?: string
          shop_id?: string
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "leads_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          lesson_id: string
          updated_at: string
          user_id: string
          watch_seconds: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id: string
          updated_at?: string
          user_id: string
          watch_seconds?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watch_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          order_id: string | null
          reason: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          order_id?: string | null
          reason: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          order_id?: string | null
          reason?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_points: {
        Row: {
          balance: number
          id: string
          shop_id: string
          total_earned: number
          total_redeemed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          shop_id: string
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          shop_id?: string
          total_earned?: number
          total_redeemed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          created_at: string
          is_active: boolean
          max_redeem_percent: number
          min_redeem_points: number
          point_value: number
          rupiah_per_point: number
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          max_redeem_percent?: number
          min_redeem_points?: number
          point_value?: number
          rupiah_per_point?: number
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          max_redeem_percent?: number
          min_redeem_points?: number
          point_value?: number
          rupiah_per_point?: number
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          audience_count: number
          audience_segment: string | null
          channel: string
          created_at: string
          created_by: string
          id: string
          name: string
          scheduled_at: string | null
          sent_at: string | null
          shop_id: string
          status: string
          template: string
          updated_at: string
        }
        Insert: {
          audience_count?: number
          audience_segment?: string | null
          channel?: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          scheduled_at?: string | null
          sent_at?: string | null
          shop_id: string
          status?: string
          template?: string
          updated_at?: string
        }
        Update: {
          audience_count?: number
          audience_segment?: string | null
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          scheduled_at?: string | null
          sent_at?: string | null
          shop_id?: string
          status?: string
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          notes: string | null
          options: Json | null
          product_id: string
          quantity: number
          shop_id: string
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          notes?: string | null
          options?: Json | null
          product_id: string
          quantity?: number
          shop_id: string
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          options?: Json | null
          product_id?: string
          quantity?: number
          shop_id?: string
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "marketplace_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "marketplace_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_cart_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "marketplace_cart_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_cart_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      marketplace_carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          created_at: string
          dose: string | null
          expiry_date: string | null
          form: string | null
          generic_name: string | null
          id: string
          is_active: boolean
          low_stock_threshold: number
          manufacturer: string | null
          name: string
          notes: string | null
          price: number | null
          shop_id: string
          stock: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          expiry_date?: string | null
          form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          manufacturer?: string | null
          name: string
          notes?: string | null
          price?: number | null
          shop_id: string
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          expiry_date?: string | null
          form?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean
          low_stock_threshold?: number
          manufacturer?: string | null
          name?: string
          notes?: string | null
          price?: number | null
          shop_id?: string
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "medications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      menu_item_option_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_select: number
          menu_item_id: string
          name: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          menu_item_id: string
          name: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          menu_item_id?: string
          name?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_item_options: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          name: string
          price_adjustment: number
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          name: string
          price_adjustment?: number
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          name?: string
          price_adjustment?: number
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "menu_item_option_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_variants: {
        Row: {
          attributes: Json
          barcode: string | null
          created_at: string
          id: string
          is_available: boolean
          menu_item_id: string
          name: string
          price: number
          shop_id: string
          sku: string | null
          sort_order: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          barcode?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id: string
          name: string
          price?: number
          shop_id: string
          sku?: string | null
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          barcode?: string | null
          created_at?: string
          id?: string
          is_available?: boolean
          menu_item_id?: string
          name?: string
          price?: number
          shop_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_variants_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "menu_item_variants_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_variants_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      menu_items: {
        Row: {
          accepts_custom_order: boolean
          allergens: string[]
          attributes: Json
          auto_disable_on_empty: boolean
          available_modes: string[]
          average_rating: number | null
          barcode: string | null
          category_id: string | null
          compare_price: number | null
          condition_grade: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          digital_file_name: string | null
          digital_file_url: string | null
          flash_ends_at: string | null
          flash_price: number | null
          flash_starts_at: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          images: Json
          is_available: boolean
          is_digital: boolean
          is_featured: boolean
          is_halal: boolean | null
          is_pre_order: boolean
          item_type: string
          length_cm: number | null
          low_stock_threshold: number | null
          name: string
          nutrition: Json
          nutrition_info: Json | null
          pre_order_close_at: string | null
          pre_order_current_qty: number
          pre_order_days: number | null
          pre_order_estimated_ship_at: string | null
          pre_order_min_qty: number | null
          pre_order_open_at: string | null
          price: number
          production_days: number | null
          rating_avg: number | null
          rating_count: number | null
          recipe_yield: number
          restock_deadline: string | null
          review_count: number
          shop_id: string
          skin_type_tags: string[] | null
          sku: string | null
          slug: string | null
          sort_order: number
          stock: number | null
          tags: string[]
          total_sold: number
          total_views: number
          track_stock: boolean
          updated_at: string
          video_url: string | null
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          accepts_custom_order?: boolean
          allergens?: string[]
          attributes?: Json
          auto_disable_on_empty?: boolean
          available_modes?: string[]
          average_rating?: number | null
          barcode?: string | null
          category_id?: string | null
          compare_price?: number | null
          condition_grade?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          flash_ends_at?: string | null
          flash_price?: number | null
          flash_starts_at?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          images?: Json
          is_available?: boolean
          is_digital?: boolean
          is_featured?: boolean
          is_halal?: boolean | null
          is_pre_order?: boolean
          item_type?: string
          length_cm?: number | null
          low_stock_threshold?: number | null
          name: string
          nutrition?: Json
          nutrition_info?: Json | null
          pre_order_close_at?: string | null
          pre_order_current_qty?: number
          pre_order_days?: number | null
          pre_order_estimated_ship_at?: string | null
          pre_order_min_qty?: number | null
          pre_order_open_at?: string | null
          price?: number
          production_days?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          recipe_yield?: number
          restock_deadline?: string | null
          review_count?: number
          shop_id: string
          skin_type_tags?: string[] | null
          sku?: string | null
          slug?: string | null
          sort_order?: number
          stock?: number | null
          tags?: string[]
          total_sold?: number
          total_views?: number
          track_stock?: boolean
          updated_at?: string
          video_url?: string | null
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          accepts_custom_order?: boolean
          allergens?: string[]
          attributes?: Json
          auto_disable_on_empty?: boolean
          available_modes?: string[]
          average_rating?: number | null
          barcode?: string | null
          category_id?: string | null
          compare_price?: number | null
          condition_grade?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          flash_ends_at?: string | null
          flash_price?: number | null
          flash_starts_at?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          images?: Json
          is_available?: boolean
          is_digital?: boolean
          is_featured?: boolean
          is_halal?: boolean | null
          is_pre_order?: boolean
          item_type?: string
          length_cm?: number | null
          low_stock_threshold?: number | null
          name?: string
          nutrition?: Json
          nutrition_info?: Json | null
          pre_order_close_at?: string | null
          pre_order_current_qty?: number
          pre_order_days?: number | null
          pre_order_estimated_ship_at?: string | null
          pre_order_min_qty?: number | null
          pre_order_open_at?: string | null
          price?: number
          production_days?: number | null
          rating_avg?: number | null
          rating_count?: number | null
          recipe_yield?: number
          restock_deadline?: string | null
          review_count?: number
          shop_id?: string
          skin_type_tags?: string[] | null
          sku?: string | null
          slug?: string | null
          sort_order?: number
          stock?: number | null
          tags?: string[]
          total_sold?: number
          total_views?: number
          track_stock?: boolean
          updated_at?: string
          video_url?: string | null
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      menu_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_visible: boolean
          menu_item_id: string
          order_id: string
          rating: number
          shop_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_item_id: string
          order_id: string
          rating: number
          shop_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          menu_item_id?: string
          order_id?: string
          rating?: number
          shop_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          link: string | null
          read_at: string | null
          recipient_user_id: string
          severity: string
          shop_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_user_id: string
          severity?: string
          shop_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          recipient_user_id?: string
          severity?: string
          shop_id?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      open_bills: {
        Row: {
          created_at: string
          created_by: string
          id: string
          items: Json
          label: string
          note: string | null
          outlet_id: string
          shop_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          items?: Json
          label?: string
          note?: string | null
          outlet_id: string
          shop_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          items?: Json
          label?: string
          note?: string | null
          outlet_id?: string
          shop_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_bills_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_bills_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "open_bills_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_bills_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      order_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          metadata: Json
          new_status: string | null
          order_id: string | null
          order_no: string | null
          outlet_id: string | null
          previous_status: string | null
          reason: string | null
          shop_id: string
          total: number | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          order_id?: string | null
          order_no?: string | null
          outlet_id?: string | null
          previous_status?: string | null
          reason?: string | null
          shop_id: string
          total?: number | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          new_status?: string | null
          order_id?: string | null
          order_no?: string | null
          outlet_id?: string | null
          previous_status?: string | null
          reason?: string | null
          shop_id?: string
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_audit_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_audit_log_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "order_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      order_disputes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          opened_by: string
          order_id: string
          photos: Json
          reason: string
          refund_amount: number | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          opened_by: string
          order_id: string
          photos?: Json
          reason: string
          refund_amount?: number | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          opened_by?: string
          order_id?: string
          photos?: Json
          reason?: string
          refund_amount?: number | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          note: string | null
          order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          note?: string | null
          order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          note?: string | null
          order_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          order_id: string
          read_at: string | null
          sender_id: string
          sender_role: string
          shop_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          order_id: string
          read_at?: string | null
          sender_id: string
          sender_role: string
          shop_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
          sender_role?: string
          shop_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_tendered: number | null
          assigned_at: string | null
          balance_due: number
          balance_paid: boolean
          balance_paid_at: string | null
          business_date: string
          cashier_id: string | null
          change_due: number
          channel: Database["public"]["Enums"]["order_channel"]
          client_idempotency_key: string | null
          commission_amount: number | null
          commission_rate: number | null
          courier_id: string | null
          courier_name: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          customer_signature_url: string | null
          customer_user_id: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number
          delivery_proof_url: string | null
          delivery_zone_id: string | null
          deposit_amount: number
          deposit_paid: boolean
          deposit_paid_at: string | null
          discount: number
          escrow_released_at: string | null
          escrow_status: string | null
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          marketplace_order: boolean | null
          membership_discount: number
          membership_discount_percent: number
          membership_tier_id: string | null
          net_to_shop: number | null
          note: string | null
          order_mode: string | null
          order_no: string
          order_source: string | null
          outlet_id: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_proof_url: string | null
          payment_split: Json
          payment_status: Database["public"]["Enums"]["payment_status"]
          picked_up_at: string | null
          platform_voucher_code: string | null
          platform_voucher_discount: number
          points_earned: number
          points_redeemed: number
          promo_code: string | null
          promo_id: string | null
          requires_deposit: boolean
          scheduled_for: string | null
          service_charge: number
          shift_id: string | null
          shop_id: string
          shop_voucher_code: string | null
          shop_voucher_discount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_label: string | null
          tax: number
          tip_amount: number
          total: number
          tracking_number: string | null
          tracking_set_at: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          amount_tendered?: number | null
          assigned_at?: string | null
          balance_due?: number
          balance_paid?: boolean
          balance_paid_at?: string | null
          business_date?: string
          cashier_id?: string | null
          change_due?: number
          channel?: Database["public"]["Enums"]["order_channel"]
          client_idempotency_key?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          courier_id?: string | null
          courier_name?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_signature_url?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_proof_url?: string | null
          delivery_zone_id?: string | null
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          discount?: number
          escrow_released_at?: string | null
          escrow_status?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          marketplace_order?: boolean | null
          membership_discount?: number
          membership_discount_percent?: number
          membership_tier_id?: string | null
          net_to_shop?: number | null
          note?: string | null
          order_mode?: string | null
          order_no: string
          order_source?: string | null
          outlet_id: string
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_proof_url?: string | null
          payment_split?: Json
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          platform_voucher_code?: string | null
          platform_voucher_discount?: number
          points_earned?: number
          points_redeemed?: number
          promo_code?: string | null
          promo_id?: string | null
          requires_deposit?: boolean
          scheduled_for?: string | null
          service_charge?: number
          shift_id?: string | null
          shop_id: string
          shop_voucher_code?: string | null
          shop_voucher_discount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_label?: string | null
          tax?: number
          tip_amount?: number
          total?: number
          tracking_number?: string | null
          tracking_set_at?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_tendered?: number | null
          assigned_at?: string | null
          balance_due?: number
          balance_paid?: boolean
          balance_paid_at?: string | null
          business_date?: string
          cashier_id?: string | null
          change_due?: number
          channel?: Database["public"]["Enums"]["order_channel"]
          client_idempotency_key?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          courier_id?: string | null
          courier_name?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          customer_signature_url?: string | null
          customer_user_id?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          delivery_proof_url?: string | null
          delivery_zone_id?: string | null
          deposit_amount?: number
          deposit_paid?: boolean
          deposit_paid_at?: string | null
          discount?: number
          escrow_released_at?: string | null
          escrow_status?: string | null
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"]
          id?: string
          marketplace_order?: boolean | null
          membership_discount?: number
          membership_discount_percent?: number
          membership_tier_id?: string | null
          net_to_shop?: number | null
          note?: string | null
          order_mode?: string | null
          order_no?: string
          order_source?: string | null
          outlet_id?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_proof_url?: string | null
          payment_split?: Json
          payment_status?: Database["public"]["Enums"]["payment_status"]
          picked_up_at?: string | null
          platform_voucher_code?: string | null
          platform_voucher_discount?: number
          points_earned?: number
          points_redeemed?: number
          promo_code?: string | null
          promo_id?: string | null
          requires_deposit?: boolean
          scheduled_for?: string | null
          service_charge?: number
          shift_id?: string | null
          shop_id?: string
          shop_voucher_code?: string | null
          shop_voucher_discount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_label?: string | null
          tax?: number
          tip_amount?: number
          total?: number
          tracking_number?: string | null
          tracking_set_at?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_membership_tier_id_fkey"
            columns: ["membership_tier_id"]
            isOneToOne: false
            referencedRelation: "shop_membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      outlet_couriers: {
        Row: {
          base_fee: number
          courier_name: string
          created_at: string
          eta_max_minutes: number
          eta_min_minutes: number
          free_above: number | null
          id: string
          is_active: boolean
          logo_url: string | null
          max_distance_km: number | null
          min_order: number
          note: string | null
          outlet_id: string
          per_km_fee: number
          service_type: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          base_fee?: number
          courier_name: string
          created_at?: string
          eta_max_minutes?: number
          eta_min_minutes?: number
          free_above?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_distance_km?: number | null
          min_order?: number
          note?: string | null
          outlet_id: string
          per_km_fee?: number
          service_type?: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          base_fee?: number
          courier_name?: string
          created_at?: string
          eta_max_minutes?: number
          eta_min_minutes?: number
          free_above?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_distance_km?: number | null
          min_order?: number
          note?: string | null
          outlet_id?: string
          per_km_fee?: number
          service_type?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlet_couriers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_couriers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "outlet_couriers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlet_couriers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      outlets: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          shop_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          shop_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          shop_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outlets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "outlets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outlets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      owner_notifications: {
        Row: {
          body: string | null
          created_at: string
          dedupe_key: string | null
          dismissed_at: string | null
          id: string
          link: string | null
          read_at: string | null
          severity: string
          shop_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          dismissed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          shop_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          dismissed_at?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          severity?: string
          shop_id?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      page_layout_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_published_snapshot: boolean
          layout_id: string
          puck_data: Json
          reason: string | null
          shop_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_published_snapshot?: boolean
          layout_id: string
          puck_data: Json
          reason?: string | null
          shop_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_published_snapshot?: boolean
          layout_id?: string
          puck_data?: Json
          reason?: string | null
          shop_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_layout_versions_layout_id_fkey"
            columns: ["layout_id"]
            isOneToOne: false
            referencedRelation: "page_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      page_layouts: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          page_type: string
          published_at: string | null
          puck_data: Json
          scheduled_publish_at: string | null
          shop_id: string
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          page_type: string
          published_at?: string | null
          puck_data?: Json
          scheduled_publish_at?: string | null
          shop_id: string
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          page_type?: string
          published_at?: string | null
          puck_data?: Json
          scheduled_publish_at?: string | null
          shop_id?: string
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_layouts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "page_layouts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_layouts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      parked_carts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          items: Json
          label: string
          note: string | null
          outlet_id: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          label?: string
          note?: string | null
          outlet_id: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          label?: string
          note?: string | null
          outlet_id?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parked_carts_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parked_carts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "parked_carts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parked_carts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      patient_records: {
        Row: {
          allergies: string | null
          birth_date: string | null
          blood_type: string | null
          created_at: string
          gender: string | null
          id: string
          medical_history: string | null
          notes: string | null
          patient_contact: string | null
          patient_name: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          birth_date?: string | null
          blood_type?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          patient_contact?: string | null
          patient_name: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          birth_date?: string | null
          blood_type?: string | null
          created_at?: string
          gender?: string | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          patient_contact?: string | null
          patient_name?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_records_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "patient_records_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_records_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      patient_visits: {
        Row: {
          complaint: string | null
          created_at: string
          diagnosis: string | null
          id: string
          notes: string | null
          patient_id: string
          prescription: string | null
          shop_id: string
          treatment: string | null
          visit_date: string
        }
        Insert: {
          complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          prescription?: string | null
          shop_id: string
          treatment?: string | null
          visit_date?: string
        }
        Update: {
          complaint?: string | null
          created_at?: string
          diagnosis?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          shop_id?: string
          treatment?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "patient_visits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_visits_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      plan_features: {
        Row: {
          created_at: string
          feature_key: string
          limit_value: number | null
          meta: Json
          plan_id: string
          requires_min_months: number
        }
        Insert: {
          created_at?: string
          feature_key: string
          limit_value?: number | null
          meta?: Json
          plan_id: string
          requires_min_months?: number
        }
        Update: {
          created_at?: string
          feature_key?: string
          limit_value?: number | null
          meta?: Json
          plan_id?: string
          requires_min_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_invoices: {
        Row: {
          amount_idr: number
          checkout_url: string | null
          created_at: string
          id: string
          invoice_no: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          plan_id: string
          provider_ref: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_id: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_idr: number
          checkout_url?: string | null
          created_at?: string
          id?: string
          invoice_no: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          plan_id: string
          provider_ref?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          checkout_url?: string | null
          created_at?: string
          id?: string
          invoice_no?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          plan_id?: string
          provider_ref?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_invoices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "plan_invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_invoices_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      plan_subscriptions: {
        Row: {
          amount_idr: number
          billing_interval: string
          cancelled_at: string | null
          created_at: string
          failure_count: number
          id: string
          last_charge_at: string | null
          last_invoice_id: string | null
          next_billing_at: string
          payment_provider: string | null
          plan_code: string
          plan_id: string | null
          provider_subscription_id: string | null
          provider_token: string | null
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_idr?: number
          billing_interval?: string
          cancelled_at?: string | null
          created_at?: string
          failure_count?: number
          id?: string
          last_charge_at?: string | null
          last_invoice_id?: string | null
          next_billing_at: string
          payment_provider?: string | null
          plan_code: string
          plan_id?: string | null
          provider_subscription_id?: string | null
          provider_token?: string | null
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_idr?: number
          billing_interval?: string
          cancelled_at?: string | null
          created_at?: string
          failure_count?: number
          id?: string
          last_charge_at?: string | null
          last_invoice_id?: string | null
          next_billing_at?: string
          payment_provider?: string | null
          plan_code?: string
          plan_id?: string | null
          provider_subscription_id?: string | null
          provider_token?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "plan_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      plan_themes: {
        Row: {
          created_at: string
          plan_id: string
          requires_min_months: number
          theme_key: string
        }
        Insert: {
          created_at?: string
          plan_id: string
          requires_min_months?: number
          theme_key: string
        }
        Update: {
          created_at?: string
          plan_id?: string
          requires_min_months?: number
          theme_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_themes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_themes_theme_key_fkey"
            columns: ["theme_key"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["key"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          duration_days: number
          features: Json
          id: string
          is_active: boolean
          name: string
          price_idr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          duration_days: number
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_idr: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          duration_days?: number
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_idr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          is_encrypted: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
          value_encrypted: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
          value_encrypted?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
          value_encrypted?: string | null
        }
        Relationships: []
      }
      platform_voucher_redemptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_ids: string[]
          user_id: string
          voucher_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_ids?: string[]
          user_id: string
          voucher_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_ids?: string[]
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_voucher_redemptions_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "platform_vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_vouchers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          per_user_limit: number | null
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number | null
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      po_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          from_status: string | null
          id: string
          metadata: Json | null
          po_id: string
          reason: string | null
          shop_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          po_id: string
          reason?: string | null
          shop_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json | null
          po_id?: string
          reason?: string | null
          shop_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_audit_log_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_audit_log: {
        Row: {
          action: string
          cashier_id: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          order_no: string | null
          outlet_id: string | null
          reason: string | null
          shop_id: string
        }
        Insert: {
          action: string
          cashier_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          order_no?: string | null
          outlet_id?: string | null
          reason?: string | null
          shop_id: string
        }
        Update: {
          action?: string
          cashier_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          order_no?: string | null
          outlet_id?: string | null
          reason?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "pos_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_audit_log_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dose: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          medication_id: string | null
          name_snapshot: string
          prescription_id: string
          qty: number
        }
        Insert: {
          created_at?: string
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          name_snapshot: string
          prescription_id: string
          qty?: number
        }
        Update: {
          created_at?: string
          dose?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          medication_id?: string | null
          name_snapshot?: string
          prescription_id?: string
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          diagnosis: string | null
          doctor_name: string | null
          id: string
          issued_at: string
          notes: string | null
          patient_id: string | null
          shop_id: string
          status: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          id?: string
          issued_at?: string
          notes?: string | null
          patient_id?: string | null
          shop_id: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          diagnosis?: string | null
          doctor_name?: string | null
          id?: string
          issued_at?: string
          notes?: string | null
          patient_id?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patient_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "prescriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "patient_visits"
            referencedColumns: ["id"]
          },
        ]
      }
      printers: {
        Row: {
          address: string | null
          connection_type: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          outlet_id: string
          paper_size: string
          shop_id: string
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          connection_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          outlet_id: string
          paper_size?: string
          shop_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          connection_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          outlet_id?: string
          paper_size?: string
          shop_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "printers_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "printers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "printers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      product_attribute_defs: {
        Row: {
          category_id: string | null
          created_at: string
          field_type: string
          id: string
          is_required: boolean
          key: string
          name: string
          options: Json
          placeholder: string | null
          shop_id: string
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          key: string
          name: string
          options?: Json
          placeholder?: string | null
          shop_id: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          key?: string
          name?: string
          options?: Json
          placeholder?: string | null
          shop_id?: string
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attribute_defs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_defs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "product_attribute_defs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_attribute_defs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      product_qa: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_pinned: boolean
          product_id: string
          question: string
          shop_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          product_id: string
          question: string
          shop_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_pinned?: boolean
          product_id?: string
          question?: string
          shop_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_qa_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "product_qa_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qa_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qa_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "product_qa_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_qa_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      product_returns: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          processed_at: string | null
          processed_by: string | null
          reason: string
          refund_amount: number | null
          refund_method: string | null
          restock: boolean
          shop_id: string
          status: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          refund_amount?: number | null
          refund_method?: string | null
          restock?: boolean
          shop_id: string
          status?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          refund_amount?: number | null
          refund_method?: string | null
          restock?: boolean
          shop_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "product_returns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          is_verified_purchase: boolean
          order_id: string | null
          photos: string[] | null
          product_id: string
          rating: number
          shop_id: string
          shop_replied_at: string | null
          shop_reply: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          photos?: string[] | null
          product_id: string
          rating: number
          shop_id: string
          shop_replied_at?: string | null
          shop_reply?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          photos?: string[] | null
          product_id?: string
          rating?: number
          shop_id?: string
          shop_replied_at?: string | null
          shop_reply?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "product_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      product_upsell_suggestions: {
        Row: {
          created_at: string
          id: string
          is_pinned: boolean
          position: number
          product_id: string
          score: number
          shop_id: string
          source: string
          suggested_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          position?: number
          product_id: string
          score?: number
          shop_id: string
          source?: string
          suggested_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_pinned?: boolean
          position?: number
          product_id?: string
          score?: number
          shop_id?: string
          source?: string
          suggested_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_upsell_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "product_upsell_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsell_suggestions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsell_suggestions_suggested_id_fkey"
            columns: ["suggested_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "product_upsell_suggestions_suggested_id_fkey"
            columns: ["suggested_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_upsell_suggestions_suggested_id_fkey"
            columns: ["suggested_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          promo_id: string
          shop_id: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_id: string
          promo_id: string
          shop_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          promo_id?: string
          shop_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      promos: {
        Row: {
          channel: Database["public"]["Enums"]["promo_channel"]
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          shop_id: string
          starts_at: string | null
          type: Database["public"]["Enums"]["promo_type"]
          updated_at: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          channel?: Database["public"]["Enums"]["promo_channel"]
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          shop_id: string
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promo_type"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Update: {
          channel?: Database["public"]["Enums"]["promo_channel"]
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          shop_id?: string
          starts_at?: string | null
          type?: Database["public"]["Enums"]["promo_type"]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          note: string | null
          po_id: string
          quantity: number
          received_qty: number
          subtotal: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          note?: string | null
          po_id: string
          quantity?: number
          received_qty?: number
          subtotal?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          note?: string | null
          po_id?: string
          quantity?: number
          received_qty?: number
          subtotal?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          note: string | null
          order_date: string
          po_no: string
          received_date: string | null
          shop_id: string
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          supplier_id: string | null
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          note?: string | null
          order_date?: string
          po_no: string
          received_date?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          note?: string | null
          order_date?: string
          po_no?: string
          received_date?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          shop_id: string | null
          subscription: Json
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          shop_id?: string | null
          subscription: Json
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          shop_id?: string | null
          subscription?: Json
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "push_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          menu_item_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          menu_item_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          quantity?: number
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          order_id: string
          outlet_id: string
          reason: string | null
          refund_method: string
          shop_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          order_id: string
          outlet_id: string
          reason?: string | null
          refund_method?: string
          shop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          order_id?: string
          outlet_id?: string
          reason?: string | null
          refund_method?: string
          shop_id?: string
        }
        Relationships: []
      }
      rental_bookings: {
        Row: {
          addons: Json
          created_at: string
          customer_name: string
          customer_phone: string | null
          deposit_paid: number | null
          end_date: string
          id: string
          kyc_drivers_license_url: string | null
          kyc_id_url: string | null
          kyc_selfie_url: string | null
          kyc_status: string
          kyc_verified_at: string | null
          notes: string | null
          shop_id: string
          start_date: string
          status: string
          total_amount: number | null
          total_days: number | null
          unit_id: string
        }
        Insert: {
          addons?: Json
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          deposit_paid?: number | null
          end_date: string
          id?: string
          kyc_drivers_license_url?: string | null
          kyc_id_url?: string | null
          kyc_selfie_url?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          notes?: string | null
          shop_id: string
          start_date: string
          status?: string
          total_amount?: number | null
          total_days?: number | null
          unit_id: string
        }
        Update: {
          addons?: Json
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          deposit_paid?: number | null
          end_date?: string
          id?: string
          kyc_drivers_license_url?: string | null
          kyc_id_url?: string | null
          kyc_selfie_url?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          notes?: string | null
          shop_id?: string
          start_date?: string
          status?: string
          total_amount?: number | null
          total_days?: number | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_bookings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "rental_bookings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_bookings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "rental_bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "rental_units"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_inspections: {
        Row: {
          booking_id: string
          checklist: Json
          condition_score: number | null
          id: string
          kind: string
          notes: string | null
          photos: Json
          recorded_at: string
          recorded_by: string | null
          shop_id: string
        }
        Insert: {
          booking_id: string
          checklist?: Json
          condition_score?: number | null
          id?: string
          kind: string
          notes?: string | null
          photos?: Json
          recorded_at?: string
          recorded_by?: string | null
          shop_id: string
        }
        Update: {
          booking_id?: string
          checklist?: Json
          condition_score?: number | null
          id?: string
          kind?: string
          notes?: string | null
          photos?: Json
          recorded_at?: string
          recorded_by?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "rental_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_inspections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "rental_inspections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_inspections_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      rental_units: {
        Row: {
          capacity: number | null
          category: string | null
          color: string | null
          condition: string
          created_at: string
          daily_price: number | null
          deposit_amount: number | null
          description: string | null
          fuel_type: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          next_service_at: string | null
          odometer: number | null
          plate_number: string | null
          production_year: number | null
          shop_id: string
          sort_order: number
          subtype: string | null
          transmission: string | null
          unit_code: string | null
        }
        Insert: {
          capacity?: number | null
          category?: string | null
          color?: string | null
          condition?: string
          created_at?: string
          daily_price?: number | null
          deposit_amount?: number | null
          description?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          next_service_at?: string | null
          odometer?: number | null
          plate_number?: string | null
          production_year?: number | null
          shop_id: string
          sort_order?: number
          subtype?: string | null
          transmission?: string | null
          unit_code?: string | null
        }
        Update: {
          capacity?: number | null
          category?: string | null
          color?: string | null
          condition?: string
          created_at?: string
          daily_price?: number | null
          deposit_amount?: number | null
          description?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          next_service_at?: string | null
          odometer?: number | null
          plate_number?: string | null
          production_year?: number | null
          shop_id?: string
          sort_order?: number
          subtype?: string | null
          transmission?: string | null
          unit_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_units_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "rental_units_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_units_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      restock_subscribers: {
        Row: {
          customer_name: string | null
          customer_wa: string
          id: string
          notified_at: string | null
          product_id: string
          product_name: string
          shop_id: string
          subscribed_at: string
        }
        Insert: {
          customer_name?: string | null
          customer_wa: string
          id?: string
          notified_at?: string | null
          product_id: string
          product_name: string
          shop_id: string
          subscribed_at?: string
        }
        Update: {
          customer_name?: string | null
          customer_wa?: string
          id?: string
          notified_at?: string | null
          product_id?: string
          product_name?: string
          shop_id?: string
          subscribed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restock_subscribers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "restock_subscribers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_subscribers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_subscribers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "restock_subscribers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restock_subscribers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      sales_offerings: {
        Row: {
          category: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          is_active: boolean
          long_desc: string | null
          price_label: string | null
          shop_id: string
          short_desc: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          long_desc?: string | null
          price_label?: string | null
          shop_id: string
          short_desc?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          long_desc?: string | null
          price_label?: string | null
          shop_id?: string
          short_desc?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_offerings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "sales_offerings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_offerings_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      service_bundle_items: {
        Row: {
          bundle_id: string
          id: string
          qty: number
          service_name: string
          sort_order: number
          unit_price_idr: number
        }
        Insert: {
          bundle_id: string
          id?: string
          qty?: number
          service_name: string
          sort_order?: number
          unit_price_idr?: number
        }
        Update: {
          bundle_id?: string
          id?: string
          qty?: number
          service_name?: string
          sort_order?: number
          unit_price_idr?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "service_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_bundles: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          duration_min: number
          id: string
          is_active: boolean
          max_uses: number | null
          name: string
          original_price_idr: number
          shop_id: string
          sort_order: number
          total_price_idr: number
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name: string
          original_price_idr?: number
          shop_id: string
          sort_order?: number
          total_price_idr?: number
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          name?: string
          original_price_idr?: number
          shop_id?: string
          sort_order?: number
          total_price_idr?: number
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_bundles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "service_bundles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bundles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          note: string | null
          outlet_id: string
          shop_id: string
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          note?: string | null
          outlet_id: string
          shop_id: string
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          note?: string | null
          outlet_id?: string
          shop_id?: string
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_about: {
        Row: {
          certifications: Json
          created_at: string
          credentials: Json
          shop_id: string
          story: string | null
          team: Json
          updated_at: string
          vision: string | null
        }
        Insert: {
          certifications?: Json
          created_at?: string
          credentials?: Json
          shop_id: string
          story?: string | null
          team?: Json
          updated_at?: string
          vision?: string | null
        }
        Update: {
          certifications?: Json
          created_at?: string
          credentials?: Json
          shop_id?: string
          story?: string | null
          team?: Json
          updated_at?: string
          vision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_about_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_about_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_about_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_backups: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          file_path: string | null
          id: string
          includes: Json
          requested_by: string
          shop_id: string
          size_bytes: number | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          id?: string
          includes?: Json
          requested_by: string
          shop_id: string
          size_bytes?: number | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          file_path?: string | null
          id?: string
          includes?: Json
          requested_by?: string
          shop_id?: string
          size_bytes?: number | null
          status?: string
        }
        Relationships: []
      }
      shop_chat_messages: {
        Row: {
          attachment_type: string | null
          attachment_url: string | null
          body: string
          chat_id: string
          created_at: string
          id: string
          product_id: string | null
          read_at: string | null
          sender_id: string
          sender_role: string
          shop_id: string
        }
        Insert: {
          attachment_type?: string | null
          attachment_url?: string | null
          body: string
          chat_id: string
          created_at?: string
          id?: string
          product_id?: string | null
          read_at?: string | null
          sender_id: string
          sender_role: string
          shop_id: string
        }
        Update: {
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          product_id?: string | null
          read_at?: string | null
          sender_id?: string
          sender_role?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "shop_chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_chat_messages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_chat_messages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_chat_messages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_chats: {
        Row: {
          buyer_archived: boolean
          buyer_user_id: string
          created_at: string
          id: string
          last_message_at: string | null
          seller_archived: boolean
          shop_id: string
          updated_at: string
        }
        Insert: {
          buyer_archived?: boolean
          buyer_user_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          seller_archived?: boolean
          shop_id: string
          updated_at?: string
        }
        Update: {
          buyer_archived?: boolean
          buyer_user_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          seller_archived?: boolean
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_chats_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_chats_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_chats_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_customers: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          first_order_at: string | null
          id: string
          last_order_at: string | null
          notes: string | null
          phone: string | null
          segment: string | null
          shop_id: string
          tags: string[]
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          shop_id: string
          tags?: string[]
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          notes?: string | null
          phone?: string | null
          segment?: string | null
          shop_id?: string
          tags?: string[]
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_membership_tiers: {
        Row: {
          created_at: string
          description: string | null
          discount_percent: number
          duration_days: number
          id: string
          is_active: boolean
          name: string
          perks: Json
          price: number
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          name: string
          perks?: Json
          price: number
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percent?: number
          duration_days?: number
          id?: string
          is_active?: boolean
          name?: string
          perks?: Json
          price?: number
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_membership_tiers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_membership_tiers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_membership_tiers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_portfolio: {
        Row: {
          after_image_url: string | null
          before_image_url: string | null
          caption: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string
          is_before_after: boolean
          shop_id: string
          sort_order: number
        }
        Insert: {
          after_image_url?: string | null
          before_image_url?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_before_after?: boolean
          shop_id: string
          sort_order?: number
        }
        Update: {
          after_image_url?: string | null
          before_image_url?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_before_after?: boolean
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_portfolio_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_portfolio_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_portfolio_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_size_charts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rows: Json
          shop_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rows?: Json
          shop_id: string
          unit?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rows?: Json
          shop_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_size_charts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_size_charts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_size_charts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_verifications: {
        Row: {
          business_license_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          ktp_full_name: string | null
          ktp_number: string | null
          ktp_url: string
          notes: string | null
          npwp_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_ktp_url: string | null
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          business_license_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ktp_full_name?: string | null
          ktp_number?: string | null
          ktp_url: string
          notes?: string | null
          npwp_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_ktp_url?: string | null
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_license_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ktp_full_name?: string | null
          ktp_number?: string | null
          ktp_url?: string
          notes?: string | null
          npwp_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_ktp_url?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_verifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_verifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_verifications_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_vouchers: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          per_user_limit: number | null
          shop_id: string
          starts_at: string | null
          updated_at: string
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number | null
          shop_id: string
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number | null
          shop_id?: string
          starts_at?: string | null
          updated_at?: string
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_vouchers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_vouchers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_vouchers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_wallets: {
        Row: {
          available_balance: number
          created_at: string
          pending_balance: number
          shop_id: string
          total_commission_paid: number
          total_earned: number
          total_withdrawn: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          pending_balance?: number
          shop_id: string
          total_commission_paid?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          pending_balance?: number
          shop_id?: string
          total_commission_paid?: number
          total_earned?: number
          total_withdrawn?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_wallets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "shop_wallets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_wallets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shops: {
        Row: {
          active_theme_key: string
          address: string | null
          auto_reply_enabled: boolean
          auto_reply_message: string | null
          average_rating: number | null
          business_category_id: string | null
          business_subtype: string | null
          city: string | null
          commission_rate_override: number | null
          created_at: string
          currency: string
          custom_domain: string | null
          custom_domain_verified_at: string | null
          custom_domain_verify_token: string | null
          deposit_enabled: boolean
          deposit_min_total: number
          deposit_notes: string | null
          deposit_percentage: number
          description: string | null
          email: string | null
          feature_overrides: Json
          id: string
          instagram: string | null
          is_active: boolean
          is_featured: boolean
          kyc_document_url: string | null
          kyc_reject_reason: string | null
          kyc_reviewed_at: string | null
          kyc_reviewer_id: string | null
          kyc_status: string | null
          kyc_submitted_at: string | null
          last_dns_check_at: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          marketplace_visible: boolean
          name: string
          onboarded_at: string | null
          open_hours: Json
          owner_id: string
          payment_methods_enabled: string[]
          phone: string | null
          plan: string
          plan_expires_at: string | null
          plan_started_at: string | null
          prep_minutes: number
          qris_image_url: string | null
          qris_merchant_name: string | null
          rating_avg: number | null
          rating_count: number | null
          receipt_footer: string | null
          receipt_header: string | null
          require_id_upload: boolean
          review_count: number
          service_charge_percent: number
          slug: string
          suspended_at: string | null
          suspended_reason: string | null
          tagline: string | null
          tax_inclusive: boolean
          tax_percent: number
          theme_key: string
          total_gmv: number
          total_sales_count: number
          trial_ends_at: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          whatsapp: string | null
        }
        Insert: {
          active_theme_key?: string
          address?: string | null
          auto_reply_enabled?: boolean
          auto_reply_message?: string | null
          average_rating?: number | null
          business_category_id?: string | null
          business_subtype?: string | null
          city?: string | null
          commission_rate_override?: number | null
          created_at?: string
          currency?: string
          custom_domain?: string | null
          custom_domain_verified_at?: string | null
          custom_domain_verify_token?: string | null
          deposit_enabled?: boolean
          deposit_min_total?: number
          deposit_notes?: string | null
          deposit_percentage?: number
          description?: string | null
          email?: string | null
          feature_overrides?: Json
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_featured?: boolean
          kyc_document_url?: string | null
          kyc_reject_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewer_id?: string | null
          kyc_status?: string | null
          kyc_submitted_at?: string | null
          last_dns_check_at?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          marketplace_visible?: boolean
          name: string
          onboarded_at?: string | null
          open_hours?: Json
          owner_id: string
          payment_methods_enabled?: string[]
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_started_at?: string | null
          prep_minutes?: number
          qris_image_url?: string | null
          qris_merchant_name?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          receipt_footer?: string | null
          receipt_header?: string | null
          require_id_upload?: boolean
          review_count?: number
          service_charge_percent?: number
          slug: string
          suspended_at?: string | null
          suspended_reason?: string | null
          tagline?: string | null
          tax_inclusive?: boolean
          tax_percent?: number
          theme_key?: string
          total_gmv?: number
          total_sales_count?: number
          trial_ends_at?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          active_theme_key?: string
          address?: string | null
          auto_reply_enabled?: boolean
          auto_reply_message?: string | null
          average_rating?: number | null
          business_category_id?: string | null
          business_subtype?: string | null
          city?: string | null
          commission_rate_override?: number | null
          created_at?: string
          currency?: string
          custom_domain?: string | null
          custom_domain_verified_at?: string | null
          custom_domain_verify_token?: string | null
          deposit_enabled?: boolean
          deposit_min_total?: number
          deposit_notes?: string | null
          deposit_percentage?: number
          description?: string | null
          email?: string | null
          feature_overrides?: Json
          id?: string
          instagram?: string | null
          is_active?: boolean
          is_featured?: boolean
          kyc_document_url?: string | null
          kyc_reject_reason?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewer_id?: string | null
          kyc_status?: string | null
          kyc_submitted_at?: string | null
          last_dns_check_at?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          marketplace_visible?: boolean
          name?: string
          onboarded_at?: string | null
          open_hours?: Json
          owner_id?: string
          payment_methods_enabled?: string[]
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_started_at?: string | null
          prep_minutes?: number
          qris_image_url?: string | null
          qris_merchant_name?: string | null
          rating_avg?: number | null
          rating_count?: number | null
          receipt_footer?: string | null
          receipt_header?: string | null
          require_id_upload?: boolean
          review_count?: number
          service_charge_percent?: number
          slug?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          tagline?: string | null
          tax_inclusive?: boolean
          tax_percent?: number
          theme_key?: string
          total_gmv?: number
          total_sales_count?: number
          trial_ends_at?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_shops_business_category_id_fkey"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json
          shop_id: string
          target_email: string | null
          target_name: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          shop_id: string
          target_email?: string | null
          target_name?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          shop_id?: string
          target_email?: string | null
          target_name?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_audit_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "staff_audit_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_audit_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          allowed_modules: string[] | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          outlet_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          allowed_modules?: string[] | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          outlet_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          allowed_modules?: string[] | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          outlet_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string
          token?: string
        }
        Relationships: []
      }
      staff_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          outlet_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          outlet_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shop_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          outlet_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_members_outlet_id_fkey"
            columns: ["outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "staff_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_members_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          allowed_modules: string[] | null
          created_at: string
          id: string
          role: string
          shop_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_modules?: string[] | null
          created_at?: string
          id?: string
          role?: string
          shop_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_modules?: string[] | null
          created_at?: string
          id?: string
          role?: string
          shop_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "staff_permissions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_permissions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          ingredient_id: string
          note: string | null
          order_id: string | null
          quantity: number
          shop_id: string
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id: string
          note?: string | null
          order_id?: string | null
          quantity: number
          shop_id: string
          type: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          ingredient_id?: string
          note?: string | null
          order_id?: string | null
          quantity?: number
          shop_id?: string
          type?: Database["public"]["Enums"]["stock_movement_type"]
          unit_cost?: number | null
        }
        Relationships: []
      }
      stock_opname_items: {
        Row: {
          actual_stock: number
          adjustment: number
          created_at: string
          id: string
          ingredient_id: string
          notes: string | null
          stock_opname_id: string
          system_stock: number
        }
        Insert: {
          actual_stock?: number
          adjustment?: number
          created_at?: string
          id?: string
          ingredient_id: string
          notes?: string | null
          stock_opname_id: string
          system_stock?: number
        }
        Update: {
          actual_stock?: number
          adjustment?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          notes?: string | null
          stock_opname_id?: string
          system_stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_items_stock_opname_id_fkey"
            columns: ["stock_opname_id"]
            isOneToOne: false
            referencedRelation: "stock_opnames"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opnames: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      studio_galleries: {
        Row: {
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string | null
          id: string
          max_selections: number | null
          share_token: string
          shop_id: string
          status: string
          title: string
          updated_at: string
          watermark_enabled: boolean
        }
        Insert: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          max_selections?: number | null
          share_token?: string
          shop_id: string
          status?: string
          title: string
          updated_at?: string
          watermark_enabled?: boolean
        }
        Update: {
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          max_selections?: number | null
          share_token?: string
          shop_id?: string
          status?: string
          title?: string
          updated_at?: string
          watermark_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "studio_galleries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "studio_galleries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_galleries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      studio_gallery_photos: {
        Row: {
          created_at: string
          customer_note: string | null
          gallery_id: string
          id: string
          is_selected: boolean
          photo_url: string
          sort_order: number
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          customer_note?: string | null
          gallery_id: string
          id?: string
          is_selected?: boolean
          photo_url: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          customer_note?: string | null
          gallery_id?: string
          id?: string
          is_selected?: boolean
          photo_url?: string
          sort_order?: number
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_gallery_photos_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "studio_galleries"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_locations: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          extra_fee: number
          id: string
          is_active: boolean
          location_type: string
          name: string
          shop_id: string
          sort_order: number
          travel_radius_km: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          extra_fee?: number
          id?: string
          is_active?: boolean
          location_type: string
          name: string
          shop_id: string
          sort_order?: number
          travel_radius_km?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          extra_fee?: number
          id?: string
          is_active?: boolean
          location_type?: string
          name?: string
          shop_id?: string
          sort_order?: number
          travel_radius_km?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_locations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "studio_locations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_locations_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      studio_packages: {
        Row: {
          created_at: string
          description: string
          duration_minutes: number
          id: string
          includes: string[]
          is_active: boolean
          max_capacity: number
          name: string
          price: number
          shop_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          includes?: string[]
          is_active?: boolean
          max_capacity?: number
          name: string
          price?: number
          shop_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          includes?: string[]
          is_active?: boolean
          max_capacity?: number
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "studio_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "studio_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          note: string | null
          payment_terms: string | null
          phone: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          note?: string | null
          payment_terms?: string | null
          phone?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          note?: string | null
          payment_terms?: string | null
          phone?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_audit: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          notes: string | null
          payload: Json
          shop_id: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          notes?: string | null
          payload?: Json
          shop_id?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          notes?: string | null
          payload?: Json
          shop_id?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          quote: string
          rating: number | null
          role_or_trip: string | null
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          quote: string
          rating?: number | null
          role_or_trip?: string | null
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          quote?: string
          rating?: number | null
          role_or_trip?: string | null
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "testimonials_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      themes: {
        Row: {
          component_id: string
          created_at: string
          description: string | null
          is_active: boolean
          key: string
          name: string
          preview_image_url: string | null
          sort_order: number
          tier_hint: string | null
          updated_at: string
        }
        Insert: {
          component_id: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
          name: string
          preview_image_url?: string | null
          sort_order?: number
          tier_hint?: string | null
          updated_at?: string
        }
        Update: {
          component_id?: string
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
          name?: string
          preview_image_url?: string | null
          sort_order?: number
          tier_hint?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      travel_installments: {
        Row: {
          created_at: string
          currency: string
          customer_name: string
          customer_phone: string | null
          id: string
          jamaah_id: string | null
          notes: string | null
          package_id: string | null
          paid_amount: number
          schedule: Json
          shop_id: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          jamaah_id?: string | null
          notes?: string | null
          package_id?: string | null
          paid_amount?: number
          schedule?: Json
          shop_id: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          jamaah_id?: string | null
          notes?: string | null
          package_id?: string | null
          paid_amount?: number
          schedule?: Json
          shop_id?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_installments_jamaah_id_fkey"
            columns: ["jamaah_id"]
            isOneToOne: false
            referencedRelation: "travel_jamaah_manifest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_installments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "umroh_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_installments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "travel_installments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_installments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      travel_itineraries: {
        Row: {
          created_at: string
          day_number: number
          description: string | null
          id: string
          image_url: string | null
          location: string | null
          package_id: string
          shop_id: string
          sort_order: number
          time_label: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          package_id: string
          shop_id: string
          sort_order?: number
          time_label?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          description?: string | null
          id?: string
          image_url?: string | null
          location?: string | null
          package_id?: string
          shop_id?: string
          sort_order?: number
          time_label?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_itineraries_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "umroh_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_itineraries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "travel_itineraries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_itineraries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      travel_jamaah_documents: {
        Row: {
          created_at: string
          doc_number: string | null
          doc_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          jamaah_id: string
          notes: string | null
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_number?: string | null
          doc_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          jamaah_id: string
          notes?: string | null
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_number?: string | null
          doc_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          jamaah_id?: string
          notes?: string | null
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_jamaah_documents_jamaah_id_fkey"
            columns: ["jamaah_id"]
            isOneToOne: false
            referencedRelation: "travel_jamaah_manifest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_jamaah_documents_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "travel_jamaah_documents_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_jamaah_documents_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      travel_jamaah_manifest: {
        Row: {
          address: string | null
          birth_date: string | null
          created_at: string
          document_urls: Json
          email: string | null
          emergency_contact: string | null
          full_name: string
          gender: string | null
          id: string
          nik: string | null
          notes: string | null
          package_id: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          room_assignment: string | null
          shop_id: string
          special_needs: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          document_urls?: Json
          email?: string | null
          emergency_contact?: string | null
          full_name: string
          gender?: string | null
          id?: string
          nik?: string | null
          notes?: string | null
          package_id?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          room_assignment?: string | null
          shop_id: string
          special_needs?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          created_at?: string
          document_urls?: Json
          email?: string | null
          emergency_contact?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          nik?: string | null
          notes?: string | null
          package_id?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          room_assignment?: string | null
          shop_id?: string
          special_needs?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_jamaah_manifest_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "umroh_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_jamaah_manifest_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "travel_jamaah_manifest_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "travel_jamaah_manifest_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      umroh_facilities: {
        Row: {
          created_at: string
          description: string | null
          icon: string
          id: string
          shop_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          shop_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          shop_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "umroh_facilities_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "umroh_facilities_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umroh_facilities_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      umroh_faqs: {
        Row: {
          answer: string
          category: string
          created_at: string
          id: string
          question: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          category?: string
          created_at?: string
          id?: string
          question: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          id?: string
          question?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "umroh_faqs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "umroh_faqs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umroh_faqs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      umroh_packages: {
        Row: {
          airline: string | null
          brochure_pdf_url: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          departure_date: string | null
          description: string | null
          duration_days: number | null
          excludes: string[] | null
          hotel_madinah: string | null
          hotel_makkah: string | null
          id: string
          includes: string[] | null
          is_active: boolean
          itinerary: Json
          name: string
          package_type: string
          price_double: number | null
          price_quad: number | null
          price_single: number | null
          price_triple: number | null
          quota_filled: number
          quota_total: number | null
          return_date: string | null
          room_type: string | null
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          airline?: string | null
          brochure_pdf_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          departure_date?: string | null
          description?: string | null
          duration_days?: number | null
          excludes?: string[] | null
          hotel_madinah?: string | null
          hotel_makkah?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean
          itinerary?: Json
          name: string
          package_type?: string
          price_double?: number | null
          price_quad?: number | null
          price_single?: number | null
          price_triple?: number | null
          quota_filled?: number
          quota_total?: number | null
          return_date?: string | null
          room_type?: string | null
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          airline?: string | null
          brochure_pdf_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          departure_date?: string | null
          description?: string | null
          duration_days?: number | null
          excludes?: string[] | null
          hotel_madinah?: string | null
          hotel_makkah?: string | null
          id?: string
          includes?: string[] | null
          is_active?: boolean
          itinerary?: Json
          name?: string
          package_type?: string
          price_double?: number | null
          price_quad?: number | null
          price_single?: number | null
          price_triple?: number | null
          quota_filled?: number
          quota_total?: number | null
          return_date?: string | null
          room_type?: string | null
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "umroh_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "umroh_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "umroh_packages_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          active_carts: Json
          default_outlet_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_carts?: Json
          default_outlet_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_carts?: Json
          default_outlet_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_default_outlet_id_fkey"
            columns: ["default_outlet_id"]
            isOneToOne: false
            referencedRelation: "outlets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          outlet_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          shop_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          outlet_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          outlet_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shop_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_topup_presets: {
        Row: {
          amount: number
          bonus_amount: number
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount: number
          bonus_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bonus_amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topup_presets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "wallet_topup_presets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topup_presets_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      wallet_topups: {
        Row: {
          amount: number
          bonus_amount: number
          created_at: string
          customer_user_id: string
          id: string
          note: string | null
          paid_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          preset_id: string | null
          shop_id: string
          status: string
          total_credit: number
          updated_at: string
        }
        Insert: {
          amount: number
          bonus_amount?: number
          created_at?: string
          customer_user_id: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          preset_id?: string | null
          shop_id: string
          status?: string
          total_credit: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bonus_amount?: number
          created_at?: string
          customer_user_id?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          preset_id?: string | null
          shop_id?: string
          status?: string
          total_credit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "wallet_topup_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "wallet_topups_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string | null
          reference: string | null
          shop_id: string
          type: Database["public"]["Enums"]["wallet_txn_type"]
          withdrawal_id: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reference?: string | null
          shop_id: string
          type: Database["public"]["Enums"]["wallet_txn_type"]
          withdrawal_id?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          reference?: string | null
          shop_id?: string
          type?: Database["public"]["Enums"]["wallet_txn_type"]
          withdrawal_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "wallet_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payload_summary: Json | null
          provider: string
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payload_summary?: Json | null
          provider: string
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payload_summary?: Json | null
          provider?: string
          status?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_hpp_view"
            referencedColumns: ["menu_item_id"]
          },
          {
            foreignKeyName: "wishlists_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_fee: number
          amount: number
          bank_account_name: string
          bank_account_no: string
          bank_name: string
          created_at: string
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          proof_url: string | null
          reject_reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shop_id: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        Insert: {
          admin_fee?: number
          amount: number
          bank_account_name: string
          bank_account_no: string
          bank_name: string
          created_at?: string
          id?: string
          net_amount: number
          notes?: string | null
          paid_at?: string | null
          proof_url?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Update: {
          admin_fee?: number
          amount?: number
          bank_account_name?: string
          bank_account_no?: string
          bank_name?: string
          created_at?: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          proof_url?: string | null
          reject_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "withdrawal_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
    }
    Views: {
      courier_earnings: {
        Row: {
          courier_id: string | null
          day: string | null
          deliveries: number | null
          gross_fee: number | null
          shop_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      menu_hpp_view: {
        Row: {
          hpp: number | null
          last_updated: string | null
          margin: number | null
          margin_percent: number | null
          menu_item_id: string | null
          name: string | null
          price: number | null
          recipe_count: number | null
          shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          average_rating: number | null
          compare_price: number | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          digital_file_name: string | null
          digital_file_url: string | null
          height_cm: number | null
          id: string | null
          image_url: string | null
          images: Json | null
          is_available: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          is_pre_order: boolean | null
          length_cm: number | null
          low_stock_threshold: number | null
          name: string | null
          pre_order_days: number | null
          price: number | null
          product_category_id: string | null
          recipe_yield: number | null
          review_count: number | null
          shop_id: string | null
          sku: string | null
          slug: string | null
          sort_order: number | null
          stock: number | null
          tags: string[] | null
          total_sold: number | null
          total_views: number | null
          track_stock: boolean | null
          updated_at: string | null
          video_url: string | null
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          attributes?: Json | null
          average_rating?: number | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          height_cm?: number | null
          id?: string | null
          image_url?: string | null
          images?: Json | null
          is_available?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_pre_order?: boolean | null
          length_cm?: number | null
          low_stock_threshold?: number | null
          name?: string | null
          pre_order_days?: number | null
          price?: number | null
          product_category_id?: string | null
          recipe_yield?: number | null
          review_count?: number | null
          shop_id?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          tags?: string[] | null
          total_sold?: number | null
          total_views?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
          video_url?: string | null
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          attributes?: Json | null
          average_rating?: number | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          digital_file_name?: string | null
          digital_file_url?: string | null
          height_cm?: number | null
          id?: string | null
          image_url?: string | null
          images?: Json | null
          is_available?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_pre_order?: boolean | null
          length_cm?: number | null
          low_stock_threshold?: number | null
          name?: string | null
          pre_order_days?: number | null
          price?: number | null
          product_category_id?: string | null
          recipe_yield?: number | null
          review_count?: number | null
          shop_id?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          tags?: string[] | null
          total_sold?: number | null
          total_views?: number | null
          track_stock?: boolean | null
          updated_at?: string | null
          video_url?: string | null
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["product_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_health_score"
            referencedColumns: ["shop_id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "v_shop_capabilities"
            referencedColumns: ["shop_id"]
          },
        ]
      }
      shop_health_score: {
        Row: {
          avg_rating: number | null
          health_score: number | null
          orders_last_30d: number | null
          owner_id: string | null
          product_count: number | null
          revenue_last_30d: number | null
          review_count: number | null
          shop_created_at: string | null
          shop_id: string | null
          shop_name: string | null
          slug: string | null
        }
        Relationships: []
      }
      v_shop_capabilities: {
        Row: {
          booking_config: Json | null
          booking_type: string | null
          business_category_id: string | null
          business_subtype: string | null
          category_name: string | null
          category_slug: string | null
          enabled_features: string[] | null
          flow_types: string[] | null
          shop_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coffee_shops_business_category_id_fkey"
            columns: ["business_category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_staff_invitation: { Args: { _token: string }; Returns: Json }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_remove_plan_feature: {
        Args: { _feature_key: string; _plan_id: string }
        Returns: undefined
      }
      admin_remove_plan_theme: {
        Args: { _plan_id: string; _theme_key: string }
        Returns: undefined
      }
      admin_set_shop_plan: {
        Args: { _expires_at: string; _plan: string; _shop_id: string }
        Returns: undefined
      }
      admin_shop_detail: { Args: { _shop_id: string }; Returns: Json }
      admin_suspend_shop: {
        Args: { _reason: string; _shop_id: string }
        Returns: undefined
      }
      admin_unsuspend_shop: { Args: { _shop_id: string }; Returns: undefined }
      admin_upsert_feature: {
        Args: {
          _category: string
          _description: string
          _is_active: boolean
          _key: string
          _name: string
          _sort_order: number
        }
        Returns: undefined
      }
      admin_upsert_plan_feature: {
        Args: {
          _feature_key: string
          _limit_value: number
          _meta: Json
          _plan_id: string
          _requires_min_months: number
        }
        Returns: undefined
      }
      admin_upsert_plan_theme: {
        Args: {
          _plan_id: string
          _requires_min_months: number
          _theme_key: string
        }
        Returns: undefined
      }
      admin_upsert_theme: {
        Args: {
          _component_id: string
          _description: string
          _is_active: boolean
          _key: string
          _name: string
          _preview_image_url: string
          _sort_order: number
          _tier_hint: string
        }
        Returns: undefined
      }
      apply_loyalty_post_order: {
        Args: {
          _earned: number
          _order_id: string
          _redeemed: number
          _shop_id: string
          _user_id: string
        }
        Returns: undefined
      }
      approve_plan_invoice: { Args: { _invoice_id: string }; Returns: Json }
      approve_wallet_topup: { Args: { _topup_id: string }; Returns: string }
      approve_withdrawal: {
        Args: { _id: string; _proof_url?: string }
        Returns: undefined
      }
      assign_courier_atomic: {
        Args: { _courier_id: string; _order_id: string }
        Returns: Json
      }
      auto_cancel_pending_deposit_bookings: {
        Args: never
        Returns: {
          cancelled_count: number
          cutoff_hours: number
        }[]
      }
      auto_release_escrow: { Args: never; Returns: Json }
      auto_unverify_domain: {
        Args: { _reason: string; _shop_id: string }
        Returns: undefined
      }
      booking_cancel_by_token: {
        Args: { _reason?: string; _token: string }
        Returns: Json
      }
      close_shift: {
        Args: { _closing_cash: number; _note?: string; _shift_id: string }
        Returns: Json
      }
      compute_upsell_suggestions: {
        Args: never
        Returns: {
          inserted_pairs: number
          processed_products: number
        }[]
      }
      courier_mark_delivered: {
        Args: { _order_id: string; _proof_url: string }
        Returns: undefined
      }
      create_notification: {
        Args: {
          _body?: string
          _dedupe_key?: string
          _link?: string
          _recipient: string
          _severity?: string
          _shop_id?: string
          _title: string
          _type: string
        }
        Returns: string
      }
      ensure_shop_wallet: { Args: { _shop_id: string }; Returns: undefined }
      escrow_hold_order: { Args: { _order_id: string }; Returns: Json }
      escrow_refund_order: {
        Args: { _order_id: string; _reason?: string }
        Returns: Json
      }
      escrow_release_order: { Args: { _order_id: string }; Returns: Json }
      expire_overdue_plans: {
        Args: never
        Returns: {
          shop_id: string
        }[]
      }
      expire_stale_pending_invoices: { Args: never; Returns: number }
      generate_owner_reminders: { Args: never; Returns: Json }
      get_billing_settings_public: {
        Args: never
        Returns: {
          account_name: string
          account_no: string
          bank_name: string
          instructions: string
          qris_image_url: string
        }[]
      }
      get_customer_custom_orders: {
        Args: { p_contact: string; p_shop_slug: string }
        Returns: {
          budget_max: number
          budget_min: number
          created_at: string
          customer_name: string
          deadline: string
          description: string
          history: Json
          id: string
          owner_note: string
          product_id: string
          product_name: string
          reference_image_url: string
          shop_id: string
          status: string
          updated_at: string
        }[]
      }
      get_marketplace_admin_daily: {
        Args: { _from: string; _to: string }
        Returns: {
          commission: number
          day: string
          gmv: number
          orders: number
        }[]
      }
      get_marketplace_admin_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      get_marketplace_admin_top_shops: {
        Args: { _from: string; _limit?: number; _to: string }
        Returns: {
          commission: number
          gmv: number
          orders: number
          shop_id: string
          shop_name: string
        }[]
      }
      get_my_active_memberships: {
        Args: { _shop_ids: string[] }
        Returns: {
          discount_percent: number
          expires_at: string
          shop_id: string
          tier_id: string
          tier_name: string
        }[]
      }
      get_my_entitlements: { Args: never; Returns: Json }
      get_or_create_marketplace_cart: { Args: never; Returns: string }
      get_order_tracking: {
        Args: { _order_id: string }
        Returns: {
          channel: Database["public"]["Enums"]["order_channel"]
          courier_name: string
          courier_phone: string
          courier_plate: string
          created_at: string
          customer_name: string
          delivered_at: string
          delivery_address: string
          delivery_fee: number
          delivery_proof_url: string
          fulfillment: Database["public"]["Enums"]["fulfillment_type"]
          id: string
          order_no: string
          shop_name: string
          shop_slug: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          updated_at: string
        }[]
      }
      get_profit_report: {
        Args: { _from: string; _shop_id: string; _to: string }
        Returns: Json
      }
      get_profit_report_daily: {
        Args: { _from: string; _shop_id: string; _to: string }
        Returns: {
          cogs: number
          day: string
          gross_profit: number
          orders: number
          revenue: number
        }[]
      }
      get_shop_entitlements: { Args: { _shop_id: string }; Returns: Json }
      get_shop_marketplace_daily: {
        Args: { _from: string; _shop_id: string; _to: string }
        Returns: {
          day: string
          orders: number
          revenue: number
        }[]
      }
      get_shop_marketplace_stats: {
        Args: { _from: string; _shop_id: string; _to: string }
        Returns: Json
      }
      get_shop_marketplace_top_products: {
        Args: { _from: string; _limit?: number; _shop_id: string; _to: string }
        Returns: {
          item_name: string
          menu_item_id: string
          qty: number
          revenue: number
        }[]
      }
      has_outlet_access: {
        Args: { _outlet_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_shop_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _shop_id: string
          _user_id: string
        }
        Returns: boolean
      }
      increment_promo_usage: { Args: { _promo_id: string }; Returns: undefined }
      is_courier_of_shop: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      is_shop_owner: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      link_courier_account: { Args: never; Returns: number }
      list_available_delivery_orders: {
        Args: { _courier_id: string }
        Returns: {
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_address: string
          delivery_fee: number
          id: string
          note: string
          order_no: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
        }[]
      }
      log_system_event: {
        Args: {
          _event_type: string
          _notes?: string
          _payload?: Json
          _shop_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_notification_read: { Args: { _id: string }; Returns: undefined }
      marketplace_checkout: {
        Args: {
          _address: string
          _fulfillment?: string
          _notes?: string
          _payment_method?: string
          _phone: string
          _platform_voucher_code?: string
          _recipient_name: string
          _shipping?: Json
          _shop_voucher_codes?: Json
        }
        Returns: Json
      }
      next_order_no: { Args: { _outlet_id: string }; Returns: string }
      open_dispute: {
        Args: {
          _description?: string
          _order_id: string
          _photos?: Json
          _reason: string
        }
        Returns: string
      }
      open_shift: {
        Args: { _opening_cash: number; _outlet_id: string }
        Returns: string
      }
      process_booking_reminders: {
        Args: never
        Returns: {
          h1_count: number
          h1h_count: number
          review_count: number
        }[]
      }
      process_subscription_renewals: { Args: never; Returns: Json }
      receive_purchase_order: { Args: { _po_id: string }; Returns: undefined }
      refund_order: {
        Args: {
          _amount: number
          _method?: string
          _order_id: string
          _reason?: string
        }
        Returns: string
      }
      reject_plan_invoice: {
        Args: { _invoice_id: string; _reason?: string }
        Returns: undefined
      }
      reject_wallet_topup: {
        Args: { _reason?: string; _topup_id: string }
        Returns: undefined
      }
      reject_withdrawal: {
        Args: { _id: string; _reason: string }
        Returns: undefined
      }
      reload_postgrest_schema: { Args: never; Returns: undefined }
      request_withdrawal: {
        Args: {
          _amount: number
          _bank_account_name: string
          _bank_account_no: string
          _bank_name: string
          _shop_id: string
        }
        Returns: string
      }
      resolve_dispute: {
        Args: {
          _dispute_id: string
          _refund_amount?: number
          _resolution?: string
          _status: string
        }
        Returns: Json
      }
      run_expiry_reminders_v2: { Args: never; Returns: Json }
      run_scheduled_publishes: { Args: never; Returns: Json }
      send_booking_reminders: { Args: never; Returns: Json }
      send_membership_expiry_reminders: { Args: never; Returns: number }
      send_order_message: {
        Args: { _attachment_url?: string; _body: string; _order_id: string }
        Returns: string
      }
      set_custom_domain_verified: {
        Args: { _shop_id: string; _verified: boolean }
        Returns: undefined
      }
      set_shop_theme: {
        Args: { _shop_id: string; _theme_key: string }
        Returns: undefined
      }
      test_qr_table_lock: { Args: never; Returns: string }
      user_belongs_to_shop: {
        Args: { _shop_id: string; _user_id: string }
        Returns: boolean
      }
      validate_promo: {
        Args: {
          _channel: string
          _code: string
          _shop_id: string
          _subtotal: number
        }
        Returns: {
          code: string
          discount: number
          error: string
          promo_id: string
        }[]
      }
      void_order: {
        Args: { _order_id: string; _reason?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "owner"
        | "cashier"
        | "barista"
        | "customer"
        | "manager"
        | "courier"
        | "pelayan"
        | "gudang"
        | "koki"
        | "helper"
        | "supervisor"
      cash_movement_type:
        | "in"
        | "out"
        | "sale"
        | "refund"
        | "opening"
        | "closing"
      delivery_mode: "flat" | "zone"
      fulfillment_type: "dine_in" | "pickup" | "delivery"
      order_channel: "pos" | "online"
      order_status:
        | "completed"
        | "voided"
        | "refunded"
        | "pending"
        | "preparing"
        | "ready"
        | "delivering"
        | "cancelled"
      payment_method: "cash" | "qris" | "manual_transfer" | "cod"
      payment_status: "unpaid" | "awaiting_verification" | "paid" | "refunded"
      po_status: "draft" | "ordered" | "received" | "cancelled"
      promo_channel: "pos" | "online" | "all"
      promo_type: "percent" | "nominal"
      shift_status: "open" | "closed"
      stock_movement_type: "purchase" | "adjustment" | "sale" | "waste"
      wallet_txn_type:
        | "sale_pending"
        | "sale_release"
        | "commission"
        | "withdrawal_hold"
        | "withdrawal_paid"
        | "withdrawal_refund"
        | "refund"
        | "adjustment"
      withdrawal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "paid"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "super_admin",
        "owner",
        "cashier",
        "barista",
        "customer",
        "manager",
        "courier",
        "pelayan",
        "gudang",
        "koki",
        "helper",
        "supervisor",
      ],
      cash_movement_type: ["in", "out", "sale", "refund", "opening", "closing"],
      delivery_mode: ["flat", "zone"],
      fulfillment_type: ["dine_in", "pickup", "delivery"],
      order_channel: ["pos", "online"],
      order_status: [
        "completed",
        "voided",
        "refunded",
        "pending",
        "preparing",
        "ready",
        "delivering",
        "cancelled",
      ],
      payment_method: ["cash", "qris", "manual_transfer", "cod"],
      payment_status: ["unpaid", "awaiting_verification", "paid", "refunded"],
      po_status: ["draft", "ordered", "received", "cancelled"],
      promo_channel: ["pos", "online", "all"],
      promo_type: ["percent", "nominal"],
      shift_status: ["open", "closed"],
      stock_movement_type: ["purchase", "adjustment", "sale", "waste"],
      wallet_txn_type: [
        "sale_pending",
        "sale_release",
        "commission",
        "withdrawal_hold",
        "withdrawal_paid",
        "withdrawal_refund",
        "refund",
        "adjustment",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "rejected",
        "paid",
        "cancelled",
      ],
    },
  },
} as const
