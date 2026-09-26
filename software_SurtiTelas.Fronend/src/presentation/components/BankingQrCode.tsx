import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { appContent } from '@/shared/config/appContent';
import './BankingQrCode.css';

interface BankingQrCodeProps {
  amount?: number;
}

export const BankingQrCode: React.FC<BankingQrCodeProps> = ({ amount }) => {
  const bk = appContent.checkout.bankingKey;

  const qrValue = amount
    ? `${bk.qrPayload}|amount:${amount.toFixed(2)}`
    : bk.qrPayload;

  const handleCopy = () => {
    navigator.clipboard.writeText(bk.accountNumber);
    toast.success('Número de cuenta copiado');
  };

  return (
    <div className="bq-container">
      <div className="bq-qr-wrapper">
        <QRCodeSVG
          value={qrValue}
          size={144}
          level="M"
          fgColor="#0f172a"
          bgColor="#ffffff"
        />
      </div>

      <div className="bq-details">
        <div className="bq-row">
          <span className="bq-label">Banco</span>
          <span className="bq-value">{bk.bankName}</span>
        </div>
        <div className="bq-row">
          <span className="bq-label">Beneficiario</span>
          <span className="bq-value">{bk.beneficiary}</span>
        </div>
        <div className="bq-row bq-row -= 1highlight">
          <span className="bq-label">Cuenta</span>
          <span className="bq-value font-mono">{bk.accountNumber}</span>
          <button type="button" className="bq-copy-btn" onClick={handleCopy} aria-label="Copiar cuenta">
            <Copy size={14} />
          </button>
        </div>
        <div className="bq-row">
          <span className="bq-label">Tipo</span>
          <span className="bq-value">{bk.accountType}</span>
        </div>
        <div className="bq-row">
          <span className="bq-label">NIT/RUT</span>
          <span className="bq-value">{bk.taxId}</span>
        </div>
        {amount !== undefined && (
          <div className="bq-row bq-row -= 1total">
            <span className="bq-label">Total a pagar</span>
            <span className="bq-value">${amount.toLocaleString('es-CO')}</span>
          </div>
        )}
      </div>

      <p className="bq-hint">
        Escanea el código QR con tu banca en línea o app móvil para realizar el pago.
      </p>
    </div>
  );
};
