import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";

const server = express();

server.use(cors());
server.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URL);

let db;
mongoClient
  .connect()   
  .then(() => ((db) = mongoClient.db))
  .catch((err) => console.log(err.message));

server.post("/participants", async (req, res) => {

  const { name } = req.body;
  const now = new Date();
  const participantData = { name, lastStatus: now };

  await db.collections("participants").insertOne(participantData);

  const messageData = {
    from: name,
    to: "Todos",
    text: "entrou na sala...",
    type: "status",
    time: dayjs(now).format("HH:mm:ss"),
  };

  await db.collections("messages").insertOne(messageData);
  res.sendStatus(201);
});
const PORT = 5000;
server.listen(PORT);
