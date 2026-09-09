/**
 * Hand-authored Supabase-CLI-format generated types.
 *
 * This project's sandbox has no network access to the Supabase Management
 * API, so `supabase gen types typescript --project-id ...` cannot run here.
 * This file is written by hand to match `supabase/migrations/*.sql`
 * exactly (schema as of 20260908150800_create_company_command.sql) in
 * the same shape the real CLI would produce, so it is a drop-in
 * replacement once Management API access exists — regenerate with:
 *
 *   pnpm exec supabase gen types typescript --project-id trrebatalezmucwpovcw > packages/db/src/generated/database.types.ts
 *
 * Do not hand-edit table shapes without updating the migration that owns
 * them first — this file must always describe the real schema, never a
 * desired one.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      capabilities: {
        Row: {
          code: string;
          description: string;
        };
        Insert: {
          code: string;
          description: string;
        };
        Update: {
          code?: string;
          description?: string;
        };
        Relationships: [];
      };
      role_capabilities: {
        Row: {
          role: Database["public"]["Enums"]["member_role"];
          capability: string;
        };
        Insert: {
          role: Database["public"]["Enums"]["member_role"];
          capability: string;
        };
        Update: {
          role?: Database["public"]["Enums"]["member_role"];
          capability?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_fkey";
            columns: ["capability"];
            isOneToOne: false;
            referencedRelation: "capabilities";
            referencedColumns: ["code"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: Database["public"]["Enums"]["member_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          id: string;
          organization_id: string;
          legal_name: string;
          operating_name: string | null;
          incorporation_statute: Database["public"]["Enums"]["incorporation_statute"];
          incorporation_statute_other: string | null;
          corporation_number: string | null;
          incorporation_date: string | null;
          registered_address: Json | null;
          head_office_address: Json | null;
          default_currency: string;
          has_shareholder_agreement: boolean;
          has_unanimous_shareholder_agreement: boolean;
          has_investor_rights_agreement: boolean;
          has_debt_covenant: boolean;
          has_reserved_matters: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          legal_name: string;
          operating_name?: string | null;
          incorporation_statute?: Database["public"]["Enums"]["incorporation_statute"];
          incorporation_statute_other?: string | null;
          corporation_number?: string | null;
          incorporation_date?: string | null;
          registered_address?: Json | null;
          head_office_address?: Json | null;
          default_currency?: string;
          has_shareholder_agreement?: boolean;
          has_unanimous_shareholder_agreement?: boolean;
          has_investor_rights_agreement?: boolean;
          has_debt_covenant?: boolean;
          has_reserved_matters?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          legal_name?: string;
          operating_name?: string | null;
          incorporation_statute?: Database["public"]["Enums"]["incorporation_statute"];
          incorporation_statute_other?: string | null;
          corporation_number?: string | null;
          incorporation_date?: string | null;
          registered_address?: Json | null;
          head_office_address?: Json | null;
          default_currency?: string;
          has_shareholder_agreement?: boolean;
          has_unanimous_shareholder_agreement?: boolean;
          has_investor_rights_agreement?: boolean;
          has_debt_covenant?: boolean;
          has_reserved_matters?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      scenarios: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenarios_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      scenario_versions: {
        Row: {
          id: string;
          scenario_id: string;
          version_number: number;
          input: Json;
          input_schema_version: number;
          input_hash: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scenario_id: string;
          version_number: number;
          input: Json;
          input_schema_version: number;
          input_hash: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          scenario_id?: string;
          version_number?: number;
          input?: Json;
          input_schema_version?: number;
          input_hash?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenario_versions_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
        ];
      };
      scenario_runs: {
        Row: {
          id: string;
          scenario_id: string;
          scenario_version_id: string;
          engine_version: string;
          status: string;
          output: Json | null;
          output_hash: string | null;
          error_code: string | null;
          error_message: string | null;
          requested_by: string | null;
          started_at: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          scenario_id: string;
          scenario_version_id: string;
          engine_version: string;
          status: string;
          output?: Json | null;
          output_hash?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          requested_by?: string | null;
          started_at?: string;
          completed_at?: string;
        };
        Update: {
          id?: string;
          scenario_id?: string;
          scenario_version_id?: string;
          engine_version?: string;
          status?: string;
          output?: Json | null;
          output_hash?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          requested_by?: string | null;
          started_at?: string;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenario_runs_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenario_runs_scenario_version_id_fkey";
            columns: ["scenario_version_id"];
            isOneToOne: false;
            referencedRelation: "scenario_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      scenario_snapshots: {
        Row: {
          id: string;
          scenario_id: string;
          scenario_version_id: string;
          scenario_run_id: string;
          input: Json;
          output: Json;
          assumptions: Json;
          engine_version: string;
          input_schema_version: number;
          input_hash: string;
          output_hash: string;
          frozen_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          scenario_id: string;
          scenario_version_id: string;
          scenario_run_id: string;
          input: Json;
          output: Json;
          assumptions?: Json;
          engine_version: string;
          input_schema_version: number;
          input_hash: string;
          output_hash: string;
          frozen_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          scenario_id?: string;
          scenario_version_id?: string;
          scenario_run_id?: string;
          input?: Json;
          output?: Json;
          assumptions?: Json;
          engine_version?: string;
          input_schema_version?: number;
          input_hash?: string;
          output_hash?: string;
          frozen_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenario_snapshots_scenario_id_fkey";
            columns: ["scenario_id"];
            isOneToOne: false;
            referencedRelation: "scenarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenario_snapshots_scenario_version_id_fkey";
            columns: ["scenario_version_id"];
            isOneToOne: false;
            referencedRelation: "scenario_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scenario_snapshots_scenario_run_id_fkey";
            columns: ["scenario_run_id"];
            isOneToOne: false;
            referencedRelation: "scenario_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      snapshot_share_links: {
        Row: {
          id: string;
          scenario_snapshot_id: string;
          token_hash: string;
          created_by: string | null;
          created_at: string;
          expires_at: string | null;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: {
          id?: string;
          scenario_snapshot_id: string;
          token_hash: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Update: {
          id?: string;
          scenario_snapshot_id?: string;
          token_hash?: string;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          revoked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "snapshot_share_links_scenario_snapshot_id_fkey";
            columns: ["scenario_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "scenario_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      snapshot_access_events: {
        Row: {
          id: string;
          snapshot_share_link_id: string;
          accessed_at: string;
        };
        Insert: {
          id?: string;
          snapshot_share_link_id: string;
          accessed_at?: string;
        };
        Update: {
          id?: string;
          snapshot_share_link_id?: string;
          accessed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "snapshot_access_events_snapshot_share_link_id_fkey";
            columns: ["snapshot_share_link_id"];
            isOneToOne: false;
            referencedRelation: "snapshot_share_links";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          id: string;
          organization_id: string;
          /** Assigned by audit_events_assign_and_verify_chain() regardless of what is inserted. */
          sequence: number;
          prev_event_hash: string | null;
          event_hash: string;
          actor_user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          payload: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          /** Ignored: the BEFORE INSERT trigger always assigns the real value. Pass 0. */
          sequence: number;
          prev_event_hash?: string | null;
          event_hash: string;
          actor_user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          payload?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          sequence?: number;
          prev_event_hash?: string | null;
          event_hash?: string;
          actor_user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          payload?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      outbox_events: {
        Row: {
          id: string;
          organization_id: string;
          aggregate_type: string;
          aggregate_id: string;
          event_type: string;
          payload: Json;
          concurrency_key: string | null;
          attempt_count: number;
          last_error: string | null;
          created_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          aggregate_type: string;
          aggregate_id: string;
          event_type: string;
          payload?: Json;
          concurrency_key?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          aggregate_type?: string;
          aggregate_id?: string;
          event_type?: string;
          payload?: Json;
          concurrency_key?: string | null;
          attempt_count?: number;
          last_error?: string | null;
          created_at?: string;
          processed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "outbox_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          id: string;
          organization_id: string;
          idempotency_key: string;
          request_hash: string;
          status: string;
          response: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          idempotency_key: string;
          request_hash: string;
          status?: string;
          response?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          idempotency_key?: string;
          request_hash?: string;
          status?: string;
          response?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      uuidv7: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      create_organization: {
        Args: {
          p_name: string;
          p_slug: string;
        };
        Returns: Database["public"]["Tables"]["organizations"]["Row"];
      };
      create_snapshot_share_link: {
        Args: {
          p_snapshot_id: string;
          p_expires_at?: string | null;
        };
        Returns: {
          id: string;
          raw_token: string;
          expires_at: string | null;
        }[];
      };
      get_snapshot_by_share_token: {
        Args: {
          p_raw_token: string;
        };
        Returns: Database["public"]["Tables"]["scenario_snapshots"]["Row"];
      };
      get_last_audit_event_hash: {
        Args: {
          p_organization_id: string;
        };
        Returns: string | null;
      };
      create_company: {
        Args: {
          p_organization_id: string;
          p_company_id: string;
          p_company: Json;
          p_idempotency_key: string;
          p_request_hash: string;
          p_prev_event_hash: string | null;
          p_event_hash: string;
        };
        Returns: Database["public"]["Tables"]["companies"]["Row"];
      };
    };
    Enums: {
      member_role: "owner" | "admin" | "editor" | "viewer";
      incorporation_statute: "OBCA" | "CBCA" | "OTHER" | "UNKNOWN";
    };
    CompositeTypes: Record<string, never>;
  };
}
