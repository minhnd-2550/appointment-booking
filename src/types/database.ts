export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      appointments: {
        Row: {
          checked_in_at: string | null
          created_at: string
          dependent_id: string | null
          doctor_id: string
          id: string
          patient_email: string
          patient_name: string
          patient_phone: string | null
          reminder_sent: boolean
          slot_end: string
          slot_start: string
          status: Database["public"]["Enums"]["appointment_status"]
          user_id: string | null
          visit_reason: string | null
        }
        Insert: {
          checked_in_at?: string | null
          created_at?: string
          dependent_id?: string | null
          doctor_id: string
          id?: string
          patient_email: string
          patient_name: string
          patient_phone?: string | null
          reminder_sent?: boolean
          slot_end: string
          slot_start: string
          status?: Database["public"]["Enums"]["appointment_status"]
          user_id?: string | null
          visit_reason?: string | null
        }
        Update: {
          checked_in_at?: string | null
          created_at?: string
          dependent_id?: string | null
          doctor_id?: string
          id?: string
          patient_email?: string
          patient_name?: string
          patient_phone?: string | null
          reminder_sent?: boolean
          slot_end?: string
          slot_start?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          user_id?: string | null
          visit_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_dependent_id_fk"
            columns: ["dependent_id"]
            isOneToOne: false
            referencedRelation: "dependents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log_entries: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      blocked_periods: {
        Row: {
          created_at: string
          doctor_id: string
          end_at: string
          id: string
          reason: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          end_at: string
          id?: string
          reason?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          end_at?: string
          id?: string
          reason?: string | null
          start_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_periods_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      dependents: {
        Row: {
          account_holder_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          relationship: string
        }
        Insert: {
          account_holder_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          relationship: string
        }
        Update: {
          account_holder_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          relationship?: string
        }
        Relationships: []
      }
      doctor_profiles: {
        Row: {
          biography: string | null
          fee_override: number | null
          id: string
          languages: string[]
          photo_url: string | null
          qualifications: string | null
          updated_at: string
        }
        Insert: {
          biography?: string | null
          fee_override?: number | null
          id: string
          languages?: string[]
          photo_url?: string | null
          qualifications?: string | null
          updated_at?: string
        }
        Update: {
          biography?: string | null
          fee_override?: number | null
          id?: string
          languages?: string[]
          photo_url?: string | null
          qualifications?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_ratings: {
        Row: {
          appointment_id: string
          comment: string | null
          created_at: string
          doctor_id: string
          id: string
          is_hidden: boolean
          patient_id: string
          rating: number
        }
        Insert: {
          appointment_id: string
          comment?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          is_hidden?: boolean
          patient_id: string
          rating: number
        }
        Update: {
          appointment_id?: string
          comment?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          is_hidden?: boolean
          patient_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "doctor_ratings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_ratings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          specialty: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          specialty: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          specialty?: string
        }
        Relationships: []
      }
      examination_results: {
        Row: {
          file_path: string | null
          id: string
          lab_order_id: string
          result_text: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          file_path?: string | null
          id?: string
          lab_order_id: string
          result_text?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          file_path?: string | null
          id?: string
          lab_order_id?: string
          result_text?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "examination_results_lab_order_id_fkey"
            columns: ["lab_order_id"]
            isOneToOne: true
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      in_app_notifications: {
        Row: {
          created_at: string
          event_type: string
          id: string
          is_read: boolean
          message: string
          patient_id: string
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          is_read?: boolean
          message: string
          patient_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          is_read?: boolean
          message?: string
          patient_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          appointment_id: string
          authored_by: string
          content: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          authored_by: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          authored_by?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          instructions: string | null
          ordered_by: string
          status: string
          test_name: string
          type: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          instructions?: string | null
          ordered_by: string
          status?: string
          test_name: string
          type: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          ordered_by?: string
          status?: string
          test_name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          appointment_id: string
          created_at: string
          diagnosis: string | null
          examination_notes: string | null
          id: string
          recorded_by: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          diagnosis?: string | null
          examination_notes?: string | null
          id?: string
          recorded_by: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          diagnosis?: string | null
          examination_notes?: string | null
          id?: string
          recorded_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          appointment_id: string
          error_message: string | null
          id: string
          notification_type: string
          recipient_email: string
          sent_at: string
          status: string
        }
        Insert: {
          appointment_id: string
          error_message?: string | null
          id?: string
          notification_type: string
          recipient_email: string
          sent_at?: string
          status: string
        }
        Update: {
          appointment_id?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          recipient_email?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_enabled: boolean
          event_type: string
          id: string
          patient_id: string
          updated_at: string
        }
        Insert: {
          email_enabled?: boolean
          event_type: string
          id?: string
          patient_id: string
          updated_at?: string
        }
        Update: {
          email_enabled?: boolean
          event_type?: string
          id?: string
          patient_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_check_ins: {
        Row: {
          appointment_id: string
          checked_in_at: string
          checked_in_by: string
          id: string
        }
        Insert: {
          appointment_id: string
          checked_in_at?: string
          checked_in_by: string
          id?: string
        }
        Update: {
          appointment_id?: string
          checked_in_at?: string
          checked_in_by?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_check_ins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          appointment_id: string
          description: string | null
          document_type: string
          file_path: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          appointment_id: string
          description?: string | null
          document_type: string
          file_path: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          appointment_id?: string
          description?: string | null
          document_type?: string
          file_path?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_medical_backgrounds: {
        Row: {
          added_at: string
          description: string
          entry_type: string
          id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          description: string
          entry_type: string
          id?: string
          user_id: string
        }
        Update: {
          added_at?: string
          description?: string
          entry_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          currency: string
          id: string
          invoice_number: string | null
          invoice_path: string | null
          paid_at: string | null
          status: string
        }
        Insert: {
          amount: number
          appointment_id: string
          created_at?: string
          currency: string
          id?: string
          invoice_number?: string | null
          invoice_path?: string | null
          paid_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string | null
          invoice_path?: string | null
          paid_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          dosage: string
          duration: string
          frequency: string
          id: string
          medical_record_id: string
          medication_name: string
          notes: string | null
        }
        Insert: {
          dosage: string
          duration: string
          frequency: string
          id?: string
          medical_record_id: string
          medication_name: string
          notes?: string | null
        }
        Update: {
          dosage?: string
          duration?: string
          frequency?: string
          id?: string
          medical_record_id?: string
          medication_name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medical_record_id_fkey"
            columns: ["medical_record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          currency: string
          default_duration_minutes: number
          default_fee: number
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          default_duration_minutes: number
          default_fee: number
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          currency?: string
          default_duration_minutes?: number
          default_fee?: number
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          default_value: string
          description: string
          key: string
          last_updated_by: string | null
          updated_at: string
          value: string
        }
        Insert: {
          default_value: string
          description: string
          key: string
          last_updated_by?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          default_value?: string
          description?: string
          key?: string
          last_updated_by?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          doctor_id: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          claim_token: string | null
          claim_token_expires_at: string | null
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          preferred_date_from: string | null
          preferred_date_to: string | null
          status: string
          updated_at: string
        }
        Insert: {
          claim_token?: string | null
          claim_token_expires_at?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          claim_token?: string | null
          claim_token_expires_at?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          preferred_date_from?: string | null
          preferred_date_to?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      working_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id: string
          is_active: boolean
          slot_duration_minutes: number
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          doctor_id: string
          end_time: string
          id?: string
          is_active?: boolean
          slot_duration_minutes: number
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          doctor_id?: string
          end_time?: string
          id?: string
          is_active?: boolean
          slot_duration_minutes?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "working_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_appointment:
        | {
            Args: {
              p_doctor_id: string
              p_patient_email: string
              p_patient_name: string
              p_patient_phone?: string
              p_slot_end: string
              p_slot_start: string
              p_visit_reason?: string
            }
            Returns: {
              checked_in_at: string | null
              created_at: string
              dependent_id: string | null
              doctor_id: string
              id: string
              patient_email: string
              patient_name: string
              patient_phone: string | null
              reminder_sent: boolean
              slot_end: string
              slot_start: string
              status: Database["public"]["Enums"]["appointment_status"]
              user_id: string | null
              visit_reason: string | null
            }
            SetofOptions: {
              from: "*"
              to: "appointments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_dependent_id?: string
              p_doctor_id: string
              p_patient_email: string
              p_patient_name: string
              p_patient_phone?: string
              p_slot_end: string
              p_slot_start: string
              p_user_id?: string
              p_visit_reason?: string
            }
            Returns: {
              checked_in_at: string | null
              created_at: string
              dependent_id: string | null
              doctor_id: string
              id: string
              patient_email: string
              patient_name: string
              patient_phone: string | null
              reminder_sent: boolean
              slot_end: string
              slot_start: string
              status: Database["public"]["Enums"]["appointment_status"]
              user_id: string | null
              visit_reason: string | null
            }
            SetofOptions: {
              from: "*"
              to: "appointments"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      complete_appointment: {
        Args: { p_actor_id: string; p_appointment_id: string }
        Returns: undefined
      }
      create_waitlist_claim: {
        Args: {
          p_doctor_id: string
          p_entry_id: string
          p_patient_email: string
          p_patient_id: string
          p_patient_name: string
          p_slot_end: string
          p_slot_start: string
        }
        Returns: {
          checked_in_at: string | null
          created_at: string
          dependent_id: string | null
          doctor_id: string
          id: string
          patient_email: string
          patient_name: string
          patient_phone: string | null
          reminder_sent: boolean
          slot_end: string
          slot_start: string
          status: Database["public"]["Enums"]["appointment_status"]
          user_id: string | null
          visit_reason: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_appointment_status: {
        Args: {
          p_actor_id?: string
          p_appointment_id: string
          p_new_status: Database["public"]["Enums"]["appointment_status"]
        }
        Returns: {
          checked_in_at: string | null
          created_at: string
          dependent_id: string | null
          doctor_id: string
          id: string
          patient_email: string
          patient_name: string
          patient_phone: string | null
          reminder_sent: boolean
          slot_end: string
          slot_start: string
          status: Database["public"]["Enums"]["appointment_status"]
          user_id: string | null
          visit_reason: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no-show"
      user_role: "provider" | "admin" | "patient" | "receptionist"
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
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no-show",
      ],
      user_role: ["provider", "admin", "patient", "receptionist"],
    },
  },
} as const

