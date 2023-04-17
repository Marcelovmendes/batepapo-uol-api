import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";

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

    const participantExists = await db
      .collection("participants")
      .findOne({ name });
    if (participantExists)
      return res
        .status(409)
        .send({ message: "Este participante já está cadastrado na sala." });

    const participantData = { name, lastStatus: Date.now() };

    await db.collection("participants").insertOne(participantData);
    console.log(participantData);

    const messageData = {
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    };

    await db.collection("messages").insertOne(messageData);
    console.log(messageData);
    res.sendStatus(201);
  } catch (err) {
    console.log(err.message);
    res.status(500).send({ message: "Erro interno do servidor." });
  }
});
server.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    if (participants.length === 0) return res.send([]);
    res.send(participants);
  } catch (err) {
    console.log(err);
    res.sendStatus(err);
  }
});

server.post("/messages", async (req, res) => {

  const from = req.header("User") || req.header("user");
  
  try {
    const schema = Joi.object({
      to: Joi.string().required(),
      text: Joi.string().required(),
      type: Joi.string().valid("message", "private_message").required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(422).send(error.details[0].message);
    const time = dayjs().format("HH:mm:ss");
    value.time = time;

    if(from === undefined) return res.sendStatus(422);

    await db.collection("messages").insertOne({
      from,
      ...value,
    });
    console.log(value);
    console.log(from);
    res.status(201).send();
  } catch (err) {
    console.log(err);
    res.status(500).send("Erro interno do servidor");
  }
});

server.get("/messages", async (req, res) => {
  try {
    const { headers, query } = req;

    const user = headers.user;

    const messageQuery = {
      $or: [
        { to: "Todos" },
        { from: user },
        { to: user, type: "private_message" },
      ],
    };
    const limit = query.limit ? parseInt(query.limit) : null;

    if (limit !== null && (isNaN(limit) || limit <= 0)) {
      res.status(422).send("Parametro invalido");
      return;
    }

    let messages;

    if (limit === null) {
      messages = await db
        .collection("messages")
        .find(messageQuery)
        .sort({ time: 1 })
        .toArray();
    } else {
      messages = await db
        .collection("messages")
        .find(messageQuery)
        .sort({ time: 1 })
        .limit(limit)
        .toArray();
    }
    console.log("user:", user);
    console.log("mensagens:", messages);
    res.send(messages);
  } catch (err) {
    console.log(err);
    res.status(500).send("Erro interno do servidor");
  }
});

server.post("/status", async (req, res) => {
  const user = req.header("User") || req.header("user");

  try {
    if(user === undefined) return res.sendStatus(422);

    const checkParticipants = await db
      .collection("participants")
      .findOne({ name: user });
    if (!checkParticipants) return res.sendStatus(404);
    db.collection("participants").updateOne(
      { name: user },
      { $set: { lastStatus: Date.now() } }
    );
    res.status(200).send();
  } catch (err) {
    res.send(err.message);
  }
});

const inactivateUsers = async () => {
  try {
    const inactives = await db
      .collection("participants")
      .find({ lastStatus: { $lt: Date.now() - 10000 } })
      .toArray();

    await Promise.all(
      inactives.map(async (inactive) => {
        const { name } = inactive;
        const time = dayjs(Date.now()).locale("pt").format("HH:mm:ss");
        await db
          .collection("participants")
          .deleteOne({ _id: new ObjectId(inactive._id) });
        await db.collection("messages").insertOne({
          from: name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time,
        });
      })
    );
  } catch (error) {
    console.error(error);
  }
};
const PORT = 5000;
setInterval(inactivateUsers, 15000);
server.listen(PORT);
