import { Player } from "./coupPlayer";
import { io } from "./socketApp";
import { BroadcastOperator, Server } from "socket.io";

type GameState = string;
//card mapping
//

// action mapping
// action income id 1
// action foreign aid id 2
// action coup id 3
// action tax id 4
// action assassinate id 5
// action exchange id 6
// action steal id 7
// counteraction block foreign aid id 8
// counteraction block assassinate id 9
// counteraction block steal id 10

const actionIdMap = new Map();
actionIdMap.set(4, [13, 14, 15]);
actionIdMap.set(5, [4, 5, 6]);
actionIdMap.set(6, [1, 2, 3]);
actionIdMap.set(7, [7, 8, 9]);
actionIdMap.set(8, [13, 14, 15]);
actionIdMap.set(9, [10, 11, 12]);
actionIdMap.set(10, [1, 2, 3, 7, 8, 9]);

const counteractionMap = new Map();
counteractionMap.set(2, 8);
counteractionMap.set(5, 9);
counteractionMap.set(7, 10);

export class Game {
  private readonly cardsPerDeck = 3;
  private readonly startingBalance = 2;
  private readonly startingHandSize = 2;
  //create randomize deck
  private deck: number[] = this.shuffle([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
  ]);
  private gameState = "waitingAction";
  private chosenAction: string | undefined = undefined;
  private action: Action | undefined = undefined;
  public readonly playerList: Player[];
  private activePlayerIndex: number = 0;
  public readonly io: any; //TODO any to specific type
  //public readonly id: string;

  constructor(public readonly playerIdList: string[], io: Server) {
    //create gameRoom Io socket
    this.io = io.to("1");
    //create player list from user id list
    this.playerList = playerIdList.map(
      (playerId) =>
        new Player(
          playerId,
          this.startingBalance,
          this.drawCard(this.startingHandSize),
          this
        )
    );
    //randomize player list
    this.playerList = this.shuffle(this.playerList);
    //set starting player
  }

  getState(): string {
    return this.gameState;
  }

  setChosenAction(chosenAction: string) {
    this.chosenAction = chosenAction;
  }

  drawCard(count: number) {
    return this.deck.splice(0, count);
  }

  shuffle<T>(array: T[]): T[] {
    var m = array.length,
      t,
      i;

    // While there remain elements to shuffle…
    while (m) {
      // Pick a remaining element…
      i = Math.floor(Math.random() * m--);

      // And swap it with the current element.
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }

    return array;
  }

