'use client';

import { useState } from 'react';
import { Card, SectionLabel, Badge, Button } from '@/components/ui';

const INVENTORY = [
  { id: 'i1', item_type: 'powder', name: 'Vectan Ba9', lot: 'VB9-2025-44', quantity: 2500, unit: 'g', reorder_point: 500, manufacturer: 'Nobel Sport' },
  { id: 'i2', item_type: 'primer', name: 'Federal 100 (Small Pistol)', lot: 'FED100-B12', quantity: 850, unit: 'uds', reorder_point: 200, manufacturer: 'Federal' },
  { id: 'i3', item_type: 'bullet', name: 'Sierra 115gr FMJ', lot: 'SIE115-22', quantity: 1200, unit: 'uds', reorder_point: 300, manufacturer: 'Sierra' },
  { id: 'i4', item_type: 'brass', name: 'Starline 9mm', lot: 'STL9-A89', quantity: 480, unit: 'uds', reorder_point: 200, manufacturer: 'Starline' },
  { id: 'i5', item_type: 'powder', name: 'Hodgdon H4350', lot: 'HH43-2025-11', quantity: 380, unit: 'g', reorder_point: 500, manufacturer: 'Hodgdon' },
  { id: 'i6', item_type: 'bullet', name: 'Berger 175gr BTHP', lot: 'BER175-08', quantity: 200, unit: 'uds', reorder_point: 100, manufacturer: 'Berger' },
];

const RECIPES = [
  { id: 'r1', name: '9mm IPSC Standard', caliber: '9mm Para', powder: 'Vectan Ba9', charge_gr: 4.8, bullet: 'Sierra 115gr FMJ', primer: 'Federal 100', oal_mm: 29.7, power_factor: 132, validated: true },
  { id: 'r2', name: '.308 Largo Alcance', caliber: '.308 Win', powder: 'Hodgdon H4350', charge_gr: 42.5, bullet: 'Berger 175gr BTHP', primer: 'Federal 210M', oal_mm: 72.4, power_factor: null, validated: true },
];

const BATCHES = [
  { id: 'b1', code: 'R-2026-001', recipe: '9mm IPSC Standard', produced: 500, remaining: 342, date: '2026-03-01' },
  { id: 'b2', code: 'R-2026-002', recipe: '9mm IPSC Standard', produced: 300, remaining: 0, date: '2026-02-15' },
  { id: 'b3', code: 'LR-2026-001', recipe: '.308 Largo Alcance', produced: 100, remaining: 60, date: '2026-01-20' },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  powder: { label: 'Pólvora', color: '#f59e0b' },
  primer: { label: 'Fulminante', color: '#3b82f6' },
  bullet: { label: 'Punta', color: '#10b981' },
  brass: { label: 'Vaina', color: '#8b5cf6' },
};

function getStockVariant(qty: number, reorder: number): 'critical' | 'warning' | 'ok' {
  if (qty <= 0) return 'critical';
  if (qty < reorder) return 'critical';
  if (qty < reorder * 1.5) return 'warning';
  return 'ok';
}

const STATUS_LABELS = { critical: 'CRÍTICO', warning: 'BAJO', ok: 'OK' };

const inputStyle: React.CSSProperties = {
  background: '#0c111d', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 14px', color: '#e2e8f0', fontSize: 13, width: '100%', fontFamily: 'monospace', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  color: '#64748b', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, display: 'block',
};

