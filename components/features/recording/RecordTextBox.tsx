import { useState } from "react";
import { View, Button, TextArea, Spinner } from "tamagui";
import { SendHorizontal } from "@tamagui/lucide-icons";
import { useExerciseSubmit } from "@/lib/hooks";

export const RecordTextBox = () => {
  const [text, setText] = useState("");
  const { submitText, loading } = useExerciseSubmit();

  const handleSubmit = async () => {
    if (!text.trim()) return;

    await submitText(text);
    setText("");
  };

  return (
    <View style={{ width: "80%" }}>
      <View>
        <TextArea
          value={text}
          onChangeText={setText}
          placeholder="Or type it out..."
          onSubmitEditing={handleSubmit}
          numberOfLines={5}
          style={{ fontSize: 16, paddingRight: 55 }}
        />
      </View>
      <Button
        style={{ position: "absolute", right: 4, bottom: 4 }}
        onPress={handleSubmit}
        icon={loading ? Spinner : SendHorizontal}
        size="$4"
        disabled={loading || !text.trim()}
      />
    </View>
  );
};
