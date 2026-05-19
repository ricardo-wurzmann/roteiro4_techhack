/**
 * Privacy Guard - Injected Script
 * Executa no MAIN world para interceptar APIs de fingerprinting
 */

(function() {
  'use strict';
  
  // Função para enviar detecções via postMessage
  function reportFingerprinting(method, detail) {
    window.postMessage({
      source: 'PRIVACY_GUARD_INJECTED',
      type: 'FINGERPRINT_DETECTED',
      method: method,
      detail: detail
    }, '*');
  }
  
  function reportHijacking(reason, detail) {
    window.postMessage({
      source: 'PRIVACY_GUARD_INJECTED',
      type: 'HIJACK_DETECTED',
      detail: { reason: reason, detail: detail }
    }, '*');
  }
  
  // ========== CANVAS FINGERPRINTING ==========
  
  // HTMLCanvasElement.prototype.toDataURL
  if (window.HTMLCanvasElement && window.HTMLCanvasElement.prototype.toDataURL) {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(...args) {
      reportFingerprinting('canvas.toDataURL', 'Canvas toDataURL chamado - possível fingerprinting');
      return originalToDataURL.apply(this, args);
    };
  }
  
  // HTMLCanvasElement.prototype.toBlob
  if (window.HTMLCanvasElement && window.HTMLCanvasElement.prototype.toBlob) {
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(...args) {
      reportFingerprinting('canvas.toBlob', 'Canvas toBlob chamado - possível fingerprinting');
      return originalToBlob.apply(this, args);
    };
  }
  
  // CanvasRenderingContext2D.prototype.getImageData
  if (window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype.getImageData) {
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function(...args) {
      reportFingerprinting('canvas.getImageData', 'Canvas getImageData chamado - possível fingerprinting');
      return originalGetImageData.apply(this, args);
    };
  }
  
  // ========== WEBGL FINGERPRINTING ==========
  
  // WebGLRenderingContext.prototype.getParameter
  if (window.WebGLRenderingContext && window.WebGLRenderingContext.prototype.getParameter) {
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(pname) {
      // Detecta acesso a informações sensíveis do WebGL
      if (pname === this.RENDERER || pname === this.VENDOR || 
          pname === this.VERSION || pname === this.SHADING_LANGUAGE_VERSION) {
        reportFingerprinting('webgl.getParameter', `WebGL getParameter chamado com ${pname} - possível fingerprinting`);
      }
      return originalGetParameter.apply(this, arguments);
    };
  }
  
  // WebGL2RenderingContext.prototype.getParameter
  if (window.WebGL2RenderingContext && window.WebGL2RenderingContext.prototype.getParameter) {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = function(pname) {
      if (pname === this.RENDERER || pname === this.VENDOR || 
          pname === this.VERSION || pname === this.SHADING_LANGUAGE_VERSION) {
        reportFingerprinting('webgl2.getParameter', `WebGL2 getParameter chamado com ${pname} - possível fingerprinting`);
      }
      return originalGetParameter2.apply(this, arguments);
    };
  }
  
  // Detectar acesso à extensão WEBGL_debug_renderer_info
  if (window.WebGLRenderingContext && window.WebGLRenderingContext.prototype.getExtension) {
    const originalGetExtension = WebGLRenderingContext.prototype.getExtension;
    WebGLRenderingContext.prototype.getExtension = function(name) {
      if (name === 'WEBGL_debug_renderer_info') {
        reportFingerprinting('webgl.debug_renderer_info', 'Acesso à extensão WEBGL_debug_renderer_info - fingerprinting detectado');
      }
      return originalGetExtension.apply(this, arguments);
    };
  }
  
  // ========== AUDIO CONTEXT FINGERPRINTING ==========
  
  // AudioContext.prototype.createOscillator
  if (window.AudioContext && window.AudioContext.prototype.createOscillator) {
    const originalCreateOscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function(...args) {
      reportFingerprinting('audio.createOscillator', 'AudioContext createOscillator chamado - possível audio fingerprinting');
      return originalCreateOscillator.apply(this, args);
    };
  }
  
  // AudioContext.prototype.createDynamicsCompressor
  if (window.AudioContext && window.AudioContext.prototype.createDynamicsCompressor) {
    const originalCreateCompressor = AudioContext.prototype.createDynamicsCompressor;
    AudioContext.prototype.createDynamicsCompressor = function(...args) {
      reportFingerprinting('audio.createDynamicsCompressor', 'AudioContext createDynamicsCompressor chamado - possível audio fingerprinting');
      return originalCreateCompressor.apply(this, args);
    };
  }
  
  // OfflineAudioContext constructor
  if (window.OfflineAudioContext) {
    const OriginalOfflineAudioContext = window.OfflineAudioContext;
    window.OfflineAudioContext = function(...args) {
      reportFingerprinting('audio.OfflineAudioContext', 'OfflineAudioContext criado - possível audio fingerprinting');
      return new OriginalOfflineAudioContext(...args);
    };
    // Preservar prototype
    window.OfflineAudioContext.prototype = OriginalOfflineAudioContext.prototype;
  }
  
  // ========== DETECÇÃO DE EVAL E DOCUMENT.WRITE ==========
  
  // window.eval
  if (window.eval) {
    const originalEval = window.eval;
    window.eval = function(code) {
      try {
        const codeStr = String(code);
        // Verifica se é código suspeito (longo ou ofuscado)
        if (codeStr.length > 500 || 
            /atob\s*\(/.test(codeStr) || 
            /fromCharCode\s*\(/.test(codeStr) || 
            /escape\s*\(/.test(codeStr)) {
          
          const preview = codeStr.substring(0, 100) + (codeStr.length > 100 ? '...' : '');
          reportHijacking('obfuscated_eval', `Código eval suspeito detectado: ${preview}`);
        }
      } catch (e) {
        // Ignora erros de conversão
      }
      return originalEval.apply(this, arguments);
    };
  }
  
  // document.write
  if (window.document && window.document.write) {
    const originalWrite = document.write;
    document.write = function(markup) {
      try {
        const markupStr = String(markup);
        if (markupStr.length > 500 || 
            /atob\s*\(/.test(markupStr) || 
            /fromCharCode\s*\(/.test(markupStr) || 
            /escape\s*\(/.test(markupStr)) {
          
          const preview = markupStr.substring(0, 100) + (markupStr.length > 100 ? '...' : '');
          reportHijacking('obfuscated_write', `document.write suspeito detectado: ${preview}`);
        }
      } catch (e) {
        // Ignora erros de conversão
      }
      return originalWrite.apply(this, arguments);
    };
  }
  
  // ========== DETECÇÃO ADICIONAL DE FINGERPRINTING ==========
  
  // Navigator properties suspeitas
  const suspiciousNavigatorProps = [
    'userAgent', 'platform', 'languages', 'hardwareConcurrency', 
    'deviceMemory', 'maxTouchPoints', 'cookieEnabled'
  ];
  
  // Screen properties
  const suspiciousScreenProps = [
    'width', 'height', 'colorDepth', 'pixelDepth', 'availWidth', 'availHeight'
  ];
  
  // Contador de acessos para detectar fingerprinting
  const accessCounts = {};
  
  function trackPropertyAccess(obj, prop, category) {
    if (obj && typeof obj[prop] !== 'undefined') {
      const key = `${category}.${prop}`;
      accessCounts[key] = (accessCounts[key] || 0) + 1;
      
      // Se múltiplas propriedades são acessadas rapidamente, pode ser fingerprinting
      if (accessCounts[key] === 1) {
        const totalAccesses = Object.values(accessCounts).reduce((a, b) => a + b, 0);
        if (totalAccesses >= 3) {
          reportFingerprinting(`${category}_enumeration`, `Múltiplas propriedades ${category} acessadas - possível fingerprinting`);
        }
      }
    }
  }
  
  // Intercepta acessos ao navigator
  suspiciousNavigatorProps.forEach(prop => {
    if (navigator && prop in navigator) {
      let value = navigator[prop];
      Object.defineProperty(navigator, prop, {
        get: function() {
          trackPropertyAccess(navigator, prop, 'navigator');
          return value;
        },
        configurable: true
      });
    }
  });
  
  // Intercepta acessos ao screen
  suspiciousScreenProps.forEach(prop => {
    if (screen && prop in screen) {
      let value = screen[prop];
      Object.defineProperty(screen, prop, {
        get: function() {
          trackPropertyAccess(screen, prop, 'screen');
          return value;
        },
        configurable: true
      });
    }
  });
  
  console.log('Privacy Guard injected script carregado');
})();