import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi"

const server = express();

server.use(cors());
server.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
  await mongoClient.connect();
} catch (err) {
  console.log(err.message);
}
const db = mongoClient.db();

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
    });

    const { error } = schema.validate({ name });
    if (error) return res.status(422).send({ message: error.message });

    const participantExists = await db.collection("participants").findOne({ name });
    if (participantExists) return res.status(409).send({ message: "Este participante já está cadastrado na sala." });
    
    const now = new Date();
    const participantData = { name, lastStatus: now };

    await db.collection("participants").insertOne(participantData);

    const messageData = {
      from: name,
      to: "Todos",
      text: "entrou na sala...",
      type: "status",
      time: dayjs(now).format("HH:mm:ss"),
    };

    await db.collection("messages").insertOne(messageData);
    res.sendStatus(201);

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});
const PORT = 5000;
server.listen(PORT);
