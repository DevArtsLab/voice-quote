import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
// Apollo Server v5 — same import paths, fully compatible with express4 middleware
import { makeExecutableSchema } from "@graphql-tools/schema";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { resolvers } from "./resolvers.js";
import { generateUISpec } from "./genui.js";
import {
  handleVapiToolCall,
  sseClients,
  vapiToolDefinitions,
} from "./vapi-tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const typeDefs = readFileSync(path.join(__dirname, "schema.graphql"), "utf8");

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:4200",
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// --- WebSocket server for GraphQL Subscriptions ---
const wsServer = new WebSocketServer({ server: httpServer, path: "/graphql" });
const serverCleanup = useServer({ schema }, wsServer);

// --- Apollo Server (HTTP queries + mutations) ---
const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await apolloServer.start();
app.use("/graphql", expressMiddleware(apolloServer));

// --- Public config endpoint: exposes only what the frontend needs ---
// The VAPI_API_KEY here is the public/web key (safe to expose to browsers).
// The ANTHROPIC_API_KEY never leaves the backend.
app.get("/api/config", (_req, res) => {
  res.json({
    vapiPublicKey: process.env.VAPI_API_KEY ?? "",
    vapiAssistantId: process.env.VAPI_ASSISTANT_ID ?? "",
  });
});

// --- Vapi tool definitions endpoint ---
// Returns the JSON tool definitions to paste into the Vapi dashboard
app.get("/api/vapi-tools", (_req, res) => {
  res.json({ tools: vapiToolDefinitions });
});

// --- Vapi assistant config helper ---
// Returns a ready-to-use assistant config blob for the Vapi dashboard
app.get("/api/vapi-assistant-config", (req, res) => {
  const webhookUrl =
    req.query.webhookUrl || "https://YOUR-NGROK-URL/api/vapi-webhook";
  res.json({
    name: "QuoteAI Assistant",
    model: {
      provider: "anthropic",
      model: "claude-opus-4-5",
      systemPrompt: `You are a friendly insurance quote assistant for QuoteAI. Your job is to help users build an insurance quote step by step through a voice conversation.

You have access to the following tools to control the UI:
- fill_form_field: set a form field (lineOfBusiness, applicantName, applicantEmail)
- highlight_coverage: visually highlight a coverage option the user should consider
- advance_step: move the wizard to the next step (coverage-selection, applicant-info, summary)
- submit_quote: submit the completed quote

Workflow:
1. Greet the user warmly and ask what type of insurance they need (auto, home, or life).
2. Call fill_form_field with field=lineOfBusiness and the value they chose, then advance_step to coverage-selection.
3. Explain the available coverages briefly. Use highlight_coverage to draw attention to recommended ones.
4. Ask for their name and email. Call fill_form_field for each, then advance_step to applicant-info.
5. Once you have all info, call advance_step to summary, then ask if they are ready to submit.
6. If yes, call submit_quote with the selected coverageIds.

Keep responses short and conversational. Do not read out long lists — reference the screen instead.`,
      tools: vapiToolDefinitions,
    },
    voice: {
      provider: "11labs",
      voiceId: "rachel",
    },
    serverUrl: webhookUrl,
    serverUrlSecret: "",
    metadata: {},
  });
});

// --- REST endpoint: Generate UI spec via Claude ---
// POST /api/generate-ui  body: { lineOfBusiness, priorClaims, commuteDistance, vehicleAge }
app.post("/api/generate-ui", async (req, res) => {
  try {
    const spec = await generateUISpec(req.body);
    res.json(spec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SSE endpoint: Angular subscribes here to receive Vapi tool-call events ---
// GET /api/events?sessionId=xxx
app.get("/api/events", (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).send("sessionId required");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.set(sessionId, res);

  // Send a heartbeat every 25s to keep connection alive
  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.delete(sessionId);
  });
});

// --- Vapi webhook: receives tool calls from the voice agent ---
// POST /api/vapi-webhook
app.post("/api/vapi-webhook", (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "No message" });

  // Vapi sends tool call events as message.type === "tool-calls"
  if (message.type === "tool-calls") {
    const sessionId = message.call?.id;
    if (!sessionId)
      return res.status(400).json({ error: "No call ID in message" });

    const results = message.toolCallList.map((tc) => ({
      toolCallId: tc.id,
      result: handleVapiToolCall(
        tc.function.name,
        tc.function.arguments,
        sessionId,
      ),
    }));

    return res.json({ results });
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 GraphQL server ready at http://localhost:${PORT}/graphql`);
  console.log(
    `📡 GraphQL subscriptions ready at ws://localhost:${PORT}/graphql`,
  );
  console.log(
    `🤖 GenUI endpoint: POST http://localhost:${PORT}/api/generate-ui`,
  );
  console.log(
    `🎙️  Vapi webhook: POST http://localhost:${PORT}/api/vapi-webhook`,
  );
  console.log(
    `📺 SSE events: GET http://localhost:${PORT}/api/events?sessionId=xxx`,
  );
});
