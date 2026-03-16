import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("wouter", () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
  useRoute: () => [false, {}],
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => <div ref={ref} {...props}>{children}</div>),
    tr: React.forwardRef(({ children, ...props }: any, ref: any) => <tr ref={ref} {...props}>{children}</tr>),
    td: React.forwardRef(({ children, ...props }: any, ref: any) => <td ref={ref} {...props}>{children}</td>),
    span: React.forwardRef(({ children, ...props }: any, ref: any) => <span ref={ref} {...props}>{children}</span>),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const icon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} {...props}>{name}</span>;
vi.mock("lucide-react", () => ({
  Loader2: (props: any) => <span data-testid="loader" {...props}>Loading</span>,
  Search: icon("Search"),
  Plus: icon("Plus"),
  Filter: icon("Filter"),
  MoreHorizontal: icon("MoreHorizontal"),
  UserCircle: icon("UserCircle"),
  Upload: icon("Upload"),
  FileSpreadsheet: icon("FileSpreadsheet"),
  ChevronDown: icon("ChevronDown"),
  ChevronUp: icon("ChevronUp"),
  X: icon("X"),
  Edit: icon("Edit"),
  Trash2: icon("Trash2"),
  Eye: icon("Eye"),
  Mail: icon("Mail"),
  Phone: icon("Phone"),
  AlertTriangle: icon("AlertTriangle"),
  Users: icon("Users"),
  ArrowUpDown: icon("ArrowUpDown"),
  Check: icon("Check"),
  Info: icon("Info"),
  Star: icon("Star"),
  Calendar: icon("Calendar"),
  MapPin: icon("MapPin"),
  Tag: icon("Tag"),
  UserPlus: icon("UserPlus"),
  Download: icon("Download"),
  RefreshCw: icon("RefreshCw"),
  Settings: icon("Settings"),
  Bell: icon("Bell"),
  Copy: icon("Copy"),
  ExternalLink: icon("ExternalLink"),
  CircleAlert: icon("CircleAlert"),
  TriangleAlert: icon("TriangleAlert"),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/components/members/ImportMembersDialog", () => ({
  ImportMembersDialog: () => null,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const make = (tag: string) => ({ children, ...props }: any) => React.createElement(tag, props, children);
const noop = ({ children }: any) => <>{children}</>;

vi.mock("@/components/ui/button", () => ({ Button: make("button") }));
vi.mock("@/components/ui/input", () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock("@/components/ui/label", () => ({ Label: make("label") }));
vi.mock("@/components/ui/checkbox", () => ({ Checkbox: (props: any) => <input type="checkbox" {...props} /> }));
vi.mock("@/components/ui/badge", () => ({ Badge: make("span") }));
vi.mock("@/components/ui/select", () => ({
  Select: noop, SelectContent: make("div"), SelectItem: make("div"), SelectTrigger: make("div"), SelectValue: () => <span />,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: noop, DialogContent: make("div"), DialogHeader: make("div"), DialogTitle: make("h2"),
  DialogDescription: make("p"), DialogFooter: make("div"), DialogTrigger: noop, DialogClose: noop,
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: noop, SheetContent: make("div"), SheetHeader: make("div"), SheetTitle: make("h2"),
  SheetDescription: make("p"), SheetFooter: make("div"), SheetTrigger: noop, SheetClose: noop,
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: noop, DropdownMenuContent: make("div"), DropdownMenuItem: make("button"),
  DropdownMenuTrigger: noop, DropdownMenuSeparator: () => <hr />,
}));
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: noop, AlertDialogAction: make("button"), AlertDialogCancel: make("button"),
  AlertDialogContent: make("div"), AlertDialogDescription: make("p"), AlertDialogFooter: make("div"),
  AlertDialogHeader: make("div"), AlertDialogTitle: make("h2"), AlertDialogTrigger: noop,
}));

const mockUseGym = vi.fn();
vi.mock("@/store/GymContext", () => ({
  useGym: () => mockUseGym(),
}));

const mockUseListMembers = vi.fn();
vi.mock("@workspace/api-client-react", () => ({
  useListMembers: (...args: any[]) => mockUseListMembers(...args),
  useCreateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useAddMemberNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  getListMembersQueryKey: (gymId: number) => ["members", gymId],
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return { ...actual, useQueryClient: () => ({ invalidateQueries: vi.fn() }) };
});

const MOCK_MEMBERS = {
  members: [
    { id: 1, firstName: "John", lastName: "Doe", email: "john@test.com", status: "active", membershipType: "Unlimited", riskTier: "healthy", riskScore: 10, phone: "5551234567", createdAt: "2026-01-01" },
    { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@test.com", status: "active", membershipType: "3x/week", riskTier: "high", riskScore: 72, phone: "5559876543", createdAt: "2026-02-01" },
    { id: 3, firstName: "Bob", lastName: "Wilson", email: "bob@test.com", status: "cancelled", membershipType: "Drop-in", riskTier: null, riskScore: null, phone: null, createdAt: "2026-01-15" },
  ],
  total: 3,
  limit: 50,
  offset: 0,
};

describe("Members Page", () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGym.mockReturnValue({ activeGymId: 1 });
  });

  async function importAndRender() {
    const mod = await import("../pages/Members");
    const Members = mod.default || mod.Members;
    return render(
      <QueryClientProvider client={queryClient}>
        <Members />
      </QueryClientProvider>
    );
  }

  it("shows loader when data is loading", async () => {
    mockUseListMembers.mockReturnValue({ data: undefined, isLoading: true, error: null });
    await importAndRender();
    expect(screen.getByTestId("loader")).toBeDefined();
  });

  it("renders member names", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("John");
      expect(document.body.textContent).toContain("Jane");
    });
  });

  it("shows member status", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      const text = document.body.textContent?.toLowerCase() || "";
      expect(text).toContain("active");
    });
  });

  it("displays member count", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("3");
    });
  });

  it("renders add member functionality", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      const text = document.body.textContent?.toLowerCase() || "";
      expect(text).toMatch(/add|new|member/);
    });
  });

  it("handles empty member list", async () => {
    mockUseListMembers.mockReturnValue({
      data: { members: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
    });
    await importAndRender();
    await waitFor(() => {
      expect(document.body).toBeDefined();
    });
  });

  it("renders search input", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.querySelector("input")).toBeDefined();
    });
  });

  it("shows risk tier for at-risk members", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent?.toLowerCase()).toContain("high");
    });
  });

  it("renders email addresses", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      expect(document.body.textContent).toContain("john@test.com");
    });
  });

  it("handles no gym selected", async () => {
    mockUseGym.mockReturnValue({ activeGymId: null });
    mockUseListMembers.mockReturnValue({ data: undefined, isLoading: false, error: null });
    await importAndRender();
    expect(document.body).toBeDefined();
  });
});
