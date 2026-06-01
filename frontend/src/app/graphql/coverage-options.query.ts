import { gql } from '@apollo/client/core';

// GraphQL Query — fetches only the fields this component needs.
// REST equivalent: GET /api/coverages?lob=auto  (returns ALL fields — no control)
// With GraphQL, the client declares exactly what it wants: id, name, description, etc.
export const COVERAGE_OPTIONS_QUERY = gql`
  query GetCoverageOptions($lineOfBusiness: LineOfBusiness) {
    coverageOptions(lineOfBusiness: $lineOfBusiness) {
      id
      name
      description
      monthlyPremium
      recommended
      lineOfBusiness
    }
  }
`;
