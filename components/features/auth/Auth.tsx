import React from "react";
import { View, H1 } from "tamagui";
import GoogleButton from "./GoogleButton";
import { FormCard } from "./layoutParts";
import { Spacer } from "@/components/ui/layout";

export default function Auth() {
  return (
    <View bg="$background" width="70%" $sm={{ width: "90%" }} self="center">
      <Spacer size="$10" />
      <FormCard>
        <View
          bg="$backgroundHover"
          items="center"
          gap="$4"
          p="$4"
          width="100%"
          rounded="$5"
        >
          <H1 self="center" size="$8" textAlign="center">
            Gym Journal
          </H1>
          <View width="80%" items="center">
            <GoogleButton />
          </View>
        </View>
      </FormCard>
    </View>
  );
}
