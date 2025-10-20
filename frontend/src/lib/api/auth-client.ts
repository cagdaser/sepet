import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",
});

// Auth utilities with toast notifications
export const authUtils = {
  // Sign up with email and password
  async signUp(data: { 
    email: string; 
    password: string; 
    name: string;
  }) {
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.data) {
        toast.success("Hesabınız başarıyla oluşturuldu!");
        return { success: true, data: result.data };
      } else {
        toast.error("Kayıt sırasında bir hata oluştu.");
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error("Beklenmeyen bir hata oluştu.");
      return { success: false, error };
    }
  },

  // Sign in with email and password
  async signIn(data: { 
    email: string; 
    password: string;
  }) {
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.data) {
        toast.success("Giriş başarılı!");
        return { success: true, data: result.data };
      } else {
        toast.error("E-posta veya şifre hatalı.");
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Giriş sırasında bir hata oluştu.");
      return { success: false, error };
    }
  },

  // Sign in with Google
  async signInWithGoogle() {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error("Google ile giriş başarısız.");
    }
  },

  // Sign out
  async signOut() {
    try {
      await authClient.signOut();
      toast.success("Çıkış yapıldı.");
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Çıkış sırasında bir hata oluştu.");
      return { success: false, error };
    }
  },

  // Get session
  async getSession() {
    try {
      const session = await authClient.getSession();
      return session;
    } catch (error) {
      console.error("Get session error:", error);
      return null;
    }
  },

  // Use session hook
  useSession: () => {
    return authClient.useSession();
  },
};

export default authClient;
