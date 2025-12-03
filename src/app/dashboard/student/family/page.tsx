"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  Copy, 
  Check, 
  Clock, 
  UserCheck, 
  UserX,
  Mail,
  Calendar
} from "lucide-react";
import { formatDate } from "@/lib/admin/format-date";
import { useToast } from "@/hooks/use-toast";
import { setToastInstance } from "@/lib/toast";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InvitationItem {
  id: string;
  code: string;
  status: string;
  expiresAt: string;
}

interface RequestItem {
  id: string;
  parent: { fullname: string; email: string };
  message?: string;
  createdAt: string;
}

interface LinkedParentItem {
  id: string;
  parent: { fullname: string; email: string };
  createdAt: string;
}

export default function StudentFamilyPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const toastHook = useToast();

  // Initialize toast instance
  useEffect(() => {
    setToastInstance(toastHook);
  }, [toastHook]);

  // Fetch invitations
  const { data: invitationsData, mutate: mutateInvitations } = useSWR(
    "/api/student/invitations",
    fetcher
  );

  // Fetch link requests
  const { data: requestsData, mutate: mutateRequests } = useSWR(
    "/api/student/link-requests?status=PENDING",
    fetcher
  );

  // Fetch linked parents - FIX: Dùng API đúng cho student
  const { data: parentsData } = useSWR("/api/student/parents", fetcher);

  const invitations: InvitationItem[] = (invitationsData?.items || []) as InvitationItem[];
  const requests: RequestItem[] = (requestsData?.items || []) as RequestItem[];
  const linkedParents: LinkedParentItem[] = (parentsData?.items || []) as LinkedParentItem[];

  // Create invitation
  const handleCreateInvitation = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/student/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      
      if (res.ok) {
        toastHook.toast({ title: "Mã mời đã được tạo thành công!", variant: "success" });
        mutateInvitations();
      } else {
        const error = await res.json();
        toastHook.toast({ title: error.message || "Có lỗi xảy ra", variant: "destructive" });
      }
    } catch (error) {
      console.error("[StudentFamilyPage] handleCreateInvitation error:", error);
      toastHook.toast({ title: "Không thể tạo mã mời", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  // Copy code
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toastHook.toast({ title: "Đã sao chép mã mời!", variant: "success" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Cancel invitation
  const handleCancelInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/student/invitations/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        toastHook.toast({ title: "Đã hủy mã mời", variant: "success" });
        mutateInvitations();
      }
    } catch (error) {
      console.error("[StudentFamilyPage] handleCancelInvitation error:", error);
      toastHook.toast({ title: "Không thể hủy mã mời", variant: "destructive" });
    }
  };

  // Approve request
  const handleApproveRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/student/link-requests/${id}/approve`, {
        method: "POST",
      });
      
      if (res.ok) {
        toastHook.toast({ title: "Đã chấp nhận yêu cầu liên kết!", variant: "success" });
        mutateRequests();
      }
    } catch (error) {
      console.error("[StudentFamilyPage] handleApproveRequest error:", error);
      toastHook.toast({ title: "Không thể chấp nhận yêu cầu", variant: "destructive" });
    }
  };

  // Reject request
  const handleRejectRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/student/link-requests/${id}/reject`, {
        method: "POST",
      });
      
      if (res.ok) {
        toastHook.toast({ title: "Đã từ chối yêu cầu", variant: "success" });
        mutateRequests();
      }
    } catch (error) {
      console.error("[StudentFamilyPage] handleRejectRequest error:", error);
      toastHook.toast({ title: "Không thể từ chối yêu cầu", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header thumbnail */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-50 bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 px-4 py-4 sm:px-6 sm:py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
            <Users className="h-5 w-5 text-indigo-500" />
          </div>
          <div className="space-y-1">
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">
              Kết nối với gia đình
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              Quản lý mã mời phụ huynh, yêu cầu liên kết và danh sách phụ huynh đã kết nối.
            </p>
          </div>
        </div>
        <div className="flex items-end sm:items-center gap-3 sm:gap-4">
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
              Phụ huynh đã liên kết
            </p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {linkedParents.length}
            </p>
          </div>
        </div>
      </div>

      {/* Create Invitation */}
      <Card className="bg-white/90 rounded-3xl border border-slate-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg text-slate-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-500" />
            Mời phụ huynh
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-slate-600">
            Tạo mã mời và gửi cho phụ huynh để họ liên kết tài khoản với bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-500">
            Mỗi mã mời chỉ sử dụng được một lần và có thời hạn nhất định.
          </div>
          <Button
            onClick={handleCreateInvitation}
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 px-4 sm:px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-sky-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Tạo mã mời mới
          </Button>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.filter((inv) => inv.status === "PENDING").length > 0 && (
        <Card className="bg-white/90 rounded-3xl border border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg text-slate-900">
              Mã mời đang chờ ({invitations.filter((inv) => inv.status === "PENDING").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations
              .filter((inv) => inv.status === "PENDING")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white/90 shadow-sm hover:border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <code className="text-lg sm:text-2xl font-mono font-semibold bg-slate-900 text-slate-50 px-4 py-2 rounded-2xl tracking-[0.25em]">
                        {invitation.code}
                      </code>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => handleCopyCode(invitation.code)}
                      >
                        {copiedCode === invitation.code ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-slate-600 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Hết hạn: {formatDate(invitation.expiresAt, "medium")}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs sm:text-sm"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Hủy
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {requests.length > 0 && (
        <Card className="bg-white/90 rounded-3xl border border-slate-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg text-slate-900">
              Yêu cầu liên kết ({requests.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600">
              Các phụ huynh muốn liên kết tài khoản với bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white/90 shadow-sm hover:border-slate-200 hover:shadow-md transition-all"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm sm:text-base text-slate-900">
                    {request.parent.fullname}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3" />
                    <span>{request.parent.email}</span>
                  </div>
                  {request.message && (
                    <div className="mt-2 text-xs sm:text-sm text-slate-700 italic">
                      “{request.message}”
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(request.createdAt, "medium")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproveRequest(request.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Chấp nhận
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectRequest(request.id)}
                  >
                    <UserX className="h-4 w-4 mr-1" />
                    Từ chối
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Linked Parents */}
      <Card className="bg-white/90 rounded-3xl border border-slate-100 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg text-slate-900">
            Phụ huynh đã liên kết ({linkedParents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedParents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="text-sm sm:text-base font-medium text-slate-700">Chưa có phụ huynh nào được liên kết</p>
              <p className="text-xs sm:text-sm mt-2">
                Tạo mã mời hoặc chờ phụ huynh gửi yêu cầu liên kết để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {linkedParents.map((link) => (
                <div
                  key={link.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white/90 shadow-sm hover:border-slate-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {link.parent.fullname?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm sm:text-base text-slate-900">{link.parent.fullname}</div>
                      <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {link.parent.email}
                      </div>
                      <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Liên kết từ: {formatDate(link.createdAt, "short")}</span>
                      </div>
                      <Badge variant="outline" className="mt-2 bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full px-3 py-1 text-[11px] font-semibold">
                        Đã kích hoạt
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
