import express from "express";
import session from "express-session";
import http from "http";
import socket from "socket.io";
import path from "path";
import createGameFunction from "./gameHandler";

const app = express();
const server = http.createServer(app);
export const io = new socket.Server(server);

const sessionMiddleware = session({
  secret: "alpha-secret",
  resave: true,
  saveUninitialized: true,
});
app.use(express.static("Public"));
app.use(sessionMiddleware);

io.use((socket, next) => {
  let req = socket.request as express.Request;
  let res = req.res as express.Response;
  sessionMiddleware(req, res, next as express.NextFunction);
});

app.get("/coup", (req, res) => {
  res.sendFile(path.resolve("Public", "coup-game.html"));
});

const { income, foreignAid, coup, tax, assassinate, exchange, steal } =
  createGameFunction();

io.on("connection", (socket) => {
  socket.join("room-name");
  console.log("socket", socket);
  const req = socket.request as express.Request;
  req.session.key = "XXX";
  req.session.save();
  console.log("a user connected");
  socket.on("income", (msg) => {
    console.log(msg);
    socket.emit("updateBalance", "1");
  });
  socket.on("foreignAid", foreignAid);
  socket.on("coup", coup);
  socket.on("tax", tax);
  socket.on("assassinate", assassinate);
  socket.on("exchange", exchange);
  socket.on("steal", steal);
});
app.get("/checkSession", (req, res) => {
  console.log("sessionID", req.sessionID);
  console.log("sessionKey", req.session.key);
  res.send(req.session.key);
});

server.listen(8000, () => {
  console.log("listening on *:8000");
});
