# Privacy Guard - Extensão de Proteção à Privacidade

![Privacy Guard Logo](icons/icon.svg)

Privacy Guard é uma extensão WebExtension para Firefox que detecta ameaças à privacidade e rastreamento durante a navegação web. A extensão monitora conexões de terceira parte, cookies, técnicas de fingerprinting, uso de Web Storage e scripts suspeitos, fornecendo um score de privacidade em tempo real.

## 🚀 Funcionalidades

### Detecção Abrangente de Ameaças
- **Conexões de Terceira Parte**: Monitora todas as requisições para domínios externos
- **Cookies**: Classifica cookies por origem, persistência e detecta supercookies
- **Fingerprinting**: Intercepta APIs de Canvas, WebGL, AudioContext e propriedades do navegador
- **Web Storage**: Analisa localStorage, sessionStorage e IndexedDB
- **Scripts Suspeitos**: Detecta códigos ofuscados e domínios conhecidos de tracking

### Interface Moderna e Intuitiva
- **Design Dark Mode**: Interface elegante com paleta de cores escuras
- **Score de Privacidade**: Pontuação visual de 0-100 com classificação por cores
- **Cards de Resumo**: Visão rápida das principais métricas
- **Detalhes Expandíveis**: Análise detalhada de cada categoria de ameaça

### Monitoramento em Tempo Real
- **Análise Contínua**: Detecção automática durante a navegação
- **Dados por Aba**: Informações isoladas para cada página visitada
- **Atualizações Dinâmicas**: Interface atualizada conforme novas ameaças são detectadas

## 📊 Metodologia do Privacy Score

O Privacy Guard calcula um score de 0-100 baseado em 5 fatores ponderados:

| Fator | Peso | Critérios de Pontuação |
|-------|------|----------------------|
| **Terceiras Partes** | 30% | 0 domínios = 100pts, 1-3 = 75pts, 4-10 = 50pts, 11-20 = 25pts, 20+ = 0pts |
| **Fingerprinting** | 25% | 0 técnicas = 100pts, 1 = 60pts, 2 = 30pts, 3+ = 0pts |
| **Cookies 3ª Parte** | 20% | 0 cookies = 100pts, 1-3 = 70pts, 4-10 = 40pts, 10+ = 0pts |
| **Web Storage** | 15% | 0 chaves = 100pts, 1-5 = 80pts, 6-20 = 50pts, 20+ = 20pts |
| **Scripts Suspeitos** | 10% | Nenhum = 100pts, 1+ detectado = 0pts |

### Classificação Final
- 🟢 **80-100 pontos**: Seguro
- 🟡 **50-79 pontos**: Moderado  
- 🔴 **0-49 pontos**: Perigoso

### Justificativa da Metodologia

O peso maior foi atribuído às **terceiras partes** (30%) pois representa o vetor 
mais amplo de rastreamento. O **fingerprinting** recebe o segundo maior peso (25%) 
por ser a técnica mais invasiva e difícil de bloquear, operando mesmo após limpeza 
de cookies. Os **cookies de terceira parte** (20%) ainda são relevantes apesar da 
depreciação em alguns navegadores. O **Web Storage** (15%) indica acúmulo de dados 
locais. Os **scripts suspeitos** (10%) têm peso menor pois são um indicador indireto.

## 🔧 Instalação no Firefox

### Método 1: Instalação para Desenvolvimento
1. Abra o Firefox e digite `about:debugging` na barra de endereços
2. Clique em "Este Firefox" na barra lateral esquerda
3. Clique em "Carregar extensão temporária..."
4. Navegue até a pasta `privacy-extension` e selecione o arquivo `manifest.json`
5. A extensão será instalada e aparecerá na barra de ferramentas

### Método 2: Empacotamento (Opcional)
```bash
# Na pasta privacy-extension/
zip -r privacy-guard.xpi *
```
Depois instale o arquivo .xpi através de `about:addons` > "Instalar extensão a partir de arquivo"

## 🎯 Como Usar

1. **Navegue normalmente**: A extensão monitora automaticamente todas as páginas
2. **Clique no ícone**: Abra o popup para ver o relatório de privacidade
3. **Analise o score**: Número grande mostra o nível de segurança da página
4. **Explore os detalhes**: Clique nos cards ou seções para ver informações específicas
5. **Atualize dados**: Use o botão "Atualizar" para nova análise

### Recursos da Interface
- **Cards Clicáveis**: Toque nos cards de resumo para expandir detalhes
- **Acordeões**: Clique nos headers das seções para mostrar/ocultar conteúdo
- **Scroll Suave**: Interface otimizada para navegação em espaço limitado
- **Indicadores Visuais**: Cores e ícones indicam o nível de risco

## 🏗️ Estrutura do Código

