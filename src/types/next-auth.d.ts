import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      role?: string | null;
      fullname?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string | null;
    fullname?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT {
    id: string;
    role?: string | null;
    fullname?: string | null;
  }
}
