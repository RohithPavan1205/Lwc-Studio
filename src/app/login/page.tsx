import Link from 'next/link';
import { Cloud, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#0d1117]">
      <div className="w-full max-w-[400px] flex flex-col space-y-8">
        
        {/* Branding */}
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#e6edf3]">
            LWCForge
          </h1>
          <p className="text-[#8b949e] text-sm tracking-wide">
            Precision Void Engine Configuration
          </p>
        </div>

        {/* Auth Box */}
        <div className="flex flex-col space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] p-6 rounded-xl flex flex-col items-center">
            {error && (
              <div className="w-full mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-red-500 uppercase tracking-wider">Authentication Error</p>
                  <p className="text-xs text-red-400/80 leading-relaxed capitalize">{error.replace(/_/g, ' ')}</p>
                </div>
              </div>
            )}

            <Link 
              href="/api/auth/salesforce"
              className="w-full relative flex items-center justify-center gap-3 bg-[#00a1e0] hover:bg-[#008ec6] text-white px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#00a1e0] focus:ring-offset-2 focus:ring-offset-[#161b22]"
            >
              <Cloud className="w-5 h-5" />
              <span>Continue with Salesforce</span>
            </Link>
            <p className="text-[#8b949e] text-xs mt-4 text-center">
              By continuing, you authorize LWCForge to access your Salesforce workspace for deployment metadata mapping.
            </p>
          </div>
        </div>

        {/* Precision Void Identity */}
        <div className="pt-8 opacity-40">
           <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[#00a1e0] to-transparent mx-auto mb-4" />
           <p className="text-[10px] text-center uppercase tracking-[0.2em] font-medium leading-relaxed max-w-[280px] mx-auto text-balance text-[#8b949e]">
              The Precision Void Engine provides low-latency workspace environments for mission-critical development.
           </p>
        </div>

      </div>
    </main>
  );
}
