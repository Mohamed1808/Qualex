'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { CrmUser, Team, UserRole } from '@/lib/crm/types'
import { listUsers, createUser, updateUser, listTeams } from '@/lib/crm/service'

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'telesales_supervisor', label: 'Telesales Supervisor' },
  { value: 'telesales_agent', label: 'Telesales Agent' },
  { value: 'direct_sales_supervisor', label: 'DS Supervisor' },
  { value: 'direct_sales_agent', label: 'DS Agent' },
]

export default function UserManager() {
  const [users, setUsers] = useState<CrmUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [creating, setCreating] = useState(false)
  const [historyFor, setHistoryFor] = useState<CrmUser | null>(null)

  async function reload() {
    const [u, t] = await Promise.all([listUsers(), listTeams()])
    setUsers(u); setTeams(t)
  }
  useEffect(() => { reload() }, [])

  async function toggle(u: CrmUser) {
    await updateUser(u.id, { is_active: !u.is_active }, u.is_active ? 'Deactivated' : 'Activated')
    reload()
  }
  async function setRole(u: CrmUser, role: UserRole) {
    await updateUser(u.id, { role }, `Role changed to ${role}`)
    reload()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">User Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{users.length} users</p>
        </div>
        <button onClick={() => setCreating(true)} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2">+ New User</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[#2a2a2a] last:border-0">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{u.full_name}</p>
                  <p className="text-xs text-[#6B7280]">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[#9CA3AF]">{u.title ?? '—'}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => setRole(u, e.target.value as UserRole)}
                    className="bg-[#1c1c22] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-1 focus:outline-none">
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-[#9CA3AF]">{teams.find((t) => t.id === u.team_id)?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active ? 'text-[#22C55E] bg-[#22C55E]/15' : 'text-[#6B7280] bg-[#6B7280]/15'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => setHistoryFor(u)} className="text-xs text-[#5757e6] hover:underline">History</button>
                  <button onClick={() => toggle(u)} className="text-xs text-[#9CA3AF] hover:text-white">{u.is_active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <UserForm teams={teams} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />}
      {historyFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setHistoryFor(null)}>
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">{historyFor.full_name} — Activity</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {historyFor.history.slice().reverse().map((h, i) => (
                <div key={i} className="text-xs bg-[#1c1c22] rounded-lg px-3 py-2">
                  <span className="text-white">{h.action}</span>
                  <span className="text-[#4B5563] block text-[10px] mt-0.5">{new Date(h.at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryFor(null)} className="mt-4 w-full text-sm text-[#6B7280] hover:text-white border border-[#2a2a2a] rounded-lg py-2">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function UserForm({ teams, onClose, onSaved }: { teams: Team[]; onClose: () => void; onSaved: () => void }) {
  const [full_name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [role, setRole] = useState<UserRole>('telesales_agent')
  const [team_id, setTeam] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!full_name.trim() || !email.trim()) { toast.error('Name and email required'); return }
    setSaving(true)
    await createUser({ full_name: full_name.trim(), email: email.trim(), title: title.trim() || null, role, team_id: team_id || null, is_active: true })
    setSaving(false)
    toast.success('User created')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-4">New User</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name"><input value={full_name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
          <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Sales Agent" className={inputCls} /></Field>
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputCls}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </Field>
          <Field label="Team">
            <select value={team_id} onChange={(e) => setTeam(e.target.value)} className={inputCls}>
              <option value="">No team</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={save} disabled={saving} className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2">{saving ? 'Saving…' : 'Create'}</button>
          <button onClick={onClose} className="px-4 text-sm text-[#6B7280] hover:text-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]'
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] text-[#6B7280] uppercase tracking-wide">{label}</label>{children}</div>
}
