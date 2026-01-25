import { Button } from "tamagui";
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
  const handleToggle = () => {
    onModeChange(mode === "voice" ? "text" : "voice");
  };

  return (
    <Button
      size="$4"
      circular
      variant="outlined"
      borderColor="$color5"
      borderWidth={1}
      onPress={handleToggle}
      disabled={disabled}
      opacity={disabled ? 0.5 : 1}
      icon={mode === "voice" ? <Keyboard size={24} /> : <Mic size={24} />}
    />
  );
}
