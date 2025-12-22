import React from "react";
import { View, H1, Card, H2, H3, H4 } from "tamagui";
import GoogleButton from "./GoogleButton";
import AppleButton from "./AppleButton";
import { FormCard } from "./layoutParts";
import { Spacer } from "@/components/ui/layout";

export default function Auth() {
  return (
    <View bg="$background" width="70%" $sm={{ width: "90%" }} self="center">
      <Spacer size="$10" />
      <FormCard>
        <View
          bg="$background"
          items="center"
          gap="$6"
          p="$4"
          width="100%"
          rounded="$5"
        >
          <View items="center">
            <H4>Welcome to </H4>
            <H2 self="center" text="center">
              Gym Journal
            </H2>
          </View>
          <View width="80%" items="center" gap="$3">
            <AppleButton />
            <GoogleButton />
          </View>
        </View>
      </FormCard>
    </View>
  );
}
