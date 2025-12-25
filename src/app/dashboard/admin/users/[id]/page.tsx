"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminUserOverview from "@/components/admin/AdminUserOverview";
import AdminUserSectionCard from "@/components/admin/AdminUserSectionCard";
import { useToast } from "@/hooks/use-toast";
import { usePrompt } from "@/components/providers/PromptProvider";
import Button from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Input from "@/components/ui/input";
import { BookOpenCheck, LineChart, Users } from "lucide-react";

type UserStats = {
  teacherClassrooms: number;
  studentEnrollments: number;
  parentRelations: number;
};

type UserDetail = {
  id: string;
  email: string;
  fullname: string;
  role: "TEACHER" | "STUDENT" | "PARENT" | "ADMIN" | string;
  roleSelectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDisabled: boolean;
  disabledReason: string | null;
  stats: UserStats;
};

type ApiSuccess = {
  success: true;
  data: {
    user: UserDetail;
    related: {
      teacherClassrooms: { id: string; name: string; code: string; isActive: boolean; createdAt: string }[];
      studentClassrooms: {
        id: string;
        joinedAt: string;
        classroom: {
          id: string;
          name: string;
          code: string;
          isActive: boolean;
          createdAt: string;
          teacher: { id: string; fullname: string; email: string };
        };
      }[];
      parentChildren: {
        id: string;
        createdAt: string;
        status: string;
        student: { id: string; fullname: string; email: string };
      }[];
      studentParents: {
        id: string;
        createdAt: string;
        status: string;
        parent: { id: string; fullname: string; email: string };
      }[];
    };
  };
};

/**
 * Admin User Detail page.
 *
 * Side effects:
 * - Fetch user detail
 * - Ban/unban user
 * - Reset password user
 */
