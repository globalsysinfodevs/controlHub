/**
 * Marketplace agent catalogue — ported from the client's reference design
 * (marketplace 2.html), in Spanish. This is the catalogue shown in the grid.
 */

export type Accent = "secondary" | "tertiary" | "primary";

export interface CatalogAgent {
  id: string;
  icon: string;
  name: string;
  cat: string;
  model: string;
  desc: string;
  caps: string[];
  tools: string[];
  prompts: string[];
  collab: { icon: string; name: string }[];
  queries: number;
  tokens: string;
  latency: string;
  output: string;
  enabled: boolean;
  isNew?: boolean;
}

export const CATEGORIES: { key: string; label: string; accent: Accent }[] = [
  { key: "Finanzas", label: "Finanzas", accent: "secondary" },
  { key: "Marketing", label: "Marketing", accent: "tertiary" },
  { key: "RRHH", label: "Recursos Humanos", accent: "tertiary" },
  { key: "Legal", label: "Legal", accent: "primary" },
  { key: "Operaciones", label: "Operaciones", accent: "secondary" },
  { key: "CS", label: "Customer Success", accent: "tertiary" },
];

export const CAT_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);
export const CAT_ACCENT: Record<string, Accent> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.accent])
);

export const CATALOG: CatalogAgent[] = [
  {
    id: "a0", icon: "📊", name: "Analista P&L", cat: "Finanzas", model: "GPT-4o",
    desc: "Analiza estados de pérdidas y ganancias, identifica variaciones, tendencias y genera insights accionables sobre la rentabilidad del negocio.",
    caps: ["Análisis de variaciones por línea de negocio", "Generación de gráficas comparativas automáticas", "Exportación a Excel y PDF ejecutivo", "Alertas automáticas por desviaciones al presupuesto"],
    tools: ["Excel Parser", "Chart Generator", "DB Query", "PDF Export"],
    prompts: ['"¿Cuál fue la variación del EBITDA vs el trimestre anterior?"', '"Genera análisis de rentabilidad por línea de producto"', '"¿Dónde están los principales desvíos respecto al presupuesto?"'],
    collab: [{ icon: "📈", name: "Forecast Presupuestal" }, { icon: "💰", name: "Cash Flow Predictor" }],
    queries: 83, tokens: "412K", latency: "1.4s", output: "Chat + Gráficas", enabled: true,
  },
  {
    id: "a1", icon: "🎯", name: "Análisis de Competencia", cat: "Marketing", model: "Claude 3.5",
    desc: "Monitorea competidores en tiempo real, analiza posicionamiento, estrategias de precios y genera reportes comparativos.",
    caps: ["Monitoreo automático de precios y cambios", "Análisis de posicionamiento SEO", "Reportes comparativos con benchmarks", "Alertas ante movimientos estratégicos"],
    tools: ["Web Scraper", "Report Builder", "News API", "Webhook"],
    prompts: ['"¿Cómo se comparan nuestros precios con el mercado?"', '"¿Qué nuevos productos lanzó la competencia este mes?"', '"Genera un mapa de posicionamiento del sector"'],
    collab: [{ icon: "📣", name: "Optimizador de Campañas" }],
    queries: 61, tokens: "298K", latency: "2.1s", output: "Chat + PDF Export", enabled: true,
  },
  {
    id: "a2", icon: "👥", name: "Talent Analytics", cat: "RRHH", model: "GPT-4o",
    desc: "Analiza métricas de desempeño, rotación de personal y clima organizacional.",
    caps: ["Dashboard de indicadores de talento", "Predicción de riesgo de rotación", "Análisis de brechas de competencias", "Recomendaciones de desarrollo"],
    tools: ["HR System API", "Chart Generator", "Surveys", "DB Query"],
    prompts: ['"¿Cuáles son los perfiles con mayor riesgo de salida?"', '"Muéstrame el índice de rotación por área en Q1"'],
    collab: [{ icon: "⭐", name: "Performance Review" }],
    queries: 45, tokens: "187K", latency: "1.9s", output: "Chat + Dashboard", enabled: true,
  },
  {
    id: "a3", icon: "🔮", name: "Churn Predictor", cat: "CS", model: "GPT-4o",
    desc: "Predice la probabilidad de abandono de clientes e identifica señales de riesgo.",
    caps: ["Score de riesgo de churn por cliente", "Segmentación de clientes en riesgo", "Sugerencias de retención por perfil", "Integración con CRM"],
    tools: ["CRM API", "ML Predictor", "Alerts", "Webhook"],
    prompts: ['"¿Qué clientes tienen más del 70% de probabilidad de irse?"', '"Genera plan de retención para los top 10 en riesgo"'],
    collab: [],
    queries: 38, tokens: "156K", latency: "1.6s", output: "Chat + CRM", enabled: true,
  },
  {
    id: "a4", icon: "📈", name: "Forecast Presupuestal", cat: "Finanzas", model: "GPT-4o",
    desc: "Genera proyecciones presupuestales basadas en datos históricos y variables macroeconómicas configurables.",
    caps: ["Proyecciones a 3, 6 y 12 meses", "Análisis de escenarios múltiples", "Integración con ERP", "Exportación a Excel"],
    tools: ["Time Series", "Excel Export", "ERP API", "Chart Generator"],
    prompts: ['"Genera el forecast de ventas para Q3 2025"', '"¿Cuál es el escenario pesimista si las tasas suben 2%?"'],
    collab: [{ icon: "📊", name: "Analista P&L" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + Gráficas", enabled: false,
  },
  {
    id: "a5", icon: "📣", name: "Optimizador de Campañas", cat: "Marketing", model: "GPT-4o",
    desc: "Analiza el rendimiento de campañas digitales y optimiza segmentación y presupuesto para maximizar el ROI.",
    caps: ["Análisis de ROAS por canal", "Recomendaciones de presupuesto", "Optimización de audiencias", "Reportes de performance"],
    tools: ["Google Ads API", "Meta Ads API", "Analytics", "Webhook"],
    prompts: ['"¿Cuál campaña tuvo mejor ROAS esta semana?"', '"Redistribuye el presupuesto para maximizar conversiones"'],
    collab: [{ icon: "🎯", name: "Análisis de Competencia" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + Reportes", enabled: false,
  },
  {
    id: "a6", icon: "⚖️", name: "Revisión de Contratos", cat: "Legal", model: "Claude 3.5",
    desc: "Revisa contratos, identifica cláusulas de riesgo e inconsistencias.",
    caps: ["Identificación de cláusulas de riesgo", "Comparación con contratos estándar", "Resumen ejecutivo claro", "Sugerencias de redacción"],
    tools: ["PDF Parser", "Legal DB", "Risk Scorer", "Report Builder"],
    prompts: ['"¿Hay cláusulas de penalización abusivas?"', '"Resume los términos de pago y entrega"'],
    collab: [{ icon: "🛡️", name: "Compliance Monitor" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + PDF", enabled: false,
  },
  {
    id: "a7", icon: "🔗", name: "Supply Chain Optimizer", cat: "Operaciones", model: "GPT-4o",
    desc: "Optimiza la cadena de suministro y gestiona inventarios con demanda predictiva.",
    caps: ["Predicción de demanda por SKU", "Detección de cuellos de botella", "Optimización de inventario", "Alertas de disrupciones"],
    tools: ["ERP Connector", "IoT Data", "Geolocation", "Webhook"],
    prompts: ['"¿Cuáles son los SKUs con riesgo de desabasto?"'],
    collab: [],
    queries: 0, tokens: "—", latency: "—", output: "Chat + Dashboard", enabled: false,
  },
  {
    id: "a8", icon: "💰", name: "Cash Flow Predictor", cat: "Finanzas", model: "GPT-4o",
    desc: "Proyecta flujos de caja a 30, 60 y 90 días y recomienda acciones preventivas.",
    caps: ["Proyecciones de cash flow", "Detección de brechas de liquidez", "Análisis de estacionalidad", "Optimización de capital de trabajo"],
    tools: ["Bank API", "Time Series", "Alerts", "DB Query"],
    prompts: ['"¿Tendremos problemas de liquidez en 45 días?"'],
    collab: [{ icon: "📊", name: "Analista P&L" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + Gráficas", enabled: false,
  },
  {
    id: "a9", icon: "⭐", name: "Performance Review", cat: "RRHH", model: "GPT-4o",
    desc: "Automatiza evaluaciones de desempeño con análisis objetivos basados en OKRs y feedback 360.",
    caps: ["Evaluaciones basadas en datos", "Análisis de OKRs", "Feedback 360 sintetizado", "Planes de desarrollo"],
    tools: ["HR System API", "OKR Tracker", "Feedback Bot", "Report Builder"],
    prompts: ['"Genera el reporte de desempeño del equipo"'],
    collab: [{ icon: "👥", name: "Talent Analytics" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + Reportes", enabled: false,
  },
  {
    id: "a10", icon: "🔍", name: "SEO Content Analyzer", cat: "Marketing", model: "GPT-4o",
    desc: "Analiza contenido para SEO e identifica keywords de alto impacto.",
    caps: ["Auditoría SEO completa", "Investigación de keywords", "Sugerencias de contenido", "Monitoreo de rankings"],
    tools: ["SEMrush API", "Search Console", "Content AI", "Webhook"],
    prompts: ['"¿Qué keywords debo agregar a mi página?"'],
    collab: [{ icon: "🎯", name: "Análisis de Competencia" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + Reportes", enabled: false, isNew: true,
  },
  {
    id: "a11", icon: "🛡️", name: "Compliance Monitor", cat: "Legal", model: "Claude 3.5",
    desc: "Monitorea cumplimiento regulatorio y genera reportes para auditorías.",
    caps: ["Monitoreo continuo de regulaciones", "Detección de desviaciones", "Evidencias para auditorías", "Alertas por tipo de riesgo"],
    tools: ["Reg Tracker", "Doc Scanner", "Alert Engine", "Report Builder"],
    prompts: ['"¿Hay cambios regulatorios que nos afecten?"'],
    collab: [{ icon: "⚖️", name: "Revisión de Contratos" }],
    queries: 0, tokens: "—", latency: "—", output: "Chat + PDF", enabled: false, isNew: true,
  },
];
