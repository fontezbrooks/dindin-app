import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { ConsoleTransport, LogLayer } from "loglayer";
import { Text, TouchableOpacity } from "react-native";

export const SignOutButton = () => {
  const log = new LogLayer({
    transport: new ConsoleTransport({
      logger: console,
    }),
  });
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect to your desired page
      router.replace("/");
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      log.withError(new Error(JSON.stringify(err, null, 2)));
    }
  };

  return (
    <TouchableOpacity onPress={handleSignOut}>
      <Text>Sign out</Text>
    </TouchableOpacity>
  );
};
