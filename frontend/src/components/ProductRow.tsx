import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, View, Text, TextInput, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  gridRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gridCol: {
    flex: 1,
  },
  gridColWithMargin: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  numericFieldContainer: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
  },
});


import Input from './Input';
import { MedicaoRow } from '../services/api';
import { getProductUnit } from '../utils/product';
export type { MedicaoRow } from '../services/api';

export type Product = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
  preco5?: number;
  preco10?: number;
  precoSugestao?: number;
  estoque: number;
};



type Props = {
  product: Product;
  onChange: (row: MedicaoRow) => void;
  isStockOnly?: boolean;
  initialEstoque?: number;
  initialVendidos?: number;
  initialRepostos?: number;
  showSugestao?: boolean;
  averageSale3Months?: number;
  isConsignado?: boolean;
};

function parseNumber(v: string) {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function getLineTheme(line: string) {
  const normalized = String(line || '').trim().toLowerCase();

  if (normalized.includes('wood')) {
    return {
      backgroundColor: '#FEF7ED',
      borderColor: '#D6B18B',
      badgeBg: '#8B5E3C',
      badgeText: '#FFFFFF',
      subtitle: '#7C4A2D',
    };
  }

  if (normalized.includes('ocean')) {
    return {
      backgroundColor: '#EFF6FF',
      borderColor: '#93C5FD',
      badgeBg: '#1D4ED8',
      badgeText: '#FFFFFF',
      subtitle: '#1E3A8A',
    };
  }

  return {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    badgeBg: '#374151',
    badgeText: '#FFFFFF',
    subtitle: '#4B5563',
  };
}

function ProductRowComponent({
  product,
  onChange,
  isStockOnly = false,
  initialEstoque,
  initialVendidos,
  initialRepostos,
  showSugestao = true,
  averageSale3Months = 0,
  isConsignado = false,
}: Props) {
  const [estoqueAtual, setEstoqueAtual] = useState(String(initialEstoque ?? product.estoque ?? 0));
  const [vendidos, setVendidos] = useState(String(initialVendidos ?? 0));
  const [repostos, setRepostos] = useState(String(initialRepostos ?? 0));
  const [produtosRetirados, setProdutosRetirados] = useState('');
  // Controla se o usuário está editando manualmente o campo Produtos Retirados
  const [produtosRetiradosManual, setProdutosRetiradosManual] = useState(false);
  const didMountRef = useRef(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEstoqueAtual(String(initialEstoque ?? product.estoque ?? 0));
    setVendidos(String(initialVendidos ?? 0));
    setRepostos(String(initialRepostos ?? 0));
  }, [product.id]);

  // Calculation logic:
  // Novo Estoque Final = estoqueAtual - vendidos + repostos
  // Produtos Retirados = estoqueAtual + repostos - novoEstoqueFinal

  const numbers = useMemo(() => {
    const ea = parseNumber(estoqueAtual);
    if (isStockOnly) {
      return { ea, v: 0, r: 0, diferenca: 0, novoEstoque: ea, valorMedicao: 0, produtosRetirados: 0 };
    }
    const v = parseNumber(vendidos);
    const r = parseNumber(repostos);
    let retirados = parseNumber(produtosRetirados);
    // Produtos Não Vendidos = Estoque Atual - Produtos Vendidos
    const naoVendidos = ea - v;
    let novoEstoqueFinalNum = ea - v + r;
    if (produtosRetiradosManual && produtosRetirados !== '') {
      // Novo Estoque Final = (Estoque Atual - Vendidos + Repostos) - Produtos Retirados
      novoEstoqueFinalNum = ea - v + r - retirados;
    } else {
      retirados = 0;
    }
    const diferenca = naoVendidos;
    const valorMedicao = (v + r) * product.preco;
    return { ea, v, r, diferenca, novoEstoque: novoEstoqueFinalNum, valorMedicao, produtosRetirados: retirados };
  }, [estoqueAtual, vendidos, repostos, produtosRetirados, produtosRetiradosManual, product.preco, isStockOnly]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    syncTimerRef.current = setTimeout(() => {
      onChange({
      id: product.id,
      nome: product.nome,
      linha: product.linha,
      cap: product.cap,
      preco: product.preco,
      precoSugestao: product.precoSugestao,
      estoqueAtual: numbers.ea,
      vendidos: numbers.v,
      repostos: numbers.r,
      diferenca: numbers.diferenca,
      novoEstoque: numbers.novoEstoque,
      valorMedicao: numbers.valorMedicao,
      produtosRetirados: numbers.produtosRetirados
      });
    }, 120);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [
    numbers,
    onChange,
    product.id,
    product.nome,
    product.linha,
    product.cap,
    product.preco,
    product.precoSugestao,
  ]);

  const { width } = Dimensions.get('window');
  const isTablet = width >= 768;
  const lineTheme = getLineTheme(product.linha);
  const normalizedLine = String(product.linha || '').toLowerCase();
  // reduzir pela metade o tamanho da badge 'LINHA'
  const badgeFontSize = normalizedLine.includes('wood') || normalizedLine.includes('ocean') ? (isTablet ? 6 : 5) : (isTablet ? 6 : 5);
  const fontSize = isConsignado
    ? {
        small: isTablet ? 16 : 14,
        base: isTablet ? 22 : 18,
        large: isTablet ? 28 : 24,
        xlarge: isTablet ? 34 : 28,
      }
    : {
        small: isTablet ? 12 : 10,
        base: isTablet ? 16 : 14,
        large: isTablet ? 20 : 18,
        xlarge: isTablet ? 28 : 20,
      };

  return (
    <View
      style={{
        backgroundColor: lineTheme.backgroundColor,
        borderWidth: 1,
        borderColor: lineTheme.borderColor,
        borderRadius: isTablet ? 14 : 10,
        padding: isConsignado ? (isTablet ? 20 : 16) : (isTablet ? 16 : 8),
        marginBottom: isConsignado ? (isTablet ? 18 : 14) : (isTablet ? 14 : 10),
      }}
    >
      <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
        {product.nome} - {product.cap}{getProductUnit(product.nome)}
      </Text>
      <View style={{ alignSelf: 'flex-start', marginBottom: 6, backgroundColor: lineTheme.badgeBg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
        <Text style={{ color: lineTheme.badgeText, fontWeight: '700', fontSize: badgeFontSize }}>
          LINHA {String(product.linha || '').toUpperCase()}
        </Text>
      </View>
      <Text style={{ fontSize: fontSize.small, color: lineTheme.subtitle, marginBottom: 2 }}>
        Revenda: R${product.preco.toFixed(2).replace('.', ',')}
      </Text>
      {/* Exibe sugestão apenas se showSugestao for true */}
      {showSugestao && (
        <Text style={{ fontSize: fontSize.small, color: lineTheme.subtitle, marginBottom: isTablet ? 12 : 8 }}>
          Sugestão: R${product.precoSugestao?.toFixed(2).replace('.', ',') ?? '0,00'}
        </Text>
      )}
      {isStockOnly ? (
        <View style={{ flexDirection: 'row', gap: isTablet ? 16 : 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Reposição"
              value={estoqueAtual}
              onChangeText={setEstoqueAtual}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>
      ) : (
        <>
          {/* Primeira linha: Em Estoque | Vendidos */}
          <View style={styles.gridRow}>
            <View style={styles.gridColWithMargin}>
              <Text style={styles.label}>Em Estoque</Text>
              <View style={styles.numericFieldContainer}>
                <TextInput
                  value={estoqueAtual}
                  onChangeText={setEstoqueAtual}
                  keyboardType="numeric"
                  placeholder="0"
                  style={{
                    fontSize: fontSize.large,
                    color: '#111827',
                    padding: 0,
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Vendidos</Text>
              <View style={styles.numericFieldContainer}>
                <TextInput
                  value={vendidos}
                  onChangeText={setVendidos}
                  keyboardType="numeric"
                  placeholder="0"
                  style={{
                    fontSize: fontSize.large,
                    color: '#111827',
                    padding: 0,
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            </View>
          </View>
          {/* Segunda linha: Repostos | Não Vendidos */}
          <View style={styles.gridRow}>
            <View style={styles.gridColWithMargin}>
              <Text style={styles.label}>Repostos</Text>
              <View style={styles.numericFieldContainer}>
                <TextInput
                  value={repostos}
                  onChangeText={setRepostos}
                  keyboardType="numeric"
                  placeholder="0"
                  style={{
                    fontSize: fontSize.large,
                    color: '#111827',
                    padding: 0,
                    width: '100%',
                    backgroundColor: 'transparent',
                  }}
                />
              </View>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.label}>Não Vendidos</Text>
              <View style={styles.numericFieldContainer}>
                <Text style={{ fontSize: fontSize.large, color: numbers.diferenca === 0 ? '#9CA3AF' : '#111827' }}>{numbers.diferenca}</Text>
              </View>
            </View>
          </View>
          <View style={{ marginTop: isTablet ? 12 : 8 }}>
            <Text style={{ color: '#6B7280', fontSize: fontSize.small, marginBottom: 4 }}>
              Venda Média (3 meses) = {String(averageSale3Months.toFixed(1)).replace('.', ',')}
            </Text>
            <Text style={{ color: '#111827', fontSize: fontSize.base, fontWeight: '600', marginBottom: 2 }}>
              Retirados
            </Text>
            <View style={styles.numericFieldContainer}>
              <TextInput
                value={produtosRetirados}
                onChangeText={text => {
                  setProdutosRetirados(text);
                  setProdutosRetiradosManual(true);
                }}
                onBlur={() => {
                  // Se o campo for apagado (vazio), volta para o modo automático
                  if (!produtosRetirados) setProdutosRetiradosManual(false);
                }}
                keyboardType="numeric"
                placeholder={String(numbers.produtosRetirados)}
                style={{ fontSize: fontSize.large, color: '#111827', padding: 0, width: '100%', backgroundColor: 'transparent' }}
              />
            </View>
            <Text style={{ color: '#111827', fontSize: fontSize.base, fontWeight: '600', marginTop: 8, marginBottom: 2 }}>
              Novo estoque
            </Text>
            <View style={styles.numericFieldContainer}>
              <Text style={{ fontSize: fontSize.large, color: numbers.novoEstoque === 0 ? '#9CA3AF' : '#111827' }}>{numbers.novoEstoque}</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default memo(ProductRowComponent, (prev, next) => {
  return (
    prev.product.id === next.product.id &&
    prev.product.nome === next.product.nome &&
    prev.product.linha === next.product.linha &&
    prev.product.cap === next.product.cap &&
    prev.product.preco === next.product.preco &&
    prev.product.precoSugestao === next.product.precoSugestao &&
    prev.product.estoque === next.product.estoque &&
    prev.isStockOnly === next.isStockOnly &&
    prev.initialEstoque === next.initialEstoque &&
    prev.initialVendidos === next.initialVendidos &&
    prev.initialRepostos === next.initialRepostos &&
    prev.showSugestao === next.showSugestao &&
    prev.averageSale3Months === next.averageSale3Months &&
    prev.onChange === next.onChange
  );
});
