import { supabase } from '../lib/supabase'

export interface UserSession {
  user: any | null
  isDemo: boolean
}

/**
 * Get the current authenticated user from Supabase auth.
 */
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (e) {
    return null
  }
}

/**
 * Get the current session from Supabase auth.
 */
export async function getSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (e) {
    return null
  }
}

/**
 * Register a new user using email and password.
 */
export async function signUpWithEmail(email: string, pass: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  })
  if (error) throw error
  return data
}

/**
 * Sign in an existing user using email and password.
 */
export async function signInWithEmail(email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  })
  if (error) throw error
  return data
}

/**
 * Sign out the current user.
 */
export async function signOutUser() {
  try {
    await supabase.auth.signOut()
  } catch (e) {
    console.error('Sign out error:', e)
  }
}

// Aliases for compatibility
export const signIn = signInWithEmail
export const signUp = signUpWithEmail
export const signOut = signOutUser
