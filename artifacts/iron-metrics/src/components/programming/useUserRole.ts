import { useAuth } from "@workspace/replit-auth-web";
import { useListStaff, useGetGym } from "@workspace/api-client-react";
import { useGym } from "@/store/GymContext";

export type UserRole = "gym_owner" | "admin" | "coach" | "head_coach" | "front_desk" | "analyst" | "member";

export function useUserRole(): { role: UserRole; isStaff: boolean; isLoading: boolean } {
  const { activeGymId } = useGym();
  const { user, isLoading: userLoading } = useAuth();
  const { data: staffList, isLoading: staffLoading } = useListStaff(
    activeGymId as number,
    { query: { enabled: !!activeGymId } }
  );
  const { data: gym, isLoading: gymLoading } = useGetGym(
    activeGymId as number,
    { query: { enabled: !!activeGymId } }
  );

  const isLoading = userLoading || staffLoading || gymLoading;

  if (isLoading || !user || !staffList) {
    return { role: "member", isStaff: false, isLoading };
  }

  if (gym && (gym as any).ownerId === user.id) {
    return { role: "gym_owner", isStaff: true, isLoading: false };
  }

  const staffRecord = (staffList as any[]).find(
    (s) => s.userId === user.id
  );

  if (staffRecord) {
    const role = (staffRecord.role || "coach") as UserRole;
    return { role, isStaff: true, isLoading: false };
  }

  return { role: "member", isStaff: false, isLoading: false };
}
