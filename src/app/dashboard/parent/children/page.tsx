"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, KeyRound, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";
import HeaderParent from "@/components/parent/ParentHeader";
import StudentCard from "@/components/parent/StudentCard";
import SearchResultItem from "@/components/parent/SearchResultItem";
import PendingRequestItem from "@/components/parent/PendingRequestItem";
import { EmptyState } from "@/components/shared";
import type { ParentStudentRelationship } from "@/types/parent";

// types and SWR fetcher now provided globally

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
  }>("/api/parent/children");

  // Fetch pending requests
  const { data: requestsData, mutate: mutateRequests } = useSWR(
    "/api/parent/link-requests?status=PENDING"
  );

  const children = (data?.success && data?.items) ? data.items : [];
  const total = data?.total || 0;
  const pendingRequests = requestsData?.items || [];

  // Accept invitation
  const handleAcceptInvitation = async () => {
    if (!invitationCode.trim()) {
      toast.error("Vui lÃ²ng nháº­p mÃ£ má»i");
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
        toast.success("ÄÃ£ liÃªn káº¿t thÃ nh cÃ´ng!");
        setShowAcceptModal(false);
        setInvitationCode("");
        mutate();
      } else {
        const error = await res.json();
        toast.error(error.message || "MÃ£ má»i khÃ´ng há»£p lá»‡");
      }
    } catch (error) {
      toast.error("KhÃ´ng thá»ƒ cháº¥p nháº­n mÃ£ má»i");
    } finally {
      setIsAccepting(false);
    }
  };

  // Search students
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Vui lÃ²ng nháº­p tÃªn hoáº·c email há»c sinh");
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
          toast.info("KhÃ´ng tÃ¬m tháº¥y há»c sinh nÃ o");
        }
      }
    } catch (error) {
      toast.error("KhÃ´ng thá»ƒ tÃ¬m kiáº¿m");
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
        toast.success("ÄÃ£ gá»­i yÃªu cáº§u liÃªn káº¿t!");
        mutateRequests();
        // Refresh search results
        handleSearch();
      } else {
        const error = await res.json();
        toast.error(error.message || "KhÃ´ng thá»ƒ gá»­i yÃªu cáº§u");
      }
    } catch (error) {
      toast.error("KhÃ´ng thá»ƒ gá»­i yÃªu cáº§u");
    }
  };

  // Cancel request
  const handleCancelRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/parent/link-requests/${requestId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("ÄÃ£ há»§y yÃªu cáº§u");
        mutateRequests();
      }
    } catch (error) {
      toast.error("KhÃ´ng thá»ƒ há»§y yÃªu cáº§u");
    }
  };

  if (isLoading) {
    return (
      <>
        <HeaderParent
          title="Con cá»§a tÃ´i"
          subtitle="Danh sÃ¡ch cÃ¡c con Ä‘Ã£ Ä‘Æ°á»£c liÃªn káº¿t vá»›i tÃ i khoáº£n cá»§a báº¡n"
        />
        <div className="text-center py-12">
          <p className="text-gray-500">Äang táº£i...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <HeaderParent
          title="Con cá»§a tÃ´i"
          subtitle="Danh sÃ¡ch cÃ¡c con Ä‘Ã£ Ä‘Æ°á»£c liÃªn káº¿t vá»›i tÃ i khoáº£n cá»§a báº¡n"
        />
        <EmptyState
          icon="âŒ"
          title="CÃ³ lá»—i xáº£y ra"
          description="KhÃ´ng thá»ƒ táº£i dá»¯ liá»‡u. Vui lÃ²ng thá»­ láº¡i sau."
          variant="parent"
          action={
            <Button color="amber" onClick={() => mutate()}>
              Thá»­ láº¡i
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <HeaderParent
        title="Con cá»§a tÃ´i"
        subtitle={`Danh sÃ¡ch cÃ¡c con Ä‘Ã£ Ä‘Æ°á»£c liÃªn káº¿t vá»›i tÃ i khoáº£n cá»§a báº¡n (${total} há»c sinh)`}
      />

      <div className="flex gap-3 mb-6">
        <Button
          color="amber"
          onClick={() => setShowAcceptModal(true)}
        >
          <KeyRound className="h-4 w-4 mr-2" />
          Nháº­p mÃ£ má»i
        </Button>
        <Button
          variant="outline"
          color="amber"
          onClick={() => setShowSearchModal(true)}
        >
          <Search className="h-4 w-4 mr-2" />
          TÃ¬m há»c sinh
        </Button>
      </div>

      <div className="space-y-6">

      {/* Accept Invitation Modal */}
      <Dialog open={showAcceptModal} onOpenChange={setShowAcceptModal}>
        <DialogContent onClose={() => setShowAcceptModal(false)}>
          <DialogHeader variant="parent">
            <DialogTitle variant="parent">Nháº­p mÃ£ má»i tá»« há»c sinh</DialogTitle>
            <DialogDescription variant="parent">
              Nháº­p mÃ£ má»i 8 kÃ½ tá»± mÃ  há»c sinh Ä‘Ã£ gá»­i cho báº¡n
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5">
            <Input
              placeholder="VD: ABC12345"
              value={invitationCode}
              onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
              maxLength={8}
              color="amber"
              className="text-center text-3xl font-mono tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAcceptInvitation();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              color="amber"
              onClick={handleAcceptInvitation}
              disabled={isAccepting || !invitationCode.trim()}
              className="w-full"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Äang xá»­ lÃ½...
                </>
              ) : (
                "XÃ¡c nháº­n"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search Students Modal */}
      <Dialog open={showSearchModal} onOpenChange={setShowSearchModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onClose={() => setShowSearchModal(false)}>
          <DialogHeader variant="parent">
            <DialogTitle variant="parent">TÃ¬m kiáº¿m há»c sinh</DialogTitle>
            <DialogDescription variant="parent">
              TÃ¬m kiáº¿m há»c sinh theo tÃªn hoáº·c email Ä‘á»ƒ gá»­i yÃªu cáº§u liÃªn káº¿t
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-6 space-y-5">
            <div className="flex gap-3">
              <Input
                placeholder="Nháº­p tÃªn hoáº·c email há»c sinh..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                color="amber"
                className="flex-1"
              />
              <Button
                color="amber"
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {searchResults.map((student) => (
                  <SearchResultItem
                    key={student.id}
                    student={student}
                    isLinked={student.isLinked}
                    hasExistingRequest={student.hasExistingRequest}
                    onSendRequest={handleSendRequest}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="border-orange-200">
            <CardHeader className="border-b border-orange-100">
              <CardTitle className="text-orange-700">YÃªu cáº§u Ä‘ang chá» ({pendingRequests.length})</CardTitle>
              <CardDescription>
                CÃ¡c yÃªu cáº§u liÃªn káº¿t báº¡n Ä‘Ã£ gá»­i Ä‘ang chá» há»c sinh phÃª duyá»‡t
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              {pendingRequests.map((request: any) => (
                <PendingRequestItem
                  key={request.id}
                  request={request}
                  onCancel={handleCancelRequest}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Children List */}
        {children.length === 0 ? (
          <EmptyState
            icon="ðŸ‘¨â€ðŸ‘©â€ðŸ‘§"
            title="ChÆ°a cÃ³ há»c sinh nÃ o Ä‘Æ°á»£c liÃªn káº¿t"
            description="HÃ£y liÃªn há»‡ vá»›i quáº£n trá»‹ viÃªn hoáº·c tÃ¬m kiáº¿m há»c sinh Ä‘á»ƒ Ä‘Æ°á»£c liÃªn káº¿t vá»›i tÃ i khoáº£n cá»§a con báº¡n."
            variant="parent"
            action={
              <div className="flex gap-3 justify-center">
                <Button
                  color="amber"
                  onClick={() => setShowAcceptModal(true)}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Nháº­p mÃ£ má»i
                </Button>
                <Button
                  variant="outline"
                  color="amber"
                  onClick={() => setShowSearchModal(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  TÃ¬m há»c sinh
                </Button>
              </div>
            }
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((relationship) => (
              <StudentCard
                key={relationship.id}
                student={relationship.student}
                createdAt={relationship.createdAt}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}



