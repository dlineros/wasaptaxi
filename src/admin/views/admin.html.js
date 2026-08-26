/**
 * Renderiza la interfaz gráfica del Panel Administrador Web de WasapTaxi.
 */
export function renderAdminHtml() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WasapTaxi — Panel de Administración Multi-Servicio</title>
  
  <!-- Tailwind CSS CDN para estilos rápidos y modernos -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Leaflet CSS & JS para mapas interactivos -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <style>
    body { background-color: #0f172a; color: #f8fafc; }
    .glass { background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glass-card { background: #1e293b; border: 1px solid #334155; }
    #map { height: 420px; border-radius: 12px; z-index: 10; }
    .tab-active { border-bottom: 2px solid #38bdf8; color: #38bdf8; font-weight: 600; }
  </style>
</head>
<body class="min-h-screen flex flex-col font-sans antialiased">

  <!-- LOGIN MODAL (si no está autenticado) -->
  <div id="login-modal" class="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
    <div class="glass-card rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center">
      <div class="text-4xl mb-3">🚕</div>
      <h2 class="text-2xl font-bold text-white mb-2">WasapTaxi Admin</h2>
      <p class="text-sm text-slate-400 mb-6">Ingresa la contraseña de administrador</p>
      
      <form id="login-form" onsubmit="handleLogin(event)">
        <input type="password" id="admin-pass" placeholder="Contraseña..." class="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 mb-4" required autofocus />
        <button type="submit" class="w-full py-3 bg-sky-500 hover:bg-sky-600 font-semibold rounded-lg text-white transition shadow-lg shadow-sky-500/20">Ingresar al Panel</button>
        <p id="login-error" class="text-rose-400 text-xs mt-3 hidden">Contraseña incorrecta</p>
      </form>
    </div>
  </div>

  <!-- NAVBAR SUPERIOR -->
  <header class="glass sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-slate-800">
    <div class="flex items-center gap-3">
      <span class="text-3xl">🚕</span>
      <div>
        <h1 class="text-lg font-bold text-white leading-tight">WasapTaxi & Servicios</h1>
        <p class="text-xs text-slate-400">Plataforma Multi-Servicio por WhatsApp — Chile 🇨🇱</p>
      </div>
    </div>

    <!-- Indicador Bot de WhatsApp -->
    <div class="flex items-center gap-4">
      <div id="bot-badge" class="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span id="bot-status-text">Verificando WhatsApp...</span>
      </div>
      <button onclick="logout()" class="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 transition">Salir</button>
    </div>
  </header>

  <!-- NAVEGACIÓN POR TABS -->
  <div class="bg-slate-900 border-b border-slate-800 px-6">
    <nav class="flex gap-8 text-sm overflow-x-auto">
      <button onclick="switchTab('dashboard')" id="tab-btn-dashboard" class="py-4 text-slate-400 hover:text-white transition tab-active">📊 Dashboard & Mapa</button>
      <button onclick="switchTab('services')" id="tab-btn-services" class="py-4 text-slate-400 hover:text-white transition">⚙️ Servicios (Rubros)</button>
      <button onclick="switchTab('providers')" id="tab-btn-providers" class="py-4 text-slate-400 hover:text-white transition">👥 Oferentes / Flota</button>
      <button onclick="switchTab('requests')" id="tab-btn-requests" class="py-4 text-slate-400 hover:text-white transition">📦 Solicitudes & Pedidos</button>
      <button onclick="switchTab('customers')" id="tab-btn-customers" class="py-4 text-slate-400 hover:text-white transition">👤 Clientes</button>
      <button onclick="switchTab('audit')" id="tab-btn-audit" class="py-4 text-slate-400 hover:text-white transition">📜 Auditoría de Eventos</button>
    </nav>
  </div>

  <!-- CONTENIDO PRINCIPAL -->
  <main class="flex-1 p-6 max-w-7xl mx-auto w-full">

    <!-- ============================================================ -->
    <!-- TAB 1: DASHBOARD & MAPA -->
    <!-- ============================================================ -->
    <div id="tab-dashboard" class="space-y-6">
      <!-- Widgets de Métricas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-5 rounded-xl">
          <p class="text-xs text-slate-400 uppercase font-semibold">Servicios Activos</p>
          <p id="stat-services" class="text-3xl font-bold text-sky-400 mt-2">0</p>
        </div>
        <div class="glass-card p-5 rounded-xl">
          <p class="text-xs text-slate-400 uppercase font-semibold">Oferentes Registrados</p>
          <p id="stat-providers" class="text-3xl font-bold text-emerald-400 mt-2">0</p>
        </div>
        <div class="glass-card p-5 rounded-xl">
          <p class="text-xs text-slate-400 uppercase font-semibold">Pedidos Hoy</p>
          <p id="stat-today" class="text-3xl font-bold text-amber-400 mt-2">0</p>
        </div>
        <div class="glass-card p-5 rounded-xl">
          <p class="text-xs text-slate-400 uppercase font-semibold">Pendientes en Curso</p>
          <p id="stat-pending" class="text-3xl font-bold text-rose-400 mt-2">0</p>
        </div>
      </div>

      <!-- Mapa en Vivo -->
      <div class="glass-card p-6 rounded-2xl">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-lg font-bold text-white">🗺️ Mapa de Flota y Pedidos en Tiempo Real</h2>
            <p class="text-xs text-slate-400">Posiciones GPS de taxistas/proveedores y solicitudes en curso</p>
          </div>
          <button onclick="initMap()" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded transition">Centrar Mapa</button>
        </div>
        <div id="map"></div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 2: SERVICIOS (CATEGORÍAS) -->
    <!-- ============================================================ -->
    <div id="tab-services" class="hidden space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-white">⚙️ Gestión de Servicios y Rubros</h2>
          <p class="text-sm text-slate-400">Configura qué opciones aparecen en el menú de WhatsApp y sus preguntas</p>
        </div>
        <button onclick="openServiceModal()" class="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-sky-500/20">+ Nuevo Servicio</button>
      </div>

      <div class="glass-card rounded-xl overflow-hidden">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th class="p-4">Orden</th>
              <th class="p-4">Servicio</th>
              <th class="p-4">Slug</th>
              <th class="p-4">Pregunta al Cliente</th>
              <th class="p-4">Ubicación GPS</th>
              <th class="p-4">Estado</th>
              <th class="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="services-table-body" class="divide-y divide-slate-800">
            <tr><td colspan="7" class="p-6 text-center text-slate-500">Cargando servicios...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 3: OFERENTES / FLOTA -->
    <!-- ============================================================ -->
    <div id="tab-providers" class="hidden space-y-6">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">👥 Proveedores y Flota de Oferentes</h2>
          <p class="text-sm text-slate-400">Taxistas, vendedores de pellet, carnicerías y distribuidores por WhatsApp</p>
        </div>
        <div class="flex gap-3">
          <select id="filter-provider-service" onchange="loadProviders()" class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300">
            <option value="">Todos los Servicios</option>
          </select>
          <button onclick="openProviderModal()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-lg transition shadow-lg shadow-emerald-500/20">+ Nuevo Oferente</button>
        </div>
      </div>

      <div class="glass-card rounded-xl overflow-hidden">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th class="p-4">Servicio</th>
              <th class="p-4">Nombre</th>
              <th class="p-4">Teléfono WhatsApp</th>
              <th class="p-4">Negocio / Info Extra</th>
              <th class="p-4">Último GPS</th>
              <th class="p-4">Estado</th>
              <th class="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="providers-table-body" class="divide-y divide-slate-800">
            <tr><td colspan="7" class="p-6 text-center text-slate-500">Cargando proveedores...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 4: SOLICITUDES & PEDIDOS -->
    <!-- ============================================================ -->
    <div id="tab-requests" class="hidden space-y-6">
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">📦 Solicitudes de Servicio en Vivo</h2>
          <p class="text-sm text-slate-400">Control de pedidos, asignaciones y carreras en tiempo real</p>
        </div>
        <div class="flex gap-3">
          <select id="filter-request-status" onchange="loadRequests()" class="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300">
            <option value="">Todos los Estados</option>
            <option value="pending">Pendientes</option>
            <option value="assigned">Asignados / En curso</option>
            <option value="completed">Completados</option>
            <option value="cancelled">Cancelados</option>
          </select>
          <button onclick="loadRequests()" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg">🔄 Refrescar</button>
        </div>
      </div>

      <div class="glass-card rounded-xl overflow-hidden">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th class="p-4">ID</th>
              <th class="p-4">Servicio</th>
              <th class="p-4">Cliente</th>
              <th class="p-4">Detalle / Destino</th>
              <th class="p-4">Ubicación</th>
              <th class="p-4">Oferente Asignado</th>
              <th class="p-4">Estado</th>
              <th class="p-4">Fecha/Hora</th>
              <th class="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody id="requests-table-body" class="divide-y divide-slate-800">
            <tr><td colspan="9" class="p-6 text-center text-slate-500">Cargando solicitudes...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 5: CLIENTES -->
    <!-- ============================================================ -->
    <div id="tab-customers" class="hidden space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">👤 Directorio de Clientes</h2>
        <p class="text-sm text-slate-400">Usuarios que han interactuado con el bot de WhatsApp</p>
      </div>

      <div class="glass-card rounded-xl overflow-hidden">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th class="p-4">ID</th>
              <th class="p-4">Nombre</th>
              <th class="p-4">Teléfono WhatsApp</th>
              <th class="p-4">Paso Actual</th>
              <th class="p-4">Último Servicio Solicitado</th>
              <th class="p-4">Registrado</th>
            </tr>
          </thead>
          <tbody id="customers-table-body" class="divide-y divide-slate-800">
            <tr><td colspan="6" class="p-6 text-center text-slate-500">Cargando clientes...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TAB 6: AUDITORÍA DE EVENTOS -->
    <!-- ============================================================ -->
    <div id="tab-audit" class="hidden space-y-6">
      <div>
        <h2 class="text-xl font-bold text-white">📜 Registro de Auditoría de Notificaciones</h2>
        <p class="text-sm text-slate-400">Historial de qué oferentes recibieron cada pedido, quién aceptó primero y quién rechazó</p>
      </div>

      <div class="glass-card rounded-xl overflow-hidden">
        <table class="w-full text-left text-sm text-slate-300">
          <thead class="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700">
            <tr>
              <th class="p-4">Pedido #</th>
              <th class="p-4">Servicio</th>
              <th class="p-4">Oferente Notificado</th>
              <th class="p-4">Hora Notificación</th>
              <th class="p-4">Hora Respuesta</th>
              <th class="p-4">Resultado</th>
            </tr>
          </thead>
          <tbody id="audit-table-body" class="divide-y divide-slate-800">
            <tr><td colspan="6" class="p-6 text-center text-slate-500">Cargando auditoría...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </main>

  <!-- MODAL: CREAR / EDITAR SERVICIO -->
  <div id="service-modal" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 hidden">
    <div class="glass-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
      <h3 id="service-modal-title" class="text-xl font-bold text-white mb-4">Nuevo Servicio</h3>
      <form id="service-form" onsubmit="saveService(event)" class="space-y-4">
        <input type="hidden" id="service-id" />
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre Visible (ej: Pedir Taxi, Solicitar Pellet)</label>
          <input type="text" id="service-name" required class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Slug (código único)</label>
            <input type="text" id="service-slug" placeholder="ej: taxi, pellet" required class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Emoji / Ícono</label>
            <input type="text" id="service-emoji" placeholder="🚕, 🪵, 🥩" required class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm text-center" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Pregunta de Detalle para el Cliente</label>
          <textarea id="service-prompt" rows="3" required placeholder="ej: ¿Cuántas bolsas necesitas y qué tipo?" class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm"></textarea>
        </div>
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" id="service-requires-location" checked class="rounded bg-slate-900 text-sky-500" />
            Requiere Ubicación GPS
          </label>
          <label class="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" id="service-is-active" checked class="rounded bg-slate-900 text-sky-500" />
            Activo
          </label>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button type="button" onclick="closeServiceModal()" class="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-sky-500 text-white text-sm font-semibold rounded-lg hover:bg-sky-600">Guardar Servicio</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: CREAR / EDITAR OFERENTE -->
  <div id="provider-modal" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 hidden">
    <div class="glass-card rounded-2xl p-6 max-w-md w-full shadow-2xl">
      <h3 id="provider-modal-title" class="text-xl font-bold text-white mb-4">Nuevo Oferente / Proveedor</h3>
      <form id="provider-form" onsubmit="saveProvider(event)" class="space-y-4">
        <input type="hidden" id="provider-id" />
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Servicio / Rubro Asignado</label>
          <select id="provider-service-id" required class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm"></select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
          <input type="text" id="provider-name" required placeholder="ej: Juan Pérez" class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Teléfono WhatsApp (formato +569...)</label>
          <input type="text" id="provider-phone" required placeholder="+56912345678" class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre Comercial / Local (opcional)</label>
          <input type="text" id="provider-business" placeholder="ej: Pellet Express o Taxi Don Juan" class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Datos Adicionales (Patente, Modelo auto, etc.)</label>
          <input type="text" id="provider-extra" placeholder="ej: Toyota Yaris (ABCD-12)" class="w-full px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" id="provider-is-active" checked class="rounded bg-slate-900 text-emerald-500" />
          <label for="provider-is-active" class="text-sm text-slate-300">Oferente Activo y Disponible</label>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button type="button" onclick="closeProviderModal()" class="px-4 py-2 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700">Cancelar</button>
          <button type="submit" class="px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-600">Guardar Oferente</button>
        </div>
      </form>
    </div>
  </div>

  <!-- SCRIPT JS DE LA APLICACIÓN -->
  <script>
    let authToken = localStorage.getItem('wasaptaxi_admin_token') || '';
    let map = null;
    let markersLayer = null;
    let servicesCache = [];

    // Comprobar autenticación al inicio
    if (authToken) {
      document.getElementById('login-modal').classList.add('hidden');
      initDashboard();
    }

    async function handleLogin(e) {
      e.preventDefault();
      const pass = document.getElementById('admin-pass').value;
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pass })
        });
        const data = await res.json();
        if (data.success) {
          authToken = data.token;
          localStorage.setItem('wasaptaxi_admin_token', authToken);
          document.getElementById('login-modal').classList.add('hidden');
          initDashboard();
        } else {
          document.getElementById('login-error').classList.remove('hidden');
        }
      } catch (err) {
        document.getElementById('login-error').classList.remove('hidden');
      }
    }

    function logout() {
      localStorage.removeItem('wasaptaxi_admin_token');
      location.reload();
    }

    function authHeaders() {
      return {
        'Authorization': 'Bearer ' + authToken,
        'Content-Type': 'application/json'
      };
    }

    // Inicializar datos
    async function initDashboard() {
      loadWhatsAppStatus();
      loadMetrics();
      loadServices();
      initMap();
      setInterval(loadMetrics, 10000);
      setInterval(loadWhatsAppStatus, 8000);
    }

    // Cambiar Tabs
    function switchTab(tabId) {
      ['dashboard', 'services', 'providers', 'requests', 'customers', 'audit'].forEach(t => {
        document.getElementById('tab-' + t).classList.add('hidden');
        document.getElementById('tab-btn-' + t).classList.remove('tab-active');
      });
      document.getElementById('tab-' + tabId).classList.remove('hidden');
      document.getElementById('tab-btn-' + tabId).classList.add('tab-active');

      if (tabId === 'dashboard') {
        if (map) setTimeout(() => map.invalidateSize(), 200);
      } else if (tabId === 'services') loadServices();
      else if (tabId === 'providers') loadProviders();
      else if (tabId === 'requests') loadRequests();
      else if (tabId === 'customers') loadCustomers();
      else if (tabId === 'audit') loadAudit();
    }

    // Estado WhatsApp
    async function loadWhatsAppStatus() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const badge = document.getElementById('bot-badge');
        const text = document.getElementById('bot-status-text');

        if (data.isConnected) {
          badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30';
          text.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Bot Conectado';
        } else {
          badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30';
          text.innerHTML = '<span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span> <a href="/" target="_blank" class="underline">Escanear QR</a>';
        }
      } catch (e) {}
    }

    // Métricas
    async function loadMetrics() {
      try {
        const res = await fetch('/api/admin/metrics', { headers: authHeaders() });
        if (res.status === 401) return logout();
        const data = await res.json();
        document.getElementById('stat-services').innerText = data.activeServices || 0;
        document.getElementById('stat-providers').innerText = data.activeProviders || 0;
        document.getElementById('stat-today').innerText = data.todayRequests || 0;
        document.getElementById('stat-pending').innerText = data.pendingRequests || 0;
      } catch (e) {}
    }

    // Mapa Leaflet
    function initMap() {
      if (!map) {
        // Centrado en Chile Central (ej: Santiago / Rancagua)
        map = L.map('map').setView([-33.4489, -70.6693], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        markersLayer = L.layerGroup().addTo(map);
      }
      refreshMapMarkers();
    }

    async function refreshMapMarkers() {
      if (!markersLayer) return;
      markersLayer.clearLayers();

      try {
        const res = await fetch('/api/admin/providers', { headers: authHeaders() });
        const providers = await res.json();

        let bounds = [];
        providers.forEach(p => {
          if (p.latitude && p.longitude) {
            const lat = parseFloat(p.latitude);
            const lng = parseFloat(p.longitude);
            bounds.push([lat, lng]);

            const marker = L.marker([lat, lng]).addTo(markersLayer);
            marker.bindPopup(\`
              <div class="text-slate-900 font-sans">
                <strong>\${p.serviceEmoji} \${p.name}</strong><br/>
                <span class="text-xs text-slate-600">\${p.serviceName}</span><br/>
                \${p.businessName ? '<span class="text-xs font-semibold">' + p.businessName + '</span><br/>' : ''}
                \${p.extraInfo ? '<span class="text-xs text-slate-500">' + p.extraInfo + '</span><br/>' : ''}
                <a href="https://wa.me/\${p.phone.replace(/[^0-9]/g, '')}" target="_blank" class="text-xs text-sky-600 underline font-semibold mt-1 inline-block">WhatsApp</a>
              </div>
            \`);
          }
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      } catch (e) {}
    }

    // SERVICIOS
    async function loadServices() {
      try {
        const res = await fetch('/api/admin/services', { headers: authHeaders() });
        servicesCache = await res.json();
        const tbody = document.getElementById('services-table-body');
        const filterSelect = document.getElementById('filter-provider-service');
        const modalSelect = document.getElementById('provider-service-id');

        // Llenar selects
        filterSelect.innerHTML = '<option value="">Todos los Servicios</option>';
        modalSelect.innerHTML = '';

        servicesCache.forEach(s => {
          filterSelect.innerHTML += \`<option value="\${s.id}">\${s.emoji} \${s.name}</option>\`;
          modalSelect.innerHTML += \`<option value="\${s.id}">\${s.emoji} \${s.name}</option>\`;
        });

        if (servicesCache.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-500">No hay servicios configurados.</td></tr>';
          return;
        }

        tbody.innerHTML = servicesCache.map(s => \`
          <tr class="hover:bg-slate-800/50 transition">
            <td class="p-4 font-mono text-slate-400">#\${s.displayOrder}</td>
            <td class="p-4 font-semibold text-white flex items-center gap-2">
              <span class="text-xl">\${s.emoji}</span> \${s.name}
            </td>
            <td class="p-4 font-mono text-xs text-sky-400">\${s.slug}</td>
            <td class="p-4 text-xs text-slate-300 max-w-xs truncate">\${s.promptDetail}</td>
            <td class="p-4 text-xs">\${s.requiresLocation ? '✅ Sí' : '❌ No'}</td>
            <td class="p-4">
              <button onclick="toggleServiceActive(\${s.id}, \${!s.isActive})" class="px-2.5 py-1 rounded text-xs font-semibold \${s.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}">
                \${s.isActive ? 'Activo' : 'Inactivo'}
              </button>
            </td>
            <td class="p-4 text-right space-x-2">
              <button onclick="editService(\${s.id})" class="text-xs text-sky-400 hover:underline">Editar</button>
              <button onclick="deleteService(\${s.id})" class="text-xs text-rose-400 hover:underline">Eliminar</button>
            </td>
          </tr>
        \`).join('');
      } catch (e) {}
    }

    function openServiceModal(service = null) {
      document.getElementById('service-id').value = service ? service.id : '';
      document.getElementById('service-name').value = service ? service.name : '';
      document.getElementById('service-slug').value = service ? service.slug : '';
      document.getElementById('service-emoji').value = service ? service.emoji : '📦';
      document.getElementById('service-prompt').value = service ? service.promptDetail : '';
      document.getElementById('service-requires-location').checked = service ? service.requiresLocation : true;
      document.getElementById('service-is-active').checked = service ? service.isActive : true;
      document.getElementById('service-modal-title').innerText = service ? 'Editar Servicio' : 'Nuevo Servicio';
      document.getElementById('service-modal').classList.remove('hidden');
    }

    function closeServiceModal() {
      document.getElementById('service-modal').classList.add('hidden');
    }

    function editService(id) {
      const s = servicesCache.find(x => x.id === id);
      if (s) openServiceModal(s);
    }

    async function saveService(e) {
      e.preventDefault();
      const id = document.getElementById('service-id').value;
      const data = {
        name: document.getElementById('service-name').value,
        slug: document.getElementById('service-slug').value,
        emoji: document.getElementById('service-emoji').value,
        promptDetail: document.getElementById('service-prompt').value,
        requiresLocation: document.getElementById('service-requires-location').checked,
        isActive: document.getElementById('service-is-active').checked,
      };

      const url = id ? \`/api/admin/services/\${id}\` : '/api/admin/services';
      const method = id ? 'PUT' : 'POST';

      await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(data) });
      closeServiceModal();
      loadServices();
    }

    async function toggleServiceActive(id, isActive) {
      await fetch(\`/api/admin/services/\${id}\`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive })
      });
      loadServices();
    }

    async function deleteService(id) {
      if (!confirm('¿Seguro que deseas eliminar este servicio?')) return;
      await fetch(\`/api/admin/services/\${id}\`, { method: 'DELETE', headers: authHeaders() });
      loadServices();
    }

    // OFERENTES
    async function loadProviders() {
      try {
        const svcId = document.getElementById('filter-provider-service').value;
        const url = svcId ? \`/api/admin/providers?serviceId=\${svcId}\` : '/api/admin/providers';
        const res = await fetch(url, { headers: authHeaders() });
        const providers = await res.json();
        const tbody = document.getElementById('providers-table-body');

        if (providers.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-slate-500">No hay oferentes registrados.</td></tr>';
          return;
        }

        tbody.innerHTML = providers.map(p => \`
          <tr class="hover:bg-slate-800/50 transition">
            <td class="p-4 text-xs font-semibold text-sky-400">
              \${p.serviceEmoji || '📦'} \${p.serviceName || 'General'}
            </td>
            <td class="p-4 font-semibold text-white">\${p.name}</td>
            <td class="p-4 font-mono text-xs text-slate-300">
              <a href="https://wa.me/\${p.phone.replace(/[^0-9]/g, '')}" target="_blank" class="hover:text-emerald-400 underline">\${p.phone}</a>
            </td>
            <td class="p-4 text-xs text-slate-400">
              \${p.businessName ? '<span class="text-white font-medium">' + p.businessName + '</span>' : ''}
              \${p.extraInfo ? '<br/><span class="text-slate-500">' + p.extraInfo + '</span>' : ''}
            </td>
            <td class="p-4 text-xs text-slate-400">
              \${p.latitude && p.longitude ? '📍 ' + parseFloat(p.latitude).toFixed(4) + ', ' + parseFloat(p.longitude).toFixed(4) : 'Sin GPS'}
            </td>
            <td class="p-4">
              <button onclick="toggleProviderActive(\${p.id}, \${!p.isActive})" class="px-2.5 py-1 rounded text-xs font-semibold \${p.isActive ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}">
                \${p.isActive ? 'Activo' : 'Inactivo'}
              </button>
            </td>
            <td class="p-4 text-right space-x-2">
              <button onclick="deleteProvider(\${p.id})" class="text-xs text-rose-400 hover:underline">Eliminar</button>
            </td>
          </tr>
        \`).join('');
      } catch (e) {}
    }

    function openProviderModal() {
      document.getElementById('provider-id').value = '';
      document.getElementById('provider-name').value = '';
      document.getElementById('provider-phone').value = '+569';
      document.getElementById('provider-business').value = '';
      document.getElementById('provider-extra').value = '';
      document.getElementById('provider-is-active').checked = true;
      document.getElementById('provider-modal').classList.remove('hidden');
    }

    function closeProviderModal() {
      document.getElementById('provider-modal').classList.add('hidden');
    }

    async function saveProvider(e) {
      e.preventDefault();
      const data = {
        serviceId: parseInt(document.getElementById('provider-service-id').value, 10),
        name: document.getElementById('provider-name').value,
        phone: document.getElementById('provider-phone').value,
        businessName: document.getElementById('provider-business').value,
        extraInfo: document.getElementById('provider-extra').value,
        isActive: document.getElementById('provider-is-active').checked,
      };

      await fetch('/api/admin/providers', { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
      closeProviderModal();
      loadProviders();
      refreshMapMarkers();
    }

    async function toggleProviderActive(id, isActive) {
      await fetch(\`/api/admin/providers/\${id}\`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive })
      });
      loadProviders();
      refreshMapMarkers();
    }

    async function deleteProvider(id) {
      if (!confirm('¿Eliminar este oferente?')) return;
      await fetch(\`/api/admin/providers/\${id}\`, { method: 'DELETE', headers: authHeaders() });
      loadProviders();
      refreshMapMarkers();
    }

    // SOLICITUDES
    async function loadRequests() {
      try {
        const status = document.getElementById('filter-request-status').value;
        const url = status ? \`/api/admin/requests?status=\${status}\` : '/api/admin/requests';
        const res = await fetch(url, { headers: authHeaders() });
        const requests = await res.json();
        const tbody = document.getElementById('requests-table-body');

        if (requests.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-500">No hay solicitudes registradas.</td></tr>';
          return;
        }

        const statusBadges = {
          pending: '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">⏳ Pendiente</span>',
          assigned: '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-800">🚀 Asignado</span>',
          completed: '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">✅ Completado</span>',
          cancelled: '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">❌ Cancelado</span>',
        };

        tbody.innerHTML = requests.map(r => \`
          <tr class="hover:bg-slate-800/50 transition">
            <td class="p-4 font-mono text-slate-400 text-xs">#\${r.id}</td>
            <td class="p-4 font-semibold text-white text-xs">\${r.service_emoji} \${r.service_name}</td>
            <td class="p-4 text-xs">
              \${r.customer_name || 'Cliente'}<br/>
              <span class="text-slate-500 font-mono">\${r.customer_phone}</span>
            </td>
            <td class="p-4 text-xs text-slate-300 max-w-xs">\${r.request_detail || '-'}</td>
            <td class="p-4 text-xs text-slate-400 max-w-xs truncate">\${r.location_address || '-'}</td>
            <td class="p-4 text-xs">
              \${r.provider_name ? '<strong class="text-emerald-400">' + r.provider_name + '</strong><br/><span class="text-slate-500">' + r.provider_phone + '</span>' : '<span class="text-slate-600">Sin asignar</span>'}
            </td>
            <td class="p-4">\${statusBadges[r.status] || r.status}</td>
            <td class="p-4 text-xs text-slate-500 font-mono">\${new Date(r.created_at).toLocaleString('es-CL', { hour: '2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})}</td>
            <td class="p-4 text-right space-x-1 text-xs">
              \${r.status === 'pending' || r.status === 'assigned' ? \`
                <button onclick="updateRequestStatus(\${r.id}, 'completed')" class="text-emerald-400 hover:underline">Completar</button>
                <button onclick="updateRequestStatus(\${r.id}, 'cancelled')" class="text-rose-400 hover:underline">Cancelar</button>
              \` : '-'}
            </td>
          </tr>
        \`).join('');
      } catch (e) {}
    }

    async function updateRequestStatus(id, status) {
      if (!confirm(\`¿Cambiar estado del pedido #\${id} a \${status}?\`)) return;
      await fetch(\`/api/admin/requests/\${id}/status\`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      loadRequests();
      loadMetrics();
    }

    // CLIENTES
    async function loadCustomers() {
      try {
        const res = await fetch('/api/admin/customers', { headers: authHeaders() });
        const customers = await res.json();
        const tbody = document.getElementById('customers-table-body');

        if (customers.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-500">No hay clientes aún.</td></tr>';
          return;
        }

        tbody.innerHTML = customers.map(c => \`
          <tr class="hover:bg-slate-800/50 transition">
            <td class="p-4 font-mono text-slate-400 text-xs">#\${c.id}</td>
            <td class="p-4 font-semibold text-white">\${c.name || 'Sin nombre'}</td>
            <td class="p-4 font-mono text-xs text-sky-400">\${c.phone}</td>
            <td class="p-4 text-xs text-slate-400 font-mono">\${c.currentStep}</td>
            <td class="p-4 text-xs">\${c.serviceName ? c.serviceEmoji + ' ' + c.serviceName : '-'}</td>
            <td class="p-4 text-xs text-slate-500 font-mono">\${new Date(c.createdAt).toLocaleDateString('es-CL')}</td>
          </tr>
        \`).join('');
      } catch (e) {}
    }

    // AUDITORÍA
    async function loadAudit() {
      try {
        const res = await fetch('/api/admin/audit', { headers: authHeaders() });
        const logs = await res.json();
        const tbody = document.getElementById('audit-table-body');

        if (logs.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-500">Sin registros de auditoría.</td></tr>';
          return;
        }

        const responseBadges = {
          accepted: '<span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">🏆 Ganó Pedido</span>',
          taken_by_other: '<span class="px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-800">Tomado por otro</span>',
          rejected: '<span class="px-2 py-0.5 rounded text-xs bg-rose-950 text-rose-400">Rechazado</span>',
          null: '<span class="px-2 py-0.5 rounded text-xs text-slate-500">Sin respuesta</span>',
        };

        tbody.innerHTML = logs.map(l => \`
          <tr class="hover:bg-slate-800/50 transition text-xs">
            <td class="p-4 font-mono text-white font-semibold">#\${l.request_id}</td>
            <td class="p-4 text-slate-300">\${l.service_emoji} \${l.service_name}</td>
            <td class="p-4 font-semibold text-white">\${l.provider_name} (\${l.provider_phone})</td>
            <td class="p-4 font-mono text-slate-400">\${new Date(l.sent_at).toLocaleTimeString('es-CL')}</td>
            <td class="p-4 font-mono text-slate-400">\${l.responded_at ? new Date(l.responded_at).toLocaleTimeString('es-CL') : '-'}</td>
            <td class="p-4">\${responseBadges[l.response] || l.response || '<span class="text-slate-600">Pendiente</span>'}</td>
          </tr>
        \`).join('');
      } catch (e) {}
    }
  </script>
</body>
</html>`;
}
