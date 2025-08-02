import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

import { Client } from 'pg'

async function resetDatabase() {
  const replaced = process.env.DATABASE_URL?.replace('veleiro', 'postgres')
  const client = new Client({
    connectionString: replaced,
  })

  try {
    await client.connect()
    await client.query(
      `SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'veleiro_test_2' AND pid <> pg_backend_pid();`,
    )

    await client.query(`DROP DATABASE IF EXISTS veleiro_test;`)
    await client.query(`CREATE DATABASE veleiro_test;`)
  } finally {
    await client.end()
  }
}

async function runMigrations() {
  const replaced = process.env.DATABASE_URL?.replace('veleiro', 'veleiro_test')
  const client = new Client({
    connectionString: replaced,
  })

  try {
    await client.connect()

    const migrationsPath = join(process.cwd(), 'prisma', 'migrations')

    const migrationFolders = await readdir(migrationsPath, { withFileTypes: true }).then(
      (entries) =>
        entries
          .filter((entry) => entry.isDirectory() && entry.name !== '__pycache__')
          .map((entry) => entry.name)
          .sort(),
    )

    for (const folder of migrationFolders) {
      const migrationFile = join(migrationsPath, folder, 'migration.sql')

      try {
        const sqlContent = await readFile(migrationFile, 'utf-8')

        await client.query(sqlContent)

        console.log(`✅ Migration ${folder} executed successfully`)
      } catch (error) {
        console.error(`❌ Error executing migration ${folder}:`, error)
        throw error
      }
    }

    console.log('🎉 All migrations executed successfully!')
  } finally {
    await client.end()
  }
}

export default async () => {
  await resetDatabase()
  await runMigrations()
}
