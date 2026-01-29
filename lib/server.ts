export async function startServer(port: number, rootDir: string,assets:any) {
  return Bun.serve({
    port,
    fetch(req) {
      return new Response("Asset Master Dashboard Placeholder");
    },
  });
}