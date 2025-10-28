// src/app/student/assignments/page.tsx
import { Button } from "@/components/ui/button";
import Badge from "@/components/ui/badge";

export default function AssignmentsPage() {
  const assignments = [
    {
      id: "asg_1",
      title: "Bài tập Lịch sử chương 3",
      className: "Lịch sử 8A",
      subject: "history",
      dueDate: "28/10, 23:59",
      status: "pending", // pending, submitted, late
      isUrgent: true,
    },
    // ...
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Bài tập của tôi</h1>

      <div className="space-y-4">
        {assignments.map((asg) => (
          <div key={asg.id} className="border rounded-lg p-4 flex justify-between items-center">
            <div>
              {asg.isUrgent && <Badge className="bg-red-600 mb-2">SẮP HẾT HẠN</Badge>}
              <h3 className="font-medium">{asg.title}</h3>
              <p className="text-sm text-gray-600">{asg.className}</p>
              <p className="text-sm">Hạn: {asg.dueDate}</p>
            </div>
            <Button variant={asg.status === "submitted" ? "outline" : "default"}>
              {asg.status === "submitted" ? "Xem" : "Làm"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}