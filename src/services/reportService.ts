import { databaseService } from './databaseService';
import { cashService } from './cashService';
import { Movement, Product, Sale, CashRegister } from '../types';

export interface DashboardMetrics {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stockCostValue: number;
  stockSaleValue: number;
  estimatedProfit: number;
  todaySalesAmount: number;
  todaySalesCount: number;
  activeCashAmount: number | null;
  hasOpenCash: boolean;
}

export interface BestSellingProduct {
  productId: string;
  name: string;
  sku: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface PaymentDistribution {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DailySalesData {
  date: string;
  formattedDate: string;
  total: number;
  count: number;
}

export const reportService = {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const products = await databaseService.getAll<Product>('products');
    const sales = await databaseService.getAll<Sale>('sales');
    const activeRegister = await cashService.getActiveRegister();

    const today = new Date().toISOString().split('T')[0];

    const totalProducts = products.length;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    let stockCostValue = 0;
    let stockSaleValue = 0;

    for (const p of products) {
      if (p.currentStock <= 0) {
        outOfStockProducts++;
      } else if (p.currentStock <= p.minStock) {
        lowStockProducts++;
      }
      stockCostValue += p.currentStock * p.costPrice;
      stockSaleValue += p.currentStock * p.salePrice;
    }

    const estimatedProfit = stockSaleValue - stockCostValue;

    const todayCompletedSales = sales.filter(s => s.status === 'concluida' && s.date === today);
    const todaySalesAmount = todayCompletedSales.reduce((acc, s) => acc + s.total, 0);
    const todaySalesCount = todayCompletedSales.length;

    return {
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      stockCostValue,
      stockSaleValue,
      estimatedProfit,
      todaySalesAmount,
      todaySalesCount,
      activeCashAmount: activeRegister ? activeRegister.expectedCash : null,
      hasOpenCash: !!activeRegister,
    };
  },

  async getDailySales(daysCount: number = 7): Promise<DailySalesData[]> {
    const sales = await databaseService.getAll<Sale>('sales');
    const completedSales = sales.filter(s => s.status === 'concluida');

    const result: DailySalesData[] = [];
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const daySales = completedSales.filter(s => s.date === dateStr);
      const total = daySales.reduce((acc, s) => acc + s.total, 0);

      const dayMonth = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      result.push({
        date: dateStr,
        formattedDate: dayMonth,
        total,
        count: daySales.length,
      });
    }

    return result;
  },

  async getBestSellingProducts(limit: number = 10): Promise<BestSellingProduct[]> {
    const sales = await databaseService.getAll<Sale>('sales');
    const completedSales = sales.filter(s => s.status === 'concluida');

    const map = new Map<string, BestSellingProduct>();

    for (const sale of completedSales) {
      for (const item of sale.items) {
        const existing = map.get(item.productId);
        if (existing) {
          existing.quantitySold += item.quantity;
          existing.totalRevenue += item.total;
        } else {
          map.set(item.productId, {
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            quantitySold: item.quantity,
            totalRevenue: item.total,
          });
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  },

  async getPaymentDistribution(): Promise<PaymentDistribution[]> {
    const sales = await databaseService.getAll<Sale>('sales');
    const completedSales = sales.filter(s => s.status === 'concluida');

    let totalDinheiro = 0;
    let countDinheiro = 0;
    let totalCredito = 0;
    let countCredito = 0;
    let totalDebito = 0;
    let countDebito = 0;
    let totalPix = 0;
    let countPix = 0;

    for (const sale of completedSales) {
      for (const p of sale.payments) {
        if (p.method === 'dinheiro') {
          totalDinheiro += p.amount;
          countDinheiro++;
        } else if (p.method === 'credito') {
          totalCredito += p.amount;
          countCredito++;
        } else if (p.method === 'debito') {
          totalDebito += p.amount;
          countDebito++;
        } else if (p.method === 'pix') {
          totalPix += p.amount;
          countPix++;
        }
      }
    }

    const totalGeneral = totalDinheiro + totalCredito + totalDebito + totalPix || 1;

    return [
      {
        method: 'dinheiro',
        label: 'Dinheiro',
        amount: totalDinheiro,
        count: countDinheiro,
        percentage: (totalDinheiro / totalGeneral) * 100,
      },
      {
        method: 'pix',
        label: 'Pix',
        amount: totalPix,
        count: countPix,
        percentage: (totalPix / totalGeneral) * 100,
      },
      {
        method: 'credito',
        label: 'Cartão de Crédito',
        amount: totalCredito,
        count: countCredito,
        percentage: (totalCredito / totalGeneral) * 100,
      },
      {
        method: 'debito',
        label: 'Cartão de Débito',
        amount: totalDebito,
        count: countDebito,
        percentage: (totalDebito / totalGeneral) * 100,
      },
    ];
  },

  async getMovementsSummary(): Promise<{ totalIn: number; totalOut: number; countIn: number; countOut: number }> {
    const movements = await databaseService.getAll<Movement>('movements');
    let totalIn = 0;
    let totalOut = 0;
    let countIn = 0;
    let countOut = 0;

    for (const m of movements) {
      if (m.type === 'ENTRADA') {
        totalIn += m.totalValue;
        countIn++;
      } else {
        totalOut += m.totalValue;
        countOut++;
      }
    }

    return { totalIn, totalOut, countIn, countOut };
  },
};
