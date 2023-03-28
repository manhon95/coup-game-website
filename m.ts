Monito.openSocket(9183); // Socket.IO server on port 9183

declare var io: any;

let chimp = new Monito({
  memory: {},
  initialState: "waitAction",
  states: {
    waitAction: function(next) => {
      io.once("action", (action) => {
        this.memory.action=action
        next(null, "waitAnswer_1");
      });
    },

    waitAnswer_1: (next) => {
      io.once("answer_1", (answer) => {
        next(null, "waitAnswer_2");
      });
    },

    register: (next) => {
      io.once("profile");

      next(null, "getProfile"); // Go straight to the state "getProfile"
    },
    getProfile: (next) => {
      next(
        null,
        {
          browse: 4, // If your dice rolls 4 or more, go to "browse"
        },
        "shop"
      ); // Otherwise, by default, go to "shop"
    },
    browse: (next) => {
      next(
        null,
        {
          browse: (monito) => 6, // You can also use functions
        },
        "shop"
      );
    },
    shop: (next) => {
      next(null, "logout"); // Go straight to the state "logout"
    },
    logout: (next) => {
      next(); // This will be the last state
    },
  },
});

chimp.start();
