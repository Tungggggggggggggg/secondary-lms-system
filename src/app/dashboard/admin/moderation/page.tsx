"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminModeration } from "@/hooks/admin/use-admin-moderation";
import { formatDate } from "@/lib/admin/format-date";
import { formatRelativeTime } from "@/lib/admin/format-date";
import { CheckCircle2, XCircle, MessageSquare, FileText, Filter, CheckSquare, Square } from "lucide-react";
import { ModerationItem } from "@/types/admin";
import { MODERATION_STATUS_COLORS } from "@/lib/admin/admin-constants";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/**
 * Component ModerationPage - Trang kiểm duyệt nội dung
 * Hỗ trợ tabs, preview, approve/reject, bulk actions, organization filter
 */
export default function ModerationPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const [activeTab, setActiveTab] = useState<"announcement" | "comment">("announcement");
  const [orgId, setOrgId] = useState("");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [itemToReject, setItemToReject] = useState<ModerationItem | null>(null);
  const [previewItem, setPreviewItem] = useState<ModerationItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Hook
  const {
    items,
    isLoading,
    filters,
    setFilters,
    approveItem,
    rejectItem,
    refresh,
  } = useAdminModeration({
    type: activeTab,
    orgId: orgId || undefined,
  });

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value as "announcement" | "comment");
    setSelectedItems([]);
    setFilters({
      type: value as "announcement" | "comment",
      orgId: orgId || undefined,
    });
  };

  // Handle orgId change
  const handleOrgIdChange = (value: string) => {
    setOrgId(value);
    setFilters({
      type: activeTab,
      orgId: value || undefined,
    });
  };

  // Handle select item
  const handleSelectItem = (itemId: string, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, itemId]);
    } else {
      setSelectedItems(selectedItems.filter((id) => id !== itemId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(items.map((item) => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  // Handle approve
  const handleApprove = useCallback(
    async (item: ModerationItem) => {
      try {
        await approveItem(item.id, item.type);
        setSelectedItems(selectedItems.filter((id) => id !== item.id));
      } catch (error) {
        // Error handled in hook
      }
    },
    [approveItem, selectedItems]
  );

  // Handle reject
  const handleReject = useCallback(
    async (item: ModerationItem, reason: string) => {
      try {
        await rejectItem(item.id, item.type, reason);
        setSelectedItems(selectedItems.filter((id) => id !== item.id));
        setIsRejectDialogOpen(false);
        setItemToReject(null);
        setRejectReason("");
      } catch (error) {
        // Error handled in hook
      }
    },
    [rejectItem, selectedItems]
  );

  // Handle bulk approve
  const handleBulkApprove = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const promises = selectedItems.map((itemId) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        return approveItem(item.id, item.type);
      }
    });

    try {
      await Promise.all(promises);
      setSelectedItems([]);
    } catch (error) {
      // Error handled in hook
    }
  }, [selectedItems, items, approveItem]);

  // Handle bulk reject
  const handleBulkReject = useCallback(() => {
    if (selectedItems.length === 0) return;
    // For bulk reject, we'll use a default reason or prompt
    const reason = prompt("Lý do từ chối (áp dụng cho tất cả các mục đã chọn):");
    if (!reason) return;

    const promises = selectedItems.map((itemId) => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        return rejectItem(item.id, item.type, reason);
      }
    });

    Promise.all(promises)
      .then(() => {
        setSelectedItems([]);
      })
      .catch((error) => {
        // Error handled in hook
      });
  }, [selectedItems, items, rejectItem]);

  // Open reject dialog
  const openRejectDialog = (item: ModerationItem) => {
    setItemToReject(item);
    setIsRejectDialogOpen(true);
  };

  // Render item card
  const renderItemCard = (item: ModerationItem) => {
    const isSelected = selectedItems.includes(item.id);
    const contentPreview = item.content.length > 200
      ? `${item.content.substring(0, 200)}...`
      : item.content;

    return (
      <Card
        key={item.id}
        className={`transition-all ${
          isSelected ? "ring-2 ring-violet-500 bg-violet-50" : ""
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  handleSelectItem(item.id, checked as boolean)
                }
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        MODERATION_STATUS_COLORS[item.status] || "bg-gray-100"
                      }`}
                    >
                      {item.type === "announcement" ? "Thông báo" : "Bình luận"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 font-medium">
                    {item.authorName || "Người dùng"}
                  </p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {contentPreview}
                </p>
                {item.content.length > 200 && (
                  <button
                    onClick={() => {
                      setPreviewItem(item);
                      setIsPreviewOpen(true);
                    }}
                    className="text-xs text-violet-600 hover:text-violet-700 mt-1"
                  >
                    Xem thêm...
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="default"
                  onClick={() => handleApprove(item)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Duyệt
                </Button>
                <Button
                  size="default"
                  variant="outline"
                  onClick={() => openRejectDialog(item)}
                  className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Từ chối
                </Button>
                <Button
                  size="default"
                  variant="ghost"
                  onClick={() => {
                    setPreviewItem(item);
                    setIsPreviewOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Xem chi tiết
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Kiểm duyệt nội dung" />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
          <CardDescription>
            Lọc nội dung chờ duyệt theo tổ chức
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Organization ID (tùy chọn)"
                value={orgId}
                onChange={(e) => handleOrgIdChange(e.target.value)}
              />
            </div>
            <Button onClick={refresh} variant="outline">
              Làm mới
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="announcement" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Thông báo ({items.length})
            </TabsTrigger>
            <TabsTrigger value="comment" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Bình luận ({items.length})
            </TabsTrigger>
          </TabsList>

          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Đã chọn: {selectedItems.length}
              </span>
              <Button
                size="default"
                onClick={handleBulkApprove}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Duyệt ({selectedItems.length})
              </Button>
              <Button
                size="default"
                variant="outline"
                onClick={handleBulkReject}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" />
                Từ chối ({selectedItems.length})
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="announcement" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Không có thông báo chờ duyệt
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={
                    items.length > 0 &&
                    items.every((item) => selectedItems.includes(item.id))
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  Chọn tất cả ({items.length})
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item) => renderItemCard(item))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="comment" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Đang tải...</div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Không có bình luận chờ duyệt
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={
                    items.length > 0 &&
                    items.every((item) => selectedItems.includes(item.id))
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">
                  Chọn tất cả ({items.length})
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item) => renderItemCard(item))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewItem?.type === "announcement" ? "Thông báo" : "Bình luận"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewItem && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Người tạo:
                  </p>
                  <p className="text-sm text-gray-900">
                    {previewItem.authorName || "Người dùng"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Thời gian:
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatDate(previewItem.createdAt, "full")}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Nội dung:
                  </p>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {previewItem.content}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsPreviewOpen(false)}
                  >
                    Đóng
                  </Button>
                  <Button
                    onClick={() => {
                      if (previewItem) {
                        handleApprove(previewItem);
                        setIsPreviewOpen(false);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Duyệt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (previewItem) {
                        openRejectDialog(previewItem);
                        setIsPreviewOpen(false);
                      }
                    }}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Từ chối
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Từ chối nội dung</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-700 mb-2">
                Vui lòng nhập lý do từ chối:
              </p>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Lý do từ chối..."
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectDialogOpen(false);
                  setItemToReject(null);
                  setRejectReason("");
                }}
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  if (itemToReject && rejectReason) {
                    handleReject(itemToReject, rejectReason);
                  }
                }}
                disabled={!rejectReason}
                className="bg-red-600 hover:bg-red-700"
              >
                Từ chối
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatedSection>
  );
}
