import { describe, expect, it } from "vitest";

import { schemaTableNames } from "../../src/db/schema";
import { createTestEnv } from "../support/sqlite";

describe("schema integration", () => {
  it("creates all MVP tables", () => {
    const { sqlite: database } = createTestEnv();

    const columns = database
      .prepare("pragma table_info(products)")
      .all() as Array<{ name: string; dflt_value: string | null }>;

    expect(columns).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "is_favorite", dflt_value: "0" })]),
    );
    const tables = database
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all() as Array<{ name: string }>;

    expect(tables.map((table) => table.name)).toEqual(expect.arrayContaining([...schemaTableNames]));
  });
});
