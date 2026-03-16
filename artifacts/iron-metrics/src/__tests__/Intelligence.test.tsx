import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ cards: [], periodStart: "" }) });
global.fetch = mockFetch;

vi.mock("wouter", () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
  useRoute: () => [false, {}],
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => <span ref={ref} {...props}>{children}</span>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

const icon = (name: string) => (props: any) => <span {...props}>{name}</span>;
vi.mock("lucide-react", () => ({
  Loader2: (props: any) => <span data-testid="loader" {...props}>Loading</span>,
  Activity: icon("Activity"),
  ShieldAlert: icon("ShieldAlert"),
  Sparkles: icon("Sparkles"),
  TrendingUp: icon("TrendingUp"),
  Zap: icon("Zap"),
  AlertCircle: icon("AlertCircle"),
  CheckCircle2: icon("CheckCircle2"),
  Circle: icon("Circle"),
  ArrowUpRight: icon("ArrowUpRight"),
  ArrowDownRight: icon("ArrowDownRight"),
  Target: icon("Target"),
  Users: icon("Users"),
  ChevronDown: icon("ChevronDown"),
  ChevronUp: icon("ChevronUp"),
  Check: icon("Check"),
  BarChart3: icon("BarChart3"),
  Brain: icon("Brain"),
  BrainCircuit: icon("BrainCircuit"),
  Eye: icon("Eye"),
  Info: icon("Info"),
  Star: icon("Star"),
  X: icon("X"),
  RefreshCw: icon("RefreshCw"),
  MessageSquare: icon("MessageSquare"),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

const mockUseGym = vi.fn();
vi.mock("@/store/GymContext", () => ({
  useGym: () => mockUseGym(),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

const mockUseGetIntelligenceOverview = vi.fn();
vi.mock("@workspace/api-client-react", () => ({
  useGetIntelligenceOverview: (...args: any[]) => mockUseGetIntelligenceOverview(...args),
}));

const MOCK_INTELLIGENCE = {
  rsi: {
    score: 74.3,
    band: "Strong",
    insight: "Your gym's retention stability is strong",
    breakdown: [
      { label: "Churn", value: 80, weight: 0.35 },
      { label: "Revenue", value: 90, weight: 0.25 },
      { label: "Growth", value: 65, weight: 0.2 },
      { label: "Tenure", value: 55, weight: 0.2 },
    ],
  },
  topRisks: [
    { memberId: 1, memberName: "John Doe", riskScore: 92, riskTier: "critical", revenueAtRisk: 150, riskSignals: ["No visits in 30 days"] },
    { memberId: 2, memberName: "Jane Smith", riskScore: 72, riskTier: "high", revenueAtRisk: 120, riskSignals: ["Attendance declining"] },
  ],
  topInterventions: [
    { type: "retention", urgency: "high", title: "Reach out to at-risk members", description: "Contact critical and high-risk members", steps: ["Call John", "Email Jane"] },
  ],
  revenueForecast: {
    currentMrr: 12750,
    projectedMrr: 13200,
    trend: "up",
  },
};

describe("Intelligence Page", () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGym.mockReturnValue({ activeGymId: 1 });
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ cards: [], periodStart: "" }) });
  });

  async function importAndRender() {
    const mod = await import("../pages/Intelligence");
    const Intelligence = mod.default || mod.Intelligence;
    return render(
      <QueryClientProvider client={queryClient}>
        <Intelligence />
      </QueryClientProvider>
    );
  }

  it("shows loader when data is loading", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: undefined, isLoading: true, error: null });
    await importAndRender();
    expect(screen.getByTestId("loader")).toBeDefined();
  });

  it("shows error state when intelligence data fails", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("fail") });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("Unable to load intelligence data");
    });
  });

  it("renders RSI score when data loads", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: MOCK_INTELLIGENCE, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("74.3");
    });
  });

  it("displays RSI band label", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: MOCK_INTELLIGENCE, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("Strong");
    });
  });

  it("shows RSI insight message", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: MOCK_INTELLIGENCE, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("retention stability");
    });
  });

  it("renders tab navigation buttons", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: MOCK_INTELLIGENCE, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      const text = document.body.textContent || "";
      expect(text).toContain("Retention");
    });
  });

  it("handles no gym selected gracefully", async () => {
    mockUseGym.mockReturnValue({ activeGymId: null });
    mockUseGetIntelligenceOverview.mockReturnValue({ data: undefined, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("Select a gym");
    });
  });

  it("renders Intelligence header", async () => {
    mockUseGetIntelligenceOverview.mockReturnValue({ data: MOCK_INTELLIGENCE, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("Intelligence");
    });
  });
});
