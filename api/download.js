// api/download.js
import { connectToDatabase } from '../lib/mongo.js'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = process.env.S3_BUCKET
const REGION = process.env.S3_REGION
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
  }
})

export default async function handler(req, res){
  try {
    const id = req.query.id || (req.params && req.params.id)
    if(!id) return res.status(400).json({ message: 'id required' })

    const { db } = await connectToDatabase()
    const coll = db.collection('files')
    const doc = await coll.findOne({ _id: id })
    if(!doc) return res.status(404).json({ message: 'File not found or expired' })

    if(new Date(doc.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'File expired' })
    }

    // increment downloadCount (optional)
    await coll.updateOne({ _id: id }, { $inc: { downloadCount: 1 } })

    // create signed GET URL
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: doc.storagePath })
    const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: parseInt(process.env.SIGNED_URL_EXPIRATION || '600') })

    res.status(200).json({
      id: doc._id,
      filename: doc.filename,
      filesize: doc.filesize,
      createdAt: doc.createdAt,
      expiresAt: doc.expiresAt,
      downloadCount: doc.downloadCount,
      downloadUrl: signedUrl,
      storageUrl: doc.storageUrl // if you saved a public url
    })
  } catch(err){
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
}
