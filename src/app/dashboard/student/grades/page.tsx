// src/app/student/grades/page.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function GradesPage() {
  const grades = [
    { className: "Lịch sử 8A", assignment: "BT1", score: 9.0, comment: "Tốt" },
    { className: "Lịch sử 8A", assignment: "BT2", score: 8.5, comment: "" },
    { className: "Địa lý 9D", assignment: "BT1", score: 7.5, comment: "Cần cố gắng" },
    { className: "Tiếng Anh 7", assignment: "Project", score: 9.5, comment: "Xuất sắc" },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Điểm số của tôi</h1>
        <p className="text-lg text-green-600 font-medium">Điểm trung bình: 8.5</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lớp học</TableHead>
            <TableHead>Bài tập</TableHead>
            <TableHead>Điểm</TableHead>
            <TableHead>Nhận xét</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((g, i) => (
            <TableRow key={i}>
              <TableCell>{g.className}</TableCell>
              <TableCell>{g.assignment}</TableCell>
              <TableCell className="font-medium">{g.score}</TableCell>
              <TableCell>{g.comment}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}