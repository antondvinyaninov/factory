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
  await run("pnpm", ["--filter", "api", "db:push"])
}

if (process.env.SEED_ADMIN === "true") {
  await run("pnpm", ["--filter", "api", "db:seed:admin"])
}

const webServerPath = [
  "apps/web/.next/standalone/apps/web/server.js",
  "apps/web/.next/standalone/server.js",
].find((path) => existsSync(path))

if (!webServerPath) {
  throw new Error("Next.js standalone server was not found. Run web build first.")
}

start("API", "node", ["apps/api/dist/main.js"], {
  PORT: process.env.API_PORT ?? "3001",
})

start("Web", "node", [webServerPath], {
  HOSTNAME: process.env.HOSTNAME ?? "0.0.0.0",
  PORT: process.env.PORT ?? "3000",
})
