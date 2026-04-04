import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions as _UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
type UseQueryOptions<TQueryFnData = unknown, TError = unknown, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = Omit<_UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryKey"> & {
    queryKey?: TQueryKey;
};
import type { AdjustBalanceBody, AdjustMemberBalance200, AiGeneratedContent, AiImpactResponse, AiLastScanResponse, AiTask, Announcement, ApplyDiscountToSubscription200, ApplyDiscountToSubscriptionBody, ApplyTemplateBody, Appointment, AppointmentType, Attendance, AttendanceReport, AuthUser, AutopilotSettings, BillingMaintenanceResponse, BillingRecovery, BillingSummary, CancelSubscriptionBody, CancelledMembersResponse, ChangePlanBody, ChangePlanResponse, CheckInBody, CheckMemberEmailParams, CheckinStatus, ClassTemplate, ClassTemplateDetail, CoachAvailabilitySlot, CohortData, CompletePaymentUpdateBody, ConvertLeadToMemberBody, CopyWeekBody, CopyWeekPreview, CopyWeekResult, CreateAiTaskBody, CreateAnnouncementBody, CreateAppointmentBody, CreateAppointmentTypeBody, CreateClassBody, CreateClassTemplateBody, CreateCoachAvailabilityBody, CreateDiscountCodeBody, CreateDocumentBody, CreateGymBody, CreateHoldBody, CreateLeadActivityBody, CreateLeadBody, CreateMemberBody, CreateMemberNoteBody, CreateMembershipPlanBody, CreateOnboardingSetupIntent200, CreateOnboardingSetupIntentBody, CreateOneTimeChargeBody, CreatePaymentUpdateSetupIntentBody, CreateProductBody, CreateProgrammingDayBody, CreateProgrammingSectionBody, CreateSaleBody, CreateSetupIntent200, CreateStripeSubscriptionBody, CreateSubscriptionBody, CreateWorkoutBody, CreateWorkoutResultBody, DashboardStats, DisableTax200, DiscountCode, DuplicateProgrammingDayBody, EmailCheckResult, EmailStatusResponse, ErrorEnvelope, GenerateAiTasksResponse, GenerateOutreachBody, GenerateProgrammingDayBody, GenerateProgrammingWeekBody, GenerateRecoveryLinkBody, GenerateRecoveryLinkResponse, GenerateWeekResponse, GetAiImpactParams, GetCancelledMembersParams, GetMemberBalance200, GetMemberBillingHistory200, GetMemberLinkedBilling200, GetRsiHistoryParams, GetStripePublishableKey200, GraceEvaluationResponse, Gym, GymClass, GymClassDetail, GymDocument, HealthStatus, IntelligenceOverview, Intervention, InviteStaffBody, Invoice, Lead, LeadActivity, LeadCaptureBody, LeadCaptureGymInfo, LeadInsights, LinkMemberBilling200, LinkMemberBillingBody, ListAppointmentsParams, ListAttendanceParams, ListClassesParams, ListCoachAvailabilityParams, ListInvoicesParams, ListLeadsParams, ListMembersParams, ListPaymentMethods200Item, ListProgrammingDaysParams, ListSubscriptionsParams, ListWorkoutsParams, Member, MemberDetail, MemberListResponse, MemberNote, MemberRiskProfile, MembershipPlan, MembershipReport, MorningBriefing, PaymentRecord, PaymentUpdateCompleteResponse, PaymentUpdateSetupIntent, PaymentUpdateValidation, PlanChangePreview, PreviewPlanChangeBody, Product, ProgrammingDayWithSections, ProgrammingPreferences, ProgrammingSection, RefundPaymentBody, RefundRecord, RemoveDiscountFromSubscription200, RemovePaymentMethod200, ReorderSectionsBody, RetentionStabilityIndex, RevenueForecast, RevenueReport, RsiHistory, Sale, ScheduledHold, SendEmailResponse, SendLeadSmsBody, SendMemberSmsBody, SendRecoveryLinkResponse, SendSmsResponse, SendTestSmsBody, SetDefaultPaymentMethod200, SmsStatusResponse, StaffMember, StripeInvoice, SubmitLeadCapture201, Subscription, SuccessResponse, TaxConfig, TimelineEvent, TriggerAutoPublish200, UnlinkMemberBilling200, UpdateAiTaskBody, UpdateAppointmentBody, UpdateAppointmentTypeBody, UpdateAutopilotSettingsBody, UpdateClassBody, UpdateClassTemplateBody, UpdateDiscountCodeBody, UpdateGymBody, UpdateHoldBody, UpdateLeadBody, UpdateMemberBody, UpdateMembershipPlanBody, UpdateProgrammingDayBody, UpdateProgrammingPreferencesBody, UpdateProgrammingSectionBody, UpdateStaffBody, UpdateSubscriptionBody, UpdateTaxConfig200, UpdateTaxConfigBody, UploadUrlRequest, UploadUrlResponse, ValidatePaymentUpdateTokenParams, Workout, WorkoutResult } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns a presigned GCS URL for direct upload. The client sends JSON
metadata here, then uploads the file directly to the returned URL.

 * @summary Request a presigned URL for file upload
 */
export declare const getRequestUploadUrlUrl: () => string;
export declare const requestUploadUrl: (uploadUrlRequest: UploadUrlRequest, options?: RequestInit) => Promise<UploadUrlResponse>;
export declare const getRequestUploadUrlMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
export type RequestUploadUrlMutationResult = NonNullable<Awaited<ReturnType<typeof requestUploadUrl>>>;
export type RequestUploadUrlMutationBody = BodyType<UploadUrlRequest>;
export type RequestUploadUrlMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary Request a presigned URL for file upload
 */
