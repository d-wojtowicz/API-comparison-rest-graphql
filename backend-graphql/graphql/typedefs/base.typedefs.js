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

  # Custom directives for authorization
  directive @auth(requires: Role = USER) on FIELD_DEFINITION

  enum Role {
    USER
    ADMIN
    SUPERADMIN
  }
`; 