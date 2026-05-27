import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { formatCurrency } from '../utils/format';
import { Client } from '../data/clients';
import { MeasurementRow } from './api';
import { PRODUCTS, PRODUTOS_BANCADA } from '../data/products';
import { getProductUnit } from '../utils/product';

function toSafeFilePart(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

function toDateOnly(dateTime: string) {
  const [datePart] = String(dateTime || '').split(' ');
  const [d, m, y] = datePart.split('/');
  if (d && m && y) {
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

async function saveNamedPdf(html: string, filePrefix: string, clientName: string, dateTime: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const safeClient = toSafeFilePart(clientName) || 'Barbearia';
  const safeDate = toDateOnly(dateTime);
  const fileName = `${toSafeFilePart(filePrefix)}_${safeClient}_${safeDate}.pdf`;
  const baseDir = FileSystem.Paths.document?.uri || FileSystem.Paths.cache?.uri;
  if (!baseDir) return uri;
  const targetUri = `${baseDir}${fileName}`;

  try {
    const existing = await FileSystem.getInfoAsync(targetUri);
    if (existing.exists) {
      await FileSystem.deleteAsync(targetUri, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: uri, to: targetUri });
    return targetUri;
  } catch {
    return uri;
  }
}

export async function generateStockPDF(params: {
  client: Client;
  rows: MeasurementRow[];
  dateTime: string;
}): Promise<string> {
  const tableRows = params.rows
    .filter(r => r.estoqueAtual > 0)
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb">${r.nome}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${r.cap}${getProductUnit(r.nome)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${formatCurrency(r.preco).replace('.', ',')}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${r.precoSugestao ? formatCurrency(r.precoSugestao).replace('.', ',') : '-'}</td>
          <td style="padding:8px;border:1px solid #e5e7eb">${r.estoqueAtual}</td>
        </tr>`
    )
    .join('');

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Estoque Inicial</title>
    </head>
    <body style="font-family: Arial, sans-serif; color:#111827;">
      <div style="padding:24px">
        <h1 style="margin:0 0 8px 0;">Bymen • Estoque Inicial</h1>
        <p style="margin:0 0 16px 0;">Cliente: ${params.client.nome} • Telefone: ${params.client.telefone}</p>
        <p style="margin:0 0 16px 0;">Data: ${params.dateTime}</p>
        <p style="margin:0 0 16px 0; color:#6B7280">Documento de registro de estoque inicial da barbearia</p>
        <table style="width:100%;border-collapse:collapse;margin-top:12px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Produto</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Cap.</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Preço Revenda</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Preço Sugerido</th>
              <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Reposição</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </body>
  </html>
  `;

  return saveNamedPdf(html, 'Estoque', params.client?.nome || 'Barbearia', params.dateTime);
}

export async function generateMeasurementPDF(params: {
    client: any;
    totalGeral: number;
    dateTime: any;
    bonusRows: never[];
    valorBancada: number;
    bancadaRows: any;
    valorMedicao: number;
    pagamentoPix: any;
    paymentMethod?: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';
    isCreditInstallment?: boolean;
    installmentCount?: number;
    creditMonthlyInterestPercent?: number;
    creditInterestValue?: number;
    medicaoRows: any;
    linha: string;
    nome: string;
    cap: number;
    preco: number;
    precoSugestao: number;
    quantidadeComprada: number;
    quantidadeVendida: number;
    quantidadeReposta: number;
    quantidadeNaoVendida: number;
    novoEstoque: number;
    valorTotal: number;
    signatureDataUrl?: string;
    responsavelMedicao?: string;
    observacoes?: string;
    }
): Promise<string> {
  const hasFivePercentDiscount = params.paymentMethod === 'PIX' || params.paymentMethod === 'DINHEIRO' || (!params.paymentMethod && Boolean(params.pagamentoPix));
  const discountLabel = params.paymentMethod === 'DINHEIRO' ? 'Dinheiro' : 'PIX';
  const discountValue = hasFivePercentDiscount ? params.valorMedicao - (params.valorMedicao * 0.95) : 0;
  const medicaoComDesconto = hasFivePercentDiscount ? params.valorMedicao * 0.95 : params.valorMedicao;
  const isCardInstallment = params.paymentMethod === 'CARTAO' && Boolean(params.isCreditInstallment);
  const installmentCount = Number(params.installmentCount || 1);
  const creditMonthlyInterestPercent = Number(params.creditMonthlyInterestPercent || 0);
  const creditInterestValue = Number(params.creditInterestValue || 0);
  const installmentValue = isCardInstallment && installmentCount > 0 ? Number(params.totalGeral || 0) / installmentCount : 0;

  const medicaoRowsHTML = params.medicaoRows
    .map(
      (r: any) =>
        `<tr>
          <td style="padding:8px;border:1px solid #3B82F6">${r.nome}</td>
          <td style="padding:8px;border:1px solid #3B82F6">${r.linha}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.cap}${getProductUnit(r.nome)}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:right">${formatCurrency(r.preco).replace('.', ',')}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:right">${formatCurrency(r.precoSugestao).replace('.', ',')}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.quantidadeComprada}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.quantidadeVendida}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.quantidadeReposta}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.quantidadeNaoVendida}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.produtosRetirados ?? 0}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.novoEstoque}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:right;font-weight:600;color:#3B82F6">${formatCurrency(r.valorTotal).replace('.', ',')}</td>
        </tr>`
    )
    .join('');
  const valorMedicao = params.valorMedicao;
  const medicaoSection =
    params.medicaoRows.length > 0 && medicaoRowsHTML.length > 0
      ? `
        <div style="margin-top:24px;padding:16px;background:#F0F9FF;border:2px solid #3B82F6;border-radius:8px">
          <h2 style="margin:0 0 12px 0;color:#1E40AF">📊 MEDIÇÃO - Produtos Vendidos</h2>
          <p style="margin:0 0 16px 0;color:#6B7280;font-size:14px">Controle de estoque e vendas aos clientes finais</p>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
            <thead>
              <tr style="background:#DBEAFE">
                <th style="padding:8px;border:1px solid #3B82F6;text-align:left">Produto</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:left">Linha</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">Cap.</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:right">Preço Revenda</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:right">Preço Sug.</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">PE</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">PV</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">PR</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">PN</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">PRD</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:center">NE</th>
                <th style="padding:8px;border:1px solid #3B82F6;text-align:right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${medicaoRowsHTML}
            </tbody>
          </table>
          <div style="margin-top:12px;text-align:right;padding:12px;background:#DBEAFE;border-radius:6px">
            <strong style="font-size:16px;color:#1E40AF">Valor Medição: ${formatCurrency(valorMedicao)}</strong>
          </div>
          ${hasFivePercentDiscount ? `
          <div style="margin-top:8px;text-align:right;padding:8px;background:#D1FAE5;border-radius:6px">
            <span style="font-size:14px;color:#059669;font-weight:600">Desconto ${discountLabel} aplicado: -5% (${formatCurrency(discountValue)})</span>
            <br />
            <span style="font-size:14px;color:#059669;font-weight:600">Valor com ${discountLabel}: ${formatCurrency(medicaoComDesconto)}</span>
          </div>
          ` : ''}
          <div style="margin-top:12px;text-align:left;color:#374151;font-size:12px">
            <strong>Legenda:</strong><br />
            <span>PE = Produtos Em Estoque<br /></span>
            <span>PV = Produtos Vendidos<br /></span>
            <span>PR = Produtos Repostos<br /></span>
            <span>PN = Produtos Não Vendidos<br /></span>
            <span>PRD = Produtos Retirados<br /></span>
            <span>NE = Novo Estoque</span>
          </div>
        </div>
      `
      : '<p style="margin-top:24px;color:#9CA3AF;font-style:italic;padding:16px;background:#F9FAFB;border-radius:8px">Nenhum produto vendido nesta medição.</p>';

  // ========================================
  // TABELA 2: BANCADA (Uso Interno)
  // ========================================
  const bancadaRowsHTML = params.bancadaRows
    .filter((r: { quantidadeComprada: number; }) => r.quantidadeComprada > 0)
    .map(
      (r: { nome: any; linha: any; cap: number; preco: number; quantidadeComprada: any; valorTotal: number; }) =>
        `<tr>
          <td style="padding:8px;border:1px solid #DC2626">${r.nome}</td>
          <td style="padding:8px;border:1px solid #DC2626">${r.linha || '-'}</td>
          <td style="padding:8px;border:1px solid #DC2626;text-align:center">${r.cap}${getProductUnit(r.nome)}</td>
          <td style="padding:8px;border:1px solid #DC2626;text-align:right">${formatCurrency(r.preco).replace('.', ',')}</td>
          <td style="padding:8px;border:1px solid #DC2626;text-align:center">${r.quantidadeComprada}</td>
          <td style="padding:8px;border:1px solid #DC2626;text-align:right;font-weight:600;color:#DC2626">${formatCurrency(r.valorTotal).replace('.', ',')}</td>
        </tr>`
    )
    .join('');

  const bancadaSection =
    params.bancadaRows.length > 0 && bancadaRowsHTML.length > 0
      ? `
        <div style="margin-top:32px;padding:16px;background:#FEF2F2;border:2px solid #DC2626;border-radius:8px">
          <h2 style="margin:0 0 12px 0;color:#991B1B">🏪 LINHA DE BANCADA - Uso Interno</h2>
          <p style="margin:0 0 16px 0;color:#6B7280;font-size:14px">Produtos utilizados pelo barbeiro na barbearia (não vendidos ao cliente)</p>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
            <thead>
              <tr style="background:#FEE2E2">
                <th style="padding:8px;border:1px solid #DC2626;text-align:left">Produto</th>
                <th style="padding:8px;border:1px solid #DC2626;text-align:left">Linha</th>
                <th style="padding:8px;border:1px solid #DC2626;text-align:center">Cap.</th>
                <th style="padding:8px;border:1px solid #DC2626;text-align:center">Quantidade Comprada</th>
                <th style="padding:8px;border:1px solid #DC2626;text-align:right">Preço Unitário</th>
                <th style="padding:8px;border:1px solid #DC2626;text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${bancadaRowsHTML}
            </tbody>
          </table>
          <div style="margin-top:12px;text-align:right;padding:12px;background:#FEE2E2;border-radius:6px">
            <strong style="font-size:16px;color:#991B1B">Valor Bancada: ${formatCurrency(params.valorBancada).replace('.', ',')}</strong>
          </div>
        </div>
      `
      : '<p style="margin-top:24px;color:#9CA3AF;font-style:italic;padding:16px;background:#F9FAFB;border-radius:8px">Nenhum produto de uso interno registrado.</p>';

  // ========================================
  // TABELA 3: BONIFICAÇÃO (Produtos Bônus)
  // ========================================
  const bonusRowsHTML = (params.bonusRows || [])
    .filter((r: { quantidadeComprada: number; }) => r.quantidadeComprada > 0)
    .map(
      (r: { nome: any; linha: any; cap: number; quantidadeComprada: any; }) =>
        `<tr>
          <td style="padding:8px;border:1px solid #059669">${r.nome}</td>
          <td style="padding:8px;border:1px solid #059669">${r.linha || '-'}</td>
          <td style="padding:8px;border:1px solid #059669;text-align:center">${r.cap}${getProductUnit(r.nome)}</td>
          <td style="padding:8px;border:1px solid #059669;text-align:center">${r.quantidadeComprada}</td>
        </tr>`
    )
    .join('');
  const bonusSection =
    (params.bonusRows || []).length > 0 && bonusRowsHTML.length > 0
      ? `
        <div style="margin-top:32px;padding:16px;background:#D1FAE5;border:2px solid #059669;border-radius:8px">
          <h2 style="margin:0 0 12px 0;color:#059669">🎁 BONIFICAÇÃO - Produtos Bônus</h2>
          <p style="margin:0 0 16px 0;color:#6B7280;font-size:14px">Produtos recebidos como bonificação (não pagos, enviados como bônus)</p>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
            <thead>
              <tr style="background:#A7F3D0">
                <th style="padding:8px;border:1px solid #059669;text-align:left">Produto</th>
                <th style="padding:8px;border:1px solid #059669;text-align:left">Linha</th>
                <th style="padding:8px;border:1px solid #059669;text-align:center">Cap.</th>
                <th style="padding:8px;border:1px solid #059669;text-align:center">Qtd. Bonificada</th>
              </tr>
            </thead>
            <tbody>
              ${bonusRowsHTML}
            </tbody>
          </table>
          <div style="margin-top:12px;text-align:right;padding:12px;background:#A7F3D0;border-radius:6px">
            <strong style="font-size:16px;color:#059669">Quantidade Bonificada: ${(params.bonusRows || []).reduce((acc: number, r: any) => acc + (r.quantidadeComprada || 0), 0)} produtos</strong>
          </div>
        </div>
      `
      : '<p style="margin-top:24px;color:#9CA3AF;font-style:italic;padding:16px;background:#F9FAFB;border-radius:8px">Nenhum produto recebido como bonificação.</p>';

  // ========================================
  // ASSINATURA
  // ========================================
  const assinatura = params.signatureDataUrl
    ? `<div style="page-break-inside:avoid;"><img src="${params.signatureDataUrl}" style="width:200px;height:auto;border:1px solid #e5e7eb;" /></div>`
    : '<div style="color:#9CA3AF">Assinatura não coletada</div>';

  // ========================================
  // RESUMO FINANCEIRO
  // ========================================
  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Medição Bymen</title>
    </head>
    <body style="font-family: Arial, sans-serif; color:#111827;">
      <div style="padding:24px">
        <!-- 1º container: Medição -->
        <div style="background:#fff;box-shadow:0 2px 8px #00000010;border-radius:12px;padding:24px;margin-bottom:24px;page-break-inside:avoid">
          ${medicaoSection}
        </div>

        <!-- 2º container: Bancada + Bonificação -->
        <div style="background:#fff;box-shadow:0 2px 8px #00000010;border-radius:12px;padding:24px;margin-bottom:24px;page-break-inside:avoid">
          ${bancadaSection}
          <div style="page-break-inside:avoid;">
            ${bonusSection}
          </div>
        </div>

        <!-- 3º container: Resumo financeiro + assinatura -->
        <div style="background:#fff;box-shadow:0 2px 8px #00000010;border-radius:12px;padding:24px;margin-bottom:24px;page-break-inside:avoid">
          <h2 style="margin:0 0 16px 0;color:#111827;font-size:24px">Resumo Financeiro</h2>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#6B7280">Forma de pagamento:</span>
            <span style="font-weight:600">${params.paymentMethod === 'DINHEIRO' ? 'Dinheiro' : params.paymentMethod === 'CARTAO' ? 'Cartão' : params.paymentMethod === 'BOLETO' ? 'Boleto' : 'PIX'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#6B7280">Valor Medição (Vendas):</span>
            <span style="font-weight:600">${formatCurrency(params.valorMedicao)}</span>
          </div>
          ${hasFivePercentDiscount ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#059669">Desconto ${discountLabel} aplicado:</span>
            <span style="font-weight:600">-5% (${formatCurrency(discountValue)})</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#059669">Valor com ${discountLabel}:</span>
            <span style="font-weight:600">${formatCurrency(medicaoComDesconto)}</span>
          </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;margin-bottom:16px">
            <span style="color:#6B7280">Valor Bancada (Uso Interno):</span>
            <span style="font-weight:600">${formatCurrency(params.valorBancada)}</span>
          </div>
          ${isCardInstallment ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#1D4ED8">Parcelamento:</span>
            <span style="font-weight:600">${installmentCount}x</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#1D4ED8">Juros mensal:</span>
            <span style="font-weight:600">${creditMonthlyInterestPercent.toFixed(2).replace('.', ',')}%</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#1D4ED8">Acréscimo de juros:</span>
            <span style="font-weight:600">+${formatCurrency(creditInterestValue)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:16px">
            <span style="color:#1D4ED8">Simulação de parcela:</span>
            <span style="font-weight:600">${installmentCount}x de ${formatCurrency(installmentValue)}</span>
          </div>
          ` : ''}
          <div style="border-top:2px solid #E5E7EB;padding-top:16px;display:flex;justify-content:space-between">
            <span style="font-size:20px;font-weight:700;color:#111827">TOTAL GERAL:</span>
            <span style="font-size:24px;font-weight:700;color:#059669">${formatCurrency(params.totalGeral)}</span>
          </div>
          <div style="margin-top:24px">
            <div style="margin-bottom:8px">
              <strong style="color:#111827">Responsável pela medição:</strong>
              <span style="margin-left:8px;color:#374151">${params.responsavelMedicao || '-'}</span>
            </div>
            <div style="margin-bottom:0">
              <strong style="color:#111827">Observações:</strong>
              <span style="margin-left:8px;color:#374151">${params.observacoes || '-'}</span>
            </div>
          </div>
          <div style="margin-top:32px">
            <p style="margin:0 0 12px 0;font-weight:600;color:#111827">Assinatura do responsável da barbearia:</p>
            ${assinatura}
            <p style="margin:16px 0 0 0;color:#6B7280;font-size:12px">
              Ao assinar, confirmo que os dados acima estão corretos e concordo com os valores apresentados.
            </p>
          </div>
        </div>

        <!-- Rodapé -->
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E5E7EB;text-align:center">
          <p style="margin:0;color:#9CA3AF;font-size:12px">
            Documento gerado automaticamente pelo sistema Bymen • ${params.dateTime}
          </p>
        </div>
      </div>
    </body>
  </html>
  `;

  const clientName = params.client?.nome || params.responsavelMedicao || 'Barbearia';
  return saveNamedPdf(html, 'Medicao', clientName, params.dateTime);
}

export async function generateEstoquePDF({
  estoque,
  bancada,
  signatureDataUrl,
  clientName,
  dateTime,
  filePrefix,
}: {
  estoque: Record<string, string>,
  bancada: Record<string, string>,
  signatureDataUrl?: string,
  clientName?: string,
  dateTime?: string,
  filePrefix?: string,
}): Promise<string> {
  const hasProdutos = PRODUCTS.some((p: any) => parseInt(estoque[p.id] || '0', 10) > 0);
  const hasBancada = PRODUTOS_BANCADA.some((p: any) => parseInt(bancada[p.id] || '0', 10) > 0);

  if (!hasProdutos && !hasBancada) {
    throw new Error('nenhum item de estoque foi informado para gerar o PDF');
  }

  // Tabela produtos
  const produtosRowsHTML = PRODUCTS.filter((p: any) => parseInt(estoque[p.id]||'0') > 0)
    .map((p: any) =>
      `<tr>
        <td style='padding:8px;border:1px solid #3B82F6;'>${p.nome}</td>
        <td style='padding:8px;border:1px solid #3B82F6;'>${p.linha}</td>
        <td style='padding:8px;border:1px solid #3B82F6;text-align:center;'>${p.cap}${getProductUnit(p.nome)}</td>
        <td style='padding:8px;border:1px solid #3B82F6;text-align:center;'>${estoque[p.id]}</td>
        <td style='padding:8px;border:1px solid #3B82F6;text-align:right;'>R${p.preco.toFixed(2).replace('.',',')}</td>
        <td style='padding:8px;border:1px solid #3B82F6;text-align:right;'>R${p.precoSugestao ? p.precoSugestao.toFixed(2).replace('.',',') : '-'}</td>
      </tr>`
    ).join('');
  const produtosSection = produtosRowsHTML ? `
    <div style="margin-top:24px;padding:16px;background:#F0F9FF;border:2px solid #3B82F6;border-radius:8px">
      <h2 style="margin:0 0 12px 0;color:#1E40AF">Produtos</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
        <thead>
          <tr style="background:#DBEAFE">
            <th style="padding:8px;border:1px solid #3B82F6;text-align:left">Produto</th>
            <th style="padding:8px;border:1px solid #3B82F6;text-align:left">Linha</th>
            <th style="padding:8px;border:1px solid #3B82F6;text-align:center">Cap.</th>
            <th style="padding:8px;border:1px solid #3B82F6;text-align:center">Reposição</th>
            <th style="padding:8px;border:1px solid #3B82F6;text-align:right">Preço Revenda</th>
            <th style="padding:8px;border:1px solid #3B82F6;text-align:right">Preço Sugerido</th>
          </tr>
        </thead>
        <tbody>
          ${produtosRowsHTML}
        </tbody>
      </table>
    </div>
  ` : '';

  // Tabela bancada
  const bancadaRowsHTML = PRODUTOS_BANCADA.filter((p: any) => parseInt(bancada[p.id]||'0') > 0)
    .map((p: any) => {
      const qtd = parseInt(bancada[p.id]||'0');
      const total = qtd * p.preco;
      return `<tr><td style='padding:8px;border:1px solid #DC2626;'>${p.nome}</td><td style='padding:8px;border:1px solid #DC2626;'>${p.linha}</td><td style='padding:8px;border:1px solid #DC2626;text-align:center;'>${p.cap}${getProductUnit(p.nome)}</td><td style='padding:8px;border:1px solid #DC2626;text-align:center;'>${qtd}</td><td style='padding:8px;border:1px solid #DC2626;text-align:right;'>R${p.preco.toFixed(2).replace('.',',')}</td><td style='padding:8px;border:1px solid #DC2626;text-align:right;'>R${total.toFixed(2).replace('.',',')}</td></tr>`;
    }).join('');
  const bancadaSection = bancadaRowsHTML ? `
      <div style="margin-top:32px;padding:16px;background:#FEF2F2;border:2px solid #DC2626;border-radius:8px">
        <h2 style="margin:0 0 12px 0;color:#991B1B">Bancada</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
          <thead>
            <tr style="background:#FEE2E2">
              <th style="padding:8px;border:1px solid #DC2626;text-align:left">Produto</th>
              <th style="padding:8px;border:1px solid #DC2626;text-align:left">Linha</th>
              <th style="padding:8px;border:1px solid #DC2626;text-align:center">Cap.</th>
              <th style="padding:8px;border:1px solid #DC2626;text-align:center">Reposição</th>
              <th style="padding:8px;border:1px solid #DC2626;text-align:right">Valor Unitário</th>
              <th style="padding:8px;border:1px solid #DC2626;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${bancadaRowsHTML}
          </tbody>
        </table>
      </div>
    ` : '';

  // Assinatura
  const assinatura = signatureDataUrl
    ? `<img src="${signatureDataUrl}" style="width:200px;height:auto;border:1px solid #e5e7eb;" />`
    : '<div style="color:#9CA3AF">Assinatura não coletada</div>';

  // PDF de Reposição Extra: apenas tabelas de produtos e bancada marcados, sem assinatura, sem textos extras
  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Estoque incial</title>
    </head>
    <body style="font-family: Arial, sans-serif; color:#111827;">
      <div style="padding:24px">
        <h1 style="margin:0 0 8px 0;text-align:center;">Estoque incial</h1>
        ${produtosSection}
        ${bancadaSection}
      </div>
    </body>
  </html>
  `;
  return saveNamedPdf(html, filePrefix || 'EstoqueInicial', clientName || 'Barbearia', dateTime || '');
}

export async function generateSalePDF(params: {
  clientName: string;
  dateTime: string;
  items: Array<{
    id: string;
    nome: string;
    linha: string;
    cap: number;
    preco: number;
    faixaPrecoAplicada?: 'BASE' | 'QTD_5' | 'QTD_10';
    quantidade: number;
    valorTotal: number;
  }>;
  subtotal: number;
  total: number;
  paymentMethod: 'PIX' | 'DINHEIRO' | 'CARTAO' | 'BOLETO';
  isCreditInstallment?: boolean;
  installmentCount?: number;
  creditMonthlyInterestPercent?: number;
  creditInterestValue?: number;
  responsavelVenda?: string;
  observacoes?: string;
  pixDiscountPercent?: number;
  pixDiscountValue?: number;
  signatureDataUrl?: string;
}): Promise<string> {
  const getTierLabel = (tier?: 'BASE' | 'QTD_5' | 'QTD_10') => {
    if (tier === 'QTD_10') return '10+ un';
    if (tier === 'QTD_5') return '5-9 un';
    return 'Base';
  };

  const produtosItems = params.items.filter((item) => !String(item.id || '').startsWith('b'));
  const bancadaItems = params.items.filter((item) => String(item.id || '').startsWith('b'));

  const produtosRowsHtml = produtosItems
    .filter((item) => Number(item.quantidade || 0) > 0)
    .map(
      (item) =>
        `<tr>
          <td style='padding:8px;border:1px solid #1D4ED8;'>${item.nome}</td>
          <td style='padding:8px;border:1px solid #1D4ED8;'>${item.linha}</td>
          <td style='padding:8px;border:1px solid #1D4ED8;text-align:center;'>${item.cap}${getProductUnit(item.nome)}</td>
          <td style='padding:8px;border:1px solid #1D4ED8;text-align:center;'>${item.quantidade}</td>
          <td style='padding:8px;border:1px solid #1D4ED8;text-align:center;'>${getTierLabel(item.faixaPrecoAplicada)}</td>
          <td style='padding:8px;border:1px solid #1D4ED8;text-align:right;'>${formatCurrency(item.preco)}</td>
          <td style='padding:8px;border:1px solid #1D4ED8;text-align:right;font-weight:700;'>${formatCurrency(item.valorTotal)}</td>
        </tr>`
    )
    .join('');

  const bancadaRowsHtml = bancadaItems
    .filter((item) => Number(item.quantidade || 0) > 0)
    .map(
      (item) =>
        `<tr>
          <td style='padding:8px;border:1px solid #991B1B;'>${item.nome}</td>
          <td style='padding:8px;border:1px solid #991B1B;'>${item.linha}</td>
          <td style='padding:8px;border:1px solid #991B1B;text-align:center;'>${item.cap}${getProductUnit(item.nome)}</td>
          <td style='padding:8px;border:1px solid #991B1B;text-align:center;'>${item.quantidade}</td>
          <td style='padding:8px;border:1px solid #991B1B;text-align:center;'>${getTierLabel(item.faixaPrecoAplicada)}</td>
          <td style='padding:8px;border:1px solid #991B1B;text-align:right;'>${formatCurrency(item.preco)}</td>
          <td style='padding:8px;border:1px solid #991B1B;text-align:right;font-weight:700;'>${formatCurrency(item.valorTotal)}</td>
        </tr>`
    )
    .join('');

  const subtotalProdutos = produtosItems.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const subtotalBancada = bancadaItems.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  const tierSummary = params.items.reduce(
    (acc, item) => {
      const qty = Number(item.quantidade || 0);
      if (item.faixaPrecoAplicada === 'QTD_10') {
        acc.qtd10 += qty;
      } else if (item.faixaPrecoAplicada === 'QTD_5') {
        acc.qtd5 += qty;
      } else {
        acc.base += qty;
      }
      return acc;
    },
    { base: 0, qtd5: 0, qtd10: 0 },
  );

  const paymentLabel =
    params.paymentMethod === 'PIX'
      ? 'PIX'
      : params.paymentMethod === 'DINHEIRO'
        ? 'Dinheiro'
        : params.paymentMethod === 'CARTAO'
          ? 'Cartao'
          : 'Boleto';

  const hasFivePercentDiscountOnSale = params.paymentMethod === 'PIX' || params.paymentMethod === 'DINHEIRO';
  const saleDiscountLabel = params.paymentMethod === 'DINHEIRO' ? 'Dinheiro' : 'PIX';
  const isCardInstallment = params.paymentMethod === 'CARTAO' && Boolean(params.isCreditInstallment);
  const installmentCount = Number(params.installmentCount || 1);
  const creditMonthlyInterestPercent = Number(params.creditMonthlyInterestPercent || 0);
  const creditInterestValue = Number(params.creditInterestValue || 0);
  const installmentValue = isCardInstallment && installmentCount > 0 ? Number(params.total || 0) / installmentCount : 0;
  const pixDiscount = hasFivePercentDiscountOnSale
    ? Number(params.pixDiscountValue ?? (params.subtotal - params.total))
    : 0;
  const pixPercent = hasFivePercentDiscountOnSale
    ? Number(params.pixDiscountPercent ?? (params.subtotal > 0 ? (pixDiscount / params.subtotal) * 100 : 0))
    : 0;

  const assinatura = params.signatureDataUrl
    ? `<img src="${params.signatureDataUrl}" style="width:200px;height:auto;border:1px solid #e5e7eb;" />`
    : '<div style="color:#9CA3AF">Assinatura não coletada</div>';

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Venda Bymen</title>
    </head>
    <body style="font-family: Arial, sans-serif; color:#111827;">
      <div style="padding:24px">
        <h1 style="margin:0 0 8px 0;color:#1D4ED8">Bymen • Resumo de Venda</h1>
        <p style="margin:0 0 6px 0"><strong>Barbearia:</strong> ${params.clientName}</p>
        <p style="margin:0 0 6px 0"><strong>Data:</strong> ${params.dateTime}</p>
        <p style="margin:0 0 20px 0"><strong>Responsável:</strong> ${params.responsavelVenda || '-'}</p>

        <div style="padding:16px;background:#EFF6FF;border:2px solid #1D4ED8;border-radius:8px">
          <h2 style="margin:0 0 12px 0;color:#1E40AF">Produtos</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
            <thead>
              <tr style="background:#DBEAFE">
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:left">Produto</th>
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:left">Linha</th>
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:center">Cap.</th>
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:center">Qtd.</th>
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:center">Faixa</th>
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:right">Valor Unitario</th>
                <th style="padding:8px;border:1px solid #1D4ED8;text-align:right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${produtosRowsHtml || `<tr><td colspan="7" style="padding:10px;border:1px solid #1D4ED8;color:#6B7280">Sem produtos na venda.</td></tr>`}
            </tbody>
          </table>
          <p style="margin:12px 0 0 0;text-align:right;color:#1E40AF;font-weight:700">Subtotal Produtos: ${formatCurrency(subtotalProdutos)}</p>
        </div>

        <div style="margin-top:16px;padding:16px;background:#FEF2F2;border:2px solid #991B1B;border-radius:8px">
          <h2 style="margin:0 0 12px 0;color:#991B1B">Bancada</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px">
            <thead>
              <tr style="background:#FEE2E2">
                <th style="padding:8px;border:1px solid #991B1B;text-align:left">Produto</th>
                <th style="padding:8px;border:1px solid #991B1B;text-align:left">Linha</th>
                <th style="padding:8px;border:1px solid #991B1B;text-align:center">Cap.</th>
                <th style="padding:8px;border:1px solid #991B1B;text-align:center">Qtd.</th>
                <th style="padding:8px;border:1px solid #991B1B;text-align:center">Faixa</th>
                <th style="padding:8px;border:1px solid #991B1B;text-align:right">Valor Unitario</th>
                <th style="padding:8px;border:1px solid #991B1B;text-align:right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              ${bancadaRowsHtml || `<tr><td colspan="7" style="padding:10px;border:1px solid #991B1B;color:#6B7280">Sem itens de bancada na venda.</td></tr>`}
            </tbody>
          </table>
          <p style="margin:12px 0 0 0;text-align:right;color:#991B1B;font-weight:700">Subtotal Bancada: ${formatCurrency(subtotalBancada)}</p>
        </div>

        <div style="margin-top:20px;padding:16px;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px">
          <p style="margin:0 0 8px 0"><strong>Forma de pagamento:</strong> ${paymentLabel}</p>
          <p style="margin:0 0 8px 0"><strong>Subtotal Produtos:</strong> ${formatCurrency(subtotalProdutos)}</p>
          <p style="margin:0 0 8px 0"><strong>Subtotal Bancada:</strong> ${formatCurrency(subtotalBancada)}</p>
          <p style="margin:0 0 8px 0"><strong>Subtotal geral:</strong> ${formatCurrency(params.subtotal)}</p>
          <p style="margin:0 0 8px 0"><strong>Faixas aplicadas:</strong> Base ${tierSummary.base} un • 5-9 un ${tierSummary.qtd5} un • 10+ un ${tierSummary.qtd10} un</p>
          ${hasFivePercentDiscountOnSale ? `<p style="margin:0 0 8px 0;color:#059669"><strong>Desconto ${saleDiscountLabel} (${pixPercent.toFixed(2).replace('.', ',')}%):</strong> -${formatCurrency(pixDiscount)}</p>` : ''}
          ${isCardInstallment ? `<p style="margin:0 0 8px 0;color:#1D4ED8"><strong>Parcelamento:</strong> ${installmentCount}x</p>` : ''}
          ${isCardInstallment ? `<p style="margin:0 0 8px 0;color:#1D4ED8"><strong>Juros mensal:</strong> ${creditMonthlyInterestPercent.toFixed(2).replace('.', ',')}%</p>` : ''}
          ${isCardInstallment ? `<p style="margin:0 0 8px 0;color:#1D4ED8"><strong>Acréscimo de juros:</strong> +${formatCurrency(creditInterestValue)}</p>` : ''}
          ${isCardInstallment ? `<p style="margin:0 0 8px 0;color:#1D4ED8"><strong>Simulação:</strong> ${installmentCount}x de ${formatCurrency(installmentValue)}</p>` : ''}
          <p style="margin:0;font-size:20px;font-weight:700;color:#111827"><strong>Total:</strong> ${formatCurrency(params.total)}</p>
        </div>

        <div style="margin-top:16px;padding:16px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px">
          <p style="margin:0 0 8px 0"><strong>Observações:</strong></p>
          <p style="margin:0;color:#374151">${params.observacoes || '-'}</p>
        </div>

        <div style="margin-top:16px;padding:16px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px">
          <p style="margin:0 0 12px 0;font-weight:600;color:#111827">Assinatura do responsável:</p>
          ${assinatura}
        </div>
      </div>
    </body>
  </html>
  `;

  return saveNamedPdf(html, 'Venda', params.clientName || 'Barbearia', params.dateTime);
}

export async function generateReportChartPDF(params: {
  clientName: string;
  chartTitle: string;
  periodLabel: string;
  dateTime?: string;
  valueType?: 'currency' | 'quantity';
  points: Array<{ label: string; value: number }>;
}): Promise<string> {
  const valueType = params.valueType || 'currency';
  const formatValue = (value: number) => {
    if (valueType === 'quantity') {
      return new Intl.NumberFormat('pt-BR', {
        maximumFractionDigits: 2,
      }).format(Number(value || 0));
    }
    return formatCurrency(Number(value || 0));
  };

  const rowsHtml = (params.points || [])
    .map(
      (p) =>
        `<tr>
          <td style="padding:8px;border:1px solid #d1d5db">${p.label}</td>
          <td style="padding:8px;border:1px solid #d1d5db;text-align:right">${formatValue(Number(p.value || 0))}</td>
        </tr>`,
    )
    .join('');

  const total = (params.points || []).reduce((sum, p) => sum + Number(p.value || 0), 0);
  const max = (params.points || []).reduce((acc, p) => Math.max(acc, Number(p.value || 0)), 0);

  const html = `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Relatorio ${params.chartTitle}</title>
    </head>
    <body style="font-family: Arial, sans-serif; color:#111827;">
      <div style="padding:24px">
        <h1 style="margin:0 0 8px 0;color:#1f2937">Bymen • Relatório de Gráfico</h1>
        <p style="margin:0 0 6px 0"><strong>Barbearia:</strong> ${params.clientName}</p>
        <p style="margin:0 0 6px 0"><strong>Gráfico:</strong> ${params.chartTitle}</p>
        <p style="margin:0 0 6px 0"><strong>Período:</strong> ${params.periodLabel}</p>
        <p style="margin:0 0 16px 0"><strong>Gerado em:</strong> ${params.dateTime || new Date().toLocaleString('pt-BR')}</p>

        <div style="padding:12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:16px">
          <p style="margin:0 0 6px 0"><strong>Total:</strong> ${formatValue(Number(total.toFixed(2)))}</p>
          <p style="margin:0"><strong>Maior valor:</strong> ${formatValue(Number(max.toFixed(2)))}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12px">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px;border:1px solid #d1d5db;text-align:left">Item</th>
              <th style="padding:8px;border:1px solid #d1d5db;text-align:right">${valueType === 'quantity' ? 'Quantidade' : 'Valor'}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="2" style="padding:12px;border:1px solid #d1d5db;color:#6b7280">Sem dados para exportar.</td></tr>`}
          </tbody>
        </table>
      </div>
    </body>
  </html>
  `;

  return saveNamedPdf(
    html,
    `Relatorio_${params.chartTitle}`,
    params.clientName || 'Barbearia',
    params.dateTime || new Date().toLocaleString('pt-BR'),
  );
}