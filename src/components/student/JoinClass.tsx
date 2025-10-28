"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function JoinClass() {
	const [code, setCode] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();

	async function handleJoin(e: React.FormEvent) {
		e.preventDefault();
		if (!code.trim()) {
			toast({ title: "⚠️ Vui lòng nhập mã lớp học!", variant: "destructive" });
			return;
		}
		setIsSubmitting(true);
		try {
			// TODO: Gọi API tham gia lớp học bằng mã
			// await fetch("/api/classes/join", { method: "POST", body: JSON.stringify({ code }) })
			toast({ title: "✅ Đã gửi yêu cầu tham gia lớp!", description: `Mã: ${code.trim()}` });
			setCode("");
		} catch (err) {
			toast({ title: "❌ Không thể tham gia lớp", variant: "destructive" });
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="bg-white rounded-2xl shadow-lg p-6">
			<div className="mb-4">
				<h2 className="text-2xl font-extrabold text-gray-800">🔑 Tham gia lớp bằng mã</h2>
				<p className="text-sm text-gray-500 mt-1">Nhập mã do giáo viên cung cấp để vào lớp của bạn.</p>
			</div>
			<form onSubmit={handleJoin} className="flex items-center gap-3">
				<Input
					value={code}
					onChange={(e) => setCode(e.target.value)}
					placeholder="Nhập mã lớp (ví dụ: ABC123)"
					className="flex-1"
				/>
				<Button type="submit" disabled={isSubmitting}>
					{isSubmitting ? "Đang gửi..." : "Tham gia"}
				</Button>
			</form>
		</div>
	);
}
