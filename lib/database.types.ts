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
      users: {
        Row: {
          id: string
          email: string
          display_name: string
          role: 'user' | 'admin' | 'mod'
          reputation_score: number
          banned_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          display_name: string
          role?: 'user' | 'admin' | 'mod'
          reputation_score?: number
          banned_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string
          role?: 'user' | 'admin' | 'mod'
          reputation_score?: number
          banned_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          user_id: string
          avatar_url: string | null
          region: string | null
          contact: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          avatar_url?: string | null
          region?: string | null
          contact?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          avatar_url?: string | null
          region?: string | null
          contact?: string | null
          created_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string
          category: string
          regions: string[]
          price_suggested: number
          accepts_offers: boolean
          active: boolean
          created_at: string
          pokemon_data?: any
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description: string
          category: string
          regions?: string[]
          price_suggested: number
          accepts_offers?: boolean
          active?: boolean
          created_at?: string
          pokemon_data?: any
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string
          category?: string
          regions?: string[]
          price_suggested?: number
          accepts_offers?: boolean
          active?: boolean
          created_at?: string
          pokemon_data?: any
        }
      }
      availabilities: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          regions: string[]
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          regions?: string[]
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          regions?: string[]
          active?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          buyer_id: string
          listing_id: string
          seller_id: string | null
          amount_total: number
          offer_amount: number | null
          platform_fee: number
          status: 'PAYMENT_PENDING' | 'AWAITING_SELLER' | 'SELLER_ACCEPTED' | 'DELIVERY_SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'DISPUTE' | 'CANCELLED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          listing_id: string
          seller_id?: string | null
          amount_total: number
          offer_amount?: number | null
          platform_fee?: number
          status?: 'PAYMENT_PENDING' | 'AWAITING_SELLER' | 'SELLER_ACCEPTED' | 'DELIVERY_SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'DISPUTE' | 'CANCELLED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          listing_id?: string
          seller_id?: string | null
          amount_total?: number
          offer_amount?: number | null
          platform_fee?: number
          status?: 'PAYMENT_PENDING' | 'AWAITING_SELLER' | 'SELLER_ACCEPTED' | 'DELIVERY_SUBMITTED' | 'IN_REVIEW' | 'COMPLETED' | 'DISPUTE' | 'CANCELLED'
          created_at?: string
          updated_at?: string
        }
      }
      order_events: {
        Row: {
          id: string
          order_id: string
          type: string
          data: Json
          actor_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          type: string
          data?: Json
          actor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          type?: string
          data?: Json
          actor_id?: string | null
          created_at?: string
        }
      }
      payment_notifications: {
        Row: {
          id: string
          order_id: string
          mp_payment_id: string | null
          status: string
          payload: Json
          received_at: string
        }
        Insert: {
          id?: string
          order_id: string
          mp_payment_id?: string | null
          status: string
          payload?: Json
          received_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          mp_payment_id?: string | null
          status?: string
          payload?: Json
          received_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          order_id: string
          submitted_by: string
          message: string
          proof_urls: string[]
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          submitted_by: string
          message: string
          proof_urls?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          submitted_by?: string
          message?: string
          proof_urls?: string[]
          created_at?: string
        }
      }
      payouts: {
        Row: {
          id: string
          order_id: string
          seller_id: string
          method: 'PIX' | 'SPLIT'
          amount: number
          reference: string | null
          processed_at: string | null
          status: 'PENDING' | 'PROCESSED' | 'FAILED'
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          seller_id: string
          method: 'PIX' | 'SPLIT'
          amount: number
          reference?: string | null
          processed_at?: string | null
          status?: 'PENDING' | 'PROCESSED' | 'FAILED'
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          seller_id?: string
          method?: 'PIX' | 'SPLIT'
          amount?: number
          reference?: string | null
          processed_at?: string | null
          status?: 'PENDING' | 'PROCESSED' | 'FAILED'
          created_at?: string
        }
      }
      disputes: {
        Row: {
          id: string
          order_id: string
          opened_by: string
          reason: string
          status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
          resolution_notes: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          opened_by: string
          reason: string
          status?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          opened_by?: string
          reason?: string
          status?: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED'
          resolution_notes?: string | null
          resolved_at?: string | null
          created_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          order_id: string
          sender_id: string
          text: string
          attachments: string[]
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          sender_id: string
          text: string
          attachments?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          sender_id?: string
          text?: string
          attachments?: string[]
          created_at?: string
        }
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
  }
}
