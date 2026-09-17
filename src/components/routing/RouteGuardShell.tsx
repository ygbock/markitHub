import React from 'react';
import { RouteGuardDecision } from '../../routes/routeGuards';
import { 
  ShieldAlert, Lock, AlertTriangle, Building2, 
  ArrowLeft, LogIn, RefreshCw, KeyRound, Sparkles
} from 'lucide-react';

interface RouteGuardShellProps {
  decision: RouteGuardDecision;
  onNavigate: (path: string) => void;
}

export default function RouteGuardShell({
  decision,
  onNavigate,
}: RouteGuardShellProps) {
  const { type, message, redirectUrl, tenant, requiredCapability, requiredPermission } = decision;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans" id="guard-fallback-root">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl text-white font-black text-xs flex items-center justify-center">
            M
          </div>
          <div>
            <div className="text-xs font-black tracking-wider text-white uppercase">
              MikitHub <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full ml-1">Route Guard</span>
            </div>
            <p className="text-[10px] text-slate-400">Canonical Authorization Boundary</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Public Discovery</span>
        </button>
      </header>

      {/* Main Guard Card */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-lg bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-8 shadow-2xl text-center space-y-6">
          
          {/* Icon Badge based on Guard Type */}
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg">
            {type === 'REDIRECT_LOGIN' && (
              <div className="w-full h-full rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                <LogIn className="w-8 h-8" />
              </div>
            )}
            {type === 'SUPER_ADMIN_REQUIRED' && (
              <div className="w-full h-full rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8" />
              </div>
            )}
            {type === 'TENANT_SUSPENDED' && (
              <div className="w-full h-full rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
            )}
            {type === 'CAPABILITY_DISABLED' && (
              <div className="w-full h-full rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
            )}
            {(type === 'PERMISSION_DENIED' || type === 'TENANT_MEMBERSHIP_REQUIRED') && (
              <div className="w-full h-full rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <Lock className="w-8 h-8" />
              </div>
            )}
            {(type === 'TENANT_NOT_FOUND' || type === 'TENANT_PENDING' || type === 'TENANT_ARCHIVED') && (
              <div className="w-full h-full rounded-2xl bg-slate-800 border border-white/10 text-slate-300 flex items-center justify-center">
                <Building2 className="w-8 h-8" />
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {type === 'REDIRECT_LOGIN' && 'Authentication Required'}
              {type === 'SUPER_ADMIN_REQUIRED' && 'Platform Access Restricted'}
              {type === 'TENANT_SUSPENDED' && 'Tenant Account Suspended'}
              {type === 'TENANT_PENDING' && 'Tenant Registration Pending'}
              {type === 'TENANT_ARCHIVED' && 'Tenant Archived (Read-Only)'}
              {type === 'TENANT_NOT_FOUND' && 'Tenant Not Found'}
              {type === 'TENANT_MEMBERSHIP_REQUIRED' && 'Tenant Membership Required'}
              {type === 'CAPABILITY_DISABLED' && 'Capability Not Enabled'}
              {type === 'PERMISSION_DENIED' && 'Permission Denied'}
            </h2>

            <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              {message || 'You do not have authorization to view this location in the current context.'}
            </p>

            {tenant && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{tenant.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">ID: {tenant.id} • Status: {tenant.status.toUpperCase()}</div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                  tenant.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' :
                  tenant.status === 'suspended' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {tenant.status}
                </span>
              </div>
            )}

            {requiredCapability && (
              <div className="mt-2 text-[11px] text-purple-300 font-mono">
                Required Capability: <span className="font-bold text-white">{requiredCapability}</span>
              </div>
            )}

            {requiredPermission && (
              <div className="mt-2 text-[11px] text-rose-300 font-mono">
                Required Permission: <span className="font-bold text-white">{requiredPermission}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {type === 'REDIRECT_LOGIN' && (
              <button
                onClick={() => onNavigate(redirectUrl || '/login')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Go to Sign In</span>
              </button>
            )}

            {type === 'SUPER_ADMIN_REQUIRED' && (
              <button
                onClick={() => onNavigate('/tenant/nexus-retail/dashboard')}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Return to Tenant Workspace
              </button>
            )}

            {type === 'CAPABILITY_DISABLED' && tenant && (
              <button
                onClick={() => onNavigate(`/tenant/${tenant.id}/settings`)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Manage Tenant Capabilities
              </button>
            )}

            <button
              onClick={() => onNavigate('/')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
            >
              Public Discovery
            </button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-white/5 relative z-10">
        MikitHub Route Ownership & Access Verification System
      </footer>
    </div>
  );
}
