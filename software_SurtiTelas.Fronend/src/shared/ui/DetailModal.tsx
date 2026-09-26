import { ReactNode } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle,
  CreditCard,
  FileText,
  Info,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import { Badge } from './Badge';
import { BaseModal, type BaseModalProps } from './Modal';
import s from './DetailModal.module.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary' | 'purple';
export type DetailTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';

export interface DetailModalHeader {
  icon?: ReactNode;
  title?: string;
  code?: string;
  subtitle?: string;
  meta?: ReactNode;
  status?: ReactNode;
  badgeLabel?: string;
  badgeVariant?: BadgeVariant;
}

export interface DetailField {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  fullWidth?: boolean;
  helper?: ReactNode;
  monospace?: boolean;
  tone?: DetailTone;
}

export interface DetailSection {
  title: string;
  icon?: ReactNode;
  description?: string;
  fields?: DetailField[];
  children?: ReactNode;
  fullWidth?: boolean;
}

export interface KpiCard {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: ReactNode;
  tone?: DetailTone;
  monospace?: boolean;
}

export interface ObservationBlock {
  title?: string;
  icon?: ReactNode;
  tone?: DetailTone;
  children: ReactNode;
}

export interface DetailModalProps extends Omit<BaseModalProps, 'title' | 'description' | 'icon' | 'badge' | 'meta' | 'footer'> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  header?: DetailModalHeader;
  sections?: DetailSection[];
  kpis?: KpiCard[];
  observations?: ObservationBlock | ObservationBlock[];
  footer?: ReactNode;
  size?: BaseModalProps['size'];
}

const iconByName: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  archive: Archive,
  bell: Bell,
  calendar: Calendar,
  credit: CreditCard,
  file: FileText,
  info: Info,
  mail: Mail,
  map: MapPin,
  package: Package,
  phone: Phone,
  shield: ShieldCheck,
  truck: Truck,
  user: User,
  users: Users,
  chart: BarChart3,
  check: CheckCircle,
};

