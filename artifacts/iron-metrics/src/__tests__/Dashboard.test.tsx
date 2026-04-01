import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("wouter", () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
  useRoute: () => [false, {}],
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

vi.mock("lucide-react", () => ({
  Users: (props: any) => <span {...props}>Users</span>,
  TrendingUp: (props: any) => <span {...props}>TrendingUp</span>,
  AlertTriangle: (props: any) => <span {...props}>AlertTriangle</span>,
  CalendarCheck: (props: any) => <span {...props}>CalendarCheck</span>,
  ShieldCheck: (props: any) => <span {...props}>ShieldCheck</span>,
  ArrowUpRight: (props: any) => <span {...props}>Up</span>,
  ArrowDownRight: (props: any) => <span {...props}>Down</span>,
  Loader2: (props: any) => <span data-testid="loader" {...props}>Loading</span>,
  BrainCircuit: (props: any) => <span {...props}>Brain</span>,
  Rocket: (props: any) => <span {...props}>Rocket</span>,
  Sun: (props: any) => <span {...props}>Sun</span>,
  CreditCard: (props: any) => <span {...props}>CreditCard</span>,
  UserCheck: (props: any) => <span {...props}>UserCheck</span>,
  ChevronRight: (props: any) => <span {...props}>ChevronRight</span>,
  ChevronDown: (props: any) => <span {...props}>ChevronDown</span>,
  ChevronUp: (props: any) => <span {...props}>ChevronUp</span>,
  Sparkles: (props: any) => <span {...props}>Sparkles</span>,
  UserPlus: (props: any) => <span {...props}>UserPlus</span>,
  Clock: (props: any) => <span {...props}>Clock</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/dashboard/SyncHealthBanner", () => ({
  SyncHealthBanner: () => null,
}));

vi.mock("@/components/dashboard/AtRiskMembersCard", () => ({
  AtRiskMembersCard: () => <div data-testid="at-risk-card">AtRiskMembersCard</div>,
}));

vi.mock("@/components/dashboard/RetentionActivityCard", () => ({
  RetentionActivityCard: () => <div data-testid="retention-card">RetentionActivityCard</div>,
}));

const mockUseGym = vi.fn();
vi.mock("@/store/GymContext", () => ({
  useGym: () => mockUseGym(),
}));

const mockUseGetDashboardStats = vi.fn();
const mockUseGetMorningBriefing = vi.fn();
vi.mock("@workspace/api-client-react", () => ({
  useGetDashboardStats: (...args: any[]) => mockUseGetDashboardStats(...args),
  useGetMorningBriefing: (...args: any[]) => mockUseGetMorningBriefing(...args),
}));

import { Dashboard } from "../pages/Dashboard";

const MOCK_STATS = {
  activeMembers: 85,
  newMembersThisMonth: 12,
  churnedThisMonth: 3,
  mrr: 12750,
  mrrGrowth: 4.2,
  engagementRate: 72.5,
  engagementChange: 3.1,
  classesThisWeek: 24,
  openLeads: 8,
  atRiskMembers: 91,
  atRiskCritical: 74,
  atRiskHigh: 17,
  revenueAtRisk: 5906,
  retentionRate: 58.4,
  failedPayments: 2,
  collectionRate: 96.5,
  rsiScore: 74.3,
  rsiBand: "Strong",
  revenueByMonth: [
    { month: "2026-01", revenue: 11000 },
    { month: "2026-02", revenue: 12000 },
    { month: "2026-03", revenue: 12750 },
  ],
  attendanceByDay: [],
  memberStatusBreakdown: [
    { status: "active", count: 85 },
    { status: "hold", count: 5 },
    { status: "cancelled", count: 10 },
  ],
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: false });
    mockUseGetMorningBriefing.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("shows gym selection prompt when no gym is active", () => {
    mockUseGym.mockReturnValue({ activeGymId: null });
    mockUseGetDashboardStats.mockReturnValue({ data: undefined, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Select a gym to view your dashboard.")).toBeInTheDocument();
  });

  it("shows loading spinner when data is loading", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: undefined, isLoading: true });
    render(<Dashboard />);
    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("shows error state when stats is null", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: null, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Unable to load dashboard data.")).toBeInTheDocument();
  });

  it("renders KPI cards with correct data", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Active Members")).toBeInTheDocument();
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("Monthly Revenue")).toBeInTheDocument();
    expect(screen.getByText("$12.8k")).toBeInTheDocument();
    expect(screen.getByText("Engagement Rate")).toBeInTheDocument();
    expect(screen.getByText("72.5%")).toBeInTheDocument();
  });

  it("renders Retention KPI card instead of At Risk", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Retention")).toBeInTheDocument();
    expect(screen.getByText("58.4%")).toBeInTheDocument();
    expect(screen.queryByText("At Risk")).not.toBeInTheDocument();
  });

  it("renders RSI score badge", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("RSI: 74.3 (Strong)")).toBeInTheDocument();
  });

  it("renders MRR Trend chart container", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("MRR Trend")).toBeInTheDocument();
  });

  it("renders Owner Console heading", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Owner Console")).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Here's what needs your attention today.")).toBeInTheDocument();
  });

  it("renders AtRiskMembersCard and RetentionActivityCard", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByTestId("at-risk-card")).toBeInTheDocument();
    expect(screen.getByTestId("retention-card")).toBeInTheDocument();
  });

  it("calls useGetDashboardStats with correct gymId", () => {
    mockUseGym.mockReturnValue({ activeGymId: 42 });
    mockUseGetDashboardStats.mockReturnValue({ data: undefined, isLoading: true });
    render(<Dashboard />);
    expect(mockUseGetDashboardStats).toHaveBeenCalledWith(42, expect.objectContaining({
      query: { enabled: true },
    }));
  });

  it("disables query when no active gym", () => {
    mockUseGym.mockReturnValue({ activeGymId: null });
    mockUseGetDashboardStats.mockReturnValue({ data: undefined, isLoading: false });
    render(<Dashboard />);
    expect(mockUseGetDashboardStats).toHaveBeenCalledWith(null, expect.objectContaining({
      query: { enabled: false },
    }));
  });

  it("shows retention rate suffix text", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("of members healthy")).toBeInTheDocument();
  });
});
