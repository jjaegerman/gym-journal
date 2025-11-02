import { View, styled } from "tamagui";
import { useMedia } from "tamagui";
import type { MediaQueryKey } from "@tamagui/web";

export const FormCard = styled(View, {
  tag: "form",
  flex: 1,
  maxW: "100%",
  p: "$6",
  paddingBlockStart: "$8",
  bg: "$background",
  $sm: {
    p: "$0",
  },
  $xs: {
    paddingInline: "$1",
  },
});

export const Hide = ({
  children,
  when = "sm",
}: {
  children: React.ReactNode;
  when: MediaQueryKey;
}) => {
  const hide = useMedia()[when];

  if (hide) {
    return null;
  }
  return children;
};
