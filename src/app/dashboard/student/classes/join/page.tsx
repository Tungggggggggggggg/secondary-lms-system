// src/app/student/classes/join/page.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JoinClassPage() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg">
      <h1 className="text-2xl font-bold mb-6 text-center">Tham gia lớp học</h1>
      
      <form className="space-y-4">
        <div>
          <Label htmlFor="code">Mã lớp học</Label>
          <Input id="code" placeholder="Nhập mã 6 ký tự (VD: ABC123)" className="mt-1" />
        </div>
        
        <div>
          <Label htmlFor="password">Mật khẩu lớp (nếu có)</Label>
          <Input id="password" type="password" placeholder="Để trống nếu không có" className="mt-1" />
        </div>

        <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
          Tham gia lớp
        </Button>
      </form>
    </div>
  );
}