"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import HeaderParent from "@/components/parent/ParentHeader";
import StudentCard from "@/components/parent/StudentCard";
import SearchResultItem from "@/components/parent/SearchResultItem";
import PendingRequestItem from "@/components/parent/PendingRequestItem";
import { EmptyState } from "@/components/shared";
import type { ParentStudentRelationship } from "@/types/parent";

// types and SWR fetcher now provided globally

export default function ParentChildrenPage() {
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { data, error, isLoading, mutate } = useSWR<{
    success?: boolean;
    items?: ParentStudentRelationship[];
    total?: number;
    error?: string;
  }>("/api/parent/children", {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    keepPreviousData: true,
  });

  // Fetch pending requests
  const { data: requestsData, mutate: mutateRequests } = useSWR(
    "/api/parent/link-requests?status=PENDING"
  );

  const children = (data?.success && data?.items) ? data.items : [];
  const total = data?.total || 0;
  const pendingRequests = requestsData?.items || [];

  // Accept invitation
  const handleAcceptInvitation = async () => {
    if (!invitationCode.trim()) {
      toast.error("Vui lòng nhập mã mời");
      return;
    }

    setIsAccepting(true);
    try {
      const res = await fetch("/api/parent/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: invitationCode.toUpperCase().trim() }),
      });

      if (res.ok) {
        toast.success("Đã liên kết thành công!");
        setShowAcceptModal(false);
        setInvitationCode("");
        mutate();
      } else {
        const error = await res.json();
        toast.error(error.message || "Mã mời không hợp lệ");
      }
    } catch (error) {
      toast.error("Không thể chấp nhận mã mời");
    } finally {
      setIsAccepting(false);
    }
  };

  // Search students
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Vui lòng nhập tên hoặc email học sinh");
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/parent/link-requests/search-students?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      
      if (data.success) {
        setSearchResults(data.items || []);
        if (data.items.length === 0) {
          toast.info("Không tìm thấy học sinh nào");
        }
      }
    } catch (error) {
      toast.error("Không thể tìm kiếm");
    } finally {
      setIsSearching(false);
    }
  };

  // Send link request
  const handleSendRequest = async (studentId: string) => {
    try {
      const res = await fetch("/api/parent/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (res.ok) {
        toast.success("Đã gửi yêu cầu liên kết!");
        mutateRequests();
        // Refresh search results
        handleSearch();
      } else {
        const error = await res.json();
        toast.error(error.message || "Không thể gửi yêu cầu");
      }
    } catch (error) {
      toast.error("Không thể gửi yêu cầu");
    }
  };

  // Cancel request
  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/parent/link-requests/${requestId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Đã hủy yêu cầu");
        mutateRequests();
      }
    } catch (error) {
      toast.error("Không thể hủy yêu cầu");
    }
  };

  if (isLoading) {
    return (
      <>
        <HeaderParent
          title="Con của tôi"
          subtitle="Danh sách các con đã được liên kết với tài khoản của bạn"
        />
        <div className="text-center py-12">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <HeaderParent
          title="Con của tôi"
          subtitle="Danh sách các con đã được liên kết với tài khoản của bạn"
        />
        <EmptyState
          icon="❌"
          title="Có lỗi xảy ra"
          description="Không thể tải dữ liệu. Vui lòng thử lại sau."
          variant="parent"
          action={
            <Button color="amber" onClick={() => mutate()}>
              Thử lại
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <HeaderParent
        title="Con của tôi"
        subtitle={`Danh sách các con đã được liên kết với tài khoản của bạn (${total} học sinh)`}
      />

      <div className="flex gap-3 mb-6">
        <Button
          color="amber"
          onClick={() => setShowAcceptModal(true)}
        >
          <KeyRound className="h-4 w-4 mr-2" />
          Nhập mã mời
        </Button>
        <Button
          variant="outline"
          color="amber"
          onClick={() => setShowSearchModal(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          Tìm học sinh
        </Button>
      </div>

      <div className="space-y-6">

      {/* Accept Invitation Modal */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
        <DialogContent onClose={() => setShowAcceptModal(false)}>
          <DialogHeader variant="parent">
            <DialogTitle variant="parent">Nhập mã mời từ học sinh</DialogTitle>
            <DialogDescription variant="parent">
              Nhập mã mời 8 ký tự mà học sinh đã gửi cho bạn
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5">
            <Input
              placeholder="VD: ABC12345"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              maxLength={8}
              color="amber"
              className="text-center text-3xl font-mono tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAcceptInvitation();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              color="amber"
              onClick={handleAcceptInvitation}
              disabled={isAccepting || !invitationCode.trim()}
              className="w-full"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Xác nhận"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Students Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onClose={() => setShowSearchModal(false)}>
          <DialogHeader variant="parent">
            <DialogTitle variant="parent">Tìm kiếm học sinh</DialogTitle>
            <DialogDescription variant="parent">
              Tìm kiếm học sinh theo tên hoặc email để gửi yêu cầu liên kết
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5">
            <div className="flex gap-3">
              <Input
                placeholder="Nhập tên hoặc email học sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                color="amber"
                className="flex-1"
              />
              <Button
                color="amber"
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {searchResults.map((student) => (
                  <SearchResultItem
                    key={student.id}
                    student={student}
                    isLinked={student.isLinked}
                    hasExistingRequest={student.hasExistingRequest}
                    onSendRequest={handleSendRequest}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="border-b border-orange-100">
              <CardTitle className="text-orange-700">Yêu cầu đang chờ ({pendingRequests.length})</CardTitle>
              <CardDescription>
                Các yêu cầu liên kết bạn đã gửi đang chờ học sinh phê duyệt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {pendingRequests.map((request: any) => (
                <PendingRequestItem
                  key={request.id}
                  request={request}
                  onCancel={handleCancelRequest}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Children List */}
        {children.length === 0 ? (
          <EmptyState
            icon="👪"
            title="Chưa có học sinh nào được liên kết"
            description="Hãy liên hệ với quản trị viên hoặc tìm kiếm học sinh để được liên kết với tài khoản của con bạn."
            variant="parent"
            action={
              <div className="flex gap-3 justify-center">
                <Button
                  color="amber"
                  onClick={() => setShowAcceptModal(true)}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Nhập mã mời
                </Button>
                <Button
                  variant="outline"
                  color="amber"
                  onClick={() => setShowSearchModal(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Tìm học sinh
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((relationship) => (
              <StudentCard
                key={relationship.id}
                student={relationship.student}
                createdAt={relationship.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}



