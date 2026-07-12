'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Team, CrmUser } from '@/lib/crm/types'
import { listTeams, createTeam, updateTeam, listUsers, updateUser } from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import { CardSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

export default function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<CrmUser[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [leaderId, setLeaderId] = useState('')
  const [touched, setTouched] = useState(false)
  const nameError = touched && !name.trim() ? 'Team name is required' : null

  async function reload() {
    const [t, u] = await Promise.all([listTeams(), listUsers()])
    setTeams(t); setUsers(u)
    setLoading(false)
  }
  useEffect(() => { reload() }, [])

  const supervisors = users.filter((u) => u.role.includes('supervisor') || u.role === 'admin')

  async function add() {
    setTouched(true)
    if (!name.trim()) { toast.error('Enter a team name'); return }
    await createTeam({ name: name.trim(), leader_id: leaderId || null })
    setName(''); setLeaderId(''); setTouched(false)
    toast.success('Team created')
    reload()
  }

  async function assignMember(userId: string, teamId: string) {
    await updateUser(userId, { team_id: teamId || null }, teamId ? 'Joined a team' : 'Left team')
    reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader crumbs={[{ label: 'CRM', href: '/crm' }]} title="Team Management" subtitle="Group agents into teams and assign a leader / supervisor." />

      {/* Add team */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Team name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)} placeholder="e.g. Cairo Team"
            className={`w-full mt-1 bg-[#f3f4f6] border text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${nameError ? 'border-[#F26161] focus:ring-[#F26161]' : 'border-[#e5e7eb] focus:ring-[#5757e6]'}`} />
          {nameError && <p className="text-[11px] text-[#F26161] mt-1">{nameError}</p>}
        </div>
        <div className="min-w-[180px]">
          <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Team leader</label>
          <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)}
            className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none">
            <option value="">Select leader…</option>
            {supervisors.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        </div>
        <button onClick={add} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">Add team</button>
      </div>

      {/* Teams + members */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CardSkeleton /><CardSkeleton />
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white border border-[#e5e7eb] rounded-xl">
          <EmptyState icon="👥" title="No teams yet" hint="Create your first team above to start grouping agents." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teams.map((team) => {
            const leader = users.find((u) => u.id === team.leader_id)
            const members = users.filter((u) => u.team_id === team.id)
            return (
              <div key={team.id} className="bg-white border border-[#e5e7eb] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#111827]">{team.name}</h3>
                  <span className="text-xs text-[#6B7280]">{members.length} members</span>
                </div>
                <p className="text-xs text-[#4B5563] mb-3">
                  Leader: <span className="text-[#5757e6]">{leader?.full_name ?? '—'}</span>
                </p>
                <div className="space-y-1">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs bg-[#f3f4f6] rounded-lg px-3 py-2">
                      <span className="text-[#111827]">{m.full_name} <span className="text-[#6B7280]">· {m.title}</span></span>
                      <button onClick={() => assignMember(m.id, '')} className="text-[#F26161] hover:underline">Remove</button>
                    </div>
                  ))}
                  {members.length === 0 && <p className="text-xs text-[#4B5563]">No members yet.</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Unassigned users */}
      <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[#111827] mb-3">Assign members to teams</h3>
        <div className="space-y-2">
          {users.filter((u) => u.role.includes('agent')).map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm">
              <span className="text-[#374151]">{u.full_name} <span className="text-[#6B7280] text-xs">· {u.title}</span></span>
              <select value={u.team_id ?? ''} onChange={(e) => assignMember(u.id, e.target.value)}
                className="bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-xs rounded-lg px-2 py-1 focus:outline-none">
                <option value="">No team</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
