"use client";

import React, { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";

interface EssayQuestionEditorProps {
  value: string;
  onChange: (v: string) => void;
  minChars?: number;
  maxChars?: number;
  placeholder?: string;
  className?: string;
}

function clampText(text: string, max?: number) {
  if (!max) return text;
  return text.length > max ? text.slice(0, max) : text;
}

export default function EssayQuestionEditor({
  value,
  onChange,
  minChars = 5,
  maxChars = 5000,
  placeholder = "Nhập câu hỏi tự luận cho học sinh...",
  className,
}: EssayQuestionEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef<string>("");
  const composingRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<number | null>(null);
  const [active, setActive] = useState({ bold: false, italic: false, underline: false, ul: false, ol: false });

  const assistId = useMemo(() => `assist-${Math.random().toString(36).slice(2, 8)}`, []);

  const getTextFromHtml = useCallback((html: string) => {
    const el = document.createElement("div");
    el.innerHTML = html || "";
    return (el.textContent || "").replace(/\u200B/g, "");
  }, []);

  const sanitizeHtml = useCallback((html: string): string => {
    const container = document.createElement("div");
    container.innerHTML = html || "";
    const allowed = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "P", "BR"]);
    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (!allowed.has(el.tagName)) {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
          return;
        }
        for (const a of Array.from(el.attributes)) el.removeAttribute(a.name);
      }
      let child = node.firstChild;
      while (child) {
        const next = child.nextSibling;
        walk(child);
        child = next;
      }
    };
    walk(container);
    Array.from(container.childNodes).forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim().length) {
        const p = document.createElement("p");
        p.textContent = n.textContent;
        container.insertBefore(p, n);
        container.removeChild(n);
      }
    });
    // Gộp các <li> mồ côi thành một <ul>
    const wrapOrphanLis = () => {
      let i = 0;
      while (i < container.childNodes.length) {
        const node = container.childNodes[i] as HTMLElement | ChildNode;
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'LI') {
          const ul = document.createElement('ul');
          container.insertBefore(ul, node);
          while (i < container.childNodes.length) {
            const n = container.childNodes[i] as HTMLElement | ChildNode;
            if (n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'LI') {
              ul.appendChild(n);
            } else {
              break;
            }
          }
        } else {
          i++;
        }
      }
    };
    wrapOrphanLis();
    container.querySelectorAll("ul,ol").forEach((list) => {
      Array.from(list.childNodes).forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim().length) {
          const li = document.createElement("li");
          li.textContent = n.textContent;
          list.insertBefore(li, n);
          list.removeChild(n);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const el = n as HTMLElement;
          if (el.tagName !== "LI") {
            const li = document.createElement("li");
            while (el.firstChild) li.appendChild(el.firstChild);
            list.insertBefore(li, el);
            list.removeChild(el);
          }
        }
      });
    });
    // Chuyển <li><p>...</p><p>...</p></li> -> <li>...<br>...</li>
    // Xoá <p> bên trong <li>, giữ nội dung + <br> giữa các đoạn
    container.querySelectorAll("li p").forEach((p) => {
      const li = p.closest("li");
      if (!li) return;
      const fr = document.createDocumentFragment();
      Array.from(p.childNodes).forEach((c) => fr.appendChild(c));
      li.insertBefore(fr, p);
      // Chỉ thêm <br> nếu không phải <p> cuối cùng trong <li>
      if (p.nextElementSibling) {
        li.insertBefore(document.createElement("br"), p.nextSibling);
      }
      p.remove();
    });
    // Loại bỏ li rỗng (không text, chỉ br/whitespace) để tránh bullet đè dòng kế
    container.querySelectorAll("li").forEach((li) => {
      const text = (li.textContent || "").replace(/\u00a0/g, " ").trim();
      const onlyBr = Array.from(li.childNodes).every((n) => n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR');
      if (!text || onlyBr) li.remove();
      // Xoá <br> thừa ở đầu/cuối để tránh bullet chiếm dòng riêng
      while (li.firstChild && li.firstChild.nodeType === Node.ELEMENT_NODE && (li.firstChild as HTMLElement).tagName === 'BR') {
        li.removeChild(li.firstChild);
      }
      while (li.lastChild && li.lastChild.nodeType === Node.ELEMENT_NODE && (li.lastChild as HTMLElement).tagName === 'BR') {
        li.removeChild(li.lastChild);
      }
    });
    const out = container.innerHTML.replace(/<p><br\/?><\/p>/g, "<br>");
    return out;
  }, []);

  const escapeHtml = useCallback((text: string) => {
    return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }, []);

  const ensureEditorHtml = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = value || "";
    const treatAsHtml = /<\w[\s\S]*>/i.test(incoming);

    const convertBasicMarkdownToHtml = (text: string) => {
      const lines = text.split(/\r?\n/);
      let html = "";
      let listType: 'ul' | 'ol' | null = null;
      const flushList = () => { if (listType) { html += listType === 'ul' ? '</ul>' : '</ol>'; listType = null; } };
      const applyInline = (s: string) => {
        // Bold **text**
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        // Underline __text__ (we used this previously for underline)
        s = s.replace(/__([^_]+)__/g, '<u>$1</u>');
        // Italic *text* (single asterisks only)
        s = s.replace(/\*(?!\*)([^*]+)\*(?!\*)/g, '<em>$1</em>');
        return s;
      };
      for (const raw of lines) {
        const mOl = raw.match(/^\s*(\d+)\.\s+(.+)$/);
        const mUl = raw.match(/^\s*[-*+]\s+(.+)$/);
        if (mOl) {
          if (listType !== 'ol') { flushList(); html += '<ol>'; listType = 'ol'; }
          html += `<li>${applyInline(mOl[2])}</li>`;
          continue;
        }
        if (mUl) {
          if (listType !== 'ul') { flushList(); html += '<ul>'; listType = 'ul'; }
          html += `<li>${applyInline(mUl[1])}</li>`;
          continue;
        }
        flushList();
        const content = raw.trim().length ? applyInline(raw) : '<br>';
        html += content === '<br>' ? '<br>' : `<p>${content}</p>`;
      }
      flushList();
      return html;
    };

    const base = treatAsHtml
      ? sanitizeHtml(incoming)
      : sanitizeHtml(convertBasicMarkdownToHtml(escapeHtml(incoming)));
    if (base !== lastHtmlRef.current) {
      const domHtml = base === "" ? "<p><br></p>" : base;
      el.innerHTML = domHtml;
      lastHtmlRef.current = base;
    }
  }, [escapeHtml, sanitizeHtml, value]);

  useEffect(() => {
    ensureEditorHtml();
  }, [ensureEditorHtml]);

  const length = getTextFromHtml(value).length;
  const tooShort = length < minChars;

  // Helper: lấy phần tử gần nhất từ một Node (có thể là Text) rồi gọi closest(selector)
  const closestFromNode = useCallback((node: Node | null, selector: string): HTMLElement | null => {
    if (!node) return null;
    let el: HTMLElement | null = null;
    if (node.nodeType === Node.ELEMENT_NODE) {
      el = node as HTMLElement;
    } else if ((node as any).parentElement) {
      el = (node as any).parentElement as HTMLElement;
    } else if (node.parentNode && node.parentNode.nodeType === Node.ELEMENT_NODE) {
      el = node.parentNode as HTMLElement;
    }
    return el ? el.closest(selector) : null;
  }, []);

  // Chuẩn hoá danh sách và dọn DOM: dùng sớm để tránh TDZ trong các hook dưới
  const normalizeLists = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    let activeLi: HTMLElement | null = null;
    if (sel && sel.rangeCount > 0) {
      const node = sel.getRangeAt(0).commonAncestorContainer as Node;
      activeLi = closestFromNode(node, "li");
    }
    el.querySelectorAll("ul,ol").forEach((list) => {
      Array.from(list.childNodes).forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim().length) {
          const li = document.createElement("li");
          li.textContent = n.textContent;
          list.insertBefore(li, n);
          list.removeChild(n);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          const eln = n as HTMLElement;
          if (eln.tagName !== "LI") {
            const li = document.createElement("li");
            while (eln.firstChild) li.appendChild(eln.firstChild);
            list.insertBefore(li, eln);
            list.removeChild(eln);
          }
        }
      });
    });
    el.querySelectorAll("li p").forEach((p) => {
      const li = p.closest("li");
      if (!li) return;
      const fr = document.createDocumentFragment();
      Array.from(p.childNodes).forEach((c) => fr.appendChild(c));
      li.insertBefore(fr, p);
      if (p.nextElementSibling) li.insertBefore(document.createElement("br"), p.nextSibling);
      p.remove();
    });
    el.querySelectorAll("li").forEach((li) => {
      const isActive = activeLi === li;
      const text = (li.textContent || "").replace(/[\u00a0\u200B]/g, " ").trim();
      const onlyBr = Array.from(li.childNodes).every((n) => n.nodeType === Node.ELEMENT_NODE && (n as HTMLElement).tagName === 'BR');
      if (!text || onlyBr) {
        if (!isActive) {
          li.remove();
          return;
        }
      }
      // Dọn <br> thừa ở đầu/cuối nhưng giữ lại 1 <br> cho li đang active để caret đứng được
      while (
        li.firstChild &&
        li.firstChild.nodeType === Node.ELEMENT_NODE &&
        (li.firstChild as HTMLElement).tagName === 'BR' &&
        (!isActive || li.childNodes.length > 1)
      ) {
        li.removeChild(li.firstChild);
      }
      while (
        li.lastChild &&
        li.lastChild.nodeType === Node.ELEMENT_NODE &&
        (li.lastChild as HTMLElement).tagName === 'BR' &&
        (!isActive || li.childNodes.length > 1)
      ) {
        li.removeChild(li.lastChild);
      }
      if (isActive && li.childNodes.length === 0) {
        li.appendChild(document.createElement('br'));
      }
    });
  }, []);

  const emitChangeNow = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    let html = el.innerHTML;
    // Xoá <p> bên trong <li> trước khi sanitize
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    tempDiv.querySelectorAll("li p").forEach((p) => {
      const li = p.closest("li");
      if (li) {
        const fr = document.createDocumentFragment();
        Array.from(p.childNodes).forEach((c) => fr.appendChild(c));
        li.insertBefore(fr, p);
        if (p.nextElementSibling) li.insertBefore(document.createElement("br"), p.nextSibling);
        p.remove();
      }
    });
    html = tempDiv.innerHTML;
    const clean = sanitizeHtml(html);
    lastHtmlRef.current = clean;
    onChange(clean);
  }, [onChange, sanitizeHtml]);

  const emitChangeDebounced = useCallback(() => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      emitChangeNow();
    }, 120);
  }, [emitChangeNow]);

  const applyCmd = useCallback((cmd: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    // Xử lý danh sách tùy chỉnh để tránh DOM lộn xộn từ execCommand
    if (cmd === "insertUnorderedList" || cmd === "insertOrderedList") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const anc = range.commonAncestorContainer as Node;
      const li = closestFromNode(anc, "li");
      const ul = closestFromNode(anc, "ul");
      const ol = closestFromNode(anc, "ol");
      const inList = li || ul || ol;
      const isUl = cmd === "insertUnorderedList";
      const isOl = cmd === "insertOrderedList";
      const currentIsUl = !!ul;
      const currentIsOl = !!ol;

      // Nếu đang ở list và bấm cùng loại → toggle off list (ổn định hơn outdent)
      if (inList && ((isUl && currentIsUl) || (isOl && currentIsOl))) {
        document.execCommand(cmd);
        normalizeLists();
        setTimeout(emitChangeDebounced, 0);
        return;
      }
      // Nếu đang ở list khác loại → chuyển loại
      if (inList && ((isUl && currentIsOl) || (isOl && currentIsUl))) {
        const list = (currentIsUl ? ul : ol) as HTMLElement;
        if (list && list.parentNode) {
          const desired = document.createElement(isUl ? 'ul' : 'ol');
          while (list.firstChild) desired.appendChild(list.firstChild);
          list.parentNode.replaceChild(desired, list);
          normalizeLists();
          setTimeout(emitChangeDebounced, 0);
          return;
        }
      }
      // Không ở list → tạo list mới
      document.execCommand(cmd);
      normalizeLists();
    } else {
      document.execCommand(cmd);
    }
    // execCommand may not always trigger input
    normalizeLists();
    setTimeout(emitChangeDebounced, 0);
  }, [closestFromNode, normalizeLists, emitChangeDebounced]);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const inList = document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList");
    const lines = text.split(/\r?\n/);
    let html = "";
    if (inList) {
      // Trong list: dán các dòng thành <br> để tránh tạo li mồ côi/nested sai
      html = lines
        .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");
    } else {
      html = lines
        .map((line) => (line.trim().length ? line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "<br>"))
        .map((line) => (line === "<br>" ? "<br>" : `<p>${line}</p>`))
        .join("");
    }
    document.execCommand("insertHTML", false, html);
    requestAnimationFrame(() => { normalizeLists(); emitChangeDebounced(); });
  }, [normalizeLists, emitChangeDebounced]);

  const onBeforeInput = useCallback((e: React.FormEvent<HTMLDivElement> & { nativeEvent: InputEvent }) => {
    if (!maxChars) return;
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    const selectedLen = sel && sel.toString() ? sel.toString().length : 0;
    const plainLen = (el.textContent || "").length;
    const nev = e.nativeEvent as InputEvent & { isComposing?: boolean };
    const isInsert = (nev.inputType || "").startsWith("insert");
    const isDelete = (nev.inputType || "").startsWith("delete");
    if (nev.isComposing || composingRef.current) return;
    if (isDelete) return;
    if (isInsert && selectedLen === 0 && plainLen >= maxChars) {
      nev.preventDefault();
    }
  }, [maxChars]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const nev: any = (e as any).nativeEvent;
    if ((nev && nev.isComposing) || composingRef.current) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "b") { e.preventDefault(); applyCmd("bold"); }
      if (e.key.toLowerCase() === "i") { e.preventDefault(); applyCmd("italic"); }
      if (e.key.toLowerCase() === "u") { e.preventDefault(); applyCmd("underline"); }
    }
    // Tab để thụt/dịch danh sách
    if (e.key === "Tab") {
      e.preventDefault();
      // Chỉ indent/outdent khi đang ở list
      const inList = document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList");
      if (inList) applyCmd(e.shiftKey ? "outdent" : "indent");
    }
    // Shift+Enter: chèn <br> để xuống dòng mềm
    if (e.key === "Enter" && e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      document.execCommand("insertHTML", false, "<br>");
      return;
    }
    // Enter trong list rỗng → thoát list
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const li = closestFromNode(range.commonAncestorContainer, "li");
      if (li) {
        const text = (li.textContent || "").trim();
        if (!text) {
          e.preventDefault();
          document.execCommand("outdent");
          return;
        }
        // Bình thường để browser tách li; sau đó normalize ở frame kế tiếp
        requestAnimationFrame(() => normalizeLists());
      }
    }
  }, [applyCmd, closestFromNode, normalizeLists]);

  const onCompositionStart = useCallback(() => { composingRef.current = true; }, []);
  const onCompositionEnd = useCallback(() => { composingRef.current = false; emitChangeDebounced(); }, [emitChangeDebounced]);

  // Cập nhật trạng thái toolbar theo selection (tính ul/ol theo phần tử gần nhất để tránh đồng thời true)
  useEffect(() => {
    let raf = 0;
    const handler = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const sel = window.getSelection();
        let el: HTMLElement | null = null;
        if (sel && sel.rangeCount > 0) {
          const node = sel.getRangeAt(0).commonAncestorContainer;
          el = (node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : (node.parentElement));
        }
        const nearestUL = el?.closest?.("ul");
        const nearestOL = el?.closest?.("ol");
        setActive({
          bold: document.queryCommandState("bold"),
          italic: document.queryCommandState("italic"),
          underline: document.queryCommandState("underline"),
          ul: !!nearestUL && !nearestOL,
          ol: !!nearestOL && !nearestUL,
        });
      });
    };
    document.addEventListener("selectionchange", handler);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      document.removeEventListener("selectionchange", handler);
    };
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Nội dung câu hỏi <span className="text-red-500">*</span></Label>
        <div className="text-xs text-gray-500">{length}/{maxChars} ký tự</div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-50 border rounded-lg">
        <Button type="button" size="sm" variant={active.bold ? "primary" : "ghost"} className="h-8" onClick={() => applyCmd("bold")} aria-pressed={active.bold} aria-label="Đậm">
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant={active.italic ? "primary" : "ghost"} className="h-8" onClick={() => applyCmd("italic")} aria-pressed={active.italic} aria-label="Nghiêng">
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant={active.underline ? "primary" : "ghost"} className="h-8" onClick={() => applyCmd("underline")} aria-pressed={active.underline} aria-label="Gạch chân">
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <Button type="button" size="sm" variant={active.ul ? "primary" : "ghost"} className="h-8" onClick={() => applyCmd("insertUnorderedList")} aria-pressed={active.ul} aria-label="Danh sách gạch đầu dòng">
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant={active.ol ? "primary" : "ghost"} className="h-8" onClick={() => applyCmd("insertOrderedList")} aria-pressed={active.ol} aria-label="Danh sách đánh số">
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-invalid={tooShort}
        aria-describedby={assistId}
        onInput={() => { if (!composingRef.current) { requestAnimationFrame(() => { normalizeLists(); emitChangeDebounced(); }); } }}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        onBeforeInput={onBeforeInput as unknown as React.FormEventHandler<HTMLDivElement>}
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        className={cn(
          "mt-1 w-full min-h-[140px] text-base leading-7 rounded-lg border-2 pl-4 pr-3 py-2",
          "focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
          "max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:list-inside [&_ol]:list-inside [&_ul,&_ol]:pl-9 [&_p]:my-1 [&_li]:my-1",
          tooShort ? "border-red-300" : "border-blue-200 bg-gradient-to-b from-white to-blue-50"
        )}
      />

      <p id={assistId} className={cn("text-sm", tooShort ? "text-red-600" : "text-gray-500")}> 
        Hỗ trợ định dạng cơ bản (đậm, nghiêng, gạch chân, danh sách). Tối thiểu {minChars} ký tự.
      </p>
    </div>
  );
}
