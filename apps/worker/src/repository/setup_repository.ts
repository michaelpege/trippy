/**
 * Setup Repository
 *
 * Handles system initialization and first owner registration.
 * ONLY accessible when system is not yet initialized.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { SetupStatus } from '../types';

export class SetupRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if the system has already been initialized
   */
  async getStatus(): Promise<SetupStatus> {
    try {
      const { data, error } = await this.supabase
        .from('system_settings')
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
   * Initialize database and register first Gmail as owner
   */
  async initializeOwner(ownerEmail: string): Promise<SetupStatus> {
    const normalizedEmail = ownerEmail.toLowerCase().trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      throw new Error('Valid Gmail/email address required');
    }

    // Safety check: verify database is not already initialized
    const status = await this.getStatus();
    if (status.isInitialized) {
      throw new Error('System is already initialized. The setup endpoint is permanently locked.');
    }

    // 1. Ensure default Admin role exists
    const adminRoleId = 'role_admin';
    await this.supabase.from('roles').upsert({
      id: adminRoleId,
      name: 'Administrator',
      description: 'System Administrator with full permissions',
      permissions: ['*'],
    });

    // 2. Assign the owner email to Administrator role
    await this.supabase.from('role_members').upsert(
      {
        id: `rm_owner_${Date.now().toString(36)}`,
        role_id: adminRoleId,
        email: normalizedEmail,
      },
      { onConflict: 'role_id,email' }
    );

    // 3. Mark setup as initialized in system_settings
    const now = new Date().toISOString();
    const { error: settingsError } = await this.supabase
      .from('system_settings')
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
