import { PubSub } from "graphql-subscriptions";
import { coverageOptions, quotes, nextId } from "./data.js";

// PubSub is an in-memory event bus for GraphQL Subscriptions.
// In production you'd replace this with Redis or a message broker.
export const pubsub = new PubSub();

const QUOTE_STATUS_UPDATED = "QUOTE_STATUS_UPDATED";

export const resolvers = {
  Query: {
    // Returns coverage options, optionally filtered by lineOfBusiness.
    // REST equivalent: GET /api/coverages?lob=auto  (but you'd get ALL fields — no control)
    // GraphQL: client asks for only the fields it needs in the query string.
    coverageOptions: (_, { lineOfBusiness }) => {
      if (!lineOfBusiness) return coverageOptions;
      return coverageOptions.filter((c) => c.lineOfBusiness === lineOfBusiness);
    },

    quote: (_, { id }) => quotes.find((q) => q.id === id) ?? null,

    quotes: () => quotes,
  },

  Mutation: {
    // createQuote — called by the form submit button OR by Vapi's submit_quote tool call.
    // This is a GraphQL Mutation: it changes server state and returns the new object.
    createQuote: (_, { input }) => {
      const selected = coverageOptions.filter((c) =>
        input.coverageIds.includes(c.id)
      );
      const total = selected.reduce((sum, c) => sum + c.monthlyPremium, 0);

      const quote = {
        id: nextId(),
        lineOfBusiness: input.lineOfBusiness,
        applicantName: input.applicantName,
        applicantEmail: input.applicantEmail,
        selectedCoverages: selected,
        totalMonthlyPremium: parseFloat(total.toFixed(2)),
        status: "draft",
        createdAt: new Date().toISOString(),
        aiPersonalized: input.aiPersonalized ?? false,
      };

      quotes.push(quote);
      return quote;
    },

    // submitQuote — transitions a draft quote to "submitted" then simulates approval.
    // The status change is broadcast via GraphQL Subscription so the UI updates live.
    submitQuote: async (_, { id }) => {
      const quote = quotes.find((q) => q.id === id);
      if (!quote) throw new Error(`Quote ${id} not found`);

      quote.status = "submitted";
      pubsub.publish(QUOTE_STATUS_UPDATED, { quoteStatusUpdated: { ...quote } });

      // Simulate async underwriting decision (1.5s delay)
      setTimeout(() => {
        quote.status = "approved";
        pubsub.publish(QUOTE_STATUS_UPDATED, {
          quoteStatusUpdated: { ...quote },
        });
      }, 1500);

      return quote;
    },
  },

  Subscription: {
    // Clients subscribe to real-time status updates for a specific quote.
    // REST equivalent would require polling GET /api/quotes/:id every N seconds.
    quoteStatusUpdated: {
      subscribe: (_, { id }) =>
        pubsub.asyncIterator([QUOTE_STATUS_UPDATED]),
      resolve: (payload, { id }) => {
        // Only emit to subscribers watching this specific quote
        if (payload.quoteStatusUpdated.id === id) {
          return payload.quoteStatusUpdated;
        }
        return null;
      },
    },
  },
};
