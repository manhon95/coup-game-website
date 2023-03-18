import express, { Request, Response } from "express";
import * as game from "./game";

const app = express();

app.use(express.static("/Public"));

app.get("/Start", function (req: Request, res: Response) {});

app.get("/Income", function (req: Request, res: Response) {});

app.get("/ForeignAid", function (req: Request, res: Response) {
  game.handleForeignAid();
});
app.get("/Coup", function (req: Request, res: Response) {});
app.get("/Tax", function (req: Request, res: Response) {});
app.get("/Assassinate", function (req: Request, res: Response) {});
app.get("/Exchange", function (req: Request, res: Response) {});
app.get("/Steal", function (req: Request, res: Response) {});

app.get("/Challenge", function (req: Request, res: Response) {});

app.get("/Pass", function (req: Request, res: Response) {});

app.get("/AmbassadorBlock", function (req: Request, res: Response) {});
app.get("/CaptainBlock", function (req: Request, res: Response) {});
app.get("/ContessaBlock", function (req: Request, res: Response) {});
app.get("/DukeBlock", function (req: Request, res: Response) {});

app.get("/Player1", function (req: Request, res: Response) {});
app.get("/Player2", function (req: Request, res: Response) {});
app.get("/Player3", function (req: Request, res: Response) {});
app.get("/Player4", function (req: Request, res: Response) {});
app.get("/Player5", function (req: Request, res: Response) {});
app.get("/Player6", function (req: Request, res: Response) {});
