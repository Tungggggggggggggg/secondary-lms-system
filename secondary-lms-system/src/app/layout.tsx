import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

// Configure Roboto font for the entire application
const roboto = Roboto({
    subsets: ["vietnamese", "latin"],
    weight: ["400", "500", "700", "900"],
    display: "swap",
    variable: "--font-roboto",
});

export const metadata: Metadata = {
    title: {
        template: "%s | LMS - Hệ Thống Học Tập THCS",
        default: "EduVerse - Học tập thông minh, tương lai rực rỡ",
    },
    description:
        "Nền tảng học trực tuyến hiện đại dành cho học sinh THCS. Học tập thông minh, tương lai rực rỡ ✨",
    keywords: [
        "LMS",
        "EduVerse", 
        "học trực tuyến",
        "THCS",
        "Lịch sử",
        "Địa lý",
        "Tiếng Anh",
    ],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <body
                className={`${roboto.variable} font-roboto antialiased`}
            >
                {children}
                <Toaster />
            </body>
        </html>
    );
}
