import { View, styled } from "tamagui";
import { useMedia } from "tamagui";
import type { MediaQueryKey } from "@tamagui/web";

export const FormCard = styled(View, {
  tag: "form",
  flex: 1,
  maxW: "100%",
  p: "$6",
  bg: "$background",
  $sm: {
    p: "$0",
  },
  $xs: {
    paddingInline: "$1",
  },
});
