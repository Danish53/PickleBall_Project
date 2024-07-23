import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import { dbConnection } from "./database/dbConnection.js";
import { errorMiddleware } from "./middleware/error.js";
import userRouter from "./router/userRouter.js";
import adminRouter from "./router/adminRouter.js";
import chatRouter from "./router/chatRoutes.js";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import initSocket from "./webSocket/index.js";
import { isSocketAuthenticated } from "./middleware/socketAuthentication.js";
import productroutes from "./router/marketPlaceRouter.js";

const app = express();
dotenv.config({ path: "./.env" });

const server = http.createServer(app);
const io = new Server(server);

app.use(
  cors({
    origin: [process.env.FRONTEND_URL] || "*",
    methods: ["GET", "PUT", "DELETE", "POST"],
    credentials: true,
  })
);


// io.on("connection", (socket) => {
//   console.log("A user connected:", socket.id);

//   socket.on('disconnect', () => {
//     console.log("A user disconnected:", socket.id);
//   });
// });


app.use(cookieParser());
app.use(express.json());
app.use(compression());
app.use(express.urlencoded({ limit: "16kb", extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: "dhfhhffh84883ddn", // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, 
  })
);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get("/", function(req, res){
   res.sendFile(__dirname + "/public/index.html"); 
});

//routes

// admin
app.use("/admin", adminRouter);
// user
app.use("/api/v1/user", userRouter); 
// chat
app.use("/api/v1/chat", chatRouter); 
// Market Place
app.use("/api/v1/product", productroutes); 

dbConnection();

app.use(errorMiddleware);


initSocket(io);

io.use(isSocketAuthenticated);

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
 

export default app;
