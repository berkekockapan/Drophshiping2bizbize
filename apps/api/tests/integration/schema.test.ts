import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { schemaTableNames } from "../../src/db/schema";

const migrationPath = fileURLToPath(new URL("../../drizzle/0000_initial.sql", import.meta.url));

describe("schema integration", () => {
  it("creates all MVP tables", () => {
    const database = new DatabaseSync(":memory:");
    const migrationSql = readFileSync(migrationPath, "utf8");

    database.exec(migrationSql);

    const tables = database
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(expect.arrayContaining([...schemaTableNames]));
  });
});