export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();
  const prompt = usePrompt();

  const userId = params.id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<UserDetail | null>(null);

  const [related, setRelated] = useState<ApiSuccess["data"]["related"] | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editFullname, setEditFullname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/users/${userId}`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as unknown;

      const ok =
        typeof json === "object" &&
        json !== null &&
        (json as { success?: unknown }).success === true;

      if (!res.ok || !ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Không thể tải chi tiết người dùng";
        throw new Error(msg);
      }

      const data = (json as ApiSuccess).data;
      setUser(data.user);
      setRelated(data.related ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setUser(null);
      setRelated(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleBan = async () => {
    if (!user) return;
    if (String(user.role) === "ADMIN") return;

    const action = user.isDisabled ? "UNBAN" : "BAN";

    let reason: string | undefined = undefined;
    if (action === "BAN") {
      const input = await prompt({
        title: "Khoá tài khoản",
        description: `Nhập lý do khoá tài khoản cho ${user.email} (tùy chọn)`,
        placeholder: "Ví dụ: Vi phạm quy định sử dụng hệ thống…",
        type: "textarea",
        confirmText: "Khoá tài khoản",
        cancelText: "Hủy",
        validate: (v) => (v.length > 500 ? "Vui lòng nhập tối đa 500 ký tự" : null),
      });
      if (input === null) return;
      reason = input.trim() || undefined;
    }

    try {
      const res = await fetch(`/api/admin/users/${user.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const json = (await res.json().catch(() => ({}))) as unknown;

      const ok =
        typeof json === "object" &&
        json !== null &&
        (json as { success?: unknown }).success === true;

      if (!res.ok || !ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          typeof (json as { message?: unknown }).message === "string"
            ? (json as { message: string }).message
            : "Không thể cập nhật trạng thái tài khoản";
        throw new Error(msg);
      }

      await fetchDetail();
    } catch (e) {
      toast({
        title: "Không thể cập nhật trạng thái",
        description: e instanceof Error ? e.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
      });
    } catch {
      return iso;
    }
  };

  const openEdit = () => {
    if (!user) return;
    if (String(user.role) === "ADMIN") return;
    setEditError(null);
    setEditFullname(user.fullname || "");
    setEditEmail(user.email || "");
    const normalizedRole = String(user.role).toUpperCase();
    setEditRole(
      normalizedRole === "STUDENT" ? "STUDENT" : normalizedRole === "PARENT" ? "PARENT" : "TEACHER"
    );
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (String(user.role) === "ADMIN") return;

    try {
      setEditSaving(true);
      setEditError(null);

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: editFullname,
          email: editEmail,
          role: editRole,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || "Không thể cập nhật người dùng");
      }

      setEditOpen(false);
      await fetchDetail();

      toast({
        title: "Đã cập nhật người dùng",
        description: editEmail.trim() ? `Đã cập nhật: ${editEmail.trim()}` : "Đã cập nhật thông tin người dùng.",
        variant: "success",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra";
      setEditError(msg);
      toast({
        title: "Không thể cập nhật",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const userRole = user ? String(user.role) : "";

  return (
    <div className="p-6 sm:p-8 space-y-6">
      <AdminPageHeader
        title={user ? user.fullname || user.email : "Chi tiết người dùng"}
        subtitle={
          user
            ? `${user.email} — ${String(user.role)}`
            : "Xem thông tin tài khoản, tổ chức tham gia và audit logs liên quan"
        }
        label="Quản lý người dùng"
        actions={
          <Button asChild variant="outline" size="sm" color="slate">
            <Link href="/dashboard/admin/users">Quay lại danh sách</Link>
          </Button>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading && !user ? (
        <Card className="p-6 text-sm text-muted-foreground">Đang tải...</Card>
      ) : null}

      {user ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)] xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1.75fr)] items-start">
          <div className="space-y-4">
            <AdminUserOverview
              email={user.email}
              fullname={user.fullname}
              role={userRole}
              createdAt={formatTime(user.createdAt)}
              updatedAt={formatTime(user.updatedAt)}
              roleSelectedAt={user.roleSelectedAt ? formatTime(user.roleSelectedAt) : null}
              isDisabled={user.isDisabled}
              disabledReason={user.disabledReason}
              teacherClassrooms={user.stats.teacherClassrooms}
              studentEnrollments={user.stats.studentEnrollments}
              parentRelations={user.stats.parentRelations}
              actions={
                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    color="blue"
                    disabled={loading || userRole === "ADMIN"}
                    onClick={openEdit}
                  >
                    Chỉnh sửa
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    color="slate"
                    disabled={loading || userRole === "ADMIN"}
                    onClick={() => void toggleBan()}
                    className={
                      user.isDisabled
                        ? "border-border text-foreground hover:bg-muted/60"
                        : "border-destructive/15 text-destructive hover:bg-destructive/10"
                    }
                  >
                    {user.isDisabled ? "Mở khoá" : "Khoá tài khoản"}
                  </Button>
                </div>
              }
            />
          </div>

          <div className="space-y-5">
            {user && userRole === "TEACHER" && related?.teacherClassrooms ? (
              <AdminUserSectionCard
                title="Lớp đang dạy"
                description="Danh sách lớp (GV)"
                count={related.teacherClassrooms.length}
                tone="primary"
              >
                {related.teacherClassrooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-indigo-200/80 bg-indigo-50/40 px-6 py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600">
                      <BookOpenCheck className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Chưa có lớp nào</p>
                      
                    </div>
                  
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border overflow-hidden bg-background/80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Lớp</TableHead>
                          <TableHead className="text-xs font-semibold">Code</TableHead>
                          <TableHead className="text-xs font-semibold">Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {related.teacherClassrooms.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell className="py-2">
                              <Link
                                href={`/dashboard/admin/classrooms/${c.id}`}
                                className="font-semibold text-foreground hover:underline"
                              >
                                {c.name}
                              </Link>
                              <div className="text-[10px] text-muted-foreground">{c.id}</div>
                            </TableCell>
                            <TableCell className="py-2 text-foreground/80">{c.code}</TableCell>
                            <TableCell className="py-2 text-[10px] font-semibold text-foreground/80">
                              {c.isActive ? "ACTIVE" : "INACTIVE"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AdminUserSectionCard>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <QuickStatCard
                icon={BookOpenCheck}
                label="Lớp (GV)"
                value={user.stats.teacherClassrooms}
              />
              <QuickStatCard
                icon={Users}
                label="Lớp (HS)"
                value={user.stats.studentEnrollments}
              />
              <QuickStatCard
                icon={LineChart}
                label="Liên kết (PH)"
                value={user.stats.parentRelations}
              />
            </div>

            {user && userRole === "STUDENT" && related?.studentClassrooms ? (
              <AdminUserSectionCard
                title="Lớp đang học"
                description="Danh sách lớp (HS)"
                count={related.studentClassrooms.length}
              >
                {related.studentClassrooms.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Chưa tham gia lớp nào.</div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Lớp</TableHead>
                          <TableHead className="text-xs font-semibold">Giáo viên</TableHead>
                          <TableHead className="text-xs font-semibold">Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {related.studentClassrooms.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="py-2">
                              <Link href={`/dashboard/admin/classrooms/${m.classroom.id}`} className="font-semibold text-foreground hover:underline">
                                {m.classroom.name}
                              </Link>
                              <div className="text-[10px] text-muted-foreground">{m.classroom.code}</div>
                            </TableCell>
                            <TableCell className="py-2 text-foreground/80">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">{m.classroom.teacher.fullname}</span>
                                <span className="text-[10px] text-muted-foreground">{m.classroom.teacher.email}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 whitespace-nowrap text-[10px] text-muted-foreground">
                              {formatTime(m.joinedAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AdminUserSectionCard>
            ) : null}

            {user && userRole === "STUDENT" && related?.studentParents ? (
              <AdminUserSectionCard
                title="Phụ huynh liên kết"
                description="Danh sách PH liên kết với học sinh"
                count={related.studentParents.length}
              >
                {related.studentParents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Chưa có phụ huynh liên kết.</div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Phụ huynh</TableHead>
                          <TableHead className="text-xs font-semibold">Status</TableHead>
                          <TableHead className="text-xs font-semibold">Linked</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {related.studentParents.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="py-2">
                              <Link href={`/dashboard/admin/users/${r.parent.id}`} className="font-semibold text-foreground hover:underline">
                                {r.parent.fullname}
                              </Link>
                              <div className="text-[10px] text-muted-foreground">{r.parent.email}</div>
                            </TableCell>
                            <TableCell className="py-2 text-[10px] font-semibold text-foreground/80">{r.status}</TableCell>
                            <TableCell className="py-2 whitespace-nowrap text-[10px] text-muted-foreground">
                              {formatTime(r.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AdminUserSectionCard>
            ) : null}

            {user && userRole === "PARENT" && related?.parentChildren ? (
              <AdminUserSectionCard
                title="Con liên kết"
                description="Danh sách học sinh liên kết với phụ huynh"
                count={related.parentChildren.length}
              >
                {related.parentChildren.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Chưa có học sinh liên kết.</div>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-semibold">Học sinh</TableHead>
                          <TableHead className="text-xs font-semibold">Status</TableHead>
                          <TableHead className="text-xs font-semibold">Linked</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {related.parentChildren.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell className="py-2">
                              <Link href={`/dashboard/admin/users/${r.student.id}`} className="font-semibold text-foreground hover:underline">
                                {r.student.fullname}
                              </Link>
                              <div className="text-[10px] text-muted-foreground">{r.student.email}</div>
                            </TableCell>
                            <TableCell className="py-2 text-[10px] font-semibold text-foreground/80">{r.status}</TableCell>
                            <TableCell className="py-2 whitespace-nowrap text-[10px] text-muted-foreground">
                              {formatTime(r.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </AdminUserSectionCard>
            ) : null}
          </div>
        </div>
      ) : null}

      <EditUserDialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditError(null);
        }}
        onSubmit={saveEdit}
        disabled={editSaving}
        error={editError}
        fullname={editFullname}
        setFullname={setEditFullname}
        email={editEmail}
        setEmail={setEditEmail}
        role={editRole}
        setRole={setEditRole}
      />
    </div>
  );
}

function QuickStatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpenCheck;
  label: string;
  value: number;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-background via-background to-indigo-50/40 px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
      <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-indigo-500/5 opacity-80" />
      <div className="pointer-events-none absolute -right-6 bottom-0 h-16 w-16 rounded-full bg-indigo-500/8 opacity-80" />
      <div className="relative flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
            {label}
          </div>
          <div className="mt-1 text-xl font-extrabold text-foreground">{value}</div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function EditUserDialog({
  open,
  onOpenChange,
  onSubmit,
  disabled,
  error,
  fullname,
  setFullname,
  email,
  setEmail,
  role,
  setRole,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
  error: string | null;
  fullname: string;
  setFullname: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  role: "TEACHER" | "STUDENT" | "PARENT";
  setRole: (v: "TEACHER" | "STUDENT" | "PARENT") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,44rem)] max-w-xl" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
          <DialogDescription>Cập nhật họ tên, email và role cho người dùng.</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription className="text-[11px]">{error}</AlertDescription>
            </Alert>
          ) : null}

          <form id="admin-edit-user-form" onSubmit={onSubmit} className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Vai trò</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "TEACHER" | "STUDENT" | "PARENT")}
                className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <option value="TEACHER">TEACHER</option>
                <option value="STUDENT">STUDENT</option>
                <option value="PARENT">PARENT</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Họ và tên</label>
              <Input
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={disabled}>
            Hủy
          </Button>
          <Button form="admin-edit-user-form" type="submit" disabled={disabled}>
            {disabled ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


