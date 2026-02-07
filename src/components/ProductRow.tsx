import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

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
import { useResponsive } from '../hooks/useResponsive';
import { MedicaoRow } from '../services/api';
export type { MedicaoRow } from '../services/api';

export type Product = {
  id: string;
  nome: string;
  linha: string;
  cap: number;
  preco: number;
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
};

function parseNumber(v: string) {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function computeRow(ea: number, v: number, r: number) {
  const novoEstoque = ea - v + r;
  const diferenca = ea - v; // Produtos não vendidos = Estoque - Vendidos
  return { novoEstoque, diferenca };
}


export default function ProductRow({ product, onChange, isStockOnly = false, initialEstoque, initialVendidos, initialRepostos, showSugestao = true }: Props & { showSugestao?: boolean }) {
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [vendidos, setVendidos] = useState('');
  const [repostos, setRepostos] = useState('');
  const [produtosRetirados, setProdutosRetirados] = useState('');
  // Controla se o usuário está editando manualmente o campo Produtos Retirados
  const [produtosRetiradosManual, setProdutosRetiradosManual] = useState(false);

  // Sempre que qualquer campo relevante mudar, se produtosRetiradosManual estiver ativo, força atualização do novo estoque
  React.useEffect(() => {
    if (produtosRetiradosManual && produtosRetirados !== '') {
      // Força atualização do novo estoque ao mudar qualquer campo
      // (setState redundante, mas força re-render e atualização do cálculo)
      setProdutosRetirados(p => p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estoqueAtual, vendidos, repostos]);

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
  }, [numbers, product, onChange]);

  const { isTablet, fontSize } = useResponsive();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: isTablet ? 16 : 12,
        padding: isTablet ? 20 : 12,
        marginBottom: isTablet ? 16 : 12
      }}
    >
      <Text style={{ fontSize: fontSize.large, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
        {product.nome} - {product.cap}{product.nome.includes('Pomada') || product.nome.includes('Pó') ? 'g' : 'ml'}
      </Text>
      <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 2 }}>
        Linha: {product.linha}
      </Text>
      <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 2 }}>
        Revenda: R$ {product.preco.toFixed(2).replace('.', ',')}
      </Text>
      {/* Exibe sugestão apenas se showSugestao for true */}
      {showSugestao && (
        <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: isTablet ? 12 : 8 }}>
          Sugestão: R$ {product.precoSugestao?.toFixed(2).replace('.', ',') ?? '0,00'}
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
          {/* Primeira linha: Produtos em Estoque | Produtos Vendidos */}
          <View style={styles.gridRow}>
            <View style={styles.gridColWithMargin}>
              <Text style={styles.label}>Produtos em Estoque</Text>
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
              <Text style={styles.label}>Produtos Vendidos</Text>
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
          {/* Segunda linha: Produtos Repostos | Produtos Não Vendidos */}
          <View style={styles.gridRow}>
            <View style={styles.gridColWithMargin}>
              <Text style={styles.label}>Produtos Repostos</Text>
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
              <Text style={styles.label}>Produtos Não Vendidos</Text>
              <View style={styles.numericFieldContainer}>
                <Text style={{ fontSize: fontSize.large, color: numbers.diferenca === 0 ? '#9CA3AF' : '#111827' }}>{numbers.diferenca}</Text>
              </View>
            </View>
          </View>
          <View style={{ marginTop: isTablet ? 12 : 8 }}>
            <Text style={{ color: '#6B7280', fontSize: fontSize.small, marginBottom: 4 }}>
              Venda Média = 2
            </Text>
            <Text style={{ color: '#111827', fontSize: fontSize.base, fontWeight: '600', marginBottom: 2 }}>
              Produtos Retirados
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
              Novo Estoque Final
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
