// lib/mongo.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("❌ MONGODB_URI not defined in environment variables");
}

let client;
let clientPromise;

// Gunakan caching global supaya tidak reconnect terus di serverless
if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export async function connectToDatabase() {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB || "mydb"; // default "mydb"
  const db = client.db(dbName);

  // Pastikan TTL index hanya dibuat sekali
  const coll = db.collection("files");
  await coll.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  return { client, db };
}
