import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Filter,
  Search,
  Calendar,
} from 'lucide-react';
import { databaseService } from '../services/databaseService';
import { backupService } from '../services/backupService';
import { Movement } from '../types';
import { useApp } from '../contexts/AppContext';

export const MovementsPage: React.FC = () => {
  const { formatCurrency, showToast } = useApp();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ENTRADA' | 'SAIDA'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await databaseService.getAll<Movement>('movements');
      data.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
      setMovements(data);
    } catch (e) {
      console.error('Error loading movements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const filteredMovements = movements.filter(m => {
    if (typeFilter !== 'ALL' && m.type !== typeFilter) return false;
    if (startDate && m.date < startDate) return false;
    if (endDate && m.date > endDate) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.productName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      m.reason.toLowerCase().includes(q) ||
      m.user.toLowerCase().includes(q)
    );
  });

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Data',
      'Hora',
      'Tipo',
      'Produto',
      'SKU',
      'Quantidade',
      'Valor Unitário',
      'Valor Total',
      'Motivo',
      'Usuário',
      'Fornecedor',
      'Observações',
    ];

    const rows = filteredMovements.map(m => [
      m.id,
      m.date,
      m.time,
      m.type,
      m.productName,
      m.sku || m.productSku || '',
      m.quantity,
      (m.unitPrice !== undefined && m.unitPrice !== null ? m.unitPrice : (m.unitCostOrPrice || 0)).toFixed(2),
      (m.totalValue || 0).toFixed(2),
      m.reason,
      m.user,
      m.supplier || '',
      m.notes || m.observation || '',
    ]);

    backupService.exportCSV('movimentacoes_estoque.csv', [headers, ...rows]);
    showToast('Planilha de movimentações exportada com sucesso!', 'success');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            <span>Histórico de Movimentações de Estoque</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Registro detalhado e imutável de todas as entradas, saídas e vendas do sistema.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-medium border border-slate-700 transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-blue-400" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Buscar por produto, SKU, motivo ou usuário..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm text-white focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap w-full md:w-auto items-center gap-2.5">
          {/* Type Filter */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTypeFilter('ENTRADA')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'ENTRADA' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter('SAIDA')}
              className={`px-3 py-1.5 rounded-lg transition ${
                typeFilter === 'SAIDA' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Saídas
            </button>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
            <span className="text-slate-500 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Data / Hora</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Produto</th>
                <th className="px-4 py-3.5 text-right">Qtd</th>
                <th className="px-4 py-3.5 text-right">Valor Total</th>
                <th className="px-4 py-3.5">Motivo</th>
                <th className="px-4 py-3.5">Usuário</th>
                <th className="px-4 py-3.5">Obs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredMovements.length > 0 ? (
                filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-mono text-slate-300">
                      <div>{m.date}</div>
                      <div className="text-[10px] text-slate-500">{m.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type === 'ENTRADA'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {m.type === 'ENTRADA' ? (
                          <ArrowDownRight className="w-3 h-3" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3" />
                        )}
                        <span>{m.type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{m.productName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">SKU: {m.sku || m.productSku || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">
                      {m.type === 'ENTRADA' ? `+${m.quantity}` : `-${m.quantity}`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
                      {formatCurrency(m.totalValue)}
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-medium">{m.reason}</td>
                    <td className="px-4 py-3 text-slate-400">{m.user}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">
                      {m.notes || m.observation || (m.supplier ? `Forn: ${m.supplier}` : '-')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                    Nenhuma movimentação registrada no período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
