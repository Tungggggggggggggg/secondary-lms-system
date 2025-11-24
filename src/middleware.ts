import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const roleToDashboard: Record<string, string> = {
    SUPER_ADMIN: "/dashboard/admin/system",
    STAFF: "/dashboard/admin/overview",
    TEACHER: "/dashboard/teacher/dashboard",
    STUDENT: "/dashboard/student/dashboard",
    PARENT: "/dashboard/parent/dashboard",
};

export async function middleware(req: NextRequest) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Lấy token nếu có để biết vai trò người dùng
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const role = (token?.role as string | undefined) ?? undefined;
    
    // Logging để debug
    console.log('[Middleware]', {
        pathname,
        hasToken: !!token,
        role: role || 'none',
        userId: token?.id || 'none'
    });

    // Nếu đã đăng nhập và đang vào trang login, chuyển hướng về dashboard theo vai trò
    if (token && pathname.startsWith("/auth/login")) {
        const target = role ? roleToDashboard[role] : "/";
        if (target && pathname !== target) {
            console.log('[Middleware] Redirecting from login to dashboard', { role, target });
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Điều hướng trang gốc hoặc '/dashboard' đến dashboard theo vai trò nếu đã đăng nhập
    if (token && (pathname === "/" || pathname === "/dashboard")) {
        const target = role ? roleToDashboard[role] : "/";
        if (target && pathname !== target) {
            console.log('[Middleware] Redirecting from root to dashboard', { role, target });
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Chặn truy cập cross-role: nếu vào teacher nhưng không phải TEACHER
    if (pathname.startsWith('/dashboard/teacher') && role && role !== 'TEACHER') {
        const target = roleToDashboard[role] ?? '/';
        console.log('[Middleware] Cross-role access blocked - teacher', { currentRole: role, target });
        return NextResponse.redirect(new URL(target, url));
    }
    if (pathname.startsWith('/dashboard/student') && role && role !== 'STUDENT') {
        const target = roleToDashboard[role] ?? '/';
        console.log('[Middleware] Cross-role access blocked - student', { currentRole: role, target });
        return NextResponse.redirect(new URL(target, url));
    }
    if (pathname.startsWith('/dashboard/parent') && role && role !== 'PARENT') {
        const target = roleToDashboard[role] ?? '/';
        console.log('[Middleware] Cross-role access blocked - parent', { currentRole: role, target });
        return NextResponse.redirect(new URL(target, url));
    }

    // Chặn truy cập khu vực admin: chỉ STAFF hoặc SUPER_ADMIN được phép
    if (pathname.startsWith('/dashboard/admin')) {
        if (!role || (role !== 'STAFF' && role !== 'SUPER_ADMIN')) {
            const target = role ? roleToDashboard[role] ?? '/' : '/auth/login';
            console.log('[Middleware] Admin access denied', { role, target });
            return NextResponse.redirect(new URL(target, url));
        }
        // Các khu vực chỉ dành cho SUPER_ADMIN
        if (
            role === 'STAFF' && (
                pathname.startsWith('/dashboard/admin/users') ||
                pathname.startsWith('/dashboard/admin/system') ||
                pathname.startsWith('/dashboard/admin/audit') ||
                pathname.startsWith('/dashboard/admin/moderation')
            )
        ) {
            const target = roleToDashboard['STAFF'];
            console.log('[Middleware] Super-admin-only area blocked for STAFF', { pathname, role, target });
            return NextResponse.redirect(new URL(target, url));
        }
        // Chuẩn hóa: '/dashboard/admin' -> role cụ thể
        if (pathname === '/dashboard/admin') {
            const target = role === 'SUPER_ADMIN' ? roleToDashboard['SUPER_ADMIN'] : roleToDashboard['STAFF'];
            console.log('[Middleware] Normalizing admin path', { role, target });
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Nếu chưa đăng nhập mà truy cập vùng dashboard -> chuyển login
    if (!token && pathname.startsWith('/dashboard')) {
        console.log('[Middleware] Unauthenticated access to dashboard, redirecting to login');
        return NextResponse.redirect(new URL('/auth/login', url));
    }

    // Chuẩn hóa truy cập root theo vai trò (vd '/dashboard/teacher' -> '/dashboard/teacher/dashboard')
    if (pathname === "/dashboard/teacher" || pathname === "/dashboard/student" || pathname === "/dashboard/parent") {
        const normalized = `${pathname}/dashboard`;
        console.log('[Middleware] Normalizing dashboard path', { from: pathname, to: normalized });
        return NextResponse.redirect(new URL(normalized, url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
