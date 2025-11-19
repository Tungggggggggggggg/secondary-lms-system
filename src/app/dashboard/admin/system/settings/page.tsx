"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, AlertCircle } from "lucide-react";
import { SETTINGS_KEYS } from "@/lib/admin/admin-constants";

/**
 * Component SystemSettingsPage - Trang cài đặt hệ thống cho SUPER_ADMIN
 */
export default function SystemSettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("content");

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/system/settings");
        const data = await res.json();
        if (data.success) {
          setSettings(data.settings || {});
        }
      } catch (error) {
        console.error("[SystemSettingsPage] Load settings error:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải cài đặt",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  // Save setting
  const handleSave = async (key: string, value: unknown) => {
    setSaving(true);
    try {
      // Validation
      if (key === SETTINGS_KEYS.UPLOAD_MAX_SIZE_MB) {
        if (typeof value !== "number" || value <= 0) {
          toast({
            title: "Lỗi",
            description: "Kích thước tối đa phải là số lớn hơn 0",
            variant: "destructive",
          });
          return;
        }
      }

      const res = await fetch("/api/admin/system/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, value }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể lưu cài đặt");
      }

      setSettings((prev) => ({ ...prev, [key]: value }));

      toast({
        title: "Thành công",
        description: "Đã lưu cài đặt",
        variant: "success",
      });
    } catch (error: any) {
      console.error("[SystemSettingsPage] Save settings error:", error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu cài đặt",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Settings values
  const premoderation = Boolean(settings[SETTINGS_KEYS.CONTENT_PREMODERATION] ?? false);
  const maintenance = Boolean(settings[SETTINGS_KEYS.SYSTEM_MAINTENANCE] ?? false);
  const maxSizeMB = Number(settings[SETTINGS_KEYS.UPLOAD_MAX_SIZE_MB] ?? 20);
  const systemName = String(settings[SETTINGS_KEYS.SYSTEM_NAME] ?? "");
  const systemEmail = String(settings[SETTINGS_KEYS.SYSTEM_EMAIL] ?? "");

  if (loading) {
    return (
      <AnimatedSection>
        <div className="text-center py-8 text-gray-500">Đang tải cài đặt...</div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Cài đặt hệ thống" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">Nội dung</TabsTrigger>
          <TabsTrigger value="system">Hệ thống</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="general">Chung</TabsTrigger>
        </TabsList>

        {/* Content Settings */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt nội dung</CardTitle>
              <CardDescription>
                Quản lý các cài đặt liên quan đến nội dung
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="premoderation" className="text-base font-medium">
                    Kiểm duyệt trước khi hiển thị
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Bật tính năng này để tất cả thông báo và bình luận phải được duyệt trước khi hiển thị
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="premoderation"
                    checked={premoderation}
                    onCheckedChange={(v) => handleSave(SETTINGS_KEYS.CONTENT_PREMODERATION, v)}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt hệ thống</CardTitle>
              <CardDescription>
                Quản lý các cài đặt hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <Label htmlFor="maintenance" className="text-base font-medium">
                    Chế độ bảo trì
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Bật chế độ bảo trì để tạm thời khóa hệ thống
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="maintenance"
                    checked={maintenance}
                    onCheckedChange={(v) => handleSave(SETTINGS_KEYS.SYSTEM_MAINTENANCE, v)}
                    disabled={saving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upload Settings */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt Upload</CardTitle>
              <CardDescription>
                Quản lý các cài đặt liên quan đến upload file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <Label htmlFor="maxSizeMB" className="text-base font-medium">
                  Kích thước file tối đa (MB)
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Kích thước file tối đa cho phép upload (tính bằng MB)
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    id="maxSizeMB"
                    type="number"
                    min={1}
                    max={1000}
                    value={maxSizeMB}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (!isNaN(value) && value > 0) {
                        handleSave(SETTINGS_KEYS.UPLOAD_MAX_SIZE_MB, value);
                      }
                    }}
                    disabled={saving}
                    className="w-32"
                  />
                  <span className="text-sm text-gray-500">MB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt chung</CardTitle>
              <CardDescription>
                Các cài đặt chung của hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <Label htmlFor="systemName" className="text-base font-medium">
                  Tên hệ thống
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Tên hiển thị của hệ thống
                </p>
                <Input
                  id="systemName"
                  type="text"
                  value={systemName}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [SETTINGS_KEYS.SYSTEM_NAME]: e.target.value }))}
                  onBlur={(e) => handleSave(SETTINGS_KEYS.SYSTEM_NAME, e.target.value)}
                  disabled={saving}
                  placeholder="Tên hệ thống"
                />
              </div>

              <div className="p-4 border rounded-lg">
                <Label htmlFor="systemEmail" className="text-base font-medium">
                  Email hệ thống
                </Label>
                <p className="text-sm text-gray-500 mt-1 mb-3">
                  Email dùng để gửi thông báo từ hệ thống
                </p>
                <Input
                  id="systemEmail"
                  type="email"
                  value={systemEmail}
                  onChange={(e) => setSettings((prev) => ({ ...prev, [SETTINGS_KEYS.SYSTEM_EMAIL]: e.target.value }))}
                  onBlur={(e) => handleSave(SETTINGS_KEYS.SYSTEM_EMAIL, e.target.value)}
                  disabled={saving}
                  placeholder="system@example.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warning */}
      {maintenance && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">
                  Hệ thống đang ở chế độ bảo trì
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Người dùng sẽ không thể truy cập hệ thống khi chế độ bảo trì được bật.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </AnimatedSection>
  );
}
