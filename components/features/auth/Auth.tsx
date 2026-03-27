import React from "react";
import { View, H1, H2, H4, useMedia, getTokens } from "tamagui";
import GoogleButton from "./GoogleButton";
import AppleButton from "./AppleButton";
import { FormCard } from "./layoutParts";
import { Spacer } from "@/components/ui/layout";

export default function Auth() {
  const media = useMedia();
  const tokens = getTokens();
  const buttonHeight = media.xs
    ? tokens.size.$4.val
    : tokens.size.$8.val;

  return (
    <View bg="$background" width="70%" $xs={{ width: "90%" }} self="center">
      <Spacer size="$10" />
      <FormCard>
        <View
          bg="$background"
          items="center"
          gap={media.xs ? "$6" : "$10"}
          p={media.xs ? "$4" : "$8"}
          width="100%"
          rounded="$5"
        >
          <View items="center" gap="$2">
            <H4 size={media.xs ? "$4" : "$7"}>Welcome to</H4>
            {media.xs ? (
              <H2 self="center" text="center">
                Gym Journal
              </H2>
            ) : (
              <H1 self="center" text="center">
                Gym Journal
              </H1>
            )}
          </View>
          <View width="80%" items="center" gap={media.xs ? "$3" : "$5"}>
            <AppleButton height={buttonHeight} />
            <GoogleButton height={buttonHeight} />
          </View>
        </View>
      </FormCard>
    </View>
  );
}
