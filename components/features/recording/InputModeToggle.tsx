import { Button, useMedia, getTokenValue } from "tamagui";
import { Mic, Keyboard } from "@tamagui/lucide-icons";
import type { InputMode } from "@/lib/storage/inputMode";

interface InputModeToggleProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled?: boolean;
}

export function InputModeToggle({
  mode,
  onModeChange,
  disabled,
}: InputModeToggleProps) {
  const media = useMedia();
  const iconSize = getTokenValue(media.gtXs ? "$2" : "$1.5", "size");
  const handleToggle = () => {
    onModeChange(mode === "voice" ? "text" : "voice");
  };

  return (
    <Button
      size="$4"
      $gtXs={{ size: "$6" }}
      circular
      variant="outlined"
      borderColor="$color5"
      borderWidth={1}
      onPress={handleToggle}
      disabled={disabled}
      opacity={disabled ? 0.5 : 1}
      icon={mode === "voice" ? <Keyboard size={iconSize} /> : <Mic size={iconSize} />}
    />
  );
}
