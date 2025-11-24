"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AdminHeader from "@/components/admin/AdminHeader";
import AnimatedSection from "@/components/admin/AnimatedSection";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function OrgSettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const sessionOrgId = (session as any)?.orgId as string | undefined;

  const [orgId, setOrgId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [brandColor, setBrandColor] = useState("#8b5cf6");
  const [contentPremoderation, setContentPremoderation] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Default orgId from session
  useEffect(() => {
    if (!orgId && sessionOrgId) setOrgId(sessionOrgId);
  }, [sessionOrgId]);

  // Fetch current settings
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/org/settings?orgId=${encodeURIComponent(orgId)}`);
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || "Tải cài đặt thất bại");
        if (!mounted) return;
        setDisplayName(data.settings?.displayName || "");
        setBrandColor(data.settings?.brandColor || "#8b5cf6");
        setContentPremoderation(Boolean(data.settings?.contentPremoderation));
      } catch (e: any) {
        toast({ title: "Lỗi", description: e.message || "Không thể tải cài đặt", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orgId, toast]);

  const onSave = async () => {
    if (!orgId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/org/settings?orgId=${encodeURIComponent(orgId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, brandColor, contentPremoderation }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || "Cập nhật thất bại");
      toast({ title: "Thành công", description: "Đã cập nhật cài đặt tổ chức", variant: "success" });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message || "Không thể cập nhật", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedSection className="space-y-6">
      <AdminHeader userRole={role || ""} title="Cài đặt tổ chức" />

      <Card>
        <CardHeader>
          <CardTitle>Thông tin chung</CardTitle>
          <CardDescription>Cấu hình hiển thị và chính sách của tổ chức</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Organization ID</label>
              <Input value={orgId} onChange={(e: any) => setOrgId(e.target.value)} placeholder="Organization ID" />
              <p className="text-xs text-gray-400 mt-1">Mặc định theo tổ chức hiện hành (góc phải trên)</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tên hiển thị</label>
              <Input value={displayName} onChange={(e: any) => setDisplayName(e.target.value)} placeholder="Tên tổ chức" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Màu thương hiệu</label>
              <Input type="color" value={brandColor} onChange={(e: any) => setBrandColor(e.target.value)} />
            </div>
            {/* Toggle tiền kiểm đã được ẩn theo chính sách mới */}
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={onSave} disabled={loading || !orgId}>
              Lưu cài đặt
            </Button>
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}
