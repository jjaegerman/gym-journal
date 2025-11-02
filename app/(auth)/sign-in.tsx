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

function useSignIn() {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  return {
    status: status,
    signIn: () => {
      setStatus("loading");
      setTimeout(() => {
        setStatus("success");
      }, 2000);
    },
  };
}

export default function SignInScreen() {
  const { signIn, status } = useSignIn();

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
    <Form>
      <FormCard>
        <View items="center" gap="$4" paddingBlock="$4" width="100%">
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
            <View flexDirection="column" gap="$1">
              <Input size="$4">
                <Input.Label htmlFor="email">Email</Input.Label>
                <Input.Box>
                  <Input.Area id="email" placeholder="email@example.com" />
                </Input.Box>
              </Input>
            </View>
            <View flexDirection="column" gap="$1">
              <Input size="$4">
                <View
                  flexDirection="row"
                  items="center"
                  justify="space-between"
                >
                  <Input.Label htmlFor={"password"}>Password</Input.Label>
                </View>
                <Input.Box>
                  <Input.Area
                    textContentType="password"
                    secureTextEntry
                    id={"password"}
                    placeholder="Enter password"
                  />
                </Input.Box>
                <ForgotPasswordLink />
              </Input>
            </View>
          </View>
          <Theme inverse>
            <Form.Trigger asChild>
              <Button
                disabled={status === "loading"}
                onPress={signIn}
                width="50%"
                iconAfter={
                  <AnimatePresence>
                    {status === "loading" && (
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
            </Form.Trigger>
          </Theme>
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
          <SignUpLink />
        </View>
      </FormCard>
    </Form>
  );
}

// Swap for your own Link
const Link = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <View href={href} tag="a">
      {children}
    </View>
  );
};

const SignUpLink = () => {
  return (
    <Link href={`#`}>
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
    </Link>
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
