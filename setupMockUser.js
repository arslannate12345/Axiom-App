const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY; // Using the service_role key they just put in!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('Fetching or creating mock user...');
  let userId = null;
  
  // Try to create the user
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'mockuser@axiom.app',
    password: 'password123',
    email_confirm: true
  });

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      // User exists, fetch them
      console.log('User already exists, fetching...');
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Failed to list users:', listError);
        process.exit(1);
      }
      const existingUser = usersData.users.find(u => u.email === 'mockuser@axiom.app');
      userId = existingUser.id;
    } else {
      console.error('Failed to create user:', error);
      process.exit(1);
    }
  } else {
    userId = data.user.id;
  }

  console.log('Got valid UUID:', userId);

  // Update authStore.ts
  const authStorePath = path.join(__dirname, 'src', 'stores', 'authStore.ts');
  let authStoreContent = fs.readFileSync(authStorePath, 'utf8');
  authStoreContent = authStoreContent.replace(/00000000-0000-0000-0000-000000000000/g, userId);
  fs.writeFileSync(authStorePath, authStoreContent);

  // Update dataService.ts
  const dataServicePath = path.join(__dirname, 'src', 'services', 'dataService.ts');
  let dataServiceContent = fs.readFileSync(dataServicePath, 'utf8');
  dataServiceContent = dataServiceContent.replace(/00000000-0000-0000-0000-000000000000/g, userId);
  fs.writeFileSync(dataServicePath, dataServiceContent);

  console.log('Successfully injected real UUID into codebase!');
}

run();
