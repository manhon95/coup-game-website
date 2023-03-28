const socket = io();

const income = document.querySelector("#income");
const foreignAid = document.querySelector("#foreign-aid");
const coup = document.querySelector("#coup");
const tax = document.querySelector("#tax");
const assassinate = document.querySelector("#assassinate");
const exchange = document.querySelector("#exchange");
const steal = document.querySelector("#steal");

const msgBox = document.querySelector("#message-box");

const cardPathMap = [
  "/img/ambassador.jpg",
  "/img/assassin.jpg",
  "/img/captain.jpg",
  "/img/contessa.jpg",
  "/img/duke.jpg",
];

socket.on("init", function (msg) {
  init(msg);
});

async function init(game) {
  const myInfo = document.querySelector("#my-info");
  myInfo.id = `player-${game.my.id}-info`;
  const myCard1 = document.querySelector(`#player-${game.my.id}-info #card-1`);
  const myCard2 = document.querySelector(`#player-${game.my.id}-info #card-2`);
  const myBalance = document.querySelector(
    `#player-${game.my.id}-info #balance`
  );
  console.log(game.my.hand);
  myCard1.src = cardPathMap[Math.floor(parseInt(game.my.hand[0]) / 3)];
  myCard2.src = cardPathMap[Math.floor(parseInt(game.my.hand[1]) / 3)];
  myBalance.textContent = game.my.balance;

  let playersInfo = document.querySelector("#players-1-info");
  playersInfo.id = `player-${game.otherPlayerList[0].id}-info`;
  document.querySelector(
    `#player-${game.otherPlayerList[0].id}-info #balance`
  ).textContent = game.otherPlayerList[0].balance;

  for (let i = 1; i < game.otherPlayerList.length; i++) {
    playersInfo = playersInfo.cloneNode(true);
    playersInfo.id = `player-${game.otherPlayerList[i].id}-info`;
    document.getElementById("players-info-board").appendChild(playersInfo);
    document.querySelector(
      `#player-${game.otherPlayerList[i].id}-info #balance`
    ).textContent = game.otherPlayerList[i].balance;
  }
}

income.addEventListener("click", function (event) {
  socket.emit("income", "1");
});

foreignAid.addEventListener("click", function (event) {
  socket.emit("foreignAid", "called");
});

coup.addEventListener("click", function (event) {
  socket.emit("coup", "called");
});

tax.addEventListener("click", function (event) {
  socket.emit("tax", "called");
});

assassinate.addEventListener("click", function (event) {
  socket.emit("assassinate", "called");
});

exchange.addEventListener("click", function (event) {
  socket.emit("exchange", "called");
});

steal.addEventListener("click", function (event) {
  socket.emit("steal", "called");
});

socket.on("addBalance", function (msg) {
  const myBalance = document.querySelector(
    `#player-${msg.userID}-info #balance`
  );
  msgBox.innerHTML += `User ${msg.userID} balance add ${msg.amount}<br>`;
  myBalance.textContent = msg.balance;
});
