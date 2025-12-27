import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";
import { Toaster as SonnerToaster } from "sonner";
import NextAuthProvider from "@/components/providers/NextAuthProvider";
import { ConfirmProvider } from "@/components/providers/ConfirmProvider";
import { PromptProvider } from "@/components/providers/PromptProvider";
import CommandPaletteProvider from "@/components/providers/CommandPaletteProvider";
import SWRProvider from "@/components/providers/SWRProvider";
import TopLoaderProvider from "@/components/providers/TopLoaderProvider";

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
            {/*
              Một số extension (ví dụ: Grammarly) có thể tự động inject các data-attribute
              lên thẻ <body> (vd. data-new-gr-c-s-check-loaded, data-gr-ext-installed).
              Khi server-rendered HTML và client DOM không khớp về các attributes này,
              React sẽ log cảnh báo hydration mismatch.

              Để tránh cảnh báo không cần thiết trong dev, thêm các attribute này vào
              phần render server-side để đảm bảo server/client khớp. Việc này vô hại
              (chỉ thêm các thuộc tính rỗng) và giúp môi trường dev sạch hơn.
            */}
            <body
                className={`${roboto.variable} font-roboto antialiased`}
                suppressHydrationWarning={true}
                data-new-gr-c-s-check-loaded=""
                data-gr-ext-installed=""
            >
                <TopLoaderProvider />
                <NextAuthProvider>
                    <ConfirmProvider>
                        <PromptProvider>
                            <CommandPaletteProvider>
                                <SWRProvider>
                                    {children}
                                </SWRProvider>
                            </CommandPaletteProvider>
                        </PromptProvider>
                    </ConfirmProvider>
                </NextAuthProvider>
                <Toaster />
                <SonnerToaster position="top-right" />
            </body>
        </html>
    );
}