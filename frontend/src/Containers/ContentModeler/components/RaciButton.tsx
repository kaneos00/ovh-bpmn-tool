import React from 'react';

type Props = { onClick: () => void };

export function RaciButton({ onClick }: Props) {
  return (
    <button type="button" onClick={onClick} title="Afficher la matrice RACI">
      RACI
    </button>
  );
}
