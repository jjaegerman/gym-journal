import { Facebook, Github } from "@tamagui/lucide-icons";
import { useState } from "react";
import {
  Anchor,
  AnimatePresence,
  Button,
  Form,
  H1,
  Paragraph,
  Separator,
  SizableText,
  Spinner,
  Theme,
  View,
} from "tamagui";
import {
  LmFormRhfProvider,
  LmInputRhf,
  LmSubmitButtonRhf,
} from "@tamagui-extras/form";
import { Input } from "components/auth/inputParts";
import { FormCard } from "components/auth/layoutParts";
import { supabase } from "lib/supabase";
import { Alert, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useForm } from "react-hook-form";

export default function SignUpForm({
  setSignUpElseSignIn,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: "asd",
      password: "foo",
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");
    setLoading(false);
  }

  return (
    <FormCard>
      <View
        bg="$backgroundHover"
        items="center"
        gap="$4"
        paddingBlock="$4"
        width="100%"
        style={{ borderRadius: 15 }}
      >
        <H1 self="center" size="$8">
          Create an account
        </H1>
        <View flexDirection="column" gap="$3" width="80%">
          <LmFormRhfProvider>
            <LmInputRhf
              name="email"
              label="Email"
              id="email"
              placeholder="email@example.com"
              rules={{ required: "Email is required", pattern: /^\S+@\S+$/i }}
            />
            <LmInputRhf
              name="password"
              label="Password"
              id="password"
              placeholder="Enter password"
              secureTextEntry
              rules={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
            />
            <LmInputRhf
              name="confirmPassword"
              label="Confirm Password"
              id="confirmPassword"
              placeholder="Confirm password"
              secureTextEntry
              rules={{
                required: "Please confirm your password",
              }}
            />
            <Theme inverse>
              <LmSubmitButtonRhf
                onSubmit={(data) => {
                  console.log(data);
                  if (data.password !== data.confirmPassword) {
                    Alert.alert("Passwords do not match");
                    return;
                  }
                  // TODO: Proceed with sign-up logic
                }}
                disabled={loading}
                width="50%"
                self="center"
                iconAfter={
                  <AnimatePresence>
                    {loading && (
                      <Spinner
                        color="$color"
                        key="loading-spinner"
                        opacity={1}
                        scale={1}
                        animation="quick"
                        position="absolute"
                        l="60%"
                        enterStyle={{
                          opacity: 0,
                          scale: 0.5,
                        }}
                        exitStyle={{
                          opacity: 0,
                          scale: 0.5,
                        }}
                      />
                    )}
                  </AnimatePresence>
                }
              >
                <Button.Text>Sign In</Button.Text>
              </LmSubmitButtonRhf>
            </Theme>
          </LmFormRhfProvider>
        </View>
        <SignInLink setSignUpElseSignIn={setSignUpElseSignIn} />
      </View>
    </FormCard>
  );
}

const SignInLink = ({
  setSignUpElseSignIn,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
}) => {
  return (
    <TouchableOpacity onPress={() => setSignUpElseSignIn(false)}>
      <Paragraph textDecorationStyle="unset">
        Already have an account?{" "}
        <SizableText
          hoverStyle={{
            color: "$colorHover",
          }}
          textDecorationLine="underline"
        >
          Sign in
        </SizableText>
      </Paragraph>
    </TouchableOpacity>
  );
};
