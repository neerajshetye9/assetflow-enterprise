const { z } = require('zod');

const signupSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().min(2, 'Organization name required'),
  organizationCode: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, or underscores'),
  industry: z.string().optional(),
  timezone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

module.exports = {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
};
