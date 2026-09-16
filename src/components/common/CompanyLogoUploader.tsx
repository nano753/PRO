import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Check } from 'lucide-react';
import { compressImageToBase64 } from '../../utils/image';

interface CompanyLogoUploaderProps {
  value?: string;
  onChange: (base64Image: string) => void;
  label?: string;
  sublabel?: string;
}

export const CompanyLogoUploader: React.FC<CompanyLogoUploaderProps> = ({
  value,
  onChange,
  label = 'Foto / Logotipo da Empresa',
  sublabel = 'Aparecerá no cabeçalho do cupom fiscal / comprovante e no menu do sistema.',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const processFile = async (file: File) => {
    setErrorMessage('');
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    try {
      setIsProcessing(true);
      const base64 = await compressImageToBase64(file, 400, 0.85);
      onChange(base64);
    } catch (err) {
      setErrorMessage((err as Error).message || 'Erro ao processar imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300">{label}</label>
        {value && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <Check className="w-3 h-3" /> Foto anexada
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-slate-700/80">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-slate-700 flex items-center justify-center p-1.5 shadow-inner">
              <img
                src={value}
                alt="Logo da Empresa"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <p className="text-xs text-slate-300 font-medium">
              Foto/Logo pronta para ser exibida nos cupons e no sistema.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Trocar foto</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remover</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/50 hover:bg-slate-950/80'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ImageIcon className="w-6 h-6 text-blue-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">
              {isProcessing ? 'Otimizando imagem...' : 'Clique ou arraste a foto/logo da sua empresa'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>
          </div>
          <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">
            PNG, JPG ou WEBP (Otimização automática)
          </span>
        </div>
      )}

      {errorMessage && (
        <p className="text-xs text-rose-400 font-medium">{errorMessage}</p>
      )}
    </div>
  );
};
