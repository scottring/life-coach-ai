# Deployment Guide

## Environment Setup

This project supports two environments:
- **Development**: `symphony-ai-dev` Firebase project
- **Production**: `symphony-ai-prod` Firebase project

## Prerequisites

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login to Firebase: `firebase login`
3. Create both dev and prod Firebase projects in the console

## Deployment Commands

### Development Deployment
```bash
npm run deploy:dev
```

### Production Deployment
```bash
npm run deploy:prod
```

### Firestore Rules Deployment
```bash
# Development
npm run deploy:firestore:dev

# Production
npm run deploy:firestore:prod
```

## Manual Deployment Steps

### 1. Development
```bash
npm run build:dev
firebase use development
firebase deploy --only hosting
```

### 2. Production
```bash
npm run build:prod
firebase use production
firebase deploy --only hosting
```

## Environment Variables

- `.env.development` - Development environment settings
- `.env.production` - Production environment settings

## Project Structure

- Development builds use `REACT_APP_ENV=development`
- Production builds use `REACT_APP_ENV=production`
- Firebase project switching handled by `.firebaserc`

## First Time Setup

1. Create Firebase projects:
   - `symphony-ai-dev` for development
   - `symphony-ai-prod` for production

2. Update `.env.production` with your actual API domain

3. Deploy Firestore rules to both environments:
   ```bash
   npm run deploy:firestore:dev
   npm run deploy:firestore:prod
   ```

4. Deploy hosting:
   ```bash
   npm run deploy:dev
   npm run deploy:prod
   ```