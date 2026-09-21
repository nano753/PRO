import { databaseService } from './databaseService';
import { cashService } from './cashService';
import {
  CashMovement,
  CashRegister,
  Movement,
  PaymentEntry,
  PaymentMethodType,
  Product,
  Sale,
  SaleItem,
  CompanySettings,
} from '../types';

export interface CreateSaleInput {
  items: SaleItem[];
  subtotal: number;
  discountType: 'reais' | 'percent';
  discountValue: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethodType;
  payments: PaymentEntry[];
  amountReceived: number;
  change: number;
  username: string;
}

export const salesService = {
  async getAllSales(): Promise<Sale[]> {
    const sales = await databaseService.getAll<Sale>('sales');
    return sales.sort((a, b) => b.saleNumber - a.saleNumber);
  },

  async getSaleById(id: string): Promise<Sale | undefined> {
    return databaseService.getById<Sale>('sales', id);
  },

  async getNextSaleNumber(): Promise<number> {
    const sales = await databaseService.getAll<Sale>('sales');
    if (sales.length === 0) return 1001;
    const maxNum = Math.max(...sales.map(s => s.saleNumber || 0));
    return maxNum + 1;
  },

  async createSale(input: CreateSaleInput): Promise<Sale> {
    // 1. Verify Cash Register is open
    const activeRegister = await cashService.getActiveRegister();
    if (!activeRegister) {
      throw new Error(
        'Nenhum caixa está aberto no momento! Por favor, abra o caixa antes de realizar vendas.'
      );
    }

    // 2. Validate Items
    if (!input.items || input.items.length === 0) {
      throw new Error('O carrinho está vazio.');
    }

    // 3. Validate Stock for all items
    const settings = await databaseService.getById<CompanySettings>('settings', 'main');
    const blockOutOfStock = settings?.pdv?.blockOutOfStock ?? false;
    const productsToUpdate: { product: Product; newStock: number; soldQty: number }[] = [];

    for (const item of input.items) {
      const product = await databaseService.getById<Product>('products', item.productId);
      if (!product) {
        throw new Error(`Produto "${item.productName}" não foi encontrado no sistema.`);
      }

      if (blockOutOfStock && product.currentStock < item.quantity) {
        throw new Error(
          `Estoque insuficiente para "${product.name}". Disponível: ${product.currentStock} ${product.unit}, Solicitado: ${item.quantity} ${product.unit}.`
        );
      }

      productsToUpdate.push({
        product,
        newStock: product.currentStock - item.quantity,
        soldQty: item.quantity,
      });
    }

    // 4. Validate Payment
    const totalPaid = input.payments.reduce((acc, p) => acc + p.amount, 0);
    if (Number(totalPaid.toFixed(2)) < Number(input.total.toFixed(2))) {
      throw new Error(
        `Pagamento incompleto! Total da venda: R$ ${input.total.toFixed(2)}, Total pago: R$ ${totalPaid.toFixed(2)}.`
      );
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    const saleNumber = await this.getNextSaleNumber();
    const saleId = `sale-${Date.now()}`;

    const newSale: Sale = {
      id: saleId,
      saleNumber,
      items: input.items,
      subtotal: input.subtotal,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: input.discountAmount,
      total: input.total,
      paymentMethod: input.paymentMethod,
      payments: input.payments,
      amountReceived: input.amountReceived,
      change: input.change,
      user: input.username,
      date,
      time,
      status: 'concluida',
    };

    // Save sale
    await databaseService.save<Sale>('sales', newSale);

    // Update product stocks and create movement records concurrently
    await Promise.all(
      productsToUpdate.map(async item => {
        const updatedProduct: Product = {
          ...item.product,
          currentStock: item.newStock,
          updatedAt: now.toISOString(),
        };
        await databaseService.save<Product>('products', updatedProduct);

        const saleItem = input.items.find(i => i.productId === item.product.id)!;
        const movement: Movement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          productId: item.product.id,
          productName: item.product.name,
          productSku: item.product.sku,
          type: 'SAIDA',
          quantity: item.soldQty,
          unitCostOrPrice: saleItem.unitPrice,
          totalValue: saleItem.total,
          reason: 'Venda',
          user: input.username,
          date,
          time,
          observation: `Venda #${saleNumber}`,
          saleId: newSale.id,
        };
        await databaseService.save<Movement>('movements', movement);
      })
    );

    // Update Cash Register balances
    let cashPortion = 0;
    let creditPortion = 0;
    let debitPortion = 0;
    let pixPortion = 0;

    for (const p of input.payments) {
      if (p.method === 'dinheiro') cashPortion += p.amount;
      if (p.method === 'credito') creditPortion += p.amount;
      if (p.method === 'debito') debitPortion += p.amount;
      if (p.method === 'pix') pixPortion += p.amount;
    }

    // Effective cash added to register is cashPortion minus change (if change was given from drawer)
    // Note: change is calculated as amountReceived - total when cash is paid.
    // If mixed, change applies to cash portion.
    const netCashToDrawer = Math.max(0, cashPortion - input.change);

    const updatedRegister: CashRegister = {
      ...activeRegister,
      cashSales: Number((activeRegister.cashSales + netCashToDrawer).toFixed(2)),
      creditSales: Number((activeRegister.creditSales + creditPortion).toFixed(2)),
      debitSales: Number((activeRegister.debitSales + debitPortion).toFixed(2)),
      pixSales: Number((activeRegister.pixSales + pixPortion).toFixed(2)),
      expectedCash: Number((activeRegister.expectedCash + netCashToDrawer).toFixed(2)),
    };
    await databaseService.save<CashRegister>('cashRegisters', updatedRegister);

    if (netCashToDrawer > 0) {
      const cashMov: CashMovement = {
        id: `cmov-${Date.now()}`,
        cashRegisterId: activeRegister.id,
        type: 'venda_dinheiro',
        amount: netCashToDrawer,
        reason: `Venda #${saleNumber} (Dinheiro)`,
        observation: `Total pago: R$ ${cashPortion.toFixed(2)}, Troco: R$ ${input.change.toFixed(2)}`,
        user: input.username,
        date,
        time,
      };
      await databaseService.save<CashMovement>('cashMovements', cashMov);
    }

    return newSale;
  },

  async cancelSale(saleId: string, username: string, reason: string): Promise<Sale> {
    const sale = await databaseService.getById<Sale>('sales', saleId);
    if (!sale) {
      throw new Error('Venda não encontrada.');
    }

    if (sale.status === 'cancelada') {
      throw new Error('Esta venda já foi cancelada anteriormente.');
    }

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    // 1. Mark sale as cancelled
    const updatedSale: Sale = {
      ...sale,
      status: 'cancelada',
      cancelledAt: now.toISOString(),
      cancelledBy: username,
      cancelReason: reason || 'Cancelamento solicitado pelo operador',
    };
    await databaseService.save<Sale>('sales', updatedSale);

    // 2. Return items to stock & create adjustment movements
    for (const item of sale.items) {
      const product = await databaseService.getById<Product>('products', item.productId);
      if (product) {
        const restoredStock = product.currentStock + item.quantity;
        await databaseService.save<Product>('products', {
          ...product,
          currentStock: restoredStock,
          updatedAt: now.toISOString(),
        });

        const movement: Movement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          type: 'ENTRADA',
          quantity: item.quantity,
          unitCostOrPrice: item.unitPrice,
          totalValue: item.total,
          reason: 'Estorno de Venda',
          user: username,
          date,
          time,
          observation: `Estorno referente à Venda #${sale.saleNumber}. Motivo: ${reason}`,
          saleId: sale.id,
        };
        await databaseService.save<Movement>('movements', movement);
      }
    }

    // 3. Adjust cash register if cash was involved
    const activeRegister = await cashService.getActiveRegister();
    if (activeRegister) {
      let cashPortion = 0;
      for (const p of sale.payments) {
        if (p.method === 'dinheiro') cashPortion += p.amount;
      }
      const netCashToRefund = Math.max(0, cashPortion - sale.change);

      if (netCashToRefund > 0) {
        const updatedRegister: CashRegister = {
          ...activeRegister,
          cashSales: Math.max(0, Number((activeRegister.cashSales - netCashToRefund).toFixed(2))),
          expectedCash: Math.max(0, Number((activeRegister.expectedCash - netCashToRefund).toFixed(2))),
        };
        await databaseService.save<CashRegister>('cashRegisters', updatedRegister);

        const cashMov: CashMovement = {
          id: `cmov-${Date.now()}`,
          cashRegisterId: activeRegister.id,
          type: 'estorno_venda',
          amount: netCashToRefund,
          reason: `Estorno Venda #${sale.saleNumber}`,
          observation: `Devolução ao cliente. Motivo: ${reason}`,
          user: username,
          date,
          time,
        };
        await databaseService.save<CashMovement>('cashMovements', cashMov);
      }
    }

    return updatedSale;
  },
};
