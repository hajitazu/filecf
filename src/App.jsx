import React from 'react'
import UploadCard from './components/UploadCard'

export default function App(){
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold">Transfer — simple file sharing</h1>
          <p className="mt-2 text-sm text-slate-500">Share a file with a link. Expires in 24 hours by default.</p>
        </header>

        <UploadCard />
        <footer className="mt-8 text-center text-xs text-slate-400">
          Made with ♥ — White UI · Blue accent · Minimal
        </footer>
      </div>
    </div>
  )
}
