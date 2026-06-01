import { gql } from '@apollo/client/core';

// GraphQL Subscription — real-time push over WebSocket.
// REST equivalent would require polling GET /api/quotes/:id every N seconds.
// With subscriptions, the server pushes updates the moment the status changes.
export const QUOTE_STATUS_SUBSCRIPTION = gql`
  subscription OnQuoteStatusUpdated($id: ID!) {
    quoteStatusUpdated(id: $id) {
      id
      status
      totalMonthlyPremium
    }
  }
`;
