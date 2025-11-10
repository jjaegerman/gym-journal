import { Facebook, Github, X } from "@tamagui/lucide-icons";
import {
  AnimatePresence,
  Button,
  Dialog,
  H1,
  Paragraph,
  SizableText,
  Spinner,
  Theme,
  View,
  PortalProvider,
} from "tamagui";
import { FormCard } from "./layoutParts";
import { TouchableOpacity } from "react-native";
import { Form } from "@/components/ui/forms";
import { useAuth } from "@/lib/hooks";

export default function SignInForm({
  setSignUpElseSignIn,
  redirectTo,
}: {
  setSignUpElseSignIn: (value: boolean) => void;
  redirectTo: string;
}) {
  const { signIn, loading } = useAuth();

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
                  signIn(data.email, data.password);
                }}
                defaultValues={{
                  email: "",
                  password: "",
                }}
              >
                <Form.Input
                  name="email"
                  label="Email"
                  placeholder="email@example.com"
                  rules={{ required: "Email is required" }}
                />
                <Form.Input
                  name="password"
                  label="Password"
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
  const { resetPassword, loading } = useAuth();

  const sendResetPasswordEmail = async (email: string) => {
    await resetPassword(email, redirectTo + "/reset-password");
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay key="overlay" background="$shadow6" />
      <Dialog.Content
        bg="$backgroundHover"
        p="$6"
        width="45%"
        $sm={{ width: "100%" }}
        style={{ borderRadius: 15 }}
        items="center"
      >
        <Dialog.Title $sm={{ size: "$8" }}>Forgot your password</Dialog.Title>
        <Dialog.Description
          text="center"
          mt="$2"
          size="$3"
          width="80%"
          $sm={{ width: "100%" }}
        >
          Enter the email associated with your account and we'll send you
          password reset instructions.
        </Dialog.Description>
        <View
          flexDirection="column"
          gap="$3"
          width="80%"
          $sm={{ width: "100%" }}
        >
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
              placeholder="email@example.com"
              rules={{ required: "Email is required" }}
            />

            <Theme inverse>
              <Form.Trigger asChild disabled={loading}>
                <Button
                  width="60%"
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
          <Dialog.Close asChild>
            <Button width="60%" self="center">
              Cancel
            </Button>
          </Dialog.Close>
        </View>
      </Dialog.Content>
    </Dialog.Portal>
  );
};
