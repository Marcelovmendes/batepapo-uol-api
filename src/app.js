import express from "express"
import { MongoClient } from "mongodb"
import cors from "cors"
import dotenv from "dotenvi"

const server = express()

server.use(cors())
server.use(express.json())
dotenv.config()



const PORT = 5000
server.listen(ṔORT)