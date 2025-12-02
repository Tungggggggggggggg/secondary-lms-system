"use client";

import Link from "next/link";
import { MessageSquare, BarChart3, Users, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  href: string;
  color: string;
  hoverColor: string;
}

export default function QuickActions() {
  const actions: QuickAction[] = [
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: "Tin nhắn",
      href: "/dashboard/parent/messages",
      color: "bg-blue-100 text-blue-600",
      hoverColor: "hover:bg-blue-200 hover:text-blue-700",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Tiến độ",
      href: "/dashboard/parent/progress",
      color: "bg-green-100 text-green-600",
      hoverColor: "hover:bg-green-200 hover:text-green-700",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Giáo viên",
      href: "/dashboard/parent/teachers",
      color: "bg-purple-100 text-purple-600",
      hoverColor: "hover:bg-purple-200 hover:text-purple-700",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Hồ sơ",
      href: "/dashboard/parent/profile",
      color: "bg-amber-100 text-amber-600",
      hoverColor: "hover:bg-amber-200 hover:text-amber-700",
    },
  ];

  return (
    <Card className="border-amber-100 hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-amber-700">Hành động nhanh</CardTitle>
        <CardDescription>Truy cập nhanh các chức năng</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <Link key={action.label} href={action.href}>
              <div
                className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 transition-all duration-300 ${action.color} ${action.hoverColor} hover:shadow-md hover:scale-105 cursor-pointer group`}
              >
                <div className="transition-transform duration-300 group-hover:scale-110">
                  {action.icon}
                </div>
                <p className="text-xs font-semibold mt-2 text-center">{action.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
