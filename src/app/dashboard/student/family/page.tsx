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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quản lý Gia đình</h1>
        <p className="text-gray-600 mt-2">
          Quản lý liên kết với phụ huynh và các yêu cầu liên kết
        </p>
      </div>

      {/* Create Invitation */}
      <Card>
        <CardHeader>
          <CardTitle>Mời Phụ huynh</CardTitle>
          <CardDescription>
            Tạo mã mời để gửi cho phụ huynh của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateInvitation} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo mã mời mới
          </Button>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.filter((inv) => inv.status === "PENDING").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mã mời đang chờ ({invitations.filter((inv) => inv.status === "PENDING").length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations
              .filter((inv) => inv.status === "PENDING")
              .map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <code className="text-2xl font-mono font-bold bg-violet-50 px-4 py-2 rounded">
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
                    <div className="mt-2 text-sm text-gray-600">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Hết hạn: {formatDate(invitation.expiresAt, "medium")}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="default"
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
        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu liên kết ({requests.length})</CardTitle>
            <CardDescription>
              Các phụ huynh muốn liên kết với bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-semibold">{request.parent.fullname}</div>
                  <div className="text-sm text-gray-600">
                    <Mail className="h-3 w-3 inline mr-1" />
                    {request.parent.email}
                  </div>
                  {request.message && (
                    <div className="mt-2 text-sm text-gray-700 italic">
                      &quot;{request.message}&quot;
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    <Calendar className="h-3 w-3 inline mr-1" />
                    {formatDate(request.createdAt, "medium")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="default"
                    onClick={() => handleApproveRequest(request.id)}
                  >
                    <UserCheck className="h-4 w-4 mr-1" />
                    Chấp nhận
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
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
      <Card>
        <CardHeader>
          <CardTitle>Phụ huynh đã liên kết ({linkedParents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedParents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Chưa có phụ huynh nào được liên kết</p>
              <p className="text-sm mt-2">Tạo mã mời hoặc chờ phụ huynh gửi yêu cầu liên kết</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {linkedParents.map((link) => (
                <div
                  key={link.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {link.parent.fullname?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{link.parent.fullname}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {link.parent.email}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        Liên kết từ: {formatDate(link.createdAt, "short")}
                      </div>
                      <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
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
