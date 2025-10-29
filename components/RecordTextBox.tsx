import { useState } from "react";
import { TextInput, TouchableHighlight } from "react-native";
import { View, Text, Button, TextArea } from "tamagui";
import { SendHorizontal } from "@tamagui/lucide-icons";

export const RecordTextBox = () => {
  const [emailId, setEmailId] = useState("");

  return (
    <View style={{ width: "80%" }}>
      <View>
        <TextArea
          value={emailId}
          onChangeText={(emailId) => {
            setEmailId(emailId);
          }}
          placeholder="Or type it out..."
          onSubmitEditing={() => {}}
          numberOfLines={5}
          style={{ fontSize: 16, paddingRight: 55 }}
        />
      </View>
      <Button
        style={{ position: "absolute", right: 4, bottom: 4 }}
        onPress={() => {}}
        icon={SendHorizontal}
        size="$4"
      />
    </View>
  );
};
