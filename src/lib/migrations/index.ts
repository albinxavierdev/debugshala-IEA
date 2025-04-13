import { supabase } from '@/lib/supabase';

interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Migration registry to keep track of applied migrations
const migrations: Migration[] = [
  {
    id: '001',
    name: 'create_migrations_table',
    up: async () => {
      // Create the migrations table if it doesn't exist
      const { error } = await supabase.rpc('create_migrations_table_if_not_exists');
      if (error) throw error;
    },
    down: async () => {
      // Don't actually drop the migrations table in down migration
      console.warn('Skipping drop of migrations table for safety');
    },
  },
  {
    id: '002',
    name: 'normalize_assessment_results',
    up: async () => {
      // Normalize assessment results structure
      const { data: results, error } = await supabase
        .from('assessment_results')
        .select('id, results')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Process each result to normalize structure
      for (const result of results || []) {
        if (!result.results) continue;
        
        // Normalize the structure (example: extract scores to a separate table)
        const normalizedResults = {
          ...result.results,
          // Add any structure normalization here
        };
        
        // Update the record
        const { error: updateError } = await supabase
          .from('assessment_results')
          .update({ 
            results: normalizedResults,
            normalized: true 
          })
          .eq('id', result.id);
        
        if (updateError) throw updateError;
      }
    },
    down: async () => {
      // Mark records as not normalized
      const { error } = await supabase
        .from('assessment_results')
        .update({ normalized: false })
        .eq('normalized', true);
      
      if (error) throw error;
    },
  }
];

// Get applied migrations
async function getAppliedMigrations(): Promise<string[]> {
  // First ensure the migrations table exists
  await migrations[0].up();
  
  const { data, error } = await supabase
    .from('migrations')
    .select('id')
    .order('applied_at', { ascending: true });
  
  if (error) throw error;
  
  return (data || []).map(m => m.id);
}

// Apply pending migrations
export async function runMigrations(): Promise<void> {
  try {
    const appliedMigrations = await getAppliedMigrations();
    const pendingMigrations = migrations.filter(m => !appliedMigrations.includes(m.id));
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      console.log(`Running migration ${migration.id}: ${migration.name}`);
      
      // Run the migration
      await migration.up();
      
      // Record the migration as applied
      const { error } = await supabase
        .from('migrations')
        .insert({
          id: migration.id,
          name: migration.name,
          applied_at: new Date().toISOString(),
        });
      
      if (error) throw error;
      
      console.log(`Migration ${migration.id} applied successfully`);
    }
    
    if (pendingMigrations.length === 0) {
      console.log('Database is up to date');
    } else {
      console.log(`Applied ${pendingMigrations.length} migrations`);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Rollback last migration
export async function rollbackLastMigration(): Promise<void> {
  try {
    const appliedMigrations = await getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('No migrations to roll back');
      return;
    }
    
    // Get the last applied migration
    const lastMigrationId = appliedMigrations[appliedMigrations.length - 1];
    const migrationToRollback = migrations.find(m => m.id === lastMigrationId);
    
    if (!migrationToRollback) {
      console.error(`Migration ${lastMigrationId} not found in registry`);
      return;
    }
    
    console.log(`Rolling back migration ${migrationToRollback.id}: ${migrationToRollback.name}`);
    
    // Run the down migration
    await migrationToRollback.down();
    
    // Remove the migration from the applied list
    const { error } = await supabase
      .from('migrations')
      .delete()
      .eq('id', lastMigrationId);
    
    if (error) throw error;
    
    console.log(`Rolled back migration ${migrationToRollback.id}`);
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Initialize database with stored procedures
export async function initializeDatabase(): Promise<void> {
  // Create stored procedure for creating migrations table
  const { error } = await supabase.rpc('create_migration_functions');
  
  if (error) {
    // If the function doesn't exist yet, create it
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION create_migration_functions()
      RETURNS void AS $$
      BEGIN
        -- Function to create migrations table
        CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
        RETURNS void AS $func$
        BEGIN
          CREATE TABLE IF NOT EXISTS migrations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TIMESTAMP WITH TIME ZONE NOT NULL
          );
        END;
        $func$ LANGUAGE plpgsql;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
    
    if (createError) {
      console.error('Failed to create database functions:', createError);
      return;
    }
    
    // Try again
    await supabase.rpc('create_migration_functions');
  }
}

// Export migration utilities
export const migrations_utils = {
  runMigrations,
  rollbackLastMigration,
  initializeDatabase,
}; 