export declare const useRequestUploadUrl: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
        data: BodyType<UploadUrlRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof requestUploadUrl>>, TError, {
    data: BodyType<UploadUrlRequest>;
}, TContext>;
/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export declare const getGetPublicObjectUrl: (filePath: string) => string;
export declare const getPublicObject: (filePath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetPublicObjectQueryKey: (filePath: string) => readonly [`/api/storage/public-objects/${string}`];
export declare const getGetPublicObjectQueryOptions: <TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorEnvelope>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetPublicObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getPublicObject>>>;
export type GetPublicObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve a public asset from PUBLIC_OBJECT_SEARCH_PATHS
 */
export declare function useGetPublicObject<TData = Awaited<ReturnType<typeof getPublicObject>>, TError = ErrorType<ErrorEnvelope>>(filePath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getPublicObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare const getGetStorageObjectUrl: (objectPath: string) => string;
export declare const getStorageObject: (objectPath: string, options?: RequestInit) => Promise<Blob>;
export declare const getGetStorageObjectQueryKey: (objectPath: string) => readonly [`/api/storage/objects/${string}`];
export declare const getGetStorageObjectQueryOptions: <TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStorageObjectQueryResult = NonNullable<Awaited<ReturnType<typeof getStorageObject>>>;
export type GetStorageObjectQueryError = ErrorType<ErrorEnvelope>;
/**
 * @summary Serve an object entity from PRIVATE_OBJECT_DIR
 */
export declare function useGetStorageObject<TData = Awaited<ReturnType<typeof getStorageObject>>, TError = ErrorType<ErrorEnvelope>>(objectPath: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStorageObject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get current authenticated user
 */
export declare const getGetCurrentUserUrl: () => string;
export declare const getCurrentUser: (options?: RequestInit) => Promise<AuthUser>;
export declare const getGetCurrentUserQueryKey: () => readonly ["/api/auth/user"];
export declare const getGetCurrentUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type GetCurrentUserQueryError = ErrorType<void>;
/**
 * @summary Get current authenticated user
 */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all gyms accessible to current user
 */
export declare const getListGymsUrl: () => string;
export declare const listGyms: (options?: RequestInit) => Promise<Gym[]>;
export declare const getListGymsQueryKey: () => readonly ["/api/gyms"];
export declare const getListGymsQueryOptions: <TData = Awaited<ReturnType<typeof listGyms>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGyms>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGyms>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGymsQueryResult = NonNullable<Awaited<ReturnType<typeof listGyms>>>;
export type ListGymsQueryError = ErrorType<unknown>;
/**
 * @summary List all gyms accessible to current user
 */
export declare function useListGyms<TData = Awaited<ReturnType<typeof listGyms>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGyms>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new gym
 */
export declare const getCreateGymUrl: () => string;
export declare const createGym: (createGymBody: CreateGymBody, options?: RequestInit) => Promise<Gym>;
export declare const getCreateGymMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGym>>, TError, {
        data: BodyType<CreateGymBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createGym>>, TError, {
    data: BodyType<CreateGymBody>;
}, TContext>;
export type CreateGymMutationResult = NonNullable<Awaited<ReturnType<typeof createGym>>>;
export type CreateGymMutationBody = BodyType<CreateGymBody>;
export type CreateGymMutationError = ErrorType<unknown>;
/**
 * @summary Create a new gym
 */
export declare const useCreateGym: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createGym>>, TError, {
        data: BodyType<CreateGymBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createGym>>, TError, {
    data: BodyType<CreateGymBody>;
}, TContext>;
/**
 * @summary Get gym details
 */
export declare const getGetGymUrl: (gymId: number) => string;
export declare const getGym: (gymId: number, options?: RequestInit) => Promise<Gym>;
export declare const getGetGymQueryKey: (gymId: number) => readonly [`/api/gyms/${number}`];
export declare const getGetGymQueryOptions: <TData = Awaited<ReturnType<typeof getGym>>, TError = ErrorType<void>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGym>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getGym>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetGymQueryResult = NonNullable<Awaited<ReturnType<typeof getGym>>>;
export type GetGymQueryError = ErrorType<void>;
/**
 * @summary Get gym details
 */
export declare function useGetGym<TData = Awaited<ReturnType<typeof getGym>>, TError = ErrorType<void>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getGym>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update gym details
 */
export declare const getUpdateGymUrl: (gymId: number) => string;
export declare const updateGym: (gymId: number, updateGymBody: UpdateGymBody, options?: RequestInit) => Promise<Gym>;
export declare const getUpdateGymMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGym>>, TError, {
        gymId: number;
        data: BodyType<UpdateGymBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateGym>>, TError, {
    gymId: number;
    data: BodyType<UpdateGymBody>;
}, TContext>;
export type UpdateGymMutationResult = NonNullable<Awaited<ReturnType<typeof updateGym>>>;
export type UpdateGymMutationBody = BodyType<UpdateGymBody>;
export type UpdateGymMutationError = ErrorType<unknown>;
/**
 * @summary Update gym details
 */
export declare const useUpdateGym: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGym>>, TError, {
        gymId: number;
        data: BodyType<UpdateGymBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateGym>>, TError, {
    gymId: number;
    data: BodyType<UpdateGymBody>;
}, TContext>;
/**
 * @summary List gym members
 */
export declare const getListMembersUrl: (gymId: number, params?: ListMembersParams) => string;
export declare const listMembers: (gymId: number, params?: ListMembersParams, options?: RequestInit) => Promise<MemberListResponse>;
export declare const getListMembersQueryKey: (gymId: number, params?: ListMembersParams) => readonly [`/api/gyms/${number}/members`, ...ListMembersParams[]];
export declare const getListMembersQueryOptions: <TData = Awaited<ReturnType<typeof listMembers>>, TError = ErrorType<unknown>>(gymId: number, params?: ListMembersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMembers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMembersQueryResult = NonNullable<Awaited<ReturnType<typeof listMembers>>>;
export type ListMembersQueryError = ErrorType<unknown>;
/**
 * @summary List gym members
 */
export declare function useListMembers<TData = Awaited<ReturnType<typeof listMembers>>, TError = ErrorType<unknown>>(gymId: number, params?: ListMembersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new member
 */
export declare const getCreateMemberUrl: (gymId: number) => string;
export declare const createMember: (gymId: number, createMemberBody: CreateMemberBody, options?: RequestInit) => Promise<Member>;
export declare const getCreateMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMember>>, TError, {
        gymId: number;
        data: BodyType<CreateMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMember>>, TError, {
    gymId: number;
    data: BodyType<CreateMemberBody>;
}, TContext>;
export type CreateMemberMutationResult = NonNullable<Awaited<ReturnType<typeof createMember>>>;
export type CreateMemberMutationBody = BodyType<CreateMemberBody>;
export type CreateMemberMutationError = ErrorType<unknown>;
/**
 * @summary Create a new member
 */
export declare const useCreateMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMember>>, TError, {
        gymId: number;
        data: BodyType<CreateMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMember>>, TError, {
    gymId: number;
    data: BodyType<CreateMemberBody>;
}, TContext>;
/**
 * @summary Get member details
 */
export declare const getGetMemberUrl: (gymId: number, memberId: number) => string;
export declare const getMember: (gymId: number, memberId: number, options?: RequestInit) => Promise<MemberDetail>;
export declare const getGetMemberQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}`];
export declare const getGetMemberQueryOptions: <TData = Awaited<ReturnType<typeof getMember>>, TError = ErrorType<void>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMember>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMember>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberQueryResult = NonNullable<Awaited<ReturnType<typeof getMember>>>;
export type GetMemberQueryError = ErrorType<void>;
/**
 * @summary Get member details
 */
export declare function useGetMember<TData = Awaited<ReturnType<typeof getMember>>, TError = ErrorType<void>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMember>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update member details
 */
export declare const getUpdateMemberUrl: (gymId: number, memberId: number) => string;
export declare const updateMember: (gymId: number, memberId: number, updateMemberBody: UpdateMemberBody, options?: RequestInit) => Promise<Member>;
export declare const getUpdateMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMember>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<UpdateMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMember>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<UpdateMemberBody>;
}, TContext>;
export type UpdateMemberMutationResult = NonNullable<Awaited<ReturnType<typeof updateMember>>>;
export type UpdateMemberMutationBody = BodyType<UpdateMemberBody>;
export type UpdateMemberMutationError = ErrorType<unknown>;
/**
 * @summary Update member details
 */
export declare const useUpdateMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMember>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<UpdateMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMember>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<UpdateMemberBody>;
}, TContext>;
/**
 * @summary Check if email is already in use by an existing member
 */
export declare const getCheckMemberEmailUrl: (gymId: number, params: CheckMemberEmailParams) => string;
export declare const checkMemberEmail: (gymId: number, params: CheckMemberEmailParams, options?: RequestInit) => Promise<EmailCheckResult>;
export declare const getCheckMemberEmailQueryKey: (gymId: number, params?: CheckMemberEmailParams) => readonly [`/api/gyms/${number}/members/check-email`, ...CheckMemberEmailParams[]];
export declare const getCheckMemberEmailQueryOptions: <TData = Awaited<ReturnType<typeof checkMemberEmail>>, TError = ErrorType<unknown>>(gymId: number, params: CheckMemberEmailParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof checkMemberEmail>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof checkMemberEmail>>, TError, TData> & {
    queryKey: QueryKey;
};
export type CheckMemberEmailQueryResult = NonNullable<Awaited<ReturnType<typeof checkMemberEmail>>>;
export type CheckMemberEmailQueryError = ErrorType<unknown>;
/**
 * @summary Check if email is already in use by an existing member
 */
export declare function useCheckMemberEmail<TData = Awaited<ReturnType<typeof checkMemberEmail>>, TError = ErrorType<unknown>>(gymId: number, params: CheckMemberEmailParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof checkMemberEmail>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get distinct membership types used in this gym
 */
export declare const getListMembershipTypesUrl: (gymId: number) => string;
export declare const listMembershipTypes: (gymId: number, options?: RequestInit) => Promise<string[]>;
export declare const getListMembershipTypesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/members/membership-types`];
export declare const getListMembershipTypesQueryOptions: <TData = Awaited<ReturnType<typeof listMembershipTypes>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMembershipTypes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMembershipTypes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMembershipTypesQueryResult = NonNullable<Awaited<ReturnType<typeof listMembershipTypes>>>;
export type ListMembershipTypesQueryError = ErrorType<unknown>;
/**
 * @summary Get distinct membership types used in this gym
 */
export declare function useListMembershipTypes<TData = Awaited<ReturnType<typeof listMembershipTypes>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMembershipTypes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add note to member record
 */
export declare const getAddMemberNoteUrl: (gymId: number, memberId: number) => string;
export declare const addMemberNote: (gymId: number, memberId: number, createMemberNoteBody: CreateMemberNoteBody, options?: RequestInit) => Promise<MemberNote>;
export declare const getAddMemberNoteMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addMemberNote>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateMemberNoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addMemberNote>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateMemberNoteBody>;
}, TContext>;
export type AddMemberNoteMutationResult = NonNullable<Awaited<ReturnType<typeof addMemberNote>>>;
export type AddMemberNoteMutationBody = BodyType<CreateMemberNoteBody>;
export type AddMemberNoteMutationError = ErrorType<unknown>;
/**
 * @summary Add note to member record
 */
export declare const useAddMemberNote: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addMemberNote>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateMemberNoteBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addMemberNote>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateMemberNoteBody>;
}, TContext>;
/**
 * @summary Get member activity timeline
 */
export declare const getGetMemberTimelineUrl: (gymId: number, memberId: number) => string;
export declare const getMemberTimeline: (gymId: number, memberId: number, options?: RequestInit) => Promise<TimelineEvent[]>;
export declare const getGetMemberTimelineQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/timeline`];
export declare const getGetMemberTimelineQueryOptions: <TData = Awaited<ReturnType<typeof getMemberTimeline>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberTimeline>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberTimeline>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberTimelineQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberTimeline>>>;
export type GetMemberTimelineQueryError = ErrorType<unknown>;
/**
 * @summary Get member activity timeline
 */
export declare function useGetMemberTimeline<TData = Awaited<ReturnType<typeof getMemberTimeline>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberTimeline>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Send an SMS text message to a member
 */
export declare const getSendMemberSmsUrl: (gymId: number, memberId: number) => string;
export declare const sendMemberSms: (gymId: number, memberId: number, sendMemberSmsBody: SendMemberSmsBody, options?: RequestInit) => Promise<SendSmsResponse>;
export declare const getSendMemberSmsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMemberSms>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<SendMemberSmsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendMemberSms>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<SendMemberSmsBody>;
}, TContext>;
export type SendMemberSmsMutationResult = NonNullable<Awaited<ReturnType<typeof sendMemberSms>>>;
export type SendMemberSmsMutationBody = BodyType<SendMemberSmsBody>;
export type SendMemberSmsMutationError = ErrorType<unknown>;
/**
 * @summary Send an SMS text message to a member
 */
export declare const useSendMemberSms: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendMemberSms>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<SendMemberSmsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendMemberSms>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<SendMemberSmsBody>;
}, TContext>;
/**
 * @summary List leads
 */
export declare const getListLeadsUrl: (gymId: number, params?: ListLeadsParams) => string;
export declare const listLeads: (gymId: number, params?: ListLeadsParams, options?: RequestInit) => Promise<Lead[]>;
export declare const getListLeadsQueryKey: (gymId: number, params?: ListLeadsParams) => readonly [`/api/gyms/${number}/leads`, ...ListLeadsParams[]];
export declare const getListLeadsQueryOptions: <TData = Awaited<ReturnType<typeof listLeads>>, TError = ErrorType<unknown>>(gymId: number, params?: ListLeadsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listLeads>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listLeads>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListLeadsQueryResult = NonNullable<Awaited<ReturnType<typeof listLeads>>>;
export type ListLeadsQueryError = ErrorType<unknown>;
/**
 * @summary List leads
 */
export declare function useListLeads<TData = Awaited<ReturnType<typeof listLeads>>, TError = ErrorType<unknown>>(gymId: number, params?: ListLeadsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listLeads>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new lead
 */
export declare const getCreateLeadUrl: (gymId: number) => string;
export declare const createLead: (gymId: number, createLeadBody: CreateLeadBody, options?: RequestInit) => Promise<Lead>;
export declare const getCreateLeadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createLead>>, TError, {
        gymId: number;
        data: BodyType<CreateLeadBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createLead>>, TError, {
    gymId: number;
    data: BodyType<CreateLeadBody>;
}, TContext>;
export type CreateLeadMutationResult = NonNullable<Awaited<ReturnType<typeof createLead>>>;
export type CreateLeadMutationBody = BodyType<CreateLeadBody>;
export type CreateLeadMutationError = ErrorType<unknown>;
/**
 * @summary Create a new lead
 */
export declare const useCreateLead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createLead>>, TError, {
        gymId: number;
        data: BodyType<CreateLeadBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createLead>>, TError, {
    gymId: number;
    data: BodyType<CreateLeadBody>;
}, TContext>;
/**
 * @summary Get lead details
 */
export declare const getGetLeadUrl: (gymId: number, leadId: number) => string;
export declare const getLead: (gymId: number, leadId: number, options?: RequestInit) => Promise<Lead>;
export declare const getGetLeadQueryKey: (gymId: number, leadId: number) => readonly [`/api/gyms/${number}/leads/${number}`];
export declare const getGetLeadQueryOptions: <TData = Awaited<ReturnType<typeof getLead>>, TError = ErrorType<unknown>>(gymId: number, leadId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLead>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLead>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLeadQueryResult = NonNullable<Awaited<ReturnType<typeof getLead>>>;
export type GetLeadQueryError = ErrorType<unknown>;
/**
 * @summary Get lead details
 */
export declare function useGetLead<TData = Awaited<ReturnType<typeof getLead>>, TError = ErrorType<unknown>>(gymId: number, leadId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLead>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update lead
 */
export declare const getUpdateLeadUrl: (gymId: number, leadId: number) => string;
export declare const updateLead: (gymId: number, leadId: number, updateLeadBody: UpdateLeadBody, options?: RequestInit) => Promise<Lead>;
export declare const getUpdateLeadMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateLead>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<UpdateLeadBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateLead>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<UpdateLeadBody>;
}, TContext>;
export type UpdateLeadMutationResult = NonNullable<Awaited<ReturnType<typeof updateLead>>>;
export type UpdateLeadMutationBody = BodyType<UpdateLeadBody>;
export type UpdateLeadMutationError = ErrorType<unknown>;
/**
 * @summary Update lead
 */
export declare const useUpdateLead: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateLead>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<UpdateLeadBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateLead>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<UpdateLeadBody>;
}, TContext>;
/**
 * @summary Convert lead to paying member
 */
export declare const getConvertLeadToMemberUrl: (gymId: number, leadId: number) => string;
export declare const convertLeadToMember: (gymId: number, leadId: number, convertLeadToMemberBody: ConvertLeadToMemberBody, options?: RequestInit) => Promise<Member>;
export declare const getConvertLeadToMemberMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof convertLeadToMember>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<ConvertLeadToMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof convertLeadToMember>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<ConvertLeadToMemberBody>;
}, TContext>;
export type ConvertLeadToMemberMutationResult = NonNullable<Awaited<ReturnType<typeof convertLeadToMember>>>;
export type ConvertLeadToMemberMutationBody = BodyType<ConvertLeadToMemberBody>;
export type ConvertLeadToMemberMutationError = ErrorType<unknown>;
/**
 * @summary Convert lead to paying member
 */
export declare const useConvertLeadToMember: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof convertLeadToMember>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<ConvertLeadToMemberBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof convertLeadToMember>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<ConvertLeadToMemberBody>;
}, TContext>;
/**
 * @summary Get sales funnel insights
 */
export declare const getGetLeadInsightsUrl: (gymId: number) => string;
export declare const getLeadInsights: (gymId: number, options?: RequestInit) => Promise<LeadInsights>;
export declare const getGetLeadInsightsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/leads/insights`];
export declare const getGetLeadInsightsQueryOptions: <TData = Awaited<ReturnType<typeof getLeadInsights>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeadInsights>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLeadInsights>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLeadInsightsQueryResult = NonNullable<Awaited<ReturnType<typeof getLeadInsights>>>;
export type GetLeadInsightsQueryError = ErrorType<unknown>;
/**
 * @summary Get sales funnel insights
 */
export declare function useGetLeadInsights<TData = Awaited<ReturnType<typeof getLeadInsights>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeadInsights>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List lead activity history
 */
export declare const getListLeadActivitiesUrl: (gymId: number, leadId: number) => string;
export declare const listLeadActivities: (gymId: number, leadId: number, options?: RequestInit) => Promise<LeadActivity[]>;
export declare const getListLeadActivitiesQueryKey: (gymId: number, leadId: number) => readonly [`/api/gyms/${number}/leads/${number}/activities`];
export declare const getListLeadActivitiesQueryOptions: <TData = Awaited<ReturnType<typeof listLeadActivities>>, TError = ErrorType<unknown>>(gymId: number, leadId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listLeadActivities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listLeadActivities>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListLeadActivitiesQueryResult = NonNullable<Awaited<ReturnType<typeof listLeadActivities>>>;
export type ListLeadActivitiesQueryError = ErrorType<unknown>;
/**
 * @summary List lead activity history
 */
export declare function useListLeadActivities<TData = Awaited<ReturnType<typeof listLeadActivities>>, TError = ErrorType<unknown>>(gymId: number, leadId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listLeadActivities>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log a lead activity
 */
export declare const getCreateLeadActivityUrl: (gymId: number, leadId: number) => string;
export declare const createLeadActivity: (gymId: number, leadId: number, createLeadActivityBody: CreateLeadActivityBody, options?: RequestInit) => Promise<LeadActivity[]>;
export declare const getCreateLeadActivityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createLeadActivity>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<CreateLeadActivityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createLeadActivity>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<CreateLeadActivityBody>;
}, TContext>;
export type CreateLeadActivityMutationResult = NonNullable<Awaited<ReturnType<typeof createLeadActivity>>>;
export type CreateLeadActivityMutationBody = BodyType<CreateLeadActivityBody>;
export type CreateLeadActivityMutationError = ErrorType<unknown>;
/**
 * @summary Log a lead activity
 */
export declare const useCreateLeadActivity: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createLeadActivity>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<CreateLeadActivityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createLeadActivity>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<CreateLeadActivityBody>;
}, TContext>;
/**
 * @summary Send an SMS text message to a lead
 */
export declare const getSendLeadSmsUrl: (gymId: number, leadId: number) => string;
export declare const sendLeadSms: (gymId: number, leadId: number, sendLeadSmsBody: SendLeadSmsBody, options?: RequestInit) => Promise<SendSmsResponse>;
export declare const getSendLeadSmsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendLeadSms>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<SendLeadSmsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendLeadSms>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<SendLeadSmsBody>;
}, TContext>;
export type SendLeadSmsMutationResult = NonNullable<Awaited<ReturnType<typeof sendLeadSms>>>;
export type SendLeadSmsMutationBody = BodyType<SendLeadSmsBody>;
export type SendLeadSmsMutationError = ErrorType<unknown>;
/**
 * @summary Send an SMS text message to a lead
 */
export declare const useSendLeadSms: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendLeadSms>>, TError, {
        gymId: number;
        leadId: number;
        data: BodyType<SendLeadSmsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendLeadSms>>, TError, {
    gymId: number;
    leadId: number;
    data: BodyType<SendLeadSmsBody>;
}, TContext>;
/**
 * @summary List gym staff
 */
export declare const getListStaffUrl: (gymId: number) => string;
export declare const listStaff: (gymId: number, options?: RequestInit) => Promise<StaffMember[]>;
export declare const getListStaffQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/staff`];
export declare const getListStaffQueryOptions: <TData = Awaited<ReturnType<typeof listStaff>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStaff>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listStaff>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListStaffQueryResult = NonNullable<Awaited<ReturnType<typeof listStaff>>>;
export type ListStaffQueryError = ErrorType<unknown>;
/**
 * @summary List gym staff
 */
export declare function useListStaff<TData = Awaited<ReturnType<typeof listStaff>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStaff>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Invite a staff member
 */
export declare const getInviteStaffUrl: (gymId: number) => string;
export declare const inviteStaff: (gymId: number, inviteStaffBody: InviteStaffBody, options?: RequestInit) => Promise<StaffMember>;
export declare const getInviteStaffMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof inviteStaff>>, TError, {
        gymId: number;
        data: BodyType<InviteStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof inviteStaff>>, TError, {
    gymId: number;
    data: BodyType<InviteStaffBody>;
}, TContext>;
export type InviteStaffMutationResult = NonNullable<Awaited<ReturnType<typeof inviteStaff>>>;
export type InviteStaffMutationBody = BodyType<InviteStaffBody>;
export type InviteStaffMutationError = ErrorType<unknown>;
/**
 * @summary Invite a staff member
 */
export declare const useInviteStaff: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof inviteStaff>>, TError, {
        gymId: number;
        data: BodyType<InviteStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof inviteStaff>>, TError, {
    gymId: number;
    data: BodyType<InviteStaffBody>;
}, TContext>;
/**
 * @summary Update staff member
 */
export declare const getUpdateStaffUrl: (gymId: number, staffId: number) => string;
export declare const updateStaff: (gymId: number, staffId: number, updateStaffBody: UpdateStaffBody, options?: RequestInit) => Promise<StaffMember>;
export declare const getUpdateStaffMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateStaff>>, TError, {
        gymId: number;
        staffId: number;
        data: BodyType<UpdateStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateStaff>>, TError, {
    gymId: number;
    staffId: number;
    data: BodyType<UpdateStaffBody>;
}, TContext>;
export type UpdateStaffMutationResult = NonNullable<Awaited<ReturnType<typeof updateStaff>>>;
export type UpdateStaffMutationBody = BodyType<UpdateStaffBody>;
export type UpdateStaffMutationError = ErrorType<unknown>;
/**
 * @summary Update staff member
 */
export declare const useUpdateStaff: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateStaff>>, TError, {
        gymId: number;
        staffId: number;
        data: BodyType<UpdateStaffBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateStaff>>, TError, {
    gymId: number;
    staffId: number;
    data: BodyType<UpdateStaffBody>;
}, TContext>;
/**
 * @summary Remove staff access
 */
export declare const getRemoveStaffUrl: (gymId: number, staffId: number) => string;
export declare const removeStaff: (gymId: number, staffId: number, options?: RequestInit) => Promise<void>;
export declare const getRemoveStaffMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeStaff>>, TError, {
        gymId: number;
        staffId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeStaff>>, TError, {
    gymId: number;
    staffId: number;
}, TContext>;
export type RemoveStaffMutationResult = NonNullable<Awaited<ReturnType<typeof removeStaff>>>;
export type RemoveStaffMutationError = ErrorType<unknown>;
/**
 * @summary Remove staff access
 */
export declare const useRemoveStaff: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeStaff>>, TError, {
        gymId: number;
        staffId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeStaff>>, TError, {
    gymId: number;
    staffId: number;
}, TContext>;
/**
 * @summary List scheduled classes
 */
export declare const getListClassesUrl: (gymId: number, params?: ListClassesParams) => string;
export declare const listClasses: (gymId: number, params?: ListClassesParams, options?: RequestInit) => Promise<GymClass[]>;
export declare const getListClassesQueryKey: (gymId: number, params?: ListClassesParams) => readonly [`/api/gyms/${number}/classes`, ...ListClassesParams[]];
export declare const getListClassesQueryOptions: <TData = Awaited<ReturnType<typeof listClasses>>, TError = ErrorType<unknown>>(gymId: number, params?: ListClassesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListClassesQueryResult = NonNullable<Awaited<ReturnType<typeof listClasses>>>;
export type ListClassesQueryError = ErrorType<unknown>;
/**
 * @summary List scheduled classes
 */
export declare function useListClasses<TData = Awaited<ReturnType<typeof listClasses>>, TError = ErrorType<unknown>>(gymId: number, params?: ListClassesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a class
 */
export declare const getCreateClassUrl: (gymId: number) => string;
export declare const createClass: (gymId: number, createClassBody: CreateClassBody, options?: RequestInit) => Promise<GymClass>;
export declare const getCreateClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createClass>>, TError, {
        gymId: number;
        data: BodyType<CreateClassBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createClass>>, TError, {
    gymId: number;
    data: BodyType<CreateClassBody>;
}, TContext>;
export type CreateClassMutationResult = NonNullable<Awaited<ReturnType<typeof createClass>>>;
export type CreateClassMutationBody = BodyType<CreateClassBody>;
export type CreateClassMutationError = ErrorType<unknown>;
/**
 * @summary Create a class
 */
export declare const useCreateClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createClass>>, TError, {
        gymId: number;
        data: BodyType<CreateClassBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createClass>>, TError, {
    gymId: number;
    data: BodyType<CreateClassBody>;
}, TContext>;
/**
 * @summary Get class details with roster
 */
export declare const getGetClassUrl: (gymId: number, classId: number) => string;
export declare const getClass: (gymId: number, classId: number, options?: RequestInit) => Promise<GymClassDetail>;
export declare const getGetClassQueryKey: (gymId: number, classId: number) => readonly [`/api/gyms/${number}/classes/${number}`];
export declare const getGetClassQueryOptions: <TData = Awaited<ReturnType<typeof getClass>>, TError = ErrorType<unknown>>(gymId: number, classId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getClass>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getClass>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetClassQueryResult = NonNullable<Awaited<ReturnType<typeof getClass>>>;
export type GetClassQueryError = ErrorType<unknown>;
/**
 * @summary Get class details with roster
 */
export declare function useGetClass<TData = Awaited<ReturnType<typeof getClass>>, TError = ErrorType<unknown>>(gymId: number, classId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getClass>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update class
 */
export declare const getUpdateClassUrl: (gymId: number, classId: number) => string;
export declare const updateClass: (gymId: number, classId: number, updateClassBody: UpdateClassBody, options?: RequestInit) => Promise<GymClass>;
export declare const getUpdateClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateClass>>, TError, {
        gymId: number;
        classId: number;
        data: BodyType<UpdateClassBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateClass>>, TError, {
    gymId: number;
    classId: number;
    data: BodyType<UpdateClassBody>;
}, TContext>;
export type UpdateClassMutationResult = NonNullable<Awaited<ReturnType<typeof updateClass>>>;
export type UpdateClassMutationBody = BodyType<UpdateClassBody>;
export type UpdateClassMutationError = ErrorType<unknown>;
/**
 * @summary Update class
 */
export declare const useUpdateClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateClass>>, TError, {
        gymId: number;
        classId: number;
        data: BodyType<UpdateClassBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateClass>>, TError, {
    gymId: number;
    classId: number;
    data: BodyType<UpdateClassBody>;
}, TContext>;
/**
 * @summary Delete class
 */
export declare const getDeleteClassUrl: (gymId: number, classId: number) => string;
export declare const deleteClass: (gymId: number, classId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteClass>>, TError, {
        gymId: number;
        classId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteClass>>, TError, {
    gymId: number;
    classId: number;
}, TContext>;
export type DeleteClassMutationResult = NonNullable<Awaited<ReturnType<typeof deleteClass>>>;
export type DeleteClassMutationError = ErrorType<unknown>;
/**
 * @summary Delete class
 */
export declare const useDeleteClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteClass>>, TError, {
        gymId: number;
        classId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteClass>>, TError, {
    gymId: number;
    classId: number;
}, TContext>;
/**
 * @summary Check in member to class
 */
export declare const getCheckInToClassUrl: (gymId: number, classId: number) => string;
export declare const checkInToClass: (gymId: number, classId: number, checkInBody: CheckInBody, options?: RequestInit) => Promise<Attendance>;
export declare const getCheckInToClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof checkInToClass>>, TError, {
        gymId: number;
        classId: number;
        data: BodyType<CheckInBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof checkInToClass>>, TError, {
    gymId: number;
    classId: number;
    data: BodyType<CheckInBody>;
}, TContext>;
export type CheckInToClassMutationResult = NonNullable<Awaited<ReturnType<typeof checkInToClass>>>;
export type CheckInToClassMutationBody = BodyType<CheckInBody>;
export type CheckInToClassMutationError = ErrorType<unknown>;
/**
 * @summary Check in member to class
 */
export declare const useCheckInToClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof checkInToClass>>, TError, {
        gymId: number;
        classId: number;
        data: BodyType<CheckInBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof checkInToClass>>, TError, {
    gymId: number;
    classId: number;
    data: BodyType<CheckInBody>;
}, TContext>;
/**
 * @summary Preview copying last week's classes
 */
export declare const getPreviewCopyWeekUrl: (gymId: number) => string;
export declare const previewCopyWeek: (gymId: number, copyWeekBody: CopyWeekBody, options?: RequestInit) => Promise<CopyWeekPreview>;
export declare const getPreviewCopyWeekMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewCopyWeek>>, TError, {
        gymId: number;
        data: BodyType<CopyWeekBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewCopyWeek>>, TError, {
    gymId: number;
    data: BodyType<CopyWeekBody>;
}, TContext>;
export type PreviewCopyWeekMutationResult = NonNullable<Awaited<ReturnType<typeof previewCopyWeek>>>;
export type PreviewCopyWeekMutationBody = BodyType<CopyWeekBody>;
export type PreviewCopyWeekMutationError = ErrorType<unknown>;
/**
 * @summary Preview copying last week's classes
 */
export declare const usePreviewCopyWeek: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewCopyWeek>>, TError, {
        gymId: number;
        data: BodyType<CopyWeekBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewCopyWeek>>, TError, {
    gymId: number;
    data: BodyType<CopyWeekBody>;
}, TContext>;
/**
 * @summary Copy classes from one week to another
 */
export declare const getCopyWeekUrl: (gymId: number) => string;
export declare const copyWeek: (gymId: number, copyWeekBody: CopyWeekBody, options?: RequestInit) => Promise<CopyWeekResult>;
export declare const getCopyWeekMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof copyWeek>>, TError, {
        gymId: number;
        data: BodyType<CopyWeekBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof copyWeek>>, TError, {
    gymId: number;
    data: BodyType<CopyWeekBody>;
}, TContext>;
export type CopyWeekMutationResult = NonNullable<Awaited<ReturnType<typeof copyWeek>>>;
export type CopyWeekMutationBody = BodyType<CopyWeekBody>;
export type CopyWeekMutationError = ErrorType<unknown>;
/**
 * @summary Copy classes from one week to another
 */
export declare const useCopyWeek: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof copyWeek>>, TError, {
        gymId: number;
        data: BodyType<CopyWeekBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof copyWeek>>, TError, {
    gymId: number;
    data: BodyType<CopyWeekBody>;
}, TContext>;
/**
 * @summary List class schedule templates
 */
export declare const getListClassTemplatesUrl: (gymId: number) => string;
export declare const listClassTemplates: (gymId: number, options?: RequestInit) => Promise<ClassTemplate[]>;
export declare const getListClassTemplatesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/class-templates`];
export declare const getListClassTemplatesQueryOptions: <TData = Awaited<ReturnType<typeof listClassTemplates>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClassTemplates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listClassTemplates>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListClassTemplatesQueryResult = NonNullable<Awaited<ReturnType<typeof listClassTemplates>>>;
export type ListClassTemplatesQueryError = ErrorType<unknown>;
/**
 * @summary List class schedule templates
 */
export declare function useListClassTemplates<TData = Awaited<ReturnType<typeof listClassTemplates>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClassTemplates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Save current week as a template
 */
export declare const getCreateClassTemplateUrl: (gymId: number) => string;
export declare const createClassTemplate: (gymId: number, createClassTemplateBody: CreateClassTemplateBody, options?: RequestInit) => Promise<ClassTemplateDetail>;
export declare const getCreateClassTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createClassTemplate>>, TError, {
        gymId: number;
        data: BodyType<CreateClassTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createClassTemplate>>, TError, {
    gymId: number;
    data: BodyType<CreateClassTemplateBody>;
}, TContext>;
export type CreateClassTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof createClassTemplate>>>;
export type CreateClassTemplateMutationBody = BodyType<CreateClassTemplateBody>;
export type CreateClassTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Save current week as a template
 */
export declare const useCreateClassTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createClassTemplate>>, TError, {
        gymId: number;
        data: BodyType<CreateClassTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createClassTemplate>>, TError, {
    gymId: number;
    data: BodyType<CreateClassTemplateBody>;
}, TContext>;
/**
 * @summary Get template details with items
 */
export declare const getGetClassTemplateUrl: (gymId: number, templateId: number) => string;
export declare const getClassTemplate: (gymId: number, templateId: number, options?: RequestInit) => Promise<ClassTemplateDetail>;
export declare const getGetClassTemplateQueryKey: (gymId: number, templateId: number) => readonly [`/api/gyms/${number}/class-templates/${number}`];
export declare const getGetClassTemplateQueryOptions: <TData = Awaited<ReturnType<typeof getClassTemplate>>, TError = ErrorType<void>>(gymId: number, templateId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getClassTemplate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getClassTemplate>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetClassTemplateQueryResult = NonNullable<Awaited<ReturnType<typeof getClassTemplate>>>;
export type GetClassTemplateQueryError = ErrorType<void>;
/**
 * @summary Get template details with items
 */
export declare function useGetClassTemplate<TData = Awaited<ReturnType<typeof getClassTemplate>>, TError = ErrorType<void>>(gymId: number, templateId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getClassTemplate>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Rename or update template
 */
export declare const getUpdateClassTemplateUrl: (gymId: number, templateId: number) => string;
export declare const updateClassTemplate: (gymId: number, templateId: number, updateClassTemplateBody: UpdateClassTemplateBody, options?: RequestInit) => Promise<ClassTemplate>;
export declare const getUpdateClassTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateClassTemplate>>, TError, {
        gymId: number;
        templateId: number;
        data: BodyType<UpdateClassTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateClassTemplate>>, TError, {
    gymId: number;
    templateId: number;
    data: BodyType<UpdateClassTemplateBody>;
}, TContext>;
export type UpdateClassTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof updateClassTemplate>>>;
export type UpdateClassTemplateMutationBody = BodyType<UpdateClassTemplateBody>;
export type UpdateClassTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Rename or update template
 */
export declare const useUpdateClassTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateClassTemplate>>, TError, {
        gymId: number;
        templateId: number;
        data: BodyType<UpdateClassTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateClassTemplate>>, TError, {
    gymId: number;
    templateId: number;
    data: BodyType<UpdateClassTemplateBody>;
}, TContext>;
/**
 * @summary Delete a template
 */
export declare const getDeleteClassTemplateUrl: (gymId: number, templateId: number) => string;
export declare const deleteClassTemplate: (gymId: number, templateId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteClassTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteClassTemplate>>, TError, {
        gymId: number;
        templateId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteClassTemplate>>, TError, {
    gymId: number;
    templateId: number;
}, TContext>;
export type DeleteClassTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof deleteClassTemplate>>>;
export type DeleteClassTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Delete a template
 */
export declare const useDeleteClassTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteClassTemplate>>, TError, {
        gymId: number;
        templateId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteClassTemplate>>, TError, {
    gymId: number;
    templateId: number;
}, TContext>;
/**
 * @summary Preview applying a template to a target week
 */
export declare const getPreviewApplyTemplateUrl: (gymId: number, templateId: number) => string;
export declare const previewApplyTemplate: (gymId: number, templateId: number, applyTemplateBody: ApplyTemplateBody, options?: RequestInit) => Promise<CopyWeekPreview>;
export declare const getPreviewApplyTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewApplyTemplate>>, TError, {
        gymId: number;
        templateId: number;
        data: BodyType<ApplyTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewApplyTemplate>>, TError, {
    gymId: number;
    templateId: number;
    data: BodyType<ApplyTemplateBody>;
}, TContext>;
export type PreviewApplyTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof previewApplyTemplate>>>;
export type PreviewApplyTemplateMutationBody = BodyType<ApplyTemplateBody>;
export type PreviewApplyTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Preview applying a template to a target week
 */
export declare const usePreviewApplyTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewApplyTemplate>>, TError, {
        gymId: number;
        templateId: number;
        data: BodyType<ApplyTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewApplyTemplate>>, TError, {
    gymId: number;
    templateId: number;
    data: BodyType<ApplyTemplateBody>;
}, TContext>;
/**
 * @summary Apply a template to a target week
 */
export declare const getApplyClassTemplateUrl: (gymId: number, templateId: number) => string;
export declare const applyClassTemplate: (gymId: number, templateId: number, applyTemplateBody: ApplyTemplateBody, options?: RequestInit) => Promise<CopyWeekResult>;
export declare const getApplyClassTemplateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyClassTemplate>>, TError, {
        gymId: number;
        templateId: number;
        data: BodyType<ApplyTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof applyClassTemplate>>, TError, {
    gymId: number;
    templateId: number;
    data: BodyType<ApplyTemplateBody>;
}, TContext>;
export type ApplyClassTemplateMutationResult = NonNullable<Awaited<ReturnType<typeof applyClassTemplate>>>;
export type ApplyClassTemplateMutationBody = BodyType<ApplyTemplateBody>;
export type ApplyClassTemplateMutationError = ErrorType<unknown>;
/**
 * @summary Apply a template to a target week
 */
export declare const useApplyClassTemplate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyClassTemplate>>, TError, {
        gymId: number;
        templateId: number;
        data: BodyType<ApplyTemplateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof applyClassTemplate>>, TError, {
    gymId: number;
    templateId: number;
    data: BodyType<ApplyTemplateBody>;
}, TContext>;
/**
 * @summary List attendance records
 */
export declare const getListAttendanceUrl: (gymId: number, params?: ListAttendanceParams) => string;
export declare const listAttendance: (gymId: number, params?: ListAttendanceParams, options?: RequestInit) => Promise<Attendance[]>;
export declare const getListAttendanceQueryKey: (gymId: number, params?: ListAttendanceParams) => readonly [`/api/gyms/${number}/attendance`, ...ListAttendanceParams[]];
export declare const getListAttendanceQueryOptions: <TData = Awaited<ReturnType<typeof listAttendance>>, TError = ErrorType<unknown>>(gymId: number, params?: ListAttendanceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAttendance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAttendance>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAttendanceQueryResult = NonNullable<Awaited<ReturnType<typeof listAttendance>>>;
export type ListAttendanceQueryError = ErrorType<unknown>;
/**
 * @summary List attendance records
 */
export declare function useListAttendance<TData = Awaited<ReturnType<typeof listAttendance>>, TError = ErrorType<unknown>>(gymId: number, params?: ListAttendanceParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAttendance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List membership plans
 */
export declare const getListMembershipPlansUrl: (gymId: number) => string;
export declare const listMembershipPlans: (gymId: number, options?: RequestInit) => Promise<MembershipPlan[]>;
export declare const getListMembershipPlansQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/plans`];
export declare const getListMembershipPlansQueryOptions: <TData = Awaited<ReturnType<typeof listMembershipPlans>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMembershipPlans>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMembershipPlans>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMembershipPlansQueryResult = NonNullable<Awaited<ReturnType<typeof listMembershipPlans>>>;
export type ListMembershipPlansQueryError = ErrorType<unknown>;
/**
 * @summary List membership plans
 */
export declare function useListMembershipPlans<TData = Awaited<ReturnType<typeof listMembershipPlans>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMembershipPlans>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create membership plan
 */
export declare const getCreateMembershipPlanUrl: (gymId: number) => string;
export declare const createMembershipPlan: (gymId: number, createMembershipPlanBody: CreateMembershipPlanBody, options?: RequestInit) => Promise<MembershipPlan>;
export declare const getCreateMembershipPlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMembershipPlan>>, TError, {
        gymId: number;
        data: BodyType<CreateMembershipPlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createMembershipPlan>>, TError, {
    gymId: number;
    data: BodyType<CreateMembershipPlanBody>;
}, TContext>;
export type CreateMembershipPlanMutationResult = NonNullable<Awaited<ReturnType<typeof createMembershipPlan>>>;
export type CreateMembershipPlanMutationBody = BodyType<CreateMembershipPlanBody>;
export type CreateMembershipPlanMutationError = ErrorType<unknown>;
/**
 * @summary Create membership plan
 */
export declare const useCreateMembershipPlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createMembershipPlan>>, TError, {
        gymId: number;
        data: BodyType<CreateMembershipPlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createMembershipPlan>>, TError, {
    gymId: number;
    data: BodyType<CreateMembershipPlanBody>;
}, TContext>;
/**
 * @summary Update a membership plan
 */
export declare const getUpdateMembershipPlanUrl: (gymId: number, planId: number) => string;
export declare const updateMembershipPlan: (gymId: number, planId: number, updateMembershipPlanBody: UpdateMembershipPlanBody, options?: RequestInit) => Promise<MembershipPlan>;
export declare const getUpdateMembershipPlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMembershipPlan>>, TError, {
        gymId: number;
        planId: number;
        data: BodyType<UpdateMembershipPlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateMembershipPlan>>, TError, {
    gymId: number;
    planId: number;
    data: BodyType<UpdateMembershipPlanBody>;
}, TContext>;
export type UpdateMembershipPlanMutationResult = NonNullable<Awaited<ReturnType<typeof updateMembershipPlan>>>;
export type UpdateMembershipPlanMutationBody = BodyType<UpdateMembershipPlanBody>;
export type UpdateMembershipPlanMutationError = ErrorType<unknown>;
/**
 * @summary Update a membership plan
 */
export declare const useUpdateMembershipPlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateMembershipPlan>>, TError, {
        gymId: number;
        planId: number;
        data: BodyType<UpdateMembershipPlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateMembershipPlan>>, TError, {
    gymId: number;
    planId: number;
    data: BodyType<UpdateMembershipPlanBody>;
}, TContext>;
/**
 * @summary List member subscriptions
 */
export declare const getListSubscriptionsUrl: (gymId: number, params?: ListSubscriptionsParams) => string;
export declare const listSubscriptions: (gymId: number, params?: ListSubscriptionsParams, options?: RequestInit) => Promise<Subscription[]>;
export declare const getListSubscriptionsQueryKey: (gymId: number, params?: ListSubscriptionsParams) => readonly [`/api/gyms/${number}/subscriptions`, ...ListSubscriptionsParams[]];
export declare const getListSubscriptionsQueryOptions: <TData = Awaited<ReturnType<typeof listSubscriptions>>, TError = ErrorType<unknown>>(gymId: number, params?: ListSubscriptionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubscriptions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSubscriptions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSubscriptionsQueryResult = NonNullable<Awaited<ReturnType<typeof listSubscriptions>>>;
export type ListSubscriptionsQueryError = ErrorType<unknown>;
/**
 * @summary List member subscriptions
 */
export declare function useListSubscriptions<TData = Awaited<ReturnType<typeof listSubscriptions>>, TError = ErrorType<unknown>>(gymId: number, params?: ListSubscriptionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubscriptions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create subscription for member
 */
export declare const getCreateSubscriptionUrl: (gymId: number) => string;
export declare const createSubscription: (gymId: number, createSubscriptionBody: CreateSubscriptionBody, options?: RequestInit) => Promise<Subscription>;
export declare const getCreateSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubscription>>, TError, {
        gymId: number;
        data: BodyType<CreateSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSubscription>>, TError, {
    gymId: number;
    data: BodyType<CreateSubscriptionBody>;
}, TContext>;
export type CreateSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof createSubscription>>>;
export type CreateSubscriptionMutationBody = BodyType<CreateSubscriptionBody>;
export type CreateSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Create subscription for member
 */
export declare const useCreateSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubscription>>, TError, {
        gymId: number;
        data: BodyType<CreateSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSubscription>>, TError, {
    gymId: number;
    data: BodyType<CreateSubscriptionBody>;
}, TContext>;
/**
 * @summary Update subscription (hold, cancel, resume)
 */
export declare const getUpdateSubscriptionUrl: (gymId: number, subscriptionId: number) => string;
export declare const updateSubscription: (gymId: number, subscriptionId: number, updateSubscriptionBody: UpdateSubscriptionBody, options?: RequestInit) => Promise<Subscription>;
export declare const getUpdateSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<UpdateSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<UpdateSubscriptionBody>;
}, TContext>;
export type UpdateSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof updateSubscription>>>;
export type UpdateSubscriptionMutationBody = BodyType<UpdateSubscriptionBody>;
export type UpdateSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Update subscription (hold, cancel, resume)
 */
export declare const useUpdateSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<UpdateSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<UpdateSubscriptionBody>;
}, TContext>;
/**
 * @summary List invoices
 */
export declare const getListInvoicesUrl: (gymId: number, params?: ListInvoicesParams) => string;
export declare const listInvoices: (gymId: number, params?: ListInvoicesParams, options?: RequestInit) => Promise<Invoice[]>;
export declare const getListInvoicesQueryKey: (gymId: number, params?: ListInvoicesParams) => readonly [`/api/gyms/${number}/invoices`, ...ListInvoicesParams[]];
export declare const getListInvoicesQueryOptions: <TData = Awaited<ReturnType<typeof listInvoices>>, TError = ErrorType<unknown>>(gymId: number, params?: ListInvoicesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listInvoices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listInvoices>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListInvoicesQueryResult = NonNullable<Awaited<ReturnType<typeof listInvoices>>>;
export type ListInvoicesQueryError = ErrorType<unknown>;
/**
 * @summary List invoices
 */
export declare function useListInvoices<TData = Awaited<ReturnType<typeof listInvoices>>, TError = ErrorType<unknown>>(gymId: number, params?: ListInvoicesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listInvoices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get Stripe publishable key
 */
export declare const getGetStripePublishableKeyUrl: (gymId: number) => string;
export declare const getStripePublishableKey: (gymId: number, options?: RequestInit) => Promise<GetStripePublishableKey200>;
export declare const getGetStripePublishableKeyQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/stripe/publishable-key`];
export declare const getGetStripePublishableKeyQueryOptions: <TData = Awaited<ReturnType<typeof getStripePublishableKey>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStripePublishableKey>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStripePublishableKey>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStripePublishableKeyQueryResult = NonNullable<Awaited<ReturnType<typeof getStripePublishableKey>>>;
export type GetStripePublishableKeyQueryError = ErrorType<unknown>;
/**
 * @summary Get Stripe publishable key
 */
export declare function useGetStripePublishableKey<TData = Awaited<ReturnType<typeof getStripePublishableKey>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStripePublishableKey>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a Stripe SetupIntent for member onboarding (no existing member required)
 */
export declare const getCreateOnboardingSetupIntentUrl: (gymId: number) => string;
export declare const createOnboardingSetupIntent: (gymId: number, createOnboardingSetupIntentBody: CreateOnboardingSetupIntentBody, options?: RequestInit) => Promise<CreateOnboardingSetupIntent200>;
export declare const getCreateOnboardingSetupIntentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOnboardingSetupIntent>>, TError, {
        gymId: number;
        data: BodyType<CreateOnboardingSetupIntentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOnboardingSetupIntent>>, TError, {
    gymId: number;
    data: BodyType<CreateOnboardingSetupIntentBody>;
}, TContext>;
export type CreateOnboardingSetupIntentMutationResult = NonNullable<Awaited<ReturnType<typeof createOnboardingSetupIntent>>>;
export type CreateOnboardingSetupIntentMutationBody = BodyType<CreateOnboardingSetupIntentBody>;
export type CreateOnboardingSetupIntentMutationError = ErrorType<unknown>;
/**
 * @summary Create a Stripe SetupIntent for member onboarding (no existing member required)
 */
export declare const useCreateOnboardingSetupIntent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOnboardingSetupIntent>>, TError, {
        gymId: number;
        data: BodyType<CreateOnboardingSetupIntentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOnboardingSetupIntent>>, TError, {
    gymId: number;
    data: BodyType<CreateOnboardingSetupIntentBody>;
}, TContext>;
/**
 * @summary Create Stripe setup intent for payment method
 */
export declare const getCreateSetupIntentUrl: (gymId: number, memberId: number) => string;
export declare const createSetupIntent: (gymId: number, memberId: number, options?: RequestInit) => Promise<CreateSetupIntent200>;
export declare const getCreateSetupIntentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSetupIntent>>, TError, {
        gymId: number;
        memberId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSetupIntent>>, TError, {
    gymId: number;
    memberId: number;
}, TContext>;
export type CreateSetupIntentMutationResult = NonNullable<Awaited<ReturnType<typeof createSetupIntent>>>;
export type CreateSetupIntentMutationError = ErrorType<unknown>;
/**
 * @summary Create Stripe setup intent for payment method
 */
export declare const useCreateSetupIntent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSetupIntent>>, TError, {
        gymId: number;
        memberId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSetupIntent>>, TError, {
    gymId: number;
    memberId: number;
}, TContext>;
/**
 * @summary List payment methods for member
 */
export declare const getListPaymentMethodsUrl: (gymId: number, memberId: number) => string;
export declare const listPaymentMethods: (gymId: number, memberId: number, options?: RequestInit) => Promise<ListPaymentMethods200Item[]>;
export declare const getListPaymentMethodsQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/payment-methods`];
export declare const getListPaymentMethodsQueryOptions: <TData = Awaited<ReturnType<typeof listPaymentMethods>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPaymentMethods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPaymentMethods>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPaymentMethodsQueryResult = NonNullable<Awaited<ReturnType<typeof listPaymentMethods>>>;
export type ListPaymentMethodsQueryError = ErrorType<unknown>;
/**
 * @summary List payment methods for member
 */
export declare function useListPaymentMethods<TData = Awaited<ReturnType<typeof listPaymentMethods>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPaymentMethods>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Set a payment method as default for member
 */
export declare const getSetDefaultPaymentMethodUrl: (gymId: number, memberId: number, paymentMethodId: string) => string;
export declare const setDefaultPaymentMethod: (gymId: number, memberId: number, paymentMethodId: string, options?: RequestInit) => Promise<SetDefaultPaymentMethod200>;
export declare const getSetDefaultPaymentMethodMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setDefaultPaymentMethod>>, TError, {
        gymId: number;
        memberId: number;
        paymentMethodId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setDefaultPaymentMethod>>, TError, {
    gymId: number;
    memberId: number;
    paymentMethodId: string;
}, TContext>;
export type SetDefaultPaymentMethodMutationResult = NonNullable<Awaited<ReturnType<typeof setDefaultPaymentMethod>>>;
export type SetDefaultPaymentMethodMutationError = ErrorType<unknown>;
/**
 * @summary Set a payment method as default for member
 */
export declare const useSetDefaultPaymentMethod: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setDefaultPaymentMethod>>, TError, {
        gymId: number;
        memberId: number;
        paymentMethodId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setDefaultPaymentMethod>>, TError, {
    gymId: number;
    memberId: number;
    paymentMethodId: string;
}, TContext>;
/**
 * @summary Remove a payment method from member
 */
export declare const getRemovePaymentMethodUrl: (gymId: number, memberId: number, paymentMethodId: string) => string;
export declare const removePaymentMethod: (gymId: number, memberId: number, paymentMethodId: string, options?: RequestInit) => Promise<RemovePaymentMethod200>;
export declare const getRemovePaymentMethodMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removePaymentMethod>>, TError, {
        gymId: number;
        memberId: number;
        paymentMethodId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removePaymentMethod>>, TError, {
    gymId: number;
    memberId: number;
    paymentMethodId: string;
}, TContext>;
export type RemovePaymentMethodMutationResult = NonNullable<Awaited<ReturnType<typeof removePaymentMethod>>>;
export type RemovePaymentMethodMutationError = ErrorType<unknown>;
/**
 * @summary Remove a payment method from member
 */
export declare const useRemovePaymentMethod: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removePaymentMethod>>, TError, {
        gymId: number;
        memberId: number;
        paymentMethodId: string;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removePaymentMethod>>, TError, {
    gymId: number;
    memberId: number;
    paymentMethodId: string;
}, TContext>;
/**
 * @summary Link another member's billing to this member (couples plan)
 */
export declare const getLinkMemberBillingUrl: (gymId: number, memberId: number) => string;
export declare const linkMemberBilling: (gymId: number, memberId: number, linkMemberBillingBody: LinkMemberBillingBody, options?: RequestInit) => Promise<LinkMemberBilling200>;
export declare const getLinkMemberBillingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof linkMemberBilling>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<LinkMemberBillingBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof linkMemberBilling>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<LinkMemberBillingBody>;
}, TContext>;
export type LinkMemberBillingMutationResult = NonNullable<Awaited<ReturnType<typeof linkMemberBilling>>>;
export type LinkMemberBillingMutationBody = BodyType<LinkMemberBillingBody>;
export type LinkMemberBillingMutationError = ErrorType<unknown>;
/**
 * @summary Link another member's billing to this member (couples plan)
 */
export declare const useLinkMemberBilling: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof linkMemberBilling>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<LinkMemberBillingBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof linkMemberBilling>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<LinkMemberBillingBody>;
}, TContext>;
/**
 * @summary Unlink coupled billing for this member
 */
export declare const getUnlinkMemberBillingUrl: (gymId: number, memberId: number) => string;
export declare const unlinkMemberBilling: (gymId: number, memberId: number, options?: RequestInit) => Promise<UnlinkMemberBilling200>;
export declare const getUnlinkMemberBillingMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unlinkMemberBilling>>, TError, {
        gymId: number;
        memberId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof unlinkMemberBilling>>, TError, {
    gymId: number;
    memberId: number;
}, TContext>;
export type UnlinkMemberBillingMutationResult = NonNullable<Awaited<ReturnType<typeof unlinkMemberBilling>>>;
export type UnlinkMemberBillingMutationError = ErrorType<unknown>;
/**
 * @summary Unlink coupled billing for this member
 */
export declare const useUnlinkMemberBilling: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof unlinkMemberBilling>>, TError, {
        gymId: number;
        memberId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof unlinkMemberBilling>>, TError, {
    gymId: number;
    memberId: number;
}, TContext>;
/**
 * @summary Get linked billing info for a member
 */
export declare const getGetMemberLinkedBillingUrl: (gymId: number, memberId: number) => string;
export declare const getMemberLinkedBilling: (gymId: number, memberId: number, options?: RequestInit) => Promise<GetMemberLinkedBilling200>;
export declare const getGetMemberLinkedBillingQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/linked-billing`];
export declare const getGetMemberLinkedBillingQueryOptions: <TData = Awaited<ReturnType<typeof getMemberLinkedBilling>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberLinkedBilling>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberLinkedBilling>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberLinkedBillingQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberLinkedBilling>>>;
export type GetMemberLinkedBillingQueryError = ErrorType<unknown>;
/**
 * @summary Get linked billing info for a member
 */
export declare function useGetMemberLinkedBilling<TData = Awaited<ReturnType<typeof getMemberLinkedBilling>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberLinkedBilling>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create Stripe-backed subscription
 */
export declare const getCreateStripeSubscriptionUrl: (gymId: number, memberId: number) => string;
export declare const createStripeSubscription: (gymId: number, memberId: number, createStripeSubscriptionBody: CreateStripeSubscriptionBody, options?: RequestInit) => Promise<Subscription>;
export declare const getCreateStripeSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStripeSubscription>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateStripeSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createStripeSubscription>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateStripeSubscriptionBody>;
}, TContext>;
export type CreateStripeSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof createStripeSubscription>>>;
export type CreateStripeSubscriptionMutationBody = BodyType<CreateStripeSubscriptionBody>;
export type CreateStripeSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Create Stripe-backed subscription
 */
export declare const useCreateStripeSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStripeSubscription>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateStripeSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createStripeSubscription>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateStripeSubscriptionBody>;
}, TContext>;
/**
 * @summary Get billing history for member
 */
export declare const getGetMemberBillingHistoryUrl: (gymId: number, memberId: number) => string;
export declare const getMemberBillingHistory: (gymId: number, memberId: number, options?: RequestInit) => Promise<GetMemberBillingHistory200>;
export declare const getGetMemberBillingHistoryQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/billing-history`];
export declare const getGetMemberBillingHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getMemberBillingHistory>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberBillingHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberBillingHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberBillingHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberBillingHistory>>>;
export type GetMemberBillingHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get billing history for member
 */
export declare function useGetMemberBillingHistory<TData = Awaited<ReturnType<typeof getMemberBillingHistory>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberBillingHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create one-time charge for member
 */
export declare const getCreateOneTimeChargeUrl: (gymId: number, memberId: number) => string;
export declare const createOneTimeCharge: (gymId: number, memberId: number, createOneTimeChargeBody: CreateOneTimeChargeBody, options?: RequestInit) => Promise<PaymentRecord>;
export declare const getCreateOneTimeChargeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOneTimeCharge>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateOneTimeChargeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createOneTimeCharge>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateOneTimeChargeBody>;
}, TContext>;
export type CreateOneTimeChargeMutationResult = NonNullable<Awaited<ReturnType<typeof createOneTimeCharge>>>;
export type CreateOneTimeChargeMutationBody = BodyType<CreateOneTimeChargeBody>;
export type CreateOneTimeChargeMutationError = ErrorType<unknown>;
/**
 * @summary Create one-time charge for member
 */
export declare const useCreateOneTimeCharge: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createOneTimeCharge>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateOneTimeChargeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createOneTimeCharge>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateOneTimeChargeBody>;
}, TContext>;
/**
 * @summary Cancel subscription
 */
export declare const getCancelSubscriptionUrl: (gymId: number, subscriptionId: number) => string;
export declare const cancelSubscription: (gymId: number, subscriptionId: number, cancelSubscriptionBody: CancelSubscriptionBody, options?: RequestInit) => Promise<Subscription>;
export declare const getCancelSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<CancelSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof cancelSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<CancelSubscriptionBody>;
}, TContext>;
export type CancelSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof cancelSubscription>>>;
export type CancelSubscriptionMutationBody = BodyType<CancelSubscriptionBody>;
export type CancelSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Cancel subscription
 */
export declare const useCancelSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<CancelSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof cancelSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<CancelSubscriptionBody>;
}, TContext>;
/**
 * @summary Pause subscription
 */
export declare const getPauseSubscriptionUrl: (gymId: number, subscriptionId: number) => string;
export declare const pauseSubscription: (gymId: number, subscriptionId: number, options?: RequestInit) => Promise<Subscription>;
export declare const getPauseSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof pauseSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof pauseSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
}, TContext>;
export type PauseSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof pauseSubscription>>>;
export type PauseSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Pause subscription
 */
export declare const usePauseSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof pauseSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof pauseSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
}, TContext>;
/**
 * @summary Resume paused subscription
 */
export declare const getResumeSubscriptionUrl: (gymId: number, subscriptionId: number) => string;
export declare const resumeSubscription: (gymId: number, subscriptionId: number, options?: RequestInit) => Promise<Subscription>;
export declare const getResumeSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resumeSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resumeSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
}, TContext>;
export type ResumeSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof resumeSubscription>>>;
export type ResumeSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Resume paused subscription
 */
export declare const useResumeSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resumeSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resumeSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
}, TContext>;
/**
 * @summary List payments
 */
export declare const getListPaymentsUrl: (gymId: number) => string;
export declare const listPayments: (gymId: number, options?: RequestInit) => Promise<PaymentRecord[]>;
export declare const getListPaymentsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/payments`];
export declare const getListPaymentsQueryOptions: <TData = Awaited<ReturnType<typeof listPayments>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPayments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPayments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPaymentsQueryResult = NonNullable<Awaited<ReturnType<typeof listPayments>>>;
export type ListPaymentsQueryError = ErrorType<unknown>;
/**
 * @summary List payments
 */
export declare function useListPayments<TData = Awaited<ReturnType<typeof listPayments>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPayments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List refunds
 */
export declare const getListRefundsUrl: (gymId: number) => string;
export declare const listRefunds: (gymId: number, options?: RequestInit) => Promise<RefundRecord[]>;
export declare const getListRefundsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/refunds`];
export declare const getListRefundsQueryOptions: <TData = Awaited<ReturnType<typeof listRefunds>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRefunds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listRefunds>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListRefundsQueryResult = NonNullable<Awaited<ReturnType<typeof listRefunds>>>;
export type ListRefundsQueryError = ErrorType<unknown>;
/**
 * @summary List refunds
 */
export declare function useListRefunds<TData = Awaited<ReturnType<typeof listRefunds>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listRefunds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Refund a payment
 */
export declare const getRefundPaymentUrl: (gymId: number, paymentId: number) => string;
export declare const refundPayment: (gymId: number, paymentId: number, refundPaymentBody: RefundPaymentBody, options?: RequestInit) => Promise<RefundRecord>;
export declare const getRefundPaymentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refundPayment>>, TError, {
        gymId: number;
        paymentId: number;
        data: BodyType<RefundPaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof refundPayment>>, TError, {
    gymId: number;
    paymentId: number;
    data: BodyType<RefundPaymentBody>;
}, TContext>;
export type RefundPaymentMutationResult = NonNullable<Awaited<ReturnType<typeof refundPayment>>>;
export type RefundPaymentMutationBody = BodyType<RefundPaymentBody>;
export type RefundPaymentMutationError = ErrorType<unknown>;
/**
 * @summary Refund a payment
 */
export declare const useRefundPayment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refundPayment>>, TError, {
        gymId: number;
        paymentId: number;
        data: BodyType<RefundPaymentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof refundPayment>>, TError, {
    gymId: number;
    paymentId: number;
    data: BodyType<RefundPaymentBody>;
}, TContext>;
/**
 * @summary Get cancelled members for a period
 */
export declare const getGetCancelledMembersUrl: (gymId: number, params?: GetCancelledMembersParams) => string;
export declare const getCancelledMembers: (gymId: number, params?: GetCancelledMembersParams, options?: RequestInit) => Promise<CancelledMembersResponse>;
export declare const getGetCancelledMembersQueryKey: (gymId: number, params?: GetCancelledMembersParams) => readonly [`/api/gyms/${number}/cancelled-members`, ...GetCancelledMembersParams[]];
export declare const getGetCancelledMembersQueryOptions: <TData = Awaited<ReturnType<typeof getCancelledMembers>>, TError = ErrorType<unknown>>(gymId: number, params?: GetCancelledMembersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCancelledMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCancelledMembers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCancelledMembersQueryResult = NonNullable<Awaited<ReturnType<typeof getCancelledMembers>>>;
export type GetCancelledMembersQueryError = ErrorType<unknown>;
/**
 * @summary Get cancelled members for a period
 */
export declare function useGetCancelledMembers<TData = Awaited<ReturnType<typeof getCancelledMembers>>, TError = ErrorType<unknown>>(gymId: number, params?: GetCancelledMembersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCancelledMembers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get billing dashboard summary
 */
export declare const getGetBillingSummaryUrl: (gymId: number) => string;
export declare const getBillingSummary: (gymId: number, options?: RequestInit) => Promise<BillingSummary>;
export declare const getGetBillingSummaryQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/billing-summary`];
export declare const getGetBillingSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getBillingSummary>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBillingSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBillingSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBillingSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getBillingSummary>>>;
export type GetBillingSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get billing dashboard summary
 */
export declare function useGetBillingSummary<TData = Awaited<ReturnType<typeof getBillingSummary>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBillingSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List active billing recovery records
 */
export declare const getListBillingRecoveriesUrl: (gymId: number) => string;
export declare const listBillingRecoveries: (gymId: number, options?: RequestInit) => Promise<BillingRecovery[]>;
export declare const getListBillingRecoveriesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/billing/recovery`];
export declare const getListBillingRecoveriesQueryOptions: <TData = Awaited<ReturnType<typeof listBillingRecoveries>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBillingRecoveries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listBillingRecoveries>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListBillingRecoveriesQueryResult = NonNullable<Awaited<ReturnType<typeof listBillingRecoveries>>>;
export type ListBillingRecoveriesQueryError = ErrorType<unknown>;
/**
 * @summary List active billing recovery records
 */
export declare function useListBillingRecoveries<TData = Awaited<ReturnType<typeof listBillingRecoveries>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listBillingRecoveries>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get billing recovery for a specific member
 */
export declare const getGetMemberBillingRecoveryUrl: (gymId: number, memberId: number) => string;
export declare const getMemberBillingRecovery: (gymId: number, memberId: number, options?: RequestInit) => Promise<BillingRecovery | null>;
export declare const getGetMemberBillingRecoveryQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/billing/recovery`];
export declare const getGetMemberBillingRecoveryQueryOptions: <TData = Awaited<ReturnType<typeof getMemberBillingRecovery>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberBillingRecovery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberBillingRecovery>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberBillingRecoveryQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberBillingRecovery>>>;
export type GetMemberBillingRecoveryQueryError = ErrorType<unknown>;
/**
 * @summary Get billing recovery for a specific member
 */
export declare function useGetMemberBillingRecovery<TData = Awaited<ReturnType<typeof getMemberBillingRecovery>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberBillingRecovery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Send payment update link to member
 */
export declare const getSendRecoveryLinkUrl: (gymId: number, recoveryId: number) => string;
export declare const sendRecoveryLink: (gymId: number, recoveryId: number, options?: RequestInit) => Promise<SendRecoveryLinkResponse>;
export declare const getSendRecoveryLinkMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendRecoveryLink>>, TError, {
        gymId: number;
        recoveryId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendRecoveryLink>>, TError, {
    gymId: number;
    recoveryId: number;
}, TContext>;
export type SendRecoveryLinkMutationResult = NonNullable<Awaited<ReturnType<typeof sendRecoveryLink>>>;
export type SendRecoveryLinkMutationError = ErrorType<unknown>;
/**
 * @summary Send payment update link to member
 */
export declare const useSendRecoveryLink: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendRecoveryLink>>, TError, {
        gymId: number;
        recoveryId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendRecoveryLink>>, TError, {
    gymId: number;
    recoveryId: number;
}, TContext>;
/**
 * @summary Generate payment update link without sending email
 */
export declare const getGenerateRecoveryLinkUrl: (gymId: number) => string;
export declare const generateRecoveryLink: (gymId: number, generateRecoveryLinkBody: GenerateRecoveryLinkBody, options?: RequestInit) => Promise<GenerateRecoveryLinkResponse>;
export declare const getGenerateRecoveryLinkMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateRecoveryLink>>, TError, {
        gymId: number;
        data: BodyType<GenerateRecoveryLinkBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateRecoveryLink>>, TError, {
    gymId: number;
    data: BodyType<GenerateRecoveryLinkBody>;
}, TContext>;
export type GenerateRecoveryLinkMutationResult = NonNullable<Awaited<ReturnType<typeof generateRecoveryLink>>>;
export type GenerateRecoveryLinkMutationBody = BodyType<GenerateRecoveryLinkBody>;
export type GenerateRecoveryLinkMutationError = ErrorType<unknown>;
/**
 * @summary Generate payment update link without sending email
 */
export declare const useGenerateRecoveryLink: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateRecoveryLink>>, TError, {
        gymId: number;
        data: BodyType<GenerateRecoveryLinkBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateRecoveryLink>>, TError, {
    gymId: number;
    data: BodyType<GenerateRecoveryLinkBody>;
}, TContext>;
/**
 * @summary Evaluate and escalate expired grace periods
 */
export declare const getEvaluateGraceDeadlinesUrl: (gymId: number) => string;
export declare const evaluateGraceDeadlines: (gymId: number, options?: RequestInit) => Promise<GraceEvaluationResponse>;
export declare const getEvaluateGraceDeadlinesMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof evaluateGraceDeadlines>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof evaluateGraceDeadlines>>, TError, {
    gymId: number;
}, TContext>;
export type EvaluateGraceDeadlinesMutationResult = NonNullable<Awaited<ReturnType<typeof evaluateGraceDeadlines>>>;
export type EvaluateGraceDeadlinesMutationError = ErrorType<unknown>;
/**
 * @summary Evaluate and escalate expired grace periods
 */
export declare const useEvaluateGraceDeadlines: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof evaluateGraceDeadlines>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof evaluateGraceDeadlines>>, TError, {
    gymId: number;
}, TContext>;
/**
 * @summary Run billing maintenance tasks (cleanup tokens, archive old recoveries, evaluate grace)
 */
export declare const getRunBillingMaintenanceUrl: (gymId: number) => string;
export declare const runBillingMaintenance: (gymId: number, options?: RequestInit) => Promise<BillingMaintenanceResponse>;
export declare const getRunBillingMaintenanceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof runBillingMaintenance>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof runBillingMaintenance>>, TError, {
    gymId: number;
}, TContext>;
export type RunBillingMaintenanceMutationResult = NonNullable<Awaited<ReturnType<typeof runBillingMaintenance>>>;
export type RunBillingMaintenanceMutationError = ErrorType<unknown>;
/**
 * @summary Run billing maintenance tasks (cleanup tokens, archive old recoveries, evaluate grace)
 */
export declare const useRunBillingMaintenance: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof runBillingMaintenance>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof runBillingMaintenance>>, TError, {
    gymId: number;
}, TContext>;
/**
 * @summary Validate a payment update token (public, no auth)
 */
export declare const getValidatePaymentUpdateTokenUrl: (params: ValidatePaymentUpdateTokenParams) => string;
export declare const validatePaymentUpdateToken: (params: ValidatePaymentUpdateTokenParams, options?: RequestInit) => Promise<PaymentUpdateValidation>;
export declare const getValidatePaymentUpdateTokenQueryKey: (params?: ValidatePaymentUpdateTokenParams) => readonly ["/api/payment-update/validate", ...ValidatePaymentUpdateTokenParams[]];
export declare const getValidatePaymentUpdateTokenQueryOptions: <TData = Awaited<ReturnType<typeof validatePaymentUpdateToken>>, TError = ErrorType<unknown>>(params: ValidatePaymentUpdateTokenParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof validatePaymentUpdateToken>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof validatePaymentUpdateToken>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ValidatePaymentUpdateTokenQueryResult = NonNullable<Awaited<ReturnType<typeof validatePaymentUpdateToken>>>;
export type ValidatePaymentUpdateTokenQueryError = ErrorType<unknown>;
/**
 * @summary Validate a payment update token (public, no auth)
 */
export declare function useValidatePaymentUpdateToken<TData = Awaited<ReturnType<typeof validatePaymentUpdateToken>>, TError = ErrorType<unknown>>(params: ValidatePaymentUpdateTokenParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof validatePaymentUpdateToken>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create Stripe SetupIntent for payment update (public, no auth)
 */
export declare const getCreatePaymentUpdateSetupIntentUrl: () => string;
export declare const createPaymentUpdateSetupIntent: (createPaymentUpdateSetupIntentBody: CreatePaymentUpdateSetupIntentBody, options?: RequestInit) => Promise<PaymentUpdateSetupIntent>;
export declare const getCreatePaymentUpdateSetupIntentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPaymentUpdateSetupIntent>>, TError, {
        data: BodyType<CreatePaymentUpdateSetupIntentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPaymentUpdateSetupIntent>>, TError, {
    data: BodyType<CreatePaymentUpdateSetupIntentBody>;
}, TContext>;
export type CreatePaymentUpdateSetupIntentMutationResult = NonNullable<Awaited<ReturnType<typeof createPaymentUpdateSetupIntent>>>;
export type CreatePaymentUpdateSetupIntentMutationBody = BodyType<CreatePaymentUpdateSetupIntentBody>;
export type CreatePaymentUpdateSetupIntentMutationError = ErrorType<unknown>;
/**
 * @summary Create Stripe SetupIntent for payment update (public, no auth)
 */
export declare const useCreatePaymentUpdateSetupIntent: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPaymentUpdateSetupIntent>>, TError, {
        data: BodyType<CreatePaymentUpdateSetupIntentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPaymentUpdateSetupIntent>>, TError, {
    data: BodyType<CreatePaymentUpdateSetupIntentBody>;
}, TContext>;
/**
 * @summary Complete payment method update (public, no auth)
 */
export declare const getCompletePaymentUpdateUrl: () => string;
export declare const completePaymentUpdate: (completePaymentUpdateBody: CompletePaymentUpdateBody, options?: RequestInit) => Promise<PaymentUpdateCompleteResponse>;
export declare const getCompletePaymentUpdateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completePaymentUpdate>>, TError, {
        data: BodyType<CompletePaymentUpdateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completePaymentUpdate>>, TError, {
    data: BodyType<CompletePaymentUpdateBody>;
}, TContext>;
export type CompletePaymentUpdateMutationResult = NonNullable<Awaited<ReturnType<typeof completePaymentUpdate>>>;
export type CompletePaymentUpdateMutationBody = BodyType<CompletePaymentUpdateBody>;
export type CompletePaymentUpdateMutationError = ErrorType<unknown>;
/**
 * @summary Complete payment method update (public, no auth)
 */
export declare const useCompletePaymentUpdate: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completePaymentUpdate>>, TError, {
        data: BodyType<CompletePaymentUpdateBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completePaymentUpdate>>, TError, {
    data: BodyType<CompletePaymentUpdateBody>;
}, TContext>;
/**
 * @summary List retail products
 */
export declare const getListProductsUrl: (gymId: number) => string;
export declare const listProducts: (gymId: number, options?: RequestInit) => Promise<Product[]>;
export declare const getListProductsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/products`];
export declare const getListProductsQueryOptions: <TData = Awaited<ReturnType<typeof listProducts>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProductsQueryResult = NonNullable<Awaited<ReturnType<typeof listProducts>>>;
export type ListProductsQueryError = ErrorType<unknown>;
/**
 * @summary List retail products
 */
export declare function useListProducts<TData = Awaited<ReturnType<typeof listProducts>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProducts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create product
 */
export declare const getCreateProductUrl: (gymId: number) => string;
export declare const createProduct: (gymId: number, createProductBody: CreateProductBody, options?: RequestInit) => Promise<Product>;
export declare const getCreateProductMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
        gymId: number;
        data: BodyType<CreateProductBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
    gymId: number;
    data: BodyType<CreateProductBody>;
}, TContext>;
export type CreateProductMutationResult = NonNullable<Awaited<ReturnType<typeof createProduct>>>;
export type CreateProductMutationBody = BodyType<CreateProductBody>;
export type CreateProductMutationError = ErrorType<unknown>;
/**
 * @summary Create product
 */
export declare const useCreateProduct: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProduct>>, TError, {
        gymId: number;
        data: BodyType<CreateProductBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProduct>>, TError, {
    gymId: number;
    data: BodyType<CreateProductBody>;
}, TContext>;
/**
 * @summary List retail sales
 */
export declare const getListSalesUrl: (gymId: number) => string;
export declare const listSales: (gymId: number, options?: RequestInit) => Promise<Sale[]>;
export declare const getListSalesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/sales`];
export declare const getListSalesQueryOptions: <TData = Awaited<ReturnType<typeof listSales>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSales>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSales>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSalesQueryResult = NonNullable<Awaited<ReturnType<typeof listSales>>>;
export type ListSalesQueryError = ErrorType<unknown>;
/**
 * @summary List retail sales
 */
export declare function useListSales<TData = Awaited<ReturnType<typeof listSales>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSales>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create sale / checkout
 */
export declare const getCreateSaleUrl: (gymId: number) => string;
export declare const createSale: (gymId: number, createSaleBody: CreateSaleBody, options?: RequestInit) => Promise<Sale>;
export declare const getCreateSaleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSale>>, TError, {
        gymId: number;
        data: BodyType<CreateSaleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSale>>, TError, {
    gymId: number;
    data: BodyType<CreateSaleBody>;
}, TContext>;
export type CreateSaleMutationResult = NonNullable<Awaited<ReturnType<typeof createSale>>>;
export type CreateSaleMutationBody = BodyType<CreateSaleBody>;
export type CreateSaleMutationError = ErrorType<unknown>;
/**
 * @summary Create sale / checkout
 */
export declare const useCreateSale: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSale>>, TError, {
        gymId: number;
        data: BodyType<CreateSaleBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSale>>, TError, {
    gymId: number;
    data: BodyType<CreateSaleBody>;
}, TContext>;
/**
 * @summary List posted workouts
 */
export declare const getListWorkoutsUrl: (gymId: number, params?: ListWorkoutsParams) => string;
export declare const listWorkouts: (gymId: number, params?: ListWorkoutsParams, options?: RequestInit) => Promise<Workout[]>;
export declare const getListWorkoutsQueryKey: (gymId: number, params?: ListWorkoutsParams) => readonly [`/api/gyms/${number}/workouts`, ...ListWorkoutsParams[]];
export declare const getListWorkoutsQueryOptions: <TData = Awaited<ReturnType<typeof listWorkouts>>, TError = ErrorType<unknown>>(gymId: number, params?: ListWorkoutsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkouts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWorkouts>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWorkoutsQueryResult = NonNullable<Awaited<ReturnType<typeof listWorkouts>>>;
export type ListWorkoutsQueryError = ErrorType<unknown>;
/**
 * @summary List posted workouts
 */
export declare function useListWorkouts<TData = Awaited<ReturnType<typeof listWorkouts>>, TError = ErrorType<unknown>>(gymId: number, params?: ListWorkoutsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkouts>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Post a workout
 */
export declare const getCreateWorkoutUrl: (gymId: number) => string;
export declare const createWorkout: (gymId: number, createWorkoutBody: CreateWorkoutBody, options?: RequestInit) => Promise<Workout>;
export declare const getCreateWorkoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorkout>>, TError, {
        gymId: number;
        data: BodyType<CreateWorkoutBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createWorkout>>, TError, {
    gymId: number;
    data: BodyType<CreateWorkoutBody>;
}, TContext>;
export type CreateWorkoutMutationResult = NonNullable<Awaited<ReturnType<typeof createWorkout>>>;
export type CreateWorkoutMutationBody = BodyType<CreateWorkoutBody>;
export type CreateWorkoutMutationError = ErrorType<unknown>;
/**
 * @summary Post a workout
 */
export declare const useCreateWorkout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createWorkout>>, TError, {
        gymId: number;
        data: BodyType<CreateWorkoutBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createWorkout>>, TError, {
    gymId: number;
    data: BodyType<CreateWorkoutBody>;
}, TContext>;
/**
 * @summary List workout results (whiteboard)
 */
export declare const getListWorkoutResultsUrl: (gymId: number, workoutId: number) => string;
export declare const listWorkoutResults: (gymId: number, workoutId: number, options?: RequestInit) => Promise<WorkoutResult[]>;
export declare const getListWorkoutResultsQueryKey: (gymId: number, workoutId: number) => readonly [`/api/gyms/${number}/workouts/${number}/results`];
export declare const getListWorkoutResultsQueryOptions: <TData = Awaited<ReturnType<typeof listWorkoutResults>>, TError = ErrorType<unknown>>(gymId: number, workoutId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkoutResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listWorkoutResults>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListWorkoutResultsQueryResult = NonNullable<Awaited<ReturnType<typeof listWorkoutResults>>>;
export type ListWorkoutResultsQueryError = ErrorType<unknown>;
/**
 * @summary List workout results (whiteboard)
 */
export declare function useListWorkoutResults<TData = Awaited<ReturnType<typeof listWorkoutResults>>, TError = ErrorType<unknown>>(gymId: number, workoutId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listWorkoutResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log member workout result
 */
export declare const getLogWorkoutResultUrl: (gymId: number, workoutId: number) => string;
export declare const logWorkoutResult: (gymId: number, workoutId: number, createWorkoutResultBody: CreateWorkoutResultBody, options?: RequestInit) => Promise<WorkoutResult>;
export declare const getLogWorkoutResultMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logWorkoutResult>>, TError, {
        gymId: number;
        workoutId: number;
        data: BodyType<CreateWorkoutResultBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logWorkoutResult>>, TError, {
    gymId: number;
    workoutId: number;
    data: BodyType<CreateWorkoutResultBody>;
}, TContext>;
export type LogWorkoutResultMutationResult = NonNullable<Awaited<ReturnType<typeof logWorkoutResult>>>;
export type LogWorkoutResultMutationBody = BodyType<CreateWorkoutResultBody>;
export type LogWorkoutResultMutationError = ErrorType<unknown>;
/**
 * @summary Log member workout result
 */
export declare const useLogWorkoutResult: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logWorkoutResult>>, TError, {
        gymId: number;
        workoutId: number;
        data: BodyType<CreateWorkoutResultBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logWorkoutResult>>, TError, {
    gymId: number;
    workoutId: number;
    data: BodyType<CreateWorkoutResultBody>;
}, TContext>;
/**
 * @summary List programming days
 */
export declare const getListProgrammingDaysUrl: (gymId: number, params?: ListProgrammingDaysParams) => string;
export declare const listProgrammingDays: (gymId: number, params?: ListProgrammingDaysParams, options?: RequestInit) => Promise<ProgrammingDayWithSections[]>;
export declare const getListProgrammingDaysQueryKey: (gymId: number, params?: ListProgrammingDaysParams) => readonly [`/api/gyms/${number}/programming`, ...ListProgrammingDaysParams[]];
export declare const getListProgrammingDaysQueryOptions: <TData = Awaited<ReturnType<typeof listProgrammingDays>>, TError = ErrorType<unknown>>(gymId: number, params?: ListProgrammingDaysParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProgrammingDays>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listProgrammingDays>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListProgrammingDaysQueryResult = NonNullable<Awaited<ReturnType<typeof listProgrammingDays>>>;
export type ListProgrammingDaysQueryError = ErrorType<unknown>;
/**
 * @summary List programming days
 */
export declare function useListProgrammingDays<TData = Awaited<ReturnType<typeof listProgrammingDays>>, TError = ErrorType<unknown>>(gymId: number, params?: ListProgrammingDaysParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listProgrammingDays>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a programming day
 */
export declare const getCreateProgrammingDayUrl: (gymId: number) => string;
export declare const createProgrammingDay: (gymId: number, createProgrammingDayBody: CreateProgrammingDayBody, options?: RequestInit) => Promise<ProgrammingDayWithSections>;
export declare const getCreateProgrammingDayMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProgrammingDay>>, TError, {
        gymId: number;
        data: BodyType<CreateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createProgrammingDay>>, TError, {
    gymId: number;
    data: BodyType<CreateProgrammingDayBody>;
}, TContext>;
export type CreateProgrammingDayMutationResult = NonNullable<Awaited<ReturnType<typeof createProgrammingDay>>>;
export type CreateProgrammingDayMutationBody = BodyType<CreateProgrammingDayBody>;
export type CreateProgrammingDayMutationError = ErrorType<unknown>;
/**
 * @summary Create a programming day
 */
export declare const useCreateProgrammingDay: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createProgrammingDay>>, TError, {
        gymId: number;
        data: BodyType<CreateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createProgrammingDay>>, TError, {
    gymId: number;
    data: BodyType<CreateProgrammingDayBody>;
}, TContext>;
/**
 * @summary Get a programming day with all sections
 */
export declare const getGetProgrammingDayUrl: (gymId: number, dayId: number) => string;
export declare const getProgrammingDay: (gymId: number, dayId: number, options?: RequestInit) => Promise<ProgrammingDayWithSections>;
export declare const getGetProgrammingDayQueryKey: (gymId: number, dayId: number) => readonly [`/api/gyms/${number}/programming/${number}`];
export declare const getGetProgrammingDayQueryOptions: <TData = Awaited<ReturnType<typeof getProgrammingDay>>, TError = ErrorType<void>>(gymId: number, dayId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProgrammingDay>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProgrammingDay>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProgrammingDayQueryResult = NonNullable<Awaited<ReturnType<typeof getProgrammingDay>>>;
export type GetProgrammingDayQueryError = ErrorType<void>;
/**
 * @summary Get a programming day with all sections
 */
export declare function useGetProgrammingDay<TData = Awaited<ReturnType<typeof getProgrammingDay>>, TError = ErrorType<void>>(gymId: number, dayId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProgrammingDay>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a programming day
 */
export declare const getUpdateProgrammingDayUrl: (gymId: number, dayId: number) => string;
export declare const updateProgrammingDay: (gymId: number, dayId: number, updateProgrammingDayBody: UpdateProgrammingDayBody, options?: RequestInit) => Promise<ProgrammingDayWithSections>;
export declare const getUpdateProgrammingDayMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingDay>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<UpdateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingDay>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<UpdateProgrammingDayBody>;
}, TContext>;
export type UpdateProgrammingDayMutationResult = NonNullable<Awaited<ReturnType<typeof updateProgrammingDay>>>;
export type UpdateProgrammingDayMutationBody = BodyType<UpdateProgrammingDayBody>;
export type UpdateProgrammingDayMutationError = ErrorType<unknown>;
/**
 * @summary Update a programming day
 */
export declare const useUpdateProgrammingDay: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingDay>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<UpdateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProgrammingDay>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<UpdateProgrammingDayBody>;
}, TContext>;
/**
 * @summary Archive a programming day
 */
export declare const getDeleteProgrammingDayUrl: (gymId: number, dayId: number) => string;
export declare const deleteProgrammingDay: (gymId: number, dayId: number, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getDeleteProgrammingDayMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgrammingDay>>, TError, {
        gymId: number;
        dayId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProgrammingDay>>, TError, {
    gymId: number;
    dayId: number;
}, TContext>;
export type DeleteProgrammingDayMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProgrammingDay>>>;
export type DeleteProgrammingDayMutationError = ErrorType<unknown>;
/**
 * @summary Archive a programming day
 */
export declare const useDeleteProgrammingDay: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgrammingDay>>, TError, {
        gymId: number;
        dayId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProgrammingDay>>, TError, {
    gymId: number;
    dayId: number;
}, TContext>;
/**
 * @summary Toggle publish/unpublish status of a programming day
 */
export declare const getToggleProgrammingDayPublishUrl: (gymId: number, dayId: number) => string;
export declare const toggleProgrammingDayPublish: (gymId: number, dayId: number, options?: RequestInit) => Promise<ProgrammingDayWithSections>;
export declare const getToggleProgrammingDayPublishMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleProgrammingDayPublish>>, TError, {
        gymId: number;
        dayId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof toggleProgrammingDayPublish>>, TError, {
    gymId: number;
    dayId: number;
}, TContext>;
export type ToggleProgrammingDayPublishMutationResult = NonNullable<Awaited<ReturnType<typeof toggleProgrammingDayPublish>>>;
export type ToggleProgrammingDayPublishMutationError = ErrorType<unknown>;
/**
 * @summary Toggle publish/unpublish status of a programming day
 */
export declare const useToggleProgrammingDayPublish: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof toggleProgrammingDayPublish>>, TError, {
        gymId: number;
        dayId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof toggleProgrammingDayPublish>>, TError, {
    gymId: number;
    dayId: number;
}, TContext>;
/**
 * @summary Duplicate a programming day to a new date
 */
export declare const getDuplicateProgrammingDayUrl: (gymId: number, dayId: number) => string;
export declare const duplicateProgrammingDay: (gymId: number, dayId: number, duplicateProgrammingDayBody: DuplicateProgrammingDayBody, options?: RequestInit) => Promise<ProgrammingDayWithSections>;
export declare const getDuplicateProgrammingDayMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof duplicateProgrammingDay>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<DuplicateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof duplicateProgrammingDay>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<DuplicateProgrammingDayBody>;
}, TContext>;
export type DuplicateProgrammingDayMutationResult = NonNullable<Awaited<ReturnType<typeof duplicateProgrammingDay>>>;
export type DuplicateProgrammingDayMutationBody = BodyType<DuplicateProgrammingDayBody>;
export type DuplicateProgrammingDayMutationError = ErrorType<unknown>;
/**
 * @summary Duplicate a programming day to a new date
 */
export declare const useDuplicateProgrammingDay: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof duplicateProgrammingDay>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<DuplicateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof duplicateProgrammingDay>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<DuplicateProgrammingDayBody>;
}, TContext>;
/**
 * @summary Add a section to a programming day
 */
export declare const getAddProgrammingSectionUrl: (gymId: number, dayId: number) => string;
export declare const addProgrammingSection: (gymId: number, dayId: number, createProgrammingSectionBody: CreateProgrammingSectionBody, options?: RequestInit) => Promise<ProgrammingSection>;
export declare const getAddProgrammingSectionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addProgrammingSection>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<CreateProgrammingSectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof addProgrammingSection>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<CreateProgrammingSectionBody>;
}, TContext>;
export type AddProgrammingSectionMutationResult = NonNullable<Awaited<ReturnType<typeof addProgrammingSection>>>;
export type AddProgrammingSectionMutationBody = BodyType<CreateProgrammingSectionBody>;
export type AddProgrammingSectionMutationError = ErrorType<unknown>;
/**
 * @summary Add a section to a programming day
 */
export declare const useAddProgrammingSection: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof addProgrammingSection>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<CreateProgrammingSectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof addProgrammingSection>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<CreateProgrammingSectionBody>;
}, TContext>;
/**
 * @summary Update a programming section
 */
export declare const getUpdateProgrammingSectionUrl: (gymId: number, dayId: number, sectionId: number) => string;
export declare const updateProgrammingSection: (gymId: number, dayId: number, sectionId: number, updateProgrammingSectionBody: UpdateProgrammingSectionBody, options?: RequestInit) => Promise<ProgrammingSection>;
export declare const getUpdateProgrammingSectionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingSection>>, TError, {
        gymId: number;
        dayId: number;
        sectionId: number;
        data: BodyType<UpdateProgrammingSectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingSection>>, TError, {
    gymId: number;
    dayId: number;
    sectionId: number;
    data: BodyType<UpdateProgrammingSectionBody>;
}, TContext>;
export type UpdateProgrammingSectionMutationResult = NonNullable<Awaited<ReturnType<typeof updateProgrammingSection>>>;
export type UpdateProgrammingSectionMutationBody = BodyType<UpdateProgrammingSectionBody>;
export type UpdateProgrammingSectionMutationError = ErrorType<unknown>;
/**
 * @summary Update a programming section
 */
export declare const useUpdateProgrammingSection: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingSection>>, TError, {
        gymId: number;
        dayId: number;
        sectionId: number;
        data: BodyType<UpdateProgrammingSectionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProgrammingSection>>, TError, {
    gymId: number;
    dayId: number;
    sectionId: number;
    data: BodyType<UpdateProgrammingSectionBody>;
}, TContext>;
/**
 * @summary Remove a section from a programming day
 */
export declare const getDeleteProgrammingSectionUrl: (gymId: number, dayId: number, sectionId: number) => string;
export declare const deleteProgrammingSection: (gymId: number, dayId: number, sectionId: number, options?: RequestInit) => Promise<SuccessResponse>;
export declare const getDeleteProgrammingSectionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgrammingSection>>, TError, {
        gymId: number;
        dayId: number;
        sectionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteProgrammingSection>>, TError, {
    gymId: number;
    dayId: number;
    sectionId: number;
}, TContext>;
export type DeleteProgrammingSectionMutationResult = NonNullable<Awaited<ReturnType<typeof deleteProgrammingSection>>>;
export type DeleteProgrammingSectionMutationError = ErrorType<unknown>;
/**
 * @summary Remove a section from a programming day
 */
export declare const useDeleteProgrammingSection: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteProgrammingSection>>, TError, {
        gymId: number;
        dayId: number;
        sectionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteProgrammingSection>>, TError, {
    gymId: number;
    dayId: number;
    sectionId: number;
}, TContext>;
/**
 * @summary Reorder sections within a programming day
 */
export declare const getReorderProgrammingSectionsUrl: (gymId: number, dayId: number) => string;
export declare const reorderProgrammingSections: (gymId: number, dayId: number, reorderSectionsBody: ReorderSectionsBody, options?: RequestInit) => Promise<ProgrammingSection[]>;
export declare const getReorderProgrammingSectionsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderProgrammingSections>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<ReorderSectionsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof reorderProgrammingSections>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<ReorderSectionsBody>;
}, TContext>;
export type ReorderProgrammingSectionsMutationResult = NonNullable<Awaited<ReturnType<typeof reorderProgrammingSections>>>;
export type ReorderProgrammingSectionsMutationBody = BodyType<ReorderSectionsBody>;
export type ReorderProgrammingSectionsMutationError = ErrorType<unknown>;
/**
 * @summary Reorder sections within a programming day
 */
export declare const useReorderProgrammingSections: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof reorderProgrammingSections>>, TError, {
        gymId: number;
        dayId: number;
        data: BodyType<ReorderSectionsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof reorderProgrammingSections>>, TError, {
    gymId: number;
    dayId: number;
    data: BodyType<ReorderSectionsBody>;
}, TContext>;
/**
 * @summary List results for a programming section
 */
export declare const getListSectionResultsUrl: (gymId: number, dayId: number, sectionId: number) => string;
export declare const listSectionResults: (gymId: number, dayId: number, sectionId: number, options?: RequestInit) => Promise<WorkoutResult[]>;
export declare const getListSectionResultsQueryKey: (gymId: number, dayId: number, sectionId: number) => readonly [`/api/gyms/${number}/programming/${number}/sections/${number}/results`];
export declare const getListSectionResultsQueryOptions: <TData = Awaited<ReturnType<typeof listSectionResults>>, TError = ErrorType<unknown>>(gymId: number, dayId: number, sectionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSectionResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSectionResults>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSectionResultsQueryResult = NonNullable<Awaited<ReturnType<typeof listSectionResults>>>;
export type ListSectionResultsQueryError = ErrorType<unknown>;
/**
 * @summary List results for a programming section
 */
export declare function useListSectionResults<TData = Awaited<ReturnType<typeof listSectionResults>>, TError = ErrorType<unknown>>(gymId: number, dayId: number, sectionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSectionResults>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Log a result for a programming section
 */
export declare const getLogSectionResultUrl: (gymId: number, dayId: number, sectionId: number) => string;
export declare const logSectionResult: (gymId: number, dayId: number, sectionId: number, createWorkoutResultBody: CreateWorkoutResultBody, options?: RequestInit) => Promise<WorkoutResult>;
export declare const getLogSectionResultMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logSectionResult>>, TError, {
        gymId: number;
        dayId: number;
        sectionId: number;
        data: BodyType<CreateWorkoutResultBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logSectionResult>>, TError, {
    gymId: number;
    dayId: number;
    sectionId: number;
    data: BodyType<CreateWorkoutResultBody>;
}, TContext>;
export type LogSectionResultMutationResult = NonNullable<Awaited<ReturnType<typeof logSectionResult>>>;
export type LogSectionResultMutationBody = BodyType<CreateWorkoutResultBody>;
export type LogSectionResultMutationError = ErrorType<unknown>;
/**
 * @summary Log a result for a programming section
 */
export declare const useLogSectionResult: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logSectionResult>>, TError, {
        gymId: number;
        dayId: number;
        sectionId: number;
        data: BodyType<CreateWorkoutResultBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logSectionResult>>, TError, {
    gymId: number;
    dayId: number;
    sectionId: number;
    data: BodyType<CreateWorkoutResultBody>;
}, TContext>;
/**
 * @summary Get programming preferences for a gym
 */
export declare const getGetProgrammingPreferencesUrl: (gymId: number) => string;
export declare const getProgrammingPreferences: (gymId: number, options?: RequestInit) => Promise<ProgrammingPreferences>;
export declare const getGetProgrammingPreferencesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/programming/preferences`];
export declare const getGetProgrammingPreferencesQueryOptions: <TData = Awaited<ReturnType<typeof getProgrammingPreferences>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProgrammingPreferences>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getProgrammingPreferences>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetProgrammingPreferencesQueryResult = NonNullable<Awaited<ReturnType<typeof getProgrammingPreferences>>>;
export type GetProgrammingPreferencesQueryError = ErrorType<unknown>;
/**
 * @summary Get programming preferences for a gym
 */
export declare function useGetProgrammingPreferences<TData = Awaited<ReturnType<typeof getProgrammingPreferences>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getProgrammingPreferences>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update programming preferences for a gym
 */
export declare const getUpdateProgrammingPreferencesUrl: (gymId: number) => string;
export declare const updateProgrammingPreferences: (gymId: number, updateProgrammingPreferencesBody: UpdateProgrammingPreferencesBody, options?: RequestInit) => Promise<ProgrammingPreferences>;
export declare const getUpdateProgrammingPreferencesMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingPreferences>>, TError, {
        gymId: number;
        data: BodyType<UpdateProgrammingPreferencesBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingPreferences>>, TError, {
    gymId: number;
    data: BodyType<UpdateProgrammingPreferencesBody>;
}, TContext>;
export type UpdateProgrammingPreferencesMutationResult = NonNullable<Awaited<ReturnType<typeof updateProgrammingPreferences>>>;
export type UpdateProgrammingPreferencesMutationBody = BodyType<UpdateProgrammingPreferencesBody>;
export type UpdateProgrammingPreferencesMutationError = ErrorType<unknown>;
/**
 * @summary Update programming preferences for a gym
 */
export declare const useUpdateProgrammingPreferences: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateProgrammingPreferences>>, TError, {
        gymId: number;
        data: BodyType<UpdateProgrammingPreferencesBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateProgrammingPreferences>>, TError, {
    gymId: number;
    data: BodyType<UpdateProgrammingPreferencesBody>;
}, TContext>;
/**
 * @summary AI-generate a single day of programming
 */
export declare const getGenerateProgrammingDayUrl: (gymId: number) => string;
export declare const generateProgrammingDay: (gymId: number, generateProgrammingDayBody: GenerateProgrammingDayBody, options?: RequestInit) => Promise<ProgrammingDayWithSections>;
export declare const getGenerateProgrammingDayMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateProgrammingDay>>, TError, {
        gymId: number;
        data: BodyType<GenerateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateProgrammingDay>>, TError, {
    gymId: number;
    data: BodyType<GenerateProgrammingDayBody>;
}, TContext>;
export type GenerateProgrammingDayMutationResult = NonNullable<Awaited<ReturnType<typeof generateProgrammingDay>>>;
export type GenerateProgrammingDayMutationBody = BodyType<GenerateProgrammingDayBody>;
export type GenerateProgrammingDayMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary AI-generate a single day of programming
 */
export declare const useGenerateProgrammingDay: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateProgrammingDay>>, TError, {
        gymId: number;
        data: BodyType<GenerateProgrammingDayBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateProgrammingDay>>, TError, {
    gymId: number;
    data: BodyType<GenerateProgrammingDayBody>;
}, TContext>;
/**
 * @summary AI-generate a full week of programming
 */
export declare const getGenerateProgrammingWeekUrl: (gymId: number) => string;
export declare const generateProgrammingWeek: (gymId: number, generateProgrammingWeekBody: GenerateProgrammingWeekBody, options?: RequestInit) => Promise<GenerateWeekResponse>;
export declare const getGenerateProgrammingWeekMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateProgrammingWeek>>, TError, {
        gymId: number;
        data: BodyType<GenerateProgrammingWeekBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateProgrammingWeek>>, TError, {
    gymId: number;
    data: BodyType<GenerateProgrammingWeekBody>;
}, TContext>;
export type GenerateProgrammingWeekMutationResult = NonNullable<Awaited<ReturnType<typeof generateProgrammingWeek>>>;
export type GenerateProgrammingWeekMutationBody = BodyType<GenerateProgrammingWeekBody>;
export type GenerateProgrammingWeekMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary AI-generate a full week of programming
 */
export declare const useGenerateProgrammingWeek: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateProgrammingWeek>>, TError, {
        gymId: number;
        data: BodyType<GenerateProgrammingWeekBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateProgrammingWeek>>, TError, {
    gymId: number;
    data: BodyType<GenerateProgrammingWeekBody>;
}, TContext>;
/**
 * @summary Trigger auto-publish for upcoming draft programming
 */
export declare const getTriggerAutoPublishUrl: (gymId: number) => string;
export declare const triggerAutoPublish: (gymId: number, options?: RequestInit) => Promise<TriggerAutoPublish200>;
export declare const getTriggerAutoPublishMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerAutoPublish>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof triggerAutoPublish>>, TError, {
    gymId: number;
}, TContext>;
export type TriggerAutoPublishMutationResult = NonNullable<Awaited<ReturnType<typeof triggerAutoPublish>>>;
export type TriggerAutoPublishMutationError = ErrorType<unknown>;
/**
 * @summary Trigger auto-publish for upcoming draft programming
 */
export declare const useTriggerAutoPublish: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof triggerAutoPublish>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof triggerAutoPublish>>, TError, {
    gymId: number;
}, TContext>;
/**
 * @summary List announcements
 */
export declare const getListAnnouncementsUrl: (gymId: number) => string;
export declare const listAnnouncements: (gymId: number, options?: RequestInit) => Promise<Announcement[]>;
export declare const getListAnnouncementsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/announcements`];
export declare const getListAnnouncementsQueryOptions: <TData = Awaited<ReturnType<typeof listAnnouncements>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAnnouncements>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAnnouncements>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAnnouncementsQueryResult = NonNullable<Awaited<ReturnType<typeof listAnnouncements>>>;
export type ListAnnouncementsQueryError = ErrorType<unknown>;
/**
 * @summary List announcements
 */
export declare function useListAnnouncements<TData = Awaited<ReturnType<typeof listAnnouncements>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAnnouncements>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create announcement
 */
export declare const getCreateAnnouncementUrl: (gymId: number) => string;
export declare const createAnnouncement: (gymId: number, createAnnouncementBody: CreateAnnouncementBody, options?: RequestInit) => Promise<Announcement>;
export declare const getCreateAnnouncementMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
        gymId: number;
        data: BodyType<CreateAnnouncementBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
    gymId: number;
    data: BodyType<CreateAnnouncementBody>;
}, TContext>;
export type CreateAnnouncementMutationResult = NonNullable<Awaited<ReturnType<typeof createAnnouncement>>>;
export type CreateAnnouncementMutationBody = BodyType<CreateAnnouncementBody>;
export type CreateAnnouncementMutationError = ErrorType<unknown>;
/**
 * @summary Create announcement
 */
export declare const useCreateAnnouncement: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
        gymId: number;
        data: BodyType<CreateAnnouncementBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAnnouncement>>, TError, {
    gymId: number;
    data: BodyType<CreateAnnouncementBody>;
}, TContext>;
/**
 * @summary Get full intelligence overview (RSI, risks, interventions)
 */
export declare const getGetIntelligenceOverviewUrl: (gymId: number) => string;
export declare const getIntelligenceOverview: (gymId: number, options?: RequestInit) => Promise<IntelligenceOverview>;
export declare const getGetIntelligenceOverviewQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/overview`];
export declare const getGetIntelligenceOverviewQueryOptions: <TData = Awaited<ReturnType<typeof getIntelligenceOverview>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIntelligenceOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getIntelligenceOverview>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetIntelligenceOverviewQueryResult = NonNullable<Awaited<ReturnType<typeof getIntelligenceOverview>>>;
export type GetIntelligenceOverviewQueryError = ErrorType<unknown>;
/**
 * @summary Get full intelligence overview (RSI, risks, interventions)
 */
export declare function useGetIntelligenceOverview<TData = Awaited<ReturnType<typeof getIntelligenceOverview>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIntelligenceOverview>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get Retention Stability Index
 */
export declare const getGetRetentionStabilityIndexUrl: (gymId: number) => string;
export declare const getRetentionStabilityIndex: (gymId: number, options?: RequestInit) => Promise<RetentionStabilityIndex>;
export declare const getGetRetentionStabilityIndexQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/rsi`];
export declare const getGetRetentionStabilityIndexQueryOptions: <TData = Awaited<ReturnType<typeof getRetentionStabilityIndex>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRetentionStabilityIndex>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRetentionStabilityIndex>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRetentionStabilityIndexQueryResult = NonNullable<Awaited<ReturnType<typeof getRetentionStabilityIndex>>>;
export type GetRetentionStabilityIndexQueryError = ErrorType<unknown>;
/**
 * @summary Get Retention Stability Index
 */
export declare function useGetRetentionStabilityIndex<TData = Awaited<ReturnType<typeof getRetentionStabilityIndex>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRetentionStabilityIndex>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get RSI historical data points
 */
export declare const getGetRsiHistoryUrl: (gymId: number, params?: GetRsiHistoryParams) => string;
export declare const getRsiHistory: (gymId: number, params?: GetRsiHistoryParams, options?: RequestInit) => Promise<RsiHistory>;
export declare const getGetRsiHistoryQueryKey: (gymId: number, params?: GetRsiHistoryParams) => readonly [`/api/gyms/${number}/intelligence/rsi/history`, ...GetRsiHistoryParams[]];
export declare const getGetRsiHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getRsiHistory>>, TError = ErrorType<unknown>>(gymId: number, params?: GetRsiHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRsiHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRsiHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRsiHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getRsiHistory>>>;
export type GetRsiHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get RSI historical data points
 */
export declare function useGetRsiHistory<TData = Awaited<ReturnType<typeof getRsiHistory>>, TError = ErrorType<unknown>>(gymId: number, params?: GetRsiHistoryParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRsiHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get member risk radar data
 */
export declare const getGetMemberRiskRadarUrl: (gymId: number) => string;
export declare const getMemberRiskRadar: (gymId: number, options?: RequestInit) => Promise<MemberRiskProfile[]>;
export declare const getGetMemberRiskRadarQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/risk-radar`];
export declare const getGetMemberRiskRadarQueryOptions: <TData = Awaited<ReturnType<typeof getMemberRiskRadar>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberRiskRadar>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberRiskRadar>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberRiskRadarQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberRiskRadar>>>;
export type GetMemberRiskRadarQueryError = ErrorType<unknown>;
/**
 * @summary Get member risk radar data
 */
export declare function useGetMemberRiskRadar<TData = Awaited<ReturnType<typeof getMemberRiskRadar>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberRiskRadar>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get ranked interventions
 */
export declare const getGetInterventionsUrl: (gymId: number) => string;
export declare const getInterventions: (gymId: number, options?: RequestInit) => Promise<Intervention[]>;
export declare const getGetInterventionsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/interventions`];
export declare const getGetInterventionsQueryOptions: <TData = Awaited<ReturnType<typeof getInterventions>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInterventions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getInterventions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetInterventionsQueryResult = NonNullable<Awaited<ReturnType<typeof getInterventions>>>;
export type GetInterventionsQueryError = ErrorType<unknown>;
/**
 * @summary Get ranked interventions
 */
export declare function useGetInterventions<TData = Awaited<ReturnType<typeof getInterventions>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getInterventions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get cohort analysis
 */
export declare const getGetCohortAnalysisUrl: (gymId: number) => string;
export declare const getCohortAnalysis: (gymId: number, options?: RequestInit) => Promise<CohortData[]>;
export declare const getGetCohortAnalysisQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/cohorts`];
export declare const getGetCohortAnalysisQueryOptions: <TData = Awaited<ReturnType<typeof getCohortAnalysis>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCohortAnalysis>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCohortAnalysis>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCohortAnalysisQueryResult = NonNullable<Awaited<ReturnType<typeof getCohortAnalysis>>>;
export type GetCohortAnalysisQueryError = ErrorType<unknown>;
/**
 * @summary Get cohort analysis
 */
export declare function useGetCohortAnalysis<TData = Awaited<ReturnType<typeof getCohortAnalysis>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCohortAnalysis>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get revenue scenario forecast
 */
export declare const getGetRevenueForecastUrl: (gymId: number) => string;
export declare const getRevenueForecast: (gymId: number, options?: RequestInit) => Promise<RevenueForecast>;
export declare const getGetRevenueForecastQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/revenue-forecast`];
export declare const getGetRevenueForecastQueryOptions: <TData = Awaited<ReturnType<typeof getRevenueForecast>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueForecast>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRevenueForecast>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRevenueForecastQueryResult = NonNullable<Awaited<ReturnType<typeof getRevenueForecast>>>;
export type GetRevenueForecastQueryError = ErrorType<unknown>;
/**
 * @summary Get revenue scenario forecast
 */
export declare function useGetRevenueForecast<TData = Awaited<ReturnType<typeof getRevenueForecast>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueForecast>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get morning briefing for gym owner
 */
export declare const getGetMorningBriefingUrl: (gymId: number) => string;
export declare const getMorningBriefing: (gymId: number, options?: RequestInit) => Promise<MorningBriefing>;
export declare const getGetMorningBriefingQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/intelligence/morning-briefing`];
export declare const getGetMorningBriefingQueryOptions: <TData = Awaited<ReturnType<typeof getMorningBriefing>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMorningBriefing>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMorningBriefing>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMorningBriefingQueryResult = NonNullable<Awaited<ReturnType<typeof getMorningBriefing>>>;
export type GetMorningBriefingQueryError = ErrorType<unknown>;
/**
 * @summary Get morning briefing for gym owner
 */
export declare function useGetMorningBriefing<TData = Awaited<ReturnType<typeof getMorningBriefing>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMorningBriefing>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Public lead capture form submission (no auth required)
 */
export declare const getSubmitLeadCaptureUrl: (gymSlug: string) => string;
export declare const submitLeadCapture: (gymSlug: string, leadCaptureBody: LeadCaptureBody, options?: RequestInit) => Promise<SubmitLeadCapture201>;
export declare const getSubmitLeadCaptureMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitLeadCapture>>, TError, {
        gymSlug: string;
        data: BodyType<LeadCaptureBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitLeadCapture>>, TError, {
    gymSlug: string;
    data: BodyType<LeadCaptureBody>;
}, TContext>;
export type SubmitLeadCaptureMutationResult = NonNullable<Awaited<ReturnType<typeof submitLeadCapture>>>;
export type SubmitLeadCaptureMutationBody = BodyType<LeadCaptureBody>;
export type SubmitLeadCaptureMutationError = ErrorType<unknown>;
/**
 * @summary Public lead capture form submission (no auth required)
 */
export declare const useSubmitLeadCapture: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitLeadCapture>>, TError, {
        gymSlug: string;
        data: BodyType<LeadCaptureBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitLeadCapture>>, TError, {
    gymSlug: string;
    data: BodyType<LeadCaptureBody>;
}, TContext>;
/**
 * @summary Get public gym info for lead capture form
 */
export declare const getGetLeadCaptureGymInfoUrl: (gymSlug: string) => string;
export declare const getLeadCaptureGymInfo: (gymSlug: string, options?: RequestInit) => Promise<LeadCaptureGymInfo>;
export declare const getGetLeadCaptureGymInfoQueryKey: (gymSlug: string) => readonly [`/api/lead-capture/${string}/info`];
export declare const getGetLeadCaptureGymInfoQueryOptions: <TData = Awaited<ReturnType<typeof getLeadCaptureGymInfo>>, TError = ErrorType<unknown>>(gymSlug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeadCaptureGymInfo>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLeadCaptureGymInfo>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLeadCaptureGymInfoQueryResult = NonNullable<Awaited<ReturnType<typeof getLeadCaptureGymInfo>>>;
export type GetLeadCaptureGymInfoQueryError = ErrorType<unknown>;
/**
 * @summary Get public gym info for lead capture form
 */
export declare function useGetLeadCaptureGymInfo<TData = Awaited<ReturnType<typeof getLeadCaptureGymInfo>>, TError = ErrorType<unknown>>(gymSlug: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeadCaptureGymInfo>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Generate AI outreach draft for at-risk member
 */
export declare const getGenerateMemberOutreachUrl: (gymId: number) => string;
export declare const generateMemberOutreach: (gymId: number, generateOutreachBody: GenerateOutreachBody, options?: RequestInit) => Promise<AiGeneratedContent>;
export declare const getGenerateMemberOutreachMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateMemberOutreach>>, TError, {
        gymId: number;
        data: BodyType<GenerateOutreachBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateMemberOutreach>>, TError, {
    gymId: number;
    data: BodyType<GenerateOutreachBody>;
}, TContext>;
export type GenerateMemberOutreachMutationResult = NonNullable<Awaited<ReturnType<typeof generateMemberOutreach>>>;
export type GenerateMemberOutreachMutationBody = BodyType<GenerateOutreachBody>;
export type GenerateMemberOutreachMutationError = ErrorType<unknown>;
/**
 * @summary Generate AI outreach draft for at-risk member
 */
export declare const useGenerateMemberOutreach: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateMemberOutreach>>, TError, {
        gymId: number;
        data: BodyType<GenerateOutreachBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateMemberOutreach>>, TError, {
    gymId: number;
    data: BodyType<GenerateOutreachBody>;
}, TContext>;
/**
 * @summary Generate AI owner strategic brief
 */
export declare const getGenerateOwnerBriefUrl: (gymId: number) => string;
export declare const generateOwnerBrief: (gymId: number, options?: RequestInit) => Promise<AiGeneratedContent>;
export declare const getGenerateOwnerBriefMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateOwnerBrief>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateOwnerBrief>>, TError, {
    gymId: number;
}, TContext>;
export type GenerateOwnerBriefMutationResult = NonNullable<Awaited<ReturnType<typeof generateOwnerBrief>>>;
export type GenerateOwnerBriefMutationError = ErrorType<unknown>;
/**
 * @summary Generate AI owner strategic brief
 */
export declare const useGenerateOwnerBrief: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateOwnerBrief>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateOwnerBrief>>, TError, {
    gymId: number;
}, TContext>;
/**
 * @summary List AI generated tasks
 */
export declare const getListAiTasksUrl: (gymId: number) => string;
export declare const listAiTasks: (gymId: number, options?: RequestInit) => Promise<AiTask[]>;
export declare const getListAiTasksQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/ai/tasks`];
export declare const getListAiTasksQueryOptions: <TData = Awaited<ReturnType<typeof listAiTasks>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAiTasks>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAiTasks>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAiTasksQueryResult = NonNullable<Awaited<ReturnType<typeof listAiTasks>>>;
export type ListAiTasksQueryError = ErrorType<unknown>;
/**
 * @summary List AI generated tasks
 */
export declare function useListAiTasks<TData = Awaited<ReturnType<typeof listAiTasks>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAiTasks>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create and log AI task
 */
export declare const getCreateAiTaskUrl: (gymId: number) => string;
export declare const createAiTask: (gymId: number, createAiTaskBody: CreateAiTaskBody, options?: RequestInit) => Promise<AiTask>;
export declare const getCreateAiTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAiTask>>, TError, {
        gymId: number;
        data: BodyType<CreateAiTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAiTask>>, TError, {
    gymId: number;
    data: BodyType<CreateAiTaskBody>;
}, TContext>;
export type CreateAiTaskMutationResult = NonNullable<Awaited<ReturnType<typeof createAiTask>>>;
export type CreateAiTaskMutationBody = BodyType<CreateAiTaskBody>;
export type CreateAiTaskMutationError = ErrorType<unknown>;
/**
 * @summary Create and log AI task
 */
export declare const useCreateAiTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAiTask>>, TError, {
        gymId: number;
        data: BodyType<CreateAiTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAiTask>>, TError, {
    gymId: number;
    data: BodyType<CreateAiTaskBody>;
}, TContext>;
/**
 * @summary Scan gym data and generate AI tasks for at-risk members, stale leads, new members, and failed payments
 */
export declare const getGenerateAiTasksUrl: (gymId: number) => string;
export declare const generateAiTasks: (gymId: number, options?: RequestInit) => Promise<GenerateAiTasksResponse>;
export declare const getGenerateAiTasksMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAiTasks>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateAiTasks>>, TError, {
    gymId: number;
}, TContext>;
export type GenerateAiTasksMutationResult = NonNullable<Awaited<ReturnType<typeof generateAiTasks>>>;
export type GenerateAiTasksMutationError = ErrorType<unknown>;
/**
 * @summary Scan gym data and generate AI tasks for at-risk members, stale leads, new members, and failed payments
 */
export declare const useGenerateAiTasks: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAiTasks>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateAiTasks>>, TError, {
    gymId: number;
}, TContext>;
/**
 * @summary Update AI task status or content
 */
export declare const getUpdateAiTaskUrl: (gymId: number, taskId: number) => string;
export declare const updateAiTask: (gymId: number, taskId: number, updateAiTaskBody: UpdateAiTaskBody, options?: RequestInit) => Promise<AiTask>;
export declare const getUpdateAiTaskMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAiTask>>, TError, {
        gymId: number;
        taskId: number;
        data: BodyType<UpdateAiTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAiTask>>, TError, {
    gymId: number;
    taskId: number;
    data: BodyType<UpdateAiTaskBody>;
}, TContext>;
export type UpdateAiTaskMutationResult = NonNullable<Awaited<ReturnType<typeof updateAiTask>>>;
export type UpdateAiTaskMutationBody = BodyType<UpdateAiTaskBody>;
export type UpdateAiTaskMutationError = ErrorType<unknown>;
/**
 * @summary Update AI task status or content
 */
export declare const useUpdateAiTask: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAiTask>>, TError, {
        gymId: number;
        taskId: number;
        data: BodyType<UpdateAiTaskBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAiTask>>, TError, {
    gymId: number;
    taskId: number;
    data: BodyType<UpdateAiTaskBody>;
}, TContext>;
/**
 * @summary Send the AI task content as an email to the target member or lead
 */
export declare const getSendAiTaskEmailUrl: (gymId: number, taskId: number) => string;
export declare const sendAiTaskEmail: (gymId: number, taskId: number, options?: RequestInit) => Promise<SendEmailResponse>;
export declare const getSendAiTaskEmailMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendAiTaskEmail>>, TError, {
        gymId: number;
        taskId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendAiTaskEmail>>, TError, {
    gymId: number;
    taskId: number;
}, TContext>;
export type SendAiTaskEmailMutationResult = NonNullable<Awaited<ReturnType<typeof sendAiTaskEmail>>>;
export type SendAiTaskEmailMutationError = ErrorType<unknown>;
/**
 * @summary Send the AI task content as an email to the target member or lead
 */
export declare const useSendAiTaskEmail: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendAiTaskEmail>>, TError, {
        gymId: number;
        taskId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendAiTaskEmail>>, TError, {
    gymId: number;
    taskId: number;
}, TContext>;
/**
 * @summary Send the AI task content as a text message to the target member or lead
 */
export declare const getSendAiTaskSmsUrl: (gymId: number, taskId: number) => string;
export declare const sendAiTaskSms: (gymId: number, taskId: number, options?: RequestInit) => Promise<SendSmsResponse>;
export declare const getSendAiTaskSmsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendAiTaskSms>>, TError, {
        gymId: number;
        taskId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendAiTaskSms>>, TError, {
    gymId: number;
    taskId: number;
}, TContext>;
export type SendAiTaskSmsMutationResult = NonNullable<Awaited<ReturnType<typeof sendAiTaskSms>>>;
export type SendAiTaskSmsMutationError = ErrorType<unknown>;
/**
 * @summary Send the AI task content as a text message to the target member or lead
 */
export declare const useSendAiTaskSms: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendAiTaskSms>>, TError, {
        gymId: number;
        taskId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendAiTaskSms>>, TError, {
    gymId: number;
    taskId: number;
}, TContext>;
/**
 * @summary Send a test SMS to verify Twilio configuration
 */
export declare const getSendTestSmsUrl: (gymId: number) => string;
export declare const sendTestSms: (gymId: number, sendTestSmsBody: SendTestSmsBody, options?: RequestInit) => Promise<SendSmsResponse>;
export declare const getSendTestSmsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendTestSms>>, TError, {
        gymId: number;
        data: BodyType<SendTestSmsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendTestSms>>, TError, {
    gymId: number;
    data: BodyType<SendTestSmsBody>;
}, TContext>;
export type SendTestSmsMutationResult = NonNullable<Awaited<ReturnType<typeof sendTestSms>>>;
export type SendTestSmsMutationBody = BodyType<SendTestSmsBody>;
export type SendTestSmsMutationError = ErrorType<unknown>;
/**
 * @summary Send a test SMS to verify Twilio configuration
 */
export declare const useSendTestSms: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendTestSms>>, TError, {
        gymId: number;
        data: BodyType<SendTestSmsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendTestSms>>, TError, {
    gymId: number;
    data: BodyType<SendTestSmsBody>;
}, TContext>;
/**
 * @summary Check if SMS sending is configured for this gym
 */
export declare const getGetSmsStatusUrl: (gymId: number) => string;
export declare const getSmsStatus: (gymId: number, options?: RequestInit) => Promise<SmsStatusResponse>;
export declare const getGetSmsStatusQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/sms/status`];
export declare const getGetSmsStatusQueryOptions: <TData = Awaited<ReturnType<typeof getSmsStatus>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSmsStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSmsStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSmsStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getSmsStatus>>>;
export type GetSmsStatusQueryError = ErrorType<unknown>;
/**
 * @summary Check if SMS sending is configured for this gym
 */
export declare function useGetSmsStatus<TData = Awaited<ReturnType<typeof getSmsStatus>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSmsStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get AI Operator outcome tracking and revenue attribution stats
 */
export declare const getGetAiImpactUrl: (gymId: number, params?: GetAiImpactParams) => string;
export declare const getAiImpact: (gymId: number, params?: GetAiImpactParams, options?: RequestInit) => Promise<AiImpactResponse>;
export declare const getGetAiImpactQueryKey: (gymId: number, params?: GetAiImpactParams) => readonly [`/api/gyms/${number}/ai/impact`, ...GetAiImpactParams[]];
export declare const getGetAiImpactQueryOptions: <TData = Awaited<ReturnType<typeof getAiImpact>>, TError = ErrorType<unknown>>(gymId: number, params?: GetAiImpactParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiImpact>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAiImpact>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAiImpactQueryResult = NonNullable<Awaited<ReturnType<typeof getAiImpact>>>;
export type GetAiImpactQueryError = ErrorType<unknown>;
/**
 * @summary Get AI Operator outcome tracking and revenue attribution stats
 */
export declare function useGetAiImpact<TData = Awaited<ReturnType<typeof getAiImpact>>, TError = ErrorType<unknown>>(gymId: number, params?: GetAiImpactParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiImpact>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get the timestamp of the last automated AI task scan
 */
export declare const getGetAiLastScanUrl: (gymId: number) => string;
export declare const getAiLastScan: (gymId: number, options?: RequestInit) => Promise<AiLastScanResponse>;
export declare const getGetAiLastScanQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/ai/last-scan`];
export declare const getGetAiLastScanQueryOptions: <TData = Awaited<ReturnType<typeof getAiLastScan>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiLastScan>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAiLastScan>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAiLastScanQueryResult = NonNullable<Awaited<ReturnType<typeof getAiLastScan>>>;
export type GetAiLastScanQueryError = ErrorType<unknown>;
/**
 * @summary Get the timestamp of the last automated AI task scan
 */
export declare function useGetAiLastScan<TData = Awaited<ReturnType<typeof getAiLastScan>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiLastScan>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get auto-pilot settings for a gym
 */
export declare const getGetAutopilotSettingsUrl: (gymId: number) => string;
export declare const getAutopilotSettings: (gymId: number, options?: RequestInit) => Promise<AutopilotSettings>;
export declare const getGetAutopilotSettingsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/ai/autopilot-settings`];
export declare const getGetAutopilotSettingsQueryOptions: <TData = Awaited<ReturnType<typeof getAutopilotSettings>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAutopilotSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAutopilotSettings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAutopilotSettingsQueryResult = NonNullable<Awaited<ReturnType<typeof getAutopilotSettings>>>;
export type GetAutopilotSettingsQueryError = ErrorType<unknown>;
/**
 * @summary Get auto-pilot settings for a gym
 */
export declare function useGetAutopilotSettings<TData = Awaited<ReturnType<typeof getAutopilotSettings>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAutopilotSettings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update auto-pilot settings for a gym
 */
export declare const getUpdateAutopilotSettingsUrl: (gymId: number) => string;
export declare const updateAutopilotSettings: (gymId: number, updateAutopilotSettingsBody: UpdateAutopilotSettingsBody, options?: RequestInit) => Promise<AutopilotSettings>;
export declare const getUpdateAutopilotSettingsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAutopilotSettings>>, TError, {
        gymId: number;
        data: BodyType<UpdateAutopilotSettingsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAutopilotSettings>>, TError, {
    gymId: number;
    data: BodyType<UpdateAutopilotSettingsBody>;
}, TContext>;
export type UpdateAutopilotSettingsMutationResult = NonNullable<Awaited<ReturnType<typeof updateAutopilotSettings>>>;
export type UpdateAutopilotSettingsMutationBody = BodyType<UpdateAutopilotSettingsBody>;
export type UpdateAutopilotSettingsMutationError = ErrorType<unknown>;
/**
 * @summary Update auto-pilot settings for a gym
 */
export declare const useUpdateAutopilotSettings: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAutopilotSettings>>, TError, {
        gymId: number;
        data: BodyType<UpdateAutopilotSettingsBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAutopilotSettings>>, TError, {
    gymId: number;
    data: BodyType<UpdateAutopilotSettingsBody>;
}, TContext>;
/**
 * @summary Check if email sending is configured
 */
export declare const getGetAiEmailStatusUrl: (gymId: number) => string;
export declare const getAiEmailStatus: (gymId: number, options?: RequestInit) => Promise<EmailStatusResponse>;
export declare const getGetAiEmailStatusQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/ai/email-status`];
export declare const getGetAiEmailStatusQueryOptions: <TData = Awaited<ReturnType<typeof getAiEmailStatus>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiEmailStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAiEmailStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAiEmailStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getAiEmailStatus>>>;
export type GetAiEmailStatusQueryError = ErrorType<unknown>;
/**
 * @summary Check if email sending is configured
 */
export declare function useGetAiEmailStatus<TData = Awaited<ReturnType<typeof getAiEmailStatus>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAiEmailStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get owner dashboard key metrics
 */
export declare const getGetDashboardStatsUrl: (gymId: number) => string;
export declare const getDashboardStats: (gymId: number, options?: RequestInit) => Promise<DashboardStats>;
export declare const getGetDashboardStatsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/reports/dashboard`];
export declare const getGetDashboardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>;
export type GetDashboardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get owner dashboard key metrics
 */
export declare function useGetDashboardStats<TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get membership summary report
 */
export declare const getGetMembershipReportUrl: (gymId: number) => string;
export declare const getMembershipReport: (gymId: number, options?: RequestInit) => Promise<MembershipReport>;
export declare const getGetMembershipReportQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/reports/membership`];
export declare const getGetMembershipReportQueryOptions: <TData = Awaited<ReturnType<typeof getMembershipReport>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMembershipReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMembershipReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMembershipReportQueryResult = NonNullable<Awaited<ReturnType<typeof getMembershipReport>>>;
export type GetMembershipReportQueryError = ErrorType<unknown>;
/**
 * @summary Get membership summary report
 */
export declare function useGetMembershipReport<TData = Awaited<ReturnType<typeof getMembershipReport>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMembershipReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get revenue summary report
 */
export declare const getGetRevenueReportUrl: (gymId: number) => string;
export declare const getRevenueReport: (gymId: number, options?: RequestInit) => Promise<RevenueReport>;
export declare const getGetRevenueReportQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/reports/revenue`];
export declare const getGetRevenueReportQueryOptions: <TData = Awaited<ReturnType<typeof getRevenueReport>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRevenueReportQueryResult = NonNullable<Awaited<ReturnType<typeof getRevenueReport>>>;
export type GetRevenueReportQueryError = ErrorType<unknown>;
/**
 * @summary Get revenue summary report
 */
export declare function useGetRevenueReport<TData = Awaited<ReturnType<typeof getRevenueReport>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRevenueReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get attendance trends report
 */
export declare const getGetAttendanceReportUrl: (gymId: number) => string;
export declare const getAttendanceReport: (gymId: number, options?: RequestInit) => Promise<AttendanceReport>;
export declare const getGetAttendanceReportQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/reports/attendance`];
export declare const getGetAttendanceReportQueryOptions: <TData = Awaited<ReturnType<typeof getAttendanceReport>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAttendanceReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAttendanceReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAttendanceReportQueryResult = NonNullable<Awaited<ReturnType<typeof getAttendanceReport>>>;
export type GetAttendanceReportQueryError = ErrorType<unknown>;
/**
 * @summary Get attendance trends report
 */
export declare function useGetAttendanceReport<TData = Awaited<ReturnType<typeof getAttendanceReport>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAttendanceReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List gym documents and waivers
 */
export declare const getListDocumentsUrl: (gymId: number) => string;
export declare const listDocuments: (gymId: number, options?: RequestInit) => Promise<GymDocument[]>;
export declare const getListDocumentsQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/documents`];
export declare const getListDocumentsQueryOptions: <TData = Awaited<ReturnType<typeof listDocuments>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDocuments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDocuments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDocumentsQueryResult = NonNullable<Awaited<ReturnType<typeof listDocuments>>>;
export type ListDocumentsQueryError = ErrorType<unknown>;
/**
 * @summary List gym documents and waivers
 */
export declare function useListDocuments<TData = Awaited<ReturnType<typeof listDocuments>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDocuments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create document or waiver
 */
export declare const getCreateDocumentUrl: (gymId: number) => string;
export declare const createDocument: (gymId: number, createDocumentBody: CreateDocumentBody, options?: RequestInit) => Promise<GymDocument>;
export declare const getCreateDocumentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDocument>>, TError, {
        gymId: number;
        data: BodyType<CreateDocumentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createDocument>>, TError, {
    gymId: number;
    data: BodyType<CreateDocumentBody>;
}, TContext>;
export type CreateDocumentMutationResult = NonNullable<Awaited<ReturnType<typeof createDocument>>>;
export type CreateDocumentMutationBody = BodyType<CreateDocumentBody>;
export type CreateDocumentMutationError = ErrorType<unknown>;
/**
 * @summary Create document or waiver
 */
export declare const useCreateDocument: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDocument>>, TError, {
        gymId: number;
        data: BodyType<CreateDocumentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createDocument>>, TError, {
    gymId: number;
    data: BodyType<CreateDocumentBody>;
}, TContext>;
/**
 * @summary Change subscription plan (upgrade/downgrade)
 */
export declare const getChangePlanUrl: (gymId: number, subscriptionId: number) => string;
export declare const changePlan: (gymId: number, subscriptionId: number, changePlanBody: ChangePlanBody, options?: RequestInit) => Promise<ChangePlanResponse>;
export declare const getChangePlanMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof changePlan>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<ChangePlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof changePlan>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<ChangePlanBody>;
}, TContext>;
export type ChangePlanMutationResult = NonNullable<Awaited<ReturnType<typeof changePlan>>>;
export type ChangePlanMutationBody = BodyType<ChangePlanBody>;
export type ChangePlanMutationError = ErrorType<unknown>;
/**
 * @summary Change subscription plan (upgrade/downgrade)
 */
export declare const useChangePlan: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof changePlan>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<ChangePlanBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof changePlan>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<ChangePlanBody>;
}, TContext>;
/**
 * @summary Preview plan change proration
 */
export declare const getPreviewPlanChangeUrl: (gymId: number, subscriptionId: number) => string;
export declare const previewPlanChange: (gymId: number, subscriptionId: number, previewPlanChangeBody: PreviewPlanChangeBody, options?: RequestInit) => Promise<PlanChangePreview>;
export declare const getPreviewPlanChangeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewPlanChange>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<PreviewPlanChangeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof previewPlanChange>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<PreviewPlanChangeBody>;
}, TContext>;
export type PreviewPlanChangeMutationResult = NonNullable<Awaited<ReturnType<typeof previewPlanChange>>>;
export type PreviewPlanChangeMutationBody = BodyType<PreviewPlanChangeBody>;
export type PreviewPlanChangeMutationError = ErrorType<unknown>;
/**
 * @summary Preview plan change proration
 */
export declare const usePreviewPlanChange: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof previewPlanChange>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<PreviewPlanChangeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof previewPlanChange>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<PreviewPlanChangeBody>;
}, TContext>;
/**
 * @summary Get member Stripe invoices with PDF/URL links
 */
export declare const getGetMemberStripeInvoicesUrl: (gymId: number, memberId: number) => string;
export declare const getMemberStripeInvoices: (gymId: number, memberId: number, options?: RequestInit) => Promise<StripeInvoice[]>;
export declare const getGetMemberStripeInvoicesQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/stripe-invoices`];
export declare const getGetMemberStripeInvoicesQueryOptions: <TData = Awaited<ReturnType<typeof getMemberStripeInvoices>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberStripeInvoices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberStripeInvoices>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberStripeInvoicesQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberStripeInvoices>>>;
export type GetMemberStripeInvoicesQueryError = ErrorType<unknown>;
/**
 * @summary Get member Stripe invoices with PDF/URL links
 */
export declare function useGetMemberStripeInvoices<TData = Awaited<ReturnType<typeof getMemberStripeInvoices>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberStripeInvoices>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List discount codes for gym
 */
export declare const getListDiscountCodesUrl: (gymId: number) => string;
export declare const listDiscountCodes: (gymId: number, options?: RequestInit) => Promise<DiscountCode[]>;
export declare const getListDiscountCodesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/discount-codes`];
export declare const getListDiscountCodesQueryOptions: <TData = Awaited<ReturnType<typeof listDiscountCodes>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDiscountCodes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDiscountCodes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDiscountCodesQueryResult = NonNullable<Awaited<ReturnType<typeof listDiscountCodes>>>;
export type ListDiscountCodesQueryError = ErrorType<unknown>;
/**
 * @summary List discount codes for gym
 */
export declare function useListDiscountCodes<TData = Awaited<ReturnType<typeof listDiscountCodes>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDiscountCodes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a discount code
 */
export declare const getCreateDiscountCodeUrl: (gymId: number) => string;
export declare const createDiscountCode: (gymId: number, createDiscountCodeBody: CreateDiscountCodeBody, options?: RequestInit) => Promise<DiscountCode>;
export declare const getCreateDiscountCodeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDiscountCode>>, TError, {
        gymId: number;
        data: BodyType<CreateDiscountCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createDiscountCode>>, TError, {
    gymId: number;
    data: BodyType<CreateDiscountCodeBody>;
}, TContext>;
export type CreateDiscountCodeMutationResult = NonNullable<Awaited<ReturnType<typeof createDiscountCode>>>;
export type CreateDiscountCodeMutationBody = BodyType<CreateDiscountCodeBody>;
export type CreateDiscountCodeMutationError = ErrorType<unknown>;
/**
 * @summary Create a discount code
 */
export declare const useCreateDiscountCode: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createDiscountCode>>, TError, {
        gymId: number;
        data: BodyType<CreateDiscountCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createDiscountCode>>, TError, {
    gymId: number;
    data: BodyType<CreateDiscountCodeBody>;
}, TContext>;
/**
 * @summary Activate/deactivate a discount code
 */
export declare const getUpdateDiscountCodeUrl: (gymId: number, id: number) => string;
export declare const updateDiscountCode: (gymId: number, id: number, updateDiscountCodeBody: UpdateDiscountCodeBody, options?: RequestInit) => Promise<DiscountCode>;
export declare const getUpdateDiscountCodeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDiscountCode>>, TError, {
        gymId: number;
        id: number;
        data: BodyType<UpdateDiscountCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateDiscountCode>>, TError, {
    gymId: number;
    id: number;
    data: BodyType<UpdateDiscountCodeBody>;
}, TContext>;
export type UpdateDiscountCodeMutationResult = NonNullable<Awaited<ReturnType<typeof updateDiscountCode>>>;
export type UpdateDiscountCodeMutationBody = BodyType<UpdateDiscountCodeBody>;
export type UpdateDiscountCodeMutationError = ErrorType<unknown>;
/**
 * @summary Activate/deactivate a discount code
 */
export declare const useUpdateDiscountCode: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateDiscountCode>>, TError, {
        gymId: number;
        id: number;
        data: BodyType<UpdateDiscountCodeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateDiscountCode>>, TError, {
    gymId: number;
    id: number;
    data: BodyType<UpdateDiscountCodeBody>;
}, TContext>;
/**
 * @summary Apply discount code to subscription
 */
export declare const getApplyDiscountToSubscriptionUrl: (gymId: number, subscriptionId: number) => string;
export declare const applyDiscountToSubscription: (gymId: number, subscriptionId: number, applyDiscountToSubscriptionBody: ApplyDiscountToSubscriptionBody, options?: RequestInit) => Promise<ApplyDiscountToSubscription200>;
export declare const getApplyDiscountToSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyDiscountToSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<ApplyDiscountToSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof applyDiscountToSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<ApplyDiscountToSubscriptionBody>;
}, TContext>;
export type ApplyDiscountToSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof applyDiscountToSubscription>>>;
export type ApplyDiscountToSubscriptionMutationBody = BodyType<ApplyDiscountToSubscriptionBody>;
export type ApplyDiscountToSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Apply discount code to subscription
 */
export declare const useApplyDiscountToSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof applyDiscountToSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
        data: BodyType<ApplyDiscountToSubscriptionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof applyDiscountToSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
    data: BodyType<ApplyDiscountToSubscriptionBody>;
}, TContext>;
/**
 * @summary Remove discount from subscription
 */
export declare const getRemoveDiscountFromSubscriptionUrl: (gymId: number, subscriptionId: number) => string;
export declare const removeDiscountFromSubscription: (gymId: number, subscriptionId: number, options?: RequestInit) => Promise<RemoveDiscountFromSubscription200>;
export declare const getRemoveDiscountFromSubscriptionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeDiscountFromSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof removeDiscountFromSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
}, TContext>;
export type RemoveDiscountFromSubscriptionMutationResult = NonNullable<Awaited<ReturnType<typeof removeDiscountFromSubscription>>>;
export type RemoveDiscountFromSubscriptionMutationError = ErrorType<unknown>;
/**
 * @summary Remove discount from subscription
 */
export declare const useRemoveDiscountFromSubscription: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeDiscountFromSubscription>>, TError, {
        gymId: number;
        subscriptionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof removeDiscountFromSubscription>>, TError, {
    gymId: number;
    subscriptionId: number;
}, TContext>;
/**
 * @summary Get member account credit balance
 */
export declare const getGetMemberBalanceUrl: (gymId: number, memberId: number) => string;
export declare const getMemberBalance: (gymId: number, memberId: number, options?: RequestInit) => Promise<GetMemberBalance200>;
export declare const getGetMemberBalanceQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/balance`];
export declare const getGetMemberBalanceQueryOptions: <TData = Awaited<ReturnType<typeof getMemberBalance>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberBalance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMemberBalance>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMemberBalanceQueryResult = NonNullable<Awaited<ReturnType<typeof getMemberBalance>>>;
export type GetMemberBalanceQueryError = ErrorType<unknown>;
/**
 * @summary Get member account credit balance
 */
export declare function useGetMemberBalance<TData = Awaited<ReturnType<typeof getMemberBalance>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMemberBalance>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add or remove account credit
 */
export declare const getAdjustMemberBalanceUrl: (gymId: number, memberId: number) => string;
export declare const adjustMemberBalance: (gymId: number, memberId: number, adjustBalanceBody: AdjustBalanceBody, options?: RequestInit) => Promise<AdjustMemberBalance200>;
export declare const getAdjustMemberBalanceMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adjustMemberBalance>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<AdjustBalanceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof adjustMemberBalance>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<AdjustBalanceBody>;
}, TContext>;
export type AdjustMemberBalanceMutationResult = NonNullable<Awaited<ReturnType<typeof adjustMemberBalance>>>;
export type AdjustMemberBalanceMutationBody = BodyType<AdjustBalanceBody>;
export type AdjustMemberBalanceMutationError = ErrorType<unknown>;
/**
 * @summary Add or remove account credit
 */
export declare const useAdjustMemberBalance: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof adjustMemberBalance>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<AdjustBalanceBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof adjustMemberBalance>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<AdjustBalanceBody>;
}, TContext>;
/**
 * @summary Get gym tax configuration
 */
export declare const getGetTaxConfigUrl: (gymId: number) => string;
export declare const getTaxConfig: (gymId: number, options?: RequestInit) => Promise<TaxConfig>;
export declare const getGetTaxConfigQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/tax-config`];
export declare const getGetTaxConfigQueryOptions: <TData = Awaited<ReturnType<typeof getTaxConfig>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTaxConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTaxConfig>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTaxConfigQueryResult = NonNullable<Awaited<ReturnType<typeof getTaxConfig>>>;
export type GetTaxConfigQueryError = ErrorType<unknown>;
/**
 * @summary Get gym tax configuration
 */
export declare function useGetTaxConfig<TData = Awaited<ReturnType<typeof getTaxConfig>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTaxConfig>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create or update tax rate
 */
export declare const getUpdateTaxConfigUrl: (gymId: number) => string;
export declare const updateTaxConfig: (gymId: number, updateTaxConfigBody: UpdateTaxConfigBody, options?: RequestInit) => Promise<UpdateTaxConfig200>;
export declare const getUpdateTaxConfigMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaxConfig>>, TError, {
        gymId: number;
        data: BodyType<UpdateTaxConfigBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateTaxConfig>>, TError, {
    gymId: number;
    data: BodyType<UpdateTaxConfigBody>;
}, TContext>;
export type UpdateTaxConfigMutationResult = NonNullable<Awaited<ReturnType<typeof updateTaxConfig>>>;
export type UpdateTaxConfigMutationBody = BodyType<UpdateTaxConfigBody>;
export type UpdateTaxConfigMutationError = ErrorType<unknown>;
/**
 * @summary Create or update tax rate
 */
export declare const useUpdateTaxConfig: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateTaxConfig>>, TError, {
        gymId: number;
        data: BodyType<UpdateTaxConfigBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateTaxConfig>>, TError, {
    gymId: number;
    data: BodyType<UpdateTaxConfigBody>;
}, TContext>;
/**
 * @summary Disable tax collection
 */
export declare const getDisableTaxUrl: (gymId: number) => string;
export declare const disableTax: (gymId: number, options?: RequestInit) => Promise<DisableTax200>;
export declare const getDisableTaxMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof disableTax>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof disableTax>>, TError, {
    gymId: number;
}, TContext>;
export type DisableTaxMutationResult = NonNullable<Awaited<ReturnType<typeof disableTax>>>;
export type DisableTaxMutationError = ErrorType<unknown>;
/**
 * @summary Disable tax collection
 */
export declare const useDisableTax: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof disableTax>>, TError, {
        gymId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof disableTax>>, TError, {
    gymId: number;
}, TContext>;
/**
 * @summary List holds for a member
 */
export declare const getListMemberHoldsUrl: (gymId: number, memberId: number) => string;
export declare const listMemberHolds: (gymId: number, memberId: number, options?: RequestInit) => Promise<ScheduledHold[]>;
export declare const getListMemberHoldsQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/holds`];
export declare const getListMemberHoldsQueryOptions: <TData = Awaited<ReturnType<typeof listMemberHolds>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMemberHolds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMemberHolds>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMemberHoldsQueryResult = NonNullable<Awaited<ReturnType<typeof listMemberHolds>>>;
export type ListMemberHoldsQueryError = ErrorType<unknown>;
/**
 * @summary List holds for a member
 */
export declare function useListMemberHolds<TData = Awaited<ReturnType<typeof listMemberHolds>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMemberHolds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Schedule a hold on a member subscription
 */
export declare const getCreateHoldUrl: (gymId: number, memberId: number) => string;
export declare const createHold: (gymId: number, memberId: number, createHoldBody: CreateHoldBody, options?: RequestInit) => Promise<ScheduledHold>;
export declare const getCreateHoldMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createHold>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateHoldBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createHold>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateHoldBody>;
}, TContext>;
export type CreateHoldMutationResult = NonNullable<Awaited<ReturnType<typeof createHold>>>;
export type CreateHoldMutationBody = BodyType<CreateHoldBody>;
export type CreateHoldMutationError = ErrorType<unknown>;
/**
 * @summary Schedule a hold on a member subscription
 */
export declare const useCreateHold: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createHold>>, TError, {
        gymId: number;
        memberId: number;
        data: BodyType<CreateHoldBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createHold>>, TError, {
    gymId: number;
    memberId: number;
    data: BodyType<CreateHoldBody>;
}, TContext>;
/**
 * @summary Update a hold
 */
export declare const getUpdateHoldUrl: (gymId: number, holdId: number) => string;
export declare const updateHold: (gymId: number, holdId: number, updateHoldBody: UpdateHoldBody, options?: RequestInit) => Promise<ScheduledHold>;
export declare const getUpdateHoldMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateHold>>, TError, {
        gymId: number;
        holdId: number;
        data: BodyType<UpdateHoldBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateHold>>, TError, {
    gymId: number;
    holdId: number;
    data: BodyType<UpdateHoldBody>;
}, TContext>;
export type UpdateHoldMutationResult = NonNullable<Awaited<ReturnType<typeof updateHold>>>;
export type UpdateHoldMutationBody = BodyType<UpdateHoldBody>;
export type UpdateHoldMutationError = ErrorType<unknown>;
/**
 * @summary Update a hold
 */
export declare const useUpdateHold: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateHold>>, TError, {
        gymId: number;
        holdId: number;
        data: BodyType<UpdateHoldBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateHold>>, TError, {
    gymId: number;
    holdId: number;
    data: BodyType<UpdateHoldBody>;
}, TContext>;
/**
 * @summary Cancel a hold
 */
export declare const getCancelHoldUrl: (gymId: number, holdId: number) => string;
export declare const cancelHold: (gymId: number, holdId: number, options?: RequestInit) => Promise<ScheduledHold>;
export declare const getCancelHoldMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelHold>>, TError, {
        gymId: number;
        holdId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof cancelHold>>, TError, {
    gymId: number;
    holdId: number;
}, TContext>;
export type CancelHoldMutationResult = NonNullable<Awaited<ReturnType<typeof cancelHold>>>;
export type CancelHoldMutationError = ErrorType<unknown>;
/**
 * @summary Cancel a hold
 */
export declare const useCancelHold: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof cancelHold>>, TError, {
        gymId: number;
        holdId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof cancelHold>>, TError, {
    gymId: number;
    holdId: number;
}, TContext>;
/**
 * @summary Check if member can check in (holds + past-due enforcement)
 */
export declare const getGetCheckinStatusUrl: (gymId: number, memberId: number) => string;
export declare const getCheckinStatus: (gymId: number, memberId: number, options?: RequestInit) => Promise<CheckinStatus>;
export declare const getGetCheckinStatusQueryKey: (gymId: number, memberId: number) => readonly [`/api/gyms/${number}/members/${number}/checkin-status`];
export declare const getGetCheckinStatusQueryOptions: <TData = Awaited<ReturnType<typeof getCheckinStatus>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCheckinStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCheckinStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCheckinStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getCheckinStatus>>>;
export type GetCheckinStatusQueryError = ErrorType<unknown>;
/**
 * @summary Check if member can check in (holds + past-due enforcement)
 */
export declare function useGetCheckinStatus<TData = Awaited<ReturnType<typeof getCheckinStatus>>, TError = ErrorType<unknown>>(gymId: number, memberId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCheckinStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List appointment types for a gym
 */
export declare const getListAppointmentTypesUrl: (gymId: number) => string;
export declare const listAppointmentTypes: (gymId: number, options?: RequestInit) => Promise<AppointmentType[]>;
export declare const getListAppointmentTypesQueryKey: (gymId: number) => readonly [`/api/gyms/${number}/appointment-types`];
export declare const getListAppointmentTypesQueryOptions: <TData = Awaited<ReturnType<typeof listAppointmentTypes>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAppointmentTypes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAppointmentTypes>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAppointmentTypesQueryResult = NonNullable<Awaited<ReturnType<typeof listAppointmentTypes>>>;
export type ListAppointmentTypesQueryError = ErrorType<unknown>;
/**
 * @summary List appointment types for a gym
 */
export declare function useListAppointmentTypes<TData = Awaited<ReturnType<typeof listAppointmentTypes>>, TError = ErrorType<unknown>>(gymId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAppointmentTypes>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create an appointment type
 */
export declare const getCreateAppointmentTypeUrl: (gymId: number) => string;
export declare const createAppointmentType: (gymId: number, createAppointmentTypeBody: CreateAppointmentTypeBody, options?: RequestInit) => Promise<AppointmentType>;
export declare const getCreateAppointmentTypeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAppointmentType>>, TError, {
        gymId: number;
        data: BodyType<CreateAppointmentTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAppointmentType>>, TError, {
    gymId: number;
    data: BodyType<CreateAppointmentTypeBody>;
}, TContext>;
export type CreateAppointmentTypeMutationResult = NonNullable<Awaited<ReturnType<typeof createAppointmentType>>>;
export type CreateAppointmentTypeMutationBody = BodyType<CreateAppointmentTypeBody>;
export type CreateAppointmentTypeMutationError = ErrorType<unknown>;
/**
 * @summary Create an appointment type
 */
export declare const useCreateAppointmentType: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAppointmentType>>, TError, {
        gymId: number;
        data: BodyType<CreateAppointmentTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAppointmentType>>, TError, {
    gymId: number;
    data: BodyType<CreateAppointmentTypeBody>;
}, TContext>;
/**
 * @summary Update an appointment type
 */
export declare const getUpdateAppointmentTypeUrl: (gymId: number, typeId: number) => string;
export declare const updateAppointmentType: (gymId: number, typeId: number, updateAppointmentTypeBody: UpdateAppointmentTypeBody, options?: RequestInit) => Promise<AppointmentType>;
export declare const getUpdateAppointmentTypeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAppointmentType>>, TError, {
        gymId: number;
        typeId: number;
        data: BodyType<UpdateAppointmentTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAppointmentType>>, TError, {
    gymId: number;
    typeId: number;
    data: BodyType<UpdateAppointmentTypeBody>;
}, TContext>;
export type UpdateAppointmentTypeMutationResult = NonNullable<Awaited<ReturnType<typeof updateAppointmentType>>>;
export type UpdateAppointmentTypeMutationBody = BodyType<UpdateAppointmentTypeBody>;
export type UpdateAppointmentTypeMutationError = ErrorType<unknown>;
/**
 * @summary Update an appointment type
 */
export declare const useUpdateAppointmentType: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAppointmentType>>, TError, {
        gymId: number;
        typeId: number;
        data: BodyType<UpdateAppointmentTypeBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAppointmentType>>, TError, {
    gymId: number;
    typeId: number;
    data: BodyType<UpdateAppointmentTypeBody>;
}, TContext>;
/**
 * @summary Delete an appointment type
 */
export declare const getDeleteAppointmentTypeUrl: (gymId: number, typeId: number) => string;
export declare const deleteAppointmentType: (gymId: number, typeId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAppointmentTypeMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAppointmentType>>, TError, {
        gymId: number;
        typeId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAppointmentType>>, TError, {
    gymId: number;
    typeId: number;
}, TContext>;
export type DeleteAppointmentTypeMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAppointmentType>>>;
export type DeleteAppointmentTypeMutationError = ErrorType<unknown>;
/**
 * @summary Delete an appointment type
 */
export declare const useDeleteAppointmentType: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAppointmentType>>, TError, {
        gymId: number;
        typeId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAppointmentType>>, TError, {
    gymId: number;
    typeId: number;
}, TContext>;
/**
 * @summary List coach availability slots
 */
export declare const getListCoachAvailabilityUrl: (gymId: number, params?: ListCoachAvailabilityParams) => string;
export declare const listCoachAvailability: (gymId: number, params?: ListCoachAvailabilityParams, options?: RequestInit) => Promise<CoachAvailabilitySlot[]>;
export declare const getListCoachAvailabilityQueryKey: (gymId: number, params?: ListCoachAvailabilityParams) => readonly [`/api/gyms/${number}/coach-availability`, ...ListCoachAvailabilityParams[]];
export declare const getListCoachAvailabilityQueryOptions: <TData = Awaited<ReturnType<typeof listCoachAvailability>>, TError = ErrorType<unknown>>(gymId: number, params?: ListCoachAvailabilityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCoachAvailability>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listCoachAvailability>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListCoachAvailabilityQueryResult = NonNullable<Awaited<ReturnType<typeof listCoachAvailability>>>;
export type ListCoachAvailabilityQueryError = ErrorType<unknown>;
/**
 * @summary List coach availability slots
 */
export declare function useListCoachAvailability<TData = Awaited<ReturnType<typeof listCoachAvailability>>, TError = ErrorType<unknown>>(gymId: number, params?: ListCoachAvailabilityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listCoachAvailability>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a coach availability slot
 */
export declare const getCreateCoachAvailabilityUrl: (gymId: number) => string;
export declare const createCoachAvailability: (gymId: number, createCoachAvailabilityBody: CreateCoachAvailabilityBody, options?: RequestInit) => Promise<CoachAvailabilitySlot>;
export declare const getCreateCoachAvailabilityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCoachAvailability>>, TError, {
        gymId: number;
        data: BodyType<CreateCoachAvailabilityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createCoachAvailability>>, TError, {
    gymId: number;
    data: BodyType<CreateCoachAvailabilityBody>;
}, TContext>;
export type CreateCoachAvailabilityMutationResult = NonNullable<Awaited<ReturnType<typeof createCoachAvailability>>>;
export type CreateCoachAvailabilityMutationBody = BodyType<CreateCoachAvailabilityBody>;
export type CreateCoachAvailabilityMutationError = ErrorType<unknown>;
/**
 * @summary Create a coach availability slot
 */
export declare const useCreateCoachAvailability: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createCoachAvailability>>, TError, {
        gymId: number;
        data: BodyType<CreateCoachAvailabilityBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createCoachAvailability>>, TError, {
    gymId: number;
    data: BodyType<CreateCoachAvailabilityBody>;
}, TContext>;
/**
 * @summary Delete a coach availability slot
 */
export declare const getDeleteCoachAvailabilityUrl: (gymId: number, slotId: number) => string;
export declare const deleteCoachAvailability: (gymId: number, slotId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteCoachAvailabilityMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCoachAvailability>>, TError, {
        gymId: number;
        slotId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteCoachAvailability>>, TError, {
    gymId: number;
    slotId: number;
}, TContext>;
export type DeleteCoachAvailabilityMutationResult = NonNullable<Awaited<ReturnType<typeof deleteCoachAvailability>>>;
export type DeleteCoachAvailabilityMutationError = ErrorType<unknown>;
/**
 * @summary Delete a coach availability slot
 */
export declare const useDeleteCoachAvailability: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteCoachAvailability>>, TError, {
        gymId: number;
        slotId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteCoachAvailability>>, TError, {
    gymId: number;
    slotId: number;
}, TContext>;
/**
 * @summary List appointments
 */
export declare const getListAppointmentsUrl: (gymId: number, params?: ListAppointmentsParams) => string;
export declare const listAppointments: (gymId: number, params?: ListAppointmentsParams, options?: RequestInit) => Promise<Appointment[]>;
export declare const getListAppointmentsQueryKey: (gymId: number, params?: ListAppointmentsParams) => readonly [`/api/gyms/${number}/appointments`, ...ListAppointmentsParams[]];
export declare const getListAppointmentsQueryOptions: <TData = Awaited<ReturnType<typeof listAppointments>>, TError = ErrorType<unknown>>(gymId: number, params?: ListAppointmentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAppointments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAppointments>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAppointmentsQueryResult = NonNullable<Awaited<ReturnType<typeof listAppointments>>>;
export type ListAppointmentsQueryError = ErrorType<unknown>;
/**
 * @summary List appointments
 */
export declare function useListAppointments<TData = Awaited<ReturnType<typeof listAppointments>>, TError = ErrorType<unknown>>(gymId: number, params?: ListAppointmentsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAppointments>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Book an appointment
 */
export declare const getCreateAppointmentUrl: (gymId: number) => string;
export declare const createAppointment: (gymId: number, createAppointmentBody: CreateAppointmentBody, options?: RequestInit) => Promise<Appointment>;
export declare const getCreateAppointmentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAppointment>>, TError, {
        gymId: number;
        data: BodyType<CreateAppointmentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAppointment>>, TError, {
    gymId: number;
    data: BodyType<CreateAppointmentBody>;
}, TContext>;
export type CreateAppointmentMutationResult = NonNullable<Awaited<ReturnType<typeof createAppointment>>>;
export type CreateAppointmentMutationBody = BodyType<CreateAppointmentBody>;
export type CreateAppointmentMutationError = ErrorType<unknown>;
/**
 * @summary Book an appointment
 */
export declare const useCreateAppointment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAppointment>>, TError, {
        gymId: number;
        data: BodyType<CreateAppointmentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAppointment>>, TError, {
    gymId: number;
    data: BodyType<CreateAppointmentBody>;
}, TContext>;
/**
 * @summary Get appointment details
 */
export declare const getGetAppointmentUrl: (gymId: number, appointmentId: number) => string;
export declare const getAppointment: (gymId: number, appointmentId: number, options?: RequestInit) => Promise<Appointment>;
export declare const getGetAppointmentQueryKey: (gymId: number, appointmentId: number) => readonly [`/api/gyms/${number}/appointments/${number}`];
export declare const getGetAppointmentQueryOptions: <TData = Awaited<ReturnType<typeof getAppointment>>, TError = ErrorType<unknown>>(gymId: number, appointmentId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAppointment>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAppointment>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAppointmentQueryResult = NonNullable<Awaited<ReturnType<typeof getAppointment>>>;
export type GetAppointmentQueryError = ErrorType<unknown>;
/**
 * @summary Get appointment details
 */
export declare function useGetAppointment<TData = Awaited<ReturnType<typeof getAppointment>>, TError = ErrorType<unknown>>(gymId: number, appointmentId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAppointment>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update an appointment
 */
export declare const getUpdateAppointmentUrl: (gymId: number, appointmentId: number) => string;
export declare const updateAppointment: (gymId: number, appointmentId: number, updateAppointmentBody: UpdateAppointmentBody, options?: RequestInit) => Promise<Appointment>;
export declare const getUpdateAppointmentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAppointment>>, TError, {
        gymId: number;
        appointmentId: number;
        data: BodyType<UpdateAppointmentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateAppointment>>, TError, {
    gymId: number;
    appointmentId: number;
    data: BodyType<UpdateAppointmentBody>;
}, TContext>;
export type UpdateAppointmentMutationResult = NonNullable<Awaited<ReturnType<typeof updateAppointment>>>;
export type UpdateAppointmentMutationBody = BodyType<UpdateAppointmentBody>;
export type UpdateAppointmentMutationError = ErrorType<unknown>;
/**
 * @summary Update an appointment
 */
export declare const useUpdateAppointment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateAppointment>>, TError, {
        gymId: number;
        appointmentId: number;
        data: BodyType<UpdateAppointmentBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateAppointment>>, TError, {
    gymId: number;
    appointmentId: number;
    data: BodyType<UpdateAppointmentBody>;
}, TContext>;
/**
 * @summary Delete an appointment
 */
export declare const getDeleteAppointmentUrl: (gymId: number, appointmentId: number) => string;
export declare const deleteAppointment: (gymId: number, appointmentId: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteAppointmentMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAppointment>>, TError, {
        gymId: number;
        appointmentId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteAppointment>>, TError, {
    gymId: number;
    appointmentId: number;
}, TContext>;
export type DeleteAppointmentMutationResult = NonNullable<Awaited<ReturnType<typeof deleteAppointment>>>;
export type DeleteAppointmentMutationError = ErrorType<unknown>;
/**
 * @summary Delete an appointment
 */
export declare const useDeleteAppointment: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteAppointment>>, TError, {
        gymId: number;
        appointmentId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteAppointment>>, TError, {
    gymId: number;
    appointmentId: number;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map