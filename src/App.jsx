
/*
FINANCIA TU VIDA - Demo App (extended)
Includes:
- Mock data (users, sales)
- Commission rules (8 levels) and calculation engine
- User and Agent views
- Export to Excel (.xlsx) using SheetJS
*/
import React, { useState, useMemo } from 'react'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'

// ---------- Mock Data (extended for 8-level demo) ----------
const users = [
  { id: 'u1', name: 'Fundador', sponsor_id: null, code: 'F-001' },
  { id: 'u2', name: 'Agente A', sponsor_id: 'u1', code: 'A-101' },
  { id: 'u3', name: 'Agente B', sponsor_id: 'u1', code: 'A-102' },
  { id: 'u4', name: 'Distribuidor 1', sponsor_id: 'u2', code: 'D-201' },
  { id: 'u5', name: 'Distribuidor 2', sponsor_id: 'u2', code: 'D-202' },
  { id: 'u6', name: 'Distribuidor 3', sponsor_id: 'u4', code: 'D-301' },
  { id: 'u7', name: 'Cliente X', sponsor_id: 'u6', code: 'C-401' },
  { id: 'u8', name: 'Cliente Y', sponsor_id: 'u5', code: 'C-402' },
  // add more nodes to simulate depth...
]

const sales = [
  { id: 's1', user_id: 'u7', amount: 1000, product: 'Plan A', date: '2025-11-01' },
  { id: 's2', user_id: 'u8', amount: 500, product: 'Plan B', date: '2025-11-03' },
  { id: 's3', user_id: 'u6', amount: 800, product: 'Plan A', date: '2025-11-05' },
  { id: 's4', user_id: 'u4', amount: 1200, product: 'Plan C', date: '2025-10-20' },
]

// Commission vector (user specified)
const commissionRules = {
  1: 0.02,
  2: 0.015,
  3: 0.01,
  4: 0.005,
  5: 0.005,
  6: 0.003,
  7: 0.002,
  8: 0.002,
}

// ---------- Utilities ----------
function findUser(id) { return users.find(u => u.id === id) || null }

// Build downline tree (children) up to depth
function buildDownline(rootId, maxDepth = 8, maxChildren = 7) {
  const recurse = (id, depth) => {
    if (depth > maxDepth) return null
    const children = users.filter(u => u.sponsor_id === id).slice(0, maxChildren)
    return {
      id,
      user: findUser(id),
      children: children.map(c => recurse(c.id, depth + 1)).filter(Boolean)
    }
  }
  return recurse(rootId, 1)
}

// Get uplines for a user (ordered 1..N)
function getUplines(userId, maxLevels = 8) {
  const uplines = []
  let current = findUser(userId)
  let level = 0
  while (current && current.sponsor_id && level < maxLevels) {
    const sponsor = findUser(current.sponsor_id)
    if (!sponsor) break
    level += 1
    uplines.push({ level, sponsor })
    current = sponsor
  }
  return uplines
}

// Calculate commissions for a sale
function calculateCommissionsForSale(sale) {
  const uplines = getUplines(sale.user_id, 8)
  const results = uplines.map(u => {
    const pct = commissionRules[u.level] || 0
    const amount = Math.round(sale.amount * pct * 100) / 100
    return {
      sale_id: sale.id,
      beneficiary_id: u.sponsor.id,
      beneficiary_name: u.sponsor.name,
      level: u.level,
      pct,
      amount,
      sale_amount: sale.amount,
      sale_date: sale.date,
      product: sale.product
    }
  })
  return results
}

// Aggregate commissions for a user
function getCommissionsForUser(userId) {
  const cs = []
  for (const sale of sales) {
    const calc = calculateCommissionsForSale(sale)
    for (const c of calc) if (c.beneficiary_id === userId) cs.push(c)
  }
  return cs
}

// Export helper
function exportToExcel(filename, sheets) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.data)
    XLSX.utils.book_append_sheet(wb, ws, s.name)
  }
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  saveAs(blob, filename)
}

// ---------- Components ----------
function TreeNode({ node, depth = 1 }) {
  if (!node || !node.user) return null
  return (
    <div className="tree-node">
      <div className="card">
        <div style={{fontWeight:600}}>{node.user.name} <span style={{fontSize:12, color:'#6b7280'}}>({node.user.code})</span></div>
        <div style={{fontSize:12, color:'#6b7280'}}>ID: {node.user.id}</div>
      </div>
      <div style={{marginLeft:12}}>
        {node.children && node.children.map(c => (
          <TreeNode key={c.id} node={c} depth={depth+1} />
        ))}
      </div>
    </div>
  )
}

