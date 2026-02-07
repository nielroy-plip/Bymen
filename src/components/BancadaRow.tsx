import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Input from './Input';
import { useResponsive } from '../hooks/useResponsive';
import { formatCurrency } from '../utils/format';

export type Product = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  precoSugestao: number;
  estoque: number;
};

export type BancadaRow = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  quantidadeComprada: number;
  valorTotal: number;
};

type Props = {
  product: Product;
  onChange: (row: BancadaRow) => void;
  hideValues?: boolean;
};

function parseNumber(v: string) {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function BancadaRowComponent({ product, onChange, hideValues = false }: Props & { hideValues?: boolean }) {
  const [quantidadeComprada, setQuantidadeComprada] = useState('');

  const { isTablet, fontSize } = useResponsive();

  const calculated = useMemo(() => {
    const qtd = parseNumber(quantidadeComprada);
    const valorTotal = qtd * product.preco;

    return { qtd, valorTotal };
  }, [quantidadeComprada, product.preco]);

  // Evita ciclo infinito: só chama onChange se os valores mudarem
  useEffect(() => {
    const row: BancadaRow = {
      id: product.id,
      nome: product.nome,
      linha: product.linha,
      cap: product.cap,
      preco: product.preco,
      quantidadeComprada: calculated.qtd,
      valorTotal: calculated.valorTotal
    };
    // Chama onChange apenas se os valores mudarem
    onChange(row);
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
          {product.linha} • {product.cap}{product.nome.includes('Pomada') || product.nome.includes('Pó') ? 'g' : 'ml'}
        </Text>
        {!hideValues && (
          <Text style={{ fontSize: fontSize.small, color: '#991B1B', marginTop: 2, fontWeight: '600' }}>
            Valor unitário: {formatCurrency(product.preco).replace('.', ',')}
          </Text>
        )}
      </View>

      {/* Input de Quantidade */}
      <View>
        <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>
          Quantidade Comprada/Usada
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
            {formatCurrency(calculated.valorTotal).replace('R$ ', '')}
          </Text>
        </View>
      )}
    </View>
  );
}
