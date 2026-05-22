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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_verifications: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          initiated_at: string
          status: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          initiated_at?: string
          status?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          initiated_at?: string
          status?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      bypass_blocks: {
        Row: {
          blocked_until: string
          created_at: string
          id: string
          reason: string | null
          sms_status: string | null
          user_id: string
        }
        Insert: {
          blocked_until: string
          created_at?: string
          id?: string
          reason?: string | null
          sms_status?: string | null
          user_id: string
        }
        Update: {
          blocked_until?: string
          created_at?: string
          id?: string
          reason?: string | null
          sms_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      premium_users: {
        Row: {
          created_at: string | null
          discounted_amount: number | null
          email: string
          expiry_date: string
          id: string
          name: string
          original_amount: number | null
          payment_id: string
          plan_duration_type: string | null
          plan_duration_value: number | null
          plan_months: number | null
          promo_code_used: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discounted_amount?: number | null
          email: string
          expiry_date: string
          id?: string
          name: string
          original_amount?: number | null
          payment_id: string
          plan_duration_type?: string | null
          plan_duration_value?: number | null
          plan_months?: number | null
          promo_code_used?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discounted_amount?: number | null
          email?: string
          expiry_date?: string
          id?: string
          name?: string
          original_amount?: number | null
          payment_id?: string
          plan_duration_type?: string | null
          plan_duration_value?: number | null
          plan_months?: number | null
          promo_code_used?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profile_pictures: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          filename: string
          id: number
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          filename: string
          id?: number
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          filename?: string
          id?: number
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          discount_applied: number
          id: string
          payment_id: string | null
          promo_code_id: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          discount_applied: number
          id?: string
          payment_id?: string | null
          promo_code_id: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          discount_applied?: number
          id?: string
          payment_id?: string | null
          promo_code_id?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          excluded_plans: string[] | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          excluded_plans?: string[] | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          excluded_plans?: string[] | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct: string
          created_at: string | null
          difficulty: string | null
          id: string
          image: string | null
          marks: number | null
          negative_marks: number | null
          options: Json | null
          question_text: string | null
          subject: string
          test_id: string | null
          type: string | null
        }
        Insert: {
          correct: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json | null
          question_text?: string | null
          subject: string
          test_id?: string | null
          type?: string | null
        }
        Update: {
          correct?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          image?: string | null
          marks?: number | null
          negative_marks?: number | null
          options?: Json | null
          question_text?: string | null
          subject?: string
          test_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          answers: Json
          correct: number
          created_at: string | null
          id: string
          score: number
          test_id: string
          user_id: number
          wrong: number
        }
        Insert: {
          answers: Json
          correct: number
          created_at?: string | null
          id?: string
          score: number
          test_id: string
          user_id: number
          wrong: number
        }
        Update: {
          answers?: Json
          correct?: number
          created_at?: string | null
          id?: string
          score?: number
          test_id?: string
          user_id?: number
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          config_key: string
          config_value: string
          created_at: string | null
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      test_results: {
        Row: {
          completed_at: string | null
          correct: number | null
          created_at: string | null
          id: string
          incorrect: number | null
          marks_obtained: number | null
          max_marks: number | null
          percentage: number | null
          skipped: number | null
          subject_stats: Json | null
          test_id: string | null
          test_name: string
          time_taken: number | null
          total: number | null
          user_answers: Json | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          correct?: number | null
          created_at?: string | null
          id?: string
          incorrect?: number | null
          marks_obtained?: number | null
          max_marks?: number | null
          percentage?: number | null
          skipped?: number | null
          subject_stats?: Json | null
          test_id?: string | null
          test_name: string
          time_taken?: number | null
          total?: number | null
          user_answers?: Json | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          correct?: number | null
          created_at?: string | null
          id?: string
          incorrect?: number | null
          marks_obtained?: number | null
          max_marks?: number | null
          percentage?: number | null
          skipped?: number | null
          subject_stats?: Json | null
          test_id?: string | null
          test_name?: string
          time_taken?: number | null
          total?: number | null
          user_answers?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          exam_type: string | null
          id: string
          marking_scheme: Json | null
          name: string
          sections: Json | null
          status: string | null
          stream: string
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          exam_type?: string | null
          id?: string
          marking_scheme?: Json | null
          name: string
          sections?: Json | null
          status?: string | null
          stream: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          exam_type?: string | null
          id?: string
          marking_scheme?: Json | null
          name?: string
          sections?: Json | null
          status?: string | null
          stream?: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          average_score: number | null
          chemistry_accuracy: number | null
          id: string
          last_test_date: string | null
          maths_accuracy: number | null
          overall_accuracy: number | null
          physics_accuracy: number | null
          rank_percentile: number | null
          study_time_hours: number | null
          total_correct: number | null
          total_questions: number | null
          total_tests: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          average_score?: number | null
          chemistry_accuracy?: number | null
          id?: string
          last_test_date?: string | null
          maths_accuracy?: number | null
          overall_accuracy?: number | null
          physics_accuracy?: number | null
          rank_percentile?: number | null
          study_time_hours?: number | null
          total_correct?: number | null
          total_questions?: number | null
          total_tests?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          average_score?: number | null
          chemistry_accuracy?: number | null
          id?: string
          last_test_date?: string | null
          maths_accuracy?: number | null
          overall_accuracy?: number | null
          physics_accuracy?: number | null
          rank_percentile?: number | null
          study_time_hours?: number | null
          total_correct?: number | null
          total_questions?: number | null
          total_tests?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          language: string | null
          sound_effects: boolean | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          sound_effects?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          language?: string | null
          sound_effects?: boolean | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          is_blocked: boolean | null
          name: string
          profile_photo: string | null
          profile_picture: string | null
          profile_picture_id: number
          updated_at: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_blocked?: boolean | null
          name: string
          profile_photo?: string | null
          profile_picture?: string | null
          profile_picture_id?: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_blocked?: boolean | null
          name?: string
          profile_photo?: string | null
          profile_picture?: string | null
          profile_picture_id?: number
          updated_at?: string | null
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_profile_picture_id_fkey"
            columns: ["profile_picture_id"]
            isOneToOne: false
            referencedRelation: "profile_pictures"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_trials: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          start_date: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          start_date?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          start_date?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_number_changes: {
        Row: {
          changed_at: string | null
          id: string
          new_number: string | null
          old_number: string | null
          user_id: string | null
        }
        Insert: {
          changed_at?: string | null
          id?: string
          new_number?: string | null
          old_number?: string | null
          user_id?: string | null
        }
        Update: {
          changed_at?: string | null
          id?: string
          new_number?: string | null
          old_number?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_user_stats: {
        Row: {
          account_type: string | null
          average_score: number | null
          email: string | null
          is_blocked: boolean | null
          member_since: string | null
          name: string | null
          premium_expiry: string | null
          total_tests: number | null
          trial_start: string | null
          user_id: string | null
          whatsapp_number: string | null
        }
        Relationships: []
      }
      user_dashboard_view: {
        Row: {
          access_status: string | null
          avatar_url: string | null
          average_score: number | null
          days_left: number | null
          email: string | null
          member_since: string | null
          name: string | null
          overall_accuracy: number | null
          rank_percentile: number | null
          total_tests: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_leaderboard_data: {
        Args: never
        Returns: {
          average_score: number
          global_rank: number
          name: string
          overall_accuracy: number
          rank_percentile: number
          total_tests: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
