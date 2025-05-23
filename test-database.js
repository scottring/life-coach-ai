import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseFunctionality() {
  console.log('🧪 Testing database functionality...\n');

  try {
    // Test 1: Get current session or create a test user
    console.log('1️⃣ Testing authentication...');
    
    let userId = null;
    
    // Try to get current session first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      userId = session.user.id;
      console.log('   ✅ Using existing authenticated user');
    } else {
      // Try to sign in with test credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      if (signInError) {
        // Try to create a new user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test@example.com',
          password: 'testpassword123'
        });
        
        if (signUpError) {
          console.log(`   ❌ Auth error: ${signUpError.message}`);
          console.log('   ⚠️  Continuing with anonymous testing...');
        } else {
          userId = signUpData.user?.id;
          console.log('   ✅ Created new test user');
        }
      } else {
        userId = signInData.user?.id;
        console.log('   ✅ Signed in with test user');
      }
    }

    // Test 2: Try to create a family
    console.log('\n2️⃣ Testing family creation...');
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({
        name: 'Test Family',
        created_by: userId
      })
      .select()
      .single();

    if (familyError) {
      if (familyError.code === 'PGRST106') {
        console.log('   ⚠️  families table does not exist - need to apply schema');
      } else {
        console.log(`   ❌ Family creation error: ${familyError.message}`);
      }
    } else {
      console.log('   ✅ Family creation successful');
      console.log(`   📝 Created family: ${familyData.name} (ID: ${familyData.id})`);
      
      // Test 3: Try to create family goals
      console.log('\n3️⃣ Testing family goals...');
      const { data: goalData, error: goalError } = await supabase
        .from('family_goals')
        .insert({
          family_id: familyData.id,
          title: 'Test Goal',
          description: 'A test family goal',
          status: 'active'
        })
        .select()
        .single();

      if (goalError) {
        console.log(`   ❌ Goal creation error: ${goalError.message}`);
      } else {
        console.log('   ✅ Family goal creation successful');
        console.log(`   📝 Created goal: ${goalData.title} (Status: ${goalData.status})`);
      }

      // Test 4: Try to create family meals
      console.log('\n4️⃣ Testing family meals...');
      const { data: mealData, error: mealError } = await supabase
        .from('family_meals')
        .insert({
          family_id: familyData.id,
          date: new Date().toISOString().split('T')[0],
          meal_type: 'dinner',
          dish: 'Test Meal'
        })
        .select()
        .single();

      if (mealError) {
        console.log(`   ❌ Meal creation error: ${mealError.message}`);
      } else {
        console.log('   ✅ Family meal creation successful');
        console.log(`   📝 Created meal: ${mealData.dish} (${mealData.meal_type})`);
      }

      // Clean up test data
      console.log('\n🧹 Cleaning up test data...');
      await supabase.from('family_meals').delete().eq('family_id', familyData.id);
      await supabase.from('family_goals').delete().eq('family_id', familyData.id);
      await supabase.from('families').delete().eq('id', familyData.id);
      console.log('   ✅ Test data cleaned up');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }

  console.log('\n✨ Database test completed!');
}

testDatabaseFunctionality();