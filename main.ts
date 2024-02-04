const channel = "chat-broadcast-channel";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (url.pathname === "/chat") {
      return sseResponse();
    }
    if (url.pathname === "/") {
      let html = await Deno.readTextFile("./index.html");
      const headers: { [key: string]: string } = {};
      for (const [key, value] of req.headers.entries()) {
        headers[key] = value;
      }
      html = html.replace("__HEADERS__", JSON.stringify(headers, null, 2));
      return new Response(html, { headers: { "Content-Type": "text/html" } });
    }
    return new Response("Not found", { status: 404 });
  }

  if (req.method === "POST") {
    if (url.pathname === "/chat") {
      const broadcast = new BroadcastChannel(channel);
      broadcast.postMessage(await req.text());
      broadcast.close();
      return Response.json("ok");
    }
    return new Response("Not found", { status: 404 });
  }

  return new Response("Method not allowed", { status: 405 });
});

function sseResponse() {
  const broadcast = new BroadcastChannel(channel);
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  };
  const encoder = new TextEncoder();
  const keep_alive_comment = encoder.encode(": keepalive\n\n");

  const stream = new ReadableStream({
    start(controller) {
      broadcast.onmessage = ({ data }: MessageEvent) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.enqueue(keep_alive_comment);
      };
    },
    cancel() {
      broadcast.close();
    }
  });
  return new Response(stream, { headers });
}
