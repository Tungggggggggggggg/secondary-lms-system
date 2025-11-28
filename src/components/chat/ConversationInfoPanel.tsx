"use client";

import React from "react";
import type { ConversationItem } from "@/hooks/use-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from 'swr';
import { getChatFileUrl } from '@/lib/supabase-upload';
import { File, Link as LinkIcon } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());


type Props = {
  conversation?: ConversationItem | null;
};

export default function ConversationInfoPanel({ conversation }: Props) {
  const { data, isLoading } = useSWR(conversation ? `/api/chat/conversations/${conversation.id}/attachments` : null, fetcher);

  const files = data?.data?.files || [];
  const links = data?.data?.links || [];
  if (!conversation) {
    return (
      <div className="h-full p-4 text-sm text-gray-500">Chọn một hội thoại để xem thông tin</div>
    );
  }

  return (
    <div className="h-full p-4 space-y-3 flex flex-col min-h-0">
      <h3 className="font-semibold text-gray-800 text-base">Thông tin hội thoại</h3>
      <Tabs defaultValue="participants" className="w-full flex-1 min-h-0 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="participants">Thành viên</TabsTrigger>
          <TabsTrigger value="media">Tệp</TabsTrigger>
          <TabsTrigger value="links">Liên kết</TabsTrigger>
        </TabsList>
        <TabsContent value="participants" className="mt-4">
            <div className="mt-2 flex flex-col gap-2">
              {conversation.participants.map((p) => (
                <div key={p.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                  <span className="text-lg">👤</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.fullname}</div>
                    <div className="text-xs text-gray-500 capitalize">{p.role.toLowerCase()}</div>
                  </div>
                </div>
              ))}
            </div>
        </TabsContent>
        <TabsContent value="media" className="mt-4 flex-1 min-h-0 overflow-y-auto scrollbar-hover overscroll-contain">
          {isLoading ? <p>Đang tải...</p> : files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file: any) => (
                <a key={file.id} href={getChatFileUrl(file.storagePath)} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                  <File className="h-5 w-5 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.sizeBytes / 1024).toFixed(2)} KB</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">Không có file nào.</div>
          )}
        </TabsContent>
        <TabsContent value="links" className="mt-4 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hover overscroll-contain">
          {isLoading ? <p>Đang tải...</p> : links.length > 0 ? (
            <div className="space-y-2">
              {links.map((link: any, index: number) => (
                <a key={index} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100">
                  <LinkIcon className="h-5 w-5 text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-blue-600">{link.url}</p>
                    <p className="text-xs text-gray-500">{new Date(link.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">Không có link nào.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
