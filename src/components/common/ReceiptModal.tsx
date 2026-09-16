import React, { useRef, useState } from 'react';
import { Printer, CheckCircle2, ArrowRight, X, FileText } from 'lucide-react';
import { Sale } from '../../types';
import { useApp } from '../../contexts/AppContext';

interface ReceiptModalProps {
  isOpen: boolean;
  sale: Sale | null;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  sale,
  onClose,
  onNewSale,
}) => {
  const { settings, formatCurrency } = useApp();
  const [printWidth, setPrintWidth] = useState<'58mm' | '80mm' | 'A4'>(
    settings.pdv?.printerWidth || '80mm'
  );
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'dinheiro':
        return 'DINHEIRO';
      case 'credito':
        return 'CARTÃO DE CRÉDITO';
      case 'debito':
        return 'CARTÃO DE DÉBITO';
      case 'pix':
        return 'PIX';
      case 'misto':
        return 'PAGAMENTO MISTO';
      default:
        return method.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-0 print:bg-white print:w-full print:max-w-none">
        {/* Header with success notification (hidden when printing) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Venda Realizada com Sucesso!</h2>
              <p className="text-xs text-slate-400">Cupom de venda #{sale.saleNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Size selector (hidden when printing) */}
        <div className="print:hidden flex items-center justify-between px-6 py-2.5 bg-slate-800/60 border-b border-slate-700/60 text-xs">
          <span className="text-slate-400 font-medium">Formato de Impressão:</span>
          <div className="flex gap-1.5">
            {(['58mm', '80mm', 'A4'] as const).map(w => (
              <button
                key={w}
                onClick={() => setPrintWidth(w)}
                className={`px-2.5 py-1 rounded font-mono font-medium transition ${
                  printWidth === w
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt Container */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-950/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={receiptRef}
            className={`bg-white text-slate-900 font-mono text-xs p-5 shadow-md rounded-lg print:shadow-none print:rounded-none print:p-2 ${
              printWidth === '58mm'
                ? 'w-[58mm] max-w-[58mm] text-[11px]'
                : printWidth === '80mm'
                ? 'w-[80mm] max-w-[80mm] text-[12px]'
                : 'w-full max-w-md text-sm'
            }`}
          >
            {/* Header / Company Info */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400 mb-3">
              {settings.logo && (
                <img
                  src={settings.logo}
                  alt="Logo"
                  className="w-12 h-12 mx-auto mb-2 object-contain"
                />
              )}
              <h1 className="font-bold text-sm uppercase tracking-wide">
                {settings.companyName || 'ESTOQUE PRO'}
              </h1>
              {settings.document && <p className="text-[11px] text-slate-600">CNPJ/CPF: {settings.document}</p>}
              {settings.address && <p className="text-[10px] text-slate-600">{settings.address}</p>}
              {settings.phone && <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>}
              <div className="mt-2 pt-2 border-t border-dotted border-slate-300 text-[11px]">
                <p className="font-semibold">CUPOM NÃO FISCAL</p>
                <p>Venda Nº: <strong className="text-black">#{sale.saleNumber}</strong></p>
                <p>Data: {sale.date} - Hora: {sale.time}</p>
                <p>Operador: {sale.user}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-b border-dashed border-slate-400 pb-3 mb-3">
              <div className="flex justify-between font-bold border-b border-slate-300 pb-1 mb-1 text-[11px]">
                <span>ITEM / DESCRIÇÃO</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="leading-tight">
                    <div className="font-medium text-slate-900 truncate">{item.productName}</div>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>
                        {item.quantity} un x {formatCurrency(item.unitPrice)}
                        {item.discount > 0 && ` (-${formatCurrency(item.discount)})`}
                      </span>
                      <span className="font-semibold text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 pb-3 border-b border-dashed border-slate-400 mb-3 text-right">
              <div className="flex justify-between text-slate-600">
                <span>SUBTOTAL:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>DESCONTO ({sale.discountType === 'percent' ? `${sale.discountValue}%` : 'R$'}):</span>
                  <span>- {formatCurrency(sale.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-950 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-1 pb-3 border-b border-dashed border-slate-400 mb-3 text-[11px]">
              <div className="font-bold mb-1">FORMA DE PAGAMENTO:</div>
              {sale.payments && sale.payments.length > 0 ? (
                sale.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>• {getPaymentMethodLabel(p.method)}:</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between text-slate-700">
                  <span>• {getPaymentMethodLabel(sale.paymentMethod)}:</span>
                  <span className="font-medium">{formatCurrency(sale.total)}</span>
                </div>
              )}

              {sale.amountReceived > 0 && (
                <div className="flex justify-between text-slate-700 pt-1 border-t border-dotted border-slate-300">
                  <span>VALOR RECEBIDO:</span>
                  <span>{formatCurrency(sale.amountReceived)}</span>
                </div>
              )}
              {sale.change > 0 && (
                <div className="flex justify-between font-bold text-slate-900">
                  <span>TROCO:</span>
                  <span>{formatCurrency(sale.change)}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 space-y-1">
              {settings.receiptFooterMessage ? (
                <p className="whitespace-pre-line">{settings.receiptFooterMessage}</p>
              ) : (
                <>
                  <p>Obrigado pela preferência!</p>
                  <p>Volte Sempre!</p>
                </>
              )}
              <p className="font-mono text-[9px] pt-1">ESTOQUE PRO OFFLINE POS</p>
            </div>
          </div>
        </div>

        {/* Action Buttons (hidden when printing) */}
        <div className="print:hidden p-4 border-t border-slate-800 bg-slate-900 flex flex-wrap gap-2 justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Imprimir Cupom</span>
          </button>
          <button
            onClick={onNewSale}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition"
          >
            <span>Nova Venda</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
