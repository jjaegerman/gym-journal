import React, { useState } from "react";
import { Alert, StyleSheet, AppState } from "react-native";
import { supabase } from "../lib/supabase";
import { Button, Input } from "@rneui/themed";
import SignInForm from "./auth/SignInForm";
import { Spacer, View } from "tamagui";
import SignUpForm from "./auth/SignUpForm";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";

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

WebBrowser.maybeCompleteAuthSession();
const redirectTo = makeRedirectUri();

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return;
  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
};

export default function Auth() {
  const [signUpElseSignIn, setSignUpElseSignIn] = useState(true);

  const url = Linking.useLinkingURL();
  if (url) createSessionFromUrl(url);

  return (
    <View bg="$background" width="60%" self="center">
      <Spacer size="$10" />
      {signUpElseSignIn ? (
        <SignUpForm
          setSignUpElseSignIn={setSignUpElseSignIn}
          redirectTo={redirectTo}
        />
      ) : (
        <SignInForm setSignUpElseSignIn={setSignUpElseSignIn} />
      )}
    </View>
  );
}
