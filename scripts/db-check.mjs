process.loadEnvFile('.env.local')
const { neon } = await import('@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`select tablename from pg_tables where schemaname='public' order by 1`
console.log('existing public tables:', rows.length)
if (rows.length) console.log(rows.map(r => r.tablename).join(', '))
const v = await sql`select version()`
console.log(v[0].version.split(' ').slice(0,2).join(' '))
