declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: any;
  }
  export default function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
}

