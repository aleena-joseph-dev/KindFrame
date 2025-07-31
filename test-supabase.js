#!/usr/bin/env node

/**
 * Test Supabase Connection
 * 
 * This script tests the connection to your Supabase project.
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dlenuyofztbvhzmdfiek.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZW51eW9menRidmh6bWRmaWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjY2NDMsImV4cCI6MjA2OTQ0MjY0M30.vyeTP56KuHKJlpcH-n8L8qFKxQrrvVSSi30S0P2Gv5A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      console.log('💡 This might be expected if the users table doesn\'t exist yet.');
      console.log('   Run the database schema first using: node setup-supabase.js\n');
    } else {
      console.log('✅ Connection successful!');
      console.log('📊 Users table is accessible');
    }

    // Test auth configuration
    console.log('\n2. Testing auth configuration...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('❌ Auth configuration error:', authError.message);
    } else {
      console.log('✅ Auth configuration successful!');
    }

    console.log('\n🎉 Supabase connection test completed!');
    console.log('📋 Next steps:');
    console.log('1. Run the database schema: node setup-supabase.js');
    console.log('2. Test the authentication flow in your app');
    console.log('3. Configure OAuth providers in Supabase dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection(); 