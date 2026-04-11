import React, { useRef, useState, useCallback } from "react";
import { useGetGym, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Palette, ImageIcon, Upload, Trash2, Loader2 } from "lucide-react";

interface Props {
  gymId: number;
}

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024;

export function BrandingSettings({ gymId }: Props) {
  const { data: gym } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Invalid file type. Please upload a PNG, JPG, or SVG.");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("File is too large. Maximum size is 2MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const urlRes = await fetch(`/api/gyms/${gymId}/logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type, size: file.size }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to initiate upload");
      }

      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const saveRes = await fetch(`/api/gyms/${gymId}/logo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save logo");
      }

      await queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [gymId, queryClient]);

  const handleRemove = useCallback(async () => {
    setError(null);
    setIsRemoving(true);

    try {
      const res = await fetch(`/api/gyms/${gymId}/logo`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to remove logo");
      }

      await queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(gymId) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove logo");
    } finally {
      setIsRemoving(false);
    }
  }, [gymId, queryClient]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Logo</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Your gym's logo appears in emails, the member app, and reports.</p>

        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-background flex items-center justify-center overflow-hidden relative">
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {gym?.logoUrl ? (
              <img src={gym.logoUrl} alt="Gym logo" className="h-full w-full object-cover rounded-2xl" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.svg"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleUploadClick}
                disabled={isUploading || isRemoving}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {gym?.logoUrl ? "Change Logo" : "Upload Logo"}
                  </>
                )}
              </button>
              {gym?.logoUrl && (
                <button
                  onClick={handleRemove}
                  disabled={isUploading || isRemoving}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG, or SVG. Max 2MB. Recommended 512x512px.</p>
            {error && (
              <p className="text-xs text-destructive mt-1">{error}</p>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Brand Colors</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Customize colors used in member-facing surfaces.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-sm font-medium mb-2">Primary Color</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary border border-border" />
              <span className="text-sm text-muted-foreground font-mono">#10B981</span>
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-sm font-medium mb-2">Accent Color</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-card border border-border" />
              <span className="text-sm text-muted-foreground font-mono">Default</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Coming soon</span> — Custom color selection will let you personalize emails, the member app, and public pages with your brand colors.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
