"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Breadcrumb, { type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/shared";
import { ConfirmDialog } from "@/components/shared";
import PromptDialog from "@/components/shared/PromptDialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatDate } from "@/lib/date";
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
  const [liveMessage, setLiveMessage] = useState("");

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelInvitationId, setCancelInvitationId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
  const loadingInv = invitationsData === undefined;
  const loadingReq = requestsData === undefined;
  const loadingParents = parentsData === undefined;

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
    setLiveMessage("Đã sao chép mã mời vào bộ nhớ tạm.");
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
  const handleRejectRequest = async (id: string, reason?: string) => {
    try {
      const res = await fetch(`/api/student/link-requests/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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

  const confirmReject = async () => {
    if (!rejectRequestId) return;
    await handleRejectRequest(rejectRequestId, rejectReason.trim() || undefined);
    setShowRejectDialog(false);
    setRejectReason("");
    setRejectRequestId(null);
  };

  return (
    <div className="space-y-6">
      {/* a11y live region for copy */}
      <p className="sr-only" aria-live="polite">{liveMessage}</p>

      {/* Breadcrumb + PageHeader */}
      {(() => {
        const breadcrumbItems: BreadcrumbItem[] = [
          { label: "Dashboard", href: "/dashboard/student/dashboard" },
          { label: "Gia đình", href: "/dashboard/student/family" },
        ];
        return (
          <>
            <Breadcrumb items={breadcrumbItems} color="green" />
            <PageHeader
              role="student"
              title="Kết nối với gia đình"
              subtitle="Quản lý mã mời phụ huynh, yêu cầu liên kết và danh sách phụ huynh đã kết nối."
            />
          </>
        );
      })()}

      {/* Create Invitation */}
      <Card className="bg-card/90 rounded-3xl border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Mời phụ huynh
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Tạo mã mời và gửi cho phụ huynh để họ liên kết tài khoản với bạn.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-muted-foreground">
            Mỗi mã mời chỉ sử dụng được một lần và có thời hạn nhất định.
          </div>
          <Button
            onClick={handleCreateInvitation}
            disabled={isCreating}
            color="green"
            className="gap-2 rounded-full"
            aria-label="Tạo mã mời phụ huynh"
          >
            <Plus className="h-4 w-4" />
            Tạo mã mời mới
          </Button>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {loadingInv ? (
        <div className="bg-card/90 rounded-3xl border border-border shadow-sm p-5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-56" />
            {[1,2].map(i => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-40 rounded-xl" />
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : invitations.filter((inv) => inv.status === "PENDING").length > 0 && (
        <Card className="bg-card/90 rounded-3xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg text-foreground">
              Mã mời đang chờ ({invitations.filter((inv) => inv.status === "PENDING").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations
              .filter((inv) => inv.status === "PENDING")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card/90 shadow-sm hover:border-border hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <code className="text-lg sm:text-2xl font-mono font-semibold bg-foreground text-background px-4 py-2 rounded-2xl tracking-[0.25em]">
                        {invitation.code}
                      </code>
                      <Button
                        variant="ghost"
                        color="green"
                        size="default"
                        onClick={() => handleCopyCode(invitation.code)}
                        aria-label={`Sao chép mã mời ${invitation.code}`}
                      >
                        {copiedCode === invitation.code ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-2 text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>Hết hạn: {formatDate(invitation.expiresAt, "medium")}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    color="green"
                    size="sm"
                    className="rounded-full text-xs sm:text-sm"
                    onClick={() => {
                      setCancelInvitationId(invitation.id);
                      setShowCancelDialog(true);
                    }}
                    aria-label="Hủy mã mời"
                  >
                    Hủy
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Pending Requests */}
      {loadingReq ? (
        <div className="bg-card/90 rounded-3xl border border-border shadow-sm p-5">
          <div className="space-y-3">
            <Skeleton className="h-5 w-56" />
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-9 w-40" />
              </div>
            ))}
          </div>
        </div>
      ) : requests.length > 0 && (
        <Card className="bg-card/90 rounded-3xl border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base sm:text-lg text-foreground">
              Yêu cầu liên kết ({requests.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              Các phụ huynh muốn liên kết tài khoản với bạn.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card/90 shadow-sm hover:border-border hover:shadow-md transition-all"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm sm:text-base text-foreground">
                    {request.parent.fullname}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3" />
                    <span>{request.parent.email}</span>
                  </div>
                  {request.message && (
                    <div className="mt-2 text-xs sm:text-sm text-foreground italic">
                      “{request.message}”
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(request.createdAt, "medium")}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="green"
                    onClick={() => handleApproveRequest(request.id)}
                    aria-label={`Chấp nhận yêu cầu của ${request.parent.fullname}`}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Chấp nhận
                  </Button>
                  <Button
                    variant="outline"
                    color="green"
                    size="sm"
                    onClick={() => { setRejectRequestId(request.id); setShowRejectDialog(true); }}
                    aria-label={`Từ chối yêu cầu của ${request.parent.fullname}`}
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
      <Card className="bg-card/90 rounded-3xl border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg text-foreground">
            Phụ huynh đã liên kết ({linkedParents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingParents ? (
            <div className="space-y-3 p-4">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
              ))}
            </div>
          ) : linkedParents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm sm:text-base font-medium text-foreground">
                Chưa có phụ huynh nào được liên kết
              </p>
              <p className="text-xs sm:text-sm mt-2">
                Tạo mã mời hoặc chờ phụ huynh gửi yêu cầu liên kết để bắt đầu.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {linkedParents.map((link) => (
                <div
                  key={link.id}
                  className="p-4 sm:p-5 rounded-2xl border border-border bg-card/90 shadow-sm hover:border-border hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {link.parent.fullname?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm sm:text-base text-foreground">
                        {link.parent.fullname}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {link.parent.email}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Liên kết từ: {formatDate(link.createdAt, "short")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Invitation Confirm */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={async () => {
          if (cancelInvitationId) await handleCancelInvitation(cancelInvitationId);
          setShowCancelDialog(false);
          setCancelInvitationId(null);
        }}
        title="Hủy mã mời"
        description="Bạn có chắc chắn muốn hủy mã mời này? Hành động này không thể hoàn tác."
        variant="warning"
        confirmText="Hủy mã mời"
        cancelText="Đóng"
      />

      {/* Reject Request Prompt */}
      <PromptDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title="Từ chối yêu cầu liên kết"
        description="Bạn có thể nhập lý do (tùy chọn) để thông báo cho phụ huynh."
        type="textarea"
        placeholder="Nhập lý do từ chối (không bắt buộc)"
        confirmText="Xác nhận từ chối"
        cancelText="Hủy"
        onChange={setRejectReason}
        onConfirm={confirmReject}
      />
    </div>
  );
}
