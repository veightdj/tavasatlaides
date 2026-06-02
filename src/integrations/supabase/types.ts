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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          description: string | null
          discount_pct: number | null
          ends_at: string | null
          id: string
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
          description?: string | null
          discount_pct?: number | null
          ends_at?: string | null
          id?: string
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
          description?: string | null
          discount_pct?: number | null
          ends_at?: string | null
          id?: string
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
        Relationships: []
      }
      notification_preferences: {
        Row: {
          categories: string[]
          created_at: string
          enabled: boolean
          max_per_day: number
          quiet_end: number
          quiet_start: number
          radius_km: number
          sound_vibration: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          enabled?: boolean
          max_per_day?: number
          quiet_end?: number
          quiet_start?: number
          radius_km?: number
          sound_vibration?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          enabled?: boolean
          max_per_day?: number
          quiet_end?: number
          quiet_start?: number
          radius_km?: number
          sound_vibration?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      stores: {
        Row: {
          address: string
          category: string
          city: string
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          hours_json: Json | null
          id: string
          lat: number | null
          lng: number | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          postal_code: string | null
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
          description?: string | null
          hours_json?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          postal_code?: string | null
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
          description?: string | null
          hours_json?: Json | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_outdated_ads: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
