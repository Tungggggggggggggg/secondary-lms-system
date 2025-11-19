"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, AlertCircle, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/admin/modals/ConfirmDialog";
import { usePrompt } from "@/components/providers/PromptProvider";

/**
 * Component SettingsPage - Trang cài đặt cho ADMIN (org-scoped)
 */
export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const { toast } = useToast();
  const prompt = usePrompt();
  const [settings, setSettings] = useState<Array<{ key: string; updatedAt: string }>>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [valueText, setValueText] = useState<string>("{}");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string>("");
  const [newKeyName, setNewKeyName] = useState("");

  // Load settings list
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        const data = await res.json();
        if (data.ok && data.data) {
          setSettings(data.data);
        }
      } catch (error) {
        console.error("[SettingsPage] Load settings error:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải danh sách cài đặt",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  // Load setting value when key is selected
  useEffect(() => {
    if (!selectedKey) {
      setValueText("{}");
      return;
    }

    const loadSettingValue = async () => {
      try {
        const res = await fetch(
          `/api/admin/settings/${encodeURIComponent(selectedKey)}`
        );
        const data = await res.json();
        if (data.ok && data.data) {
          try {
            setValueText(
              JSON.stringify(data.data.value ?? null, null, 2)
            );
          } catch {
            setValueText("null");
          }
        }
      } catch (error) {
        console.error("[SettingsPage] Load setting value error:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải giá trị cài đặt",
          variant: "destructive",
        });
      }
    };

    loadSettingValue();
  }, [selectedKey, toast]);

  // Save setting
  const handleSave = async () => {
    if (!selectedKey) return;

    setSaving(true);
    try {
      let json: unknown = null;
      try {
        json = valueText ? JSON.parse(valueText) : null;
      } catch (e) {
        toast({
          title: "Lỗi",
          description: "JSON không hợp lệ",
          variant: "destructive",
        });
        return;
      }

      const res = await fetch(
        `/api/admin/settings/${encodeURIComponent(selectedKey)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: json }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Không thể lưu cài đặt");
      }

      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt",
        variant: "success",
      });
    } catch (error: any) {
      console.error("[SettingsPage] Save settings error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu cài đặt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete setting
  const handleDelete = async () => {
    if (!keyToDelete) return;

    try {
      const res = await fetch(
        `/api/admin/settings/${encodeURIComponent(keyToDelete)}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Không thể xóa cài đặt");
      }

      toast({
        title: "Thành công",
        description: "Đã xóa cài đặt",
        variant: "success",
      });

      // Reload settings list
      const listRes = await fetch("/api/admin/settings");
      const listData = await listRes.json();
      if (listData.ok && listData.data) {
        setSettings(listData.data);
      }

      if (selectedKey === keyToDelete) {
        setSelectedKey("");
      }

      setIsDeleteDialogOpen(false);
      setKeyToDelete("");
    } catch (error: any) {
      console.error("[SettingsPage] Delete settings error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa cài đặt",
        variant: "destructive",
      });
    }
  };

  // Create new setting
  const handleCreateNew = async () => {
    const key = await prompt({
      title: "Tạo cài đặt mới",
      description: "Nhập key mới cho cài đặt",
      placeholder: "ví dụ: system.feature_flags",
      validate: (v) => (v && v.trim() ? null : "Key không được để trống"),
      confirmText: "Tạo",
      cancelText: "Hủy",
    });
    if (key && key.trim()) {
      setSelectedKey(key.trim());
      setValueText("{}");
    }
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Cài đặt" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách cài đặt</CardTitle>
              <Button
                variant="outline"
                size="default"
                onClick={handleCreateNew}
                className="h-8 w-8 p-0"
                title="Tạo cài đặt mới"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Chọn một cài đặt để xem và chỉnh sửa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Đang tải...</div>
            ) : settings.length === 0 ? (
              <div className="text-sm text-gray-500">Chưa có cài đặt nào</div>
            ) : (
              <div className="space-y-1">
                {settings.map((setting) => (
                  <div
                    key={setting.key}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedKey === setting.key
                        ? "bg-violet-50 border border-violet-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                    onClick={() => setSelectedKey(setting.key)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {setting.key}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(setting.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="default"
                      onClick={(e) => {
                        e.stopPropagation();
                        setKeyToDelete(setting.key);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      title="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedKey ? `Chỉnh sửa: ${selectedKey}` : "Chọn một cài đặt"}
            </CardTitle>
            <CardDescription>
              {selectedKey
                ? "Chỉnh sửa giá trị cài đặt (JSON format)"
                : "Chọn một cài đặt từ danh sách bên trái để bắt đầu"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedKey ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="value">Giá trị (JSON)</Label>
                  <Textarea
                    id="value"
                    value={valueText}
                    onChange={(e) => setValueText(e.target.value)}
                    className="font-mono text-sm mt-2"
                    rows={15}
                    placeholder='{"key": "value"}'
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Giá trị phải là JSON hợp lệ. Cache server 60s; cập nhật sẽ xóa cache ngay.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Đang lưu..." : "Lưu"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedKey("");
                      setValueText("{}");
                    }}
                  >
                    Hủy
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Chọn một cài đặt từ danh sách để bắt đầu</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Xóa cài đặt"
        description={
          keyToDelete
            ? `Bạn có chắc chắn muốn xóa cài đặt "${keyToDelete}"? Hành động này không thể hoàn tác.`
            : ""
        }
        variant="danger"
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </AnimatedSection>
  );
}
