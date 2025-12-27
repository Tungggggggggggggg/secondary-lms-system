"use client";

import React from "react";
import type { ConversationItem } from "@/hooks/use-chat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useSWR from 'swr';
import { File, Link as LinkIcon, Info, User } from 'lucide-react';


type Props = {
  color?: "green" | "blue" | "amber";
  conversation?: ConversationItem | null;
};

type ChatConversationFile = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  url?: string | null;
};

type ChatConversationLink = {
  url: string;
  createdAt: string;
};

type ConversationAttachmentsResponse = {
  success?: boolean;
  data?: {
    files?: ChatConversationFile[];
    links?: ChatConversationLink[];
  };
};

export default function ConversationInfoPanel({ color = "amber", conversation }: Props) {
  const { data, isLoading } = useSWR<ConversationAttachmentsResponse>(
    conversation ? `/api/chat/conversations/${conversation.id}/attachments` : null
  );

  const files = data?.data?.files ?? [];
  const links = data?.data?.links ?? [];
  if (!conversation) {
    return (
      <div className="h-full p-4 text-sm text-gray-500">Chọn một hội thoại để xem thông tin</div>
    );
  }

  const palette = {
    containerBg: color === "green" ? "bg-gradient-to-b from-green-50/60 to-emerald-50/40" : color === "blue" ? "bg-gradient-to-b from-blue-50/60 to-indigo-50/40" : "bg-gradient-to-b from-amber-50/60 to-orange-50/40",
    border: color === "green" ? "border-green-200" : color === "blue" ? "border-blue-200" : "border-amber-200",
    headerBg: color === "green" ? "bg-gradient-to-b from-green-50/90 to-emerald-50/60" : color === "blue" ? "bg-gradient-to-b from-blue-50/90 to-indigo-50/60" : "bg-gradient-to-b from-amber-50/90 to-orange-50/60",
    title: color === "green" ? "text-green-900" : color === "blue" ? "text-blue-900" : "text-amber-900",
    tabListBg: color === "green" ? "bg-green-100/70" : color === "blue" ? "bg-blue-100/70" : "bg-amber-100/70",
    tabTrigger: color === "green"
      ? "text-green-700 border data-[state=inactive]:text-green-700 data-[state=inactive]:border-transparent hover:text-green-900 focus-visible:ring-green-500 data-[state=active]:bg-green-200 data-[state=active]:text-green-900 data-[state=active]:border-green-400"
      : color === "blue"
      ? "text-blue-700 border data-[state=inactive]:text-blue-700 data-[state=inactive]:border-transparent hover:text-blue-900 focus-visible:ring-blue-500 data-[state=active]:bg-blue-200 data-[state=active]:text-blue-900 data-[state=active]:border-blue-400"
      : "text-amber-700 border data-[state=inactive]:text-amber-700 data-[state=inactive]:border-transparent hover:text-amber-900 focus-visible:ring-amber-500 data-[state=active]:bg-amber-200 data-[state=active]:text-amber-900 data-[state=active]:border-amber-400",
    hoverRow: color === "green" ? "hover:bg-green-100/50 hover:border-green-200" : color === "blue" ? "hover:bg-blue-100/50 hover:border-blue-200" : "hover:bg-amber-100/50 hover:border-amber-200",
    textSoft: color === "green" ? "text-green-700" : color === "blue" ? "text-blue-700" : "text-amber-700",
    icon: color === "green" ? "text-green-600" : color === "blue" ? "text-blue-600" : "text-amber-600",
  };

  return (
    <div className={`h-full p-3 space-y-2 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain ${palette.containerBg} border-l ${palette.border}`}>
      <Tabs defaultValue="participants" className="w-full flex-1 min-h-0 min-w-0 flex flex-col">
        <div className={`sticky top-0 z-10 ${palette.headerBg} backdrop-blur supports-[backdrop-filter]:bg-white/50 border-b ${palette.border} pb-2`}>
          <h3 className={`font-bold ${palette.title} text-base truncate flex items-center gap-2`}>
            <Info className={`h-4 w-4 ${palette.icon}`} aria-hidden="true" />
            <span>Thông tin hội thoại</span>
          </h3>
          <TabsList className={`mt-2 grid w-full grid-cols-3 ${palette.tabListBg}`}>
            <TabsTrigger value="participants" className={palette.tabTrigger}>Thành viên</TabsTrigger>
            <TabsTrigger value="media" className={palette.tabTrigger}>Tệp</TabsTrigger>
            <TabsTrigger value="links" className={palette.tabTrigger}>Liên kết</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="participants" className="mt-4 min-w-0">
            <div className="mt-2 flex flex-col gap-2">
              {conversation.participants.map((p) => (
                <div key={p.userId} className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent min-w-0 ${palette.hoverRow}`}>
                  <User className={`h-5 w-5 flex-shrink-0 ${palette.icon}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.fullname}</div>
                    <div className={`text-xs capitalize font-medium truncate ${palette.textSoft}`}>{p.role.toLowerCase()}</div>
                  </div>
                </div>
              ))}
            </div>
        </TabsContent>
        <TabsContent value="media" className="mt-4 min-w-0 scrollbar-hover overscroll-contain">
          {isLoading ? <p className={`${palette.textSoft} font-medium`}>Đang tải...</p> : files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file) => (
                <div key={file.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent min-w-0 ${palette.hoverRow}`}>
                  <File className={`h-5 w-5 flex-shrink-0 ${palette.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900">{file.name}</p>
                    <p className={`text-xs font-medium truncate ${palette.textSoft}`}>{(file.sizeBytes / 1024).toFixed(2)} KB</p>
                  </div>
                  {typeof file.url === "string" && file.url ? (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold underline underline-offset-2 text-gray-900"
                    >
                      Tải
                    </a>
                  ) : (
                    <span className={`text-xs font-medium ${palette.textSoft}`}>N/A</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={`text-center text-sm py-8 font-medium ${palette.textSoft}`}>Không có file nào.</div>
          )}
        </TabsContent>
        <TabsContent value="links" className="mt-4 min-w-0 scrollbar-hover overscroll-contain">
          {isLoading ? <p className={`${palette.textSoft} font-medium`}>Đang tải...</p> : links.length > 0 ? (
            <div className="space-y-2">
              {links.map((link, index) => (
                <a key={index} href={link.url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-2 rounded-lg transition-colors border border-transparent min-w-0 ${palette.hoverRow}`}>
                  <LinkIcon className={`h-5 w-5 flex-shrink-0 ${palette.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${palette.textSoft}`}>{link.url}</p>
                    <p className={`text-xs font-medium truncate ${palette.textSoft}`}>{new Date(link.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className={`text-center text-sm py-8 font-medium ${palette.textSoft}`}>Không có link nào.</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
