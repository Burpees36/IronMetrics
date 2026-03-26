import React from "react";
import { useGetGym } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Palette, ImageIcon } from "lucide-react";

interface Props {
  gymId: number;
}

export function BrandingSettings({ gymId }: Props) {
  const { data: gym } = useGetGym(gymId, { query: { enabled: !!gymId } });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Logo</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Your gym's logo appears in emails, the member app, and reports.</p>

        <div className="flex items-center gap-6">
          <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-border bg-background flex items-center justify-center">
            {gym?.logoUrl ? (
              <img src={gym.logoUrl} alt="Gym logo" className="h-full w-full object-cover rounded-2xl" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div>
            <button className="px-4 py-2 text-sm font-medium rounded-xl border border-border hover:bg-secondary transition-colors">
              Upload Logo
            </button>
            <p className="text-xs text-muted-foreground mt-2">PNG, JPG, or SVG. Recommended 512x512px.</p>
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

        <p className="text-xs text-muted-foreground mt-4">Custom color selection coming soon. Colors will apply to emails, member app, and public pages.</p>
      </motion.div>
    </div>
  );
}
