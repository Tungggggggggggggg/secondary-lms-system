"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, Mail, GraduationCap, ArrowRight, Users, Search, KeyRound, Loader2, X, Clock, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/admin/format-date";
import { toast } from "sonner";

interface Student {
  id: string;
  email: string;
  fullname: string;
  role: string;
}

interface ParentStudentRelationship {
  id: string;
  studentId: string;
  createdAt: string;
  student: Student;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ParentChildrenPage() {
  const { data: session } = useSession();
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
  }>("/api/parent/children", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Fetch pending requests
  const { data: requestsData, mutate: mutateRequests } = useSWR(
    "/api/parent/link-requests?status=PENDING",
    fetcher
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Con của tôi</h1>
          <p className="text-gray-600 mt-2">Danh sách các con đã được liên kết với tài khoản của bạn</p>
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Con của tôi</h1>
          <p className="text-gray-600 mt-2">Danh sách các con đã được liên kết với tài khoản của bạn</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-600">Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.</p>
            <Button onClick={() => mutate()} className="mt-4">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Con của tôi</h1>
          <p className="text-gray-600 mt-2">
            Danh sách các con đã được liên kết với tài khoản của bạn ({total} học sinh)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAcceptModal(true)}>
            <KeyRound className="h-4 w-4 mr-2" />
            Nhập mã mời
          </Button>
          <Button variant="outline" onClick={() => setShowSearchModal(true)}>
            <Search className="h-4 w-4 mr-2" />
            Tìm học sinh
          </Button>
        </div>
      </div>

      {/* Accept Invitation Modal */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nhập mã mời từ học sinh</DialogTitle>
                <DialogDescription>
                  Nhập mã mời 8 ký tự mà học sinh đã gửi cho bạn
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="VD: ABC12345"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="text-center text-2xl font-mono tracking-wider"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAcceptInvitation();
                  }}
                />
                <Button
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
              </div>
            </DialogContent>
      </Dialog>

      {/* Search Students Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tìm kiếm học sinh</DialogTitle>
                <DialogDescription>
                  Tìm kiếm học sinh theo tên hoặc email để gửi yêu cầu liên kết
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tên hoặc email học sinh..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-semibold">{student.fullname}</div>
                          <div className="text-sm text-gray-600">{student.email}</div>
                          {student.classrooms && student.classrooms.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              Lớp: {student.classrooms.map((c: any) => c.name).join(", ")}
                            </div>
                          )}
                        </div>
                        <div>
                          {student.isLinked ? (
                            <Button size="sm" variant="outline" disabled>
                              <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                              Đã liên kết
                            </Button>
                          ) : student.hasExistingRequest ? (
                            <Button size="sm" variant="outline" disabled>
                              <Clock className="h-4 w-4 mr-1 text-orange-600" />
                              Đang chờ
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleSendRequest(student.id)}
                            >
                              Gửi yêu cầu
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
      </Dialog>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Yêu cầu đang chờ ({pendingRequests.length})</CardTitle>
            <CardDescription>
              Các yêu cầu liên kết bạn đã gửi đang chờ học sinh phê duyệt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request: any) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-semibold">{request.student.fullname}</div>
                  <div className="text-sm text-gray-600">{request.student.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Gửi lúc: {formatDate(request.createdAt, "medium")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancelRequest(request.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Hủy
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Children List */}
      {children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chưa có học sinh nào được liên kết
            </h3>
            <p className="text-gray-600 mb-4">
              Hãy liên hệ với quản trị viên để được liên kết với tài khoản học sinh của con bạn.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((relationship) => {
            const student = relationship.student;
            return (
              <Card key={relationship.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {student.fullname?.charAt(0).toUpperCase() || "S"}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.fullname || "Không có tên"}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {student.email}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <GraduationCap className="h-4 w-4" />
                      <span>Học sinh</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Liên kết từ:</span>{" "}
                      {formatDate(relationship.createdAt, "medium")}
                    </div>
                    <div className="pt-3 border-t">
                      <Link href={`/dashboard/parent/children/${student.id}`}>
                        <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                          Xem chi tiết
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

