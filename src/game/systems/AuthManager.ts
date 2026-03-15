import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { getSupabase } from './SupabaseClient';

export type AuthListener = (user: User | null) => void;

export class AuthManager {
  private static instance: AuthManager;
  private user: User | null = null;
  private listeners: AuthListener[] = [];
  private initialized = false;

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const supabase = getSupabase();
    if (!supabase) return;

    // Get existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.user = session.user;
      this.notifyListeners();
    }

    // Listen for auth state changes (login, logout, token refresh)
    supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const prev = this.user;
      this.user = session?.user ?? null;
      if (prev?.id !== this.user?.id) {
        this.notifyListeners();
      }
    });
  }

  async signInWithEmail(email: string, password: string): Promise<{ error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Cloud saves not configured' };

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async signUpWithEmail(email: string, password: string): Promise<{ error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Cloud saves not configured' };

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return {};
  }

  async signInWithGoogle(): Promise<{ error?: string }> {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Cloud saves not configured' };

    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) return { error: error.message };
    return {};
  }

  async signOut(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
    this.user = null;
    this.notifyListeners();
  }

  getUser(): User | null {
    return this.user;
  }

  isSignedIn(): boolean {
    return this.user !== null;
  }

  getDisplayName(): string {
    if (!this.user) return 'Guest';
    return this.user.user_metadata?.full_name
      || this.user.email?.split('@')[0]
      || 'Player';
  }

  onAuthChange(listener: AuthListener): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn(this.user));
  }

  isAvailable(): boolean {
    return getSupabase() !== null;
  }
}
