import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'

function bytesToReadable(bytes){
  if(bytes === 0) return '0 B'
  const sizes=['B','KB','MB','GB','TB']
  const i=Math.floor(Math.log(bytes)/Math.log(1024))
  return (bytes/Math.pow(1024,i)).toFixed(2) + ' ' + sizes[i]
}

export default function DownloadPage(){
  const { id } = useParams()
  const [meta, setMeta] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [signedUrl, setSignedUrl] = useState('')

  useEffect(()=>{
    const fetchMeta = async () => {
      try{
        const res = await axios.get(`/api/download?id=${id}`)
        setMeta(res.data)
        if(res.data.downloadUrl) setSignedUrl(res.data.downloadUrl)
        const updateTimer = () => {
          const expiresAt = new Date(res.data.expiresAt).getTime()
          const diff = expiresAt - Date.now()
          setTimeLeft(diff > 0 ? diff : 0)
        }
        updateTimer()
        const iv = setInterval(updateTimer, 1000)
        return ()=>clearInterval(iv)
      }catch(err){
        console.error(err)
        setMeta({ error: err?.response?.data?.message || 'Not found or expired' })
      }
    }
    fetchMeta()
  }, [id])

  if(!meta) return <div className="p-8 text-center">Loading…</div>
  if(meta.error) return <div className="p-8 text-center text-red-500">{meta.error}</div>

  const downloadNow = () => {
    if(signedUrl) window.location.href = signedUrl
    else window.location.href = meta.storageUrl
  }

  const copyLink = ()=>navigator.clipboard.writeText(window.location.href)

  const formatCountdown = (ms) => {
    if(ms <= 0) return 'Expired'
    const s = Math.floor(ms/1000)
    const h = Math.floor(s/3600)
    const m = Math.floor((s%3600)/60)
    const sec = s%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return (
    <div className="min-h-screen p-8 bg-white">
      <div className="max-w-xl mx-auto bg-white rounded-2xl p-6 shadow-soft">
        <h2 className="text-xl font-semibold">{meta.filename}</h2>
        <div className="text-sm text-slate-500 mt-1">{bytesToReadable(meta.filesize)}</div>

        <div className="mt-4">
          <div className="text-xs text-slate-400">Expires in</div>
          <div className="text-lg font-medium">{formatCountdown(timeLeft)}</div>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={downloadNow} className="px-4 py-2 rounded bg-brand text-white">Download</button>
          <button onClick={copyLink} className="px-4 py-2 rounded border">Copy link</button>
        </div>

        <div className="mt-4 text-xs text-slate-400">Downloads: {meta.downloadCount || 0}</div>
      </div>
    </div>
  )
}
