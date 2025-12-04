import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useRoleTheme } from "@/components/providers/RoleThemeProvider";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onClose?: () => void;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => onOpenChange(false)}
    >
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const theme = useRoleTheme();
    
    // Xác định màu nút đóng theo role
    const colorKey: "green" | "blue" | "amber" =
      theme?.color === "green" ? "green" : theme?.color === "amber" ? "amber" : "blue";
    const closeButtonColorClass = {
      green: "text-green-600 hover:bg-green-50",
      blue: "text-blue-600 hover:bg-blue-50",
      amber: "text-amber-600 hover:bg-amber-50",
    }[colorKey];
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col border border-gray-100",
          className
        )}
        {...props}
      >
        {/* Close button (X) */}
        <button
          onClick={onClose}
          className={cn(
            "absolute top-4 right-4 p-2 rounded-lg transition-colors z-10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            closeButtonColorClass,
            "focus-visible:ring-current"
          )}
          aria-label="Đóng dialog"
        >
          <X className="h-5 w-5" />
        </button>
        
        {children}
      </div>
    );
  }
);
DialogContent.displayName = "DialogContent";

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "parent" | "teacher" | "student";
}

const headerVariants = {
  default: "bg-white border-b border-gray-200",
  parent: "bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200",
  teacher: "bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200",
  student: "bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200",
};

const DialogHeader = ({ className, variant = "default", ...props }: DialogHeaderProps) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left px-6 py-5",
      headerVariants[variant],
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  variant?: "default" | "parent" | "teacher" | "student";
}

const titleVariants = {
  default: "text-gray-800",
  parent: "text-amber-900",
  teacher: "text-blue-900",
  student: "text-green-900",
};

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "text-2xl font-bold leading-none tracking-tight",
        titleVariants[variant],
        className
      )}
      {...props}
    />
  )
);
DialogTitle.displayName = "DialogTitle";

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "default" | "parent" | "teacher" | "student";
}

const descriptionVariants = {
  default: "text-gray-600",
  parent: "text-amber-700",
  teacher: "text-blue-700",
  student: "text-green-700",
};

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-base mt-2 font-medium", descriptionVariants[variant], className)}
      {...props}
    />
  )
);
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 px-6 py-5 border-t border-gray-100 bg-gray-50/50",
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};


