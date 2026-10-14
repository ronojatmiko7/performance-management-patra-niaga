export default function Shell({ children, right }) {
  return (
    <div className="shell">
      <header className="topbar">
        <a href="#/" className="brand">
          <img src="/logo-performa-white.png" alt="Performa" />
          <div>
            <b>Performance Management Fundamental</b>
            <span>Workbook digital · PT Pertamina Patra Niaga</span>
          </div>
        </a>
        {right}
      </header>
      {children}
    </div>
  )
}
