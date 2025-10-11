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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      advisors: {
        Row: {
          advisor_code: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          regional: string | null
          sales_manager: string | null
          updated_at: string | null
          user_id: string
          zonal_coordinator: string | null
          zone_leader: string | null
        }
        Insert: {
          advisor_code?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          regional?: string | null
          sales_manager?: string | null
          updated_at?: string | null
          user_id: string
          zonal_coordinator?: string | null
          zone_leader?: string | null
        }
        Update: {
          advisor_code?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          regional?: string | null
          sales_manager?: string | null
          updated_at?: string | null
          user_id?: string
          zonal_coordinator?: string | null
          zone_leader?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      price_list_products: {
        Row: {
          convenio_price: number | null
          created_at: string | null
          credicontado_price: number | null
          credit_price: number | null
          id: string
          list_1_price: number | null
          list_2_price: number | null
          list_3_price: number | null
          list_4_price: number | null
          price_list_id: string
          product_id: string
        }
        Insert: {
          convenio_price?: number | null
          created_at?: string | null
          credicontado_price?: number | null
          credit_price?: number | null
          id?: string
          list_1_price?: number | null
          list_2_price?: number | null
          list_3_price?: number | null
          list_4_price?: number | null
          price_list_id: string
          product_id: string
        }
        Update: {
          convenio_price?: number | null
          created_at?: string | null
          credicontado_price?: number | null
          credit_price?: number | null
          id?: string
          list_1_price?: number | null
          list_2_price?: number | null
          list_3_price?: number | null
          list_4_price?: number | null
          price_list_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_list_products_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string
          created_at: string | null
          description: string | null
          id: string
          line: string
          reference: string
          updated_at: string | null
        }
        Insert: {
          brand: string
          created_at?: string | null
          description?: string | null
          id?: string
          line: string
          reference: string
          updated_at?: string | null
        }
        Update: {
          brand?: string
          created_at?: string | null
          description?: string | null
          id?: string
          line?: string
          reference?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          advisor_id: string
          base_price: number
          client_id_number: string
          client_name: string
          client_phone: string
          created_at: string | null
          id: string
          initial_payment: number | null
          installments: number
          monthly_payment: number
          price_list_id: string
          product_id: string
          remaining_balance: number
          sale_type: Database["public"]["Enums"]["sale_plan_type"]
          total_price: number
        }
        Insert: {
          advisor_id: string
          base_price: number
          client_id_number: string
          client_name: string
          client_phone: string
          created_at?: string | null
          id?: string
          initial_payment?: number | null
          installments: number
          monthly_payment: number
          price_list_id: string
          product_id: string
          remaining_balance: number
          sale_type: Database["public"]["Enums"]["sale_plan_type"]
          total_price: number
        }
        Update: {
          advisor_id?: string
          base_price?: number
          client_id_number?: string
          client_name?: string
          client_phone?: string
          created_at?: string | null
          id?: string
          initial_payment?: number | null
          installments?: number
          monthly_payment?: number
          price_list_id?: string
          product_id?: string
          remaining_balance?: number
          sale_type?: Database["public"]["Enums"]["sale_plan_type"]
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_plan_config: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          plan_type: Database["public"]["Enums"]["sale_plan_type"]
          updated_at: string | null
        }
        Insert: {
          config: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_type: Database["public"]["Enums"]["sale_plan_type"]
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plan_type?: Database["public"]["Enums"]["sale_plan_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string | null
          department: string | null
          document_id: string | null
          email: string
          full_name: string
          hire_date: string | null
          id: string
          is_active: boolean | null
          phone: string | null
          position: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          document_id?: string | null
          email: string
          full_name: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          department?: string | null
          document_id?: string | null
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "advisor" | "comercial" | "cartera" | "administrativo"
      sale_plan_type: "credicontado" | "credito" | "convenio"
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
      app_role: ["admin", "advisor", "comercial", "cartera", "administrativo"],
      sale_plan_type: ["credicontado", "credito", "convenio"],
    },
  },
} as const
