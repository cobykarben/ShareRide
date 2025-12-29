"use client";

/**
 * AuthForm Component for ShareRide
 * 
 * This component provides a unified authentication form that supports both login and signup.
 * Users can toggle between the two modes.
 * 
 * Features:
 * - Email/password authentication
 * - Google OAuth sign-in (button provided, requires Supabase configuration)
 * - Form validation using react-hook-form and zod
 * - Loading states and error handling
 * - Automatic redirects after successful authentication
 * 
 * Note: ShareRide uses unified profiles - there's NO distinction between "driver" and "rider" roles.
 * All users have the same profile structure and can both drive and ride (as long as they meet prerequisites).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Zod schema for form validation
const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password is too long"),
});

type AuthFormValues = z.infer<typeof authSchema>;

type AuthMode = "login" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, loading: authLoading } = useAuth();

  // Initialize react-hook-form with zod validation
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  /**
   * Handle form submission
   * Calls either signIn or signUp based on current mode
   */
  const onSubmit = async (values: AuthFormValues) => {
    try {
      if (mode === "login") {
        // Sign in existing user
        const { error } = await signIn(values.email, values.password);
        
        if (error) {
          toast.error("Sign in failed", {
            description: error.message || "Please check your email and password",
          });
          return;
        }

        toast.success("Welcome back!");
        // Redirect to homepage after successful login
        router.push("/");
        router.refresh(); // Refresh to update auth state in header
      } else {
        // Sign up new user
        const { error } = await signUp(values.email, values.password);
        
        if (error) {
          toast.error("Sign up failed", {
            description: error.message || "Could not create account. Please try again.",
          });
          return;
        }

        toast.success("Account created!", {
          description: "Please complete your profile to get started.",
        });
        // Redirect to profile setup page after successful signup
        // Profile is automatically created by the trigger, but user needs to fill it out
        router.push("/profile/setup");
        router.refresh();
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("An unexpected error occurred", {
        description: "Please try again later.",
      });
    }
  };

  /**
   * Handle Google OAuth sign-in
   */
  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        toast.error("Google sign-in failed", {
          description: error.message || "Could not sign in with Google. Please try again.",
        });
      }
      // If successful, user will be redirected to Google, then to /auth/callback
      // The callback route will handle the redirect
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("An unexpected error occurred", {
        description: "Please try again later.",
      });
    }
  };

  const isLoading = authLoading || form.formState.isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {mode === "login" ? "Welcome back" : "Create an account"}
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to your ShareRide account"
              : "Enter your email and password to get started"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Sign-in Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={mode === "login" ? "Enter your password" : "Create a password (min 6 chars)"}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "login" ? "Sign In" : "Sign Up"}
              </Button>
            </form>
          </Form>

          {/* Toggle between login and signup */}
          <div className="text-center text-sm">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => {
                    setMode("signup");
                    form.reset(); // Clear form when switching modes
                  }}
                  disabled={isLoading}
                >
                  Sign up
                </Button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto font-semibold"
                  onClick={() => {
                    setMode("login");
                    form.reset(); // Clear form when switching modes
                  }}
                  disabled={isLoading}
                >
                  Sign in
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

