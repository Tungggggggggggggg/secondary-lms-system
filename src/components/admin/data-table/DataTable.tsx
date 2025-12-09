"use client";

import { useState, useMemo, ReactNode } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { TableColumn, TableSort, SortDirection } from "@/types/admin";
import { exportToCSV, generateFilename } from "@/lib/csv";
import { formatDate } from "@/lib/admin/format-date";

/**
 * Props cho DataTable component
 */
interface DataTableProps<T> {
  // Data
  data: T[];
  columns: TableColumn<T>[];
  
  // Pagination
  pageSize?: number;
  currentPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  
  // Sorting
  sort?: TableSort<T>;
  onSortChange?: (sort: TableSort<T> | null) => void;
  
  // Search
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  getRowId?: (row: T) => string;
  
  // Export
  exportable?: boolean;
  exportFilename?: string;
  exportHeaders?: Record<string, string>;
  
  // Loading & Empty states
  loading?: boolean;
  emptyMessage?: string;
  
  // Actions
  actions?: (row: T) => ReactNode;
  
  // Custom className
  className?: string;
}

/**
 * Component DataTable - Data table với sorting, filtering, pagination, export
 * Hỗ trợ search, sort, pagination, row selection, và export CSV
 */
export default function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  pageSize = 20,
  currentPage = 1,
  total,
  onPageChange,
  sort,
  onSortChange,
  searchable = true,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Tìm kiếm...",
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  getRowId,
  exportable = true,
  exportFilename,
  exportHeaders,
  loading = false,
  emptyMessage = "Không có dữ liệu",
  actions,
  className,
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState("");
  const [internalPage, setInternalPage] = useState(1);

  // Sử dụng controlled hoặc uncontrolled search
  const search = searchValue !== undefined ? searchValue : internalSearch;
  const setSearch = onSearchChange || setInternalSearch;
  const page = currentPage !== undefined ? currentPage : internalPage;
  const setPage = onPageChange || setInternalPage;

  // Filtered data
  const filteredData = useMemo(() => {
    if (!search) return data;

    return data.filter((row) => {
      return columns.some((col) => {
        const value = row[col.key as keyof T];
        if (value === null || value === undefined) return false;
        return String(value)
          .toLowerCase()
          .includes(search.toLowerCase());
      });
    });
  }, [data, search, columns]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sort) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sort.column as keyof T];
      const bValue = b[sort.column as keyof T];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sort]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, page, pageSize]);

  // Total pages
  const totalPages = Math.ceil(
    (total !== undefined ? total : sortedData.length) / pageSize
  );

  // Handle sort
  const handleSort = (column: keyof T | string) => {
    if (!onSortChange) return;

    if (sort && sort.column === column) {
      // Toggle direction
      const newDirection: SortDirection =
        sort.direction === "asc" ? "desc" : "asc";
      onSortChange({ column, direction: newDirection });
    } else {
      // New sort
      onSortChange({ column, direction: "asc" });
    }
  };

  // Handle row selection
  const handleSelectRow = (row: T, checked: boolean) => {
    if (!selectable || !onSelectionChange || !getRowId) return;

    const rowId = getRowId(row);
    if (checked) {
      onSelectionChange([...selectedRows, rowId]);
    } else {
      onSelectionChange(selectedRows.filter((id) => id !== rowId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!selectable || !onSelectionChange || !getRowId) return;

    if (checked) {
      onSelectionChange(paginatedData.map((row) => getRowId(row)));
    } else {
      onSelectionChange([]);
    }
  };

  // Handle export
  const handleExport = () => {
    if (!exportable) return;

    const filename = exportFilename || generateFilename("export", "csv");
    exportToCSV(sortedData, filename, exportHeaders as Record<keyof T, string> | undefined);
  };

  // Render sort icon
  const renderSortIcon = (column: keyof T | string) => {
    if (!sort || sort.column !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    if (sort.direction === "asc") {
      return <ArrowUp className="h-4 w-4 text-violet-600" />;
    }
    return <ArrowDown className="h-4 w-4 text-violet-600" />;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search & Export */}
      <div className="flex items-center justify-between gap-4">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
        {exportable && (
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((row) =>
                        getRowId
                          ? selectedRows.includes(getRowId(row))
                          : false
                      )
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  className={cn(
                    col.sortable ? "cursor-pointer hover:bg-gray-50" : "",
                    "select-none"
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{col.label}</span>
                    {col.sortable && renderSortIcon(col.key)}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-32 text-center">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                  }
                  className="text-center py-8 text-gray-500"
                >
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                  }
                  className="text-center py-8 text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const rowId = getRowId ? getRowId(row) : String(index);
                const isSelected = selectedRows.includes(rowId);

                return (
                  <TableRow
                    key={rowId}
                    className={cn(
                      isSelected ? "bg-violet-50" : "",
                      "hover:bg-gray-50"
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            handleSelectRow(row, e.target.checked)
                          }
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={String(col.key)}>
                        {col.render
                          ? col.render(row[col.key as keyof T], row)
                          : String(row[col.key as keyof T] || "-")}
                      </TableCell>
                    ))}
                    {actions && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {actions(row)}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Hiển thị {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, total || sortedData.length)} /{" "}
            {total || sortedData.length} kết quả
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                )
                .map((p, idx, arr) => {
                  const showEllipsis =
                    idx > 0 && arr[idx - 1] !== p - 1;
                  return (
                    <div key={p} className="flex items-center gap-1">
                      {showEllipsis && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <Button
                        variant={p === page ? "default" : "outline"}
                        size="default"
                        onClick={() => setPage(p)}
                        className="min-w-[40px]"
                      >
                        {p}
                      </Button>
                    </div>
                  );
                })}
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

