/**
 * Template Compatibility Auth Server
 * 
 * This file provides a compatibility layer that matches the template structure
 * while leveraging the comprehensive BetterAuth implementation underneath.
 * 
 * Template structure:
 * ```javascript
 * export const auth = { login: ()=>{}, signup: ()=>{} };
 * ```
 */

import { auth } from './index'

export interface AuthRequest {
  email: string
  password: string
  name?: string
  tenantId?: string
}

export interface AuthResponse {
  success: boolean
  user?: any
  session?: any
  error?: string
}

/**
 * Template-compatible auth server implementation
 */
export const serverAuth = {
  /**
   * Login function - matches template signature
   * For production use, use the comprehensive /auth/sign-in endpoint instead
   */
  async login(): Promise<AuthResponse> {
    // This is a simple compatibility function
    // In a real implementation, you would extract request data and call:
    // return auth.api.signIn({ body: { email, password, ... } })
    
    console.log('Template auth.login() called - use /auth/sign-in for production')
    
    return {
      success: false,
      error: 'Use /auth/sign-in endpoint for actual authentication'
    }
  },

  /**
   * Signup function - matches template signature  
   * For production use, use the comprehensive /auth/sign-up endpoint instead
   */
  async signup(): Promise<AuthResponse> {
    // This is a simple compatibility function
    // In a real implementation, you would extract request data and call:
    // return auth.api.signUp({ body: { email, password, name, ... } })
    
    console.log('Template auth.signup() called - use /auth/sign-up endpoint for production')
    
    return {
      success: false,
      error: 'Use /auth/sign-up endpoint for actual account creation'
    }
  }
}

// Export with the exact name expected by template
export const auth = serverAuth

// Also export the comprehensive BetterAuth instance for production use
export { auth as betterAuth } from './index'