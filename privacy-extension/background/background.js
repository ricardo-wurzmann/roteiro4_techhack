/**
 * Privacy Guard - Background Script
 * Monitora ameaças à privacidade e calcula score de segurança
 */

// Armazenamento global dos dados por aba
const tabData = {};

// Domínios conhecidos de tracking
const trackingDomains = new Set([
  'google-analytics.com',
  'googletagmanager.com',
  'doubleclick.net',
  'facebook.net',
  'facebook.com',
  'hotjar.com',
  'mixpanel.com',
  'segment.com',
  'amplitude.com',
  'fullstory.com',
  'optimizely.com',
  'mouseflow.com',
  'crazyegg.com'
]);

/**
 * Inicializa dados para uma nova aba
 */
function initTabData(tabId) {
  tabData[tabId] = {
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
    privacyScore: null
  };
}

/**
 * Extrai hostname de uma URL
 */
function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

/**
 * Verifica se um domínio é conhecido como tracker
 */
function isKnownTracker(hostname) {
  return trackingDomains.has(hostname) || 
         Array.from(trackingDomains).some(domain => hostname.includes(domain));
}

/**
 * Detecta conexões de terceira parte
 */
browser.webRequest.onBeforeRequest.addListener(
  async (details) => {
    try {
      if (!details.tabId || details.tabId === -1) return;
      
      // Inicializa dados se necessário
      if (!tabData[details.tabId]) {
        initTabData(details.tabId);
      }
      
      // Obtém informações da aba
      const tab = await browser.tabs.get(details.tabId);
      const tabHostname = getHostname(tab.url);
      const requestHostname = getHostname(details.url);
      
      if (!tabHostname || !requestHostname) return;
      
      // Verifica se é terceira parte
      if (tabHostname !== requestHostname) {
        const thirdParty = {
          domain: requestHostname,
          type: details.type,
          url: details.url,
          timestamp: Date.now(),
          isTracker: isKnownTracker(requestHostname)
        };
        
        // Evita duplicatas
        const exists = tabData[details.tabId].thirdParties.some(
          tp => tp.domain === requestHostname && tp.type === details.type
        );
        
        if (!exists) {
          tabData[details.tabId].thirdParties.push(thirdParty);
        }
      }
    } catch (error) {
      console.error('Erro ao processar requisição:', error);
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

/**
 * Detecta cookies e supercookies
 */
browser.webRequest.onHeadersReceived.addListener(
  async (details) => {
    try {
      if (!details.tabId || details.tabId === -1) return;
      
      if (!tabData[details.tabId]) {
        initTabData(details.tabId);
      }
      
      const tab = await browser.tabs.get(details.tabId);
      const tabHostname = getHostname(tab.url);
      const responseHostname = getHostname(details.url);
      
      // Verifica headers Set-Cookie
      const setCookieHeaders = details.responseHeaders?.filter(
        header => header.name.toLowerCase() === 'set-cookie'
      );
      
      if (setCookieHeaders && setCookieHeaders.length > 0) {
        setCookieHeaders.forEach(header => {
          const cookie = {
            domain: responseHostname,
            value: header.value,
            timestamp: Date.now(),
            isThirdParty: tabHostname !== responseHostname
          };
          
          if (cookie.isThirdParty) {
            tabData[details.tabId].cookies.thirdParty.push(cookie);
          } else {
            tabData[details.tabId].cookies.firstParty.push(cookie);
          }
        });
      }
      
      // Detecta potenciais supercookies via ETag
      const etagHeader = details.responseHeaders?.find(
        header => header.name.toLowerCase() === 'etag'
      );
      
      if (etagHeader && etagHeader.value.length > 20) {
        tabData[details.tabId].cookies.supercookies.push({
          type: 'ETag',
          value: etagHeader.value,
          domain: responseHostname,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Erro ao processar headers:', error);
    }
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

/**
 * Escuta mensagens do content script
 */
browser.runtime.onMessage.addListener((message, sender) => {
  try {
    if (!sender.tab && message.type !== 'GET_DATA' && message.type !== 'GET_SCORE') return;

    // Mensagens do popup (sem sender.tab)
    if (message.type === 'GET_DATA') {
      return Promise.resolve(tabData[message.tabId] || null);
    }

    if (message.type === 'GET_SCORE') {
      return Promise.resolve(calculatePrivacyScore(message.tabId));
    }

    // Mensagens do content script (com sender.tab)
    if (!sender.tab) return;
    const tabId = sender.tab.id;
    if (!tabData[tabId]) initTabData(tabId);

    switch (message.type) {
      case 'FINGERPRINT_DETECTED':
        const existsFingerprint = tabData[tabId].fingerprinting.some(
          fp => fp.method === message.method
        );
        if (!existsFingerprint) {
          tabData[tabId].fingerprinting.push({
            method: message.method,
            detail: message.detail,
            timestamp: Date.now()
          });
        }
        break;

      case 'STORAGE_DATA':
        tabData[tabId].storage = {
          localStorage: message.localStorage || {},
          sessionStorage: message.sessionStorage || {},
          indexedDB: message.indexedDB || []
        };
        break;

      case 'HIJACK_DETECTED':
        tabData[tabId].hijacking.push({
          detail: message.detail,
          timestamp: Date.now()
        });
        break;
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
});

/**
 * Calcula o Privacy Score baseado na metodologia especificada
 */
function calculatePrivacyScore(tabId) {
  if (!tabData[tabId]) {
    return { score: 100, level: 'Seguro', color: '#4ecca3' };
  }
  
  const data = tabData[tabId];
  
  // 1. Terceiras partes únicas (30%)
  const uniqueThirdParties = new Set(data.thirdParties.map(tp => tp.domain)).size;
  let thirdPartyScore;
  if (uniqueThirdParties === 0) thirdPartyScore = 100;
  else if (uniqueThirdParties <= 3) thirdPartyScore = 75;
  else if (uniqueThirdParties <= 10) thirdPartyScore = 50;
  else if (uniqueThirdParties <= 20) thirdPartyScore = 25;
  else thirdPartyScore = 0;
  
  // 2. Fingerprinting (25%)
  const fingerprintingCount = data.fingerprinting.length;
  let fingerprintingScore;
  if (fingerprintingCount === 0) fingerprintingScore = 100;
  else if (fingerprintingCount === 1) fingerprintingScore = 60;
  else if (fingerprintingCount === 2) fingerprintingScore = 30;
  else fingerprintingScore = 0;
  
  // 3. Cookies de terceira parte (20%)
  const thirdPartyCookiesCount = data.cookies.thirdParty.length;
  let cookiesScore;
  if (thirdPartyCookiesCount === 0) cookiesScore = 100;
  else if (thirdPartyCookiesCount <= 3) cookiesScore = 70;
  else if (thirdPartyCookiesCount <= 10) cookiesScore = 40;
  else cookiesScore = 0;
  
  // 4. Web Storage (15%)
  const storageKeys = Object.keys(data.storage.localStorage).length + 
                     Object.keys(data.storage.sessionStorage).length + 
                     data.storage.indexedDB.length;
  let storageScore;
  if (storageKeys === 0) storageScore = 100;
  else if (storageKeys <= 5) storageScore = 80;
  else if (storageKeys <= 20) storageScore = 50;
  else storageScore = 20;
  
  // 5. Scripts/Hijacking suspeitos (10%)
  const hijackingScore = data.hijacking.length === 0 ? 100 : 0;
  
  // Cálculo final ponderado
  const finalScore = Math.round(
    (thirdPartyScore * 0.30) +
    (fingerprintingScore * 0.25) +
    (cookiesScore * 0.20) +
    (storageScore * 0.15) +
    (hijackingScore * 0.10)
  );
  
  // Classificação e cor
  let level, color;
  if (finalScore >= 80) {
    level = 'Seguro';
    color = '#4ecca3';
  } else if (finalScore >= 50) {
    level = 'Moderado';
    color = '#f5a623';
  } else {
    level = 'Perigoso';
    color = '#e94560';
  }
  
  tabData[tabId].privacyScore = { score: finalScore, level, color };
  
  return { score: finalScore, level, color };
}

/**
 * Coleta cookies quando o popup é aberto
 */
async function collectCookies(tabId) {
  try {
    const tab = await browser.tabs.get(tabId);
    const cookies = await browser.cookies.getAll({ url: tab.url });
    
    if (!tabData[tabId]) {
      initTabData(tabId);
    }
    
    const tabHostname = getHostname(tab.url);
    
    cookies.forEach(cookie => {
      const cookieData = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        session: cookie.session,
        expirationDate: cookie.expirationDate
      };
      
      // Classifica cookies
      const isThirdParty = !cookie.domain.includes(tabHostname) && 
                          !tabHostname.includes(cookie.domain.replace(/^\./, ''));
      
      if (isThirdParty) {
        const exists = tabData[tabId].cookies.thirdParty.some(c => c.name === cookie.name);
        if (!exists) {
          tabData[tabId].cookies.thirdParty.push(cookieData);
        }
      } else {
        const exists = tabData[tabId].cookies.firstParty.some(c => c.name === cookie.name);
        if (!exists) {
          tabData[tabId].cookies.firstParty.push(cookieData);
        }
      }
      
      // Classifica por persistência
      if (cookie.session) {
        const exists = tabData[tabId].cookies.session.some(c => c.name === cookie.name);
        if (!exists) {
          tabData[tabId].cookies.session.push(cookieData);
        }
      } else {
        const exists = tabData[tabId].cookies.persistent.some(c => c.name === cookie.name);
        if (!exists) {
          tabData[tabId].cookies.persistent.push(cookieData);
        }
      }
    });
    
  } catch (error) {
    console.error('Erro ao coletar cookies:', error);
  }
}

/**
 * Limpa dados quando aba é fechada
 */
browser.tabs.onRemoved.addListener((tabId) => {
  delete tabData[tabId];
});

/**
 * Reset dados quando há navegação
 */
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) { // Apenas frame principal
    delete tabData[details.tabId];
  }
});

/**
 * Escuta quando popup é aberto para coletar cookies
 */
browser.runtime.onConnect.addListener(async (port) => {
  if (port.name === 'popup') {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await collectCookies(tabs[0].id);
      }
    } catch (error) {
      console.error('Erro ao conectar popup:', error);
    }
  }
});

console.log('Privacy Guard background script iniciado');