export const DetailModal = ({
  open,
  onClose,
  title,
  subtitle,
  header,
  sections,
  kpis,
  observations,
  footer,
  size = 'lg',
  ...props
}: DetailModalProps) => {
  const headerData = header ?? inferHeader(title, subtitle);
  const statusBadge = headerData.status ?? (headerData.badgeLabel ? (
    <Badge variant={headerData.badgeVariant ?? 'default'} dot>
      {headerData.badgeLabel}
    </Badge>
  ) : null);

  return (
    <BaseModal
      {...props}
      open={open}
      onClose={onClose}
      title={headerData.title ?? title}
      description={headerData.subtitle ?? subtitle}
      icon={headerData.icon}
      badge={statusBadge}
      meta={headerData.meta}
      size={size}
      variant="premium"
      footer={footer}
    >
      <div className={s.detailContent}>
        {kpis && kpis.length > 0 && (
          <section className={s.kpiSection} aria-label="Métricas destacadas">
            <div className={s.kpiGrid}>
              {kpis.map((kpi, index) => (
                <article key={`${kpi.label}-${index}`} className={cn(s.kpiCard, s[`kpiCard -= 1${kpi.tone ?? 'default'}`])}>
                  <div className={s.kpiTop}>
                    <span className={s.kpiLabel}>{kpi.label}</span>
                    {kpi.icon && <span className={s.kpiIcon}>{kpi.icon}</span>}
                  </div>
                  <div className={cn(s.kpiValue, kpi.monospace && s.monoValue)}>{kpi.value}</div>
                  {kpi.helper && <p className={s.kpiHelper}>{kpi.helper}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {sections && sections.length > 0 && (
          <div className={s.sectionsStack}>
            {sections.map((section, index) => (
              <section key={`${section.title}-${index}`} className={cn(s.section, section.fullWidth && s.sectionFull)}>
                <div className={s.sectionHeader}>
                  <div className={s.sectionTitleWrap}>
                    {section.icon && <span className={s.sectionIcon}>{section.icon}</span>}
                    <h3 className={s.sectionTitle}>{section.title}</h3>
                  </div>
                  {section.description && <p className={s.sectionDescription}>{section.description}</p>}
                </div>

                {section.children || (
                  <div className={s.tableWrapper}>
                    <table className={s.detailTable}>
                      <tbody>
                        {section.fields?.map((field, fieldIndex) => (
                          <tr key={`${field.label}-${fieldIndex}`}>
                            <td className={s.detailCellLabel}>
                              {field.icon && <span className={s.fieldIcon}>{field.icon}</span>}
                              {field.label}
                            </td>
                            <td className={cn(s.detailCell, field.monospace && s.monoValue)}>{field.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {props.children && <div className={s.detailChildren}>{props.children}</div>}

        {observations && (
          <div className={s.observationsStack}>
            {Array.isArray(observations) ? observations.map((observation, index) => renderObservation(observation, index)) : renderObservation(observations, 0)}
          </div>
        )}
      </div>
    </BaseModal>
  );
};

const renderObservation = (observation: ObservationBlock, index: number) => (
  <section key={`observation-${index}`} className={cn(s.observationBlock, s[`observationBlock -= 1${observation.tone ?? 'default'}`])}>
    <div className={s.observationHeader}>
      {observation.icon ?? <FileText size={16} />}
      <h3>{observation.title ?? 'Observaciones'}</h3>
    </div>
    <div className={s.observationBody}>{observation.children}</div>
  </section>
);

export const DetailRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className={s.detailRow}>
    <span className={s.detailLabel}>{label}</span>
    <span className={s.detailValue}>{value}</span>
  </div>
);

export const DetailGrid = ({ items }: { items: Array<{ label: string; value: ReactNode; icon?: string }> }) => (
  <div className={s.detailGrid}>
    {items.map((item, index) => (
      <div key={`${item.label}-${index}`} className={s.detailItem}>
        <span className={s.detailItemLabel}>
          {item.icon && renderIcon(item.icon)}
          {item.label}
        </span>
        <span className={s.detailItemValue}>{item.value}</span>
      </div>
    ))}
  </div>
);

const inferHeader = (title: string, subtitle?: string): DetailModalHeader => {
  const normalized = title.toLowerCase();
  const icon = inferIcon(normalized);
  const code = extractCode(title);

  return {
    icon,
    title: title.replace(code ? ` ${code}` : '', '').replace(/^Detalle:\s*/i, '').replace(/^Cliente:\s*/i, '').trim(),
    code,
    subtitle,
  };
};

const inferIcon = (title: string): ReactNode => {
  if (title.includes('alerta') || title.includes('stock')) return <Bell size={18} />;
  if (title.includes('insumo') || title.includes('inventario') || title.includes('producto')) return <Package size={18} />;
  if (title.includes('produccion') || title.includes('orden') || title.includes('taller') || title.includes('prend')) return <Package size={18} />;
  if (title.includes('factura') || title.includes('pago') || title.includes('venta') || title.includes('venta')) return <CreditCard size={18} />;
  if (title.includes('usuario') || title.includes('asesor') || title.includes('cliente') || title.includes('acceso')) return <User size={18} />;
  if (title.includes('pedido')) return <Archive size={18} />;
  if (title.includes('domiciliario') || title.includes('proveedor')) return <Truck size={18} />;
  if (title.includes('contacto') || title.includes('mensaje')) return <Mail size={18} />;
  if (title.includes('reporte')) return <BarChart3 size={18} />;
  return <Info size={18} />;
};

const extractCode = (title: string): string | undefined => {
  const match = title.match(/\b[A-Z]{1,5}-?\d{2,}[A-Z0-9-]*\b|\bF\d{3}-\d{4}\b|\bPD-\d{4}\b/i);
  return match?.[0];
};

const renderIcon = (name: string) => {
  const Icon = iconByName[name];
  return Icon ? <Icon size={16} /> : null;
};
