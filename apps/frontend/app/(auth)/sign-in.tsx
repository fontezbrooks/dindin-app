import { useSignIn } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import { ConsoleTransport, LogLayer } from "loglayer";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Page() {
  const log = new LogLayer({
    transport: new ConsoleTransport({
      logger: console,
    }),
  });
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  // Handle the submission of the sign-in form
  const onSignInPress = async () => {
    if (!isLoaded) {
      return;
    }

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === "complete") {
        await setActive({ session: signInAttempt.createdSessionId });
        router.replace("/");
      } else {
        // If the status isn't complete, check why. User might need to
        // complete further steps.
        log.withError(new Error(JSON.stringify(signInAttempt, null, 2)));
      }
    } catch (err) {
      // See https://clerk.com/docs/guides/development/custom-flows/error-handling
      // for more info on error handling
      log.withError(new Error(JSON.stringify(err, null, 2)));
    }
  };

  return (
    <View>
      <Text>Sign in</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={(_emailAddress) => setEmailAddress(_emailAddress)}
        placeholder="Enter email"
        value={emailAddress}
      />
      <TextInput
        onChangeText={(_password) => setPassword(_password)}
        placeholder="Enter password"
        secureTextEntry={true}
        value={password}
      />
      <TouchableOpacity onPress={onSignInPress}>
        <Text>Continue</Text>
      </TouchableOpacity>
      <View style={{ display: "flex", flexDirection: "row", gap: 3 }}>
        <Text>Don't have an account?</Text>
        <Link href="/sign-up">
          <Text>Sign up</Text>
        </Link>
      </View>
    </View>
  );
}
