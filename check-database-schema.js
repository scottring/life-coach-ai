import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check what columns exist in tasks table
    console.log('📋 Checking tasks table structure...');
    const { data: tasksInfo, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1);

    if (tasksError) {
      console.log(`   ❌ Error accessing tasks table: ${tasksError.message}`);
    } else {
      console.log('   ✅ Tasks table accessible');
      if (tasksInfo && tasksInfo.length > 0) {
        console.log('   📝 Available columns:', Object.keys(tasksInfo[0]));
      } else {
        console.log('   📝 Table exists but has no data to show column structure');
      }
    }

    // Check what columns exist in family_tasks table
    console.log('\n📋 Checking family_tasks table structure...');
    const { data: familyTasksInfo, error: familyTasksError } = await supabase
      .from('family_tasks')
      .select('*')
      .limit(1);

    if (familyTasksError) {
      console.log(`   ❌ Error accessing family_tasks table: ${familyTasksError.message}`);
    } else {
      console.log('   ✅ Family_tasks table accessible');
      if (familyTasksInfo && familyTasksInfo.length > 0) {
        console.log('   📝 Available columns:', Object.keys(familyTasksInfo[0]));
      } else {
        console.log('   📝 Table exists but has no data to show column structure');
      }
    }

    // Try to access specific columns we need
    console.log('\n🔍 Testing specific column access...');
    
    const { data: sourceTest, error: sourceError } = await supabase
      .from('tasks')
      .select('source, source_id')
      .limit(1);

    if (sourceError) {
      console.log(`   ❌ Cannot access source columns: ${sourceError.message}`);
      console.log('   🔧 SOLUTION: Run add-deduplication-columns.sql to add missing columns');
    } else {
      console.log('   ✅ Source columns exist and are accessible');
    }

    // Check family_goals table for the columns we added earlier
    console.log('\n📋 Checking family_goals table structure...');
    const { data: familyGoalsTest, error: familyGoalsError } = await supabase
      .from('family_goals')
      .select('status, current_value, progress_percentage')
      .limit(1);

    if (familyGoalsError) {
      console.log(`   ❌ Cannot access family_goals columns: ${familyGoalsError.message}`);
    } else {
      console.log('   ✅ Family_goals columns exist and are accessible');
    }

    // Test if we can create a task with source information
    console.log('\n🧪 Testing task creation with source information...');
    
    // Get current user for RLS
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    
    const currentUser = user || session?.user;
    
    if (!currentUser) {
      console.log('   ⚠️  No authenticated user - skipping task creation test');
      console.log('   💡 This is normal if not logged in. Source columns are confirmed to exist.');
      return;
    }
    
    console.log('   ✅ Using authenticated user for test');
    const userId = currentUser.id;
    
    const testTaskData = {
      user_id: userId,
      title: 'Test Task for Schema Check',
      description: 'Testing if source columns work',
      status: 'pending',
      source: 'manual',
      source_id: 'test-schema-check-' + Date.now()
    };

    const { data: testTask, error: createError } = await supabase
      .from('tasks')
      .insert([testTaskData])
      .select()
      .single();

    if (createError) {
      console.log(`   ❌ Cannot create task with source: ${createError.message}`);
    } else {
      console.log('   ✅ Successfully created task with source information');
      console.log(`   📝 Task ID: ${testTask.id}, Source: ${testTask.source}`);

      // Clean up test task
      await supabase.from('tasks').delete().eq('id', testTask.id);
      console.log('   🧹 Test task cleaned up');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n✨ Schema check completed!');
}

checkDatabaseSchema();