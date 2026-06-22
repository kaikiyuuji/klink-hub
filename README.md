# Klink Hub

Catálogo visual estático de links úteis, feito com Vue 3 + Vite.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Gerar previews locais

O projeto não usa APIs externas de screenshot em produção. As capas são geradas
localmente com o Chrome, salvas em `public/previews` e publicadas junto com o site.

Depois de adicionar novos itens ao `public/links.json`, execute:

```bash
npm run previews
```

O comando:

1. lê o `links.json`;
2. ignora links que já possuem uma imagem local;
3. captura apenas os links novos;
4. valida páginas vazias, Cloudflare e telas de erro conhecidas;
5. salva JPGs em `public/previews`;
6. adiciona automaticamente o campo `"preview"` ao JSON.

Depois, faça o commit do JSON e das imagens. O deploy da Vercel continua totalmente
estático e não precisa executar o gerador.

### Comandos úteis

```bash
# Ver o que está pendente sem capturar
npm run previews -- --dry-run

# Gerar ou testar somente um link
npm run previews -- --only=frameset

# Refazer a imagem de um link
npm run previews -- --only=frameset --force

# Abrir o Chrome visivelmente para login, CAPTCHA ou inspeção manual
npm run previews -- --only=frameset --force --headed --concurrency=1

# Tentar novamente os links marcados como indisponíveis
npm run previews -- --retry-failed

# Verificar se todos os links têm preview local ou status indisponível
npm run previews:check

# Refazer todas as imagens
npm run previews:refresh
```

O script procura Chrome ou Edge automaticamente. Também é possível informar outro
executável:

```powershell
$env:CHROME_PATH = 'C:\caminho\para\chrome.exe'
npm run previews
```

## Ajustes para páginas especiais

Normalmente basta informar `title`, `url`, `description`, `category` e `tags`.
Quando uma página precisa de tratamento especial, adicione `previewConfig`:

```json
{
  "title": "Exemplo",
  "url": "https://example.com/dashboard",
  "previewConfig": {
    "url": "https://example.com",
    "waitMs": 12000,
    "readySelector": "main",
    "scrollY": 0,
    "hide": [".newsletter-popup"],
    "click": ["button.accept-cookies"],
    "filename": "exemplo"
  }
}
```

Opções:

- `url`: URL alternativa usada somente no screenshot.
- `waitMs`: tempo adicional para aplicações lentas.
- `readySelector`: aguarda um elemento antes de capturar.
- `scrollY`: posição vertical da página.
- `hide`: seletores removidos antes da captura.
- `click`: seletores clicados antes da captura.
- `filename`: nome fixo da imagem.
- `skip`: não tentar gerar preview para esse item.

## Build

```bash
npm run previews:check
npm run build
```
