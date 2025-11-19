import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      isDone: a.boolean(),
    })
    .authorization(allow => [allow.publicApiKey()]),
  Groupings: a
    .model({
      contracts: a.string().array(),
      expenseTypes: a.string().array(),
      companies: a.string().array(),
      resourceGroups: a.string().array(),
      resourceTypes: a.string().array(),
    })
    .authorization(allow => [allow.publicApiKey()]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});