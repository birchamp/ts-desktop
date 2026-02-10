import initSqlJs from 'sql.js';
import { readFile, writeFile } from './files';

type SqlJsFactory = (config: { locateFile: (file: string) => string }) => Promise<any>;
type SqlJsModule = {
  Database: new (data?: Uint8Array | number[] | ArrayBuffer) => any;
};

type SqlValue = string | number | Uint8Array | null;
export type SqlParams = SqlValue[] | Record<string, SqlValue>;

export interface DatabaseHandle {
  exec(sql: string): void;
  run(sql: string, params?: SqlParams): void;
  all<T = any>(sql: string, params?: SqlParams): T[];
  get<T = any>(sql: string, params?: SqlParams): T | null;
  transaction<T>(fn: (db: DatabaseHandle) => T): T;
  save(): Promise<boolean>;
}

function bindParams(stmt: any, params?: SqlParams) {
  if (!params) return;
  stmt.bind(params as any);
}

export async function openDatabase(relPath: string, schemaSql?: string): Promise<DatabaseHandle> {
  const sqlJsValue = initSqlJs as unknown;
  const sqlJsObject =
    sqlJsValue && typeof sqlJsValue === 'object' ? (sqlJsValue as Record<string, unknown>) : null;
  const sqlJsDefault = sqlJsObject?.default as SqlJsFactory | SqlJsModule | undefined;

  let SQL: SqlJsModule;
  if (typeof sqlJsValue === 'function') {
    SQL = await (sqlJsValue as SqlJsFactory)({ locateFile: f => `/${f}` });
  } else if (sqlJsValue && typeof (sqlJsValue as SqlJsModule).Database === 'function') {
    SQL = sqlJsValue as SqlJsModule;
  } else if (typeof sqlJsDefault === 'function') {
    SQL = await (sqlJsDefault as SqlJsFactory)({ locateFile: f => `/${f}` });
  } else if (sqlJsDefault && typeof (sqlJsDefault as SqlJsModule).Database === 'function') {
    SQL = sqlJsDefault as SqlJsModule;
  } else {
    throw new Error('sql.js initialization function is unavailable');
  }

  const existing = await readFile(relPath);
  const db = existing ? new SQL.Database(existing) : new SQL.Database();

  if (!existing && schemaSql) {
    db.exec(schemaSql);
  }

  function exec(sql: string) {
    db.exec(sql);
  }

  function run(sql: string, params?: SqlParams) {
    const stmt = db.prepare(sql);
    try {
      bindParams(stmt, params);
      stmt.step();
    } finally {
      stmt.free();
    }
  }

  function all<T = any>(sql: string, params?: SqlParams): T[] {
    const stmt = db.prepare(sql);
    const rows: T[] = [];
    try {
      bindParams(stmt, params);
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as T);
      }
    } finally {
      stmt.free();
    }
    return rows;
  }

  function get<T = any>(sql: string, params?: SqlParams): T | null {
    const stmt = db.prepare(sql);
    try {
      bindParams(stmt, params);
      if (!stmt.step()) return null;
      return stmt.getAsObject() as T;
    } finally {
      stmt.free();
    }
  }

  function transaction<T>(fn: (handle: DatabaseHandle) => T): T {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const result = fn(handle);
      db.exec('COMMIT;');
      return result;
    } catch (error) {
      db.exec('ROLLBACK;');
      throw error;
    }
  }

  async function save() {
    const data = db.export();
    return await writeFile(relPath, data);
  }

  const handle: DatabaseHandle = { exec, run, all, get, transaction, save };
  return handle;
}
