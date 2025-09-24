// lib/mongo.js
import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI
if(!uri) throw new Error('MONGODB_URI not defined')

let cachedClient = global._mongoClient
let cachedDb = global._mongoDb

export async function connectToDatabase(){
  if(cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  await client.connect()
  const dbName = process.env.MONGODB_DB || 'filetransfer'
  const db = client.db(dbName)

  // create TTL index on expiresAt if not exists
  const coll = db.collection('files')
  await coll.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })

  cachedClient = client
  cachedDb = db
  global._mongoClient = client
  global._mongoDb = db
  return { client, db }
}
