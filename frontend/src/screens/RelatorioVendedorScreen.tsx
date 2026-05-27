import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../routes';
import Input from '../components/Input';
import Button from '../components/Button';
import { getCurrentUser, listMeasurements, listSales, Measurement, Sale } from '../services/api';
import { formatCurrency } from '../utils/format';
import { AppRole, canManageSellerGoals, getUserAppRole } from '../services/access';
import { getSellerGoals, saveSellerGoal, SellerGoalMap } from '../services/sellerGoals';
import { createKeyboardFocusHandler } from '../utils/keyboardFocus';

type Props = NativeStackScreenProps<RootStackParamList, 'RelatorioVendedor'>;

type SellerSummary = {
  sellerKey: string;
  sellerName: string;
  monthSalesTotal: number;
  monthMeasurementsTotal: number;
  monthTotal: number;
  allTimeSalesTotal: number;
  allTimeMeasurementsTotal: number;
  allTimeTotal: number;
  salesCount: number;
  measurementsCount: number;
  operationsCount: number;
};

function parseDate(dateTime: string): Date | null {
  const [datePart] = String(dateTime || '').split(' ');
  const [d, m, y] = datePart.split('/');
  if (!d || !m || !y) return null;

  const day = Number(d);
  const month = Number(m) - 1;
  const year = Number(y);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  return new Date(year, month, day);
}

function getSaleSellerKey(sale: Sale): string {
  return String((sale as any).sellerEmail || sale.responsavel || 'sem-vendedor').trim().toLowerCase();
}

function getSaleSellerName(sale: Sale): string {
  return String((sale as any).sellerName || sale.responsavel || getSaleSellerKey(sale) || 'Sem vendedor').trim();
}

function getMeasurementSellerKey(measurement: Measurement): string {
  return String((measurement as any).sellerEmail || measurement.responsavel || 'sem-vendedor').trim().toLowerCase();
}

function getMeasurementSellerName(measurement: Measurement): string {
  return String((measurement as any).sellerName || measurement.responsavel || getMeasurementSellerKey(measurement) || 'Sem vendedor').trim();
}

