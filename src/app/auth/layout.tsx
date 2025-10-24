import { Metadata } from "next";

export const metadata: Metadata = {
    title: {
        template: "%s | LMS Học Sinh",
        default: "Xác thực | LMS Học Sinh",
    },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
