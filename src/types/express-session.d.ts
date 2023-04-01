import 'express-session';

declare module 'express-session' {
  export interface Session {
    clearSession(): Promise<void>; // DO NOT MODIFY THIS!

    // Custom session properties for our application
    userId?: string;
    username?: string;
    isPro?: boolean;
    isAdmin?: boolean;
    isLoggedIn?: boolean;
  }
}