export default function ReloadingPage() {
  const [tab, setTab] = useState<'inventory' | 'recipes' | 'batches' | 'new_item'>('inventory');
  const [newItem, setNewItem] = useState({ item_type: 'powder', name: '', lot: '', quantity: '', unit: 'g', reorder_point: '', manufacturer: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setNI = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNewItem(f => ({ ...f, [k]: e.target.value }));

  const handleAddItem = async () => {
    setSaving(true);
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newItem, quantity: parseFloat(newItem.quantity), reorder_point: parseFloat(newItem.reorder_point) }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0f172a', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {([['inventory', 'Inventario'], ['recipes', 'Recetas'], ['batches', 'Lotes'], ['new_item', '+ Insumo']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: tab === k ? '#1e293b' : 'transparent',
            color: tab === k ? '#f97316' : '#64748b',
            cursor: 'pointer', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'inventory' && (
        <Card>
          <SectionLabel>Inventario de insumos</SectionLabel>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Tipo', 'Nombre', 'Fabricante', 'Lote', 'Stock', 'Mínimo', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#334155', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INVENTORY.map(item => {
                const tl = TYPE_LABELS[item.item_type];
                const sv = getStockVariant(item.quantity, item.reorder_point);
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: tl.color + '22', color: tl.color }}>{tl.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>{item.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 11 }}>{item.manufacturer}</td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace', fontSize: 11 }}>{item.lot}</td>
                    <td style={{ padding: '10px 14px', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{item.quantity.toLocaleString('es-AR')} {item.unit}</td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace' }}>{item.reorder_point} {item.unit}</td>
                    <td style={{ padding: '10px 14px' }}><Badge variant={sv}>{STATUS_LABELS[sv]}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'recipes' && (
        <div style={{ display: 'grid', gap: 16 }}>
          {RECIPES.map(r => (
            <Card key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>{r.caliber}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {r.power_factor && <Badge variant="warning">PF {r.power_factor}</Badge>}
                  {r.validated && <Badge variant="ok">✓ VALIDADA</Badge>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                {[
                  ['Pólvora', r.powder],
                  ['Carga', `${r.charge_gr} gr`],
                  ['Punta', r.bullet],
                  ['Fulminante', r.primer],
                  ['OAL', `${r.oal_mm} mm`],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: '#0c111d', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ color: '#475569', fontSize: 10, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{l}</div>
                    <div style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'batches' && (
        <Card>
          <SectionLabel>Lotes producidos</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            {BATCHES.map(b => {
              const pctRemaining = Math.round((b.remaining / b.produced) * 100);
              const status = b.remaining === 0 ? 'neutral' : pctRemaining < 20 ? 'warning' : 'ok';
              return (
                <div key={b.id} style={{ background: '#0c111d', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ color: '#f97316', fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{b.code}</div>
                    <div style={{ color: '#475569', fontSize: 11 }}>{b.date}</div>
                  </div>
                  <div style={{ flex: 1, color: '#94a3b8', fontSize: 12 }}>{b.recipe}</div>
                  <div style={{ textAlign: 'right', minWidth: 130 }}>
                    <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13 }}>
                      {b.remaining.toLocaleString()} / {b.produced.toLocaleString()} uds
                    </div>
                    <div style={{ color: '#475569', fontSize: 11 }}>{pctRemaining}% restante</div>
                  </div>
                  <Badge variant={status as 'ok' | 'warning' | 'neutral'}>{b.remaining === 0 ? 'AGOTADO' : 'ACTIVO'}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'new_item' && (
        <Card style={{ maxWidth: 640 }}>
          <SectionLabel>// Agregar insumo al inventario</SectionLabel>
          {saved && <div style={{ background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#10b981', fontSize: 13 }}>✓ Insumo agregado al inventario</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Tipo *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={newItem.item_type} onChange={setNI('item_type')}>
                <option value="powder">Pólvora</option>
                <option value="primer">Fulminante</option>
                <option value="bullet">Punta</option>
                <option value="brass">Vaina</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input style={inputStyle} value={newItem.name} onChange={setNI('name')} placeholder="Ej: Vectan Ba9" />
            </div>
            <div>
              <label style={labelStyle}>Fabricante</label>
              <input style={inputStyle} value={newItem.manufacturer} onChange={setNI('manufacturer')} placeholder="Ej: Nobel Sport" />
            </div>
            <div>
              <label style={labelStyle}>N° de Lote *</label>
              <input style={inputStyle} value={newItem.lot} onChange={setNI('lot')} placeholder="Ej: VB9-2026-01" />
            </div>
            <div>
              <label style={labelStyle}>Cantidad *</label>
              <input type="number" style={inputStyle} value={newItem.quantity} onChange={setNI('quantity')} placeholder="Ej: 1000" />
            </div>
            <div>
              <label style={labelStyle}>Unidad *</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={newItem.unit} onChange={setNI('unit')}>
                <option value="g">Gramos (g)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="uds">Unidades (uds)</option>
                <option value="cajas">Cajas</option>
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Punto de reorden</label>
              <input type="number" style={inputStyle} value={newItem.reorder_point} onChange={setNI('reorder_point')} placeholder="Stock mínimo antes de alertar" />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <Button onClick={handleAddItem} disabled={saving}>
              {saving ? 'GUARDANDO...' : '+ AGREGAR INSUMO'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
