import express from 'express';
import { main } from '.';
import { shutdownApp } from './app';

// vi.mock('ioredis');

// vi.mock('express', () => {
//   const original = vi.requireActual('express');
//   const listen = vi.fn();
//   const fn = (): any => {
//     const app = original();
//     app.listen = listen;
//     return app;
//   };
//   fn.Router = original.Router;
//   fn.json = original.json;
//   fn.text = original.text;
//   fn.urlencoded = original.urlencoded;
//   fn.listen = listen;
//   return fn;
// });

// vi.mock('pg', () => {
//   const original = vi.requireActual('express');

//   class MockPoolClient {
//     async query(sql: string): Promise<any> {
//       if (sql === 'SELECT "version" FROM "DatabaseMigration"') {
//         return { rows: [{ version: 1000000 }] };
//       }
//       if (sql === 'SELECT "User"."id", "User"."content" FROM "User" WHERE "deleted"=$1 LIMIT 1') {
//         return { rows: [{ id: '1', content: '{}' }] };
//       }
//       return { rows: [] };
//     }

//     release(): void {
//       // Nothing to do
//     }
//   }

//   class MockPool {
//     async connect(): Promise<MockPoolClient> {
//       return new MockPoolClient();
//     }

//     async query(sql: string): Promise<any> {
//       return (await this.connect()).query(sql);
//     }

//     end(): void {
//       // Nothing to do
//     }
//   }

//   return {
//     ...original,
//     Pool: MockPool,
//   };
// });

describe('Server', () => {
  test('Main', async () => {
    await main('file:medplum.config.json');
    expect((express as any).listen).toHaveBeenCalledWith(8103);
    await shutdownApp();
  });
});
