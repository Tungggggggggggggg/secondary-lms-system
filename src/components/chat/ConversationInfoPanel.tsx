"use client";

import React from "react";
import type { ConversationItem } from "@/hooks/use-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from 'swr';
import { getChatFileUrl } from '@/lib/supabase-upload';
import { File, Link as LinkIcon } from 'lucide-react';


type Props = {
  conversation?: ConversationItem | null;
};

export default function ConversationInfoPanel({ conversation }: Props) {
  const { data, isLoading } = useSWR(conversation ? `/api/chat/conversations/${conversation.id}/attachments` : null);

  const files = data?.data?.files || [];
  const links = data?.data?.links || [];
  if (!conversation) {
    return (
      <div className="h-full p-4 text-sm text-gray-500">Chọn một hội thoại để xem thông tin</div>
    );
  }

  return (
    <div className="h-full p-3 space-y-2 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-gradient-to-b from-amber-50/60 to-orange-50/40 border-l border-amber-200">
      <Tabs defaultValue="participants" className="w-full flex-1 min-h-0 min-w-0 flex flex-col">
        <div className="sticky top-0 z-10 bg-gradient-to-b from-amber-50/90 to-orange-50/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 border-b border-amber-200 pb-2">
          <h3 className="font-bold text-amber-900 text-base truncate">ℹ️ Thông tin hội thoại</h3>
          <TabsList className="mt-2 grid w-full grid-cols-3 bg-amber-100/70">
            <TabsTrigger value="participants" className="text-amber-700 data-[state=active]:bg-amber-200 data-[state=active]:text-amber-900">Thành viên</TabsTrigger>
            <TabsTrigger value="media" className="text-amber-700 data-[state=active]:bg-amber-200 data-[state=active]:text-amber-900">Tệp</TabsTrigger>
            <TabsTrigger value="links" className="text-amber-700 data-[state=active]:bg-amber-200 data-[state=active]:text-amber-900">Liên kết</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="participants" className="mt-4 min-w-0">
            <div className="mt-2 flex flex-col gap-2">
              {conversation.participants.map((p) => (
                <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-100/50 transition-colors border border-transparent hover:border-amber-200 min-w-0">
                  <span className="text-lg flex-shrink-0">👤</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.fullname}</div>
                    <div className="text-xs text-amber-700 capitalize font-medium truncate">{p.role.toLowerCase()}</div>
                  </div>
                </div>
              ))}
            </div>
        </TabsContent>
        <TabsContent value="media" className="mt-4 min-w-0 scrollbar-hover overscroll-contain">
          {isLoading ? <p className="text-amber-700 font-medium">Đang tải...</p> : files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file: any) => (
                <a key={file.id} href={getChatFileUrl(file.storagePath)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-100/50 transition-colors border border-transparent hover:border-amber-200 min-w-0">
                  <File className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900">{file.name}</p>
                    <p className="text-xs text-amber-700 font-medium truncate">{(file.sizeBytes / 1024).toFixed(2)} KB</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center text-amber-700 text-sm py-8 font-medium">Không có file nào.</div>
          )}
        </TabsContent>
        <TabsContent value="links" className="mt-4 min-w-0 scrollbar-hover overscroll-contain">
          {isLoading ? <p className="text-amber-700 font-medium">Đang tải...</p> : links.length > 0 ? (
            <div className="space-y-2">
              {links.map((link: any, index: number) => (
                <a key={index} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-100/50 transition-colors border border-transparent hover:border-amber-200 min-w-0">
                  <LinkIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-amber-700">{link.url}</p>
                    <p className="text-xs text-amber-600 font-medium truncate">{new Date(link.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center text-amber-700 text-sm py-8 font-medium">Không có link nào.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
