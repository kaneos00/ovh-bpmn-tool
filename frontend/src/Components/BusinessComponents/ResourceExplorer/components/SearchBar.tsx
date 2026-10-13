import React from 'react';
import { FormControl, Input } from '@mui/joy';
import { Search } from '@mui/icons-material';

type SearchBarProps = {
  onSearch: (term: string) => void;
};

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  return (
    <FormControl size="md" sx={{ width: { xs: "100%", sm: 420 }, maxWidth: "100%" }}>
      <Input
        placeholder="Rechercher un processus ou un dossier…"
        startDecorator={<Search fontSize="small" />}
        onChange={event => onSearch(event.target.value)}
      />
    </FormControl>
  );
};
