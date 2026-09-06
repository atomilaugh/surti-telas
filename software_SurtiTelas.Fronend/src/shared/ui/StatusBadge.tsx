import React from 'react';
import { Badge } from '@/shared/ui/Badge';
import { StatusVariant } from '@/shared/constants/statusColors';
import {
  ORDER_STATUS_COLORS,
  CUSTOM_ORDER_STATUS_COLORS,
  PRODUCTION_STATUS_COLORS,
  PAYMENT_STATUS_COLORS,
  INVOICE_STATUS_COLORS,
  RECEIPT_STATUS_COLORS,
  DELIVERY_STATUS_COLORS,
  RETURN_STATUS_COLORS,
  PRODUCT_STATUS_COLORS,
  STOCK_STATUS_COLORS,
  WORKSHOP_STATUS_COLORS,
  ALERT_STATUS_COLORS,
  CONTACT_STATUS_COLORS,
  COMMISSION_STATUS_COLORS,
  PURCHASE_STATUS_COLORS,
  SALE_STATUS_COLORS,
  AUDIT_STATUS_COLORS,
  GARMENT_CONTROL_STATUS_COLORS,
  INVENTORY_ALERT_STATUS_COLORS,
  GENERIC_ACTIVE_STATUS_COLORS,
  GENERIC_STATUS_COLORS,
} from '@/shared/constants/statusColors';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  label?: string;
  dot?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<string, StatusVariant> = {
  ...ORDER_STATUS_COLORS,
  ...CUSTOM_ORDER_STATUS_COLORS,
  ...PRODUCTION_STATUS_COLORS,
  ...PAYMENT_STATUS_COLORS,
  ...INVOICE_STATUS_COLORS,
  ...RECEIPT_STATUS_COLORS,
  ...DELIVERY_STATUS_COLORS,
  ...RETURN_STATUS_COLORS,
  ...PRODUCT_STATUS_COLORS,
  ...STOCK_STATUS_COLORS,
  ...WORKSHOP_STATUS_COLORS,
  ...ALERT_STATUS_COLORS,
  ...CONTACT_STATUS_COLORS,
  ...COMMISSION_STATUS_COLORS,
  ...PURCHASE_STATUS_COLORS,
  ...SALE_STATUS_COLORS,
  ...AUDIT_STATUS_COLORS,
  ...GARMENT_CONTROL_STATUS_COLORS,
  ...INVENTORY_ALERT_STATUS_COLORS,
  ...GENERIC_ACTIVE_STATUS_COLORS,
  ...GENERIC_STATUS_COLORS,
};

const FALLBACK_VARIANT: StatusVariant = 'default';

export const StatusBadge = ({ status, variant, label, dot, className, ...rest }: StatusBadgeProps & React.HTMLAttributes<HTMLSpanElement>) => {
  const resolvedVariant = variant ?? STATUS_COLORS[status] ?? FALLBACK_VARIANT;
  const displayLabel = label ?? status;

  return (
    <Badge variant={resolvedVariant} className={className} dot={dot} {...rest}>
      {displayLabel}
    </Badge>
  );
};
