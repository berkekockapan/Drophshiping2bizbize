import type { D1Database, D1PreparedStatement } from "../../src/config/bindings";

type WrappedStatement = D1PreparedStatement & {
  __query: string;
};

function createWrappedStatement(
  query: string,
  statement: D1PreparedStatement,
  shouldFail: (query: string) => boolean,
  consumeFailure: () => void,
): WrappedStatement {
  return {
    __query: query,
    bind(...values: unknown[]) {
      return createWrappedStatement(query, statement.bind(...values), shouldFail, consumeFailure);
    },
    async first<T = Record<string, unknown>>() {
      return statement.first<T>();
    },
    async all<T = Record<string, unknown>>() {
      return statement.all<T>();
    },
    async run() {
      if (shouldFail(query)) {
        consumeFailure();
        throw new Error("Network connection lost");
      }

      return statement.run();
    },
  };
}

export function createFlakyD1(db: D1Database, matchers: string[], failCount = 1): D1Database {
  let remaining = failCount;
  const normalizedMatchers = matchers.map((matcher) => matcher.toLowerCase());

  function shouldFail(query: string) {
    return remaining > 0 && normalizedMatchers.some((fragment) => query.toLowerCase().includes(fragment));
  }

  function consumeFailure() {
    remaining -= 1;
  }

  return {
    prepare(query: string) {
      return createWrappedStatement(query, db.prepare(query), shouldFail, consumeFailure);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]) {
      const shouldBatchFail = statements.some((statement) => shouldFail((statement as Partial<WrappedStatement>).__query ?? ""));

      if (shouldBatchFail) {
        consumeFailure();
        throw new Error("Network connection lost");
      }

      if (db.batch) {
        return db.batch<T>(statements);
      }

      return Promise.all(statements.map((statement) => statement.run())) as Promise<T[]>;
    },
    ...(db.exec ? { exec: db.exec.bind(db) } : {}),
  };
}
