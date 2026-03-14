import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("lucide-react", () => ({
  Loader2: (props: any) => <span data-testid="loader" {...props}>Loading</span>,
  CheckCircle: (props: any) => <span data-testid="check-circle" {...props}>Check</span>,
  AlertTriangle: (props: any) => <span data-testid="alert-triangle" {...props}>Alert</span>,
  CreditCard: (props: any) => <span data-testid="credit-card" {...props}>Card</span>,
  ShieldCheck: (props: any) => <span data-testid="shield-check" {...props}>Shield</span>,
}));

import { UpdatePayment } from "../pages/UpdatePayment";

function setLocationSearch(search: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search },
    writable: true,
  });
}

describe("C3: UpdatePayment Public Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows error when no token is provided", () => {
    setLocationSearch("");
    render(<UpdatePayment />);
    expect(screen.getByText(/no payment update token/i)).toBeInTheDocument();
    expect(screen.getByText(/unable to continue/i)).toBeInTheDocument();
  });

  it("shows loading state while validating token", () => {
    setLocationSearch("?token=test123");
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<UpdatePayment />);
    expect(screen.getByText(/validating your link/i)).toBeInTheDocument();
  });

  it("shows error for invalid token", async () => {
    setLocationSearch("?token=invalid_token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, error: "This link is invalid or expired." }),
    });

    render(<UpdatePayment />);

    await waitFor(() => {
      expect(screen.getByText(/this link is invalid or expired/i)).toBeInTheDocument();
    });
  });

  it("shows error for expired token", async () => {
    setLocationSearch("?token=expired_token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, error: "This link has expired." }),
    });

    render(<UpdatePayment />);

    await waitFor(() => {
      expect(screen.getByText(/this link has expired/i)).toBeInTheDocument();
    });
  });

  it("shows error for used token", async () => {
    setLocationSearch("?token=used_token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, error: "This link has already been used." }),
    });

    render(<UpdatePayment />);

    await waitFor(() => {
      expect(screen.getByText(/this link has already been used/i)).toBeInTheDocument();
    });
  });

  it("shows error when network fails during validation", async () => {
    setLocationSearch("?token=network_fail");
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<UpdatePayment />);

    await waitFor(() => {
      expect(screen.getByText(/unable to validate your link/i)).toBeInTheDocument();
    });
  });

  it("attempts to initialize payment form after valid token", async () => {
    setLocationSearch("?token=valid_token");

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true, gymName: "Test Gym", memberName: "John" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ clientSecret: null, publishableKey: null }),
      });

    render(<UpdatePayment />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    const calls = mockFetch.mock.calls;
    expect(calls[0][0]).toContain("payment-update/validate");
    expect(calls[1][0]).toContain("payment-update/setup-intent");
  });

  it("renders without any auth wrapper (public route)", () => {
    setLocationSearch("?token=test");
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<UpdatePayment />);
    expect(container.querySelector('[data-auth-required]')).toBeNull();
  });
});