  transition() {
    switch (this.gameState) {
      case "waitingAction": {
        if (this.chosenAction) {
          switch (this.chosenAction) {
            case "income": {
              this.action = new Income(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
            case "foreign-aid": {
              this.action = new ForeignAid(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
            case "coup": {
              this.action = new Coup(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
            case "tax": {
              this.action = new Tax(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
            case "assassinate": {
              this.action = new Assassinate(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
            case "exchange": {
              this.action = new Exchange(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
            case "steal": {
              this.action = new Steal(
                this,
                this.playerList[this.activePlayerIndex]
              );
              break;
            }
          }
          this.gameState = "resolvingAction";
          this.io.emit("state", "resolvingAction");
        }
      }
      case "resolvingAction": {
        if (this.action?.getState() == "finish") {
          if (this.activePlayerIndex == this.playerList.length - 1) {
            this.activePlayerIndex = 0;
          } else {
            this.activePlayerIndex++;
          }
          this.gameState = "waitingAction";
          this.io.emit("waitingAction");
        } else {
          this.action?.transition();
        }
      }
    }
  }
}

interface Action {
  getActionId(): number;
  transition(): void;
  setActionValid(result: boolean): void;
  getState(): string;
}

class Income implements Action {
  private readonly actionsId = 1;
  private actionValid: boolean = true;
  private actionState: string = "effect";
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }

  getState(): string {
    return this.actionState;
  }

  transition(): void {
    switch (this.actionState) {
      case "effect": {
        this.activePlayer.addBalance(1);
        this.actionState = "finish";
        this.callingGame.io.emit(this.actionsId + "finish");
        this.callingGame.transition();
        break;
      }
      default: {
        throw new Error("State: " + this.actionState + " not supported");
      }
    }
  }
}

class ForeignAid implements Action {
  private readonly actionsId = 2;
  private actionValid: boolean = true;
  private actionState: string = "askForCounterAction";
  private currentPlayerIndex: number = 0;
  private counteractionPlayer: Player | undefined = undefined;
  private counteraction: Counteraction | undefined = undefined;
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }

  getState(): string {
    return this.actionState;
  }

  transition(): void {
    switch (this.actionState) {
      case "askForCounterAction": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.counteractionPlayer === undefined) {
          this.actionState = "effect";
        } else {
          this.actionState = "resolveCounterAction";
        }
        break;
      }
      case "resolveCounterAction": {
        if (this.counteraction?.getState() !== "finish") {
          this.counteraction?.transition();
        } else if (this.actionValid) {
          this.actionState = "effect";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "effect": {
        this.activePlayer.addBalance(1);
        this.actionState = "finish";
        this.callingGame.transition();
        break;
      }
      default: {
        throw new Error("State: " + this.actionState + " not supported");
      }
    }
  }
}

class Coup implements Action {
  private readonly actionsId = 3;
  private actionValid: boolean = true;
  private actionState: string = "choosingTarget";
  private target: Player | undefined = undefined;
  private targetLoseCard: number[] | undefined = undefined;
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }

  getState(): string {
    return this.actionState;
  }

  transition(): void {
    switch (this.actionState) {
      case "choosingTarget": {
        if (this.target !== undefined) {
          this.actionState = "targetLoseInfluence";
        }
        break;
      }
      case "targetLoseInfluence": {
        if (this.targetLoseCard !== undefined && this.target !== undefined) {
          this.target.loseInfluence(this.targetLoseCard);
          this.actionState = "finish";
          this.callingGame.transition();
        }
        break;
      }
      default: {
        throw new Error("State: " + this.actionState + " not supported");
      }
    }
  }
}

class Tax implements Action {
  private readonly actionsId = 4;
  private actionValid: boolean = true;
  private actionState: string = "askingChallenge";
  private currentPlayerIndex: number = 0;
  private challenger: Player | undefined = undefined;
  private challenge: Challenge | undefined = undefined;
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }

  getState(): string {
    return this.actionState;
  }

  transition(): void {
    switch (this.actionState) {
      case "askForChallenge": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.challenger === undefined) {
          this.actionState = "effect";
        } else {
          this.challenge = new Challenge(
            this,
            this.challenger,
            this.activePlayer
          );
          this.actionState = "resolveChallenge";
        }
        this.currentPlayerIndex = 0;
        break;
      }
      case "resolveChallenge": {
        if (this.challenge?.getState() !== "finish") {
          this.challenge?.transition();
        } else if (this.actionValid) {
          this.actionState = "effect";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "effect": {
        this.activePlayer.addBalance(1);
        this.actionState = "finish";
        this.callingGame.transition();
        break;
      }
    }
  }
}

class Assassinate implements Action {
  private readonly actionsId = 5;
  private actionState: string = "choosingTarget";
  private challenger: Player | undefined = undefined;
  private counteractionPlayer: Player | undefined = undefined;
  private target: Player | undefined = undefined;
  private targetLoseCard: number[] | undefined = undefined;
  private actionValid: boolean = true;
  private currentPlayerIndex: number = 0;
  private challenge: Challenge | undefined = undefined;
  private counteraction: Counteraction | undefined = undefined;
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }

  getState(): string {
    return this.actionState;
  }

  transition(): void {
    switch (this.actionState) {
      case "choosingTarget": {
        if (this.target !== undefined) {
          this.actionState = "askForChallenge";
        }
        break;
      }
      case "askForChallenge": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.challenger === undefined) {
          this.activePlayer?.lowerBalance(3);
          this.actionState = "askForCounterAction";
        } else {
          this.challenge = new Challenge(
            this,
            this.challenger,
            this.activePlayer
          );
          this.actionState = "resolveChallenge";
        }
        this.currentPlayerIndex = 0;
        break;
      }
      case "resolveChallenge": {
        if (this.challenge?.getState() !== "finish") {
          this.challenge?.transition();
        } else if (this.actionValid) {
          this.activePlayer?.lowerBalance(3);
          this.actionState = "askForCounterAction";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "askForCounterAction": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.counteractionPlayer === undefined) {
          this.actionState = "targetLoseInfluence";
        } else {
          this.counteraction = new Counteraction(
            this.callingGame,
            this,
            this.counteractionPlayer
          );
          this.actionState = "resolveCounterAction";
        }
        break;
      }
      case "resolveCounterAction": {
        if (this.counteraction?.getState() !== "finish") {
          this.counteraction?.transition();
        } else if (this.actionValid) {
          this.actionState = "targetLoseInfluence";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "targetLoseInfluence": {
        if (this.targetLoseCard !== undefined && this.target !== undefined) {
          this.target.loseInfluence(this.targetLoseCard);
          this.actionState = "finish";
          this.callingGame.transition();
        }
        break;
      }
      default: {
        throw new Error("State: " + this.actionState + " not supported");
      }
    }
  }
}

class Exchange implements Action {
  private readonly actionsId = 6;
  private actionValid: boolean = true;
  private actionState: string = "askingChallenge";
  private currentPlayerIndex: number = 0;
  private challenger: Player | undefined = undefined;
  private challenge: Challenge | undefined = undefined;
  private chosenCards: number[] | undefined = undefined;
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }
  getState(): string {
    return this.actionState;
  }
  transition(): void {
    switch (this.actionState) {
      case "askForChallenge": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.challenger === undefined) {
          this.actionState = "effect";
        } else {
          this.challenge = new Challenge(
            this,
            this.challenger,
            this.activePlayer
          );
          this.actionState = "resolveChallenge";
        }
        this.currentPlayerIndex = 0;
        break;
      }
      case "resolveChallenge": {
        if (this.challenge?.getState() !== "finish") {
          this.challenge?.transition();
        } else if (this.actionValid) {
          this.actionState = "effect";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "effect": {
        this.activePlayer.addHand(this.callingGame.drawCard(2));
        this.actionState = "choosingDiscard";
        break;
      }
      case "choosingDiscard": {
        if (this.chosenCards) {
          this.activePlayer.discardHand(this.chosenCards);
          this.actionState = "finish";
          this.callingGame.transition();
        }
        break;
      }
      default: {
        throw new Error("State: " + this.actionState + " not supported");
      }
    }
  }
}

class Steal implements Action {
  private readonly actionsId = 7;
  private actionState: string = "choosingTarget";
  private challenger: Player | undefined = undefined;
  private counteractionPlayer: Player | undefined = undefined;
  private target: Player | undefined = undefined;
  private targetLoseCard: number[] | undefined = undefined;
  private actionValid: boolean = true;
  private currentPlayerIndex: number = 0;
  private challenge: Challenge | undefined = undefined;
  private counteraction: Counteraction | undefined = undefined;
  constructor(
    public readonly callingGame: Game,
    public readonly activePlayer: Player
  ) {}

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionsId;
  }
  getState(): string {
    return this.actionState;
  }

  transition(): void {
    switch (this.actionState) {
      case "choosingTarget": {
        if (this.target !== undefined) {
          this.actionState = "askForChallenge";
        }
        break;
      }
      case "askForChallenge": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.challenger === undefined) {
          this.actionState = "askForCounterAction";
        } else {
          this.challenge = new Challenge(
            this,
            this.challenger,
            this.activePlayer
          );
          this.actionState = "resolveChallenge";
        }
        this.currentPlayerIndex = 0;
        break;
      }
      case "resolveChallenge": {
        if (this.challenge?.getState() !== "finish") {
          this.challenge?.transition();
        } else if (this.actionValid) {
          this.actionState = "askForCounterAction";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "askForCounterAction": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.counteractionPlayer === undefined) {
          this.actionState = "effect";
        } else {
          this.counteraction = new Counteraction(
            this.callingGame,
            this,
            this.counteractionPlayer
          );
          this.actionState = "resolveCounterAction";
        }
        break;
      }
      case "resolveCounterAction": {
        if (this.counteraction?.getState() !== "finish") {
          this.counteraction?.transition();
        } else if (this.actionValid) {
          this.actionState = "effect";
        } else {
          this.callingGame.transition();
        }
        break;
      }
      case "effect": {
        if (this.target !== undefined) {
          this.activePlayer.addBalance(2);
          this.target.lowerBalance(2);
          this.actionState = "finish";
          this.callingGame.transition();
        }
        break;
      }
      default: {
        throw new Error("State: " + this.actionState + " not supported");
      }
    }
  }
}

class Challenge {
  private challengeState: string;
  private LoseCard: number[] | undefined = undefined;
  constructor(
    private callingAction: Action,
    public readonly challenger: Player,
    public readonly target: Player
  ) {
    let targetBluff = this.target
      .getHand()
      .some((handCardId) =>
        actionIdMap.get(this.callingAction.getActionId()).includes(handCardId)
      );
    this.challengeState = targetBluff
      ? "targetLoseInfluence"
      : "ChallengerLoseInfluence";
  }

  getState(): string {
    return this.challengeState;
  }

  transition(): void {
    switch (this.challengeState) {
      case "targetLoseInfluence": {
        if (this.LoseCard !== undefined) {
          this.target.loseInfluence(this.LoseCard);
          this.callingAction.setActionValid(false);
          this.challengeState = "finish";
          this.callingAction.transition();
        }
        break;
      }
      case "challengerLoseInfluence": {
        if (this.LoseCard !== undefined) {
          this.challenger.loseInfluence(this.LoseCard);
          this.challengeState = "finish";
          this.callingAction.transition();
        }
        break;
      }
      default: {
        throw new Error("State: " + this.challengeState + " not supported");
      }
    }
  }
}

class Counteraction implements Action {
  private counteractionState: string = "askForChallenge";
  private currentPlayerIndex: number = 0;
  private challenge: Challenge | undefined = undefined;
  private actionId: number;
  private challenger: Player | undefined = undefined;
  private actionValid = true;

  constructor(
    private callingGame: Game,
    private callingAction: Action,
    public readonly counteractionPlayer: Player
  ) {
    this.actionId = counteractionMap.get(this.callingAction.getActionId());
  }

  setActionValid(result: boolean): void {
    this.actionValid = result;
  }

  getActionId(): number {
    return this.actionId;
  }

  getState(): string {
    return this.counteractionState;
  }

  transition(): void {
    switch (this.counteractionState) {
      case "askForChallenge": {
        if (
          this.currentPlayerIndex !==
          this.callingGame.playerList.length - 1
        ) {
          this.currentPlayerIndex++;
        } else if (this.challenger === undefined) {
          this.counteractionState = "effect";
        } else {
          this.challenge = new Challenge(
            this,
            this.challenger,
            this.counteractionPlayer
          );
          this.counteractionState = "resolveChallenge";
        }
        this.currentPlayerIndex = 0;
        break;
      }

      case "resolveChallenge": {
        if (this.challenge?.getState() !== "finish") {
          this.challenge?.transition();
        } else if (this.actionValid) {
          this.callingAction.setActionValid(false);
          this.counteractionState = "finish";
          this.callingAction.transition();
        } else {
          this.counteractionState = "finish";
          this.callingAction.transition();
        }
        break;
      }
      default: {
        throw new Error("State: " + this.counteractionState + " not supported");
      }
    }
  }
}
