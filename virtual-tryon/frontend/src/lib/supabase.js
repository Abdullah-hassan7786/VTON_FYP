import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug logging
if (typeof window !== 'undefined') {
  console.log('Supabase Config:')
  console.log('URL exists:', !!supabaseUrl)
  console.log('Anon Key exists:', !!supabaseAnonKey)
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials missing! Check your .env file.')
    console.warn('VITE_SUPABASE_URL:', supabaseUrl)
    console.warn('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing')
  }
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)

// Test connection
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Supabase connection test failed:', error)
      return false
    }
    console.log('✓ Supabase connected successfully')
    return true
  } catch (err) {
    console.error('Supabase connection error:', err)
    return false
  }
}

// Export utility functions for common operations
export const uploadImage = async (bucket, path, file) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true })
    
    if (error) throw error
    
    // Get public URL
    const { data: publicData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return {
      success: true,
      path: data.path,
      publicUrl: publicData.publicUrl
    }
  } catch (error) {
    console.error('Image upload failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

