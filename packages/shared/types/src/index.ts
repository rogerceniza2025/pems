// Types package - to be populated with shared type definitions
export interface User {
  id: string
  name: string
  email: string
}

export interface ApiResponse<T = unknown> {
  data: T
  message: string
  success: boolean
}
