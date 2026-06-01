import { gql } from '@apollo/client/core';

// GraphQL Mutation — changes server state (creates a quote) and returns the new object.
// REST equivalent: POST /api/quotes  (but you'd get ALL fields back — no control)
export const CREATE_QUOTE_MUTATION = gql`
  mutation CreateQuote($input: QuoteInput!) {
    createQuote(input: $input) {
      id
      lineOfBusiness
      applicantName
      applicantEmail
      totalMonthlyPremium
      status
      createdAt
      aiPersonalized
      selectedCoverages {
        id
        name
        monthlyPremium
      }
    }
  }
`;

// GraphQL Mutation — transitions a quote to "submitted" and triggers async approval
export const SUBMIT_QUOTE_MUTATION = gql`
  mutation SubmitQuote($id: ID!) {
    submitQuote(id: $id) {
      id
      status
    }
  }
`;
