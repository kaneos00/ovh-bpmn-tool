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

type Props = { modeler: any; open: boolean; onClose: () => void };
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

export function RaciMatrix({ modeler, open, onClose }: Props) {
  const [actors, setActors] = useState<string[]>([]);
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [newActor, setNewActor] = useState('');
  const [editingActor, setEditingActor] = useState<string | null>(null);
  const [editingActorValue, setEditingActorValue] = useState('');

  const definitions = modeler?.getDefinitions?.();
  const configuredActors = definitions ? getConfiguredRaciActors(definitions) : undefined;

  const getProcessElement = () => {
    const process = definitions && getRaciProcess(definitions);
    if (!process) return undefined;

    return modeler?.get?.('elementRegistry')?.get?.(process.id);
  };

  useEffect(() => {
    if (!open || !definitions || configuredActors !== undefined) return;

    const processElement = getProcessElement();
    if (!processElement) return;

    const inferredActors = inferRaciActors(definitions);
    modeler?.get?.('modeling')?.updateProperties(processElement, {
      actors: serializeRaciActors(inferredActors),
    });
    setActors(inferredActors);
  }, [open, definitions, configuredActors, modeler]);

  if (!open) return null;

  const matrix = definitions
    ? deriveRaciMatrix(definitions)
    : { roles: [], activities: [] };
  const displayedActors = definitions && actors.length === 0
    ? getRaciActors(definitions)
    : actors;
  const inferredCount = matrix.activities.reduce(
    (count, activity) =>
      count + activity.cells.filter(cell => cell.status === 'inferred').length,
    0,
  );

  const updateActors = (nextActors: string[]) => {
    const normalized = uniqueActors(nextActors);
    const processElement = getProcessElement();
    if (!processElement) return;

    modeler?.get?.('modeling')?.updateProperties(processElement, {
      actors: serializeRaciActors(normalized),
    });
    setActors(normalized);
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
    setActors(current => [...current]);
  };

  const acceptInferred = () => {
    const elementRegistry = modeler?.get?.('elementRegistry');
    if (!elementRegistry) return;

    let acceptedCells = 0;

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
          acceptedCells++;
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

    setActors(current => [...current]);
  };

  return (
    <div className="raci-overlay">
      <div className="raci-panel">
        <div className="raci-header">
          <div>
            <h2>Matrice RACI</h2>
            <div className="raci-legend">
              <span><b>R</b> Responsable</span>
              <span><b>A</b> Acteur</span>
              <span><b>C</b> Consulté</span>
              <span><b>I</b> Informé</span>
            </div>
          </div>
          <div className="raci-header-actions">
            {inferredCount > 0 && (
              <button type="button" onClick={acceptInferred}>
                Accepter les inférés ({inferredCount})
              </button>
            )}
            <button type="button" onClick={onClose}>Fermer</button>
          </div>
        </div>

        <section className="raci-actors">
          <div className="raci-actors-header">
            <div>
              <h3>Acteurs du processus</h3>
              <p>
                La liste est initialisée par l'inférence BPMN. Vous pouvez
                l'enrichir, renommer ou supprimer un acteur.
              </p>
            </div>
          </div>

          <div className="raci-actors-add">
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

          <div className="raci-actors-list">
            {displayedActors.map(actor => (
              <div className="raci-actor" key={actor}>
                {editingActor === actor ? (
                  <>
                    <input
                      value={editingActorValue}
                      onChange={event => setEditingActorValue(event.target.value)}
                    />
                    <button type="button" onClick={saveRename}>Enregistrer</button>
                    <button type="button" onClick={() => setEditingActor(null)}>Annuler</button>
                  </>
                ) : (
                  <>
                    <span>{actor}</span>
                    <button type="button" onClick={() => startRename(actor)}>Modifier</button>
                    <button type="button" onClick={() => removeActor(actor)}>Supprimer</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="raci-table-wrapper">
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

        {editCell && (
          <div className="raci-editor-backdrop">
            <div
              className="raci-editor"
              role="dialog"
              aria-modal="true"
            >
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
  );
}
