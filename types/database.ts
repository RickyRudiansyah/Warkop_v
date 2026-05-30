export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tables: {
        Row: {
          id: string
          table_number: number
          label: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          table_number: number
          label?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          table_number?: number
          label?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          sort_order?: number
        }
      }
      menu_items: {
        Row: {
          id: string
          category_id: string | null
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          is_sold_out: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          is_sold_out?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          is_sold_out?: boolean
          created_at?: string
        }
      }
      menu_variations: {
        Row: {
          id: string
          menu_item_id: string
          variation_type: string
          label: string
          extra_price: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          variation_type: string
          label: string
          extra_price?: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          group_name?: string
          label?: string
          extra_price?: number
        }
      }
      orders: {
        Row: {
          id: string
          table_id: string | null
          session_id: string | null
          status: string
          payment_method: string
          payment_status: string
          total_amount: number
          notes: string | null
          cancel_reason: string | null
          payment_ref: string | null
          receipt_printed: boolean
          created_at: string
          paid_at: string | null
        }
        Insert: {
          id?: string
          table_id?: string | null
          session_id?: string | null
          status?: string
          payment_method: string
          payment_status?: string
          total_amount: number
          notes?: string | null
          cancel_reason?: string | null
          payment_ref?: string | null
          receipt_printed?: boolean
          created_at?: string
          paid_at?: string | null
        }
        Update: {
          id?: string
          table_id?: string | null
          session_id?: string | null
          status?: string
          payment_method?: string
          payment_status?: string
          total_amount?: number
          notes?: string | null
          cancel_reason?: string | null
          payment_ref?: string | null
          receipt_printed?: boolean
          created_at?: string
          paid_at?: string | null
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          menu_item_name: string
          menu_item_price: number
          quantity: number
          variations: Json
          subtotal: number
          notes: string | null
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          menu_item_name: string
          menu_item_price: number
          quantity: number
          variations?: Json
          subtotal: number
          notes?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string | null
          menu_item_name?: string
          menu_item_price?: number
          quantity?: number
          variations?: Json
          subtotal?: number
          notes?: string | null
        }
      }
      table_sessions: {
        Row: {
          id: string
          table_number: number
          status: string
          total_amount: number
          created_at: string
          closed_at: string | null
        }
        Insert: {
          id?: string
          table_number: number
          status?: string
          total_amount?: number
          created_at?: string
          closed_at?: string | null
        }
        Update: {
          id?: string
          table_number?: number
          status?: string
          total_amount?: number
          created_at?: string
          closed_at?: string | null
        }
      }
      staff_users: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          is_active?: boolean
          created_at?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          actor_email: string
          actor_role: string
          action: string
          target_type: string | null
          target_id: string | null
          detail: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_email: string
          actor_role: string
          action: string
          target_type?: string | null
          target_id?: string | null
          detail?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_email?: string
          actor_role?: string
          action?: string
          target_type?: string | null
          target_id?: string | null
          detail?: Json | null
          created_at?: string
        }
      }
    }
  }
}
