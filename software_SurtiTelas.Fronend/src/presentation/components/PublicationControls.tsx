import React from 'react';
import { Eye, EyeOff, Edit3 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';

export type PublicationStatus = 'Publicado' | 'Borrador' | 'Oculto';

interface PublicationControlsProps {
  status: PublicationStatus;
  publicado: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onEdit?: () => void;
  onPreview?: () => void;
  isPublishing?: boolean;
  isUnpublishing?: boolean;
  canPublish: boolean;
  canUnpublish: boolean;
  className?: string;
}

export const PublicationControls: React.FC<PublicationControlsProps> = ({
   status,
   publicado,
   onPublish,
   onUnpublish,
   onEdit,
   onPreview,
   isPublishing,
   isUnpublishing,
   canPublish,
   canUnpublish,
   className,
  }) => {
   return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <StatusBadge status={status} dot />

      <div style={{ display: 'flex', gap: '6px', marginLeft: '4px' }}>
        {canPublish && !publicado && (
          <Button
            variant="success"
            size="xs"
            onClick={onPublish}
            loading={isPublishing}
            leftIcon={<Eye size={12} />}
          >
            Publicar
          </Button>
        )}

        {canUnpublish && publicado && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onUnpublish}
            loading={isUnpublishing}
            leftIcon={<EyeOff size={12} />}
          >
            Ocultar
          </Button>
        )}

        {canPublish && publicado && status === 'Oculto' && (
          <Button
            variant="success"
            size="xs"
            onClick={onPublish}
            loading={isPublishing}
            leftIcon={<Eye size={12} />}
          >
            Republicar
          </Button>
        )}

        {onEdit && (
          <Button
            variant="outline"
            size="xs"
            onClick={onEdit}
            leftIcon={<Edit3 size={12} />}
          >
            Editar
          </Button>
        )}

        {onPreview && (
          <Button
            variant="outline"
            size="xs"
            onClick={onPreview}
            leftIcon={<Eye size={12} />}
          >
            Vista previa
          </Button>
        )}
      </div>
    </div>
  );
};
