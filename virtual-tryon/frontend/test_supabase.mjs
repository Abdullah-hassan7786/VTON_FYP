import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rleeboboccdkaxfccfvg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsZWVib2JvY2Nka2F4ZmNjZnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5Mjg2NDEsImV4cCI6MjA5MjUwNDY0MX0.5vgUmvZmzu_rFdRR1vW7ImNZSyBWN4aIq_6vRNDLUng';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing Supabase signup...');
  const { data, error } = await supabase.auth.signUp({
    email: 'testuser123@example.com',
    password: 'password1234',
    options: {
      data: {
        display_name: 'Test User',
      }
    }
  });

  if (error) {
    console.error('Signup Error:', error);
    return;
  }
  
  console.log('Signup Data:', data);
  
  if (data.user) {
    console.log('Testing insert to public.users...');
    const { error: dbError } = await supabase.from('users').insert([{
      id: data.user.id,
      email: 'testuser123@example.com',
      full_name: 'Test User',
      role: 'user'
    }]);
    
    if (dbError) {
      console.error('DB Insert Error:', dbError);
    } else {
      console.log('DB Insert Success!');
    }
  }
}

test();
