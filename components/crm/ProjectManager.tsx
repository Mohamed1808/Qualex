'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Project, ProjectDetailSection } from '@/lib/crm/types'
import { listProjects, createProject, updateProject } from '@/lib/crm/service'

const DEFAULT_SECTIONS = [
  'General Details', 'Developer & Track Record', 'Location & Area',
  'Services & Delivery Date', 'Unit Types & Payment Plans', 'Finishing & Load Ratio',
  'Selling Points & Drawbacks',
]

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Project | null>(null)

  async function reload() { setProjects(await listProjects()) }
  useEffect(() => { reload() }, [])

  async function toggle(p: Project) {
    await updateProject(p.id, { is_active: !p.is_active })
    toast.success(p.is_active ? 'Project deactivated' : 'Project activated')
    reload()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Project Management</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">{projects.length} projects</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2">+ New Project</button>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-b border-[#2a2a2a] last:border-0">
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{p.name}</p>
                  <p className="text-xs text-[#6B7280] truncate max-w-[280px]">{p.description}</p>
                </td>
                <td className="px-4 py-3 text-xs text-[#9CA3AF]">{p.details.length} sections</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'text-[#22C55E] bg-[#22C55E]/15' : 'text-[#6B7280] bg-[#6B7280]/15'}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => setViewing(p)} className="text-xs text-[#5757e6] hover:underline">Details</button>
                  <button onClick={() => toggle(p)} className="text-xs text-[#9CA3AF] hover:text-white">
                    {p.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && <ProjectForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />}
      {viewing && <ProjectDetails project={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

function ProjectForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sections, setSections] = useState<ProjectDetailSection[]>(DEFAULT_SECTIONS.map((title) => ({ title, body: '' })))
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Enter a project name'); return }
    setSaving(true)
    await createProject({
      name: name.trim(), description: description.trim(),
      details: sections.filter((s) => s.body.trim()), is_active: true,
    })
    setSaving(false)
    toast.success('Project created')
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto scrollbar-thin" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between sticky top-0 bg-[#161616]">
          <h3 className="text-sm font-semibold text-white">New Project</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
          </div>
          <div>
            <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Short description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full mt-1 bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Detail sections</p>
            {sections.map((sec, i) => (
              <div key={i}>
                <input value={sec.title}
                  onChange={(e) => setSections((s) => s.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                  className="w-full bg-transparent text-sm text-[#5757e6] font-medium mb-1 focus:outline-none" />
                <textarea value={sec.body} rows={2} placeholder="Write this section…"
                  onChange={(e) => setSections((s) => s.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                  className="w-full bg-[#1c1c22] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
              </div>
            ))}
            <button onClick={() => setSections((s) => [...s, { title: 'New Section', body: '' }])}
              className="text-xs text-[#5757e6] hover:text-[#7d7dee]">+ Add section</button>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[#2a2a2a] flex gap-2 sticky bottom-0 bg-[#161616]">
          <button onClick={save} disabled={saving}
            className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2">
            {saving ? 'Saving…' : 'Create Project'}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-[#6B7280] hover:text-white">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function ProjectDetails({ project, onClose }: { project: Project; onClose: () => void }) {
  const [active, setActive] = useState(0)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{project.name}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-white">✕</button>
        </div>
        {project.details.length === 0 ? (
          <p className="p-6 text-sm text-[#6B7280]">No detail sections for this project.</p>
        ) : (
          <div className="flex min-h-[280px]">
            <div className="w-56 border-r border-[#2a2a2a] p-3 space-y-1">
              {project.details.map((d, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                    active === i ? 'bg-[#5757e6] text-white font-medium' : 'text-[#9CA3AF] hover:bg-[#1c1c22]'
                  }`}>{d.title}</button>
              ))}
            </div>
            <div className="flex-1 p-5">
              <h4 className="text-sm font-semibold text-white mb-2">{project.details[active].title}</h4>
              <p className="text-sm text-[#cbd5e1] whitespace-pre-line leading-relaxed">{project.details[active].body}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
