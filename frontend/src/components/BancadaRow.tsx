import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, View, Text } from 'react-native';
import Input from './Input';
import { formatCurrency } from '../utils/format';
import { getProductUnit } from '../utils/product';

export type Product = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  preco5?: number;
  preco10?: number;
  precoSugestao: number;
  estoque: number;
};

export type BancadaRow = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  precoBase?: number;
  preco5?: number;
  preco10?: number;
  faixaPrecoAplicada?: 'BASE' | 'QTD_5' | 'QTD_10';
  quantidadeComprada: number;
  valorTotal: number;
};

type Props = {
  product: Product;
  onChange: (row: BancadaRow) => void;
  hideValues?: boolean;
};

type PromoTier = 'BASE' | 'QTD_5' | 'QTD_10';

function parseNumber(v: string) {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function getPricingForQuantity(product: Product, quantity: number): { unitPrice: number; tier: PromoTier } {
  if (quantity >= 10 && typeof product.preco10 === 'number') {
    return { unitPrice: product.preco10, tier: 'QTD_10' };
  }

  if (quantity >= 5 && typeof product.preco5 === 'number') {
    return { unitPrice: product.preco5, tier: 'QTD_5' };
  }

  return { unitPrice: product.preco, tier: 'BASE' };
}

function BancadaRowComponent({ product, onChange, hideValues = false }: Props & { hideValues?: boolean }) {
  const [quantidadeComprada, setQuantidadeComprada] = useState('');
  const didMountRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncKeyRef = useRef('');
  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const fontSize = {
    small: isTablet ? 14 : 12,
    base: isTablet ? 18 : 16,
    large: isTablet ? 24 : 20,
    xlarge: isTablet ? 32 : 24,
  };

  const calculated = useMemo(() => {
    const qtd = parseNumber(quantidadeComprada);
    const { unitPrice, tier } = getPricingForQuantity(product, qtd);
    const valorTotal = qtd * unitPrice;

    return { qtd, valorTotal, unitPrice, tier };
  }, [quantidadeComprada, product.preco, product.preco5, product.preco10]);

  // Evita ciclo infinito: só chama onChange se os valores mudarem
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      const row: BancadaRow = {
        id: product.id,
        nome: product.nome,
        linha: product.linha,
        cap: product.cap,
        preco: calculated.unitPrice,
        precoBase: product.preco,
        preco5: product.preco5,
        preco10: product.preco10,
        faixaPrecoAplicada: calculated.tier,
        quantidadeComprada: calculated.qtd,
        valorTotal: calculated.valorTotal
      };
      const syncKey = [
        row.id,
        row.quantidadeComprada,
        row.valorTotal,
        row.preco,
        row.faixaPrecoAplicada || 'BASE',
      ].join('|');

      if (lastSyncKeyRef.current === syncKey) {
        return;
      }

      lastSyncKeyRef.current = syncKey;
      // Chama onChange apenas se os valores mudarem
      onChange(row);
    }, 120);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [calculated.qtd, calculated.valorTotal, product.id, product.nome, product.linha, product.cap, product.preco, onChange]);

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: isTablet ? 12 : 8,
        padding: isTablet ? 16 : 12,
        marginBottom: isTablet ? 12 : 8
      }}
    >
      {/* Header */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#111827' }}>
          {product.nome}
        </Text>
        <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginTop: 2 }}>
          {product.linha} • {product.cap}{getProductUnit(product.nome)}
        </Text>
        {!hideValues && (
          <>
            <Text style={{ fontSize: fontSize.small, color: '#2563EB', marginTop: 2, fontWeight: '600' }}>
              Preço base: {formatCurrency(product.preco)}
            </Text>
            {(typeof product.preco5 === 'number' || typeof product.preco10 === 'number') && (
              <Text style={{ fontSize: fontSize.small, color: '#2563EB', marginTop: 2 }}>
                Promo: 5 un = {formatCurrency(product.preco5 ?? product.preco)} • 10 un = {formatCurrency(product.preco10 ?? product.preco5 ?? product.preco)}
              </Text>
            )}
            {quantidadeComprada.trim().length > 0 && (
              <Text style={{ fontSize: fontSize.small, color: '#059669', marginTop: 2, fontWeight: '700' }}>
                Preço aplicado: {formatCurrency(calculated.unitPrice)}
              </Text>
            )}
            {calculated.tier !== 'BASE' && quantidadeComprada.trim().length > 0 && (
              <View
                style={{
                  alignSelf: 'flex-start',
                  marginTop: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: calculated.tier === 'QTD_10' ? '#DCFCE7' : '#E0F2FE',
                }}
              >
                <Text
                  style={{
                    color: calculated.tier === 'QTD_10' ? '#166534' : '#075985',
                    fontSize: fontSize.small,
                    fontWeight: '700',
                  }}
                >
                  {calculated.tier === 'QTD_10'
                    ? '✓ Desconto de 10 un aplicado'
                    : '✓ Desconto de 5 un aplicado'}
                </Text>
              </View>
            )}
          </>
        )}
        {!hideValues && (
          <Text style={{ fontSize: fontSize.small, color: '#991B1B', marginTop: 2, fontWeight: '600' }}>
            Valor unitário: {formatCurrency(calculated.unitPrice).replace(/R\$\s*/g, 'R$').replace('.', ',')}
          </Text>
        )}
      </View>

      {/* Input de Quantidade */}
      <View>
        <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>
          Quantidade
        </Text>
        <Input
          placeholder="0"
          keyboardType="numeric"
          value={quantidadeComprada}
          onChangeText={setQuantidadeComprada}
        />
      </View>

      {/* Valor Calculado */}
      {!hideValues && (
        <View
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            alignItems: 'flex-end'
          }}
        >
          <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#DC2626' }}>
            {formatCurrency(calculated.valorTotal).replace(/^R\$\s*/, '')}
          </Text>
        </View>
      )}
    </View>
  );
}

export default memo(BancadaRowComponent, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.nome === next.product.nome &&
    prev.product.linha === next.product.linha &&
    prev.product.cap === next.product.cap &&
    prev.product.preco === next.product.preco &&
    prev.product.preco5 === next.product.preco5 &&
    prev.product.preco10 === next.product.preco10 &&
    prev.product.precoSugestao === next.product.precoSugestao &&
    prev.product.estoque === next.product.estoque &&
    prev.hideValues === next.hideValues &&
    prev.onChange === next.onChange
  );
});
