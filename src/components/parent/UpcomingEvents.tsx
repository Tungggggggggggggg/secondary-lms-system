"use client";

import { Calendar, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: "assignment" | "exam" | "event";
  priority: "high" | "normal" | "low";
}

export default function UpcomingEvents() {
  // Mock data - trong thực tế sẽ fetch từ API
  const events: UpcomingEvent[] = [
    {
      id: "1",
      title: "Bài kiểm tra Toán học",
      date: "2024-12-05",
      time: "09:00",
      type: "exam",
      priority: "high",
    },
    {
      id: "2",
      title: "Nộp bài tập Tiếng Anh",
      date: "2024-12-06",
      time: "17:00",
      type: "assignment",
      priority: "high",
    },
    {
      id: "3",
      title: "Họp phụ huynh",
      date: "2024-12-10",
      time: "19:00",
      type: "event",
      priority: "normal",
    },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case "exam":
        return "📝";
      case "assignment":
        return "📋";
      case "event":
        return "📅";
      default:
        return "📌";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500 bg-red-50/30";
      case "normal":
        return "border-l-amber-500 bg-amber-50/30";
      case "low":
        return "border-l-green-500 bg-green-50/30";
      default:
        return "border-l-gray-500 bg-gray-50/30";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
  };

  return (
    <Card className="border-amber-100 hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700">
          <Calendar className="h-5 w-5" />
          Sự kiện sắp tới
        </CardTitle>
        <CardDescription>Những việc cần chú ý</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>Không có sự kiện sắp tới</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className={`border-l-4 rounded-lg p-3 transition-all duration-300 hover:shadow-md hover:scale-102 cursor-pointer group ${getPriorityColor(
                  event.priority
                )}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{getEventIcon(event.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 group-hover:text-amber-700 transition-colors duration-300 truncate">
                      {event.title}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.date)}
                      </span>
                      {event.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {event.time}
                        </span>
                      )}
                      {event.priority === "high" && (
                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                          <AlertCircle className="h-3 w-3" />
                          Quan trọng
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
