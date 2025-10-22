import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-poppins",
});

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: {
        template: "%s | LMS Học Sinh THCS",
        default: "LMS - Hệ Thống Quản Lý Học Tập",
    },
    description:
        "Hệ thống quản lý học tập trực tuyến cho học sinh THCS - Lịch sử, Địa lý, Tiếng Anh",
    keywords: [
        "LMS",
        "học tập trực tuyến",
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
                className={`${poppins.variable} ${inter.variable} font-poppins antialiased`}
            >
                {children}
                <Toaster />
            </body>
        </html>
    );
}
