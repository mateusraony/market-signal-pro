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
  public: {
    Tables: {
      alerts: {
        Row: {
          active: boolean
          cooldown_until: string | null
          created_at: string
          exchange: string
          id: string
          last_trigger_candle_open_time: string | null
          mode: Database["public"]["Enums"]["trigger_mode"]
          params: Json
          paused: boolean
          symbol: string
          timeframe: Database["public"]["Enums"]["alert_timeframe"] | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          cooldown_until?: string | null
          created_at?: string
          exchange?: string
          id?: string
          last_trigger_candle_open_time?: string | null
          mode?: Database["public"]["Enums"]["trigger_mode"]
          params?: Json
          paused?: boolean
          symbol: string
          timeframe?: Database["public"]["Enums"]["alert_timeframe"] | null
          type: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          cooldown_until?: string | null
          created_at?: string
          exchange?: string
          id?: string
          last_trigger_candle_open_time?: string | null
          mode?: Database["public"]["Enums"]["trigger_mode"]
          params?: Json
          paused?: boolean
          symbol?: string
          timeframe?: Database["public"]["Enums"]["alert_timeframe"] | null
          type?: Database["public"]["Enums"]["alert_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      alerts_history: {
        Row: {
          alert_id: string | null
          comment_ai: string | null
          confidence_level: string | null
          created_at: string
          detected_time_utc: string
          direction_guess: string | null
          event_time_utc: string
          exchange: string
          id: string
          macd_hist_at_event: number | null
          macd_line_at_event: number | null
          macd_signal_at_event: number | null
          model_version: string | null
          price_at_event: number | null
          prob_down: number | null
          prob_up: number | null
          retroactive: boolean
          rsi_at_event: number | null
          symbol: string
          timeframe: Database["public"]["Enums"]["alert_timeframe"] | null
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          comment_ai?: string | null
          confidence_level?: string | null
          created_at?: string
          detected_time_utc?: string
          direction_guess?: string | null
          event_time_utc: string
          exchange: string
          id?: string
          macd_hist_at_event?: number | null
          macd_line_at_event?: number | null
          macd_signal_at_event?: number | null
          model_version?: string | null
          price_at_event?: number | null
          prob_down?: number | null
          prob_up?: number | null
          retroactive?: boolean
          rsi_at_event?: number | null
          symbol: string
          timeframe?: Database["public"]["Enums"]["alert_timeframe"] | null
          type: Database["public"]["Enums"]["alert_type"]
          user_id: string
        }
        Update: {
          alert_id?: string | null
          comment_ai?: string | null
          confidence_level?: string | null
          created_at?: string
          detected_time_utc?: string
          direction_guess?: string | null
          event_time_utc?: string
          exchange?: string
          id?: string
          macd_hist_at_event?: number | null
          macd_line_at_event?: number | null
          macd_signal_at_event?: number | null
          model_version?: string | null
          price_at_event?: number | null
          prob_down?: number | null
          prob_up?: number | null
          retroactive?: boolean
          rsi_at_event?: number | null
          symbol?: string
          timeframe?: Database["public"]["Enums"]["alert_timeframe"] | null
          type?: Database["public"]["Enums"]["alert_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          telegram_id: string | null
          telegram_username: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          created_at: string
          details: Json | null
          end_time_utc: string | null
          id: string
          start_time_utc: string
          type: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          end_time_utc?: string | null
          id?: string
          start_time_utc: string
          type: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          end_time_utc?: string | null
          id?: string
          start_time_utc?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      alert_timeframe: "4h" | "1d" | "1w" | "1m"
      alert_type: "price_level" | "rsi_level" | "macd_cross"
      price_direction: "above" | "below" | "cross"
      trigger_mode: "once" | "every_touch" | "crossing" | "touch"
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
      alert_timeframe: ["4h", "1d", "1w", "1m"],
      alert_type: ["price_level", "rsi_level", "macd_cross"],
      price_direction: ["above", "below", "cross"],
      trigger_mode: ["once", "every_touch", "crossing", "touch"],
    },
  },
} as const
