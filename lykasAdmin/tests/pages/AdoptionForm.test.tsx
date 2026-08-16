import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AdoptionForm } from "@/pages/AdoptionForm";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: { get: vi.fn(), post: vi.fn() },
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : "Something went wrong"),
  getFieldErrors: () => ({}),
}));

const mockedApi = vi.mocked(api);

function renderPage(initialPath = "/applications/new") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AdoptionForm />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdoptionForm page", () => {
  it("renders the form with a pet and applicant search field", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /new application/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^pet$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^applicant$/i)).toBeInTheDocument();
  });

  it("searches for a pet and lets the user select one from results", async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: { success: true, data: [{ _id: "pet1", name: "Biscuit", species: "Dog", breed: "Mix" }] },
    });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^pet$/i), "Bis");
    expect(await screen.findByText("Biscuit")).toBeInTheDocument();

    await user.click(screen.getByText("Biscuit"));
    expect(await screen.findByText(/selected: biscuit/i)).toBeInTheDocument();
  });

  it("blocks submission until both a pet and an applicant are selected", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /submit application/i }));
    expect(await screen.findByText(/please select a pet/i)).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  it("submits the application with the selected pet and applicant ids", async () => {
    mockedApi.get
      .mockResolvedValueOnce({ data: { success: true, data: [{ _id: "pet1", name: "Biscuit", species: "Dog" }] } })
      .mockResolvedValueOnce({
        data: { success: true, data: [{ _id: "user1", displayName: "Ada Lovelace", email: "ada@example.com" }] },
      });
    mockedApi.post.mockResolvedValue({ data: { success: true, data: { _id: "app1" } } });

    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^pet$/i), "Bis");
    await user.click(await screen.findByText("Biscuit"));

    await user.type(screen.getByLabelText(/^applicant$/i), "Ada");
    await user.click(await screen.findByText("Ada Lovelace"));

    await user.click(screen.getByRole("button", { name: /submit application/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        "/api/applications",
        expect.objectContaining({ pet: "pet1", applicant: "user1", type: "adoption" })
      );
    });

    expect(await screen.findByText(/application recorded/i)).toBeInTheDocument();
  });

  it("preselects a pet from the petId/petName query params", () => {
    renderPage("/applications/new?petId=pet9&petName=Waffles");
    expect(screen.getByText(/selected: waffles/i)).toBeInTheDocument();
  });
});
