"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  MoreHorizontal,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  FileCode,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/task-utils";
import { createClient } from "@/lib/supabase/client";
import { createProjectFile, deleteProjectFile } from "./file-actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type ProjectFileData = {
  id: string;
  name: string;
  storage_path: string;
  size: number;
  content_type: string;
  uploaded_by: string;
  created_at: string;
  uploader_name: string;
  uploader_avatar: string | null;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith("image/")) return FileImage;
  if (contentType.includes("spreadsheet") || contentType.includes("csv") || contentType.includes("excel")) return FileSpreadsheet;
  if (contentType.includes("zip") || contentType.includes("rar") || contentType.includes("tar") || contentType.includes("gzip")) return FileArchive;
  if (contentType.includes("pdf")) return FileText;
  if (contentType.includes("json") || contentType.includes("javascript") || contentType.includes("typescript") || contentType.includes("html") || contentType.includes("css") || contentType.includes("xml")) return FileCode;
  return File;
}

function isPreviewable(contentType: string): boolean {
  return contentType.startsWith("image/") || contentType === "application/pdf";
}

export function ProjectFiles({
  projectId,
  files: initialFiles,
}: {
  projectId: string;
  files: ProjectFileData[];
}) {
  const [files, setFiles] = useState(initialFiles);
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFileData | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const filesToUpload = Array.from(fileList);
      if (filesToUpload.length === 0) return;

      setUploading(true);
      const supabase = createClient();

      for (const file of filesToUpload) {
        const fileId = crypto.randomUUID();
        const storagePath = `${projectId}/${fileId}/${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(storagePath, file, {
            contentType: file.type || "application/octet-stream",
          });

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        startTransition(async () => {
          const result = await createProjectFile({
            project_id: projectId,
            name: file.name,
            storage_path: storagePath,
            size: file.size,
            content_type: file.type || "application/octet-stream",
          });

          if (result.error) {
            toast.error(`Failed to save ${file.name}: ${result.error}`);
            // Cleanup storage on DB failure
            await supabase.storage.from("project-files").remove([storagePath]);
          } else if (result.id) {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: profile } = user
              ? await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single()
              : { data: null };

            setFiles((prev) => [
              {
                id: result.id!,
                name: file.name,
                storage_path: storagePath,
                size: file.size,
                content_type: file.type || "application/octet-stream",
                uploaded_by: user?.id ?? "",
                created_at: new Date().toISOString(),
                uploader_name: profile?.full_name ?? "You",
                uploader_avatar: profile?.avatar_url ?? null,
              },
              ...prev,
            ]);
            toast.success(`Uploaded ${file.name}`);
          }
        });
      }

      setUploading(false);
    },
    [projectId]
  );

  const handleDownload = async (file: ProjectFileData) => {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("project-files")
      .createSignedUrl(file.storage_path, 60);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate download link");
      return;
    }

    window.open(data.signedUrl, "_blank");
  };

  const handlePreview = async (file: ProjectFileData) => {
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("project-files")
      .createSignedUrl(file.storage_path, 300);

    if (error || !data?.signedUrl) {
      toast.error("Failed to generate preview");
      setPreviewFile(null);
    } else {
      setPreviewUrl(data.signedUrl);
    }
    setPreviewLoading(false);
  };

  const handleDelete = (file: ProjectFileData) => {
    startTransition(async () => {
      const result = await deleteProjectFile({
        id: file.id,
        project_id: projectId,
        storage_path: file.storage_path,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setFiles((prev) => prev.filter((f) => f.id !== file.id));
        toast.success(`Deleted ${file.name}`);
      }
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  return (
    <div
      className="flex-1 overflow-y-auto"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-primary p-12">
            <Upload className="h-10 w-10 text-primary" />
            <p className="text-lg font-medium text-primary">Drop files to upload</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl p-6">
        {/* Header with upload button */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Files</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>

        {/* File list */}
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-16">
            <FileText className="h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">No files yet</p>
            <p className="text-xs text-gray-400 mb-4">
              Upload files or drag & drop them here
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload files
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_140px_100px_40px] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span>Name</span>
              <span>Size</span>
              <span>Uploaded by</span>
              <span>Date</span>
              <span />
            </div>

            {/* File rows */}
            {files.map((file) => {
              const Icon = getFileIcon(file.content_type);
              return (
                <div
                  key={file.id}
                  className={cn(
                    "group grid grid-cols-[1fr_100px_140px_100px_40px] gap-2 items-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors",
                    isPending && "opacity-60"
                  )}
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-5 w-5 shrink-0 text-gray-400" />
                    <button
                      type="button"
                      onClick={() =>
                        isPreviewable(file.content_type)
                          ? handlePreview(file)
                          : handleDownload(file)
                      }
                      className="text-sm font-medium text-foreground truncate hover:underline text-left"
                    >
                      {file.name}
                    </button>
                  </div>

                  {/* Size */}
                  <span className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </span>

                  {/* Uploaded by */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar size="sm">
                      {file.uploader_avatar && (
                        <AvatarImage src={file.uploader_avatar} />
                      )}
                      <AvatarFallback>
                        {getInitials(file.uploader_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-500 truncate">
                      {file.uploader_name}
                    </span>
                  </div>

                  {/* Date */}
                  <span className="text-sm text-gray-500">
                    {formatDate(file.created_at)}
                  </span>

                  {/* Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          />
                        }
                      >
                        <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isPreviewable(file.content_type) && (
                          <DropdownMenuItem onClick={() => handlePreview(file)}>
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            Preview
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDownload(file)}>
                          <Download className="mr-2 h-3.5 w-3.5" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDelete(file)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview dialog */}
      <Dialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">
              {previewFile?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden rounded-md bg-gray-100 dark:bg-gray-900 flex items-center justify-center" style={{ minHeight: "60vh" }}>
            {previewLoading && (
              <p className="text-sm text-gray-500">Loading preview…</p>
            )}
            {!previewLoading && previewUrl && previewFile?.content_type.startsWith("image/") && (
              <img
                src={previewUrl}
                alt={previewFile.name}
                className="max-h-[65vh] max-w-full object-contain"
              />
            )}
            {!previewLoading && previewUrl && previewFile?.content_type === "application/pdf" && (
              <iframe
                src={previewUrl}
                title={previewFile.name}
                className="w-full rounded-md"
                style={{ height: "65vh" }}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => previewFile && handleDownload(previewFile)}
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
