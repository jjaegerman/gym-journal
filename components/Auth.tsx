import React, { useState } from "react";
import { Alert, StyleSheet, AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { Button, Input } from "@rneui/themed";
import SignInForm from "./auth/SignInForm";
import { Spacer, View } from "tamagui";
import SignUpForm from "./auth/SignUpForm";

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export default function Auth() {
  const [signUpElseSignIn, setSignUpElseSignIn] = useState(true);

  return (
    <View bg="$background" width="60%" self="center">
      <Spacer size="$10" />
      {signUpElseSignIn ? (
        <SignUpForm setSignUpElseSignIn={setSignUpElseSignIn} />
      ) : (
        <SignInForm setSignUpElseSignIn={setSignUpElseSignIn} />
      )}
    </View>
  );
}
