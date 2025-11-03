import { useCallback, useRef, useState } from "react";
import { useToast } from "./use-toast";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const MIME_WHITELIST = new Set([
	"application/pdf",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.ms-powerpoint",
	"text/plain",
	"application/zip",
	"application/x-zip-compressed",
	"image/png",
	"image/jpeg",
	"image/webp",
	"text/x-python",
	"text/x-shellscript",
	"application/x-javascript",
]);

export interface UploadProgress {
	fileName: string;
	progress: number; // 0..100
}

export function useUploadAssignmentFiles(assignmentId: string) {
	const { toast } = useToast();
	const [isUploading, setIsUploading] = useState(false);
	const [progressList, setProgressList] = useState<UploadProgress[]>([]);
	const xhrRefs = useRef<XMLHttpRequest[]>([]);

	const validateFile = useCallback((file: File) => {
		if (file.size > MAX_FILE_SIZE) {
			throw new Error("File vượt quá giới hạn 20MB");
		}
		if (file.type && !MIME_WHITELIST.has(file.type)) {
			throw new Error("Định dạng file không được hỗ trợ");
		}
	}, []);

	const uploadSingle = useCallback(
		(file: File): Promise<{ path: string; name: string; mimeType: string; size: number }>
			=> {
			return new Promise((resolve, reject) => {
				try {
					validateFile(file);
				} catch (e: any) {
					reject(e);
					return;
				}

				const form = new FormData();
				form.append("file", file);

				const xhr = new XMLHttpRequest();
				xhrRefs.current.push(xhr);

				xhr.upload.onprogress = (evt) => {
					if (evt.lengthComputable) {
						const pct = Math.round((evt.loaded / evt.total) * 100);
						setProgressList((prev) => {
							const next = [...prev];
							const idx = next.findIndex((p) => p.fileName === file.name);
							if (idx >= 0) next[idx] = { fileName: file.name, progress: pct };
							else next.push({ fileName: file.name, progress: pct });
							return next;
						});
					}
				};

				xhr.onreadystatechange = () => {
					if (xhr.readyState === 4) {
						if (xhr.status >= 200 && xhr.status < 300) {
							try {
								const json = JSON.parse(xhr.responseText);
								resolve(json.data);
							} catch (err) {
								reject(err);
							}
						} else if (xhr.status >= 400) {
							try {
								const json = JSON.parse(xhr.responseText);
								reject(new Error(json?.message || "Upload failed"));
							} catch {
								reject(new Error("Upload failed"));
							}
						}
					}
				};

				xhr.open("POST", `/api/assignments/${assignmentId}/upload`, true);
				xhr.send(form);
			});
		},
		[assignmentId, validateFile]
	);

	const uploadFiles = useCallback(
		async (files: FileList | File[]) => {
			if (!files || (Array.isArray(files) && files.length === 0)) return [];
			setIsUploading(true);
			setProgressList([]);
			try {
				const fileArray = Array.isArray(files) ? files : Array.from(files);
				const results = await Promise.all(
					fileArray.map((f) =>
						uploadSingle(f).catch((err) => {
							toast({
								title: "Upload thất bại",
								description: `${f.name}: ${err.message}`,
								variant: "destructive",
							});
							return null as any;
						})
					)
				);
				const ok = results.filter(Boolean);
				if (ok.length) {
					toast({ title: "Upload thành công", description: `${ok.length} file đã được tải lên`, variant: "success" });
				}
				return ok;
			} finally {
				setIsUploading(false);
			}
		},
		[toast, uploadSingle]
	);

	const cancelAll = useCallback(() => {
		xhrRefs.current.forEach((x) => {
			try { x.abort(); } catch {}
		});
		xhrRefs.current = [];
		setIsUploading(false);
	}, []);

	return {
		isUploading,
		progressList,
		uploadFiles,
		cancelAll,
	};
}


