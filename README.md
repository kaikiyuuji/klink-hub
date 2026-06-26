<img width="1280" height="720" alt="Design sem nome" src="https://github.com/user-attachments/assets/1f82e5af-fc1a-44ce-86fa-922172caa812" />
# Klink Hub

Catálogo visual estático de links úteis e repositórios open source, feito com Vue 3 + Vite.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Catálogos

O projeto tem duas páginas frontend, ambas carregadas por JSON público:

- `#/links`: lê `public/links.json` e usa previews locais de sites.
- `#/repos`: lê `public/repos.json` e usa imagens de repositório.

Para adicionar um repositório, inclua um item em `public/repos.json`:

```json
{
  "title": "Cal.com",
  "url": "https://github.com/calcom/cal.com",
  "category": "Agendamento",
  "tags": ["negocio", "servidor"],
  "replaces": "Calendly Teams (~$16/usuário/mês)",
  "useCase": "Qualquer sistema de agendamento de reuniões/consultas."
}
```

Se o campo `image` não for informado, a página monta automaticamente uma imagem
com o OpenGraph do GitHub. Para usar uma arte própria, adicione:

```json
{
  "image": "/repos/cal-com.png"
}
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
