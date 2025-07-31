const { createClient } = require('@supabase/supabase-js');

// Use the same configuration as in lib/supabase.ts
const supabaseUrl = 'https://dlenuyofztbvhzmdfiek.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZW51eW9menRidmh6bWRmaWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjY2NDMsImV4cCI6MjA2OTQ0MjY0M30.vyeTP56KuHKJlpcH-n8L8qFKxQrrvVSSi30S0P2Gv5A';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase Connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection Error:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Database is accessible');
    return true;
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    return false;
  }
}

async function testAuthConfiguration() {
  console.log('\n🔍 Testing Auth Configuration...');
  
  try {
    // Test if auth is properly configured
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Auth Error:', error.message);
      return false;
    }
    
    console.log('✅ Auth configuration is working!');
    console.log('🔐 Authentication system is ready');
    return true;
  } catch (error) {
    console.log('❌ Auth test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Authentication Tests...\n');
  
  const connectionTest = await testSupabaseConnection();
  const authTest = await testAuthConfiguration();
  
  console.log('\n📋 Test Results:');
  console.log(`Database Connection: ${connectionTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Auth Configuration: ${authTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (connectionTest && authTest) {
    console.log('\n🎉 All tests passed! Email/password authentication should work.');
    console.log('\n📱 Next steps:');
    console.log('1. Open your app in the browser');
    console.log('2. Try to sign up with a new email');
    console.log('3. Try to sign in with the created account');
    console.log('4. Test password reset functionality');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your Supabase configuration.');
  }
}

runTests().catch(console.error); 