import { useState } from "react";
import { View, Button, TextArea, Spinner, XStack } from "tamagui";
import { SendHorizontal } from "@tamagui/lucide-icons";
import { useExerciseSubmit } from "@/lib/hooks";
import { Keyboard } from "react-native";

export const RecordTextBox = ({
  submitText,
  loading,
}: {
  submitText: (text: string) => Promise<any>;
  loading: boolean;
}) => {
  const [text, setText] = useState("");

  const handleSubmit = async () => {
    if (!text.trim()) return;

    Keyboard.dismiss();
    await submitText(text);
    setText("");
  };

  return (
    <View width="100%">
      <TextArea
        value={text}
        onChangeText={setText}
        placeholder="Type your workout log..."
        numberOfLines={4}
        size="$4"
        rounded="$4"
        paddingInlineEnd="$10"
        returnKeyType="done"
        blurOnSubmit={true}
        onSubmitEditing={handleSubmit}
      />
      <Button
        position="absolute"
        r="$2"
        b="$2"
        onPress={handleSubmit}
        icon={SendHorizontal}
        size="$3"
        disabled={loading || !text.trim()}
        circular
        chromeless={!text.trim()}
      />
    </View>
  );
};
