// api/complete-upload.js
import { connectToDatabase } from '../lib/mongo.js'
import dayjs from 'dayjs'

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { id, filename, filesize, storagePath } = req.body
    if(!id || !filename || !storagePath) return res.status(400).json({ message: 'Missing parameters' })

    const { db } = await connectToDatabase()
    const coll = db.collection('files')

    const defaultHours = parseInt(process.env.DEFAULT_EXPIRY_HOURS || '24')
    const expiresAt = dayjs().add(defaultHours, 'hour').toDate()

    const doc = {
      _id: id,
      filename,
      filesize,
      storagePath,
      storageUrl: null, // optional: will build later or store direct public url
      createdAt: new Date(),
      expiresAt,
      downloadCount: 0
    }

    await coll.insertOne(doc)
    res.status(200).json({ message: 'saved', id })
  } catch(err){
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}
