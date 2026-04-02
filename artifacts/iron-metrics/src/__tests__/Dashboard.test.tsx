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
  Zap: (props: any) => <span {...props}>Zap</span>,
  CheckCircle2: (props: any) => <span {...props}>CheckCircle2</span>,
  Mail: (props: any) => <span {...props}>Mail</span>,
  MessageSquare: (props: any) => <span {...props}>MessageSquare</span>,
  ArrowRight: (props: any) => <span {...props}>ArrowRight</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: (props: any) => <div data-testid="progress" data-value={props.value} />,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(" "),
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
  totalRevenue: 38000,
  revenueGrowth: 5.1,
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
    { month: "2026-01", revenue: 11000, members: 70 },
    { month: "2026-02", revenue: 12000, members: 78 },
    { month: "2026-03", revenue: 12750, members: 85 },
  ],
  attendanceByDay: [],
  memberStatusBreakdown: [
    { status: "active", count: 85 },
    { status: "hold", count: 5 },
    { status: "cancelled", count: 10 },
  ],
};

const MOCK_BRIEFING = {
  date: "2026-04-02",
  summary: "2 things need attention",
  items: [
    { priority: "critical", message: "Sarah Jenkins at risk of churning", icon: "alert", action: "View Member", link: "/members/1" },
    { priority: "warning", message: "3 stale leads need follow-up", icon: "leads", action: "Review Leads", link: "/leads" },
    { priority: "positive", message: "4 members hit 1-year milestone", icon: "positive", action: "Send Congrats", link: null },
  ],
  snapshot: {
    activeMembers: 85,
    mrr: 12750,
    atRiskMembers: 91,
    atRiskCritical: 74,
    failedPayments: 2,
    staleLeads: 3,
    newLeads: 5,
  },
};

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: false });
    mockUseGetMorningBriefing.mockReturnValue({ data: MOCK_BRIEFING, isLoading: false });
  });

  it("shows gym selection prompt when no gym is active", () => {
    mockUseGym.mockReturnValue({ activeGymId: null });
    mockUseGetDashboardStats.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGetMorningBriefing.mockReturnValue({ data: undefined, isLoading: false });
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

  it("renders MRR in the KPI sidebar", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Monthly Recurring Rev")).toBeInTheDocument();
    expect(screen.getByText("$12.8k")).toBeInTheDocument();
  });

  it("renders active members count", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders retention rate with progress bar", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Retention Rate")).toBeInTheDocument();
    expect(screen.getByText("58.4%")).toBeInTheDocument();
  });

  it("renders RSI score in sidebar", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("74.3")).toBeInTheDocument();
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("renders Revenue Trend chart", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Revenue Trend")).toBeInTheDocument();
  });

  it("renders Owner Console label", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Owner Console")).toBeInTheDocument();
  });

  it("renders Go to Billing button", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText(/Go to Billing/)).toBeInTheDocument();
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
    mockUseGetMorningBriefing.mockReturnValue({ data: undefined, isLoading: true });
    render(<Dashboard />);
    expect(mockUseGetDashboardStats).toHaveBeenCalledWith(42, expect.objectContaining({
      query: { enabled: true },
    }));
  });

  it("disables query when no active gym", () => {
    mockUseGym.mockReturnValue({ activeGymId: null });
    mockUseGetDashboardStats.mockReturnValue({ data: undefined, isLoading: false });
    mockUseGetMorningBriefing.mockReturnValue({ data: undefined, isLoading: false });
    render(<Dashboard />);
    expect(mockUseGetDashboardStats).toHaveBeenCalledWith(null, expect.objectContaining({
      query: { enabled: false },
    }));
  });

  it("renders action items from morning briefing", () => {
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockUseGetDashboardStats.mockReturnValue({ data: MOCK_STATS, isLoading: false });
    render(<Dashboard />);
    expect(screen.getByText("Handle Now")).toBeInTheDocument();
    expect(screen.getByText(/Sarah Jenkins at risk/)).toBeInTheDocument();
    expect(screen.getByText("Follow Up Today")).toBeInTheDocument();
    expect(screen.getByText(/3 stale leads/)).toBeInTheDocument();
    expect(screen.getByText("Good News")).toBeInTheDocument();
    expect(screen.getByText(/4 members hit 1-year/)).toBeInTheDocument();
  });
});
