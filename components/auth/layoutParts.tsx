import { View, styled } from "tamagui";

export const FormCard = styled(View, {
  tag: "form",
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
