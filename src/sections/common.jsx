import { useWorkbook } from '../store.jsx'

export function GroupTag({ section }) {
  const { groupInfo, groupMeta } = useWorkbook()
  const meta = groupMeta?.[section]
  const members = groupInfo?.members || []
  const time = meta?.updated_at ? new Date(meta.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <p className="scope-tag scope-group" title={members.map((m) => m.name).join(', ')}>
      Lembar kelompok · {groupInfo?.company || '…'} · {members.length} anggota
      {time && <span className="muted"> · diubah {meta.updated_by ? `oleh ${meta.updated_by} ` : ''}pukul {time}</span>}
    </p>
  )
}

export function PersonalTag() {
  return <p className="scope-tag">Lembar pribadi</p>
}

export function Star({ on, onClick, title = 'Tandai' }) {
  return (
    <button type="button" className={`star ${on ? 'on' : ''}`} title={title} aria-pressed={!!on} onClick={onClick}>★</button>
  )
}
