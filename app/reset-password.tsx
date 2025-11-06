import ChangePasswordForm from "components/auth/ChangePasswordForm";
import { Spacer, View } from "tamagui";

export default function Page() {
  return (
    <View bg="$background" width="60%" self="center">
      <Spacer size="$10" />
      <ChangePasswordForm />
    </View>
  );
}
