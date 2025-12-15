import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleToDashboard: Record<string, string> = {
    TEACHER: "/dashboard/teacher/dashboard",
    STUDENT: "/dashboard/student/dashboard",
    PARENT: "/dashboard/parent/dashboard",
    ADMIN: "/dashboard/admin/dashboard",
};

export async function middleware(req: NextRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Lấy token nếu có để biết vai trò người dùng
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token?.role as string | undefined) ?? undefined;
    const roleSelectedAt = token?.roleSelectedAt as string | null | undefined;
    const isAdmin = role === 'ADMIN';
    const hasSelectedRole = isAdmin || (roleSelectedAt !== null && roleSelectedAt !== undefined);
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        console.log('[Middleware]', {
            pathname,
            hasToken: !!token,
            role: role || 'none',
            roleSelectedAt:
                roleSelectedAt === undefined ? 'missing' : roleSelectedAt === null ? 'null' : roleSelectedAt,
        });
    }

    // Bảo vệ API admin: chỉ cho phép ADMIN
    if (pathname.startsWith('/api/admin')) {
        if (!token) {
            return NextResponse.json(
                { success: false, error: true, message: 'Unauthorized', details: null },
                { status: 401 }
            );
        }
        if (role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: true, message: 'Forbidden - Admins only', details: null },
                { status: 403 }
            );
        }
        return NextResponse.next();
    }

    if (token && !hasSelectedRole && !pathname.startsWith('/auth/select-role')) {
        return NextResponse.redirect(new URL('/auth/select-role', url));
    }

    if (token && hasSelectedRole && pathname.startsWith('/auth/select-role')) {
        const target = role ? roleToDashboard[role] : "/";
        if (target && pathname !== target) {
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Nếu đã đăng nhập và đang vào trang login, chuyển hướng về dashboard theo vai trò
    if (token && pathname.startsWith("/auth/login")) {
        const target = hasSelectedRole ? (role ? roleToDashboard[role] : "/") : "/auth/select-role";
        if (target && pathname !== target) {
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Điều hướng trang gốc hoặc '/dashboard' đến dashboard theo vai trò nếu đã đăng nhập
    if (token && (pathname === "/" || pathname === "/dashboard")) {
        const target = hasSelectedRole ? (role ? roleToDashboard[role] : "/") : "/auth/select-role";
        if (target && pathname !== target) {
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Chặn truy cập admin dashboard nếu không phải ADMIN
    if (pathname.startsWith('/dashboard/admin')) {
        if (!token) {
            return NextResponse.redirect(new URL('/auth/login', url));
        }
        if (role !== 'ADMIN') {
            const target = role ? (roleToDashboard[role] ?? '/') : '/';
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Chặn truy cập cross-role: nếu vào teacher nhưng không phải TEACHER
    if (pathname.startsWith('/dashboard/teacher') && role && role !== 'TEACHER') {
        const target = roleToDashboard[role] ?? '/';
        return NextResponse.redirect(new URL(target, url));
    }
    if (pathname.startsWith('/dashboard/student') && role && role !== 'STUDENT') {
        const target = roleToDashboard[role] ?? '/';
        return NextResponse.redirect(new URL(target, url));
    }
    if (pathname.startsWith('/dashboard/parent') && role && role !== 'PARENT') {
        const target = roleToDashboard[role] ?? '/';
        return NextResponse.redirect(new URL(target, url));
    }

    // Nếu chưa đăng nhập mà truy cập vùng dashboard -> chuyển login
    if (!token && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/auth/login', url));
    }

    if (!token && pathname.startsWith('/auth/select-role')) {
        return NextResponse.redirect(new URL('/auth/login', url));
    }

    // Chuẩn hóa truy cập root theo vai trò (vd '/dashboard/teacher' -> '/dashboard/teacher/dashboard')
    if (pathname === "/dashboard/teacher" || pathname === "/dashboard/student" || pathname === "/dashboard/parent" || pathname === "/dashboard/admin") {
        const normalized = `${pathname}/dashboard`;
        return NextResponse.redirect(new URL(normalized, url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/api/admin/:path*",
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
