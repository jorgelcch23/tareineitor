"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRef, useState, useCallback, useEffect } from "react";
import type { Json } from "@/lib/types/database";

const MAX_WIDTH = 1200;

/**
 * Description is stored as:
 *   { content: <tiptap JSON>, images: string[] }
 * Old format (plain tiptap JSON) is also supported for reading.
 */
type DescriptionWrapper = {
  content: Record<string, unknown> | null;
  images: string[];
};

function unwrap(raw: Json | null): DescriptionWrapper {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { content: null, images: [] };
  }
  const obj = raw as Record<string, unknown>;
  // New format: { content, images }
  if ("images" in obj && Array.isArray(obj.images)) {
    return {
      content: (obj.content as Record<string, unknown>) ?? null,
      images: obj.images as string[],
    };
  }
  // Old format: plain tiptap JSON (has "type":"doc")
  if (obj.type === "doc") {
    return { content: obj as Record<string, unknown>, images: [] };
  }
  return { content: null, images: [] };
}

function wrap(
  content: Record<string, unknown>,
  images: string[]
): Json {
  return { content, images } as unknown as Json;
}

/** Resize image and return a data URL (JPEG, quality 0.8). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

interface TiptapEditorProps {
  content: Json | null;
  onSave: (content: Json) => void;
  placeholder?: string;
  projectId?: string;
}

export function TiptapEditor({
  content,
  onSave,
  placeholder = "Write a description...",
}: TiptapEditorProps) {
  const initial = unwrap(content);
  const [images, setImages] = useState<string[]>(initial.images);
  const imagesRef = useRef(images);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // keep ref in sync for the blur handler closure
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const save = useCallback(
    (editorJson: Record<string, unknown>, imgs: string[]) => {
      onSave(wrap(editorJson, imgs));
    },
    [onSave]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: initial.content,
    onBlur({ editor: ed }) {
      save(ed.getJSON(), imagesRef.current);
    },
  });

  /** Process files (from paste, drop, or picker) */
  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;

      const newUrls: string[] = [];
      for (const file of arr) {
        try {
          newUrls.push(await fileToDataUrl(file));
        } catch {
          toast.error("Failed to process image");
        }
      }
      if (newUrls.length === 0) return;

      const next = [...images, ...newUrls];
      setImages(next);
      if (editor) save(editor.getJSON(), next);
    },
    [editor, save, images]
  );

  const removeImage = useCallback(
    (index: number) => {
      const next = images.filter((_, i) => i !== index);
      setImages(next);
      if (editor) save(editor.getJSON(), next);
    },
    [editor, save, images]
  );

  // Global paste handler (catches paste even outside editor)
  useEffect(() => {
    const el = document.getElementById("tiptap-wrapper");
    if (!el) return;
    const handlePaste = (e: Event) => {
      const ce = e as ClipboardEvent;
      const items = ce.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length > 0) {
        ce.preventDefault();
        processFiles(imageFiles);
      }
    };
    const handleDrop = (e: Event) => {
      const de = e as DragEvent;
      const files = de.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (imageFiles.length > 0) {
        de.preventDefault();
        processFiles(imageFiles);
      }
    };
    const handleDragOver = (e: Event) => e.preventDefault();

    el.addEventListener("paste", handlePaste);
    el.addEventListener("drop", handleDrop);
    el.addEventListener("dragover", handleDragOver);
    return () => {
      el.removeEventListener("paste", handlePaste);
      el.removeEventListener("drop", handleDrop);
      el.removeEventListener("dragover", handleDragOver);
    };
  }, [processFiles]);

  if (!editor) return null;

  return (
    <div id="tiptap-wrapper" className="rounded-lg border border-border">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => fileInputRef.current?.click()}
          active={false}
          title="Add image"
        >
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Attached images */}
      {images.length > 0 && (
        <div className="border-t border-border p-3 flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={i} className="relative group">
              <img
                src={src}
                alt=""
                className="max-h-40 rounded border border-border object-contain"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs"
                title="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}
