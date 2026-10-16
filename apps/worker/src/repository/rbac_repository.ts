/**
 * RBAC Repository
 *
 * Efficient Supabase queries for Roles, Members, and User Permissions.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '../types';

export class RbacRepository {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves the system owner email from system_settings
   */
  async getOwnerEmail(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'setup_status')
      .maybeSingle();

    if (error || !data) return null;
    return data.value?.owner_email?.toLowerCase().trim() || null;
  }

  /**
   * Get effective roles and merged permissions for a user email.
   * If email matches system owner, automatically grants '*' super admin privileges.
   */
  async getUserAccess(email: string): Promise<{
    email: string;
    isOwner: boolean;
    roles: string[];
    permissions: string[];
  }> {
    const normalizedEmail = email.toLowerCase().trim();
    const ownerEmail = await this.getOwnerEmail();
    const isOwner = !!ownerEmail && ownerEmail === normalizedEmail;

    if (isOwner) {
      return {
        email: normalizedEmail,
        isOwner: true,
        roles: ['Owner'],
        permissions: ['*'],
      };
    }

    // Single query joining role_members and roles to retrieve assigned roles & permissions
    const { data, error } = await this.supabase
      .from('role_members')
      .select('role_id, roles(id, name, permissions)')
      .eq('email', normalizedEmail);

    if (error || !data) {
      return {
        email: normalizedEmail,
        isOwner: false,
        roles: [],
        permissions: [],
      };
    }

    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();

    for (const item of data) {
      // Supabase join structure
      const role = Array.isArray(item.roles) ? item.roles[0] : item.roles;
      if (role) {
        rolesSet.add(role.name || role.id);
        const perms: string[] = Array.isArray(role.permissions) ? role.permissions : [];
        for (const p of perms) {
          permissionsSet.add(p);
        }
      }
    }

    return {
      email: normalizedEmail,
      isOwner: false,
      roles: Array.from(rolesSet),
      permissions: Array.from(permissionsSet),
    };
  }

  /**
   * List all roles with member emails
   */
  async listRoles(): Promise<Role[]> {
    const { data: roles, error: rolesError } = await this.supabase
      .from('roles')
      .select('id, name, description, permissions, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (rolesError) throw rolesError;
    if (!roles || roles.length === 0) return [];

    const { data: members, error: membersError } = await this.supabase
      .from('role_members')
      .select('role_id, email');

    if (membersError) throw membersError;

    const membersByRoleId = new Map<string, string[]>();
    for (const m of members || []) {
      if (!membersByRoleId.has(m.role_id)) {
        membersByRoleId.set(m.role_id, []);
      }
      membersByRoleId.get(m.role_id)!.push(m.email);
    }

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: Array.isArray(r.permissions) ? r.permissions : [],
      members: membersByRoleId.get(r.id) || [],
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  /**
   * Get single role by ID
   */
  async getRoleById(id: string): Promise<Role | null> {
    const { data: role, error } = await this.supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !role) return null;

    const { data: members } = await this.supabase
      .from('role_members')
      .select('email')
      .eq('role_id', id);

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      members: members?.map((m) => m.email) || [],
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  /**
   * Create role and assign emails
   */
  async createRole(data: {
    name: string;
    description?: string;
    permissions: string[];
    emails: string[];
  }): Promise<Role> {
    const roleId = `role_${data.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;

    const { data: role, error } = await this.supabase
      .from('roles')
      .insert({
        id: roleId,
        name: data.name,
        description: data.description || '',
        permissions: data.permissions,
      })
      .select()
      .single();

    if (error) throw error;

    if (data.emails && data.emails.length > 0) {
      const rows = data.emails.map((email) => ({
        role_id: roleId,
        email: email.toLowerCase().trim(),
      }));

      const { error: memberError } = await this.supabase
        .from('role_members')
        .insert(rows);

      if (memberError) console.error('Error inserting role members:', memberError);
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      members: data.emails.map((e) => e.toLowerCase().trim()),
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  /**
   * Update role and overwrite assigned emails
   */
  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: string[];
      emails?: string[];
    }
  ): Promise<Role> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.permissions !== undefined) updates.permissions = data.permissions;

    const { data: role, error } = await this.supabase
      .from('roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    if (data.emails !== undefined) {
      // Remove existing members and insert new list
      await this.supabase.from('role_members').delete().eq('role_id', id);

      if (data.emails.length > 0) {
        const rows = data.emails.map((email) => ({
          role_id: id,
          email: email.toLowerCase().trim(),
        }));
        await this.supabase.from('role_members').insert(rows);
      }
    }

    return this.getRoleById(id) as Promise<Role>;
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<boolean> {
    // Delete role (cascade deletes role_members)
    const { error } = await this.supabase.from('roles').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
}
