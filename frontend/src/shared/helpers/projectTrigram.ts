export const getProjectTrigram = (projectName: string): string => {
  const words = projectName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('fr')
    .match(/[A-Z0-9]+/g) ?? [];

  if (words.length >= 3) {
    return words.slice(0, 3).map(word => word[0]).join('');
  }

  if (words.length === 2) {
    const first = words[0][0] ?? 'P';
    const remainder = `${words[1]}${words[0].slice(1)}`;
    return `${first}${remainder.slice(0, 2)}`.padEnd(3, 'X');
  }

  return (words[0] ?? 'PRO').slice(0, 3).padEnd(3, 'X');
};
