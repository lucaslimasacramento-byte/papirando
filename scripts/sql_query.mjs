// Uso: node scripts/sql_query.mjs "select ..."   (ou: node scripts/sql_query.mjs -f arquivo.sql)
import fs from 'node:fs';
import { requireCredentials, sql } from './lib/supabaseAdmin.mjs';
requireCredentials({ service: false });
const args = process.argv.slice(2);
const query = args[0] === '-f' ? fs.readFileSync(args[1], 'utf8') : args.join(' ');
const rows = await sql(query);
console.log(JSON.stringify(rows, null, 1));
