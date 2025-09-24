import React, { useRef, useState } from 'react'
import axios from 'axios'
import QRCode from 'qrcode.react'

const MAX_SIZE = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '524288000') // default 500MB

function bytesToReadable(bytes){
  if(bytes === 0) return '0 B'
  const sizes=['B','KB','MB','GB','TB']
  const i=Math.floor(Math.log(bytes)/Math.log(1024))
  return (bytes/Math.pow(1024,i)).toFixed(2) + ' ' + sizes[i]
}

export default function UploadCard(){
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [shareLink, setShareLink] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef()

  const onSelectFile = (f) => {
    if(!f) return
    if(f.size > MAX_SIZE){
      alert('File exceeds max size: ' + bytesToReadable(MAX_SIZE))
      return
    }
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    onSelectFile(f)
  }
  const handleChoose = (e) => onSelectFile(e.target.files[0])

  const startUpload = async () => {
    if(!file) return
    setIsUploading(true)
    setProgress(0)
    try{
      // 1) request presigned
      const presignResp = await axios.post('/api/create-presigned', {
        filename: file.name,
        filesize: file.size,
      })
      const { id, uploadUrl, storagePath } = presignResp.data

      // 2) upload directly to S3/R2 using PUT; track progress
      await axios.put(uploadUrl, file, {
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        onUploadProgress: (evt) => {
          const p = Math.round((evt.loaded * 100) / evt.total)
          setProgress(p)
        }
      })

      // 3) tell server to persist metadata (complete)
      const completeResp = await axios.post('/api/complete-upload', {
        id,
        filename: file.name,
        filesize: file.size,
        storagePath // optional but we pass along
      })
      const link = `${window.location.origin}/download/${id}`
      setShareLink(link)
    }catch(err){
      console.error(err)
      alert('Upload failed: ' + (err?.response?.data?.message || err.message))
    }finally{
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 rounded-2xl shadow-soft bg-white border border-slate-100">
      <div
        onDragOver={(e)=>e.preventDefault()}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-dashed border-brand/30"
        style={{minHeight:200}}
      >
        <div className="text-center">
          <p className="font-medium">Drag & drop your file here</p>
          <p className="text-xs text-slate-400 mt-1">or</p>
        </div>
        <div>
          <button onClick={()=>inputRef.current.click()} className="px-4 py-2 rounded-md bg-brand text-white shadow">Choose file</button>
          <input ref={inputRef} type="file" onChange={handleChoose} className="hidden" />
        </div>

        {file && (
          <div className="w-full max-w-xl mt-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-md shadow-inner">
              <div>
                <div className="font-medium">{file.name}</div>
                <div className="text-xs text-slate-400">{bytesToReadable(file.size)}</div>
              </div>
              <div className="text-xs text-slate-500">{file.type || '—'}</div>
            </div>

            <div className="mt-3">
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full transition-all" style={{width: `${progress}%`, backgroundColor:'#1E90FF'}} />
              </div>
              <div className="text-xs text-slate-400 mt-1">{progress}%</div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={startUpload} disabled={isUploading} className="px-4 py-2 rounded-md bg-brand text-white">Upload</button>
              <button onClick={()=>{ setFile(null); setProgress(0); setShareLink('') }} className="px-4 py-2 rounded-md border">Clear</button>
            </div>
          </div>
        )}

        {shareLink && (
          <div className="mt-4 w-full">
            <div className="p-3 bg-slate-50 rounded-md flex items-center justify-between">
              <div className="text-sm break-all">{shareLink}</div>
              <div className="flex items-center gap-2">
                <button className="px-2 py-1 text-xs border rounded" onClick={()=>navigator.clipboard.writeText(shareLink)}>Copy</button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <QRCode value={shareLink} size={96} />
              <div className="text-xs text-slate-500">Scan QR to open link</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