export default function RelatorioVendedorScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const handleFieldFocus = createKeyboardFocusHandler(scrollRef, 24);
  const [sales, setSales] = useState<Sale[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [goals, setGoals] = useState<SellerGoalMap>({});
  const [goalInputs, setGoalInputs] = useState<Record<string, string>>({});
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [role, setRole] = useState<AppRole>('VENDEDOR');

  const loadData = useCallback(async () => {
    const [allSales, allMeasurements, user, savedGoals] = await Promise.all([
      listSales(),
      listMeasurements(),
      getCurrentUser(),
      getSellerGoals(),
    ]);

    setSales(allSales);
    setMeasurements(allMeasurements);
    setGoals(savedGoals);
    setCurrentUserEmail(String(user?.email || '').trim().toLowerCase());
    setCurrentUserName(String(user?.username || user?.email || '').trim());
    setRole(getUserAppRole(user));

    const initialGoalInputs: Record<string, string> = {};
    Object.keys(savedGoals).forEach((key) => {
      initialGoalInputs[key] = String(savedGoals[key]).replace('.', ',');
    });
    setGoalInputs(initialGoalInputs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const timer = setInterval(() => {
        loadData();
      }, 5000);

      return () => clearInterval(timer);
    }, [loadData]),
  );

  const allSummaries = useMemo<SellerSummary[]>(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const grouped = new Map<string, SellerSummary>();

    sales.forEach((sale) => {
      const sellerKey = getSaleSellerKey(sale);
      const sellerName = getSaleSellerName(sale);
      const parsedDate = parseDate(sale.dateTime || '');
      const total = Number(sale.total || 0);

      const existing = grouped.get(sellerKey) || {
        sellerKey,
        sellerName,
        monthSalesTotal: 0,
        monthMeasurementsTotal: 0,
        monthTotal: 0,
        allTimeSalesTotal: 0,
        allTimeMeasurementsTotal: 0,
        allTimeTotal: 0,
        salesCount: 0,
        measurementsCount: 0,
        operationsCount: 0,
      };

      existing.allTimeSalesTotal += total;
      existing.allTimeTotal += total;
      existing.salesCount += 1;
      existing.operationsCount += 1;

      if (parsedDate && parsedDate.getMonth() === currentMonth && parsedDate.getFullYear() === currentYear) {
        existing.monthSalesTotal += total;
        existing.monthTotal += total;
      }

      if (!existing.sellerName || existing.sellerName === existing.sellerKey) {
        existing.sellerName = sellerName;
      }

      grouped.set(sellerKey, existing);
    });

    measurements.forEach((measurement) => {
      const sellerKey = getMeasurementSellerKey(measurement);
      const sellerName = getMeasurementSellerName(measurement);
      const parsedDate = parseDate(measurement.dateTime || '');
      const total = Number(measurement.totalGeral || 0);

      const existing = grouped.get(sellerKey) || {
        sellerKey,
        sellerName,
        monthSalesTotal: 0,
        monthMeasurementsTotal: 0,
        monthTotal: 0,
        allTimeSalesTotal: 0,
        allTimeMeasurementsTotal: 0,
        allTimeTotal: 0,
        salesCount: 0,
        measurementsCount: 0,
        operationsCount: 0,
      };

      existing.allTimeMeasurementsTotal += total;
      existing.allTimeTotal += total;
      existing.measurementsCount += 1;
      existing.operationsCount += 1;

      if (parsedDate && parsedDate.getMonth() === currentMonth && parsedDate.getFullYear() === currentYear) {
        existing.monthMeasurementsTotal += total;
        existing.monthTotal += total;
      }

      if (!existing.sellerName || existing.sellerName === existing.sellerKey) {
        existing.sellerName = sellerName;
      }

      grouped.set(sellerKey, existing);
    });

    return Array.from(grouped.values()).sort((a, b) => b.monthTotal - a.monthTotal);
  }, [sales, measurements]);

  const visibleSummaries = useMemo(() => {
    if (canManageSellerGoals(role)) {
      return allSummaries;
    }

    const key = currentUserEmail || currentUserName.toLowerCase();
    const found = allSummaries.find((item) => item.sellerKey === key);

    if (found) {
      return [found];
    }

    return [
      {
        sellerKey: key || 'meu-usuario',
        sellerName: currentUserName || 'Meu usuário',
        monthSalesTotal: 0,
        monthMeasurementsTotal: 0,
        monthTotal: 0,
        allTimeSalesTotal: 0,
        allTimeMeasurementsTotal: 0,
        allTimeTotal: 0,
        salesCount: 0,
        measurementsCount: 0,
        operationsCount: 0,
      },
    ];
  }, [allSummaries, role, currentUserEmail, currentUserName]);

  function getGoalForSeller(sellerKey: string): number {
    return Number(goals[sellerKey] || 0);
  }

  function getProgressPercent(monthTotal: number, goal: number): number {
    if (!goal || goal <= 0) return 0;
    return Number(Math.min((monthTotal / goal) * 100, 999).toFixed(1));
  }

  async function handleSaveGoal(sellerKey: string) {
    const raw = String(goalInputs[sellerKey] || '').replace(',', '.');
    const goalValue = Number(raw);

    if (!Number.isFinite(goalValue) || goalValue < 0) {
      Alert.alert('Validação', 'Informe uma meta válida maior ou igual a zero.');
      return;
    }

    const next = await saveSellerGoal(sellerKey, goalValue);
    setGoals(next);
    setGoalInputs((prev) => ({ ...prev, [sellerKey]: String(goalValue).replace('.', ',') }));
    Alert.alert('Sucesso', 'Meta do vendedor atualizada.');
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 24, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 }}>Relatório de Vendedor</Text>
        <Text style={{ color: '#6B7280', marginBottom: 14 }}>
          {canManageSellerGoals(role)
            ? 'Visão em tempo real de todos os vendedores (vendas e consignado) com gestão de metas.'
            : 'Acompanhe seu desempenho em vendas e consignado, meta e evolução em tempo real.'}
        </Text>

        {visibleSummaries.map((summary) => {
          const goal = getGoalForSeller(summary.sellerKey);
          const progressPercent = getProgressPercent(summary.monthTotal, goal);
          const averageTicket = summary.operationsCount > 0 ? summary.allTimeTotal / summary.operationsCount : 0;

          return (
            <View
              key={summary.sellerKey}
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                padding: 14,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>{summary.sellerName}</Text>
              <Text style={{ color: '#6B7280', marginBottom: 8 }}>{summary.sellerKey}</Text>

              <Text style={{ color: '#111827', marginBottom: 3 }}>Vendas no mês: {formatCurrency(summary.monthSalesTotal)}</Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>Consignado no mês: {formatCurrency(summary.monthMeasurementsTotal)}</Text>
              <Text style={{ color: '#111827', marginBottom: 3, fontWeight: '700' }}>Total no mês: {formatCurrency(summary.monthTotal)}</Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>Vendas total: {formatCurrency(summary.allTimeSalesTotal)}</Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>Consignado total: {formatCurrency(summary.allTimeMeasurementsTotal)}</Text>
              <Text style={{ color: '#111827', marginBottom: 3, fontWeight: '700' }}>Total acumulado: {formatCurrency(summary.allTimeTotal)}</Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>Qtd. vendas: {summary.salesCount}</Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>Qtd. medições: {summary.measurementsCount}</Text>
              <Text style={{ color: '#111827', marginBottom: 3 }}>Qtd. operações: {summary.operationsCount}</Text>
              <Text style={{ color: '#111827', marginBottom: 8 }}>Ticket médio geral: {formatCurrency(averageTicket)}</Text>

              <Text style={{ color: '#374151', marginBottom: 4 }}>Meta mensal: {goal > 0 ? formatCurrency(goal) : 'Não definida'}</Text>
              <Text style={{ color: progressPercent >= 100 ? '#166534' : '#1D4ED8', marginBottom: 8, fontWeight: '700' }}>
                Progresso: {progressPercent.toFixed(1).replace('.', ',')}%
              </Text>

              {canManageSellerGoals(role) && (
                <>
                  <Input
                    label="Definir meta mensal (R$)"
                    value={goalInputs[summary.sellerKey] ?? String(goal || '').replace('.', ',')}
                    onChangeText={(value) =>
                      setGoalInputs((prev) => ({
                        ...prev,
                        [summary.sellerKey]: String(value || '').replace(/[^\d,\.]/g, '').replace('.', ','),
                      }))
                    }
                    onFocus={handleFieldFocus}
                    keyboardType="numeric"
                    placeholder="Ex: 5000,00"
                  />
                  <Button title="Salvar meta" icon="save-outline" onPress={() => handleSaveGoal(summary.sellerKey)} />
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
