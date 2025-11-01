import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SignInPage from "../app/(auth)/sign-in";

// Mock Clerk authentication
const mockSignIn = {
  create: jest.fn(),
};

const mockSetActive = jest.fn();
const mockReplace = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useSignIn: () => ({
    signIn: mockSignIn,
    setActive: mockSetActive,
    isLoaded: true,
  }),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  Link: ({ children, href }) => <div testID={`link-${href}`}>{children}</div>,
}));

describe("Authentication Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("SignIn Page", () => {
    it("renders sign-in form correctly", () => {
      const { getByText, getByPlaceholderText } = render(<SignInPage />);

      expect(getByText("Sign in")).toBeTruthy();
      expect(getByPlaceholderText("Enter email")).toBeTruthy();
      expect(getByPlaceholderText("Enter password")).toBeTruthy();
      expect(getByText("Continue")).toBeTruthy();
      expect(getByText("Don't have an account?")).toBeTruthy();
    });

    it("handles email input correctly", () => {
      const { getByPlaceholderText } = render(<SignInPage />);
      const emailInput = getByPlaceholderText("Enter email");

      fireEvent.changeText(emailInput, "test@example.com");

      expect(emailInput.props.value).toBe("test@example.com");
    });

    it("handles password input correctly", () => {
      const { getByPlaceholderText } = render(<SignInPage />);
      const passwordInput = getByPlaceholderText("Enter password");

      fireEvent.changeText(passwordInput, "password123");

      expect(passwordInput.props.value).toBe("password123");
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it("has link to sign-up page", () => {
      const { getByTestId } = render(<SignInPage />);
      const signUpLink = getByTestId("link-/sign-up");

      expect(signUpLink).toBeTruthy();
    });

    it("performs successful sign-in", async () => {
      const mockSession = {
        status: "complete",
        createdSessionId: "session_123",
      };

      mockSignIn.create.mockResolvedValue(mockSession);
      mockSetActive.mockResolvedValue(undefined);

      const { getByPlaceholderText, getByText } = render(<SignInPage />);

      // Fill in form
      fireEvent.changeText(
        getByPlaceholderText("Enter email"),
        "test@example.com"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter password"),
        "password123"
      );

      // Submit form
      fireEvent.press(getByText("Continue"));

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: "test@example.com",
          password: "password123",
        });
      });

      await waitFor(() => {
        expect(mockSetActive).toHaveBeenCalledWith({
          session: "session_123",
        });
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/");
      });
    });

    it("handles incomplete sign-in status", async () => {
      const mockSession = {
        status: "incomplete",
        createdSessionId: null,
      };

      mockSignIn.create.mockResolvedValue(mockSession);

      const { getByPlaceholderText, getByText } = render(<SignInPage />);

      // Fill in form
      fireEvent.changeText(
        getByPlaceholderText("Enter email"),
        "test@example.com"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter password"),
        "password123"
      );

      // Submit form
      fireEvent.press(getByText("Continue"));

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalled();
      });

      // Should not set active session or redirect on incomplete status
      expect(mockSetActive).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("handles sign-in errors gracefully", async () => {
      const mockError = new Error("Invalid credentials");
      mockSignIn.create.mockRejectedValue(mockError);

      const { getByPlaceholderText, getByText } = render(<SignInPage />);

      // Fill in form
      fireEvent.changeText(
        getByPlaceholderText("Enter email"),
        "test@example.com"
      );
      fireEvent.changeText(
        getByPlaceholderText("Enter password"),
        "wrongpassword"
      );

      // Submit form
      fireEvent.press(getByText("Continue"));

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalled();
      });

      // Should not proceed with authentication on error
      expect(mockSetActive).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("does not submit when Clerk is not loaded", () => {
      // Mock Clerk as not loaded
      jest.doMock("@clerk/clerk-expo", () => ({
        useSignIn: () => ({
          signIn: mockSignIn,
          setActive: mockSetActive,
          isLoaded: false,
        }),
      }));

      const { getByText } = render(<SignInPage />);

      fireEvent.press(getByText("Continue"));

      // Should not call signIn when not loaded
      expect(mockSignIn.create).not.toHaveBeenCalled();
    });

    it("has proper email input configuration", () => {
      const { getByPlaceholderText } = render(<SignInPage />);
      const emailInput = getByPlaceholderText("Enter email");

      expect(emailInput.props.autoCapitalize).toBe("none");
    });

    it("clears form inputs correctly", () => {
      const { getByPlaceholderText } = render(<SignInPage />);
      const emailInput = getByPlaceholderText("Enter email");
      const passwordInput = getByPlaceholderText("Enter password");

      // Set values
      fireEvent.changeText(emailInput, "test@example.com");
      fireEvent.changeText(passwordInput, "password123");

      expect(emailInput.props.value).toBe("test@example.com");
      expect(passwordInput.props.value).toBe("password123");

      // Clear values
      fireEvent.changeText(emailInput, "");
      fireEvent.changeText(passwordInput, "");

      expect(emailInput.props.value).toBe("");
      expect(passwordInput.props.value).toBe("");
    });
  });

  describe("Authentication Integration", () => {
    it("maintains proper form state during authentication flow", async () => {
      const mockSession = {
        status: "complete",
        createdSessionId: "session_123",
      };

      mockSignIn.create.mockResolvedValue(mockSession);

      const { getByPlaceholderText, getByText } = render(<SignInPage />);

      const emailInput = getByPlaceholderText("Enter email");
      const passwordInput = getByPlaceholderText("Enter password");

      // Fill form
      fireEvent.changeText(emailInput, "user@test.com");
      fireEvent.changeText(passwordInput, "secure123");

      // Verify state before submission
      expect(emailInput.props.value).toBe("user@test.com");
      expect(passwordInput.props.value).toBe("secure123");

      // Submit
      fireEvent.press(getByText("Continue"));

      // Form state should persist during async operation
      expect(emailInput.props.value).toBe("user@test.com");
      expect(passwordInput.props.value).toBe("secure123");

      await waitFor(() => {
        expect(mockSignIn.create).toHaveBeenCalledWith({
          identifier: "user@test.com",
          password: "secure123",
        });
      });
    });
  });
});
