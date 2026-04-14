import { useMemo } from "react";
import { motion } from "framer-motion";
import { GitBranch, X, Loader2 } from "lucide-react";
import { useListProgrammingTracks, useUpdateMember } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface MemberTrackAssignmentProps {
  member: {
    id: number;
    tags?: string[] | null;
    firstName?: string;
    lastName?: string;
  };
  gymId: number;
  onUpdate: () => void;
}

const TRACK_PREFIX = "track:";

export function MemberTrackAssignment({ member, gymId, onUpdate }: MemberTrackAssignmentProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateMember();

  const { data: tracksList } = useListProgrammingTracks(gymId, {
    query: { enabled: !!gymId },
  });

  const availableTracks = useMemo(() => {
    if (!tracksList) return ["default"];
    const tracks = tracksList as string[];
    return tracks.length > 0 ? tracks : ["default"];
  }, [tracksList]);

  const memberTags = member.tags || [];
  const assignedTracks = useMemo(
    () => memberTags.filter((t) => t.startsWith(TRACK_PREFIX)).map((t) => t.slice(TRACK_PREFIX.length)),
    [memberTags]
  );
  const nonTrackTags = useMemo(
    () => memberTags.filter((t) => !t.startsWith(TRACK_PREFIX)),
    [memberTags]
  );
  const unassignedTracks = useMemo(
    () => availableTracks.filter((t) => t !== "default" && !assignedTracks.includes(t)),
    [availableTracks, assignedTracks]
  );

  const handleAddTrack = (trackName: string) => {
    const newTags = [...nonTrackTags, ...assignedTracks.map((t) => TRACK_PREFIX + t), TRACK_PREFIX + trackName];
    updateMutation.mutate(
      { gymId, memberId: member.id, data: { tags: newTags } },
      {
        onSuccess: () => {
          toast({ title: "Track assigned", description: `${member.firstName} added to "${trackName}" track.` });
          onUpdate();
        },
        onError: () => {
          toast({ title: "Failed to assign track", variant: "destructive" });
        },
      }
    );
  };

  const handleRemoveTrack = (trackName: string) => {
    const newTags = [...nonTrackTags, ...assignedTracks.filter((t) => t !== trackName).map((t) => TRACK_PREFIX + t)];
    updateMutation.mutate(
      { gymId, memberId: member.id, data: { tags: newTags } },
      {
        onSuccess: () => {
          toast({ title: "Track removed", description: `${member.firstName} removed from "${trackName}" track.` });
          onUpdate();
        },
        onError: () => {
          toast({ title: "Failed to remove track", variant: "destructive" });
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2"
    >
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
        <GitBranch className="h-5 w-5 text-primary" /> Programming Tracks
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Assign this member to specific programming tracks. Members on the "default" track see the main WOD.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
          default
        </span>
        {assignedTracks.map((track) => (
          <span
            key={track}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 text-violet-600 rounded-full text-xs font-medium border border-violet-500/20"
          >
            {track}
            <button
              onClick={() => handleRemoveTrack(track)}
              disabled={updateMutation.isPending}
              className="hover:bg-violet-500/20 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {unassignedTracks.length > 0 ? (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) {
              handleAddTrack(e.target.value);
            }
          }}
          className="flex h-8 rounded-lg border border-input bg-muted/30 px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Add track...</option>
          {unassignedTracks.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      ) : (
        <p className="text-xs text-muted-foreground">
          {availableTracks.length <= 1
            ? "No tracks created yet. Create tracks from the Workouts page."
            : "All available tracks are assigned."}
        </p>
      )}
    </motion.div>
  );
}
