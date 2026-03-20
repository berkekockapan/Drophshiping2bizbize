import { createConnectorServer } from "./server";

async function bootstrap() {
  const context = createConnectorServer();

  await context.server.listen({
    host: context.config.host,
    port: context.config.port,
  });

  context.server.log.info(
    `Connector running at http://${context.config.host}:${context.config.port} (${context.config.provider})`,
  );
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});