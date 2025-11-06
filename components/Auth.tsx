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
import { useLocalSearchParams } from "expo-router";
import ChangePasswordForm from "./auth/ChangePasswordForm";

const redirectTo = makeRedirectUri();

export default function Auth() {
  const [signUpElseSignIn, setSignUpElseSignIn] = useState(true);

  return (
    <View bg="$background" width="60%" self="center">
      <Spacer size="$10" />
      {signUpElseSignIn ? (
        <SignUpForm
          setSignUpElseSignIn={setSignUpElseSignIn}
          redirectTo={redirectTo}
        />
      ) : (
        <SignInForm
          setSignUpElseSignIn={setSignUpElseSignIn}
          redirectTo={redirectTo}
        />
      )}
    </View>
  );
}
