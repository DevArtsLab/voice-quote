import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, split } from '@apollo/client/core';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideApollo(() => {
      const httpLink = inject(HttpLink);

      // HTTP link for queries and mutations
      const http = httpLink.create({ uri: environment.graphqlHttpUrl });

      // WebSocket link for GraphQL Subscriptions (real-time quote status)
      const ws = new GraphQLWsLink(createClient({ url: environment.graphqlWsUrl }));

      // Route subscription operations to ws, everything else to http
      const link = split(
        ({ query }) => {
          const def = getMainDefinition(query);
          return def.kind === 'OperationDefinition' && def.operation === 'subscription';
        },
        ws,
        http,
      );

      return { link, cache: new InMemoryCache() };
    }),
  ],
};
