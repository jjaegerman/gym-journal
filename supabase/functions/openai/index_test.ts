// Run with: deno test --no-lock --node-modules-dir=none --allow-env index_test.ts
// Intercept startup so tests exercise the actual handler without opening a port.
let handleRequest: (req: Request) => Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((handler: typeof handleRequest) => {
  handleRequest = handler;
  return {};
}) as typeof Deno.serve;
try {
  await import("./index.ts");
} finally {
  Deno.serve = originalServe;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("workout request processing", async (t) => {
  const originalFetch = globalThis.fetch;
  const env = {
    SUPABASE_URL: "http://localhost:54321",
    SUPABASE_ANON_KEY: "test-key",
    OPENAI_API_KEY: "test-key",
  };
  const originalEnv = Object.fromEntries(
    Object.keys(env).map((key) => [key, Deno.env.get(key)]),
  );
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);

  let status = "completed";
  let output = JSON.stringify({
    items: [{
      input: "Run for 30 minutes",
      exercise_kind: "Running",
      duration: "PT30M",
    }],
  });
  let rpcFails = false;
  let saves = 0;
  globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.endsWith("/responses")) {
      const request = JSON.parse(String((init as { body?: unknown })?.body));
      const duration = request.text.format.schema.properties.items.anyOf[0]
        .items.properties.duration.anyOf[0];
      assert(
        duration.type === "string" && !duration.format && !duration.pattern,
        "Model duration schema must omit unsupported format/pattern constraints",
      );
      return Response.json({
        id: "response-test",
        object: "response",
        status,
        incomplete_details: status === "completed"
          ? null
          : { reason: "max_output_tokens" },
        output: [{
          type: "message",
          status,
          role: "assistant",
          content: [
            { type: "output_text", text: output, annotations: [] },
          ],
        }],
      });
    }
    assert(url.includes("/rest/v1/rpc/"), `Unexpected network request: ${url}`);
    saves++;
    if (rpcFails) {
      return Response.json({ message: "Submission failed" }, { status: 500 });
    }
    const body = JSON.parse(String((init as { body?: unknown })?.body));
    assert(
      body.p_logs[0].duration === "PT30M",
      "Duration must reach storage intact",
    );
    return Response.json("submission-test");
  };
  const request = (body: unknown = { query: "Run for 30 minutes" }) =>
    handleRequest(
      new Request("http://localhost/openai", {
        method: "POST",
        headers: {
          Authorization: "Bearer test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }),
    );
  try {
    await t.step(
      "completed extraction saves a validated submission",
      async () => {
        const response = await request();
        const body = await response.json();
        assert(
          response.status === 200 && body.success && saves === 1,
          "Submission should succeed",
        );
      },
    );
    await t.step(
      "empty incomplete output returns a JSON error without saving",
      async () => {
        status = "incomplete";
        output = "";
        const response = await request();
        const body = await response.json();
        assert(
          response.status === 502 && body.error.includes("incomplete"),
          "Expected descriptive upstream error",
        );
        assert(saves === 1, "Incomplete output must never be saved");
      },
    );
    await t.step(
      "invalid ISO duration is still rejected before saving",
      async () => {
        status = "completed";
        output = JSON.stringify({
          items: [{
            input: "Run",
            exercise_kind: "Running",
            duration: "30 minutes",
          }],
        });
        const response = await request();
        assert(
          response.status === 500 && (await response.json()).error,
          "Invalid duration must fail validation",
        );
        assert(saves === 1, "Invalid duration must never be saved");
      },
    );
    await t.step("database errors return JSON with CORS headers", async () => {
      output = JSON.stringify({
        items: [{ input: "Run", exercise_kind: "Running", duration: "PT30M" }],
      });
      rpcFails = true;
      const response = await request();
      assert(
        response.status === 500 &&
          (await response.json()).error === "Submission failed",
        "Expected database error",
      );
      assert(
        response.headers.get("Access-Control-Allow-Origin") === "*",
        "Error must be readable on web",
      );
    });
    await t.step("input validation errors include CORS headers", async () => {
      const response = await request({});
      assert(
        response.status === 400 && (await response.json()).error,
        "Missing input must fail",
      );
      assert(
        response.headers.get("Access-Control-Allow-Origin") === "*",
        "Validation error must be readable on web",
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
});
