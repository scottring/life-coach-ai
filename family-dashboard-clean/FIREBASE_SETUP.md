# Firebase Setup for Task Persistence

Your Firebase configuration is ready! Here's how to complete the setup:

## 1. Deploy Firestore Indexes

Run this command to deploy the optimized indexes:

```bash
cd family-dashboard-clean
firebase deploy --only firestore:indexes
```

This will create indexes for:
- Context-based queries with sorting
- Date and time-based searches
- Priority and status filtering
- Tag-based searches

## 2. Deploy Security Rules

Deploy the updated security rules:

```bash
firebase deploy --only firestore:rules
```

The rules ensure:
- Users can only access their own tasks
- Tasks are protected by user authentication
- Proper validation for task creation

## 3. Test the Setup

1. **Create a task** in the Capture view
2. **Check Today view** - should show persisted tasks
3. **Try Planning view** - drag and drop should persist
4. **Refresh browser** - data should remain

## 4. Optional: Add Authentication

If you want user-specific data isolation, add authentication:

```bash
# Enable Firebase Auth in console
firebase auth:import users.json
```

## Files Created

- `firestore.indexes.json` - Database performance indexes
- `firestore.rules` - Updated security rules for tasks
- `FIREBASE_SETUP.md` - This setup guide

## Troubleshooting

If tasks aren't persisting:
1. Check browser console for Firebase errors
2. Verify your `.env` variables are correct
3. Ensure Firestore is enabled in Firebase Console
4. Check that indexes are deployed successfully

Your task data will now persist across sessions and sync in real-time! 🎉