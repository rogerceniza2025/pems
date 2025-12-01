import { z } from 'zod'

// Base validation schemas
export const baseSchemas = {
  // UUID validation
  uuid: z.string().uuid(),

  // Email validation
  email: z.string().email('Invalid email address'),

  // Phone validation (Philippines format)
  phone: z.string().regex(/^(\+63|0)?[9]\d{10}$/, 'Invalid phone number'),

  // Password validation
  password: z.string().min(8, 'Password must be at least 8 characters'),

  // Name validation
  name: z.string().min(2, 'Name must be at least 2 characters'),

  // LRN validation (DepEd)
  lrn: z.string().regex(/^\d{12}$/, 'Invalid LRN format'),

  // School code validation
  schoolCode: z.string().min(3, 'School code must be at least 3 characters'),

  // Date validation
  date: z.string().datetime({ offset: true }),

  // Pagination
  page: z.number().min(1, 'Page must be at least 1'),
  limit: z.number().min(1, 'Limit must be at least 1'),
}

// User-related schemas
export const userSchemas = {
  create: z.object({
    email: baseSchemas.email,
    password: baseSchemas.password,
    firstName: baseSchemas.name.optional(),
    lastName: baseSchemas.name.optional(),
    phone: baseSchemas.phone.optional(),
  }),

  login: z.object({
    email: baseSchemas.email,
    password: baseSchemas.password,
  }),

  update: z.object({
    firstName: baseSchemas.name.optional(),
    lastName: baseSchemas.name.optional(),
    phone: baseSchemas.phone.optional(),
  }),
}

// School-related schemas
export const schoolSchemas = {
  create: z.object({
    name: baseSchemas.name,
    code: baseSchemas.schoolCode,
    type: z.enum(['K12', 'HIGHER_ED']),
    address: baseSchemas.email.optional(),
    phone: baseSchemas.phone.optional(),
    email: baseSchemas.email.optional(),
  }),

  update: z.object({
    name: baseSchemas.name.optional(),
    address: baseSchemas.email.optional(),
    phone: baseSchemas.phone.optional(),
    email: baseSchemas.email.optional(),
  }),
}

// API response schemas
export const apiSchemas = {
  pagination: z.object({
    page: baseSchemas.page,
    limit: baseSchemas.limit,
    total: z.number(),
    data: z.array(z.any()),
  }),

  error: z.object({
    message: z.string(),
    code: z.string(),
    details: z.any().optional(),
  }),

  success: z.object({
    message: z.string(),
    data: z.any(),
  }),
}

// Export all schemas
export const schemas = {
  ...baseSchemas,
  ...userSchemas,
  ...schoolSchemas,
  ...apiSchemas,
}

// Export types
export type CreateUserInput = z.infer<typeof userSchemas.create>
export type LoginInput = z.infer<typeof userSchemas.login>
export type UpdateUserInput = z.infer<typeof userSchemas.update>
export type CreateSchoolInput = z.infer<typeof schoolSchemas.create>
export type UpdateSchoolInput = z.infer<typeof schoolSchemas.update>
export type PaginationInput = z.infer<typeof apiSchemas.pagination>
