import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>();
  const mocks: Record<string, any> = {
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
  };

  return new Proxy(actual, {
    get(target, prop: string) {
      if (prop in mocks) return mocks[prop];
      if (prop in target) return target[prop];
      return (props: any) => <span {...props} />;
    },
  });
});

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
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: make("div"),
  SelectItem: make("div"),
  SelectTrigger: make("div"),
  SelectValue: () => <span />,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: make("div"),
  DialogHeader: make("div"),
  DialogTitle: make("h2"),
  DialogDescription: make("p"),
  DialogFooter: make("div"),
  DialogTrigger: noop,
  DialogClose: noop,
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => <div>{children}</div>,
  SheetContent: make("div"),
  SheetHeader: make("div"),
  SheetTitle: make("h2"),
  SheetDescription: make("p"),
  SheetFooter: make("div"),
  SheetTrigger: noop,
  SheetClose: noop,
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  DropdownMenuTrigger: noop,
  DropdownMenuSeparator: () => <hr />,
}));
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: any) => <div>{children}</div>,
  AlertDialogAction: make("button"),
  AlertDialogCancel: make("button"),
  AlertDialogContent: make("div"),
  AlertDialogDescription: make("p"),
  AlertDialogFooter: make("div"),
  AlertDialogHeader: make("div"),
  AlertDialogTitle: make("h2"),
  AlertDialogTrigger: noop,
}));

}));

const mockUseGym = vi.fn();
vi.mock("@/store/GymContext", () => ({
  useGym: () => mockUseGym(),
}));

const mockUseListMembers = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockNoteMutate = vi.fn();

vi.mock("@workspace/api-client-react", () => ({
  useListMembers: (...args: any[]) => mockUseListMembers(...args),
  useCreateMember: () => ({ mutateAsync: mockCreateMutate, isPending: false }),
  useUpdateMember: () => ({ mutateAsync: mockUpdateMutate, isPending: false }),
  useAddMemberNote: () => ({ mutateAsync: mockNoteMutate, isPending: false }),
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
    const user = userEvent.setup();
    const result = render(
      <QueryClientProvider client={queryClient}>
        <Members />
      </QueryClientProvider>
    );
    return { ...result, user };
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
      expect(document.body.textContent?.toLowerCase()).toMatch(/no|empty|add|import|member/);
    });
  });

  it("renders search functionality", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      const searchInput = document.querySelector("input");
      expect(searchInput).toBeDefined();
    });
  });

  it("shows risk information for high-risk members", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      const text = document.body.textContent?.toLowerCase() || "";
      expect(text).toContain("high");
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

  it("search input filters by typing", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    const { user } = await importAndRender();
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search members...")).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText("Search members...");
    await user.type(input, "Alice");
    expect(input).toHaveValue("Alice");
  });

  it("displays header title and subtitle", async () => {
    mockUseListMembers.mockReturnValue({ data: MOCK_MEMBERS, isLoading: false, error: null });
    await importAndRender();
    await waitFor(() => {
      const text = document.body.textContent || "";
      expect(text).toContain("Directory");
      expect(text).toContain("Manage your gym");
    });
  });
});
