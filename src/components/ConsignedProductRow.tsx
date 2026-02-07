import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import Input from './Input';
import { useResponsive } from '../hooks/useResponsive';
import { ConsignedProductRow as ConsignedProductRowType } from '../services/api';

export type Product = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  precoSugestao: number;
  estoque: number;
};

type Props = {
  product: Product;
  onChange: (row: ConsignedProductRowType) => void;
  initialQuantidade?: number;
};

function parseNumber(v: string) {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function ConsignedProductRow({ product, onChange, initialQuantidade }: Props) {
  const [quantidadeInicial, setQuantidadeInicial] = useState(initialQuantidade ? String(initialQuantidade) : '');
  const [quantidadeVendida, setQuantidadeVendida] = useState('');
  const [quantidadeDevolvida, setQuantidadeDevolvida] = useState('');

  const { isTablet, fontSize } = useResponsive();

  useEffect(() => {
    if (initialQuantidade !== undefined) {
      setQuantidadeInicial(String(initialQuantidade));
    }
  }, [initialQuantidade]);

  const calculated = useMemo(() => {
    const inicial = parseNumber(quantidadeInicial);
    const vendida = parseNumber(quantidadeVendida);
    const devolvida = parseNumber(quantidadeDevolvida);
    
    const valorTotal = vendida * product.preco;
    const novoEstoque = inicial - vendida + devolvida;

    return {
      inicial,
      vendida,
      devolvida,
      valorTotal,
      novoEstoque
    };
  }, [quantidadeInicial, quantidadeVendida, quantidadeDevolvida, product.preco]);

  useEffect(() => {
    onChange({
      id: product.id,
      nome: product.nome,
      linha: product.linha,
      cap: product.cap,
      quantidadeInicial: calculated.inicial,
      quantidadeVendida: calculated.vendida,
      quantidadeDevolvida: calculated.devolvida,
      valorUnitario: product.preco,
      valorTotal: calculated.valorTotal,
      novoEstoque: calculated.novoEstoque
    });
  }, [calculated, product, onChange]);

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
          {product.linha} • {product.cap}ml • R$ {product.preco.toFixed(2)}
        </Text>
      </View>

      {/* Inputs */}
      <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: isTablet ? 12 : 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Qtd Inicial</Text>
          <Input
            placeholder="0"
            keyboardType="numeric"
            value={quantidadeInicial}
            onChangeText={setQuantidadeInicial}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Vendida</Text>
          <Input
            placeholder="0"
            keyboardType="numeric"
            value={quantidadeVendida}
            onChangeText={setQuantidadeVendida}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Devolvida</Text>
          <Input
            placeholder="0"
            keyboardType="numeric"
            value={quantidadeDevolvida}
            onChangeText={setQuantidadeDevolvida}
          />
        </View>
      </View>

      {/* Calculated Values */}
      <View
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          flexDirection: 'row',
          justifyContent: 'space-between'
        }}
      >
        <Text style={{ fontSize: fontSize.small, color: '#6B7280' }}>
          Novo Estoque: <Text style={{ fontWeight: '600', color: '#111827' }}>{calculated.novoEstoque}</Text>
        </Text>
        <Text style={{ fontSize: fontSize.small, fontWeight: '700', color: '#059669' }}>
          R$ {calculated.valorTotal.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
