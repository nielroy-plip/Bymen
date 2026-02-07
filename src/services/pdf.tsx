import * as Print from 'expo-print';
import { formatCurrency } from '../utils/format';
import { Client } from '../data/clients';
import { MeasurementRow } from './api';

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
          <td style="padding:8px;border:1px solid #e5e7eb">${r.cap}${r.nome.includes('Pomada') || r.nome.includes('Pó') ? 'g' : 'ml'}</td>
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

  // Gera nome seguro para o arquivo baseado no nome do cliente
  // Nome do arquivo: Barbearia_nome_DATA.pdf
  const safeName = params.client.nome
    ? params.client.nome.normalize('NFD').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')
    : 'Barbearia';
  // Usa apenas a data (sem hora) para o nome do arquivo
  let data = '';
  if (params.dateTime) {
    // Tenta extrair data no formato dd-mm-yyyy
    const d = new Date(params.dateTime);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      data = `${dia}-${mes}-${ano}`;
    } else {
      // Se não for data válida, usa string pura
      data = params.dateTime.replace(/[^\d-]/g, '');
    }
  }
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
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
  const medicaoRowsHTML = params.medicaoRows
    .map(
      (r: any) =>
        `<tr>
          <td style="padding:8px;border:1px solid #3B82F6">${r.nome}</td>
          <td style="padding:8px;border:1px solid #3B82F6">${r.linha}</td>
          <td style="padding:8px;border:1px solid #3B82F6;text-align:center">${r.cap}${r.cap <= 100 && r.cap >= 10 ? 'g' : 'ml'}</td>
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
          ${params.pagamentoPix ? `
          <div style="margin-top:8px;text-align:right;padding:8px;background:#D1FAE5;border-radius:6px">
            <span style="font-size:14px;color:#059669;font-weight:600">Desconto PIX aplicado: -5% (${formatCurrency(params.valorMedicao - (params.valorMedicao * 0.95))})</span>
            <br />
            <span style="font-size:14px;color:#059669;font-weight:600">Valor com PIX: ${formatCurrency(params.valorMedicao * 0.95)}</span>
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
          <td style="padding:8px;border:1px solid #DC2626;text-align:center">${r.cap}${r.cap <= 100 && r.cap >= 10 ? 'g' : 'ml'}</td>
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
          <td style="padding:8px;border:1px solid #059669;text-align:center">${r.cap}${r.cap <= 100 && r.cap >= 10 ? 'g' : 'ml'}</td>
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
            <span style="color:#6B7280">Valor Medição (Vendas):</span>
            <span style="font-weight:600">${formatCurrency(params.valorMedicao)}</span>
          </div>
          ${params.pagamentoPix ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#059669">Desconto PIX aplicado:</span>
            <span style="font-weight:600">-5% (${formatCurrency(params.valorMedicao - (params.valorMedicao * 0.95))})</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="color:#059669">Valor com PIX:</span>
            <span style="font-weight:600">${formatCurrency(params.valorMedicao * 0.95)}</span>
          </div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;margin-bottom:16px">
            <span style="color:#6B7280">Valor Bancada (Uso Interno):</span>
            <span style="font-weight:600">${formatCurrency(params.valorBancada)}</span>
          </div>
          <div style="border-top:2px solid #E5E7EB;padding-top:16px;display:flex;justify-content:space-between">
            <span style="font-size:20px;font-weight:700;color:#111827">TOTAL GERAL:</span>
            <span style="font-size:24px;font-weight:700;color:#059669">${formatCurrency(params.pagamentoPix ? (params.totalGeral - (params.valorMedicao - (params.valorMedicao * 0.95))) : params.totalGeral)}</span>
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

  // Gera nome seguro para o arquivo baseado no nome do primeiro produto ou estoque
  // Nome do arquivo: Barbearia_nome_DATA.pdf
  let safeName = 'Barbearia';
  if (params.client && params.client.nome) {
    safeName = params.client.nome.normalize('NFD').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  } else if (params.responsavelMedicao) {
    safeName = params.responsavelMedicao.normalize('NFD').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
  }
  // Usa apenas a data (sem hora) para o nome do arquivo
  let data = '';
  if (params.dateTime) {
    const d = new Date(params.dateTime);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      data = `${dia}-${mes}-${ano}`;
    } else {
      data = params.dateTime.replace(/[^\d-]/g, '');
    }
  }
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function generateEstoquePDF({ estoque, bancada, signatureDataUrl }: { estoque: Record<string, string>, bancada: Record<string, string>, signatureDataUrl?: string }): Promise<string> {
  const { PRODUCTS, PRODUTOS_BANCADA } = require('../data/products');
  // Tabela produtos
  const produtosRowsHTML = PRODUCTS.filter((p: any) => parseInt(estoque[p.id]||'0') > 0)
    .map((p: any) =>
      `<tr>
        <td style='padding:8px;border:1px solid #3B82F6;'>${p.nome}</td>
        <td style='padding:8px;border:1px solid #3B82F6;'>${p.linha}</td>
        <td style='padding:8px;border:1px solid #3B82F6;'>${p.cap}${p.nome.includes('Pomada')||p.nome.includes('Pó')?'g':'ml'}</td>
        <td style='padding:8px;border:1px solid #3B82F6;'>${estoque[p.id]}</td>
        <td style='padding:8px;border:1px solid #3B82F6;'>R$ ${p.preco.toFixed(2).replace('.',',')}</td>
        <td style='padding:8px;border:1px solid #3B82F6;'>R$ ${p.precoSugestao ? p.precoSugestao.toFixed(2).replace('.',',') : '-'}</td>
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
      return `<tr><td style='padding:8px;border:1px solid #DC2626;'>${p.nome}</td><td style='padding:8px;border:1px solid #DC2626;'>${p.linha}</td><td style='padding:8px;border:1px solid #DC2626;'>${p.cap}${p.nome.includes('Pomada')||p.nome.includes('Pó')?'g':'ml'}</td><td style='padding:8px;border:1px solid #DC2626;'>${qtd}</td><td style='padding:8px;border:1px solid #DC2626;'>R$ ${p.preco.toFixed(2).replace('.',',')}</td><td style='padding:8px;border:1px solid #DC2626;'>R$ ${total.toFixed(2).replace('.',',')}</td></tr>`;
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
      <title>Reposição Extra</title>
    </head>
    <body style="font-family: Arial, sans-serif; color:#111827;">
      <div style="padding:24px">
        <h1 style="margin:0 0 8px 0;">Reposição Extra</h1>
        ${produtosSection}
        ${bancadaSection}
      </div>
    </body>
  </html>
  `;
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}