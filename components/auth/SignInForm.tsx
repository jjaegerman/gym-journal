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
import { Alert, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

export default function SignInForm({
  setSignUpElseSignIn,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");
    setLoading(false);
  }

  const handleSubmit = (event) => {
    // Prevent default form submission behavior (page reload)
    event.preventDefault();

    // Access form elements and their values
    const form = event.target;
    const data = new FormData(form); // Use FormData API to easily extract values

    const email = data.get("email");
    const password = data.get("password");

    console.log("Form Submitted:", { email, password });
  };

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
        <H1
          self="center"
          size="$8"
          $xs={{
            size: "$7",
          }}
        >
          Sign in to your account
        </H1>
        <View flexDirection="column" gap="$3" width="80%">
          <Input size="$4">
            <Input.Label htmlFor="email">Email</Input.Label>
            <Input.Box>
              <Input.Area
                value={email}
                onChangeText={setEmail}
                id="email"
                placeholder="email@example.com"
              />
            </Input.Box>
          </Input>
          <Input size="$4">
            <View flexDirection="row" items="center" justify="space-between">
              <Input.Label htmlFor={"password"}>Password</Input.Label>
            </View>
            <Input.Box>
              <Input.Area
                textContentType="password"
                secureTextEntry
                id={"password"}
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
              />
            </Input.Box>
            <ForgotPasswordLink />
          </Input>
        </View>
        <Theme inverse>
          <Button
            disabled={loading}
            onPress={signInWithEmail}
            width="50%"
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
          </Button>
        </Theme>
        <View flexDirection="column" gap="$3" width="100%" items="center">
          <Theme>
            {/* TODO: Social Auth Providers
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
              */}
          </Theme>
        </View>
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
