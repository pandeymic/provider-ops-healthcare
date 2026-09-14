import fs from 'fs'; import path from 'path'; import { pool } from './store';
if(!pool){ console.log('No DATABASE_URL; migration skipped for preview mode.'); process.exit(0); }
const db=pool;
db.query(fs.readFileSync(path.join(__dirname,'../../migrations/001_initial.sql'),'utf8')).then(()=>{console.log('Migration complete'); return db.end();}).catch(e=>{console.error(e);process.exit(1);});
