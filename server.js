const express = require("express");       // Web server framework
const http = require("http");             // Create HTTP server
const { Server } = require("socket.io");  // Socket.IO for browser communication
const WebSocket = require("ws");          // WebSocket for Max/MSP

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*" 
  }
});

app.use(express.static("web"));

// When browser connects
io.on("connection", (socket) => {
  console.log("Browser connected");
});

// WebSocket server (for Max/MSP → Node)
const wss = new WebSocket.Server({ port: 7000 });

wss.on("connection", (ws) => {
  console.log("Max connected");

  // Receive data from Max
  ws.on("message", (message) => {
    const text = message.toString().trim();
    console.log("From Max:", text);

    const parts = text.split(" ").map(Number);

    if (parts.length >= 3 && parts.every(v => !Number.isNaN(v))) {
      io.emit("max-data", {
        bass: parts[0],
        high: parts[1],
        high2: parts[2]
      });
    } else {
      // Fallback: single value → send to all bands
      const value = parseFloat(text);

      if (!Number.isNaN(value)) {
        io.emit("max-data", {
          bass: value,
          high: value,
          high2: value
        });
      }
    }
  });
});

// Start HTTP server (for browser)
server.listen(3001, () => {
  console.log("Web server running at http://localhost:3001");
  console.log("Max websocket listening at ws://localhost:7000");
});