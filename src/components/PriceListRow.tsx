import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Input from './Input';
import { useResponsive } from '../hooks/useResponsive';
import { PriceListRow as PriceListRowType } from '../services/api';

type Props = {
  item: PriceListRowType;
  onChange: (row: PriceListRowType) => void;
  onRemove: (id: string) => void;
};

function parseNumber(v: string) {
  const n = Number((v || '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function PriceListRow({ item, onChange, onRemove }: Props) {
  const [servico, setServico] = useState(item.servico);
  const [unidade, setUnidade] = useState(item.unidade);
  const [quantidade, setQuantidade] = useState(String(item.quantidade || ''));
  const [valorUnitario, setValorUnitario] = useState(String(item.valorUnitario || ''));

  const { isTablet, fontSize } = useResponsive();

  const calculated = useMemo(() => {
    const qtd = parseNumber(quantidade);
    const valor = parseNumber(valorUnitario);
    const total = qtd * valor;

    return { qtd, valor, total };
  }, [quantidade, valorUnitario]);

  useEffect(() => {
    onChange({
      id: item.id,
      servico: servico || 'Item sem nome',
      unidade: unidade || 'unidade',
      quantidade: calculated.qtd,
      valorUnitario: calculated.valor,
      valorTotal: calculated.total
    });
  }, [servico, unidade, calculated, item.id, onChange]);

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
      {/* Header com botão remover */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#111827', flex: 1 }}>
          Item de Medição
        </Text>
        <Pressable
          onPress={() => onRemove(item.id)}
          style={{
            backgroundColor: '#FEE2E2',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6
          }}
        >
          <Text style={{ fontSize: fontSize.small, color: '#DC2626', fontWeight: '600' }}>Remover</Text>
        </Pressable>
      </View>

      {/* Inputs: Serviço e Unidade */}
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Serviço / Item</Text>
        <Input
          placeholder="Ex: Atendimento mensal, Taxa de entrega..."
          value={servico}
          onChangeText={setServico}
        />
      </View>

      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Unidade</Text>
        <Input
          placeholder="Ex: unidade, pacote, mensal..."
          value={unidade}
          onChangeText={setUnidade}
        />
      </View>

      {/* Inputs: Quantidade e Valor */}
      <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: isTablet ? 12 : 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Quantidade</Text>
          <Input
            placeholder="0"
            keyboardType="numeric"
            value={quantidade}
            onChangeText={setQuantidade}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.small, color: '#6B7280', marginBottom: 4 }}>Valor Unitário (R$)</Text>
          <Input
            placeholder="0.00"
            keyboardType="numeric"
            value={valorUnitario}
            onChangeText={setValorUnitario}
          />
        </View>
      </View>

      {/* Total Calculado */}
      <View
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          alignItems: 'flex-end'
        }}
      >
        <Text style={{ fontSize: fontSize.base, fontWeight: '700', color: '#059669' }}>
          Total: R$ {calculated.total.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}
