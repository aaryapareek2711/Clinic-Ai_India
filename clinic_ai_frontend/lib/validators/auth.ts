/**
 * Authentication validation schemas
 */

import { z } from 'zod';

// Password regex: at least 8 characters, one uppercase, one lowercase, one number
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

export const signupSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().regex(passwordRegex, {
    message: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  }),
  phone: z.string().min(10, { message: 'Valid phone number is required' }),
  practiceType: z.string().min(1, { message: 'Please select a practice type' }),
  agreement: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the Business Associate Agreement',
  }),
});

export type SignupFormValues = z.infer<typeof signupSchema>;

export const practiceSettingsSchema = z.object({
  practiceName: z.string().min(1, { message: 'Practice name is required' }),
  practiceEmail: z.string().email({ message: 'Invalid email address' }),
  timezone: z.string().min(1, { message: 'Timezone is required' }),
  logo: z.any().optional(),
  phone: z.string().optional(),
  cancellationPolicy: z.string().optional(),
});

export type PracticeSettingsFormValues = z.infer<typeof practiceSettingsSchema>;
