import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Text, View, Input, Button } from 'tamagui'

export default function CallFunc() {
  const callFunction = async (query: string) => {
    const { data, error } = await supabase.functions.invoke('openai', {
      body: {
        query: query,
      },
    })

    if (error) {
      console.error('Error calling function:', error)
      return
    }
    setResponseText(JSON.stringify(data))
  }
  const [responseText, setResponseText] = useState('')
  const [query, setQuery] = useState('')

  return (
    <View flex={1} items="center" justify="center" bg="$background">
      <Text fontSize={20} color="$blue10">
        Call Supabase Function
      </Text>
      <Input
        placeholder="Enter your query"
        width={300}
        mb={20}
        onChangeText={(text) => setQuery(text)}
      />
      <Button onPress={() => callFunction(query)}>Call Function</Button>
      <Text>Response: {responseText}</Text>
    </View>
  )
}


