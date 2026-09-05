import React from 'react';
import { PlusCircle, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { type UseFormRegister, type FieldErrors, type UseFormWatch, type UseFormSetValue, type Control, type FieldArrayWithId, useWatch } from 'react-hook-form';
import { type FormValues } from '../MisPedidosPersonalizados';
import { Skeleton } from './Skeleton';

type ItemField = FieldArrayWithId<FormValues, 'items', 'id'>;
interface Personalizacion {
  tipo?: string;
  tecnica?: string;
  ubicacion?: string[];
  descripcion?: string;
  archivos?: string[];
  variantes?: Variante[];
}
interface Variante {
  talla?: string;
  color?: string;
  cantidad?: number | string;
}

export interface ProductStepProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  styles: Record<string, string>;
  control: Control<FormValues>;
  itemFields: ItemField[];
  activeItemIndex: number;
  setActiveItemIndex: (index: number) => void;
  editingPersonalizacionIndex: number | null;
  setEditingPersonalizacionIndex: (index: number | null) => void;
  showPersonalizacionForm: boolean;
  setShowPersonalizacionForm: (show: boolean) => void;
  productos: Array<{ id: string; nombre: string; tela?: string; colores?: string[]; tallas?: string[] }>;
  loadingCatalog: boolean;
  agregarProducto: () => void;
  agregarPersonalizacion: () => void;
  actualizarPersonalizacion: (persIndex: number, field: string, value: string | string[]) => void;
  agregarVariante: (persIndex: number) => void;
  eliminarVariante: (persIndex: number, varIndex: number) => void;
  actualizarVariante: (persIndex: number, varIndex: number, field: string, value: string | number) => void;
  eliminarPersonalizacion: (persIndex: number) => void;
  eliminarProducto: (idx: number) => void;
  imagenesReferencia: string[];
  handleReferenceImageChange: (itemIndex: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeReferenceImage: (itemIndex: number, imgIndex: number) => void;
  personalizacionFiles: Record<string, { file: File; blobUrl: string }[]>;
  setPersonalizacionFiles: React.Dispatch<React.SetStateAction<Record<string, { file: File; blobUrl: string }[]>>>;
}

export const ProductStep = ({ register, errors, watch, setValue, styles, control, itemFields, activeItemIndex, setActiveItemIndex, editingPersonalizacionIndex, setEditingPersonalizacionIndex, showPersonalizacionForm, setShowPersonalizacionForm, productos, agregarProducto, agregarPersonalizacion, actualizarPersonalizacion, agregarVariante, eliminarVariante, actualizarVariante, eliminarPersonalizacion, eliminarProducto, setPersonalizacionFiles }: ProductStepProps) => {
  const watchedItems = useWatch({ control, name: 'items' }) || [];
  const activeItem = watchedItems[activeItemIndex] || {};
  const _distribucionTallas = useWatch({ control, name: `items.${activeItemIndex}.distribucionTallas` }) || {};
  const editingPersonalizacion: Personalizacion = (editingPersonalizacionIndex !== null && activeItem?.personalizaciones?.[editingPersonalizacionIndex]) ? activeItem.personalizaciones[editingPersonalizacionIndex] : {} as Personalizacion;

  return (
    <div className={styles.sectionBlock}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {watchedItems.length === 0
          ? Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} style={{ flex: '1 1 220px' }}>
                <Skeleton width="100%" height={72} radius="var(--radius-lg)" />
              </div>
            ))
          : watchedItems.map((item, idx) => {
              const fieldId = itemFields[idx]?.id;
              const persCount = (item.personalizaciones || []).length;
              return (
                <div
                  key={fieldId || idx}
                  onClick={() => { setActiveItemIndex(idx); setEditingPersonalizacionIndex(null); setShowPersonalizacionForm(false); }}
                  className={`${styles.productCard} ${idx === activeItemIndex ? styles.productCardActive : ''}`}
                  style={{ flex: '1 1 220px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div className={styles.productCardName}>{item.productoNombre || `Producto ${idx + 1}`}</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); eliminarProducto(idx); }}
                      className={styles.removeFileBtn}
                      title="Eliminar producto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className={styles.productCardMeta}>
                    <span>{Object.values(item.distribucionTallas || {}).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0)} unidades</span>
                  <span>·</span>
                  <span>{persCount} personalización{persCount !== 1 ? 'es' : ''}</span>
                </div>
                {idx === activeItemIndex && (
                  <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                    <Check size={16} className="text-amber-600" />
                  </div>
                )}
              </div>
            );
          })}
        <button
          type="button"
          onClick={agregarProducto}
          className={styles.btnSecondary}
          style={{ flex: '0 0 auto', minHeight: '80px' }}
        >
          <PlusCircle size={18} />
          Agregar producto
        </button>
      </div>

      {/* Formulario del producto activo */}
      {itemFields[activeItemIndex] && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className={styles.formRowAttr4}>
            <div className={`${styles.field} ${styles.colSpan2}`}>
              <label htmlFor="producto-base" className={styles.label}>Producto base <span className={styles.labelRequired}>*</span></label>
              <input
                id="producto-base"
                className={styles.input}
                placeholder="Escribe el nombre del producto o selecciona uno del catálogo"
                aria-required="true"
                {...register(`items.${activeItemIndex}.productoNombre` as const, { required: 'El producto es obligatorio' })}
                list="productos-sugeridos-cliente"
              />
              <datalist id="productos-sugeridos-cliente">
                {productos.map(p => (
                  <option key={p.id} value={p.nombre} />
                ))}
              </datalist>
              {productos.length > 0 && <span className={styles.hintText}>Sugerencias del catálogo disponibles.</span>}
              {errors.items?.[activeItemIndex]?.productoNombre && <span className={styles.errorText}>{errors.items[activeItemIndex].productoNombre.message as string}</span>}
            </div>
          </div>
          <div className={styles.formRowAttr4}>
            <div className={styles.field}>
              <label htmlFor="item-material" className={styles.label}>Material/Tela</label>
              <input id="item-material" className={styles.input} placeholder="Material" {...register(`items.${activeItemIndex}.material` as const)} />
            </div>
          </div>

          <div className={styles.distributionSection}>
            <div className={styles.distributionHeader}>
              <h3 className={styles.distributionTitle}>Distribución de prendas</h3>
            </div>
            <div className={styles.distributionGrid}>
              {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((talla) => (
                <div key={talla} className={styles.distributionItem}>
                  <label className={styles.distributionLabel}>{talla}</label>
                  <input
                    className={styles.distributionInput}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={watch(`items.${activeItemIndex}.distribucionTallas.${talla}`) || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setValue(`items.${activeItemIndex}.distribucionTallas.${talla}`, val);
                      }}
                  />
                </div>
              ))}
            </div>
            <div className={styles.distributionTotal}>
              <span>Total</span>
              <span className={styles.distributionTotalValueSuccess}>
                {Object.values(watch(`items.${activeItemIndex}.distribucionTallas`) || {}).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0)}
              </span>
            </div>
          </div>

           <div className={styles.distributionSection}>
            <div className={styles.distributionHeader}>
              <h3 className={styles.distributionTitle}>Personalizaciones</h3>
            </div>
             {/* Formulario de personalización */}
             {showPersonalizacionForm && (
               <div className={styles.personalizationForm}>
                 <div className={styles.personalizationFormTitle}>
                   {editingPersonalizacionIndex !== null ? 'Editar personalización' : 'Nueva personalización'}
                 </div>
                 <div className={styles.formRowAttr4}>
                   <div className={styles.field}>
                     <label className={styles.label}>Tipo <span className={styles.labelRequired}>*</span></label>
                      <select
                        className={styles.select}
                        aria-required="true"
                        value={editingPersonalizacion.tipo || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.tipo`) || 'ESTAMPADO'}
                         onChange={(e) => {
                           const idx = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0);
                           actualizarPersonalizacion(idx, 'tipo', e.target.value);
                         }}
                      >
                       <option value="ESTAMPADO">Estampado</option>
                       <option value="BORDADO">Bordado</option>
                       <option value="SUBLIMACION">Sublimación</option>
                       <option value="VINILO">Vinilo</option>
                       <option value="OTRO">Otro</option>
                     </select>
                   </div>
                   <div className={styles.field}>
                     <label className={styles.label}>Técnica</label>
                      <input
                        className={styles.input}
                        placeholder="Ej: DTF, Serigrafía..."
                        value={editingPersonalizacion.tecnica || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.tecnica`) || ''}
                        onChange={(e) => {
                          const idx = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0);
                          actualizarPersonalizacion(idx, 'tecnica', e.target.value);
                        }}
                      />
                   </div>
                 </div>
                 <div className={styles.field}>
                   <label className={styles.label}>Ubicación</label>
                   <div className={styles.multiSelectContainer}>
                     <div className={styles.multiSelectOptions}>
                         {['FRENTE', 'ESPALDA', 'MANGA_IZQUIERDA', 'MANGA_DERECHA', 'PECHO', 'PUNTO_CORAZON', 'OTRA'].map((option) => {
                           const idx = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0);
                           const current = (editingPersonalizacion.ubicacion || watch(`items.${activeItemIndex}.personalizaciones.${idx}.ubicacion`) as string[] || []);
                           const isSelected = current.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${styles.multiSelectOption} ${isSelected ? styles.multiSelectOptionSelected : ''}`}
                               onClick={() => {
                                 const next = isSelected ? current.filter((u: string) => u !== option) : [...current, option];
                                 actualizarPersonalizacion(idx, 'ubicacion', next);
                               }}
                             >
                               {option.replace('MANGA_IZQUIERDA', 'Manga izq.').replace('MANGA_DERECHA', 'Manga der.').replace('PUNTO_CORAZON', 'Punto corazón')}
                             </button>
                           );
                         })}
                      </div>
                    </div>
                  </div>
                   <div className={styles.field}>
                     <label className={styles.label}>Descripción del diseño <span className={styles.labelRequired}>*</span></label>
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        aria-required="true"
                        placeholder="Describe el diseño..."
                        value={editingPersonalizacion.descripcion || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.descripcion`) || ''}
                        onChange={(e) => {
                          const idx = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0);
                          actualizarPersonalizacion(idx, 'descripcion', e.target.value);
                        }}
                      />
                   </div>
                   <div className={styles.field}>
                     <label className={styles.label}>Imágenes de referencia para personalizaciones</label>
                       <input
                         id={`pers-ref-images-${activeItemIndex}-${editingPersonalizacionIndex ?? 0}`}
                         type="file"
                         accept="image/*"
                         multiple
                         className={styles.hiddenInput}
                         data-testid="reference-image-input"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          const newEntries = files.map((f) => ({ file: f, blobUrl: URL.createObjectURL(f) }));
                          const urls = newEntries.map((entry) => entry.blobUrl);
                          const idx = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0);
                           const current = (editingPersonalizacion.archivos || watch(`items.${activeItemIndex}.personalizaciones.${idx}.archivos`) as string[] || []);
                           setValue(`items.${activeItemIndex}.personalizaciones.${idx}.archivos` as const, [...current, ...urls]);
                           setPersonalizacionFiles((prev) => {
                             const key = `${activeItemIndex}-${idx}`;
                             return { ...prev, [key]: [...(prev[key] || []), ...newEntries] };
                           });
                         }}
                      />
                     <label htmlFor={`pers-ref-images-${activeItemIndex}-${editingPersonalizacionIndex ?? 0}`} className={styles.uploadLabel}>
                       Seleccionar imágenes
                     </label>
                     {(editingPersonalizacion.archivos || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.archivos`) as string[] || []).length > 0 && (
                       <div className={styles.filePreview}>
                         {(editingPersonalizacion.archivos || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.archivos`) as string[] || []).map((url: string, imgIdx: number) => (
                            <div key={imgIdx} className={styles.fileChip}>
                               <img 
                                 src={url.startsWith('http') || url.startsWith('blob:') ? url : url} 
                                 alt={`Referencia personalización ${imgIdx + 1}`} 
                                 className={styles.fileChipImage}
                                 onError={(e) => { e.currentTarget.style.display = 'none'; }}
                               />
                              <span className={styles.fileChipName}>Imagen {imgIdx + 1}</span>
                              <button type="button" className={styles.removeFileBtn} onClick={() => {
                                const idx = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0);
                                const current = (editingPersonalizacion.archivos || watch(`items.${activeItemIndex}.personalizaciones.${idx}.archivos`) as string[] || []);
                                setValue(`items.${activeItemIndex}.personalizaciones.${idx}.archivos` as const, current.filter((_: string, i: number) => i !== imgIdx));
                              }}>Eliminar</button>
                            </div>
                         ))}
                       </div>
                     )}
                     <span className={styles.hintText}>Aquí también puedes adjuntar la imagen del diseño que quieres.</span>
                   </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Cantidades por Talla y Color</label>
                      {(editingPersonalizacion.variantes || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.variantes`) as Variante[] || []).map((variante: Variante, varIndex: number) => (
                        <div key={varIndex} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
                          <div className={styles.field} style={{ flex: '1 1 0' }}>
                            <select
                              className={styles.select}
                              value={variante.talla}
                              onChange={(e) => actualizarVariante(editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0), varIndex, 'talla', e.target.value)}
                            >
                              <option value="">Talla</option>
                              {['XS', 'S', 'M', 'L', 'XL', 'XXL']
                                .filter((talla) => Number(watch(`items.${activeItemIndex}.distribucionTallas.${talla}`) || 0) > 0)
                                .map((talla) => (
                                  <option key={talla} value={talla}>{talla}</option>
                                ))}
                            </select>
                          </div>
                          <div className={styles.field} style={{ flex: '1 1 0' }}>
                            <input className={styles.input} placeholder="Color" value={variante.color} onChange={(e) => actualizarVariante(editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0), varIndex, 'color', e.target.value)} />
                          </div>
                          <div className={styles.field} style={{ flex: '1 1 0' }}>
                            <input className={styles.input} type="number" min="0" placeholder="Cant." value={variante.cantidad} onChange={(e) => actualizarVariante(editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0), varIndex, 'cantidad', Number(e.target.value))} />
                          </div>
                          <div className={styles.field} style={{ flex: '0 0 auto' }}>
                            <button type="button" className={styles.removeFileBtn} onClick={() => eliminarVariante(editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0), varIndex)}><Trash2 size={14} /></button>
                          </div>
                        </div>
                      ))}
                     <button type="button" className={styles.quotationAddLine} onClick={() => agregarVariante(editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length || 0))}>
                       <PlusCircle size={16} />
                       <span>Agregar talla, color y cantidad</span>
                     </button>
                     <div className={styles.personalizationTotal}>
                       {(() => {
                          const variantes = (editingPersonalizacion.variantes || watch(`items.${activeItemIndex}.personalizaciones.${editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0)}.variantes`) as Variante[] || []);
                         const distribucion = watch(`items.${activeItemIndex}.distribucionTallas`) || {};
                         const resumenPorTalla: Record<string, { usado: number; total: number }> = {};
                         for (const variante of variantes) {
                           if (!variante.talla) continue;
                           if (!resumenPorTalla[variante.talla]) resumenPorTalla[variante.talla] = { usado: 0, total: Number(distribucion[variante.talla]) || 0 };
                           resumenPorTalla[variante.talla].usado += Number(variante.cantidad) || 0;
                         }
                         const resumen = Object.entries(resumenPorTalla)
                           .map(([talla, datos]) => `${talla}: ${datos.usado} / ${datos.total} utilizadas`)
                           .join('  |  ');
                         return <span>{resumen}</span>;
                       })()}
                     </div>
                    </div>
                    <div className={styles.personalizationFormActions}>
                      <button type="button" className={styles.quotationAddLine} onClick={() => { setShowPersonalizacionForm(false); setEditingPersonalizacionIndex(null); }}>
                        Cancelar
                      </button>
                      <button type="button" className={styles.btnPrimary} onClick={() => {
                        const persIndex = editingPersonalizacionIndex ?? (activeItem?.personalizaciones?.length ?? 0);
                        const distribucion = watch(`items.${activeItemIndex}.distribucionTallas`) || {};
                         const variantes = (editingPersonalizacion.variantes || watch(`items.${activeItemIndex}.personalizaciones.${persIndex}.variantes`) as Variante[] || []);
                        const sumaPorTalla: Record<string, number> = {};
                        for (const variante of variantes) {
                          const talla = variante.talla;
                          if (!talla) continue;
                          sumaPorTalla[talla] = (sumaPorTalla[talla] || 0) + (Number(variante.cantidad) || 0);
                        }
                        const errores: string[] = [];
                        for (const [talla, suma] of Object.entries(sumaPorTalla)) {
                          const distribucionTalla = Number(distribucion[talla]) || 0;
                          if (distribucionTalla <= 0) {
                            errores.push(`La talla ${talla} tiene variantes pero su distribución es 0. Elimina o reduce las variantes de ${talla}.`);
                          } else if (suma !== distribucionTalla) {
                            errores.push(`Debes distribuir las ${distribucionTalla} unidades de talla ${talla}. Actualmente has asignado ${suma}.`);
                          }
                        }
                        if (errores.length > 0) {
                          toast.error('No se puede guardar la personalización', { description: errores.join('\n') });
                          return;
                        }
                        setShowPersonalizacionForm(false);
                        setEditingPersonalizacionIndex(null);
                      }}>
                        Guardar personalización
                      </button>
                    </div>
                 </div>
               )}

                {/* Tarjetas de personalizaciones existentes */}
                <div className={styles.personalizationCardsList}>
                  {(activeItem?.personalizaciones || []).length === 0 ? (
                   <div className={styles.personalizationEmpty}>
                     <span>No hay personalizaciones creadas para este producto.</span>
                      <button type="button" className={styles.quotationAddLine} data-testid="add-personalization" onClick={() => {
                        const newIndex = (activeItem?.personalizaciones?.length ?? 0);
                        agregarPersonalizacion();
                        setEditingPersonalizacionIndex(newIndex);
                        setShowPersonalizacionForm(true);
                      }}>
                        <PlusCircle size={16} />
                        <span>Agregar personalización</span>
                      </button>
                   </div>
                 ) : (
                   (activeItem?.personalizaciones || [])
                      .filter((pers: Personalizacion) => {
                       const hasTipo = !!pers.tipo;
                       const hasDescripcion = !!pers.descripcion && pers.descripcion.trim() !== '';
                       const hasUbicacion = Array.isArray(pers.ubicacion) && pers.ubicacion.length > 0;
                        const hasVariantes = (pers.variantes || []).some((v: Variante) => Number(v.cantidad) > 0);
                       return hasTipo && (hasDescripcion || hasUbicacion || hasVariantes);
                     })
                      .map((pers: Personalizacion, persIndex: number) => (
                     <div key={persIndex} className={styles.personalizationCard}>
                       <div className={styles.personalizationCardHeader}>
                         <div>
                           <div className={styles.personalizationCardTitle}>{pers.tipo}</div>
                            <div className={styles.personalizationCardMeta}>
                              {(pers.ubicacion || []).map((u: string) => u.replace('MANGA_IZQUIERDA', 'Manga izq.').replace('MANGA_DERECHA', 'Manga der.').replace('PUNTO_CORAZON', 'Punto corazón')).join(', ')}
                            </div>
                           <div className={styles.personalizationCardDescription}>{pers.descripcion}</div>
                            <div className={styles.personalizationCardMeta}>
                              {(() => {
                                 const total = (pers.variantes || []).reduce((sum: number, v: Variante) => sum + (Number(v.cantidad) || 0), 0);
                                 const cantidad = Object.values(watch(`items.${activeItemIndex}.distribucionTallas`) || {}).reduce((sum: number, val: number | string | null | undefined) => sum + (Number(val) || 0), 0);
                                const exceeds = cantidad > 0 && total > cantidad;
                                return <span style={{ color: exceeds ? '#dc2626' : 'inherit' }}>{total} unidades{exceeds ? ` (supera las ${cantidad} disponibles)` : ''}</span>;
                              })()}
                            </div>
                         </div>
                         <div className={styles.personalizationCardActions}>
                           <button type="button" className={styles.quotationAddLine} onClick={() => { setEditingPersonalizacionIndex(persIndex); setShowPersonalizacionForm(true); }}>Editar</button>
                           <button type="button" className={styles.removeFileBtn} onClick={() => eliminarPersonalizacion(persIndex)}>Eliminar</button>
                         </div>
                       </div>
                     </div>
                   ))
                   )}
                   </div>
                 </div>
               </div>
             )}
           </div>
         );
       };