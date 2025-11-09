import { useState } from "react";
import {
  AnimatePresence,
  Button,
  H1,
  Paragraph,
  SizableText,
  Spinner,
  Theme,
  View,
} from "tamagui";
import { Form } from "components/auth/form";
import { FormCard } from "components/auth/layoutParts";
import { supabase } from "lib/supabase";
import { TouchableOpacity } from "react-native";
import { useToastController, useToastState } from "@tamagui/toast";

export default function SignUpForm({
  setSignUpElseSignIn,
  redirectTo,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
  redirectTo: string;
}) {
  const toast = useToastController();

  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);

  async function signUpWithEmail({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error)
      toast.show(error.message, {
        duration: 30000,
        customData: { theme: "red" },
      });
    if (!session)
      toast.show("Please check your inbox for email verification!", {
        duration: 10000,
        customData: { theme: "green" },
      });
    setComplete(true);
    setLoading(false);
    setSignUpElseSignIn(false);
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
          <Form
            onSubmit={(data) => {
              if (data.password !== data.confirmPassword) {
                toast.show("Passwords do not match", {
                  message: "Please make sure both passwords are the same.",
                  duration: 3000,
                  customData: { theme: "red" },
                });
                return;
              }
              signUpWithEmail({
                email: data.email,
                password: data.password,
              });
            }}
            defaultValues={{
              email: "",
              password: "",
              confirmPassword: "",
            }}
          >
            <Form.Input
              name="email"
              label="Email"
              id="email"
              placeholder="email@example.com"
              rules={{ required: "Email is required", pattern: /^\S+@\S+$/i }}
            />
            <Form.Input
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
            <Form.Input
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
              <Form.Trigger asChild disabled={loading || complete}>
                <Button
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
                          self="center"
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
                  Sign Up
                </Button>
              </Form.Trigger>
            </Theme>
          </Form>
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
