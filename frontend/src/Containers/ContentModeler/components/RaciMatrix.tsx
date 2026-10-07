import React, { useEffect, useState } from 'react';
import {
  deriveRaciMatrix,
  getConfiguredRaciActors,
  getRaciActors,
  getRaciProcess,
  inferRaciActors,
  serializeRaciActors,
} from '../../../extensions/raci-engine';
import type { RaciStatus, RaciCode } from '../../../extensions/raci-engine';

type Props = { modeler: any; open: boolean; view: 'matrix' | 'actors'; onClose: () => void };
type EditCell = { elementId: string; activity: string; role: string; codes: RaciCode[] };

const RACICODES: RaciCode[] = ['R', 'A', 'C', 'I'];
const statusLabel: Record<RaciStatus, string> = {
  explicit: 'Explicite',
  inferred: 'Inféré',
  missing: 'Manquant',
};
const statusClass: Record<RaciStatus, string> = {
  explicit: 'raci-status-explicit',
  inferred: 'raci-status-inferred',
  missing: 'raci-status-missing',
};
const propertyByCode: Record<RaciCode, string> = {
  R: 'responsible',
  A: 'accountable',
  C: 'consulted',
  I: 'informed',
};
const statusPropertyByCode: Record<RaciCode, string> = {
  R: 'responsibleStatus',
  A: 'accountableStatus',
  C: 'consultedStatus',
  I: 'informedStatus',
};
const codeLabel: Record<RaciCode, string> = {
  R: 'R — Responsable',
  A: 'A — Acteur',
  C: 'C — Consulté',
  I: 'I — Informé',
};

const uniqueActors = (actors: string[]) =>
  Array.from(new Set(actors.map(actor => actor.trim()).filter(Boolean)));

const modalStyle: React.CSSProperties = {
  position: 'fixed',
  inset: '20px',
  zIndex: 1001,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: 'var(--bpmn-color-background, #fff)',
  border: '1px solid #ccc',
  borderRadius: 6,
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
};

const modalBodyStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: 16,
};

