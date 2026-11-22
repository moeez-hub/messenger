const express = require("express");
const http = require("http");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

fs.mkdirSync("uploads", { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: "uploads",
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // max 25MB
  fileFilter: (req, file, cb) => {
    cb(null, /^(image|video)\//.test(file.mimetype));
  },
});

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.post("/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err || !req.file) {
      return res.status(400).json({ error: "File nahi gayi (max 25MB, sirf photo ya video)" });
    }
    res.json({
      url: "/uploads/" + req.file.filename,
      type: req.file.mimetype.startsWith("video/") ? "video" : "image",
    });
  });
});

let messages = [];
if (fs.existsSync("messages.json")) {
  messages = JSON.parse(fs.readFileSync("messages.json", "utf8"));
}

io.on("connection", (socket) => {
  socket.emit("history", messages);

  socket.on("chat message", (data) => {
    const msg = {
      name: String(data.name || "Anjaan").slice(0, 30),
      text: String(data.text || "").slice(0, 2000),
    };
    if (data.fileUrl && /^\/uploads\/[\w.-]+$/.test(data.fileUrl)) {
      msg.fileUrl = data.fileUrl;
      msg.fileType = data.fileType === "video" ? "video" : "image";
    }
    if (!msg.text && !msg.fileUrl) return;

    messages.push(msg);
    if (messages.length > 200) messages.shift();
    fs.writeFileSync("messages.json", JSON.stringify(messages));
    io.emit("chat message", msg);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log("Server chal raha hai: http://localhost:3000");
});
