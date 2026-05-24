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
      activity_stream: {
        Row: {
          action: string
          action_category: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string
          description: string
          duration_ms: number | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          geo_location: string | null
          id: string
          ip_address: unknown
          metadata: Json | null
          request_id: string | null
          session_id: string | null
          severity: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_category: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          description: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          geo_location?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          request_id?: string | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_category?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          description?: string
          duration_ms?: number | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          geo_location?: string | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          request_id?: string | null
          session_id?: string | null
          severity?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      ad_ab_test_results: {
        Row: {
          clicks: number
          created_at: string
          date: string
          id: string
          impressions: number
          test_id: string
          variant: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          test_id: string
          variant: string
        }
        Update: {
          clicks?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          test_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_ab_test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ad_ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_ab_tests: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          traffic_split: number
          updated_at: string
          variant_a: Json
          variant_b: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          traffic_split?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          traffic_split?: number
          updated_at?: string
          variant_a?: Json
          variant_b?: Json
        }
        Relationships: []
      }
      admin_assistant_fixes: {
        Row: {
          applied_at: string | null
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          created_at: string
          estimated_effort: string | null
          fix_details: Json | null
          fix_type: string
          id: string
          issue_id: string
          recommendation: string
          rejection_reason: string | null
        }
        Insert: {
          applied_at?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          estimated_effort?: string | null
          fix_details?: Json | null
          fix_type: string
          id?: string
          issue_id: string
          recommendation: string
          rejection_reason?: string | null
        }
        Update: {
          applied_at?: string | null
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          estimated_effort?: string | null
          fix_details?: Json | null
          fix_type?: string
          id?: string
          issue_id?: string
          recommendation?: string
          rejection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_assistant_fixes_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "admin_assistant_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_assistant_issues: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_resource: string | null
          category: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          resolved_at: string | null
          scan_id: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_resource?: string | null
          category: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          scan_id?: string | null
          severity?: string
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_resource?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          scan_id?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_assistant_issues_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "admin_assistant_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_assistant_scans: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          scan_type: string
          started_at: string
          status: string
          summary: Json | null
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          scan_type?: string
          started_at?: string
          status?: string
          summary?: Json | null
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          scan_type?: string
          started_at?: string
          status?: string
          summary?: Json | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      ai_agent_action_log: {
        Row: {
          action_status: string
          action_type: string
          affected_resource: string | null
          affected_resource_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string
          details: Json | null
          error_message: string | null
          executed_at: string | null
          id: string
          requires_approval: boolean | null
        }
        Insert: {
          action_status?: string
          action_type: string
          affected_resource?: string | null
          affected_resource_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description: string
          details?: Json | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          requires_approval?: boolean | null
        }
        Update: {
          action_status?: string
          action_type?: string
          affected_resource?: string | null
          affected_resource_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string
          details?: Json | null
          error_message?: string | null
          executed_at?: string | null
          id?: string
          requires_approval?: boolean | null
        }
        Relationships: []
      }
      ai_agent_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          ad_placements: Json | null
          ads_enabled: boolean
          ai_summary: string | null
          author: string
          author_avatar: string | null
          call_to_action: Json | null
          categories: Database["public"]["Enums"]["blog_category"][]
          content: string
          created_at: string
          created_by: string | null
          excerpt: string
          featured_image: string | null
          gallery_images: string[] | null
          id: string
          image_caption: string | null
          image_credit: string | null
          is_featured: boolean
          is_pinned: boolean
          is_rss_import: boolean | null
          is_trending: boolean
          location_scope: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          source_name: string | null
          source_url: string | null
          status: string
          submitted_by: string | null
          subtitle: string | null
          tags: string[] | null
          title: string
          updated_at: string
          video_url: string | null
          views: number
          word_count: number | null
        }
        Insert: {
          ad_placements?: Json | null
          ads_enabled?: boolean
          ai_summary?: string | null
          author?: string
          author_avatar?: string | null
          call_to_action?: Json | null
          categories?: Database["public"]["Enums"]["blog_category"][]
          content: string
          created_at?: string
          created_by?: string | null
          excerpt: string
          featured_image?: string | null
          gallery_images?: string[] | null
          id?: string
          image_caption?: string | null
          image_credit?: string | null
          is_featured?: boolean
          is_pinned?: boolean
          is_rss_import?: boolean | null
          is_trending?: boolean
          location_scope?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          source_name?: string | null
          source_url?: string | null
          status?: string
          submitted_by?: string | null
          subtitle?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
          views?: number
          word_count?: number | null
        }
        Update: {
          ad_placements?: Json | null
          ads_enabled?: boolean
          ai_summary?: string | null
          author?: string
          author_avatar?: string | null
          call_to_action?: Json | null
          categories?: Database["public"]["Enums"]["blog_category"][]
          content?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured_image?: string | null
          gallery_images?: string[] | null
          id?: string
          image_caption?: string | null
          image_credit?: string | null
          is_featured?: boolean
          is_pinned?: boolean
          is_rss_import?: boolean | null
          is_trending?: boolean
          location_scope?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          source_name?: string | null
          source_url?: string | null
          status?: string
          submitted_by?: string | null
          subtitle?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
          views?: number
          word_count?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          category: string
          created_at: string
          criteria: Json | null
          description: string | null
          icon: string
          id: string
          is_active: boolean
          name: string
          points_required: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon: string
          id?: string
          is_active?: boolean
          name: string
          points_required?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number | null
        }
        Relationships: []
      }
      blog_analytics_daily: {
        Row: {
          anonymous_views: number | null
          article_id: string
          avg_duration_seconds: number | null
          created_at: string
          date: string
          desktop_views: number | null
          direct_referrals: number | null
          google_referrals: number | null
          id: string
          logged_in_views: number | null
          mobile_views: number | null
          other_referrals: number | null
          social_referrals: number | null
          tablet_views: number | null
          total_views: number | null
          unique_viewers: number | null
          updated_at: string
        }
        Insert: {
          anonymous_views?: number | null
          article_id: string
          avg_duration_seconds?: number | null
          created_at?: string
          date?: string
          desktop_views?: number | null
          direct_referrals?: number | null
          google_referrals?: number | null
          id?: string
          logged_in_views?: number | null
          mobile_views?: number | null
          other_referrals?: number | null
          social_referrals?: number | null
          tablet_views?: number | null
          total_views?: number | null
          unique_viewers?: number | null
          updated_at?: string
        }
        Update: {
          anonymous_views?: number | null
          article_id?: string
          avg_duration_seconds?: number | null
          created_at?: string
          date?: string
          desktop_views?: number | null
          direct_referrals?: number | null
          google_referrals?: number | null
          id?: string
          logged_in_views?: number | null
          mobile_views?: number | null
          other_referrals?: number | null
          social_referrals?: number | null
          tablet_views?: number | null
          total_views?: number | null
          unique_viewers?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_analytics_daily_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_views: {
        Row: {
          article_id: string
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          id: string
          ip_hash: string | null
          is_counted: boolean | null
          referrer: string | null
          referrer_category: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          ip_hash?: string | null
          is_counted?: boolean | null
          referrer?: string | null
          referrer_category?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          id?: string
          ip_hash?: string | null
          is_counted?: boolean | null
          referrer?: string | null
          referrer_category?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_availability: {
        Row: {
          average_project_days: number | null
          booking_lead_time_days: number | null
          business_id: string
          current_projects: number | null
          id: string
          is_accepting_bookings: boolean | null
          max_projects: number | null
          next_available_date: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          average_project_days?: number | null
          booking_lead_time_days?: number | null
          business_id: string
          current_projects?: number | null
          id?: string
          is_accepting_bookings?: boolean | null
          max_projects?: number | null
          next_available_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          average_project_days?: number | null
          booking_lead_time_days?: number | null
          business_id?: string
          current_projects?: number | null
          id?: string
          is_accepting_bookings?: boolean | null
          max_projects?: number | null
          next_available_date?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_operations: {
        Row: {
          completed_at: string | null
          entity_ids: string[]
          entity_type: string
          error_log: Json | null
          failed_count: number | null
          id: string
          operation_type: string
          parameters: Json | null
          performed_by: string | null
          results: Json | null
          started_at: string
          status: string
          success_count: number | null
          total_count: number
        }
        Insert: {
          completed_at?: string | null
          entity_ids: string[]
          entity_type: string
          error_log?: Json | null
          failed_count?: number | null
          id?: string
          operation_type: string
          parameters?: Json | null
          performed_by?: string | null
          results?: Json | null
          started_at?: string
          status?: string
          success_count?: number | null
          total_count: number
        }
        Update: {
          completed_at?: string | null
          entity_ids?: string[]
          entity_type?: string
          error_log?: Json | null
          failed_count?: number | null
          id?: string
          operation_type?: string
          parameters?: Json | null
          performed_by?: string | null
          results?: Json | null
          started_at?: string
          status?: string
          success_count?: number | null
          total_count?: number
        }
        Relationships: []
      }
      businesses: {
        Row: {
          address: string
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          billing_cycle: string | null
          category: Database["public"]["Enums"]["business_category"]
          certification_label: string | null
          certifications: string[] | null
          city: string
          claimed: boolean
          claimed_at: string | null
          created_at: string
          description: string | null
          email: string | null
          full_description: string | null
          has_used_trial: boolean | null
          hours: string | null
          id: string
          images: string[] | null
          is_featured: boolean
          is_verified: boolean
          latitude: number | null
          longitude: number | null
          map_visible: boolean
          materials: string[] | null
          name: string
          owner_id: string
          payment_amount: number | null
          payment_captured_at: string | null
          payment_date: string | null
          payment_intent_id: string | null
          payment_refunded_at: string | null
          payment_status: string | null
          phone: string | null
          pin_priority: string
          rating: number | null
          rejection_reason: string | null
          resubmission_notes: string | null
          resubmission_requested_at: string | null
          review_count: number | null
          social_links: Json | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          sub_categories: string[] | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          suspended_at: string | null
          trial_end_at: string | null
          trial_reminder_sent_at: string | null
          trial_start_at: string | null
          trial_status: string | null
          updated_at: string
          verification_documents: Json | null
          verification_processed_at: string | null
          verification_processed_by: string | null
          verification_rejection_reason: string | null
          verification_requested_at: string | null
          verification_status: string | null
          verification_suspended_at: string | null
          verification_suspension_reason: string | null
          website: string | null
        }
        Insert: {
          address: string
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billing_cycle?: string | null
          category: Database["public"]["Enums"]["business_category"]
          certification_label?: string | null
          certifications?: string[] | null
          city: string
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_description?: string | null
          has_used_trial?: boolean | null
          hours?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          map_visible?: boolean
          materials?: string[] | null
          name: string
          owner_id: string
          payment_amount?: number | null
          payment_captured_at?: string | null
          payment_date?: string | null
          payment_intent_id?: string | null
          payment_refunded_at?: string | null
          payment_status?: string | null
          phone?: string | null
          pin_priority?: string
          rating?: number | null
          rejection_reason?: string | null
          resubmission_notes?: string | null
          resubmission_requested_at?: string | null
          review_count?: number | null
          social_links?: Json | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sub_categories?: string[] | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          suspended_at?: string | null
          trial_end_at?: string | null
          trial_reminder_sent_at?: string | null
          trial_start_at?: string | null
          trial_status?: string | null
          updated_at?: string
          verification_documents?: Json | null
          verification_processed_at?: string | null
          verification_processed_by?: string | null
          verification_rejection_reason?: string | null
          verification_requested_at?: string | null
          verification_status?: string | null
          verification_suspended_at?: string | null
          verification_suspension_reason?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          billing_cycle?: string | null
          category?: Database["public"]["Enums"]["business_category"]
          certification_label?: string | null
          certifications?: string[] | null
          city?: string
          claimed?: boolean
          claimed_at?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          full_description?: string | null
          has_used_trial?: boolean | null
          hours?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean
          is_verified?: boolean
          latitude?: number | null
          longitude?: number | null
          map_visible?: boolean
          materials?: string[] | null
          name?: string
          owner_id?: string
          payment_amount?: number | null
          payment_captured_at?: string | null
          payment_date?: string | null
          payment_intent_id?: string | null
          payment_refunded_at?: string | null
          payment_status?: string | null
          phone?: string | null
          pin_priority?: string
          rating?: number | null
          rejection_reason?: string | null
          resubmission_notes?: string | null
          resubmission_requested_at?: string | null
          review_count?: number | null
          social_links?: Json | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          sub_categories?: string[] | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          suspended_at?: string | null
          trial_end_at?: string | null
          trial_reminder_sent_at?: string | null
          trial_start_at?: string | null
          trial_status?: string | null
          updated_at?: string
          verification_documents?: Json | null
          verification_processed_at?: string | null
          verification_processed_by?: string | null
          verification_rejection_reason?: string | null
          verification_requested_at?: string | null
          verification_status?: string | null
          verification_suspended_at?: string | null
          verification_suspension_reason?: string | null
          website?: string | null
        }
        Relationships: []
      }
      businesses_public: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["business_category"] | null
          certification_label: string | null
          certifications: string[] | null
          city: string | null
          created_at: string | null
          description: string | null
          full_description: string | null
          hours: string | null
          id: string
          images: string[] | null
          is_featured: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          map_visible: boolean | null
          materials: string[] | null
          name: string | null
          pin_priority: string | null
          rating: number | null
          review_count: number | null
          social_links: Json | null
          status: string | null
          sub_categories: string[] | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_category"] | null
          certification_label?: string | null
          certifications?: string[] | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          full_description?: string | null
          hours?: string | null
          id: string
          images?: string[] | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          map_visible?: boolean | null
          materials?: string[] | null
          name?: string | null
          pin_priority?: string | null
          rating?: number | null
          review_count?: number | null
          social_links?: Json | null
          status?: string | null
          sub_categories?: string[] | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["business_category"] | null
          certification_label?: string | null
          certifications?: string[] | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          full_description?: string | null
          hours?: string | null
          id?: string
          images?: string[] | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          map_visible?: boolean | null
          materials?: string[] | null
          name?: string | null
          pin_priority?: string | null
          rating?: number | null
          review_count?: number | null
          social_links?: Json | null
          status?: string | null
          sub_categories?: string[] | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      communication_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
          previous_version_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          version: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
          previous_version_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
          previous_version_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_attachments_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "communication_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          attachment_id: string | null
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          message_id: string | null
          new_value: Json | null
          old_value: Json | null
          thread_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          attachment_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          message_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          thread_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          attachment_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          message_id?: string | null
          new_value?: Json | null
          old_value?: Json | null
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_audit_log_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "communication_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_audit_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_audit_log_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_messages: {
        Row: {
          content: string
          created_at: string
          email_in_reply_to: string | null
          email_message_id: string | null
          html_content: string | null
          id: string
          is_system_message: boolean | null
          read_at: string | null
          read_by: string | null
          sender_email: string | null
          sender_id: string | null
          sender_name: string | null
          sender_role: string
          sent_from_identity: string | null
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          email_in_reply_to?: string | null
          email_message_id?: string | null
          html_content?: string | null
          id?: string
          is_system_message?: boolean | null
          read_at?: string | null
          read_by?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_role: string
          sent_from_identity?: string | null
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          email_in_reply_to?: string | null
          email_message_id?: string | null
          html_content?: string | null
          id?: string
          is_system_message?: boolean | null
          read_at?: string | null
          read_by?: string | null
          sender_email?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_role?: string
          sent_from_identity?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_sent_from_identity_fkey"
            columns: ["sent_from_identity"]
            isOneToOne: false
            referencedRelation: "email_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_participants: {
        Row: {
          can_reply: boolean | null
          id: string
          joined_at: string
          last_read_at: string | null
          thread_id: string
          user_email: string | null
          user_id: string | null
          user_role: string
        }
        Insert: {
          can_reply?: boolean | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          thread_id: string
          user_email?: string | null
          user_id?: string | null
          user_role: string
        }
        Update: {
          can_reply?: boolean | null
          id?: string
          joined_at?: string
          last_read_at?: string | null
          thread_id?: string
          user_email?: string | null
          user_id?: string | null
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_threads: {
        Row: {
          assigned_to: string | null
          category: string | null
          channel_type: string
          created_at: string
          email_category: string | null
          email_identity_id: string | null
          external_recipient_email: string | null
          external_recipient_name: string | null
          id: string
          initiator_email: string | null
          initiator_id: string | null
          initiator_name: string | null
          initiator_role: string
          is_broadcast: boolean | null
          last_message_at: string | null
          original_email_log_id: string | null
          priority: string
          related_entity_id: string | null
          related_entity_type: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          channel_type: string
          created_at?: string
          email_category?: string | null
          email_identity_id?: string | null
          external_recipient_email?: string | null
          external_recipient_name?: string | null
          id?: string
          initiator_email?: string | null
          initiator_id?: string | null
          initiator_name?: string | null
          initiator_role: string
          is_broadcast?: boolean | null
          last_message_at?: string | null
          original_email_log_id?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          channel_type?: string
          created_at?: string
          email_category?: string | null
          email_identity_id?: string | null
          external_recipient_email?: string | null
          external_recipient_name?: string | null
          id?: string
          initiator_email?: string | null
          initiator_id?: string | null
          initiator_name?: string | null
          initiator_role?: string
          is_broadcast?: boolean | null
          last_message_at?: string | null
          original_email_log_id?: string | null
          priority?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_threads_email_identity_id_fkey"
            columns: ["email_identity_id"]
            isOneToOne: false
            referencedRelation: "email_identities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_original_email_log_id_fkey"
            columns: ["original_email_log_id"]
            isOneToOne: false
            referencedRelation: "email_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          is_read: boolean
          message: string
          name: string
          subject: string | null
          submission_count_today: number | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          is_read?: boolean
          message: string
          name: string
          subject?: string | null
          submission_count_today?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          is_read?: boolean
          message?: string
          name?: string
          subject?: string | null
          submission_count_today?: number | null
        }
        Relationships: []
      }
      contractor_call_logs: {
        Row: {
          call_date: string
          call_duration_minutes: number | null
          call_outcome: string
          call_purpose: string
          call_time: string
          company_name: string | null
          contact_name: string
          contact_type: string
          created_at: string
          email: string | null
          id: string
          ip_address: unknown
          notes: string | null
          phone_number: string
          portal_user_id: string
          updated_at: string
          verification_method: string | null
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          call_date?: string
          call_duration_minutes?: number | null
          call_outcome: string
          call_purpose: string
          call_time?: string
          company_name?: string | null
          contact_name: string
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          phone_number: string
          portal_user_id: string
          updated_at?: string
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          call_date?: string
          call_duration_minutes?: number | null
          call_outcome?: string
          call_purpose?: string
          call_time?: string
          company_name?: string | null
          contact_name?: string
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: unknown
          notes?: string | null
          phone_number?: string
          portal_user_id?: string
          updated_at?: string
          verification_method?: string | null
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_call_logs_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_invoices: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          description: string | null
          due_date: string | null
          gst_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          paid_at: string | null
          paid_by: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          portal_user_id: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          subtotal: number
          total_amount: number
          updated_at: string
          uploaded_pdf_path: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          portal_user_id: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
          uploaded_pdf_path?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          portal_user_id?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
          uploaded_pdf_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_invoices_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_matches: {
        Row: {
          business_id: string
          created_at: string
          estimate_id: string | null
          id: string
          ip_hash: string | null
          message: string | null
          responded_at: string | null
          status: string
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          estimate_id?: string | null
          id?: string
          ip_hash?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          estimate_id?: string | null
          id?: string
          ip_hash?: string | null
          message?: string | null
          responded_at?: string | null
          status?: string
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_matches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contractor_matches_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "project_estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_performance_metrics: {
        Row: {
          avg_response_time_hours: number | null
          business_id: string
          calculated_at: string
          contact_clicks: number | null
          customer_rating_avg: number | null
          id: string
          period_end: string
          period_start: string
          profile_views: number | null
          projects_quoted: number | null
          projects_won: number | null
          responded_leads: number | null
          review_count: number | null
          total_leads: number | null
          total_revenue: number | null
          win_rate: number | null
        }
        Insert: {
          avg_response_time_hours?: number | null
          business_id: string
          calculated_at?: string
          contact_clicks?: number | null
          customer_rating_avg?: number | null
          id?: string
          period_end: string
          period_start: string
          profile_views?: number | null
          projects_quoted?: number | null
          projects_won?: number | null
          responded_leads?: number | null
          review_count?: number | null
          total_leads?: number | null
          total_revenue?: number | null
          win_rate?: number | null
        }
        Update: {
          avg_response_time_hours?: number | null
          business_id?: string
          calculated_at?: string
          contact_clicks?: number | null
          customer_rating_avg?: number | null
          id?: string
          period_end?: string
          period_start?: string
          profile_views?: number | null
          projects_quoted?: number | null
          projects_won?: number | null
          responded_leads?: number | null
          review_count?: number | null
          total_leads?: number | null
          total_revenue?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_performance_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_reports: {
        Row: {
          chart_config: Json | null
          columns: Json
          created_at: string
          created_by: string | null
          data_sources: Json
          description: string | null
          email_recipients: string[] | null
          filters: Json | null
          grouping: Json | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          report_type: string
          schedule: string | null
          updated_at: string
        }
        Insert: {
          chart_config?: Json | null
          columns?: Json
          created_at?: string
          created_by?: string | null
          data_sources?: Json
          description?: string | null
          email_recipients?: string[] | null
          filters?: Json | null
          grouping?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          report_type: string
          schedule?: string | null
          updated_at?: string
        }
        Update: {
          chart_config?: Json | null
          columns?: Json
          created_at?: string
          created_by?: string | null
          data_sources?: Json
          description?: string | null
          email_recipients?: string[] | null
          filters?: Json | null
          grouping?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          report_type?: string
          schedule?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dunning_records: {
        Row: {
          attempt_count: number
          business_id: string | null
          created_at: string
          dunning_type: string
          email_sent_at: string
          id: string
          next_reminder_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          business_id?: string | null
          created_at?: string
          dunning_type: string
          email_sent_at?: string
          id?: string
          next_reminder_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          business_id?: string | null
          created_at?: string
          dunning_type?: string
          email_sent_at?: string
          id?: string
          next_reminder_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dunning_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      elite_category_caps: {
        Row: {
          category: string
          current_count: number
          id: string
          is_accepting_new: boolean
          max_slots: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          current_count?: number
          id?: string
          is_accepting_new?: boolean
          max_slots?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          current_count?: number
          id?: string
          is_accepting_new?: boolean
          max_slots?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      elite_location_multipliers: {
        Row: {
          city: string
          created_at: string | null
          current_elite_count: number | null
          id: string
          max_elite_slots: number | null
          size_tier: string
          slot_multiplier: number | null
          suburb: string | null
          updated_at: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          current_elite_count?: number | null
          id?: string
          max_elite_slots?: number | null
          size_tier?: string
          slot_multiplier?: number | null
          suburb?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          current_elite_count?: number | null
          id?: string
          max_elite_slots?: number | null
          size_tier?: string
          slot_multiplier?: number | null
          suburb?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      elite_region_settings: {
        Row: {
          base_cap: number
          cap_at_threshold_1: number | null
          cap_at_threshold_2: number | null
          cap_at_threshold_3: number | null
          current_cap: number
          current_monthly_traffic: number | null
          id: string
          is_rotation_enabled: boolean | null
          last_traffic_update: string | null
          region_name: string
          rotation_frequency: string | null
          traffic_threshold_1: number | null
          traffic_threshold_2: number | null
          traffic_threshold_3: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          base_cap?: number
          cap_at_threshold_1?: number | null
          cap_at_threshold_2?: number | null
          cap_at_threshold_3?: number | null
          current_cap?: number
          current_monthly_traffic?: number | null
          id?: string
          is_rotation_enabled?: boolean | null
          last_traffic_update?: string | null
          region_name?: string
          rotation_frequency?: string | null
          traffic_threshold_1?: number | null
          traffic_threshold_2?: number | null
          traffic_threshold_3?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          base_cap?: number
          cap_at_threshold_1?: number | null
          cap_at_threshold_2?: number | null
          cap_at_threshold_3?: number | null
          current_cap?: number
          current_monthly_traffic?: number | null
          id?: string
          is_rotation_enabled?: boolean | null
          last_traffic_update?: string | null
          region_name?: string
          rotation_frequency?: string | null
          traffic_threshold_1?: number | null
          traffic_threshold_2?: number | null
          traffic_threshold_3?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      elite_rotation_log: {
        Row: {
          business_id: string | null
          category: string
          clicks_today: number | null
          created_at: string | null
          display_order: number | null
          id: string
          impressions_today: number | null
          rotation_date: string
        }
        Insert: {
          business_id?: string | null
          category: string
          clicks_today?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          impressions_today?: number | null
          rotation_date?: string
        }
        Update: {
          business_id?: string | null
          category?: string
          clicks_today?: number | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          impressions_today?: number | null
          rotation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "elite_rotation_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      elite_waitlist: {
        Row: {
          activity_score: number | null
          admin_notes: string | null
          average_rating: number | null
          business_id: string
          category: string
          current_plan: string
          id: string
          is_verified: boolean | null
          months_on_platform: number | null
          notified_at: string | null
          priority_score: number | null
          processed_at: string | null
          processed_by: string | null
          requested_at: string
          review_count: number | null
          status: string
        }
        Insert: {
          activity_score?: number | null
          admin_notes?: string | null
          average_rating?: number | null
          business_id: string
          category: string
          current_plan: string
          id?: string
          is_verified?: boolean | null
          months_on_platform?: number | null
          notified_at?: string | null
          priority_score?: number | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          review_count?: number | null
          status?: string
        }
        Update: {
          activity_score?: number | null
          admin_notes?: string | null
          average_rating?: number | null
          business_id?: string
          category?: string
          current_plan?: string
          id?: string
          is_verified?: boolean | null
          months_on_platform?: number | null
          notified_at?: string | null
          priority_score?: number | null
          processed_at?: string | null
          processed_by?: string | null
          requested_at?: string
          review_count?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "elite_waitlist_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_identities: {
        Row: {
          auto_response_enabled: boolean | null
          auto_response_template: string | null
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          email_address: string
          id: string
          is_active: boolean | null
          is_public: boolean | null
          updated_at: string | null
        }
        Insert: {
          auto_response_enabled?: boolean | null
          auto_response_template?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          email_address: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          auto_response_enabled?: boolean | null
          auto_response_template?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          email_address?: string
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          body_html: string | null
          body_text: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          metadata: Json | null
          sent_by: string | null
          status: string
          subject: string
          to_email: string
          to_name: string | null
        }
        Insert: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_by?: string | null
          status?: string
          subject: string
          to_email: string
          to_name?: string | null
        }
        Update: {
          body_html?: string | null
          body_text?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          sent_by?: string | null
          status?: string
          subject?: string
          to_email?: string
          to_name?: string | null
        }
        Relationships: []
      }
      email_sequence_enrollments: {
        Row: {
          completed_at: string | null
          current_step: number
          enrolled_at: string
          id: string
          metadata: Json | null
          next_email_at: string | null
          recipient_email: string
          recipient_id: string | null
          recipient_name: string | null
          recipient_type: string
          sequence_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          next_email_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          sequence_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number
          enrolled_at?: string
          id?: string
          metadata?: Json | null
          next_email_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string | null
          recipient_type?: string
          sequence_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_logs: {
        Row: {
          clicked_at: string | null
          enrollment_id: string
          error_message: string | null
          id: string
          opened_at: string | null
          sent_at: string
          status: string
          step_id: string
        }
        Insert: {
          clicked_at?: string | null
          enrollment_id: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          step_id: string
        }
        Update: {
          clicked_at?: string | null
          enrollment_id?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string
          status?: string
          step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_logs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sequence_logs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "email_sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequence_steps: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string
          delay_days: number
          delay_hours: number
          id: string
          is_active: boolean | null
          sequence_id: string
          step_order: number
          subject: string
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          sequence_id: string
          step_order?: number
          subject: string
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string
          delay_days?: number
          delay_hours?: number
          id?: string
          is_active?: boolean | null
          sequence_id?: string
          step_order?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "email_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sequences: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_signature_settings: {
        Row: {
          created_at: string | null
          custom_tagline: string | null
          id: string
          include_phone: boolean | null
          include_photo: boolean | null
          include_qualifications: boolean | null
          portal_user_id: string
          signature_template: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_tagline?: string | null
          id?: string
          include_phone?: boolean | null
          include_photo?: boolean | null
          include_qualifications?: boolean | null
          portal_user_id: string
          signature_template?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_tagline?: string | null
          id?: string
          include_phone?: boolean | null
          include_photo?: boolean | null
          include_qualifications?: boolean | null
          portal_user_id?: string
          signature_template?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_signature_settings_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: true
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attended_at: string | null
          company: string | null
          email: string
          event_id: string | null
          id: string
          name: string
          phone: string | null
          registered_at: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          attended_at?: string | null
          company?: string | null
          email: string
          event_id?: string | null
          id?: string
          name: string
          phone?: string | null
          registered_at?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attended_at?: string | null
          company?: string | null
          email?: string
          event_id?: string | null
          id?: string
          name?: string
          phone?: string | null
          registered_at?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          current_attendees: number | null
          description: string | null
          end_date: string | null
          event_type: string
          featured_image: string | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          is_free: boolean | null
          is_online: boolean | null
          latitude: number | null
          location: string | null
          longitude: number | null
          max_attendees: number | null
          online_url: string | null
          organizer_id: string | null
          organizer_name: string | null
          price: number | null
          registration_url: string | null
          slug: string
          start_date: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          current_attendees?: number | null
          description?: string | null
          end_date?: string | null
          event_type: string
          featured_image?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_online?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_attendees?: number | null
          online_url?: string | null
          organizer_id?: string | null
          organizer_name?: string | null
          price?: number | null
          registration_url?: string | null
          slug: string
          start_date: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          current_attendees?: number | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          featured_image?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_online?: boolean | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_attendees?: number | null
          online_url?: string | null
          organizer_id?: string | null
          organizer_name?: string | null
          price?: number | null
          registration_url?: string | null
          slug?: string
          start_date?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      expert_leaderboard: {
        Row: {
          badge_level: string | null
          business_id: string | null
          certifications_count: number | null
          community_contributions: number | null
          created_at: string
          id: string
          last_calculated_at: string | null
          projects_completed: number | null
          rank_change: number | null
          rank_position: number | null
          response_rate: number | null
          review_score: number | null
          total_score: number
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          badge_level?: string | null
          business_id?: string | null
          certifications_count?: number | null
          community_contributions?: number | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          projects_completed?: number | null
          rank_change?: number | null
          rank_position?: number | null
          response_rate?: number | null
          review_score?: number | null
          total_score?: number
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          badge_level?: string | null
          business_id?: string | null
          certifications_count?: number | null
          community_contributions?: number | null
          created_at?: string
          id?: string
          last_calculated_at?: string | null
          projects_completed?: number | null
          rank_change?: number | null
          rank_position?: number | null
          response_rate?: number | null
          review_score?: number | null
          total_score?: number
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expert_leaderboard_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      financial_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      forum_answers: {
        Row: {
          business_id: string | null
          content: string
          created_at: string
          id: string
          is_accepted: boolean
          question_id: string
          updated_at: string
          upvotes: number
          user_id: string
        }
        Insert: {
          business_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          question_id: string
          updated_at?: string
          upvotes?: number
          user_id: string
        }
        Update: {
          business_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_accepted?: boolean
          question_id?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_answers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "forum_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      forum_questions: {
        Row: {
          accepted_answer_id: string | null
          answer_count: number
          category_id: string | null
          content: string
          created_at: string
          id: string
          is_featured: boolean
          is_pinned: boolean
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          upvotes: number
          user_id: string
          views: number
        }
        Insert: {
          accepted_answer_id?: string | null
          answer_count?: number
          category_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          upvotes?: number
          user_id: string
          views?: number
        }
        Update: {
          accepted_answer_id?: string | null
          answer_count?: number
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_featured?: boolean
          is_pinned?: boolean
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          upvotes?: number
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_votes: {
        Row: {
          answer_id: string | null
          created_at: string
          id: string
          question_id: string | null
          user_id: string
          vote_type: number
        }
        Insert: {
          answer_id?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          user_id: string
          vote_type: number
        }
        Update: {
          answer_id?: string | null
          created_at?: string
          id?: string
          question_id?: string | null
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "forum_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "forum_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_votes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "forum_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      google_ads_campaigns: {
        Row: {
          audience_ids: string[] | null
          campaign_goal: string
          campaign_type: string
          clicks: number | null
          conversions: number | null
          cost_spent: number | null
          created_at: string
          created_by: string | null
          daily_budget: number
          end_date: string | null
          google_campaign_id: string | null
          id: string
          impressions: number | null
          keywords: string[] | null
          last_synced_at: string | null
          name: string
          negative_keywords: string[] | null
          start_date: string | null
          status: string
          target_devices: string[] | null
          target_languages: string[] | null
          target_locations: string[] | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          audience_ids?: string[] | null
          campaign_goal: string
          campaign_type?: string
          clicks?: number | null
          conversions?: number | null
          cost_spent?: number | null
          created_at?: string
          created_by?: string | null
          daily_budget?: number
          end_date?: string | null
          google_campaign_id?: string | null
          id?: string
          impressions?: number | null
          keywords?: string[] | null
          last_synced_at?: string | null
          name: string
          negative_keywords?: string[] | null
          start_date?: string | null
          status?: string
          target_devices?: string[] | null
          target_languages?: string[] | null
          target_locations?: string[] | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          audience_ids?: string[] | null
          campaign_goal?: string
          campaign_type?: string
          clicks?: number | null
          conversions?: number | null
          cost_spent?: number | null
          created_at?: string
          created_by?: string | null
          daily_budget?: number
          end_date?: string | null
          google_campaign_id?: string | null
          id?: string
          impressions?: number | null
          keywords?: string[] | null
          last_synced_at?: string | null
          name?: string
          negative_keywords?: string[] | null
          start_date?: string | null
          status?: string
          target_devices?: string[] | null
          target_languages?: string[] | null
          target_locations?: string[] | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      google_ads_conversions: {
        Row: {
          conversion_count: number | null
          conversion_name: string
          conversion_type: string
          conversion_value: number | null
          created_at: string
          google_conversion_id: string | null
          id: string
          is_enabled: boolean | null
          last_conversion_at: string | null
          updated_at: string
        }
        Insert: {
          conversion_count?: number | null
          conversion_name: string
          conversion_type: string
          conversion_value?: number | null
          created_at?: string
          google_conversion_id?: string | null
          id?: string
          is_enabled?: boolean | null
          last_conversion_at?: string | null
          updated_at?: string
        }
        Update: {
          conversion_count?: number | null
          conversion_name?: string
          conversion_type?: string
          conversion_value?: number | null
          created_at?: string
          google_conversion_id?: string | null
          id?: string
          is_enabled?: boolean | null
          last_conversion_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      google_ads_creatives: {
        Row: {
          ad_type: string
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cost_spent: number | null
          created_at: string
          descriptions: string[]
          display_url: string | null
          final_url: string
          google_ad_id: string | null
          headlines: string[]
          id: string
          images: string[] | null
          impressions: number | null
          logo_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ad_type?: string
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cost_spent?: number | null
          created_at?: string
          descriptions: string[]
          display_url?: string | null
          final_url: string
          google_ad_id?: string | null
          headlines: string[]
          id?: string
          images?: string[] | null
          impressions?: number | null
          logo_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ad_type?: string
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cost_spent?: number | null
          created_at?: string
          descriptions?: string[]
          display_url?: string | null
          final_url?: string
          google_ad_id?: string | null
          headlines?: string[]
          id?: string
          images?: string[] | null
          impressions?: number | null
          logo_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "google_ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversion_rate: number | null
          conversions: number | null
          cost: number | null
          cpc: number | null
          created_at: string
          ctr: number | null
          date: string
          id: string
          impressions: number | null
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date: string
          id?: string
          impressions?: number | null
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversion_rate?: number | null
          conversions?: number | null
          cost?: number | null
          cpc?: number | null
          created_at?: string
          ctr?: number | null
          date?: string
          id?: string
          impressions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "google_ads_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "google_ads_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      google_ads_settings: {
        Row: {
          access_token: string | null
          account_id: string | null
          account_name: string | null
          billing_profile_name: string | null
          client_id: string | null
          client_secret: string | null
          connection_status: string
          created_at: string
          daily_budget_limit: number | null
          developer_token: string | null
          emergency_stop_active: boolean | null
          id: string
          monthly_budget_cap: number | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          billing_profile_name?: string | null
          client_id?: string | null
          client_secret?: string | null
          connection_status?: string
          created_at?: string
          daily_budget_limit?: number | null
          developer_token?: string | null
          emergency_stop_active?: boolean | null
          id?: string
          monthly_budget_cap?: number | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          account_name?: string | null
          billing_profile_name?: string | null
          client_id?: string | null
          client_secret?: string | null
          connection_status?: string
          created_at?: string
          daily_budget_limit?: number | null
          developer_token?: string | null
          emergency_stop_active?: boolean | null
          id?: string
          monthly_budget_cap?: number | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          date_of_service: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number
          unit_price: number
        }
        Insert: {
          amount: number
          created_at?: string
          date_of_service?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number
          unit_price: number
        }
        Update: {
          amount?: number
          created_at?: string
          date_of_service?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "contractor_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      job_application_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          application_id: string | null
          created_at: string
          id: string
          job_id: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          application_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          application_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "job_application_audit_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_application_audit_log_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applicant_id: string
          business_id: string
          cover_letter: string | null
          created_at: string
          cv_file_name: string | null
          cv_url: string | null
          id: string
          is_read: boolean | null
          job_id: string
          read_at: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          status_notes: string | null
          updated_at: string
        }
        Insert: {
          applicant_id: string
          business_id: string
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_url?: string | null
          id?: string
          is_read?: boolean | null
          job_id: string
          read_at?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          business_id?: string
          cover_letter?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_url?: string | null
          id?: string
          is_read?: boolean | null
          job_id?: string
          read_at?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          status_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_messages: {
        Row: {
          application_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          read_at: string | null
          sender_id: string
          sender_type: string
        }
        Insert: {
          application_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id: string
          sender_type: string
        }
        Update: {
          application_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_seeker_profiles: {
        Row: {
          bio: string | null
          certifications: string[] | null
          cover_letter_default: string | null
          created_at: string
          cv_file_name: string | null
          cv_url: string | null
          email: string
          full_name: string
          id: string
          is_available: boolean | null
          location: string | null
          phone: string | null
          trade_role: string | null
          updated_at: string
          user_id: string
          work_eligibility: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          cover_letter_default?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_url?: string | null
          email: string
          full_name: string
          id?: string
          is_available?: boolean | null
          location?: string | null
          phone?: string | null
          trade_role?: string | null
          updated_at?: string
          user_id: string
          work_eligibility?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          cover_letter_default?: string | null
          created_at?: string
          cv_file_name?: string | null
          cv_url?: string | null
          email?: string
          full_name?: string
          id?: string
          is_available?: boolean | null
          location?: string | null
          phone?: string | null
          trade_role?: string | null
          updated_at?: string
          user_id?: string
          work_eligibility?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          admin_notes: string | null
          application_email: string | null
          application_method: string
          application_url: string | null
          applications_count: number | null
          approved_at: string | null
          approved_by: string | null
          business_id: string
          category: string | null
          clicks: number
          created_at: string
          expires_at: string
          featured_until: string | null
          id: string
          is_featured: boolean
          is_paid_listing: boolean
          is_spotlight: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          location: string
          paid_listing_expires_at: string | null
          rejection_reason: string | null
          requirements: string
          responsibilities: string
          salary_max: number | null
          salary_min: number | null
          salary_type: string | null
          spotlight_until: string | null
          status: Database["public"]["Enums"]["job_status"]
          stripe_payment_id: string | null
          summary: string
          sustainability_relevance: string | null
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          admin_notes?: string | null
          application_email?: string | null
          application_method?: string
          application_url?: string | null
          applications_count?: number | null
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          category?: string | null
          clicks?: number
          created_at?: string
          expires_at: string
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_paid_listing?: boolean
          is_spotlight?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string
          paid_listing_expires_at?: string | null
          rejection_reason?: string | null
          requirements: string
          responsibilities: string
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          spotlight_until?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stripe_payment_id?: string | null
          summary: string
          sustainability_relevance?: string | null
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          admin_notes?: string | null
          application_email?: string | null
          application_method?: string
          application_url?: string | null
          applications_count?: number | null
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          category?: string | null
          clicks?: number
          created_at?: string
          expires_at?: string
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          is_paid_listing?: boolean
          is_spotlight?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string
          paid_listing_expires_at?: string | null
          rejection_reason?: string | null
          requirements?: string
          responsibilities?: string
          salary_max?: number | null
          salary_min?: number | null
          salary_type?: string | null
          spotlight_until?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stripe_payment_id?: string | null
          summary?: string
          sustainability_relevance?: string | null
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          business_id: string
          conversion_notes: string | null
          converted_at: string | null
          created_at: string
          email: string
          id: string
          is_converted: boolean
          is_read: boolean
          message: string
          name: string
          phone: string | null
          status: string
        }
        Insert: {
          business_id: string
          conversion_notes?: string | null
          converted_at?: string | null
          created_at?: string
          email: string
          id?: string
          is_converted?: boolean
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          status?: string
        }
        Update: {
          business_id?: string
          conversion_notes?: string | null
          converted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          is_converted?: boolean
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data: {
        Row: {
          category: string | null
          created_at: string
          data_type: string
          id: string
          is_verified: boolean | null
          metric_name: string
          metric_value: number
          period_end: string | null
          period_start: string | null
          source: string | null
          suburb: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          data_type: string
          id?: string
          is_verified?: boolean | null
          metric_name: string
          metric_value: number
          period_end?: string | null
          period_start?: string | null
          source?: string | null
          suburb?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          data_type?: string
          id?: string
          is_verified?: boolean | null
          metric_name?: string
          metric_value?: number
          period_end?: string | null
          period_start?: string | null
          source?: string | null
          suburb?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_hash: string | null
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_hash?: string | null
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_hash?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          page_path: string
          referrer: string | null
          referrer_category: string | null
          session_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          page_path: string
          referrer?: string | null
          referrer_category?: string | null
          session_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          page_path?: string
          referrer?: string | null
          referrer_category?: string | null
          session_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      partner_payouts: {
        Row: {
          amount: number
          bank_account: string | null
          created_at: string
          id: string
          notes: string | null
          partner_id: string | null
          payout_method: string | null
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          status: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          payout_method?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_referrals: {
        Row: {
          admin_notes: string | null
          converted_business_id: string | null
          created_at: string
          id: string
          paid_at: string | null
          paid_by: string | null
          referral_code: string | null
          referral_plan: Database["public"]["Enums"]["referral_plan"]
          referred_company_email: string
          referred_company_name: string
          referrer_email: string
          referrer_name: string
          referrer_phone: string | null
          referrer_user_id: string | null
          reward_amount: number
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          converted_business_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          referral_code?: string | null
          referral_plan: Database["public"]["Enums"]["referral_plan"]
          referred_company_email: string
          referred_company_name: string
          referrer_email: string
          referrer_name: string
          referrer_phone?: string | null
          referrer_user_id?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          converted_business_id?: string | null
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          referral_code?: string | null
          referral_plan?: Database["public"]["Enums"]["referral_plan"]
          referred_company_email?: string
          referred_company_name?: string
          referrer_email?: string
          referrer_name?: string
          referrer_phone?: string | null
          referrer_user_id?: string | null
          reward_amount?: number
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_referrals_converted_business_id_fkey"
            columns: ["converted_business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          commission_rate: number | null
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          notes: string | null
          paid_earnings: number | null
          partner_type: string
          pending_earnings: number | null
          phone: string | null
          referral_code: string | null
          status: string | null
          successful_referrals: number | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          paid_earnings?: number | null
          partner_type: string
          pending_earnings?: number | null
          phone?: string | null
          referral_code?: string | null
          status?: string | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          commission_rate?: number | null
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
          paid_earnings?: number | null
          partner_type?: string
          pending_earnings?: number | null
          phone?: string | null
          referral_code?: string | null
          status?: string | null
          successful_referrals?: number | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      permission_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      plan_change_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          field_changed: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          notes: string | null
          old_value: Json | null
          plan_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          field_changed?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          plan_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          notes?: string | null
          old_value?: Json | null
          plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_change_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      points_history: {
        Row: {
          action_type: string
          created_at: string
          description: string | null
          id: string
          points: number
          reference_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          reference_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portal_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          invoice_id: string | null
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
          portal_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
          portal_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
          portal_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_audit_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "contractor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_audit_log_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          expiry_date: string | null
          file_path: string
          file_size: number | null
          id: string
          is_verified: boolean | null
          mime_type: string | null
          notes: string | null
          portal_user_id: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          expiry_date?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          notes?: string | null
          portal_user_id: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_verified?: boolean | null
          mime_type?: string | null
          notes?: string | null
          portal_user_id?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_documents_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          portal_user_id: string | null
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          portal_user_id?: string | null
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          portal_user_id?: string | null
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_invitations_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_payment_records: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          gross_pay: number | null
          gst_amount: number | null
          id: string
          invoice_id: string | null
          is_payslip: boolean | null
          kiwisaver_employee: number | null
          kiwisaver_employer: number | null
          net_amount: number
          other_deductions: number | null
          paye_deducted: number | null
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          portal_user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          gross_pay?: number | null
          gst_amount?: number | null
          id?: string
          invoice_id?: string | null
          is_payslip?: boolean | null
          kiwisaver_employee?: number | null
          kiwisaver_employer?: number | null
          net_amount: number
          other_deductions?: number | null
          paye_deducted?: number | null
          payment_date: string
          payment_method?: string | null
          payment_reference?: string | null
          portal_user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          gross_pay?: number | null
          gst_amount?: number | null
          id?: string
          invoice_id?: string | null
          is_payslip?: boolean | null
          kiwisaver_employee?: number | null
          kiwisaver_employer?: number | null
          net_amount?: number
          other_deductions?: number | null
          paye_deducted?: number | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          portal_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_payment_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "contractor_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_payment_records_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_users: {
        Row: {
          agreement_signed_at: string | null
          availability_status: string | null
          bank_account_number: string | null
          bio: string | null
          contractor_agreement_accepted: boolean | null
          contractor_agreement_accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          employment_type: string | null
          gst_number: string | null
          gst_registered: boolean | null
          hourly_rate: number | null
          id: string
          ird_number: string | null
          job_title: string | null
          kiwisaver_rate: number | null
          last_active_at: string | null
          legal_full_name: string | null
          notes: string | null
          onboarding_completed_at: string | null
          paye_tax_code: string | null
          phone_number: string | null
          photo_status: string | null
          privacy_accepted: boolean | null
          privacy_accepted_at: string | null
          profile_completed: boolean | null
          profile_completed_at: string | null
          profile_completion_score: number | null
          profile_photo_hd_url: string | null
          profile_photo_url: string | null
          qualifications: string[] | null
          role: string
          start_date: string | null
          status: string
          terms_accepted: boolean | null
          terms_accepted_at: string | null
          trading_name: string | null
          two_factor_enabled: boolean | null
          updated_at: string
          user_id: string | null
          verification_status: string | null
        }
        Insert: {
          agreement_signed_at?: string | null
          availability_status?: string | null
          bank_account_number?: string | null
          bio?: string | null
          contractor_agreement_accepted?: boolean | null
          contractor_agreement_accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          employment_type?: string | null
          gst_number?: string | null
          gst_registered?: boolean | null
          hourly_rate?: number | null
          id?: string
          ird_number?: string | null
          job_title?: string | null
          kiwisaver_rate?: number | null
          last_active_at?: string | null
          legal_full_name?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          paye_tax_code?: string | null
          phone_number?: string | null
          photo_status?: string | null
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
          profile_completion_score?: number | null
          profile_photo_hd_url?: string | null
          profile_photo_url?: string | null
          qualifications?: string[] | null
          role: string
          start_date?: string | null
          status?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          trading_name?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string | null
          verification_status?: string | null
        }
        Update: {
          agreement_signed_at?: string | null
          availability_status?: string | null
          bank_account_number?: string | null
          bio?: string | null
          contractor_agreement_accepted?: boolean | null
          contractor_agreement_accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          employment_type?: string | null
          gst_number?: string | null
          gst_registered?: boolean | null
          hourly_rate?: number | null
          id?: string
          ird_number?: string | null
          job_title?: string | null
          kiwisaver_rate?: number | null
          last_active_at?: string | null
          legal_full_name?: string | null
          notes?: string | null
          onboarding_completed_at?: string | null
          paye_tax_code?: string | null
          phone_number?: string | null
          photo_status?: string | null
          privacy_accepted?: boolean | null
          privacy_accepted_at?: string | null
          profile_completed?: boolean | null
          profile_completed_at?: string | null
          profile_completion_score?: number | null
          profile_photo_hd_url?: string | null
          profile_photo_url?: string | null
          qualifications?: string[] | null
          role?: string
          start_date?: string | null
          status?: string
          terms_accepted?: boolean | null
          terms_accepted_at?: string | null
          trading_name?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string
          user_id?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_bookings: {
        Row: {
          accepted_at: string | null
          admin_notes: string | null
          business_id: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          decline_reason: string | null
          declined_at: string | null
          estimated_budget: string | null
          id: string
          preferred_start_date: string | null
          project_description: string
          project_type: string
          property_address: string | null
          property_type: string | null
          quoted_amount: number | null
          quoted_at: string | null
          status: string | null
          tracking_code: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          accepted_at?: string | null
          admin_notes?: string | null
          business_id: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          estimated_budget?: string | null
          id?: string
          preferred_start_date?: string | null
          project_description: string
          project_type: string
          property_address?: string | null
          property_type?: string | null
          quoted_amount?: number | null
          quoted_at?: string | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          accepted_at?: string | null
          admin_notes?: string | null
          business_id?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          estimated_budget?: string | null
          id?: string
          preferred_start_date?: string | null
          project_description?: string
          project_type?: string
          property_address?: string | null
          property_type?: string | null
          quoted_amount?: number | null
          quoted_at?: string | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      project_estimates: {
        Row: {
          budget_range: string | null
          created_at: string
          estimated_cost_high: number | null
          estimated_cost_low: number | null
          id: string
          ip_hash: string | null
          location: string | null
          matched_businesses: string[] | null
          project_size: string | null
          project_type: string
          requirements: Json | null
          session_id: string | null
          status: string
          timeline: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          budget_range?: string | null
          created_at?: string
          estimated_cost_high?: number | null
          estimated_cost_low?: number | null
          id?: string
          ip_hash?: string | null
          location?: string | null
          matched_businesses?: string[] | null
          project_size?: string | null
          project_type: string
          requirements?: Json | null
          session_id?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          budget_range?: string | null
          created_at?: string
          estimated_cost_high?: number | null
          estimated_cost_low?: number | null
          id?: string
          ip_hash?: string | null
          location?: string | null
          matched_businesses?: string[] | null
          project_size?: string | null
          project_type?: string
          requirements?: Json | null
          session_id?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      project_milestones: {
        Row: {
          booking_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_date: string | null
          id: string
          milestone_name: string
          notes: string | null
          sort_order: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_date?: string | null
          id?: string
          milestone_name: string
          notes?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_date?: string | null
          id?: string
          milestone_name?: string
          notes?: string | null
          sort_order?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "project_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      project_showcases: {
        Row: {
          after_images: string[] | null
          before_images: string[] | null
          budget_range: string | null
          business_id: string | null
          challenges: string | null
          client_name: string | null
          client_testimonial: string | null
          completion_date: string | null
          created_at: string
          description: string | null
          duration: string | null
          gallery_images: string[] | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          materials_used: string[] | null
          project_type: string | null
          slug: string
          solutions: string | null
          status: string | null
          suburb: string | null
          sustainability_features: string[] | null
          tags: string[] | null
          title: string
          updated_at: string
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          after_images?: string[] | null
          before_images?: string[] | null
          budget_range?: string | null
          business_id?: string | null
          challenges?: string | null
          client_name?: string | null
          client_testimonial?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          gallery_images?: string[] | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          materials_used?: string[] | null
          project_type?: string | null
          slug: string
          solutions?: string | null
          status?: string | null
          suburb?: string | null
          sustainability_features?: string[] | null
          tags?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          after_images?: string[] | null
          before_images?: string[] | null
          budget_range?: string | null
          business_id?: string | null
          challenges?: string | null
          client_name?: string | null
          client_testimonial?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          gallery_images?: string[] | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          materials_used?: string[] | null
          project_type?: string | null
          slug?: string
          solutions?: string | null
          status?: string | null
          suburb?: string | null
          sustainability_features?: string[] | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_showcases_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          booking_id: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_public: boolean | null
          title: string
          update_type: string
        }
        Insert: {
          booking_id: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          update_type: string
        }
        Update: {
          booking_id?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "project_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      realtime_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_pushed: boolean | null
          is_read: boolean | null
          message: string
          metadata: Json | null
          priority: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pushed?: boolean | null
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          priority?: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_pushed?: boolean | null
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          priority?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      report_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          execution_type: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          report_id: string
          row_count: number | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          execution_type?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          report_id: string
          row_count?: number | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          execution_type?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          report_id?: string
          row_count?: number | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_executions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "custom_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          created_by: string | null
          description: string | null
          download_count: number | null
          featured_image: string | null
          file_url: string | null
          id: string
          is_featured: boolean | null
          is_premium: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          resource_type: string
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          featured_image?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          resource_type: string
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          download_count?: number | null
          featured_image?: string | null
          file_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_premium?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          resource_type?: string
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      revenue_transactions: {
        Row: {
          amount_nzd: number
          business_email: string | null
          business_id: string | null
          business_name: string
          created_at: string
          gst_amount: number | null
          id: string
          is_manual: boolean
          manual_notes: string | null
          metadata: Json | null
          payment_status: string
          payment_type: string
          recorded_by: string | null
          stripe_customer_id: string | null
          stripe_invoice_id: string | null
          subscription_tier: string | null
          transaction_id: string
        }
        Insert: {
          amount_nzd: number
          business_email?: string | null
          business_id?: string | null
          business_name: string
          created_at?: string
          gst_amount?: number | null
          id?: string
          is_manual?: boolean
          manual_notes?: string | null
          metadata?: Json | null
          payment_status?: string
          payment_type: string
          recorded_by?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          subscription_tier?: string | null
          transaction_id: string
        }
        Update: {
          amount_nzd?: number
          business_email?: string | null
          business_id?: string | null
          business_name?: string
          created_at?: string
          gst_amount?: number | null
          id?: string
          is_manual?: boolean
          manual_notes?: string | null
          metadata?: Json | null
          payment_status?: string
          payment_type?: string
          recorded_by?: string | null
          stripe_customer_id?: string | null
          stripe_invoice_id?: string | null
          subscription_tier?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      review_rate_limits: {
        Row: {
          business_id: string | null
          created_at: string
          email: string | null
          id: string
          ip_address: string | null
          submitted_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          submitted_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_address?: string | null
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_rate_limits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_notes: string | null
          business_id: string
          business_response: string | null
          created_at: string
          flag_reason: string | null
          flagged_at: string | null
          guest_email: string | null
          guest_initial: string | null
          guest_name: string | null
          id: string
          is_flagged: boolean | null
          is_verified_client: boolean | null
          project_type: string | null
          proof_document_name: string | null
          proof_document_url: string | null
          rating: number
          response_at: string | null
          response_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_ip: string | null
          status: string
          submission_ip_hash: string | null
          text: string | null
          updated_at: string
          user_id: string | null
          verification_processed_at: string | null
          verification_processed_by: string | null
          verification_requested_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          business_id: string
          business_response?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged_at?: string | null
          guest_email?: string | null
          guest_initial?: string | null
          guest_name?: string | null
          id?: string
          is_flagged?: boolean | null
          is_verified_client?: boolean | null
          project_type?: string | null
          proof_document_name?: string | null
          proof_document_url?: string | null
          rating: number
          response_at?: string | null
          response_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_ip?: string | null
          status?: string
          submission_ip_hash?: string | null
          text?: string | null
          updated_at?: string
          user_id?: string | null
          verification_processed_at?: string | null
          verification_processed_by?: string | null
          verification_requested_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          business_id?: string
          business_response?: string | null
          created_at?: string
          flag_reason?: string | null
          flagged_at?: string | null
          guest_email?: string | null
          guest_initial?: string | null
          guest_name?: string | null
          id?: string
          is_flagged?: boolean | null
          is_verified_client?: boolean | null
          project_type?: string | null
          proof_document_name?: string | null
          proof_document_url?: string | null
          rating?: number
          response_at?: string | null
          response_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_ip?: string | null
          status?: string
          submission_ip_hash?: string | null
          text?: string | null
          updated_at?: string
          user_id?: string | null
          verification_processed_at?: string | null
          verification_processed_by?: string | null
          verification_requested_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_sources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          fetch_count: number
          id: string
          is_active: boolean
          last_fetched_at: string | null
          name: string
          source_type: string | null
          updated_at: string
          url: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          fetch_count?: number
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          name: string
          source_type?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          fetch_count?: number
          id?: string
          is_active?: boolean
          last_fetched_at?: string | null
          name?: string
          source_type?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      saved_businesses: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filter_presets: {
        Row: {
          created_at: string
          entity_type: string
          filters: Json
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_type: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_type?: string
          filters?: Json
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_active: boolean | null
          last_notified_at: string | null
          name: string
          notify_email: boolean | null
          notify_frequency: string | null
          search_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          name: string
          notify_email?: boolean | null
          notify_frequency?: string | null
          search_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          name?: string
          notify_email?: boolean | null
          notify_frequency?: string | null
          search_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address_hash: string | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address_hash?: string | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address_hash?: string | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_activity: {
        Row: {
          activity_type: string
          city: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
        }
        Insert: {
          activity_type: string
          city?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
        }
        Update: {
          activity_type?: string
          city?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      staff_id_cards: {
        Row: {
          card_number: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          issued_at: string | null
          portal_user_id: string
          qr_code_data: string | null
        }
        Insert: {
          card_number: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          issued_at?: string | null
          portal_user_id: string
          qr_code_data?: string | null
        }
        Update: {
          card_number?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          issued_at?: string | null
          portal_user_id?: string
          qr_code_data?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_id_cards_portal_user_id_fkey"
            columns: ["portal_user_id"]
            isOneToOne: false
            referencedRelation: "portal_users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          badge_color: string | null
          badge_text: string | null
          created_at: string
          created_by: string | null
          cta_text: string
          description: string | null
          feature_toggles: Json
          features: Json
          gst_included: boolean
          icon: string | null
          id: string
          is_popular: boolean
          max_subscribers: number | null
          name: string
          plan_key: string
          price_annual: number | null
          price_monthly: number
          scarcity_count: number | null
          scarcity_label: string | null
          sort_order: number
          status: Database["public"]["Enums"]["plan_status"]
          stripe_price_id: string | null
          stripe_price_id_annual: string | null
          stripe_product_id: string | null
          stripe_product_id_annual: string | null
          updated_at: string
          updated_by: string | null
          visibility_rules: Json
        }
        Insert: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string
          created_by?: string | null
          cta_text?: string
          description?: string | null
          feature_toggles?: Json
          features?: Json
          gst_included?: boolean
          icon?: string | null
          id?: string
          is_popular?: boolean
          max_subscribers?: number | null
          name: string
          plan_key: string
          price_annual?: number | null
          price_monthly?: number
          scarcity_count?: number | null
          scarcity_label?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_price_id?: string | null
          stripe_price_id_annual?: string | null
          stripe_product_id?: string | null
          stripe_product_id_annual?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility_rules?: Json
        }
        Update: {
          badge_color?: string | null
          badge_text?: string | null
          created_at?: string
          created_by?: string | null
          cta_text?: string
          description?: string | null
          feature_toggles?: Json
          features?: Json
          gst_included?: boolean
          icon?: string | null
          id?: string
          is_popular?: boolean
          max_subscribers?: number | null
          name?: string
          plan_key?: string
          price_annual?: number | null
          price_monthly?: number
          scarcity_count?: number | null
          scarcity_label?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_price_id?: string | null
          stripe_price_id_annual?: string | null
          stripe_product_id?: string | null
          stripe_product_id_annual?: string | null
          updated_at?: string
          updated_by?: string | null
          visibility_rules?: Json
        }
        Relationships: []
      }
      url_validation_cache: {
        Row: {
          error_message: string | null
          expires_at: string
          id: string
          is_valid: boolean
          status_code: number | null
          url: string
          validated_at: string
        }
        Insert: {
          error_message?: string | null
          expires_at?: string
          id?: string
          is_valid: boolean
          status_code?: number | null
          url: string
          validated_at?: string
        }
        Update: {
          error_message?: string | null
          expires_at?: string
          id?: string
          is_valid?: boolean
          status_code?: number | null
          url?: string
          validated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_certifications: {
        Row: {
          created_at: string
          credential_id: string | null
          credential_url: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          is_primary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_education: {
        Row: {
          created_at: string
          degree: string
          description: string | null
          end_date: string | null
          field_of_study: string | null
          id: string
          institution: string
          is_current: boolean
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution: string
          is_current?: boolean
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string
          description?: string | null
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string
          is_current?: boolean
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          custom_permissions: Json | null
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean | null
          permission_template_id: string | null
          user_id: string
        }
        Insert: {
          custom_permissions?: Json | null
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_template_id?: string | null
          user_id: string
        }
        Update: {
          custom_permissions?: Json | null
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          permission_template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_template_id_fkey"
            columns: ["permission_template_id"]
            isOneToOne: false
            referencedRelation: "permission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string
          id: string
          last_activity_date: string | null
          level: number
          streak_days: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number
          streak_days?: number
          total_points?: number
          updated_at?: string
          user_id?: string
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
      user_skills: {
        Row: {
          created_at: string
          id: string
          proficiency_level: string | null
          skill_name: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_name: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          proficiency_level?: string | null
          skill_name?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      user_work_history: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          job_title: string
          location: string | null
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title: string
          location?: string | null
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          job_title?: string
          location?: string | null
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_audit_log: {
        Row: {
          action: string
          action_by: string | null
          action_by_email: string | null
          action_by_role: string | null
          business_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_status: string | null
          notes: string | null
          previous_status: string | null
          submission_id: string | null
          verification_id: string | null
        }
        Insert: {
          action: string
          action_by?: string | null
          action_by_email?: string | null
          action_by_role?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          submission_id?: string | null
          verification_id?: string | null
        }
        Update: {
          action?: string
          action_by?: string | null
          action_by_email?: string | null
          action_by_role?: string | null
          business_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          submission_id?: string | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_audit_log_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "verification_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requirements: {
        Row: {
          business_category: string
          created_at: string | null
          description: string | null
          document_type: string
          id: string
          is_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_category: string
          created_at?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_category?: string
          created_at?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      verification_submissions: {
        Row: {
          admin_notes: string | null
          business_email: string | null
          business_id: string | null
          business_phone: string | null
          business_type: string | null
          certificate_name: string | null
          company_name: string | null
          contact_person: string | null
          created_at: string
          document_category: string | null
          document_description: string | null
          document_name: string
          document_type: string
          expiry_date: string | null
          expiry_reminder_sent_at: string | null
          file_format: string | null
          file_name: string
          file_size: number | null
          file_url: string
          flagged_at: string | null
          flagged_by: string | null
          flagged_for_review: boolean | null
          flagged_reason: string | null
          id: string
          internal_notes: string | null
          ip_address: string | null
          is_required: boolean | null
          previous_version_id: string | null
          qualification_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suspension_reason: string | null
          updated_at: string
          upload_timezone: string | null
          uploaded_at: string
          user_agent: string | null
          user_id: string
          verification_id: string | null
          version_number: number | null
        }
        Insert: {
          admin_notes?: string | null
          business_email?: string | null
          business_id?: string | null
          business_phone?: string | null
          business_type?: string | null
          certificate_name?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          document_category?: string | null
          document_description?: string | null
          document_name: string
          document_type: string
          expiry_date?: string | null
          expiry_reminder_sent_at?: string | null
          file_format?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_for_review?: boolean | null
          flagged_reason?: string | null
          id?: string
          internal_notes?: string | null
          ip_address?: string | null
          is_required?: boolean | null
          previous_version_id?: string | null
          qualification_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspension_reason?: string | null
          updated_at?: string
          upload_timezone?: string | null
          uploaded_at?: string
          user_agent?: string | null
          user_id: string
          verification_id?: string | null
          version_number?: number | null
        }
        Update: {
          admin_notes?: string | null
          business_email?: string | null
          business_id?: string | null
          business_phone?: string | null
          business_type?: string | null
          certificate_name?: string | null
          company_name?: string | null
          contact_person?: string | null
          created_at?: string
          document_category?: string | null
          document_description?: string | null
          document_name?: string
          document_type?: string
          expiry_date?: string | null
          expiry_reminder_sent_at?: string | null
          file_format?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_for_review?: boolean | null
          flagged_reason?: string | null
          id?: string
          internal_notes?: string | null
          ip_address?: string | null
          is_required?: boolean | null
          previous_version_id?: string | null
          qualification_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suspension_reason?: string | null
          updated_at?: string
          upload_timezone?: string | null
          uploaded_at?: string
          user_agent?: string | null
          user_id?: string
          verification_id?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_submissions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_submissions_previous_version_id_fkey"
            columns: ["previous_version_id"]
            isOneToOne: false
            referencedRelation: "verification_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      wellington_suburbs: {
        Row: {
          created_at: string
          description: string | null
          featured_image: string | null
          growth_rate: number | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          median_house_price: number | null
          name: string
          population: number | null
          region: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured_image?: string | null
          growth_rate?: number | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          median_house_price?: number | null
          name: string
          population?: number | null
          region?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured_image?: string | null
          growth_rate?: number | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          median_house_price?: number | null
          name?: string
          population?: number | null
          region?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_limited: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews_public: {
        Row: {
          business_id: string | null
          business_response: string | null
          created_at: string | null
          guest_initial: string | null
          guest_name: string | null
          id: string | null
          is_registered_user: boolean | null
          is_verified_client: boolean | null
          project_type: string | null
          rating: number | null
          response_at: string | null
          text: string | null
        }
        Insert: {
          business_id?: string | null
          business_response?: string | null
          created_at?: string | null
          guest_initial?: string | null
          guest_name?: string | null
          id?: string | null
          is_registered_user?: never
          is_verified_client?: boolean | null
          project_type?: string | null
          rating?: number | null
          response_at?: string | null
          text?: string | null
        }
        Update: {
          business_id?: string | null
          business_response?: string | null
          created_at?: string | null
          guest_initial?: string | null
          guest_name?: string | null
          id?: string | null
          is_registered_user?: never
          is_verified_client?: boolean | null
          project_type?: string | null
          rating?: number | null
          response_at?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      aggregate_blog_analytics: { Args: never; Returns: undefined }
      business_has_valid_credentials: {
        Args: { business_id: string }
        Returns: boolean
      }
      calculate_profile_completion: {
        Args: { p_portal_user_id: string }
        Returns: number
      }
      calculate_waitlist_priority: {
        Args: {
          p_activity_score: number
          p_average_rating: number
          p_is_verified: boolean
          p_months_on_platform: number
          p_review_count: number
        }
        Returns: number
      }
      check_contact_submission_limit: {
        Args: { p_ip_hash: string }
        Returns: boolean
      }
      generate_email_message_id: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_staff_card_number: { Args: never; Returns: string }
      generate_verification_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_article_views: {
        Args: { article_id: string }
        Returns: undefined
      }
      is_elite_available: { Args: { p_category: string }; Returns: boolean }
      log_activity: {
        Args: {
          p_action: string
          p_action_category: string
          p_description: string
          p_entity_id?: string
          p_entity_name?: string
          p_entity_type?: string
          p_metadata?: Json
          p_severity?: string
        }
        Returns: string
      }
      log_communication_action: {
        Args: {
          p_action: string
          p_actor_email: string
          p_actor_id: string
          p_actor_role: string
          p_attachment_id: string
          p_details: Json
          p_message_id: string
          p_new_value: Json
          p_old_value: Json
          p_thread_id: string
        }
        Returns: string
      }
      log_data_access: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
      mask_email: { Args: { email: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "business_owner"
        | "user"
        | "writer"
        | "editor"
        | "journalist"
      blog_category:
        | "wellington_construction_news"
        | "sustainable_building"
        | "supplier_updates"
        | "projects_developments"
        | "renovation_retrofit"
        | "regulations_compliance"
        | "market_trends"
        | "eco_building_education"
        | "construction_opportunities"
        | "finance_construction"
      business_category:
        | "eco-builders"
        | "suppliers"
        | "architects"
        | "renovation"
      job_status: "pending" | "approved" | "rejected" | "expired" | "closed"
      job_type: "full_time" | "part_time" | "contract"
      plan_status: "active" | "hidden" | "archived" | "paused"
      referral_plan: "premium" | "elite"
      referral_status: "pending" | "approved" | "paid" | "rejected"
      subscription_plan: "free" | "premium" | "elite"
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
      app_role: [
        "admin",
        "business_owner",
        "user",
        "writer",
        "editor",
        "journalist",
      ],
      blog_category: [
        "wellington_construction_news",
        "sustainable_building",
        "supplier_updates",
        "projects_developments",
        "renovation_retrofit",
        "regulations_compliance",
        "market_trends",
        "eco_building_education",
        "construction_opportunities",
        "finance_construction",
      ],
      business_category: [
        "eco-builders",
        "suppliers",
        "architects",
        "renovation",
      ],
      job_status: ["pending", "approved", "rejected", "expired", "closed"],
      job_type: ["full_time", "part_time", "contract"],
      plan_status: ["active", "hidden", "archived", "paused"],
      referral_plan: ["premium", "elite"],
      referral_status: ["pending", "approved", "paid", "rejected"],
      subscription_plan: ["free", "premium", "elite"],
    },
  },
} as const
