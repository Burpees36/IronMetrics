import { useAuth } from "@workspace/replit-auth-web";
import { useListStaff } from "@workspace/api-client-react";
import { useGym } from "@/store/GymContext";

export type UserRole = "gym_owner" | "admin" | "coach" | "head_coach" | "front_desk" | "analyst" | "member";

export function useUserRole(): { role: UserRole; isStaff: boolean; isLoading: boolean } {
  const { activeGymId } = useGym();
  const { user, isLoading: userLoading } = useAuth();
  const { data: staffList, isLoading: staffLoading } = useListStaff(
    activeGymId as number,
    { query: { enabled: !!activeGymId } }
  );

  const isLoading = userLoading || staffLoading;

  if (isLoading || !user || !staffList) {
    return { role: "member", isStaff: false, isLoading };
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