export function RaciMatrix({ modeler, open, view, onClose }: Props) {
  const [actors, setActors] = useState<string[] | null>(null);
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [newActor, setNewActor] = useState('');
  const [editingActor, setEditingActor] = useState<string | null>(null);
  const [editingActorValue, setEditingActorValue] = useState('');
  const [, setRevision] = useState(0);

  const definitions = modeler?.getDefinitions?.();

  const getProcessElement = () => {
    const process = definitions && getRaciProcess(definitions);
    if (!process) return undefined;
    return modeler?.get?.('elementRegistry')?.get?.(process.id);
  };

  const refresh = () => setRevision(value => value + 1);

  useEffect(() => {
    if (!open || !definitions) return;

    const configuredActors = getConfiguredRaciActors(definitions);

    if (configuredActors !== undefined) {
      setActors(configuredActors);
    } else {
      const inferredActors = inferRaciActors(definitions);
      const processElement = getProcessElement();

      if (processElement) {
        modeler?.get?.('modeling')?.updateProperties(processElement, {
          'raci:actors': serializeRaciActors(inferredActors),
        });
      }

      setActors(inferredActors);
    }

    setShowActors(false);
    setShowMatrix(false);
    setEditCell(null);
    setEditingActor(null);
    setEditingActorValue('');
  }, [open, modeler]);

  if (!open) return null;

  const displayedActors = actors ?? (definitions ? getRaciActors(definitions) : []);
  const matrix = definitions
    ? deriveRaciMatrix(definitions)
    : { roles: [], activities: [] };

  const inferredCount = matrix.activities.reduce(
    (count, activity) =>
      count + activity.cells.filter(cell => cell.status === 'inferred').length,
    0,
  );

  const updateActors = (nextActors: string[]) => {
    const normalized = uniqueActors(nextActors);
    setActors(normalized);
    refresh();

    const processElement = getProcessElement();
    const modeling = modeler?.get?.('modeling');

    if (processElement && modeling) {
      modeling.updateProperties(processElement, {
        'raci:actors': serializeRaciActors(normalized),
      });
    }
  };

  const updateRaciProperties = (
    element: any,
    properties: Record<string, string | undefined>,
  ) => {
    const commandStack = modeler?.get?.('commandStack');

    if (commandStack) {
      commandStack.execute('element.updateProperties', { element, properties });
      return;
    }

    modeler?.get?.('modeling')?.updateProperties(element, properties);
  };

  const replaceActorInAssignments = (from: string, to?: string) => {
    const elementRegistry = modeler?.get?.('elementRegistry');
    if (!elementRegistry) return;

    for (const activity of matrix.activities) {
      const element = elementRegistry.get(activity.elementId);
      if (!element) continue;

      const properties: Record<string, string | undefined> = {};

      for (const code of RACICODES) {
        const property = propertyByCode[code];
        const current = String(element.businessObject?.[property] ?? '');
        const roles = current
          .split(',')
          .map((role: string) => role.trim())
          .filter(Boolean);

        if (!roles.includes(from)) continue;

        const nextRoles = roles
          .map(role => (role === from ? to : role))
          .filter(Boolean);

        properties[property] = Array.from(new Set(nextRoles)).join(', ') || undefined;
      }

      if (Object.keys(properties).length) updateRaciProperties(element, properties);
    }
  };

  const addActor = () => {
    const actor = newActor.trim();
    if (!actor || displayedActors.includes(actor)) return;

    updateActors([...displayedActors, actor]);
    setNewActor('');
  };

  const startRename = (actor: string) => {
    setEditingActor(actor);
    setEditingActorValue(actor);
  };

  const saveRename = () => {
    const previous = editingActor;
    const next = editingActorValue.trim();

    if (!previous || !next || (next !== previous && displayedActors.includes(next))) return;

    replaceActorInAssignments(previous, next);
    updateActors(displayedActors.map(actor => (actor === previous ? next : actor)));
    setEditingActor(null);
    setEditingActorValue('');
  };

  const removeActor = (actor: string) => {
    replaceActorInAssignments(actor);
    updateActors(displayedActors.filter(current => current !== actor));
  };

  const selectActivity = (elementId: string) => {
    const element = modeler?.get?.('elementRegistry')?.get?.(elementId);
    const selection = modeler?.get?.('selection');

    if (element && selection) selection.select(element);
  };

  const openCellEditor = (
    elementId: string,
    activity: string,
    role: string,
    codes: RaciCode[],
  ) => {
    selectActivity(elementId);
    setEditCell({ elementId, activity, role, codes: [...codes] });
  };

  const updateCellCode = (code: RaciCode, checked: boolean) => {
    if (!editCell) return;

    const codes = checked
      ? Array.from(new Set([...editCell.codes, code]))
      : editCell.codes.filter(current => current !== code);

    setEditCell({ ...editCell, codes });
  };

  const saveCellEdit = () => {
    if (!editCell) return;

    const element = modeler?.get?.('elementRegistry')?.get?.(editCell.elementId);
    if (!element) {
      setEditCell(null);
      return;
    }

    const properties: Record<string, string | undefined> = {};

    for (const code of RACICODES) {
      const property = propertyByCode[code];
      const statusProperty = statusPropertyByCode[code];
      const current = String(element.businessObject?.[property] ?? '');
      const roles = current
        .split(',')
        .map((role: string) => role.trim())
        .filter(Boolean);
      const hasRole = roles.includes(editCell.role);
      const shouldHaveRole = editCell.codes.includes(code);

      if (shouldHaveRole && !hasRole) roles.push(editCell.role);
      else if (!shouldHaveRole && hasRole) roles.splice(roles.indexOf(editCell.role), 1);

      properties[property] = roles.length ? roles.join(', ') : undefined;
      properties[statusProperty] = shouldHaveRole ? 'explicit' : undefined;
    }

    updateRaciProperties(element, properties);
    setEditCell(null);
    refresh();
  };

  const acceptInferred = () => {
    const elementRegistry = modeler?.get?.('elementRegistry');
    if (!elementRegistry) return;

    for (const activity of matrix.activities) {
      const element = elementRegistry.get(activity.elementId);
      if (!element) continue;

      const rolesByCode = new Map<RaciCode, Set<string>>();

      for (const cell of activity.cells) {
        if (cell.status !== 'inferred') continue;

        for (const code of cell.codes) {
          const roles = rolesByCode.get(code) ?? new Set<string>();
          roles.add(cell.role);
          rolesByCode.set(code, roles);
        }
      }

      if (!rolesByCode.size) continue;

      const properties: Record<string, string | undefined> = {};

      for (const code of RACICODES) {
        const inferredRoles = rolesByCode.get(code);
        if (!inferredRoles?.size) continue;

        const property = propertyByCode[code];
        const statusProperty = statusPropertyByCode[code];
        const current = String(element.businessObject?.[property] ?? '');
        const roles = new Set(
          current
            .split(',')
            .map((role: string) => role.trim())
            .filter(Boolean),
        );

        inferredRoles.forEach(role => roles.add(role));
        properties[property] = Array.from(roles).join(', ');
        properties[statusProperty] = 'explicit';
      }

      updateRaciProperties(element, properties);
    }

    refresh();
  };

  const closeActors = () => {
    setShowActors(false);
    setEditingActor(null);
    setEditingActorValue('');
  };

  const closeMatrix = () => {
    setShowMatrix(false);
    setEditCell(null);
  };

  return (
    <>
      {view === 'actors' && (
        <div className="raci-overlay">
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #ddd' }}>
              <div>
                <h2 style={{ margin: 0 }}>Acteurs / rôles du processus</h2>
                <p style={{ margin: '6px 0 0' }}>
                  La liste limite les acteurs disponibles dans les propriétés RACI.
                </p>
              </div>
              <button type="button" onClick={closeActors}>Fermer</button>
            </div>

            <div style={modalBodyStyle}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                  value={newActor}
                  placeholder="Nom de l'acteur"
                  onChange={event => setNewActor(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') addActor();
                  }}
                />
                <button type="button" onClick={addActor}>Ajouter</button>
              </div>

              <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                <table className="raci-actors-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8 }}>Participant / acteur</th>
                      <th style={{ textAlign: 'left', padding: 8, width: 220 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedActors.map(actor => (
                      <tr key={actor}>
                        <td style={{ padding: 8 }}>
                          {editingActor === actor ? (
                            <input
                              value={editingActorValue}
                              onChange={event => setEditingActorValue(event.target.value)}
                            />
                          ) : actor}
                        </td>
                        <td style={{ padding: 8 }}>
                          {editingActor === actor ? (
                            <>
                              <button type="button" onClick={saveRename}>Enregistrer</button>{' '}
                              <button type="button" onClick={() => setEditingActor(null)}>Annuler</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startRename(actor)}>Modifier</button>{' '}
                              <button type="button" onClick={() => removeActor(actor)}>Supprimer</button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'matrix' && (
        <div className="raci-overlay" style={{ zIndex: 1000 }}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid #ddd', gap: 16 }}>
              <div>
                <h2 style={{ margin: 0 }}>Matrice RACI</h2>
                <div className="raci-legend" style={{ marginTop: 8 }}>
                  <span><b>R</b> Responsable</span>
                  <span><b>A</b> Acteur</span>
                  <span><b>C</b> Consulté</span>
                  <span><b>I</b> Informé</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {inferredCount > 0 && (
                  <button type="button" onClick={acceptInferred}>
                    Accepter les inférés ({inferredCount})
                  </button>
                )}
                <button type="button" onClick={closeMatrix}>Fermer</button>
              </div>
            </div>

            <div style={modalBodyStyle}>
              <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 150px)' }}>
                <table className="raci-table">
                  <thead>
                    <tr>
                      <th>Activité</th>
                      {matrix.roles.map(role => <th key={role}>{role}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.activities.map(activity => (
                      <tr key={activity.elementId}>
                        <th
                          className="raci-activity raci-activity-clickable"
                          onClick={() => selectActivity(activity.elementId)}
                        >
                          {activity.activity}
                        </th>
                        {activity.cells.map(cell => (
                          <td
                            key={cell.role}
                            className={`${statusClass[cell.status]} raci-cell-clickable`}
                            title={`${statusLabel[cell.status]} — clic : sélectionner, double-clic : modifier`}
                            onClick={() => selectActivity(activity.elementId)}
                            onDoubleClick={() =>
                              openCellEditor(activity.elementId, activity.activity, cell.role, cell.codes)
                            }
                          >
                            <div className="raci-cell-code">
                              {cell.codes.length ? cell.codes.join('/') : '—'}
                            </div>
                            <div className="raci-cell-status">
                              {statusLabel[cell.status]}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="raci-footer">
                <span>🟢 Explicite</span>
                <span>🟠 Inféré</span>
                <span>⚪ Manquant</span>
                <span>{matrix.activities.length} activité(s)</span>
                <span>{displayedActors.length} acteur(s)</span>
                <span>Clic : sélectionner · double-clic : modifier R/A/C/I</span>
              </div>
            </div>

            {editCell && (
              <div className="raci-editor-backdrop">
                <div className="raci-editor" role="dialog" aria-modal="true">
                  <h3>Modifier la cellule RACI</h3>
                  <div className="raci-editor-context">
                    <strong>{editCell.activity}</strong>
                    <span>Acteur : {editCell.role}</span>
                  </div>
                  <div className="raci-editor-options">
                    {RACICODES.map(code => (
                      <label key={code}>
                        <input
                          type="checkbox"
                          checked={editCell.codes.includes(code)}
                          onChange={event => updateCellCode(code, event.target.checked)}
                        />
                        {codeLabel[code]}
                      </label>
                    ))}
                  </div>
                  <div className="raci-editor-help">
                    Les valeurs cochées seront enregistrées comme explicites.
                  </div>
                  <div className="raci-editor-actions">
                    <button type="button" onClick={() => setEditCell(null)}>Annuler</button>
                    <button type="button" onClick={saveCellEdit}>Enregistrer</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
