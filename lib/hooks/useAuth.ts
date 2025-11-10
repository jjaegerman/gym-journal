import { useState } from 'react';
import { useToastController } from '@tamagui/toast';
import {
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
  updatePassword as apiUpdatePassword,
  resetPasswordForEmail as apiResetPasswordForEmail,
} from '@/lib/api/supabase/auth';

/**
 * Custom hook for authentication actions
 * Provides auth functions with built-in loading states and error handling
 */
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const toast = useToastController();

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error, data } = await apiSignIn(email, password);
    setLoading(false);

    if (error) {
      toast.show(error.message, {
        duration: 3000,
        customData: { theme: 'red' },
      });
      return { error };
    }

    return { data };
  };

  const signUp = async (email: string, password: string, redirectTo?: string) => {
    setLoading(true);
    const { error, data } = await apiSignUp(email, password, redirectTo);
    setLoading(false);

    if (error) {
      toast.show(error.message, {
        duration: 30000,
        customData: { theme: 'red' },
      });
      return { error };
    }

    if (!data.session) {
      toast.show('Please check your inbox for email verification!', {
        duration: 10000,
        customData: { theme: 'green' },
      });
    }

    return { data };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await apiSignOut();
    setLoading(false);

    if (error) {
      toast.show(error.message, {
        duration: 3000,
        customData: { theme: 'red' },
      });
      return { error };
    }

    toast.show('Signed out successfully', {
      duration: 2000,
      customData: { theme: 'green' },
    });

    return {};
  };

  const updatePassword = async (newPassword: string) => {
    setLoading(true);
    const { error } = await apiUpdatePassword(newPassword);
    setLoading(false);

    if (error) {
      toast.show(error.message, {
        duration: 30000,
        customData: { theme: 'red' },
      });
      return { error };
    }

    toast.show('Password updated successfully!', {
      duration: 10000,
      customData: { theme: 'green' },
    });

    return {};
  };

  const resetPassword = async (email: string, redirectTo?: string) => {
    setLoading(true);
    const { error } = await apiResetPasswordForEmail(email, redirectTo);
    setLoading(false);

    if (error) {
      toast.show(error.message, {
        duration: 3000,
        customData: { theme: 'red' },
      });
      return { error };
    }

    toast.show('Password reset email sent successfully!', {
      duration: 10000,
      customData: { theme: 'green' },
    });

    return {};
  };

  return {
    signIn,
    signUp,
    signOut,
    updatePassword,
    resetPassword,
    loading,
  };
}
