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

const mongoClient = new MongoClient(process.env.MOGOBASE_URL)

try {
  await mongoClient.connect()
} catch (err) {
  console.log(err.message)
}
const db = mongoClient.db()

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
    })

    const { error } = schema.validate({ name });
    if (error) return res.status(422).send({ message: error.message })

    const participantExists = await db.collection("participants").findOne({ name })
    if (participantExists) return res.status(409).send({ message: "Este participante já está cadastrado na sala." });
    
    const now = new Date();
    const participantData = { name, lastStatus: now }

    await db.collection("participants").insertOne(participantData);
 

    const messageData = {
      from: name,
      to: "Todos",
      text: "entrou na sala...",
      type: "status",
      time: dayjs(now).format("HH:mm:ss"),
    }

    await db.collection("messages").insertOne(messageData)
    res.sendStatus(201);

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ message: "Erro interno do servidor." })
  }
})

server.get("/participants", async (req,res) =>{
  try{
    const participants = await db.collection('participants').find().toArray()
    if(participants.length === 0) return res.send([])
    res.send(participants)

  }catch (err){
  console.log(err)
  res.sendStatus(err)    
  }
})
server.post("/messages", async (req,res)=>{
 const from = req.header('User')
  try{
    const schema =Joi.object({
      to:Joi.string().required(),
      text:Joi.string().required(),
      type:Joi.string().valid( 'message','private_message').required()
    })
   const {error,value} =schema.validate(req.body)

   if(error) return res.status(422).send(error.details[0].message)

    const time = dayjs().format("HH:mm:ss")
    value.time = time 
    
    await db.collection("messages").insertOne({
      from, 
      ...value
    })
    console.log(value)
  res.status(201).send()
  }catch (err){
    console.log(err)
    res.status(500).send("Internal Server Error")
  }
})
const PORT = 5000;
server.listen(PORT);
