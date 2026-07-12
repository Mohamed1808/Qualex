'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Project, ProjectDetailSection } from '@/lib/crm/types'
import { listProjects, createProject, updateProject } from '@/lib/crm/service'
import PageHeader from './ui/PageHeader'
import SlideOver from './ui/SlideOver'
import { TableSkeleton } from './ui/Skeleton'
import EmptyState from './ui/EmptyState'

const DEFAULT_SECTIONS = [
  'General Details', 'Developer & Track Record', 'Location & Area',
  'Services & Delivery Date', 'Unit Types & Payment Plans', 'Finishing & Load Ratio',
  'Selling Points & Drawbacks',
]

export default function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<Project | null>(null)

  async function reload() { setProjects(await listProjects()); setLoading(false) }
  useEffect(() => { reload() }, [])

  async function toggle(p: Project) {
    await updateProject(p.id, { is_active: !p.is_active })
    toast.success(p.is_active ? 'Project deactivated' : 'Project activated')
    reload()
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        crumbs={[{ label: 'CRM', href: '/crm' }]}
        title="Project Management"
        subtitle={`${projects.length} projects`}
        action={<button onClick={() => setCreating(true)} className="bg-[#5757e6] hover:bg-[#4444cc] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">+ New Project</button>}
      />

      <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-[1]">
              <tr className="border-b border-[#e5e7eb] text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={4} cols={4} />
              ) : projects.length === 0 ? (
                <tr><td colSpan={4}><EmptyState icon="🏗️" title="No projects yet" action={{ label: '+ New Project', onClick: () => setCreating(true) }} /></td></tr>
              ) : projects.map((p) => (
                <tr key={p.id} className="border-b border-[#e5e7eb] last:border-0 hover:bg-[#f3f4f6] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[#111827] font-medium">{p.name}</p>
                    <p className="text-xs text-[#6B7280] truncate max-w-[280px]">{p.description}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#4B5563]">{p.details.length} sections</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'text-[#22C55E] bg-[#22C55E]/15' : 'text-[#6B7280] bg-[#6B7280]/15'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setViewing(p)} className="text-xs text-[#5757e6] hover:underline">Details</button>
                    <button onClick={() => toggle(p)} className="text-xs text-[#4B5563] hover:text-[#111827]">
                      {p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const [touched, setTouched] = useState(false)
  const nameError = touched && !name.trim() ? 'Project name is required' : null

  async function save() {
    setTouched(true)
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
    <SlideOver
      title="New Project"
      onClose={onClose}
      widthClass="max-w-2xl"
      footer={
        <>
          <button onClick={save} disabled={saving} className="bg-[#5757e6] hover:bg-[#4444cc] disabled:opacity-50 text-white text-sm font-medium rounded-lg px-5 py-2 transition-colors">
            {saving ? 'Saving…' : 'Create Project'}
          </button>
          <button onClick={onClose} className="px-4 text-sm text-[#6B7280] hover:text-[#111827]">Cancel</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => setTouched(true)}
            className={`w-full mt-1 bg-[#f3f4f6] border text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${nameError ? 'border-[#F26161] focus:ring-[#F26161]' : 'border-[#e5e7eb] focus:ring-[#5757e6]'}`} />
          {nameError && <p className="text-[11px] text-[#F26161] mt-1">{nameError}</p>}
        </div>
        <div>
          <label className="text-[10px] text-[#6B7280] uppercase tracking-wide">Short description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-1 bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wide">Detail sections</p>
          {sections.map((sec, i) => (
            <div key={i}>
              <input value={sec.title}
                onChange={(e) => setSections((s) => s.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                className="w-full bg-transparent text-sm text-[#5757e6] font-medium mb-1 focus:outline-none" />
              <textarea value={sec.body} rows={2} placeholder="Write this section…"
                onChange={(e) => setSections((s) => s.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                className="w-full bg-[#f3f4f6] border border-[#e5e7eb] text-[#111827] text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#5757e6]" />
            </div>
          ))}
          <button onClick={() => setSections((s) => [...s, { title: 'New Section', body: '' }])}
            className="text-xs text-[#5757e6] hover:text-[#4444cc]">+ Add section</button>
        </div>
      </div>
    </SlideOver>
  )
}

function ProjectDetails({ project, onClose }: { project: Project; onClose: () => void }) {
  const [active, setActive] = useState(0)
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white border border-[#e5e7eb] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#e5e7eb] flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-[#111827]">{project.name}</h3>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#111827]">✕</button>
        </div>
        {project.details.length === 0 ? (
          <p className="p-6 text-sm text-[#6B7280]">No detail sections for this project.</p>
        ) : (
          <div className="flex flex-col sm:flex-row min-h-[280px] overflow-hidden">
            <div className="sm:w-56 border-b sm:border-b-0 sm:border-r border-[#e5e7eb] p-3 space-y-1 overflow-x-auto sm:overflow-y-auto flex sm:block gap-1 sm:gap-0 flex-shrink-0">
              {project.details.map((d, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className={`text-left text-xs px-3 py-2 rounded-lg transition-colors whitespace-nowrap sm:whitespace-normal sm:w-full flex-shrink-0 ${
                    active === i ? 'bg-[#5757e6] text-white font-medium' : 'text-[#4B5563] hover:bg-[#f3f4f6]'
                  }`}>{d.title}</button>
              ))}
            </div>
            <div className="flex-1 p-5 overflow-y-auto scrollbar-thin">
              <h4 className="text-sm font-semibold text-[#111827] mb-2">{project.details[active].title}</h4>
              <p className="text-sm text-[#374151] whitespace-pre-line leading-relaxed">{project.details[active].body}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
