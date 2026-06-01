// Vapi Tool Call Handlers
// When the Vapi voice agent calls a tool (e.g. fill_form_field),
// Vapi sends a POST to this backend. We process it and broadcast
// the event to the Angular frontend via Server-Sent Events (SSE).

// Active SSE client connections: Map<sessionId, res>
export const sseClients = new Map();

// Broadcast a tool-call event to the Angular frontend for a given session
function broadcastToClient(sessionId, eventType, payload) {
  const client = sseClients.get(sessionId);
  if (!client) {
    console.warn(`No SSE client for session ${sessionId}`);
    return;
  }
  client.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
}

// Vapi sends tool call results back as { result: string }
// We return a string result to Vapi so it can continue the conversation.
export function handleVapiToolCall(toolName, args, sessionId) {
  switch (toolName) {
    case "fill_form_field": {
      // Voice agent collected a field value — push it to the Angular form
      const { field, value } = args;
      broadcastToClient(sessionId, "fill_form_field", { field, value });
      return `Filled ${field} with "${value}".`;
    }

    case "highlight_coverage": {
      // Voice agent wants to visually highlight a coverage option
      const { coverageId, reason } = args;
      broadcastToClient(sessionId, "highlight_coverage", { coverageId, reason });
      return `Highlighted coverage: ${coverageId}.`;
    }

    case "advance_step": {
      // Voice agent moves the wizard to the next step
      const { step } = args;
      broadcastToClient(sessionId, "advance_step", { step });
      return `Advanced to step: ${step}.`;
    }

    case "submit_quote": {
      // Voice agent completed the form — trigger GraphQL mutation on frontend
      const { coverageIds } = args;
      broadcastToClient(sessionId, "submit_quote", { coverageIds });
      return "Quote submission triggered.";
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

// Tool definitions sent to Vapi when creating the assistant
// Vapi uses these to know what functions the agent can call
export const vapiToolDefinitions = [
  {
    type: "function",
    function: {
      name: "fill_form_field",
      description: "Fill a specific field in the insurance quote form based on what the user just said.",
      parameters: {
        type: "object",
        properties: {
          field: {
            type: "string",
            description: "The form field name, e.g. lineOfBusiness, applicantName, applicantEmail, vehicleYear, vehicleMake",
          },
          value: {
            type: "string",
            description: "The value to put in the field",
          },
        },
        required: ["field", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "highlight_coverage",
      description: "Visually highlight a coverage option card on the UI to draw the user's attention to it.",
      parameters: {
        type: "object",
        properties: {
          coverageId: {
            type: "string",
            description: "The coverage ID to highlight, e.g. collision, dwelling, term-life",
          },
          reason: {
            type: "string",
            description: "Brief reason why this coverage is relevant to this client",
          },
        },
        required: ["coverageId", "reason"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "advance_step",
      description: "Move the quote wizard to the next step after collecting all required info for the current step.",
      parameters: {
        type: "object",
        properties: {
          step: {
            type: "string",
            description: "The step to navigate to, e.g. coverage-selection, applicant-info, summary",
          },
        },
        required: ["step"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_quote",
      description: "Submit the completed quote after collecting all required information from the user.",
      parameters: {
        type: "object",
        properties: {
          coverageIds: {
            type: "array",
            items: { type: "string" },
            description: "List of coverage IDs the user wants to include",
          },
        },
        required: ["coverageIds"],
      },
    },
  },
];
