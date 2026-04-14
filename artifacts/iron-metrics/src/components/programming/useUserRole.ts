import { useAuth } from "@clerk/react";
import { useListStaff, useGetGym } from "@workspace/api-client-react";
import { useGym } from "@/store/GymContext";

export type UserRole = "gym_owner" | "admin" | "coach" | "head_coach" | "front_desk" | "analyst" | "member";

export function useUserRole(): { role: UserRole; isStaff: boolean; isLoading: boolean } {
  const { activeGymId } = useGym();
  const { userId, isLoaded } = useAuth();
  const { data: staffList, isLoading: staffLoading } = useListStaff(
    activeGymId as number,
    { query: { enabled: !!activeGymId } }
  );
  const { data: gym, isLoading: gymLoading } = useGetGym(
    activeGymId as number,
    { query: { enabled: !!activeGymId } }
  );

  const isLoading = !isLoaded || staffLoading || gymLoading;

  if (isLoading || !userId || !staffList) {
    return { role: "member", isStaff: false, isLoading };
  }

  if (gym && (gym as any).ownerId === userId) {
    return { role: "gym_owner", isStaff: true, isLoading: false };
  }

  const staffRecord = (staffList as any[]).find(
    (s) => s.userId === userId
  );

  if (staffRecord) {
    const role = (staffRecord.role || "coach") as UserRole;
    return { role, isStaff: true, isLoading: false };
  }

  return { role: "member", isStaff: false, isLoading: false };
}
