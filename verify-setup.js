#!/usr/bin/env node

/**
 * Verify KindFrame Setup
 * 
 * This script verifies that all components are properly configured.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying KindFrame Setup...\n');

// Check .env file
console.log('1. Checking .env file...');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_URL') && envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
    console.log('✅ .env file exists with Supabase credentials');
  } else {
    console.log('❌ .env file missing Supabase credentials');
  }
} else {
  console.log('❌ .env file not found');
}

// Check package.json
console.log('\n2. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const hasSupabase = packageJson.dependencies['@supabase/supabase-js'];
const hasClerk = packageJson.dependencies['@clerk/clerk-expo'];

if (hasSupabase) {
  console.log('✅ Supabase dependency installed');
} else {
  console.log('❌ Supabase dependency missing');
}

if (hasClerk) {
  console.log('⚠️  Clerk dependency still present (should be removed)');
} else {
  console.log('✅ Clerk dependency removed');
}

// Check key files
console.log('\n3. Checking key files...');
const filesToCheck = [
  'lib/supabase.ts',
  'services/authService.ts',
  'database/schema.sql',
  'app/(auth)/signin.tsx',
  'app/(auth)/signup.tsx'
];

filesToCheck.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check for Clerk references
console.log('\n4. Checking for Clerk references...');
const filesToSearch = [
  'app/(auth)/signin.tsx',
  'app/(auth)/signup.tsx',
  'app/index.tsx',
  'app/menu.tsx'
];

let clerkFound = false;
filesToSearch.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('clerk') || content.includes('Clerk')) {
      console.log(`⚠️  Clerk reference found in ${file}`);
      clerkFound = true;
    }
  }
});

if (!clerkFound) {
  console.log('✅ No Clerk references found in key files');
}

console.log('\n🎉 Setup verification complete!');
console.log('\n📋 Next steps:');
console.log('1. Run the database schema: node setup-supabase.js');
console.log('2. Test the authentication flow in your app');
console.log('3. Configure OAuth providers in Supabase dashboard'); 