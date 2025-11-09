import { Facebook, Github } from "@tamagui/lucide-icons";
import { useState } from "react";
import {
  Anchor,
  AnimatePresence,
  Button,
  Dialog,
  H1,
  Paragraph,
  Separator,
  SizableText,
  Spacer,
  Spinner,
  Theme,
  View,
  Text,
  PortalProvider,
} from "tamagui";
import { Input } from "components/auth/inputParts";
import { FormCard } from "components/auth/layoutParts";
import { supabase } from "lib/supabase";
import { Alert, Platform, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useToastController } from "@tamagui/toast";
import { Form } from "components/auth/form";

export default function SignInForm({
  setSignUpElseSignIn,
  redirectTo,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
  redirectTo: string;
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
    <PortalProvider>
      <Dialog>
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
              <Form
                onSubmit={(data) => {
                  signInWithEmail({
                    email: data.email,
                    password: data.password,
                  });
                }}
                defaultValues={{
                  email: "",
                  password: "",
                }}
              >
                <Form.Input
                  name="email"
                  label="Email"
                  id="email"
                  placeholder="email@example.com"
                  rules={{ required: "Email is required" }}
                />
                <Form.Input
                  name="password"
                  label="Password"
                  id="password"
                  placeholder="Enter password"
                  secureTextEntry
                  rules={{
                    required: "Password is required",
                  }}
                />

                <ForgotPasswordLink />
                <Theme inverse>
                  <Form.Trigger asChild disabled={loading}>
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
                      Sign In
                    </Button>
                  </Form.Trigger>
                </Theme>
              </Form>
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
        <ForgotPasswordModal redirectTo={redirectTo} />
      </Dialog>
    </PortalProvider>
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
    <Dialog.Trigger asChild>
      <TouchableOpacity>
        <Paragraph
          self="flex-end"
          color="$colorHover"
          hoverStyle={{
            color: "$color",
          }}
          textDecorationLine="underline"
          size="$1"
          marginBlockStart="$1"
        >
          Forgot your password?
        </Paragraph>
      </TouchableOpacity>
    </Dialog.Trigger>
  );
};

const ForgotPasswordModal = ({ redirectTo }: { redirectTo: string }) => {
  const [loading, setLoading] = useState(false);
  const toast = useToastController();

  const sendResetPasswordEmail = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo + "/reset-password",
    });

    setLoading(false);
    if (error) {
      console.error(error);
    } else {
      toast.show("Password reset email sent successfully!", {
        duration: 10000,
        customData: { theme: "green" },
      });
    }
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay key="overlay" background="$shadow6" />
      <Dialog.Content bg="$backgroundHover" p="$6" width="60%" items="center">
        <Dialog.Title>Forgot your password</Dialog.Title>
        <Dialog.Description text="center" mt="$2" size="$3" width="85%">
          Enter the email associated with your account and we'll send you
          password reset instructions.
        </Dialog.Description>
        <View flexDirection="column" gap="$3" width="80%">
          <Form
            onSubmit={(data) => {
              sendResetPasswordEmail(data.email);
            }}
            defaultValues={{
              email: "",
            }}
          >
            <Form.Input
              name="email"
              label="Email"
              id="email"
              placeholder="email@example.com"
              rules={{ required: "Email is required" }}
            />

            <ForgotPasswordLink />
            <Theme inverse>
              <Form.Trigger asChild disabled={loading}>
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
                  Reset Password
                </Button>
              </Form.Trigger>
            </Theme>
          </Form>
        </View>
      </Dialog.Content>
    </Dialog.Portal>
  );
};
