import React, { useState } from "react";
import { View } from "tamagui";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";
import { makeRedirectUri } from "expo-auth-session";
import { Spacer } from "@/components/ui/layout";

const redirectTo = makeRedirectUri();

export default function Auth() {
  const [signUpElseSignIn, setSignUpElseSignIn] = useState(true);

  return (
    <View bg="$background" width="70%" $sm={{ width: "90%" }} self="center">
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
