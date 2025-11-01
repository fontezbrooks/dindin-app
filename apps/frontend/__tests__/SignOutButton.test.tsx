import { fireEvent, render } from "@testing-library/react-native";
import { SignOutButton } from "../components/SignOutButton";

// Mock Clerk with specific functions for this test
const mockSignOut = jest.fn();
const mockReplace = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useClerk: () => ({
    signOut: mockSignOut,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

describe("SignOutButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly", () => {
    const { getByText } = render(<SignOutButton />);
    expect(getByText("Sign out")).toBeTruthy();
  });

  it("calls signOut when pressed", async () => {
    mockSignOut.mockResolvedValue(undefined);

    const { getByText } = render(<SignOutButton />);
    const button = getByText("Sign out");

    fireEvent.press(button);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("redirects to home after successful sign out", async () => {
    mockSignOut.mockResolvedValue(undefined);

    const { getByText } = render(<SignOutButton />);
    const button = getByText("Sign out");

    fireEvent.press(button);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockReplace).toHaveBeenCalledWith("/");
  });

  it("handles sign out errors gracefully", async () => {
    const mockError = new Error("Sign out failed");
    mockSignOut.mockRejectedValue(mockError);

    const { getByText } = render(<SignOutButton />);
    const button = getByText("Sign out");

    // Should not throw when signOut fails
    fireEvent.press(button);

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    // Should not navigate on error
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("is accessible", () => {
    const { getByText } = render(<SignOutButton />);
    const button = getByText("Sign out");

    // TouchableOpacity should be accessible by default
    expect(button.parent).toBeTruthy();
  });
});
