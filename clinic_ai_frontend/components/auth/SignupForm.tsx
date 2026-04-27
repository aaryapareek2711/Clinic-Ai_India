"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, SignupFormValues } from '@/lib/validators/auth';
import { practiceTypes } from '@/lib/mock/documents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Removed Radix UI Select - using native HTML select for practice type dropdown
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

export const SignupForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams?.get('plan');
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      agreement: false,
    },
  });

  const password = watch('password', '');
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasMinLength = password.length >= 8;

  const onSubmit = async (data: SignupFormValues) => {
    try {
      // Combine firstName and lastName into full_name
      const fullName = `${data.firstName} ${data.lastName}`.trim();

      // Generate username from email (before @ symbol)
      const username = data.email.split('@')[0].toLowerCase();

      // Prepare the request payload matching backend UserRegisterRequest schema
      const payload = {
        email: data.email,
        username: username,
        password: data.password,
        full_name: fullName,
        phone: data.phone,
        role: 'doctor', // Provider signup (doctor role)
      };

      console.log('Registering provider:', { ...payload, password: '[REDACTED]' });

      // Call backend through the shared API client (/api proxy aware)
      const result = await apiClient.register(payload);

      // Registration successful
      console.log('Registration successful:', result.user);

      // Store tokens in localStorage
      localStorage.setItem('access_token', result.access_token);
      if (result.refresh_token) {
        localStorage.setItem('refresh_token', result.refresh_token);
      }

      // Store user data
      localStorage.setItem('user', JSON.stringify(result.user));

      // Update auth store state
      useAuthStore.setState({
        user: result.user,
        isAuthenticated: true,
      });

      // Show success message (brief, non-blocking)
      console.log(`✅ Welcome ${result.user.full_name}! Redirecting to dashboard...`);
      toast.success('Account created successfully');

      router.push('/clinic/dashboard');

    } catch (error) {
      console.error('Registration error:', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        toast.error('Signup service is temporarily unavailable. Please try again in a moment.');
        return;
      }
      const detail =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (error instanceof Error ? error.message : 'Registration failed. Please try again.');
      toast.error(detail);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-bold">Get Started with MedGenie</CardTitle>
        <CardDescription className="text-lg">Free for 14 days, no credit card required</CardDescription>
        {plan && (
          <div className="pt-2">
            <Badge variant="secondary" className="text-sm px-3 py-1 capitalize">
              Selected Plan: {plan}
            </Badge>
          </div>
        )}
        <div className="pt-4 flex justify-center gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span>All Features</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span>Unlimited Patients</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span>HIPAA Compliant</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
              Full Name
            </Label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <Input
                id="firstName"
                placeholder="Rakesh"
                {...register('firstName')}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              <Input
                id="lastName"
                placeholder="Mondal"
                {...register('lastName')}
                className={errors.lastName ? 'border-red-500' : ''}
              />
            </div>
            {(errors.firstName || errors.lastName) && (
              <p className="text-sm text-red-600 mt-1">
                {errors.firstName?.message || errors.lastName?.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@example.com"
              {...register('email')}
              className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className={`mt-1 ${errors.password ? 'border-red-500' : ''}`}
            />

            {/* Password requirements */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasLowercase ? 'bg-forest-600' : 'bg-gray-300'}`} />
                <span className={hasLowercase ? 'text-forest-600' : 'text-gray-500'}>
                  One lowercase letter
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasUppercase ? 'bg-forest-600' : 'bg-gray-300'}`} />
                <span className={hasUppercase ? 'text-forest-600' : 'text-gray-500'}>
                  One uppercase letter
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasNumber ? 'bg-forest-600' : 'bg-gray-300'}`} />
                <span className={hasNumber ? 'text-forest-600' : 'text-gray-500'}>
                  One number
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${hasMinLength ? 'bg-forest-600' : 'bg-gray-300'}`} />
                <span className={hasMinLength ? 'text-forest-600' : 'text-gray-500'}>
                  8 characters min
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Phone */}
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Mobile phone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(___) ___-____"
              {...register('phone')}
              className={`mt-1 ${errors.phone ? 'border-red-500' : ''}`}
            />
            <p className="text-xs text-gray-500 mt-1">For text verification to access your account.</p>
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>

          {/* Practice Type */}
          <div>
            <Label htmlFor="practiceType" className="text-sm font-medium text-gray-700">
              What best describes your practice?
            </Label>
            <select
              id="practiceType"
              {...register('practiceType')}
              className={`mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-forest-500 ${errors.practiceType ? 'border-red-500' : ''}`}
            >
              <option value="">Select One</option>
              {practiceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.practiceType && (
              <p className="text-sm text-red-600 mt-1">{errors.practiceType.message}</p>
            )}
          </div>

          {/* Agreement Checkbox */}
          <div className="flex items-start space-x-3">
            <Controller
              name="agreement"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="agreement"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
            <div className="flex-1">
              <label htmlFor="agreement" className="text-sm text-gray-700 leading-tight cursor-pointer">
                On behalf of myself and the practice, I agree to the{' '}
                <Link href="/baa" className="text-forest-600 hover:underline">
                  Business Associate Agreement
                </Link>
                , the{' '}
                <Link href="/terms" className="text-forest-600 hover:underline">
                  Terms of Service
                </Link>
                , and the{' '}
                <Link href="/privacy" className="text-forest-600 hover:underline">
                  Privacy Policy
                </Link>{' '}
                for my account.
              </label>
              {errors.agreement && (
                <p className="text-sm text-red-600 mt-1">{errors.agreement.message}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 text-base"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating your account...' : 'Start My Free Trial Now'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
