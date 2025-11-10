import { useState } from "react";
import { AnimatePresence, Button, H1, Spinner, Theme, View } from "tamagui";
import { Form } from "@/components/ui/forms";
import { FormCard } from "./layoutParts";
import { useToastController } from "@tamagui/toast";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/hooks";

export default function ChangePasswordForm() {
  const toast = useToastController();
  const router = useRouter();
  const { updatePassword, loading } = useAuth();
  const [complete, setComplete] = useState(false);

  async function handleUpdatePassword({ password }: { password: string }) {
    const { error } = await updatePassword(password);
    if (!error) {
      setComplete(true);
      router.push("/");
    }
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
          Change password
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
              handleUpdatePassword({
                password: data.password,
              });
            }}
            defaultValues={{
              password: "",
              confirmPassword: "",
            }}
          >
            <Form.Input
              name="password"
              label="New Password"
              placeholder="Enter new password"
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
              label="Confirm New Password"
              placeholder="Confirm new password"
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
                  Reset Password
                </Button>
              </Form.Trigger>
            </Theme>
          </Form>
        </View>
      </View>
    </FormCard>
  );
}
