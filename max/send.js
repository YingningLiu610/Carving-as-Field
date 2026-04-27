const maxApi = require("max-api");   // Max/MSP communication API
const WebSocket = require("ws");     // WebSocket client

// Connect to Node.js websocket server
let ws = new WebSocket("ws://localhost:7000");

ws.on("open", () => {
  maxApi.post("send.js connected to websocket server");
});

ws.on("error", (err) => {
  maxApi.post("websocket error: " + err.message);
});

maxApi.addHandler("send", (...args) => {
  const msg = args.join(" ");

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(msg);
    maxApi.post("sent: " + msg);
  } else {
    maxApi.post("websocket not open yet");
  }
});