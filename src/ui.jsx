import { useEffect, useLayoutEffect, useRef } from 'react'

/**
 * Kepala lembar kerja. Teksnya diambil dari content.json, sama persis dengan slide.
 * `c` = entri content.json; `scopeLine` = keterangan lembar kelompok/pribadi.
 */
export function Sheet({ c, kicker, title, intro, steps, result, scopeLine, children }) {
  const k = c?.kicker ?? kicker
  const t = c?.title ?? title
  const st = c?.steps ?? steps
  const panel = c?.panel ?? (result ? [['HASIL', result]] : null)
  return (
    <article className="sheet">
      <header className="sheet-head">
        <div className="head-tags">
          {k && <p className="kicker">{k}</p>}
          {c?.slide && <p className="slide-tag">Slide {c.slide}</p>}
          {scopeLine}
        </div>
        <h1>{t}</h1>
        {c?.question && <blockquote className="question-box">“{c.question}”</blockquote>}
        {(c?.intro ?? intro) && <p className="intro">{c?.intro ?? intro}</p>}
        {c?.points && (
          <ol className="steps steps-plain">
            {c.points.map((s, i) => <li key={i}><span>{i + 1}</span><p>{s}</p></li>)}
          </ol>
        )}
        {(st || panel) && (
          <div className={`brief ${panel ? '' : 'brief-solo'}`}>
            {st && (
              <ol className="steps">
                {st.map((s, i) => <li key={i}><span>{i + 1}</span><p>{s}</p></li>)}
              </ol>
            )}
            {panel && (
              <div className="result">
                {panel.map(([label, text], i) => (
                  <div key={i} className="result-item">
                    <p className="label">{label}</p>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {c?.prompt && <div className="prompt">{c.prompt}</div>}
      </header>
      <div className="sheet-body">{children}</div>
    </article>
  )
}

export function Block({ title, hint, children, tone }) {
  return (
    <section className={`block ${tone ? `block-${tone}` : ''}`}>
      {(title || hint) && (
        <div className="block-head">
          {title && <h2>{title}</h2>}
          {hint && <p className="hint">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  )
}

/** `group` dipakai bila isinya tombol pilihan (bukan input tunggal). */
export function Field({ label, hint, children, wide, group }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className={`field ${wide ? 'field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </Tag>
  )
}

export function Text({ value, onChange, placeholder, ...rest }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      maxLength={400}
      {...rest}
    />
  )
}

export function Area({ value, onChange, placeholder, rows = 2, ...rest }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      maxLength={2000}
      {...rest}
    />
  )
}

export function Choice({ options, value, onChange, small }) {
  return (
    <div className={`choice ${small ? 'choice-sm' : ''}`} role="radiogroup">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        const active = value === v
        return (
          <button
            type="button"
            key={v}
            role="radio"
            aria-checked={active}
            className={active ? 'active' : ''}
            onClick={() => onChange(active ? '' : v)}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

export function Note({ children, tone = 'info' }) {
  return <div className={`note note-${tone}`}>{children}</div>
}

export function Badge({ status }) {
  if (!status) return <span className="badge badge-empty">–</span>
  const map = { hijau: 'Hijau', kuning: 'Kuning', merah: 'Merah' }
  return <span className={`badge badge-${status}`}>{map[status]}</span>
}

export function useScrollTop(dep) {
  useEffect(() => { window.scrollTo({ top: 0 }) }, [dep])
}

/** Hitung capaian (%) sesuai polaritas. */
export function capaian(target, realisasi, polaritas) {
  const t = parseNum(target)
  const r = parseNum(realisasi)
  if (t == null || r == null) return null
  if (polaritas === 'rendah') {
    if (r === 0) return null
    return (t / r) * 100
  }
  if (t === 0) return null
  return (r / t) * 100
}

export function statusOf(c, hijau = 100, merah = 90) {
  if (c == null || Number.isNaN(c)) return ''
  if (c >= hijau) return 'hijau'
  if (c >= merah) return 'kuning'
  return 'merah'
}

export function parseNum(v) {
  if (v == null) return null
  const s = String(v).trim().replace('%', '').replace(/\s/g, '')
  if (!s) return null
  // dukung format Indonesia: 1.234,5  dan format 1234.5
  let norm = s
  if (s.includes(',') && s.includes('.')) norm = s.replace(/\./g, '').replace(',', '.')
  else if (s.includes(',')) norm = s.replace(',', '.')
  const n = Number(norm)
  return Number.isFinite(n) ? n : null
}

export function fmtPct(n) {
  if (n == null) return '–'
  return `${n.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`
}
