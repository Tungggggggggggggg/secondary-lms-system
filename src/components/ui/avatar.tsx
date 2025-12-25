import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Props cho Avatar component
 */
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Tên đầy đủ để hiển thị initials */
    fullname?: string;
    /** Email để lấy initials fallback */
    email?: string;
    /** URL hình ảnh avatar (optional) */
    src?: string;
    /** Kích thước avatar: 'sm' | 'md' | 'lg' | 'xl' */
    size?: "sm" | "md" | "lg" | "xl";
    /** Custom className */
    className?: string;
}

/**
 * Component Avatar hiển thị initials hoặc hình ảnh avatar
 * 
 * @param props - Props của component
 * @returns JSX element hiển thị avatar
 */
export default function Avatar({
    fullname = "",
    email = "",
    src,
    size = "md",
    className,
    ...props
}: AvatarProps) {
    // Lấy initials từ fullname hoặc email
    const getInitials = (): string => {
        if (fullname) {
            const words = fullname.trim().split(/\s+/);
            if (words.length >= 2) {
                // Lấy chữ cái đầu của từ đầu và từ cuối
                return (words[0][0] + words[words.length - 1][0]).toUpperCase();
            } else if (words.length === 1 && words[0].length > 0) {
                // Nếu chỉ có 1 từ, lấy 2 chữ cái đầu
                return words[0].substring(0, 2).toUpperCase();
            }
        }
        
        // Fallback: lấy từ email
        if (email) {
            const emailPrefix = email.split("@")[0];
            if (emailPrefix.length >= 2) {
                return emailPrefix.substring(0, 2).toUpperCase();
            }
            return emailPrefix[0]?.toUpperCase() || "?";
        }
        
        return "?";
    };

    // Size mapping
    const sizeClasses = {
        sm: "h-6 w-6 text-xs",
        md: "h-8 w-8 text-sm",
        lg: "h-10 w-10 text-base",
        xl: "h-12 w-12 text-lg",
    };

    // Gradient colors dựa trên initials
    const getGradientColor = (initials: string): string => {
        const colors = [
            "from-blue-500 to-blue-600",
            "from-purple-500 to-purple-600",
            "from-pink-500 to-pink-600",
            "from-indigo-500 to-indigo-600",
            "from-violet-500 to-violet-600",
            "from-cyan-500 to-cyan-600",
            "from-emerald-500 to-emerald-600",
            "from-amber-500 to-amber-600",
            "from-orange-500 to-orange-600",
            "from-red-500 to-red-600",
        ];
        
        // Chọn màu dựa trên ký tự đầu của initials
        const index = initials.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const initials = getInitials();
    const gradientColor = getGradientColor(initials);

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full flex-shrink-0 font-semibold text-white",
                sizeClasses[size],
                className
            )}
            {...props}
        >
            {src ? (
                <img
                    src={src}
                    alt={fullname || email || "Avatar"}
                    className="h-full w-full rounded-full object-cover"
                />
            ) : (
                <div
                    className={cn(
                        "h-full w-full rounded-full flex items-center justify-center bg-gradient-to-br",
                        gradientColor
                    )}
                >
                    {initials}
                </div>
            )}
        </div>
    );
}

