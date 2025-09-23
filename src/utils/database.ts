import initSqlJs from 'sql.js';
import { readFile, writeFile } from './files';

export interface DatabaseHandle {
  exec(sql: string): void;
  query<T = any>(sql: string): T[];
  save(): Promise<boolean>;
}

export async function openDatabase(relPath: string, schemaSql?: string): Promise<DatabaseHandle> {
  const SQL = await initSqlJs({ locateFile: (f) => `/${f}` });
  const existing = await readFile(relPath);
  const db = existing ? new SQL.Database(existing) : new SQL.Database();

  if (!existing && schemaSql) {
    db.exec(schemaSql);
  }

  function exec(sql: string) {
    db.exec(sql);
  }

  function query<T = any>(sql: string): T[] {
    const res = db.exec(sql);
    if (!res || res.length === 0) return [];
    const [{ columns, values }] = res;
    return values.map((row: any[]) => Object.fromEntries(row.map((v, i) => [columns[i], v])) as T);
  }

  async function save() {
    const data = db.export();
    return await writeFile(relPath, data);
  }

  return { exec, query, save };
}

