# Database Deployment Guide

The database tables exist but the schema is not fully applied. Here's how to complete the setup:

## Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: `zkniqzkrqbmumymwdjho`
4. Navigate to **SQL Editor** in the left sidebar

## Step 2: Apply Main Schema

1. In the SQL Editor, create a new query
2. Copy the **entire contents** of `supabase/schema.sql` 
3. Paste it into the SQL Editor
4. Click **Run** to execute the schema

Expected output: Multiple tables created with proper columns and constraints.

## Step 3: Apply Hierarchical Schema

1. Create another new query in the SQL Editor
2. Copy the **entire contents** of `supabase/hierarchical-goals-schema.sql`
3. Paste it into the SQL Editor  
4. Click **Run** to execute the hierarchical enhancements

Expected output: Additional columns, indexes, and functions created.

## Step 4: Verify Installation

Run this test script to verify everything is working:

```bash
node test-database.js
```

Expected output:
```
🧪 Testing database functionality...

1️⃣ Testing authentication...
   ✅ Signed in with test user

2️⃣ Testing family creation...
   ✅ Family creation successful
   📝 Created family: Test Family (ID: xxx)

3️⃣ Testing family goals...
   ✅ Family goal creation successful
   📝 Created goal: Test Goal (Status: active)

4️⃣ Testing family meals...
   ✅ Family meal creation successful
   📝 Created meal: Test Meal (dinner)

🧹 Cleaning up test data...
   ✅ Test data cleaned up

✨ Database test completed!
```

## Step 5: Remove Fallback Code

Once the database is working, remove the fallback/mock data from the application:

1. **FamilyProvider.jsx** - Remove the try/catch fallback in `loadFamilyData`
2. **FamilyDashboard.jsx** - Remove the mock family creation in `loadUserFamilies`

## Step 6: Deploy Application

The application will now be fully functional with persistent data storage.

## Troubleshooting

### If schema application fails:
- Check for syntax errors in the SQL files
- Apply statements one section at a time
- Check Supabase logs for specific error messages

### If tables exist but columns are missing:
- The `ALTER TABLE` statements may not have executed
- Manually run the missing `ALTER TABLE` commands from the schema files

### If authentication issues occur:
- Verify Row Level Security (RLS) policies are applied
- Check that the `auth.users` table exists and is populated

## Key Tables Created

- `tasks` - Individual tasks
- `goals` - Individual goals  
- `families` - Family groups
- `family_members` - Family membership
- `family_goals` - Family goals with hierarchy support
- `family_tasks` - Family tasks with hierarchy support
- `family_meals` - Meal planning
- `family_reviews` - Weekly review sessions
- `shopping_items` - Shopping lists

## Next Steps After Database Setup

1. Test all functionality in the web application
2. Create your first family
3. Add family members
4. Test meal planning
5. Test goal creation and weekly reviews
6. Deploy to production