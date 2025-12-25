import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from './prisma';
import { settingsRepo } from '@/lib/repositories/settings-repo';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const providers: NonNullable<NextAuthOptions['providers']> = [];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
}

providers.push(
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
        select: {
          id: true,
          email: true,
          password: true,
          fullname: true,
          role: true,
          roleSelectedAt: true,
        },
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

      if (!isPasswordValid) {
        return null;
      }

      // Chặn đăng nhập nếu tài khoản đã bị khoá qua SystemSetting.disabled_users
      try {
        const disabledSetting = await settingsRepo.get('disabled_users');
        let isDisabled = false;
        if (Array.isArray(disabledSetting)) {
          for (const item of disabledSetting) {
            if (typeof item === 'string' && item === user.id) {
              isDisabled = true;
              break;
            }
            if (
              item &&
              typeof item === 'object' &&
              typeof (item as { id?: unknown }).id === 'string' &&
              (item as { id?: unknown }).id === user.id
            ) {
              isDisabled = true;
              break;
            }
          }
        }
        if (isDisabled) {
          // Trả về null để NextAuth coi là đăng nhập thất bại
          return null;
        }
      } catch (e) {
        console.error('[Auth] Lỗi khi kiểm tra disabled_users', e);
      }

      // Trả về user nếu xác thực thành công
      // Đảm bảo rằng đối tượng user trả về có ít nhất một trường `id` và `email`
      return {
        id: user.id,
        email: user.email,
        name: user.fullname,
        fullname: user.fullname, // Also include fullname explicitly
        role: user.role,
        roleSelectedAt: user.roleSelectedAt ? user.roleSelectedAt.toISOString() : null,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
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
      }
      
      // Khi session.update() được gọi, fetch lại role mới từ database
      // Điều này xảy ra khi user chọn role trong RoleSelector
      const tokenHasId = typeof token.id === 'string' && token.id.length > 0;
      const needsBackfill =
        tokenHasId &&
        (token.roleSelectedAt === undefined || token.role === undefined || token.fullname === undefined || token.name === undefined);

      const shouldRefresh = (!!user && !!user.id) || trigger === 'update' || needsBackfill;
      if (shouldRefresh) {
        try {
          const userId = user?.id ?? token.id;
          if (typeof userId !== 'string' || userId.length === 0) {
            return token;
          }

          const freshUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
              email: true,
              fullname: true,
              role: true,
              roleSelectedAt: true,
            },
          });

          if (freshUser) {
            token.email = freshUser.email;
            token.fullname = freshUser.fullname;
            token.name = freshUser.fullname;
            token.role = freshUser.role;
            token.roleSelectedAt = freshUser.roleSelectedAt ? freshUser.roleSelectedAt.toISOString() : null;
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
        session.user.fullname = token.fullname || '';
        session.user.role = token.role;
        session.user.roleSelectedAt = token.roleSelectedAt || null;
      }
      try {
        const cookieStore = cookies();
        const orgId = cookieStore.get('x-org-id')?.value || null;
        (session as unknown as { orgId?: string | null }).orgId = orgId;
      } catch {}
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
