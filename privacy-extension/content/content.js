/**
 * Privacy Guard - Content Script
 * Injeta o script no MAIN world e coleta dados de storage
 */

(function() {
  'use strict';
  
  /**
   * Injeta o script injected.js no MAIN world
   */
  function injectScript() {
    try {
      const script = document.createElement('script');
      script.src = browser.runtime.getURL('content/injected.js');
      script.onload = function() {
        this.remove();
      };
      
      // Injeta antes de qualquer outro script
      (document.head || document.documentElement).appendChild(script);
      
    } catch (error) {
      console.error('Erro ao injetar script:', error);
    }
  }
  
  /**
   * Escuta mensagens do injected.js
   */
  window.addEventListener('message', function(event) {
    try {
      // Verifica origem e estrutura da mensagem
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.source !== 'PRIVACY_GUARD_INJECTED') return;
      
      // Repassa para background script
      if (event.data.type === 'FINGERPRINT_DETECTED') {
        browser.runtime.sendMessage({
          type: 'FINGERPRINT_DETECTED',
          method: event.data.method,
          detail: event.data.detail
        });
      } else if (event.data.type === 'HIJACK_DETECTED') {
        browser.runtime.sendMessage({
          type: 'HIJACK_DETECTED',
          detail: event.data.detail
        });
      }
    } catch (error) {
      console.error('Erro ao processar mensagem:', error);
    }
  });
  
  /**
   * Coleta dados de Web Storage
   */
  function collectStorageData() {
    try {
      // Script inline para acessar storage no contexto da página
      const script = document.createElement('script');
      script.textContent = `
        (function() {
          try {
            const storageData = {
              localStorage: {},
              sessionStorage: {},
              indexedDB: []
            };
            
            // Coleta localStorage
            try {
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                storageData.localStorage[key] = {
                  value: value,
                  size: new Blob([value]).size
                };
              }
            } catch (e) {
              console.warn('Erro ao acessar localStorage:', e);
            }
            
            // Coleta sessionStorage
            try {
              for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                storageData.sessionStorage[key] = {
                  value: value,
                  size: new Blob([value]).size
                };
              }
            } catch (e) {
              console.warn('Erro ao acessar sessionStorage:', e);
            }
            
            // Coleta IndexedDB
            if (window.indexedDB && indexedDB.databases) {
              indexedDB.databases().then(databases => {
                storageData.indexedDB = databases.map(db => ({
                  name: db.name,
                  version: db.version
                }));
                
                // Envia dados coletados
                window.postMessage({
                  source: 'PRIVACY_GUARD_STORAGE',
                  type: 'STORAGE_DATA',
                  data: storageData
                }, '*');
              }).catch(e => {
                console.warn('Erro ao listar IndexedDB:', e);
                // Envia mesmo assim, sem IndexedDB
                window.postMessage({
                  source: 'PRIVACY_GUARD_STORAGE',
                  type: 'STORAGE_DATA',
                  data: storageData
                }, '*');
              });
            } else {
              // Envia sem IndexedDB
              window.postMessage({
                source: 'PRIVACY_GUARD_STORAGE',
                type: 'STORAGE_DATA',
                data: storageData
              }, '*');
            }
          } catch (error) {
            console.error('Erro ao coletar storage:', error);
          }
        })();
      `;
      
      (document.head || document.documentElement).appendChild(script);
      script.remove();
      
    } catch (error) {
      console.error('Erro ao coletar dados de storage:', error);
    }
  }
  
  /**
   * Escuta dados de storage
   */
  window.addEventListener('message', function(event) {
    try {
      if (event.origin !== window.location.origin) return;
      if (!event.data || event.data.source !== 'PRIVACY_GUARD_STORAGE') return;
      
      if (event.data.type === 'STORAGE_DATA') {
        browser.runtime.sendMessage({
          type: 'STORAGE_DATA',
          localStorage: event.data.data.localStorage,
          sessionStorage: event.data.data.sessionStorage,
          indexedDB: event.data.data.indexedDB,
          domain: window.location.hostname
        });
      }
    } catch (error) {
      console.error('Erro ao processar dados de storage:', error);
    }
  });
  
  /**
   * Detecta scripts suspeitos no DOM
   */
  function detectSuspiciousScripts() {
    try {
      const scripts = document.querySelectorAll('script[src]');
      const pageHostname = window.location.hostname;
      
      scripts.forEach(scriptElement => {
        try {
          const src = scriptElement.src;
          if (!src) return;
          
          const scriptUrl = new URL(src);
          const scriptHostname = scriptUrl.hostname;
          
          // Verifica se é terceira parte
          if (scriptHostname !== pageHostname) {
            let suspicious = false;
            let reason = '';
            
            // Padrões suspeitos
            const suspiciousPatterns = [
              /analytics/i,
              /track/i,
              /beacon/i,
              /pixel/i,
              /fingerprint/i,
              /\d{3,}/  // Números com 3+ dígitos (ofuscação)
            ];
            
            // Domínios conhecidos de tracking
            const trackingDomains = [
              'google-analytics.com',
              'googletagmanager.com',
              'doubleclick.net',
              'facebook.net',
              'hotjar.com',
              'mixpanel.com',
              'segment.com',
              'amplitude.com',
              'fullstory.com'
            ];
            
            // Verifica padrões no URL
            if (suspiciousPatterns.some(pattern => pattern.test(src))) {
              suspicious = true;
              reason = 'Padrão suspeito no URL';
            }
            
            // Verifica domínios conhecidos
            if (trackingDomains.some(domain => scriptHostname.includes(domain))) {
              suspicious = true;
              reason = 'Domínio conhecido de tracking';
            }
            
            if (suspicious) {
              browser.runtime.sendMessage({
                type: 'HIJACK_DETECTED',
                detail: {
                  src: src,
                  reason: reason,
                  hostname: scriptHostname
                }
              });
            }
          }
        } catch (error) {
          console.warn('Erro ao analisar script:', error);
        }
      });
    } catch (error) {
      console.error('Erro ao detectar scripts suspeitos:', error);
    }
  }
  
  /**
   * Monitora redirecionamentos
   */
  function monitorRedirects() {
    try {
      const originalSetter = Object.getOwnPropertyDescriptor(Location.prototype, 'href').set;
      
      Object.defineProperty(window.location, 'href', {
        set: function(value) {
          try {
            const newUrl = new URL(value, window.location.href);
            const currentHostname = window.location.hostname;
            
            if (newUrl.hostname !== currentHostname) {
              browser.runtime.sendMessage({
                type: 'HIJACK_DETECTED',
                detail: {
                  reason: 'redirect_attempt',
                  from: window.location.href,
                  to: value,
                  hostname: newUrl.hostname
                }
              });
            }
          } catch (error) {
            // Ignora URLs inválidas
          }
          
          return originalSetter.call(this, value);
        },
        configurable: true
      });
    } catch (error) {
      console.warn('Erro ao monitorar redirecionamentos:', error);
    }
  }
  
  /**
   * Inicialização
   */
  function initialize() {
    // Injeta o script imediatamente
    injectScript();
    
    // Monitora redirecionamentos
    monitorRedirects();
    
    // Aguarda DOM estar carregado para outras análises
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
          collectStorageData();
          detectSuspiciousScripts();
        }, 1000); // Aguarda um pouco para a página carregar
      });
    } else {
      // DOM já carregado
      setTimeout(() => {
        collectStorageData();
        detectSuspiciousScripts();
      }, 1000);
    }
  }
  
  // Inicia a extensão
  initialize();
  
  console.log('Privacy Guard content script carregado');
})();