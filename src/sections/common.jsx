import { useWorkbook } from '../store.jsx'

export function GroupTag({ section }) {
  const { groupInfo, groupMeta } = useWorkbook()
  const meta = groupMeta?.[section]
  const time = meta?.updated_at ? new Date(meta.updated_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null
  return (
    <p className="scope-tag scope-group" >
      Lembar Anda · {groupInfo?.company || '…'}
      {time && <span className="muted"> · tersimpan pukul {time}</span>}
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