```
privacy-extension/
├── manifest.json              # Configuração da extensão (Manifest V2)
├── background/
│   └── background.js          # Script de background - detecção e análise
├── content/
│   ├── content.js            # Content script - injeção e coleta
│   └── injected.js           # Script injetado no MAIN world
├── popup/
│   ├── popup.html            # Interface do usuário
│   ├── popup.js              # Lógica da interface
│   └── popup.css             # Estilos dark mode
├── icons/
│   └── icon.svg              # Ícone da extensão (SVG animado)
└── README.md                 # Esta documentação
```

### Fluxo de Funcionamento

1. **Background Script** (`background.js`):
   - Intercepta requisições web via `webRequest` API
   - Coleta cookies através de headers HTTP
   - Calcula scores de privacidade
   - Armazena dados por aba em memória

2. **Content Script** (`content.js`):
   - Injeta `injected.js` no contexto da página
   - Coleta dados de Web Storage
   - Detecta scripts suspeitos no DOM
   - Monitora tentativas de redirecionamento

3. **Injected Script** (`injected.js`):
   - Intercepta APIs de fingerprinting (Canvas, WebGL, Audio)
   - Monitora acessos suspeitos a propriedades do navegador
   - Detecta códigos ofuscados via `eval` e `document.write`

4. **Popup Interface** (`popup.js`):
   - Solicita dados ao background script
   - Renderiza interface responsiva
   - Gerencia interações do usuário

## 🛠️ Tecnologias Utilizadas

- **WebExtensions API**: APIs nativas do Firefox para extensões
- **JavaScript ES6+**: Código moderno com async/await
- **CSS3**: Estilos modernos com gradientes e animações
- **SVG**: Ícones vetoriais e animações suaves
- **HTML5**: Estrutura semântica e acessível

### APIs Principais Utilizadas
- `browser.webRequest.*` - Interceptação de requisições
- `browser.cookies.*` - Análise de cookies
- `browser.tabs.*` - Informações das abas
- `browser.runtime.*` - Comunicação entre scripts
- `browser.storage.*` - Armazenamento de configurações

## ⚡ Performance e Limitações

### Otimizações Implementadas
- **Armazenamento em Memória**: Dados não persistem no disco
- **Deduplicação**: Evita análise redundante de recursos
- **Lazy Loading**: Interface carregada sob demanda
- **Throttling**: Limita frequência de análises

### Limitações Conhecidas
- **Apenas Monitoramento**: Não bloqueia requisições (modo observação)
- **Manifest V2**: Específico para Firefox (não compatível com Chrome MV3)
- **Dados Temporários**: Informações perdidas ao fechar aba
- **CSP Restrito**: Pode não funcionar em páginas com políticas muito rigorosas

## 🔒 Privacidade e Segurança

### Compromisso com a Privacidade
- ✅ **Nenhum Dado Coletado**: Declaração explícita no manifest
- ✅ **Processamento Local**: Toda análise feita no dispositivo
- ✅ **Sem Conexões Externas**: Não envia dados para servidores
- ✅ **Código Aberto**: Transparência total na implementação

### Permissões Utilizadas
- `webRequest`: Para interceptar requisições HTTP
- `cookies`: Para analisar cookies da página
- `tabs`: Para obter informações da aba ativa
- `storage`: Para configurações futuras (não utilizado atualmente)
- `<all_urls>`: Para monitorar todos os sites

## 🐛 Resolução de Problemas

### Problemas Comuns

**Extensão não aparece na barra:**
- Verifique se foi instalada corretamente em `about:debugging`
- Confirme que todos os arquivos estão na pasta correta

**Score sempre 100:**
- Aguarde alguns segundos para coleta de dados
- Clique em "Atualizar" para nova análise
- Verifique se a página carregou completamente

**Interface não carrega:**
- Recarregue a extensão em `about:debugging`
- Verifique o console do navegador para erros
- Confirme compatibilidade com Firefox atual

### Depuração

Para desenvolvedores:
```javascript
// No console do background script
console.log('Dados da aba:', tabData);

// No console da página
console.log('Privacy Guard ativo:', window.privacy_guard_active);
```

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Diretrizes
- Mantenha compatibilidade com Manifest V2
- Teste em diferentes tipos de páginas
- Documente novas funcionalidades
- Siga os padrões de código existentes

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo `LICENSE` para detalhes.

## 🙋‍♂️ Suporte

Para dúvidas, problemas ou sugestões:
- Abra uma issue no repositório
- Descreva o problema com detalhes
- Inclua versão do Firefox e sistema operacional

---

**Privacy Guard** - Proteção à privacidade inteligente e transparente para sua navegação web.

*Desenvolvido com ❤️ para promover uma internet mais privada e segura.*