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
      account_deletion_log: {
        Row: {
          deleted_at: string
          email: string | null
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          deleted_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          deleted_at?: string
          email?: string | null
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ad_clicks: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_images: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          sort_order: number
          url: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          sort_order?: number
          url: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_images_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_saves: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_saves_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_shares: {
        Row: {
          ad_id: string
          channel: string | null
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          channel?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          channel?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_shares_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_status_logs: {
        Row: {
          ad_id: string
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          reason: string | null
        }
        Insert: {
          ad_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          reason?: string | null
        }
        Update: {
          ad_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_status_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_views: {
        Row: {
          ad_id: string
          id: string
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          ad_id: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          ad_id?: string
          id?: string
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_views_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          category: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          discount_pct: number | null
          ends_at: string | null
          id: string
          is_hidden: boolean
          price_original: number | null
          price_sale: number | null
          starts_at: string
          status: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_pct?: number | null
          ends_at?: string | null
          id?: string
          is_hidden?: boolean
          price_original?: number | null
          price_sale?: number | null
          starts_at?: string
          status?: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          discount_pct?: number | null
          ends_at?: string | null
          id?: string
          is_hidden?: boolean
          price_original?: number | null
          price_sale?: number | null
          starts_at?: string
          status?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          cta_text: string | null
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          starts_at: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          starts_at?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      deal_reports: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_fingerprint: string | null
          reporter_ip: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          note?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_fingerprint?: string | null
          reporter_ip?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_fingerprint?: string | null
          reporter_ip?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deal_reports_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      fraud_signals: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          payload: Json
          severity: number
          signal: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          payload?: Json
          severity?: number
          signal: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          payload?: Json
          severity?: number
          signal?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_signals_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          data: Json
          event: string
          external_user_id: string | null
          id: string
          occurred_at: string
          onesignal_notification_id: string
          subscription_id: string | null
        }
        Insert: {
          data?: Json
          event: string
          external_user_id?: string | null
          id?: string
          occurred_at?: string
          onesignal_notification_id: string
          subscription_id?: string | null
        }
        Update: {
          data?: Json
          event?: string
          external_user_id?: string | null
          id?: string
          occurred_at?: string
          onesignal_notification_id?: string
          subscription_id?: string | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          body: string
          created_at: string
          dedup_key: string | null
          error: string | null
          id: string
          is_draft: boolean
          onesignal_notification_id: string | null
          recipients: number | null
          scheduled_for: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          target_payload: Json
          target_type: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          dedup_key?: string | null
          error?: string | null
          id?: string
          is_draft?: boolean
          onesignal_notification_id?: string | null
          recipients?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          target_payload?: Json
          target_type: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          dedup_key?: string | null
          error?: string | null
          id?: string
          is_draft?: boolean
          onesignal_notification_id?: string | null
          recipients?: number | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          target_payload?: Json
          target_type?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          ad_id: string
          distance_m: number | null
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          ad_id: string
          distance_m?: number | null
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          distance_m?: number | null
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          announcements: boolean
          categories: string[]
          created_at: string
          enabled: boolean
          expiring_deals: boolean
          favorite_businesses: boolean
          latitude: number | null
          longitude: number | null
          max_per_day: number
          nearby_deals: boolean
          new_deals: boolean
          notification_frequency: string
          quiet_end: number
          quiet_start: number
          radius_km: number
          radius_m: number | null
          sound_vibration: boolean
          special_offers: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          announcements?: boolean
          categories?: string[]
          created_at?: string
          enabled?: boolean
          expiring_deals?: boolean
          favorite_businesses?: boolean
          latitude?: number | null
          longitude?: number | null
          max_per_day?: number
          nearby_deals?: boolean
          new_deals?: boolean
          notification_frequency?: string
          quiet_end?: number
          quiet_start?: number
          radius_km?: number
          radius_m?: number | null
          sound_vibration?: boolean
          special_offers?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          announcements?: boolean
          categories?: string[]
          created_at?: string
          enabled?: boolean
          expiring_deals?: boolean
          favorite_businesses?: boolean
          latitude?: number | null
          longitude?: number | null
          max_per_day?: number
          nearby_deals?: boolean
          new_deals?: boolean
          notification_frequency?: string
          quiet_end?: number
          quiet_start?: number
          radius_km?: number
          radius_m?: number | null
          sound_vibration?: boolean
          special_offers?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      partner_trust_scores: {
        Row: {
          factors: Json
          level: Database["public"]["Enums"]["trust_level"]
          score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          factors?: Json
          level?: Database["public"]["Enums"]["trust_level"]
          score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          factors?: Json
          level?: Database["public"]["Enums"]["trust_level"]
          score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_deal_notifications: {
        Row: {
          ad_id: string
          created_at: string
          distance_m: number | null
          id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          distance_m?: number | null
          id?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          distance_m?: number | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_location_at: string | null
          phone: string | null
          push_platform: string | null
          push_token: string | null
          status: string
          terms_accepted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          phone?: string | null
          push_platform?: string | null
          push_token?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          phone?: string | null
          push_platform?: string | null
          push_token?: string | null
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          sort_order: number
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          sort_order?: number
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          sort_order?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_gallery_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_shares: {
        Row: {
          channel: string | null
          created_at: string
          id: string
          store_id: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          id?: string
          store_id: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_shares_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string
          category: string
          city: string
          country: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          hours_json: Json | null
          id: string
          is_blocked: boolean
          is_hidden: boolean
          is_verified: boolean
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          postal_code: string | null
          registration_number: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          category: string
          city: string
          country?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hours_json?: Json | null
          id?: string
          is_blocked?: boolean
          is_hidden?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          category?: string
          city?: string
          country?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          hours_json?: Json | null
          id?: string
          is_blocked?: boolean
          is_hidden?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          registration_number?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          is_active: boolean
          last_seen_at: string
          onesignal_subscription_id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          onesignal_subscription_id: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string
          onesignal_subscription_id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      detect_deal_fraud: { Args: { _ad_id: string }; Returns: number }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_outdated_ads: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_m: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      prune_old_analytics: { Args: never; Returns: undefined }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recalculate_trust_score: {
        Args: { _user_id: string }
        Returns: {
          factors: Json
          level: Database["public"]["Enums"]["trust_level"]
          score: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "partner_trust_scores"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "client" | "partner"
      report_reason:
        | "spam"
        | "scam"
        | "expired"
        | "wrong_info"
        | "inappropriate"
        | "duplicate"
        | "other"
      report_status: "open" | "resolved" | "dismissed"
      trust_level: "bronze" | "silver" | "gold"
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
      app_role: ["admin", "client", "partner"],
      report_reason: [
        "spam",
        "scam",
        "expired",
        "wrong_info",
        "inappropriate",
        "duplicate",
        "other",
      ],
      report_status: ["open", "resolved", "dismissed"],
      trust_level: ["bronze", "silver", "gold"],
    },
  },
} as const
