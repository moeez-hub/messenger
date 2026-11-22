const express = require("express");
const http = require("http");
const fs = require("fs");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let messages = [];
if (fs.existsSync("messages.json")) {
  messages = JSON.parse(fs.readFileSync("messages.json", "utf8"));
}

io.on("connection", (socket) => {
  socket.emit("history", messages);

  socket.on("chat message", (data) => {
    messages.push(data);
    if (messages.length > 200) messages.shift();
    fs.writeFileSync("messages.json", JSON.stringify(messages));
    io.emit("chat message", data);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server chal raha hai: http://localhost:3000");
});
