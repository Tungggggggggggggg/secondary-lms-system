import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mật khẩu', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // Trả về user nếu xác thực thành công
        // Đảm bảo rằng đối tượng user trả về có ít nhất một trường `id` và `email`
        return {
          id: user.id,
          email: user.email,
          name: user.fullname,
          fullname: user.fullname, // Also include fullname explicitly
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
    error: '/auth/login',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/register', // Trang đăng ký nếu cần
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Khi user đăng nhập lần đầu, lưu thông tin vào token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = (user as any).fullname || user.name || null;
        token.fullname = (user as any).fullname || null;
        token.role = user.role;
      }
      
      // Khi session.update() được gọi, fetch lại role mới từ database
      // Điều này xảy ra khi user chọn role trong RoleSelector
      if (trigger === 'update' && token.id) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true, email: true, fullname: true, role: true },
          });
          
          if (freshUser) {
            token.role = freshUser.role;
            token.fullname = freshUser.fullname;
            token.name = freshUser.fullname;
          }
        } catch (error) {
          console.error('[JWT Callback] Error fetching fresh user data:', error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = (token.name as string) || '';
        session.user.fullname = (token as any).fullname || '';
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
