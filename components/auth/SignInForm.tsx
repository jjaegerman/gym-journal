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
import { Input } from "components/auth/inputParts";
import { FormCard } from "components/auth/layoutParts";
import { supabase } from "lib/supabase";
import { Alert, Platform, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useToastController } from "@tamagui/toast";
import {
  LmFormRhfProvider,
  LmInputRhf,
  LmSubmitButtonRhf,
} from "@tamagui-extras/form";

export default function SignInForm({
  setSignUpElseSignIn,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
}) {
  const toast = useToastController();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error)
      toast.show(error.message, {
        duration: 3000,
        customData: { theme: "red" },
      });
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
          Sign in to your account
        </H1>
        <View flexDirection="column" gap="$3" width="80%">
          <LmFormRhfProvider>
            <LmInputRhf
              name="email"
              label="Email"
              id="email"
              placeholder="email@example.com"
              rules={{ required: "Email is required" }}
            />
            <LmInputRhf
              name="password"
              label="Password"
              id="password"
              placeholder="Enter password"
              secureTextEntry
              rules={{
                required: "Password is required",
              }}
            />
            <Theme inverse>
              <LmSubmitButtonRhf
                onSubmit={(data) => {
                  signInWithEmail({
                    email: data.email,
                    password: data.password,
                  });
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
        {/* TODO: Social Auth Providers
        <View flexDirection="column" gap="$3" width="100%" items="center">
          <Theme>
              <View
                flexDirection="column"
                gap="$3"
                width="100%"
                self="center"
                items="center"
              >
                <View flexDirection="row" width="100%" items="center" gap="$4">
                  <Separator />
                  <Paragraph>Or</Paragraph>
                  <Separator />
                </View>
                <View flexDirection="row" flexWrap="wrap" gap="$3">
                  <Button flex={1} minW="100%">
                    <Button.Icon>
                      <Github size="$1" />
                    </Button.Icon>
                    <Button.Text>Continue with Github</Button.Text>
                  </Button>
                  <Button flex={1}>
                    <Button.Icon>
                      <Facebook color="$blue10" size="$1" />
                    </Button.Icon>
                    <Button.Text>Continue with Facebook</Button.Text>
                  </Button>
                </View>
              </View>
          </Theme>
        </View>
        */}
        <SignUpLink setSignUpElseSignIn={setSignUpElseSignIn} />
      </View>
    </FormCard>
  );
}

const SignUpLink = ({
  setSignUpElseSignIn,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
}) => {
  return (
    <TouchableOpacity onPress={() => setSignUpElseSignIn(true)}>
      <Paragraph textDecorationStyle="unset">
        Don&apos;t have an account?{" "}
        <SizableText
          hoverStyle={{
            color: "$colorHover",
          }}
          textDecorationLine="underline"
        >
          Sign up
        </SizableText>
      </Paragraph>
    </TouchableOpacity>
  );
};

const ForgotPasswordLink = () => {
  return (
    <Anchor self="flex-end" href={`#`}>
      <Paragraph
        color="$black11"
        hoverStyle={{
          color: "$black12",
        }}
        size="$1"
        marginBlockStart="$1"
      >
        Forgot your password?
      </Paragraph>
    </Anchor>
  );
};
