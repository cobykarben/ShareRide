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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      car_presets: {
        Row: {
          brand: string
          color: string
          created_at: string | null
          default_available_seats: number[] | null
          id: string
          license_plate: string
          model: string
          name: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand: string
          color: string
          created_at?: string | null
          default_available_seats?: number[] | null
          id?: string
          license_plate: string
          model: string
          name?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand?: string
          color?: string
          created_at?: string | null
          default_available_seats?: number[] | null
          id?: string
          license_plate?: string
          model?: string
          name?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_presets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          start_datetime: string
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          start_datetime: string
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          start_datetime?: string
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          legal_first_name: string | null
          legal_last_name: string | null
          phone: string | null
          phone_verified: boolean | null
          preferred_first_name: string | null
          profile_picture_url: string | null
          stripe_connect_account_id: string | null
          stripe_connect_onboarding_complete: boolean | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          legal_first_name?: string | null
          legal_last_name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_first_name?: string | null
          profile_picture_url?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          legal_first_name?: string | null
          legal_last_name?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          preferred_first_name?: string | null
          profile_picture_url?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_onboarding_complete?: boolean | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ride_reservations: {
        Row: {
          cost_per_person: number | null
          created_at: string | null
          id: string
          payment_status: string | null
          ride_id: string
          rider_id: string
          seat_number: number
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          cost_per_person?: number | null
          created_at?: string | null
          id?: string
          payment_status?: string | null
          ride_id: string
          rider_id: string
          seat_number: number
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cost_per_person?: number | null
          created_at?: string | null
          id?: string
          payment_status?: string | null
          ride_id?: string
          rider_id?: string
          seat_number?: number
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_reservations_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_reservations_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          available_seats: number[]
          car_preset_id: string
          created_at: string | null
          departure_address: string
          departure_datetime: string
          departure_datetime_end: string | null
          departure_latitude: number | null
          departure_longitude: number | null
          driver_id: string
          event_id: string
          id: string
          is_free: boolean | null
          is_time_range: boolean | null
          pickup_mode: string
          pickup_radius_miles: number | null
          started_at: string | null
          status: string
          total_expected_cost: number | null
          updated_at: string | null
        }
        Insert: {
          available_seats: number[]
          car_preset_id: string
          created_at?: string | null
          departure_address: string
          departure_datetime: string
          departure_datetime_end?: string | null
          departure_latitude?: number | null
          departure_longitude?: number | null
          driver_id: string
          event_id: string
          id?: string
          is_free?: boolean | null
          is_time_range?: boolean | null
          pickup_mode?: string
          pickup_radius_miles?: number | null
          started_at?: string | null
          status?: string
          total_expected_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          available_seats?: number[]
          car_preset_id?: string
          created_at?: string | null
          departure_address?: string
          departure_datetime?: string
          departure_datetime_end?: string | null
          departure_latitude?: number | null
          departure_longitude?: number | null
          driver_id?: string
          event_id?: string
          id?: string
          is_free?: boolean | null
          is_time_range?: boolean | null
          pickup_mode?: string
          pickup_radius_miles?: number | null
          started_at?: string | null
          status?: string
          total_expected_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rides_car_preset_id_fkey"
            columns: ["car_preset_id"]
            isOneToOne: false
            referencedRelation: "car_presets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
