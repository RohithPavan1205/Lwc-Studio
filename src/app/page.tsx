import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[#0a0a0a] text-white">
      <div className="relative flex flex-col items-center">
        <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 py-4">
          LWC Studio
        </h1>
        <p className="mt-4 text-xl text-neutral-400 font-medium tracking-wide">
          Coming Soon
        </p>
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
      </div>
      
      <div className="mt-12 flex gap-4">
        <div className="h-0.5 w-12 bg-neutral-800 self-center"></div>
        <span className="text-sm font-mono text-neutral-500 uppercase tracking-[0.2em]">Building the future of Salesforce Dev</span>
        <div className="h-0.5 w-12 bg-neutral-800 self-center"></div>
      </div>
    </main>
  );
}
