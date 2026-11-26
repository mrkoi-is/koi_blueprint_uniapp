import { execFile } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function launchWindows(
  automator,
  cliPath,
  projectPath,
  servicePort,
) {
  // DevTools uses distinct ports for its CLI service and its automation socket.
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const closed = once(server, "close");
  server.close();
  await closed;

  // cmd /s strips the outer quotes. The quoted environment references keep
  // paths (including spaces and &) intact without constructing shell source from them.
  const serviceOption = servicePort
    ? " --port %KOI_DEVTOOLS_SERVICE_PORT%"
    : "";
  const command =
    '""%KOI_DEVTOOLS_BATCH%" auto --project "%KOI_DEVTOOLS_PROJECT%"' +
    " --auto-port %KOI_DEVTOOLS_AUTO_PORT% --trust-project" +
    serviceOption +
    '"';
  await execFileAsync(
    process.env.ComSpec ?? "cmd.exe",
    ["/d", "/s", "/v:off", "/c", command],
    {
      windowsVerbatimArguments: true,
      windowsHide: true,
      timeout: 45_000,
      env: {
        ...process.env,
        KOI_DEVTOOLS_BATCH: cliPath,
        KOI_DEVTOOLS_PROJECT: projectPath,
        KOI_DEVTOOLS_AUTO_PORT: String(port),
        KOI_DEVTOOLS_SERVICE_PORT: servicePort ?? "",
      },
    },
  );

  const wsEndpoint = `ws://127.0.0.1:${port}`;
  const deadline = Date.now() + 45_000;
  for (;;) {
    try {
      return await automator.connect({ wsEndpoint });
    } catch (error) {
      // connect() also checks SDK compatibility. Surface that error immediately.
      if (
        !error.message.startsWith(`Failed connecting to ${wsEndpoint}`) ||
        Date.now() >= deadline
      )
        throw error;
      await delay(250);
    }
  }
}
