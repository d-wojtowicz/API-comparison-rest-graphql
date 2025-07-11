import { gql } from 'graphql-tag';

export const baseTypeDefs = gql`
  type Query {
    _empty: String
  }

  type Mutation {
    _empty: String
  }

  type Subscription {
    _empty: String
  }

  scalar DateTime

  # Pagination types
  type PageInfo {
    hasNextPage: Boolean!
    nextCursor: String
    limit: Int!
  }

  input PaginationInput {
    cursor: String
    limit: Int
  }

  # Custom directives
  directive @auth(requires: Role = USER) on FIELD_DEFINITION
  directive @rateLimit(max: Int!, window: Int!) on FIELD_DEFINITION
  directive @defer on FIELD_DEFINITION

  enum Role {
    USER
    ADMIN
    SUPERADMIN
  }
`; 