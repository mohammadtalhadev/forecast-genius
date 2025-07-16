export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_pricing_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          current_price: number | null
          expires_at: string | null
          id: string
          market_position: string | null
          max_price: number | null
          min_price: number | null
          price_action: string | null
          product_id: string | null
          product_name: string
          reasoning: string | null
          recommended_price: number
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          current_price?: number | null
          expires_at?: string | null
          id?: string
          market_position?: string | null
          max_price?: number | null
          min_price?: number | null
          price_action?: string | null
          product_id?: string | null
          product_name: string
          reasoning?: string | null
          recommended_price: number
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          current_price?: number | null
          expires_at?: string | null
          id?: string
          market_position?: string | null
          max_price?: number | null
          min_price?: number | null
          price_action?: string | null
          product_id?: string | null
          product_name?: string
          reasoning?: string | null
          recommended_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_pricing_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_upload_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: string | null
          failed_rows: number | null
          filename: string
          id: string
          processed_rows: number | null
          status: string | null
          total_rows: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          failed_rows?: number | null
          filename: string
          id?: string
          processed_rows?: number | null
          status?: string | null
          total_rows: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: string | null
          failed_rows?: number | null
          filename?: string
          id?: string
          processed_rows?: number | null
          status?: string | null
          total_rows?: number
          user_id?: string
        }
        Relationships: []
      }
      competitor_analysis: {
        Row: {
          ai_analysis: string | null
          created_at: string | null
          customer_expectations: string | null
          dominant_brands: string[] | null
          expires_at: string | null
          id: string
          market_position: string | null
          market_price_max: number | null
          market_price_min: number | null
          product_id: string | null
          product_name: string
          seasonal_insights: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string | null
          customer_expectations?: string | null
          dominant_brands?: string[] | null
          expires_at?: string | null
          id?: string
          market_position?: string | null
          market_price_max?: number | null
          market_price_min?: number | null
          product_id?: string | null
          product_name: string
          seasonal_insights?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string | null
          customer_expectations?: string | null
          dominant_brands?: string[] | null
          expires_at?: string | null
          id?: string
          market_position?: string | null
          market_price_max?: number | null
          market_price_min?: number | null
          product_id?: string | null
          product_name?: string
          seasonal_insights?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_analysis_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_entries: {
        Row: {
          competitor_name: string
          created_at: string | null
          currency: string | null
          features: string[] | null
          id: string
          last_updated: string | null
          price: number
          product_id: string | null
          product_name: string
          seller_name: string | null
          source_platform: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          competitor_name: string
          created_at?: string | null
          currency?: string | null
          features?: string[] | null
          id?: string
          last_updated?: string | null
          price: number
          product_id?: string | null
          product_name: string
          seller_name?: string | null
          source_platform?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          competitor_name?: string
          created_at?: string | null
          currency?: string | null
          features?: string[] | null
          id?: string
          last_updated?: string | null
          price?: number
          product_id?: string | null
          product_name?: string
          seller_name?: string | null
          source_platform?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_price_history: {
        Row: {
          competitor_price_id: string
          id: string
          price: number
          scraped_at: string | null
        }
        Insert: {
          competitor_price_id: string
          id?: string
          price: number
          scraped_at?: string | null
        }
        Update: {
          competitor_price_id?: string
          id?: string
          price?: number
          scraped_at?: string | null
        }
        Relationships: []
      }
      competitor_prices: {
        Row: {
          competitor_name: string
          competitor_url: string | null
          currency: string | null
          features: string[] | null
          id: string
          is_active: boolean | null
          price: number
          product_id: string | null
          scraped_at: string
          seller_name: string | null
          source_platform: string | null
          user_id: string
        }
        Insert: {
          competitor_name: string
          competitor_url?: string | null
          currency?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          price: number
          product_id?: string | null
          scraped_at?: string
          seller_name?: string | null
          source_platform?: string | null
          user_id: string
        }
        Update: {
          competitor_name?: string
          competitor_url?: string | null
          currency?: string | null
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          price?: number
          product_id?: string | null
          scraped_at?: string
          seller_name?: string | null
          source_platform?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_data: {
        Row: {
          confidence_score: number | null
          expires_at: string
          forecast_30d: number
          forecast_365d: number
          forecast_7d: number
          forecast_90d: number
          generated_at: string
          id: string
          product_id: string | null
          trend_status: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          expires_at?: string
          forecast_30d: number
          forecast_365d: number
          forecast_7d: number
          forecast_90d: number
          generated_at?: string
          id?: string
          product_id?: string | null
          trend_status?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          expires_at?: string
          forecast_30d?: number
          forecast_365d?: number
          forecast_7d?: number
          forecast_90d?: number
          generated_at?: string
          id?: string
          product_id?: string | null
          trend_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      gemini_insights: {
        Row: {
          category_type: string | null
          competitor_max_price: number | null
          competitor_min_price: number | null
          confidence: number | null
          currency: string | null
          expires_at: string
          id: string
          is_seasonal: boolean | null
          is_trending: boolean | null
          last_updated: string
          price_analysis: string | null
          product_id: string | null
          product_name: string
          reasoning: string | null
          suggested_price: number | null
          user_id: string
        }
        Insert: {
          category_type?: string | null
          competitor_max_price?: number | null
          competitor_min_price?: number | null
          confidence?: number | null
          currency?: string | null
          expires_at?: string
          id?: string
          is_seasonal?: boolean | null
          is_trending?: boolean | null
          last_updated?: string
          price_analysis?: string | null
          product_id?: string | null
          product_name: string
          reasoning?: string | null
          suggested_price?: number | null
          user_id: string
        }
        Update: {
          category_type?: string | null
          competitor_max_price?: number | null
          competitor_min_price?: number | null
          confidence?: number | null
          currency?: string | null
          expires_at?: string
          id?: string
          is_seasonal?: boolean | null
          is_trending?: boolean | null
          last_updated?: string
          price_analysis?: string | null
          product_id?: string | null
          product_name?: string
          reasoning?: string | null
          suggested_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gemini_insights_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      google_trends_data: {
        Row: {
          id: string
          last_updated: string
          next_update: string
          product_id: string | null
          product_name: string
          trend_direction: string | null
          trend_score: number | null
          user_id: string
        }
        Insert: {
          id?: string
          last_updated?: string
          next_update?: string
          product_id?: string | null
          product_name: string
          trend_direction?: string | null
          trend_score?: number | null
          user_id: string
        }
        Update: {
          id?: string
          last_updated?: string
          next_update?: string
          product_id?: string | null
          product_name?: string
          trend_direction?: string | null
          trend_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_trends_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_metrics: {
        Row: {
          created_at: string | null
          current_stock: number | null
          daily_avg_sales: number | null
          days_until_sellout: number | null
          id: string
          last_calculated: string | null
          product_id: string | null
          reorder_quantity: number | null
          stock_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_stock?: number | null
          daily_avg_sales?: number | null
          days_until_sellout?: number | null
          id?: string
          last_calculated?: string | null
          product_id?: string | null
          reorder_quantity?: number | null
          stock_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_stock?: number | null
          daily_avg_sales?: number | null
          days_until_sellout?: number | null
          id?: string
          last_calculated?: string | null
          product_id?: string | null
          reorder_quantity?: number | null
          stock_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_metrics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_events: {
        Row: {
          created_at: string
          event_date: string
          event_name: string
          event_type: string
          id: string
          impact_multiplier: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_name: string
          event_type: string
          id?: string
          impact_multiplier?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_name?: string
          event_type?: string
          id?: string
          impact_multiplier?: number | null
          user_id?: string
        }
        Relationships: []
      }
      marketing_events_ai: {
        Row: {
          ai_reasoning: string | null
          campaign_suggestion: string | null
          created_at: string | null
          estimated_sales_boost: number | null
          event_date: string | null
          event_name: string
          id: string
          is_active: boolean | null
          product_id: string | null
          product_name: string
          suggested_discount: number | null
          user_id: string
        }
        Insert: {
          ai_reasoning?: string | null
          campaign_suggestion?: string | null
          created_at?: string | null
          estimated_sales_boost?: number | null
          event_date?: string | null
          event_name: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          product_name: string
          suggested_discount?: number | null
          user_id: string
        }
        Update: {
          ai_reasoning?: string | null
          campaign_suggestion?: string | null
          created_at?: string | null
          estimated_sales_boost?: number | null
          event_date?: string | null
          event_name?: string
          id?: string
          is_active?: boolean | null
          product_id?: string | null
          product_name?: string
          suggested_discount?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_events_ai_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          bio: string | null
          company: string | null
          created_at: string
          currency: string | null
          email_notifications: boolean | null
          expiry_warning_days: number | null
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          low_stock_threshold: number | null
          overstock_threshold: number | null
          timezone: string | null
          updated_at: string
          user_id: string
          whatsapp_notifications: boolean | null
          whatsapp_number: string | null
        }
        Insert: {
          bio?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          expiry_warning_days?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          overstock_threshold?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          whatsapp_notifications?: boolean | null
          whatsapp_number?: string | null
        }
        Update: {
          bio?: string | null
          company?: string | null
          created_at?: string
          currency?: string | null
          email_notifications?: boolean | null
          expiry_warning_days?: number | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          low_stock_threshold?: number | null
          overstock_threshold?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_notifications?: boolean | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      price_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          current_price: number
          expected_profit_increase: number | null
          id: string
          product_id: string | null
          reason: string | null
          recommended_price: number
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          current_price: number
          expected_profit_increase?: number | null
          id?: string
          product_id?: string | null
          reason?: string | null
          recommended_price: number
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          current_price?: number
          expected_profit_increase?: number | null
          id?: string
          product_id?: string | null
          reason?: string | null
          recommended_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_forecasts: {
        Row: {
          forecast_30d: number
          forecast_365d: number
          forecast_7d: number
          forecast_90d: number
          generated_at: string
          id: string
          product_id: string | null
          user_id: string | null
        }
        Insert: {
          forecast_30d: number
          forecast_365d: number
          forecast_7d: number
          forecast_90d: number
          generated_at?: string
          id?: string
          product_id?: string | null
          user_id?: string | null
        }
        Update: {
          forecast_30d?: number
          forecast_365d?: number
          forecast_7d?: number
          forecast_90d?: number
          generated_at?: string
          id?: string
          product_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          cost_price: number | null
          created_at: string
          current_price: number | null
          current_stock: number | null
          date: string | null
          description: string | null
          expiry_date: string | null
          id: string
          is_perishable: boolean | null
          last_reorder_date: string | null
          last_stock_update: string | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string
          productName: string | null
          quantitySold: number | null
          reorder_quantity: number | null
          shelf_life_days: number | null
          sku: string | null
          supplier: string | null
          unitPrice: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          current_price?: number | null
          current_stock?: number | null
          date?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_perishable?: boolean | null
          last_reorder_date?: string | null
          last_stock_update?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name: string
          productName?: string | null
          quantitySold?: number | null
          reorder_quantity?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          supplier?: string | null
          unitPrice?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          cost_price?: number | null
          created_at?: string
          current_price?: number | null
          current_stock?: number | null
          date?: string | null
          description?: string | null
          expiry_date?: string | null
          id?: string
          is_perishable?: boolean | null
          last_reorder_date?: string | null
          last_stock_update?: string | null
          max_stock_level?: number | null
          min_stock_level?: number | null
          name?: string
          productName?: string | null
          quantitySold?: number | null
          reorder_quantity?: number | null
          shelf_life_days?: number | null
          sku?: string | null
          supplier?: string | null
          unitPrice?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raw_uploads: {
        Row: {
          created_at: string
          date: string | null
          id: string
          productname: string | null
          quantitysold: number | null
          raw_json: Json | null
          unitprice: number | null
          upload_job_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          id?: string
          productname?: string | null
          quantitysold?: number | null
          raw_json?: Json | null
          unitprice?: number | null
          upload_job_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string | null
          id?: string
          productname?: string | null
          quantitysold?: number | null
          raw_json?: Json | null
          unitprice?: number | null
          upload_job_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_uploads_upload_job_id_fkey"
            columns: ["upload_job_id"]
            isOneToOne: false
            referencedRelation: "bulk_upload_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_data: {
        Row: {
          created_at: string
          date: string
          id: string
          product_id: string | null
          quantity_sold: number
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          product_id?: string | null
          quantity_sold: number
          unit_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          product_id?: string | null
          quantity_sold?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_alerts: {
        Row: {
          action_recommended: string | null
          ai_explanation: string | null
          alert_type: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          product_id: string | null
          product_name: string
          severity: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_recommended?: string | null
          ai_explanation?: string | null
          alert_type: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          product_id?: string | null
          product_name: string
          severity?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_recommended?: string | null
          ai_explanation?: string | null
          alert_type?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          product_id?: string | null
          product_name?: string
          severity?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_files: {
        Row: {
          created_at: string | null
          file_size: number | null
          filename: string
          id: string
          product_count: number | null
          status: string | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          filename: string
          id?: string
          product_count?: number | null
          status?: string | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          filename?: string
          id?: string
          product_count?: number | null
          status?: string | null
          upload_date?: string | null
          user_id?: string
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
  public: {
    Enums: {},
  },
} as const
