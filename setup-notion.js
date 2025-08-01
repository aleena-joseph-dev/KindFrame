#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Notion OAuth Setup for KindFrame');
console.log('=====================================\n');

console.log('📋 Steps to get your Notion credentials:');
console.log('1. Go to https://developers.notion.com/');
console.log('2. Click "New integration"');
console.log('3. Fill in the details:');
console.log('   - Name: KindFrame');
console.log('   - Associated workspace: Select your workspace');
console.log('   - Capabilities: Read content, Update content, Insert content, Create pages');
console.log('4. Click "Submit"');
console.log('5. Copy the "Internal Integration Token" (this is your Client Secret)');
console.log('6. Copy the "OAuth Client ID" from the integration settings');
console.log('7. In the OAuth tab, add these redirect URIs:');
console.log('   - kindframe://auth-callback (for mobile app)');
console.log('   - http://localhost:8081/auth-callback (for web development)\n');

console.log('📝 Once you have your credentials, create a .env file with:');
console.log('EXPO_PUBLIC_NOTION_CLIENT_ID=your_client_id_here');
console.log('EXPO_PUBLIC_NOTION_CLIENT_SECRET=your_client_secret_here\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('your_notion_client_id_here')) {
    console.log('⚠️  Please update your .env file with actual Notion credentials');
  } else {
    console.log('✅ Notion credentials appear to be configured');
  }
} else {
  console.log('📄 Creating .env file from template...');
  const templatePath = path.join(__dirname, 'env-template.txt');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, envPath);
    console.log('✅ .env file created from template');
    console.log('⚠️  Please update the Notion credentials in .env file');
  } else {
    console.log('❌ env-template.txt not found');
  }
}

console.log('\n🚀 After setting up credentials, restart your development server:');
console.log('npx expo start --clear'); 