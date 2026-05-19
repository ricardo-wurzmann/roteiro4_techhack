/**
 * Privacy Guard - Popup Script
 * Gerencia a interface do usuário e exibição de dados
 */

class PrivacyGuardPopup {
  constructor() {
    this.currentTabId = null;
    this.data = null;
    this.expandedSections = new Set();
    
    this.init();
  }
  
  /**
   * Inicializa o popup
   */
  async init() {
    try {
      // Conecta com background para trigger de coleta de cookies
      const port = browser.runtime.connect({ name: 'popup' });
      
      // Obtém a aba ativa
      const tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });

      if (tabs[0]) {
        this.currentTabId = tabs[0].id;
        await this.loadData();
      }
      
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Erro ao inicializar popup:', error);
      this.showError('Erro ao carregar dados da extensão');
    }
  }
  
  /**
   * Carrega dados da aba atual
   */
  async loadData() {
    try {
      if (!this.currentTabId) return;
      
      // Solicita dados ao background script
      const response = await browser.runtime.sendMessage({
        type: 'GET_DATA',
        tabId: this.currentTabId
      });
      
      this.data = response || this.getEmptyData();
      
      // Calcula e obtém o score
      const scoreResponse = await browser.runtime.sendMessage({
        type: 'GET_SCORE',
        tabId: this.currentTabId
      });
      
      if (scoreResponse) {
        this.data.privacyScore = scoreResponse;
      }
      
      this.renderData();
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      this.data = this.getEmptyData();
      this.renderData();
    }
  }
  
  /**
   * Retorna estrutura de dados vazia
   */
  getEmptyData() {
    return {
      thirdParties: [],
      cookies: {
        firstParty: [],
        thirdParty: [],
        session: [],
        persistent: [],
        supercookies: []
      },
      storage: {
        localStorage: {},
        sessionStorage: {},
        indexedDB: []
      },
      fingerprinting: [],
      hijacking: [],
      privacyScore: { score: 100, level: 'Seguro', color: '#4ecca3' }
    };
  }
  
  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Botão de refresh
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadData();
    });
    
    // Headers das seções (toggle)
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', () => {
        const section = header.dataset.section;
        this.toggleSection(section);
      });
    });
    
    // Cards de resumo (expandir seção correspondente)
    document.querySelectorAll('.summary-card').forEach(card => {
      card.addEventListener('click', () => {
        const section = card.id.replace('Card', '');
        let sectionName = section;
        
        // Mapear nomes
        if (section === 'thirdParties') sectionName = 'thirdParties';
        else if (section === 'cookies') sectionName = 'cookies';
        else if (section === 'fingerprinting') sectionName = 'fingerprinting';
        else if (section === 'storage') sectionName = 'storage';
        
        this.expandSection(sectionName);
      });
    });
    
    // Storage accordions
    document.addEventListener('click', (e) => {
      if (e.target.closest('.storage-header')) {
        const header = e.target.closest('.storage-header');
        const items = header.nextElementSibling;
        if (items && items.classList.contains('storage-items')) {
          items.classList.toggle('expanded');
        }
      }
    });
  }
  
  /**
   * Toggle de seção
   */
  toggleSection(sectionName) {
    const header = document.querySelector(`[data-section="${sectionName}"]`);
    const content = document.getElementById(`${sectionName}Details`);
    
    if (!header || !content) return;
    
    const isExpanded = this.expandedSections.has(sectionName);
    
    if (isExpanded) {
      this.expandedSections.delete(sectionName);
      header.classList.remove('expanded');
      content.classList.remove('expanded');
    } else {
      this.expandedSections.add(sectionName);
      header.classList.add('expanded');
      content.classList.add('expanded');
    }
  }
  
  /**
   * Expande uma seção específica
   */
  // expandSection(sectionName) {
  //   if (!this.expandedSections.has(sectionName)) {
  //     this.toggleSection(sectionName);
  //   }
    
  //   // Scroll para a seção
  //   const element = document.querySelector(`[data-section="${sectionName}"]`);
  //   if (element) {
  //     element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //   }
  // }
  expandSection(sectionName) {
    if (!this.expandedSections.has(sectionName)) {
      this.toggleSection(sectionName);
    }
  }
  
  /**
   * Renderiza todos os dados na interface
   */
  renderData() {
    this.renderPrivacyScore();
    this.renderSummaryCards();
    this.renderThirdParties();
    this.renderCookies();
    this.renderStorage();
    this.renderFingerprinting();
    this.renderHijacking();
  }
  
  /**
   * Renderiza o score de privacidade
   */
  renderPrivacyScore() {
    const scoreNumber = document.getElementById('scoreNumber');
    const scoreLabel = document.getElementById('scoreLabel');
    const progressCircle = document.getElementById('progressCircle');
    
    if (!this.data.privacyScore) return;
    
    const { score, level, color } = this.data.privacyScore;
    
    // Atualiza número e label
    scoreNumber.textContent = score;
    scoreLabel.textContent = level;
    scoreLabel.className = `score-label score-${level.toLowerCase()}`;
    
    // Atualiza cor do círculo
    progressCircle.style.color = color;
    
    // Anima o progresso
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (score / 100) * circumference;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    progressCircle.style.strokeDashoffset = offset;
  }
  
  /**
   * Renderiza cards de resumo
   */
  renderSummaryCards() {
    // Terceiras partes
    const uniqueThirdParties = new Set(this.data.thirdParties.map(tp => tp.domain)).size;
    document.getElementById('thirdPartiesCount').textContent = uniqueThirdParties;
    
    // Cookies
    const totalCookies = this.data.cookies.firstParty.length + this.data.cookies.thirdParty.length;
    document.getElementById('cookiesCount').textContent = totalCookies;
    
    // Fingerprinting
    document.getElementById('fingerprintingCount').textContent = this.data.fingerprinting.length;
    
    // Storage
    const storageCount = Object.keys(this.data.storage.localStorage).length + 
                       Object.keys(this.data.storage.sessionStorage).length + 
                       this.data.storage.indexedDB.length;
    document.getElementById('storageCount').textContent = storageCount;
  }
  
  /**
   * Renderiza detalhes de terceiras partes
   */
  renderThirdParties() {
    const container = document.getElementById('thirdPartiesDetails');
    
    if (this.data.thirdParties.length === 0) {
      container.innerHTML = '<div class="loading">Nenhuma terceira parte detectada</div>';
      return;
    }
    
    // Agrupa por domínio
    const domainMap = new Map();
    this.data.thirdParties.forEach(tp => {
      if (!domainMap.has(tp.domain)) {
        domainMap.set(tp.domain, {
          domain: tp.domain,
          types: new Set(),
          isTracker: tp.isTracker || false,
          count: 0
        });
      }
      const entry = domainMap.get(tp.domain);
      entry.types.add(tp.type);
      entry.count++;
    });
    
    const domains = Array.from(domainMap.values()).sort((a, b) => b.count - a.count);
    
    let html = `
      <table class="third-parties-table">
        <thead>
          <tr>
            <th>Domínio</th>
            <th>Tipos</th>
            <th>Risco</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    domains.forEach(domain => {
      const riskLevel = domain.isTracker ? 'high' : (domain.count > 5 ? 'medium' : 'low');
      const riskText = domain.isTracker ? 'Alto' : (domain.count > 5 ? 'Médio' : 'Baixo');
      
      html += `
        <tr>
          <td class="domain-cell" title="${domain.domain}">${domain.domain}</td>
          <td>${Array.from(domain.types).slice(0, 3).join(', ')}${domain.types.size > 3 ? '...' : ''}</td>
          <td>
            <span class="risk-indicator risk-${riskLevel}"></span>
            ${riskText}
          </td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
  }
  
  /**
   * Renderiza detalhes de cookies
   */
  renderCookies() {
    const container = document.getElementById('cookiesDetails');
    
    const sections = [
      { name: 'Primeira Parte', data: this.data.cookies.firstParty, key: 'firstParty' },
      { name: 'Terceira Parte', data: this.data.cookies.thirdParty, key: 'thirdParty' },
      { name: 'Sessão', data: this.data.cookies.session, key: 'session' },
      { name: 'Persistente', data: this.data.cookies.persistent, key: 'persistent' },
      { name: 'Supercookies', data: this.data.cookies.supercookies, key: 'supercookies' }
    ];
    
    let html = '';
    
    sections.forEach(section => {
      if (section.data.length > 0) {
        html += `
          <div class="cookies-section">
            <h4>${section.name} (${section.data.length})</h4>
            <div class="cookie-list">
        `;
        
        section.data.slice(0, 10).forEach(cookie => {
          const name = cookie.name || cookie.type || 'Cookie';
          const domain = cookie.domain || '';
          
          html += `
            <div class="cookie-item">
              <div>
                <div class="cookie-name">${name}</div>
                <div class="cookie-domain">${domain}</div>
              </div>
            </div>
          `;
        });
        
        if (section.data.length > 10) {
          html += `<div class="text-muted text-center mb-2">...e mais ${section.data.length - 10}</div>`;
        }
        
        html += '</div></div>';
      }
    });
    
    container.innerHTML = html || '<div class="loading">Nenhum cookie detectado</div>';
  }
  
  /**
   * Renderiza detalhes de storage
   */
  renderStorage() {
    const container = document.getElementById('storageDetails');
    
    let html = '';
    
    // LocalStorage
    const localKeys = Object.keys(this.data.storage.localStorage);
    if (localKeys.length > 0) {
      html += `
        <div class="storage-accordion">
          <div class="storage-header">
            <h5>localStorage</h5>
            <span class="storage-count">${localKeys.length}</span>
          </div>
          <div class="storage-items">
      `;
      
      localKeys.forEach(key => {
        const item = this.data.storage.localStorage[key];
        const size = item.size ? `${item.size} bytes` : '';
        
        html += `
          <div class="storage-item">
            <span class="storage-key" title="${key}">${key}</span>
            <span class="storage-size">${size}</span>
          </div>
        `;
      });
      
      html += '</div></div>';
    }
    
    // SessionStorage
    const sessionKeys = Object.keys(this.data.storage.sessionStorage);
    if (sessionKeys.length > 0) {
      html += `
        <div class="storage-accordion">
          <div class="storage-header">
            <h5>sessionStorage</h5>
            <span class="storage-count">${sessionKeys.length}</span>
          </div>
          <div class="storage-items">
      `;
      
      sessionKeys.forEach(key => {
        const item = this.data.storage.sessionStorage[key];
        const size = item.size ? `${item.size} bytes` : '';
        
        html += `
          <div class="storage-item">
            <span class="storage-key" title="${key}">${key}</span>
            <span class="storage-size">${size}</span>
          </div>
        `;
      });
      
      html += '</div></div>';
    }
    
    // IndexedDB
    if (this.data.storage.indexedDB.length > 0) {
      html += `
        <div class="storage-accordion">
          <div class="storage-header">
            <h5>IndexedDB</h5>
            <span class="storage-count">${this.data.storage.indexedDB.length}</span>
          </div>
          <div class="storage-items">
      `;
      
      this.data.storage.indexedDB.forEach(db => {
        html += `
          <div class="storage-item">
            <span class="storage-key" title="${db.name}">${db.name}</span>
            <span class="storage-size">v${db.version}</span>
          </div>
        `;
      });
      
      html += '</div></div>';
    }
    
    container.innerHTML = html || '<div class="loading">Nenhum Web Storage detectado</div>';
  }
  
  /**
   * Renderiza detecções de fingerprinting
   */
  renderFingerprinting() {
    const container = document.getElementById('fingerprintingDetails');
    
    if (this.data.fingerprinting.length === 0) {
      container.innerHTML = '<div class="loading">Nenhuma técnica de fingerprinting detectada</div>';
      return;
    }
    
    let html = '';
    
    this.data.fingerprinting.forEach(fp => {
      html += `
        <div class="fingerprint-item">
          <div class="fingerprint-icon">⚠️</div>
          <div class="fingerprint-details">
            <div class="fingerprint-method">${fp.method}</div>
            <div class="fingerprint-description">${fp.detail}</div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  /**
   * Renderiza detecções de hijacking
   */
  renderHijacking() {
    const container = document.getElementById('hijackingDetails');
    
    if (this.data.hijacking.length === 0) {
      container.innerHTML = '<div class="loading">Nenhum script suspeito detectado</div>';
      return;
    }
    
    let html = '';
    
    this.data.hijacking.forEach(hijack => {
      const detail = hijack.detail;
      const reason = detail.reason || 'Script suspeito';
      const description = detail.detail || detail.src || 'Detalhes não disponíveis';
      
      html += `
        <div class="hijack-item">
          <div class="hijack-icon">🚨</div>
          <div class="hijack-details">
            <div class="hijack-reason">${reason}</div>
            <div class="hijack-description">${description}</div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    const container = document.querySelector('.popup-container');
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #e94560;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <div style="font-weight: 600; margin-bottom: 8px;">Erro</div>
        <div style="font-size: 14px; color: #888;">${message}</div>
      </div>
    `;
  }
}

// Inicializa quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  new PrivacyGuardPopup();
});

