import { spawn } from "node:child_process"
import { existsSync } from "node:fs"

const processes = new Set()

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    })

    child.on("exit", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

async function runWithRetry(command, args, { attempts = 20, delayMs = 3000 } = {}) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await run(command, args)
      return
    } catch (error) {
      lastError = error
      console.log(
        `${command} ${args.join(" ")} failed, retry ${attempt}/${attempts}`,
      )

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError
}

function start(name, command, args, env) {
  const child = spawn(command, args, {
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  })

  processes.add(child)

  child.on("exit", (code, signal) => {
    processes.delete(child)

    if (process.exitCode === undefined) {
      process.exitCode = code ?? (signal ? 1 : 0)
      stopAll()
    }
  })

  console.log(`${name} started with pid ${child.pid}`)
  return child
}

function stopAll() {
  for (const child of processes) {
    child.kill("SIGTERM")
  }
}

process.on("SIGINT", stopAll)
process.on("SIGTERM", stopAll)

if (process.env.RUN_DB_PUSH === "true") {
  await runWithRetry("pnpm", ["--filter", "api", "db:push"])
}

if (process.env.SEED_ADMIN === "true") {
  await runWithRetry("pnpm", ["--filter", "api", "db:seed:admin"])
}

const webServerPath = [
  "apps/web/.next/standalone/apps/web/server.js",
  "apps/web/.next/standalone/server.js",
].find((path) => existsSync(path))

if (!webServerPath) {
  throw new Error("Next.js standalone server was not found. Run web build first.")
}

const apiServerPath = [
  "apps/api/dist/src/main.js",
  "apps/api/dist/main.js",
].find((path) => existsSync(path))

if (!apiServerPath) {
  throw new Error("NestJS server was not found. Run api build first.")
}

start("API", "node", [apiServerPath], {
  PORT: process.env.API_PORT ?? "3001",
})

start("Web", "node", [webServerPath], {
  HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  PORT: process.env.PORT ?? "3000",
})
