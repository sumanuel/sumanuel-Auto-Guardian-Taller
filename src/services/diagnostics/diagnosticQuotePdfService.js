import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import { Platform } from "react-native";
import { patchEntityRecord } from "../firestore/repository";

const QUOTE_STATUS_LABELS = {
  received: "Recibido",
  "in-review": "En revision",
  quoted: "Cotizado",
  approved: "Aprobado",
  closed: "Cerrado",
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value = new Date()) {
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(value) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return "Sin costo estimado";
  }

  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsedValue);
}

function buildLogoDataUri() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
      <rect width="96" height="96" rx="24" fill="#0F1B2D"/>
      <path d="M24 64L38 32H48L34 64H24Z" fill="#22C7B8"/>
      <path d="M51 32H61L72 64H62L59.5 57H49.5L47 64H37L51 32ZM52.5 49.5H56.5L54.5 42.5L52.5 49.5Z" fill="#F4F7FB"/>
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function resolveWorkshopLogoUri(workshopProfile) {
  const customLogo = String(workshopProfile?.logoUrl || "").trim();

  if (customLogo) {
    return customLogo;
  }

  return buildLogoDataUri();
}

function renderBulletList(items, emptyLabel) {
  if (!items.length) {
    return `<li>${escapeHtml(emptyLabel)}</li>`;
  }

  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function buildDiagnosticQuoteHtml({
  diagnostic,
  client,
  vehicle,
  workshopProfile,
}) {
  const serviceItems = Array.isArray(diagnostic.serviceItems)
    ? diagnostic.serviceItems
    : [];
  const spareParts = Array.isArray(diagnostic.spareParts)
    ? diagnostic.spareParts
    : [];
  const logoUri = resolveWorkshopLogoUri(workshopProfile);
  const workshopName = workshopProfile?.workshopName || "Auto-Guardian Taller";
  const advisorName = workshopProfile?.fullName || "Equipo operativo";
  const advisorPhone = workshopProfile?.phone || "Sin telefono operativo";
  const advisorEmail = workshopProfile?.email || "Sin correo operativo";
  const workshopRif = workshopProfile?.rif || "Sin identificacion fiscal";
  const workshopAddress = workshopProfile?.address || "Sin direccion operativa";
  const commercialNotes =
    workshopProfile?.commercialNotes ||
    "Sin notas comerciales registradas para este taller.";
  const clientPhone = client?.phone || "Sin telefono registrado";
  const vehicleLabel = [vehicle?.brand, vehicle?.model, vehicle?.year]
    .filter(Boolean)
    .join(" ");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            color: #102033;
            background: #f4f7fb;
          }
          .page {
            padding: 32px;
          }
          .hero {
            background: linear-gradient(135deg, #0f1b2d 0%, #17304f 100%);
            border-radius: 24px;
            padding: 24px;
            color: #f4f7fb;
          }
          .hero-top {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: center;
          }
          .brand {
            display: flex;
            gap: 16px;
            align-items: center;
          }
          .brand img {
            width: 72px;
            height: 72px;
          }
          .eyebrow {
            font-size: 11px;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            color: #22c7b8;
            font-weight: 700;
          }
          .title {
            margin: 6px 0 0;
            font-size: 28px;
            font-weight: 800;
          }
          .subtitle {
            margin: 6px 0 0;
            font-size: 14px;
            color: #c7d2e3;
          }
          .badge {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 18px;
            padding: 14px 16px;
            min-width: 180px;
          }
          .badge strong {
            display: block;
            font-size: 12px;
            color: #22c7b8;
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-top: 20px;
          }
          .card {
            background: #ffffff;
            border: 1px solid #d9e2ee;
            border-radius: 20px;
            padding: 18px;
          }
          .card h3 {
            margin: 0 0 12px;
            font-size: 12px;
            color: #18a999;
            text-transform: uppercase;
            letter-spacing: 1.4px;
          }
          .line {
            margin: 0 0 8px;
            font-size: 14px;
            line-height: 1.55;
          }
          .line strong {
            color: #102033;
          }
          .section {
            margin-top: 18px;
          }
          .section-title {
            margin: 0 0 10px;
            font-size: 13px;
            color: #18a999;
            text-transform: uppercase;
            letter-spacing: 1.4px;
            font-weight: 800;
          }
          .body-copy {
            margin: 0;
            font-size: 14px;
            line-height: 1.65;
            color: #334155;
          }
          ul {
            margin: 0;
            padding-left: 18px;
          }
          li {
            margin-bottom: 8px;
            font-size: 14px;
            color: #334155;
          }
          .footer {
            margin-top: 18px;
            padding: 16px 18px;
            background: #eaf8f6;
            border: 1px solid #caece7;
            border-radius: 18px;
            font-size: 13px;
            line-height: 1.6;
            color: #1f2937;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="hero">
            <div class="hero-top">
              <div class="brand">
                <img src="${logoUri}" alt="Logo del taller" />
                <div>
                  <div class="eyebrow">Cotizacion tecnica</div>
                  <h1 class="title">${escapeHtml(workshopName)}</h1>
                  <p class="subtitle">Documento generado desde el diagnostico ${escapeHtml(diagnostic.id)}</p>
                </div>
              </div>
              <div class="badge">
                <strong>Estado</strong>
                ${escapeHtml(QUOTE_STATUS_LABELS[diagnostic.status] || diagnostic.status || "Sin estado")}
                <strong style="margin-top:12px;">Fecha</strong>
                ${escapeHtml(formatDate())}
              </div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Cliente</h3>
              <p class="line"><strong>Nombre:</strong> ${escapeHtml(client?.fullName || "Sin cliente")}</p>
              <p class="line"><strong>Identificacion:</strong> ${escapeHtml(client?.identification || "Sin identificacion")}</p>
              <p class="line"><strong>Telefono:</strong> ${escapeHtml(clientPhone)}</p>
              <p class="line"><strong>Direccion:</strong> ${escapeHtml(client?.address || "Sin direccion")}</p>
            </div>
            <div class="card">
              <h3>Vehiculo</h3>
              <p class="line"><strong>Unidad:</strong> ${escapeHtml(vehicleLabel || vehicle?.plate || "Sin vehiculo")}</p>
              <p class="line"><strong>Placa:</strong> ${escapeHtml(vehicle?.plate || "Sin placa")}</p>
              <p class="line"><strong>Kilometraje:</strong> ${escapeHtml(vehicle?.mileage ? `${vehicle.mileage} km` : "Sin kilometraje")}</p>
              <p class="line"><strong>Codigo:</strong> ${escapeHtml(vehicle?.id || diagnostic.vehicleId || "Sin codigo")}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Resumen tecnico</h3>
              <p class="line"><strong>Diagnostico:</strong> ${escapeHtml(diagnostic.id || "Sin codigo")}</p>
              <p class="line"><strong>Mecanico:</strong> ${escapeHtml(workshopProfile?.assignedMechanicName || "Sin asignar")}</p>
              <p class="line"><strong>Asesor:</strong> ${escapeHtml(advisorName)}</p>
              <p class="line"><strong>Contacto taller:</strong> ${escapeHtml(advisorPhone)}</p>
              <p class="line"><strong>Correo:</strong> ${escapeHtml(advisorEmail)}</p>
              <p class="line"><strong>RIF:</strong> ${escapeHtml(workshopRif)}</p>
              <p class="line"><strong>Direccion:</strong> ${escapeHtml(workshopAddress)}</p>
              <p class="line"><strong>Costo estimado:</strong> ${escapeHtml(formatCurrency(diagnostic.quoteCost))}</p>
            </div>
            <div class="card">
              <h3>Motivo y observaciones</h3>
              <div class="section">
                <div class="section-title">Motivo de ingreso</div>
                <p class="body-copy">${escapeHtml(diagnostic.concerns || "Sin hallazgos registrados")}</p>
              </div>
              <div class="section">
                <div class="section-title">Notas</div>
                <p class="body-copy">${escapeHtml(diagnostic.notes || "Sin notas adicionales")}</p>
              </div>
              <div class="section">
                <div class="section-title">Notas comerciales</div>
                <p class="body-copy">${escapeHtml(commercialNotes)}</p>
              </div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>Servicios sugeridos</h3>
              <ul>${renderBulletList(serviceItems, "Sin servicios sugeridos")}</ul>
            </div>
            <div class="card">
              <h3>Repuestos detectados</h3>
              <ul>${renderBulletList(spareParts, "Sin repuestos detectados")}</ul>
            </div>
          </div>

          <div class="footer">
            Este documento resume la cotizacion tecnica generada a partir del diagnostico del taller. Su aprobacion permite avanzar a la orden de trabajo y trazabilidad operativa.
          </div>
        </div>
      </body>
    </html>`;
}

export async function createDiagnosticQuotePdf({
  diagnosticId,
  diagnostic,
  client,
  vehicle,
  workshopProfile,
}) {
  const html = buildDiagnosticQuoteHtml({
    diagnostic: { ...diagnostic, id: diagnostic.id || diagnosticId },
    client,
    vehicle,
    workshopProfile,
  });
  const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });

  if (!base64) {
    throw new Error("No se pudo serializar el PDF de cotizacion.");
  }

  await patchEntityRecord("diagnostics", diagnosticId, {
    quotePdfBase64: base64,
    quotePdfFileName: `cotizacion-${diagnosticId}.pdf`,
    quotePdfMimeType: "application/pdf",
    quoteGeneratedAt: new Date().toISOString(),
    quotePdfDownloadUrl: "",
    quotePdfStoragePath: "",
  });

  return {
    uri,
    base64,
    fileName: `cotizacion-${diagnosticId}.pdf`,
    mimeType: "application/pdf",
  };
}

export async function ensureDiagnosticQuotePdfFile(diagnostic) {
  const base64 = diagnostic?.quotePdfBase64 || "";

  if (!base64) {
    throw new Error(
      "Este diagnostico todavia no tiene un PDF de cotizacion disponible.",
    );
  }

  const fileName =
    diagnostic?.quotePdfFileName ||
    `cotizacion-${diagnostic?.id || "diagnostico"}.pdf`;
  const directoryUri = `${FileSystem.cacheDirectory}diagnostic-quotes/`;

  await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });

  const fileUri = `${directoryUri}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(fileUri);

  if (!fileInfo.exists) {
    throw new Error("El archivo PDF no se pudo preparar en el dispositivo.");
  }

  return {
    fileUri,
    contentUri:
      Platform.OS === "android"
        ? await FileSystem.getContentUriAsync(fileUri)
        : fileUri,
    mimeType: diagnostic?.quotePdfMimeType || "application/pdf",
  };
}
