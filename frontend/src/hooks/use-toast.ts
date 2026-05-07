import { toast as sonnerToast } from 'sonner';

export const useToast = () => {
  return {
    toast: (title: string, description?: string, variant: 'default' | 'destructive' = 'default') => {
      sonnerToast(title, {
        description,
        style: variant === 'destructive' ? { border: '1px solid var(--danger)' } : undefined,
      });
    },
    success: (title: string, description?: string) => {
      sonnerToast.success(title, { description });
    },
    error: (title: string, description?: string) => {
      sonnerToast.error(title, { description });
    },
    info: (title: string, description?: string) => {
      sonnerToast.info(title, { description });
    },
  };
};

export const toast = (title: string, description?: string) => {
  sonnerToast(title, { description });
};
