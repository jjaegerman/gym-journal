import OpenAI from 'https://deno.land/x/openai@v4.24.0/mod.ts'

const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { query } = await req.json()
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const openai = new OpenAI({
    apiKey: apiKey,
  })

  // Documentation here: https://github.com/openai/openai-node
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: query }],
    // Choose model from here: https://platform.openai.com/docs/models
    model: 'gpt-3.5-turbo',
    stream: false,
  })

  const reply = chatCompletion.choices[0].message.content

  
  return new Response(reply, {
    headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
  })
})