function UserPanel({ userId }) {
  const user = findUser(userId)
  const tree = useMemo(() => buildDownline(userId, 8, 7), [userId])
  const commissions = useMemo(() => getCommissionsForUser(userId), [userId])
  const userSales = sales.filter(s => s.user_id === userId)
  const totalCom = commissions.reduce((a,b) => a + b.amount, 0)
  return (
    <div>
      <div className="card" style={{marginBottom:12}}>
        <h2 style={{margin:0}}>Perfil — {user.name}</h2>
        <p style={{marginTop:8}}>Código: <strong>{user.code}</strong></p>
        <p>Nivel de la red: <strong>{/* no calc */}1</strong></p>
        <p>Comisiones totales: <strong>S/ {totalCom.toFixed(2)}</strong></p>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3 style={{margin:0}}>Árbol (hasta 8 niveles)</h3>
        <div style={{marginTop:8}}>
          <TreeNode node={tree} />
        </div>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3 style={{margin:0}}>Comisiones</h3>
        <table className="table" style={{marginTop:8}}>
          <thead><tr><th>Fecha</th><th>Venta</th><th>Nivel</th><th>%</th><th>Monto</th></tr></thead>
          <tbody>
            {commissions.map((c,i) => (
              <tr key={i}>
                <td>{c.sale_date}</td>
                <td>{c.product} (S/ {c.sale_amount})</td>
                <td>{c.level}</td>
                <td>{(c.pct*100).toFixed(2)}%</td>
                <td>S/ {c.amount.toFixed(2)}</td>
              </tr>
            ))}
            {commissions.length===0 && <tr><td colSpan="5">No hay comisiones.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 style={{margin:0}}>Ventas propias</h3>
        <ul>
          {userSales.map(s => <li key={s.id}>{s.date} — {s.product} — S/ {s.amount}</li>)}
          {userSales.length===0 && <li>Sin ventas</li>}
        </ul>
      </div>
    </div>
  )
}

function AgentPanel() {
  const [selected, setSelected] = useState('u1')
  const totals = users.map(u => ({
    id:u.id, name:u.name, code:u.code,
    total_sales: sales.filter(s => s.user_id===u.id).reduce((a,b)=>a+b.amount,0),
    total_commissions: getCommissionsForUser(u.id).reduce((a,b)=>a+b.amount,0)
  }))

  return (
    <div>
      <div style={{display:'flex', gap:12, marginBottom:12}}>
        <div className="card" style={{flex:'0 0 260px', maxHeight:400, overflow:'auto'}}>
          <h3>Usuarios</h3>
          {users.map(u => (
            <div key={u.id} style={{padding:'8px 0', borderBottom:'1px solid #f3f4f6', cursor:'pointer'}} onClick={()=>setSelected(u.id)}>
              <div style={{fontWeight:600}}>{u.name} <span style={{fontSize:12,color:'#6b7280'}}>{u.code}</span></div>
              <div style={{fontSize:12,color:'#6b7280'}}>ID: {u.id}</div>
            </div>
          ))}
          <button className="small-btn" style={{marginTop:8}} onClick={()=>{
            exportToExcel('GLOBAL_REPORT.xlsx', [
              { name: 'Users', data: totals },
              { name: 'Sales', data: sales }
            ])
          }}>Exportar Global</button>
        </div>

        <div style={{flex:1}}>
          <div className="card">
            <h3>Detalle — {findUser(selected).name}</h3>
            <UserPanel userId={selected} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Resumen (Top por comisiones)</h3>
        <table className="table" style={{marginTop:8}}>
          <thead><tr><th>Usuario</th><th>Ventas (S/)</th><th>Comisiones (S/)</th></tr></thead>
          <tbody>
            {totals.sort((a,b)=>b.total_commissions-a.total_commissions).map(t=>(
              <tr key={t.id}><td>{t.name}</td><td>{t.total_sales}</td><td>{t.total_commissions.toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Main App
export default function App(){
  const [view, setView] = useState('USER')
  const [currentUser, setCurrentUser] = useState('u2')

  // derive data for Excel export
  const allCommissions = sales.flatMap(s => calculateCommissionsForSale(s))

  return (
    <div>
      <header className="header">
        <div>
          <div style={{fontSize:18, fontWeight:700}}>FINANCIA TU VIDA</div>
          <div style={{fontSize:12, color:'#6b7280'}}>Demo — Sistema de control 7x8</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <select value={view} onChange={e=>setView(e.target.value)} style={{padding:8, borderRadius:6}}>
            <option value="USER">Usuario</option>
            <option value="AGENT">Agente</option>
          </select>
          {view==='USER' && (
            <select value={currentUser} onChange={e=>setCurrentUser(e.target.value)} style={{padding:8, borderRadius:6}}>
              {users.map(u=> <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
            </select>
          )}
          <button className="btn" onClick={()=>exportToExcel('EXPORT_FINANCIATUVIDA.xlsx', [
            { name: 'Sales', data: sales },
            { name: 'Commissions', data: allCommissions }
          ])}>Exportar Excel</button>
        </div>
      </header>

      <div className="container">
        {view==='USER' ? <UserPanel userId={currentUser} /> : <AgentPanel />}
        <div className="footer" style={{marginTop:24}}>Demo — Datos simulados. Archivos .xlsx compatibles con Excel y WPS Office.</div>
      </div>
    </div>
  )
}
