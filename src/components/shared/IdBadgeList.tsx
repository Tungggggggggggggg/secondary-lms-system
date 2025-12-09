"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface IdBadgeListProps {
  ids: string[];
  namesMap: Record<string, string>;
  emptyText?: string;
}

export default function IdBadgeList({ ids, namesMap, emptyText = "Chưa có dữ liệu" }: IdBadgeListProps) {
  if (!ids?.length) return <span className="text-gray-500 text-sm">{emptyText}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <Badge key={id} variant="outline" className="bg-blue-100 text-blue-800">
          {namesMap[id] || id}
        </Badge>
      ))}
    </div>
  );
}
