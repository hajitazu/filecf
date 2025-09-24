// api/create-presigned.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import { connectToDatabase } from '../lib/mongo.js' // optional: not used here but kept

const BUCKET = process.env.S3_BUCKET
const REGION = process.env.S3_REGION
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '524288000')

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
})

export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' })
  try {
    const { filename, filesize } = req.body
    if(!filename) return res.status(400).json({ message: 'filename required' })
    if(filesize > MAX_FILE_SIZE) return res.status(400).json({ message: 'File too large' })

    const id = uuidv4() // secure random ID
    const key = `uploads/${id}/${encodeURIComponent(filename)}`

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: 'application/octet-stream'
    })
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 10 }) // presigned PUT URL valid 10 min

    // return id & presigned URL
    res.status(200).json({
      id,
      uploadUrl,
      storagePath: key
    })
  } catch(err){
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}
