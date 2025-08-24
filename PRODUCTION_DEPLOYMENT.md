# 🚀 KindFrame Production Deployment Guide

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **1. Environment Variables Setup**
- [ ] Copy `env.production.template` to `.env.production`
- [ ] Fill in your actual production values:
  - Supabase credentials
  - Google OAuth credentials
  - Notion OAuth credentials
  - AI service endpoints

### **2. OAuth Provider Configuration**
- [ ] **Google Console:**
  - Add `https://your-app-name.expo.dev/auth-callback` to authorized redirect URIs
  - Remove all localhost URLs
- [ ] **Notion:**
  - Add `https://your-app-name.expo.dev/auth-callback` to redirect URIs
  - Remove all localhost URLs

### **3. Backend Services**
- [ ] **AI Proxy Server:** Deploy to production (Vercel, Heroku, etc.)
- [ ] **Update URLs:** Change from localhost to production domain
- [ ] **Environment Variables:** Set production values on backend

---

## 🔧 **DEPLOYMENT STEPS**

### **Step 1: Build Production Bundle**
```bash
# Set production environment
export NODE_ENV=production
export EXPO_PUBLIC_IS_PRODUCTION=true

# Build for production
npm run build
```

### **Step 2: Deploy to Expo**
```bash
# Install EAS CLI if not already installed
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS (first time only)
eas build:configure

# Build for production
eas build --platform web --profile production

# Deploy to Expo hosting
eas update --branch production --message "Production deployment"
```

### **Step 3: Verify Deployment**
- [ ] Check OAuth flows work with production URLs
- [ ] Verify AI services are accessible
- [ ] Test all integrations (Google, Notion, Supabase)
- [ ] Confirm no localhost references remain

---

## 🌐 **PRODUCTION URL STRUCTURE**

### **Expo Hosting (Recommended)**
```
Base URL: https://your-app-name.expo.dev
Auth Callback: https://your-app-name.expo.dev/auth-callback
```

### **Custom Domain (Alternative)**
```
Base URL: https://kindframe.com
Auth Callback: https://kindframe.com/auth-callback
```

---

## 🛡️ **SECURITY CONSIDERATIONS**

### **Environment Variables**
- [ ] Never commit `.env.production` to git
- [ ] Use Expo's environment variable system
- [ ] Rotate API keys regularly

### **OAuth Security**
- [ ] Use HTTPS for all OAuth callbacks
- [ ] Implement state parameter validation
- [ ] Set appropriate OAuth scopes

### **API Security**
- [ ] Rate limiting on AI endpoints
- [ ] CORS configuration for production domains
- [ ] Input validation and sanitization

---

## 📱 **POST-DEPLOYMENT**

### **Monitoring**
- [ ] Set up error tracking (Sentry)
- [ ] Monitor OAuth success/failure rates
- [ ] Track API response times

### **Testing**
- [ ] Test OAuth flows on production
- [ ] Verify all features work as expected
- [ ] Check mobile responsiveness

### **Documentation**
- [ ] Update user documentation
- [ ] Document production URLs
- [ ] Create troubleshooting guide

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**
1. **OAuth Redirect Errors:** Check redirect URI configuration
2. **CORS Issues:** Verify backend CORS settings
3. **Environment Variables:** Ensure all required vars are set

### **Support**
- Check Expo documentation: https://docs.expo.dev/
- Review OAuth provider documentation
- Check Supabase status page

---

## ✅ **SUCCESS CRITERIA**

- [ ] App loads without errors on production
- [ ] All OAuth flows work correctly
- [ ] AI services respond as expected
- [ ] No localhost references in production
- [ ] All features function properly
- [ ] Performance meets requirements
