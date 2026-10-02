import React, { useState } from 'react';
import { deriveRaciMatrix } from '../../../extensions/raci-engine';
import type { RaciStatus, RaciCode } from '../../../extensions/raci-engine';

type Props = { modeler: any; open: boolean; onClose: () => void };
type EditCell = { elementId: string; activity: string; role: string; codes: RaciCode[] };

const RACICODES: RaciCode[] = ['R', 'A', 'C', 'I'];
const statusLabel: Record<RaciStatus, string> = { explicit: 'Explicite', inferred: 'Inféré', missing: 'Manquant' };
const statusClass: Record<RaciStatus, string> = {
  explicit: 'raci-status-explicit',
  inferred: 'raci-status-inferred',
  missing: 'raci-status-missing',
};
const propertyByCode: Record<RaciCode, string> = { R: 'responsible', A: 'accountable', C: 'consulted', I: 'informed' };
const statusPropertyByCode: Record<RaciCode, string> = {
  R: 'responsibleStatus', A: 'accountableStatus', C: 'consultedStatus', I: 'informedStatus',
};
const codeLabel: Record<RaciCode, string> = {
  R: 'R — Responsable', A: 'A — Acteur', C: 'C — Consulté', I: 'I — Informé',
};

export function RaciMatrix({ modeler, open, onClose }: Props) {
  const [, setRefresh] = useState(0);
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  if (!open) return null;

  const definitions = modeler?.getDefinitions?.();
  const matrix = definitions ? deriveRaciMatrix(definitions) : { roles: [], activities: [] };
  const inferredCount = matrix.activities.reduce(
    (count, activity) => count + activity.cells.filter(cell => cell.status === 'inferred').length, 0,
  );

  const selectActivity = (elementId: string) => {
    const elementRegistry = modeler?.get?.('elementRegistry');
    const selection = modeler?.get?.('selection');
    const element = elementRegistry?.get?.(elementId);
    if (element && selection) selection.select(element);
  };

  const openCellEditor = (elementId: string, activity: string, role: string, codes: RaciCode[]) => {
    selectActivity(elementId);
    setEditCell({ elementId, activity, role, codes: [...codes] });
  };

  const updateCellCode = (code: RaciCode, checked: boolean) => {
    if (!editCell) return;
    const codes = checked ? Array.from(new Set([...editCell.codes, code])) : editCell.codes.filter(current => current !== code);
    setEditCell({ ...editCell, codes });
  };

  const saveCellEdit = () => {
    if (!editCell) return;
    const modeling = modeler?.get?.('modeling');
    const elementRegistry = modeler?.get?.('elementRegistry');
    const element = elementRegistry?.get?.(editCell.elementId);
    if (!modeling || !element) return setEditCell(null);

    const properties: Record<string, string | undefined> = {};
    for (const code of RACICODES) {
      const property = propertyByCode[code];
      const statusProperty = statusPropertyByCode[code];
      const current = String(element.businessObject?.get?.('raci:' + property) ?? element.businessObject?.['raci:' + property] ?? '');
      const roles = current.split(',').map((role: string) => role.trim()).filter(Boolean);
      const hasRole = roles.includes(editCell.role);
      const shouldHaveRole = editCell.codes.includes(code);
      if (shouldHaveRole && !hasRole) roles.push(editCell.role);
      else if (!shouldHaveRole && hasRole) roles.splice(roles.indexOf(editCell.role), 1);
      properties['raci:' + property] = roles.length ? roles.join(', ') : undefined;
      if (shouldHaveRole) properties['raci:' + statusProperty] = 'explicit';
      else if (hasRole) properties['raci:' + statusProperty] = undefined;
    }
    modeling.updateProperties(element, properties);
    setEditCell(null);
    setRefresh(value => value + 1);
  };

  const acceptInferred = () => {
    const modeling = modeler?.get?.('modeling');
    const elementRegistry = modeler?.get?.('elementRegistry');
    if (!modeling || !elementRegistry) return;

    for (const activity of matrix.activities) {
      const element = elementRegistry.get(activity.elementId);
      if (!element) continue;
      const properties: Record<string, string | undefined> = {};
      for (const cell of activity.cells) {
        if (cell.status !== 'inferred') continue;
        for (const code of cell.codes) {
          const property = propertyByCode[code];
          const statusProperty = statusPropertyByCode[code];
          const current = String(element.businessObject?.get?.('raci:' + property) ?? element.businessObject?.['raci:' + property] ?? '');
          const roles = current.split(',').map((role: string) => role.trim()).filter(Boolean);
          if (!roles.includes(cell.role)) roles.push(cell.role);
          properties['raci:' + property] = roles.join(', ');
          properties['raci:' + statusProperty] = 'explicit';
        }
      }
      if (Object.keys(properties).length) modeling.updateProperties(element, properties);
    }
    setRefresh(value => value + 1);
  };

  return (
    <div className="raci-overlay">
      <div className="raci-panel">
        <div className="raci-header">
          <div>
            <h2>Matrice RACI</h2>
            <div className="raci-legend">
              <span><b>R</b> Responsable</span><span><b>A</b> Acteur</span><span><b>C</b> Consulté</span><span><b>I</b> Informé</span>
            </div>
          </div>
          <div className="raci-header-actions">
            {inferredCount > 0 && <button type="button" onClick={acceptInferred}>Accepter les inférés ({inferredCount})</button>}
            <button type="button" onClick={onClose}>Fermer</button>
          </div>
        </div>
        <div className="raci-table-wrapper">
          <table className="raci-table">
            <thead><tr><th>Activité</th>{matrix.roles.map(role => <th key={role}>{role}</th>)}</tr></thead>
            <tbody>
              {matrix.activities.map(activity => (
                <tr key={activity.elementId}>
                  <th className="raci-activity raci-activity-clickable" onClick={() => selectActivity(activity.elementId)}>{activity.activity}</th>
                  {activity.cells.map(cell => (
                    <td key={cell.role} className={statusClass[cell.status] + ' raci-cell-clickable'}
                      title={statusLabel[cell.status] + ' — clic : sélectionner, double-clic : modifier'}
                      onClick={() => selectActivity(activity.elementId)}
                      onDoubleClick={() => openCellEditor(activity.elementId, activity.activity, cell.role, cell.codes)}>
                      <div className="raci-cell-code">{cell.codes.length ? cell.codes.join('/') : '—'}</div>
                      <div className="raci-cell-status">{statusLabel[cell.status]}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="raci-footer">
          <span>🟢 Explicite</span><span>🟠 Inféré</span><span>⚪ Manquant</span>
          <span>{matrix.activities.length} activité(s)</span><span>Clic : sélectionner · double-clic : modifier R/A/C/I</span>
        </div>
        {editCell && (
          <div className="raci-editor-backdrop" onClick={() => setEditCell(null)}>
            <div className="raci-editor" role="dialog" aria-modal="true" onClick={event => event.stopPropagation()}>
              <h3>Modifier la cellule RACI</h3>
              <div className="raci-editor-context"><strong>{editCell.activity}</strong><span>Rôle : {editCell.role}</span></div>
              <div className="raci-editor-options">
                {RACICODES.map(code => (
                  <label key={code}><input type="checkbox" checked={editCell.codes.includes(code)} onChange={event => updateCellCode(code, event.target.checked)} />{codeLabel[code]}</label>
                ))}
              </div>
              <div className="raci-editor-help">Les valeurs cochées seront enregistrées comme explicites.</div>
              <div className="raci-editor-actions">
                <button type="button" onClick={() => setEditCell(null)}>Annuler</button>
                <button type="button" onClick={saveCellEdit}>Enregistrer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}