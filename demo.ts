import { Socket } from "socket.io";

export abstract class FSM<E> {
  currentState = this.init();

  constructor() {}

  abstract init(): State<E>;

  onEvent(event: E): void {
    this.currentState = this.currentState.onEvent(event);
  }
}

export abstract class State<E> {
  abstract onEvent(event: E): State<any>;
}

export class GameEvent {
  constructor(public playerIdx: number) {}
}

export class GameStateMachine extends FSM<GameEvent> {
  playerList: Player[];

  init() {
    return new GameWaitAction(this);
  }

  constructor(sockets: Socket[]) {
    super();
    this.playerList = sockets.map(
      (socket, i) => new Player(socket, i + 1, this)
    );
  }
}

export class ReceivedActionEvent extends GameEvent {
  constructor(playerIdx: number, public action: string) {
    super(playerIdx);
  }
}

export class Player {
  constructor(
    public socket: Socket,
    public playerIndex: number,
    public game: GameStateMachine
  ) {
    this.socket.on("action", (action: string) => {
      this.game.onEvent(new ReceivedActionEvent(this.playerIndex, action));
    });
    this.socket.on("answer", (answer: boolean) => {
      this.game.onEvent(
        new ReceivedChallengeAnswerEvent(this.playerIndex, answer)
      );
    });
  }
}

export class GameWaitAction extends State<GameEvent> {
  constructor(public game: GameStateMachine) {
    super();
  }
  onEvent(event: GameEvent): State<any> {
    if (event instanceof ReceivedActionEvent) {
      return new GameWaitChallengeAnswer(this.game, 1);
    }
    return this;
  }
}

export class ReceivedChallengeAnswerEvent extends GameEvent {
  constructor(playerIndex: number, public answer: boolean) {
    super(playerIndex);
  }
}

export class GameWaitChallengeAnswer extends State<GameEvent> {
  constructor(
    public game: GameStateMachine,
    public waitForPlayerIndex: number
  ) {
    super();
  }
  onEvent(event: GameEvent): State<any> {
    if (event instanceof ReceivedChallengeAnswerEvent) {
      if (event.playerIdx == this.waitForPlayerIndex) {
        if (this.waitForPlayerIndex == 4) {
          return new GameWaitAction(this.game);
        } else {
          return new GameWaitChallengeAnswer(
            this.game,
            this.waitForPlayerIndex + 1
          );
        }
      }
    }
    return this;
  }
}
