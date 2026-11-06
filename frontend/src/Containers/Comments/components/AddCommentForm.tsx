import React, { useRef } from 'react';
import { Button, Input, Stack } from '@mui/joy';
import { useForm } from 'react-hook-form';

export type AddCommentFormFields = {
  comment: string;
};

export type AddCommentFormProps = {
  onFormSubmit: (props: AddCommentFormFields) => void;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  loading?: boolean;
};

export const AddCommentForm = ({
  onFormSubmit,
  placeholder = 'Add a comment...',
  submitLabel = 'Comment',
  disabled = false,
  loading = false,
}: AddCommentFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit } = useForm<AddCommentFormFields>({});

  return (
    <Stack sx={{ mt: 1 }}>
      <form
        onSubmit={handleSubmit(props => {
          onFormSubmit(props);
        })}
      >
        <Input
          {...register('comment')}
          disabled={disabled || loading}
          required
          onKeyDown={event => {
            if (event.key !== 'Enter') {
              return;
            }

            handleSubmit(props => {
              onFormSubmit(props);
            });
          }}
          slotProps={{
            input: { ref: inputRef },
          }}
          sx={{
            '--Input-minHeight': '54px',
            '--Input-decoratorChildHeight': '42px',
          }}
          placeholder={placeholder}
          endDecorator={<Button type="submit" disabled={disabled || loading} loading={loading}>{submitLabel}</Button>}
        />
      </form>
    </Stack>
  );
};
