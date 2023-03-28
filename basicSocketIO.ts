import express, { Request, Response } from "express";
import session from "express-session";
import http from "http";
import { print } from "listening-on";
import socket from "socket.io";
import path from "path";
import createGameFunction from "./gameHandler";
import { Game } from "./coupGame";
declare module "express-session" {
  interface SessionData {
    key: string;
  }
}

const app = express();
const server = http.createServer(app);
const io = new socket.Server(server);

/* -------------------------------- init game ------------------------------- */
let game = new Game(["1", "2", "3", "4", "5", "6"], io);

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

app.get("/coup", (req: Request, res: Response) => {
  res.sendFile(path.resolve("Public", "coup-game.html"));
});

type GameJson = {
  my: { id: string; hand: number[]; balance: number };
  otherPlayerList: { id: string; balance: number }[];
};

const { income, foreignAid, coup, tax, assassinate, exchange, steal } =
  createGameFunction();

io.on("connection", (socket) => {
  game.playerList[0].setSocket(socket);
  socket.join("1");
  // const req = socket.request as express.Request;
  // req.session.key = "XXX";
  // req.session.save();
  let gameJson: GameJson = {
    my: {
      id: game.playerList[0].userID,
      hand: game.playerList[0].getHand(),
      balance: game.playerList[0].getBalance(),
    },
    otherPlayerList: [],
  };
  let i = 0;
  for (let player of game.playerList) {
    if (player.userID !== game.playerList[0].userID) {
      gameJson.otherPlayerList[i] = {
        id: player.userID,
        balance: player.getBalance(),
      };
      i++;
    }
  }
  socket.emit("init", gameJson);
  socket.on("askInit", () => {});

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
  socket.on("income", () => {
    game.setChosenAction("income");
    console.log(game.getState());
    game.transition();
    console.log(game.getState());
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
  print(8000);
});
