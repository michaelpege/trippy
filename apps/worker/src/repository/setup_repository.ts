/**
 * Setup Repository
 *
 * Handles automated schema migration and first owner registration.
 * ONLY accessible when system is not yet initialized.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TRIPPY_SCHEMA_SQL } from '../schema/schema_sql';
import type { SetupStatus, Env } from '../types';

export class SetupRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if the system has already been initialized
   */
  async getStatus(): Promise<SetupStatus> {
    try {
      const { data, error } = await this.supabase
        .from('trippy_system_settings')
        .select('value')
        .eq('key', 'setup_status')
        .maybeSingle();

      if (error) {
        // Table might not exist yet or empty
        return { isInitialized: false };
      }

      if (!data || !data.value || !data.value.initialized) {
        return { isInitialized: false };
      }

      return {
        isInitialized: true,
        ownerEmail: data.value.owner_email,
        installedAt: data.value.installed_at,
      };
    } catch {
      return { isInitialized: false };
    }
  }

  /**
   * Automatically executes the DDL migration using Supabase Management API
   * if tables are not yet present in the database.
   */
  async runMigration(env: Env): Promise<{ success: boolean; message: string }> {
    // 1. First test if trippy_system_settings already exists
    const { error } = await this.supabase
      .from('trippy_system_settings')
      .select('key')
      .limit(1);

    if (!error) {
      return { success: true, message: 'Trippy database tables already exist.' };
    }

    // 2. Tables do not exist yet. Run automated migration via Supabase Management API
    const projectRef =
      env.SUPABASE_PROJECT_REF ||
      (env.SUPABASE_URL ? new URL(env.SUPABASE_URL).hostname.split('.')[0] : '');

    const accessToken = env.SUPABASE_ACCESS_TOKEN;

    if (!accessToken || !projectRef) {
      throw new Error(
        'Tables do not exist yet. Please provide SUPABASE_ACCESS_TOKEN in your worker secrets ' +
          'to enable 1-click automatic schema migration, or execute supabase/schema.sql in the Supabase editor.'
      );
    }

    // Call Supabase Management API to execute raw DDL
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: TRIPPY_SCHEMA_SQL }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Automated migration failed via Supabase API: ${errText}`);
    }

    return {
      success: true,
      message: 'Trippy schema migration successfully executed into Supabase database.',
    };
  }

  /**
   * Initialize database and register first Gmail as owner
   */
  async initializeOwner(ownerEmail: string, env: Env): Promise<SetupStatus> {
    const normalizedEmail = ownerEmail.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Valid Gmail/email address required');
    }

    // 1. Safety check: verify database is not already initialized
    const status = await this.getStatus();
    if (status.isInitialized) {
      throw new Error('System is already initialized. The setup endpoint is permanently locked.');
    }

    // 2. Automatically run migration if tables don't exist yet
    await this.runMigration(env);

    // 3. Ensure default Admin role exists in trippy_roles
    const adminRoleId = 'role_admin';
    await this.supabase.from('trippy_roles').upsert({
      id: adminRoleId,
      name: 'Administrator',
      description: 'System Administrator with full permissions',
      permissions: ['*'],
    });

    // 4. Assign the owner email to Administrator role in trippy_role_members
    await this.supabase.from('trippy_role_members').upsert(
      {
        id: `rm_owner_${Date.now().toString(36)}`,
        role_id: adminRoleId,
        email: normalizedEmail,
      },
      { onConflict: 'role_id,email' }
    );

    // 5. Mark setup as initialized in trippy_system_settings
    const now = new Date().toISOString();
    const { error: settingsError } = await this.supabase
      .from('trippy_system_settings')
      .upsert({
        key: 'setup_status',
        value: {
          initialized: true,
          owner_email: normalizedEmail,
          installed_at: now,
        },
      });

    if (settingsError) {
      throw new Error(`Failed to save setup status: ${settingsError.message}`);
    }

    return {
      isInitialized: true,
      ownerEmail: normalizedEmail,
      installedAt: now,
    };
  }
}
