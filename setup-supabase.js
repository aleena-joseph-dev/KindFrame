#!/usr/bin/env node

/**
 * Supabase Database Setup Script
 * 
 * This script helps you set up the database schema for KindFrame.
 * 
 * Usage:
 * 1. Copy the SQL from database/schema.sql
 * 2. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/dlenuyofztbvhzmdfiek/sql
 * 3. Paste and run the SQL
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 KindFrame Supabase Database Setup');
console.log('=====================================\n');

console.log('📋 Next Steps:');
console.log('1. Go to your Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/dlenuyofztbvhzmdfiek/sql\n');

console.log('2. Copy and paste the following SQL:\n');

try {
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  console.log(schema);
} catch (error) {
  console.error('❌ Error reading schema file:', error.message);
  console.log('\n📁 Please check that database/schema.sql exists');
}

console.log('\n3. Click "Run" to execute the SQL');
console.log('4. Verify the tables are created in the Table Editor');
console.log('5. Test the authentication flow in your app\n');

console.log('✅ Setup Complete!');
console.log('Your Supabase project is now configured with:');
console.log('- User profiles table with sensory mode (references auth.users)');
console.log('- User profiles table for additional data');
console.log('- Row Level Security (RLS) policies');
console.log('- Automatic user profile creation triggers'); 