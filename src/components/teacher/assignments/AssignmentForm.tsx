"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUploadAssignmentFiles } from "@/hooks/use-upload";

type AssignmentType = "ESSAY" | "QUIZ";

interface Props {
	classroomId?: string; // nếu tạo xong sẽ tự add vào lớp (tuỳ luồng sử dụng)
}

export default function AssignmentForm({ classroomId }: Props) {
	const { toast } = useToast();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [dueDate, setDueDate] = useState<string>("");
	const [type, setType] = useState<AssignmentType>("ESSAY");
	const [createdAssignmentId, setCreatedAssignmentId] = useState<string | null>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [isCreating, setIsCreating] = useState(false);

	const onSelectFiles = useCallback((list: FileList | null) => {
		if (!list) return;
		setFiles(Array.from(list));
	}, []);

	const onCreate = useCallback(async () => {
		try {
			if (!title.trim()) {
				toast({ title: "Thiếu tiêu đề", description: "Vui lòng nhập tiêu đề bài tập", variant: "destructive" });
				return;
			}
			setIsCreating(true);
			const res = await fetch("/api/assignments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ title, description, dueDate: dueDate || null, type }),
			});
			const json = await res.json();
			if (!res.ok) throw new Error(json?.message || "Không thể tạo bài tập");
			setCreatedAssignmentId(json.data.id);
			toast({ title: "Đã tạo bài tập", variant: "success" });
		} catch (e: any) {
			toast({ title: "Lỗi tạo bài tập", description: e.message, variant: "destructive" });
		} finally {
			setIsCreating(false);
		}
	}, [title, description, dueDate, type, toast]);

	const {
		isUploading,
		progressList,
		uploadFiles,
		cancelAll,
	} = useUploadAssignmentFiles(createdAssignmentId || "");

	const onUpload = useCallback(async () => {
		if (!createdAssignmentId) {
			toast({ title: "Chưa có bài tập", description: "Hãy tạo bài tập trước khi upload file", variant: "destructive" });
			return;
		}
		await uploadFiles(files);
	}, [createdAssignmentId, files, uploadFiles, toast]);

	return (
		<div className="space-y-4">
			<div className="grid gap-3">
				<label className="font-medium">Tiêu đề</label>
				<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề" />
			</div>
			<div className="grid gap-3">
				<label className="font-medium">Mô tả</label>
				<Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả chi tiết..." />
			</div>
			<div className="grid gap-3">
				<label className="font-medium">Hạn nộp</label>
				<Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
			</div>
			<div className="grid gap-3">
				<label className="font-medium">Loại bài tập</label>
				<select
					className="border rounded-md h-10 px-3"
					value={type}
					onChange={(e) => setType(e.target.value as AssignmentType)}
				>
					<option value="ESSAY">Tự luận</option>
					<option value="QUIZ">Trắc nghiệm</option>
				</select>
			</div>

			<div className="grid gap-3">
				<label className="font-medium">Đính kèm tài liệu</label>
				<div className="border-2 border-dashed rounded-md p-4 text-center">
					<input
						type="file"
						multiple
						onChange={(e) => onSelectFiles(e.target.files)}
					/>
					<div className="mt-2 text-sm text-gray-500">Hỗ trợ: PDF, DOCX, XLSX, PPTX, ZIP, PNG, JPG... (≤ 20MB)</div>
					{progressList.length > 0 && (
						<ul className="mt-3 space-y-1 text-left">
							{progressList.map((p) => (
								<li key={p.fileName} className="text-sm">{p.fileName}: {p.progress}%</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button onClick={onCreate} disabled={isCreating}>
					{isCreating ? "Đang tạo..." : "Tạo bài tập"}
				</Button>
				<Button onClick={onUpload} disabled={!createdAssignmentId || isUploading}>
					{isUploading ? "Đang upload..." : "Upload file"}
				</Button>
				{isUploading && (
					<Button variant="destructive" onClick={cancelAll}>Huỷ</Button>
				)}
			</div>
		</div>
	);
}


