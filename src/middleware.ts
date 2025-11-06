import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const roleToDashboard: Record<string, string> = {
    SUPER_ADMIN: "/dashboard/admin/system",
    ADMIN: "/dashboard/admin/overview",
    TEACHER: "/dashboard/teacher/dashboard",
    STUDENT: "/dashboard/student/dashboard",
    PARENT: "/dashboard/parent/dashboard",
};

export async function middleware(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Lấy token nếu có để biết vai trò người dùng
    const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
    const role = (token?.role as string | undefined) ?? undefined;

    // Nếu đã đăng nhập và đang vào trang login, chuyển hướng về dashboard theo vai trò
    if (token && pathname.startsWith("/auth/login")) {
        const target = role ? roleToDashboard[role] : "/";
        if (target && pathname !== target) {
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Điều hướng trang gốc hoặc '/dashboard' đến dashboard theo vai trò nếu đã đăng nhập
    if (token && (pathname === "/" || pathname === "/dashboard")) {
        const target = role ? roleToDashboard[role] : "/";
        if (target && pathname !== target) {
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

    // Chặn truy cập khu vực admin: chỉ ADMIN hoặc SUPER_ADMIN được phép
    if (pathname.startsWith('/dashboard/admin')) {
        if (!role || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
            const target = role ? roleToDashboard[role] ?? '/' : '/auth/login';
            return NextResponse.redirect(new URL(target, url));
        }
        // Chuẩn hóa: '/dashboard/admin' -> role cụ thể
        if (pathname === '/dashboard/admin') {
            const target = role === 'SUPER_ADMIN' ? roleToDashboard['SUPER_ADMIN'] : roleToDashboard['ADMIN'];
            return NextResponse.redirect(new URL(target, url));
        }
    }

    // Nếu chưa đăng nhập mà truy cập vùng dashboard -> chuyển login
    if (!token && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/auth/login', url));
    }

    // Chuẩn hóa truy cập root theo vai trò (vd '/dashboard/teacher' -> '/dashboard/teacher/dashboard')
    if (pathname === "/dashboard/teacher" || pathname === "/dashboard/student" || pathname === "/dashboard/parent") {
        const normalized = `${pathname}/dashboard`;
        return NextResponse.redirect(new URL(normalized, url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
    ],
};
