<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CategoryFilter from './components/CategoryFilter.vue'
import EmptyState from './components/EmptyState.vue'
import LinkCard from './components/LinkCard.vue'
import RepoCard from './components/RepoCard.vue'
import SearchBar from './components/SearchBar.vue'
import SkeletonCard from './components/SkeletonCard.vue'

const catalogItems = ref([])
const isLoading = ref(true)
const loadError = ref('')
const searchQuery = ref('')
const activeCategory = ref('Todos')
const isDark = ref(false)
const headerHidden = ref(false)
const headerElevated = ref(false)
let lastScrollY = 0
let scrollFrame = null
let loadRequestId = 0

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const catalogOptions = [
  {
    id: 'links',
    index: '01',
    navLabel: 'Links',
    hash: '#/links',
    dataPath: '/links.json',
    dataFile: 'links.json',
    singular: 'link',
    plural: 'links',
    heroTitle: 'Links que merecem ficar por perto.',
    heroDescription:
      'Uma coleção visual de ferramentas, referências e atalhos para criar melhor e encontrar mais rápido.',
    sectionLabel: 'Vitrine de links',
    filterHint: 'Selecione uma tag para cruzar categorias ou use a busca acima.',
    emptyTitle: 'Nenhum link passou por esse filtro.',
    emptyMessage:
      'Tente outro termo, escolha uma categoria diferente ou limpe os filtros para ver o catálogo completo.',
    searchPlaceholder: 'Título, tag, URL...',
    searchAriaLabel: 'Pesquisar links',
    getSearchableFields: (item) => [
      item.title,
      item.description,
      item.url,
      item.category,
      ...(item.tags || []),
    ],
  },
  {
    id: 'repos',
    index: '02',
    navLabel: 'Repos',
    hash: '#/repos',
    dataPath: '/repos.json',
    dataFile: 'repos.json',
    singular: 'repositório',
    plural: 'repositórios',
    heroTitle: 'Repos open source para economizar assinatura.',
    heroDescription:
      'Um catálogo de projetos do GitHub que podem substituir ferramentas pagas, acelerar produtos e manter mais controle técnico.',
    sectionLabel: 'Vitrine de repositórios',
    filterHint: 'Filtre por categoria, tag, solução substituída ou cenário de uso.',
    emptyTitle: 'Nenhum repositório passou por esse filtro.',
    emptyMessage:
      'Tente outro termo, escolha uma categoria diferente ou limpe os filtros para ver o catálogo completo.',
    searchPlaceholder: 'Nome, tag, substitui, uso...',
    searchAriaLabel: 'Pesquisar repositórios',
    getSearchableFields: (item) => [
      item.title,
      item.url,
      item.category,
      item.replaces,
      item.useCase,
      ...(item.tags || []),
    ],
  },
]

const catalogs = Object.fromEntries(catalogOptions.map((catalog) => [catalog.id, catalog]))
const activeCatalogId = ref(getCatalogFromHash())
const activeCatalog = computed(() => catalogs[activeCatalogId.value] || catalogs.links)

const categories = computed(() => {
  const counts = catalogItems.value.reduce((accumulator, item) => {
    const category = item.category || 'Sem categoria'
    accumulator[category] = (accumulator[category] || 0) + 1
    return accumulator
  }, {})

  return [
    { name: 'Todos', count: catalogItems.value.length },
    ...Object.entries(counts)
      .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
      .map(([name, count]) => ({ name, count })),
  ]
})

const filteredItems = computed(() => {
  const query = normalizeText(searchQuery.value)

  return catalogItems.value.filter((item) => {
    const itemCategory = item.category || 'Sem categoria'
    const matchesCategory =
      activeCategory.value === 'Todos' || itemCategory === activeCategory.value
    const searchableContent = activeCatalog.value
      .getSearchableFields(item)
      .map(normalizeText)
      .join(' ')

    return matchesCategory && (!query || searchableContent.includes(query))
  })
})

const resultLabel = computed(() => {
  const shown = filteredItems.value.length
  const total = catalogItems.value.length
  return `Exibindo ${shown} de ${total} ${resourceLabel(total)}`
})

const hasActiveFilters = computed(
  () => activeCategory.value !== 'Todos' || searchQuery.value.trim().length > 0,
)

function resourceLabel(count) {
  return count === 1 ? activeCatalog.value.singular : activeCatalog.value.plural
}

function getCatalogFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return catalogs?.[hash] ? hash : 'links'
}

function applyTheme(dark) {
  isDark.value = dark
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem('klink-theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(!isDark.value)
}

function selectCatalog(catalogId) {
  const nextCatalog = catalogs[catalogId]
  if (!nextCatalog) return

  if (window.location.hash !== nextCatalog.hash) {
    window.location.hash = nextCatalog.hash
  } else {
    activeCatalogId.value = catalogId
  }
}

function syncCatalogFromHash() {
  activeCatalogId.value = getCatalogFromHash()
}

function selectCategory(category) {
  activeCategory.value = category
}

function selectTag(tag) {
  activeCategory.value = 'Todos'
  searchQuery.value = tag
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function clearFilters() {
  searchQuery.value = ''
  activeCategory.value = 'Todos'
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function reloadPage() {
  window.location.reload()
}

async function loadCatalog() {
  const requestId = ++loadRequestId
  const catalog = activeCatalog.value

  isLoading.value = true
  loadError.value = ''
  catalogItems.value = []

  try {
    const response = await fetch(catalog.dataPath)
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o catálogo (${response.status}).`)
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error(`O arquivo ${catalog.dataFile} precisa conter uma lista.`)
    }

    if (requestId === loadRequestId) catalogItems.value = data
  } catch (error) {
    if (requestId === loadRequestId) {
      loadError.value =
        error instanceof Error ? error.message : 'Erro inesperado ao carregar o catálogo.'
    }
  } finally {
    if (requestId === loadRequestId) isLoading.value = false
  }
}

function updateHeaderVisibility() {
  const currentScrollY = Math.max(window.scrollY, 0)
  const delta = currentScrollY - lastScrollY

  headerElevated.value = currentScrollY > 12

  if (currentScrollY < 96) {
    headerHidden.value = false
  } else if (delta > 7) {
    headerHidden.value = true
  } else if (delta < -7) {
    headerHidden.value = false
  }

  lastScrollY = currentScrollY
  scrollFrame = null
}

function handleScroll() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(updateHeaderVisibility)
}

watch(
  activeCatalogId,
  () => {
    clearFilters()
    loadCatalog()
  },
  { immediate: true },
)

onMounted(() => {
  const savedTheme = localStorage.getItem('klink-theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark)
  lastScrollY = window.scrollY
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('hashchange', syncCatalogFromHash)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('hashchange', syncCatalogFromHash)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <div
        class="topbar"
        :class="{
          'is-hidden': headerHidden,
          'is-elevated': headerElevated,
        }"
        @focusin="headerHidden = false"
      >
        <a
          class="brand"
          :href="activeCatalog.hash"
          aria-label="Voltar ao topo"
          @click.prevent="scrollToTop"
        >
          <span class="brand__mark" aria-hidden="true">KH</span>
          <span class="brand__copy">
            <strong>Klink Hub</strong>
            <span>Por Kaiki Hirata / 2026</span>
          </span>
        </a>

        <nav class="catalog-switcher catalog-switcher--topbar" aria-label="Páginas do Klink Hub">
          <a
            v-for="catalog in catalogOptions"
            :key="catalog.id"
            :href="catalog.hash"
            :class="{ active: activeCatalogId === catalog.id }"
            @click.prevent="selectCatalog(catalog.id)"
          >
            <span>{{ catalog.navLabel }}</span>
            <strong>{{ catalog.index }}</strong>
          </a>
        </nav>

        <div class="topbar__status">
          <a
            class="portfolio-link"
            href="https://kaikihirata.dev"
            target="_blank"
            rel="author noopener noreferrer"
            aria-label="Abrir portfólio de Kaiki Hirata em uma nova aba"
          >
            <span>Meu portfólio</span>
            <b aria-hidden="true">↗</b>
          </a>
          <button
            class="icon-button"
            type="button"
            :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
            :title="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
            @click="toggleTheme"
          >
            <svg v-if="isDark" aria-hidden="true" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <svg v-else aria-hidden="true" viewBox="0 0 24 24">
              <path d="M20.4 15.5A8.5 8.5 0 0 1 8.5 3.6 8.5 8.5 0 1 0 20.4 15.5Z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="hero">
        <div class="hero__intro">
          <p class="technical-label">{{ activeCatalog.index }} / {{ activeCatalog.navLabel }}</p>
          <h1>{{ activeCatalog.heroTitle }}</h1>
          <p class="hero__description">
            {{ activeCatalog.heroDescription }}
          </p>
        </div>

        <div class="hero__tools">
          <nav class="catalog-switcher catalog-switcher--hero" aria-label="Páginas do Klink Hub">
            <a
              v-for="catalog in catalogOptions"
              :key="catalog.id"
              :href="catalog.hash"
              :class="{ active: activeCatalogId === catalog.id }"
              @click.prevent="selectCatalog(catalog.id)"
            >
              <span>{{ catalog.navLabel }}</span>
              <strong>{{ catalog.index }}</strong>
            </a>
          </nav>

          <SearchBar
            v-model="searchQuery"
            :placeholder="activeCatalog.searchPlaceholder"
            :aria-label-text="activeCatalog.searchAriaLabel"
          />
          <div class="catalog-meta">
            <span class="catalog-meta__label">Índice atual</span>
            <strong>{{ resultLabel }}</strong>
          </div>
        </div>
      </div>

      <CategoryFilter
        :categories="categories"
        :active-category="activeCategory"
        @select="selectCategory"
      />
    </header>

    <main class="catalog">
      <div class="catalog__heading">
        <div>
          <p class="technical-label">{{ activeCatalog.index }} / {{ activeCatalog.sectionLabel }}</p>
          <h2>{{ activeCategory }}</h2>
        </div>
        <div class="catalog__heading-actions">
          <p>{{ activeCatalog.filterHint }}</p>
          <button
            v-if="hasActiveFilters"
            class="clear-filters"
            type="button"
            @click="clearFilters"
          >
            Limpar filtros
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="links-grid" aria-label="Carregando catálogo">
        <SkeletonCard v-for="index in 8" :key="index" />
      </div>

      <EmptyState
        v-else-if="loadError"
        eyebrow="Falha de leitura"
        title="O catálogo não abriu."
        :message="loadError"
        action-label="Tentar novamente"
        @clear="reloadPage"
      />

      <div v-else-if="filteredItems.length" class="links-grid">
        <template v-if="activeCatalogId === 'links'">
          <LinkCard
            v-for="(item, index) in filteredItems"
            :key="item.url"
            :link="item"
            :index="index"
            @select-tag="selectTag"
          />
        </template>
        <template v-else>
          <RepoCard
            v-for="(item, index) in filteredItems"
            :key="item.url"
            :repository="item"
            :index="index"
            @select-tag="selectTag"
          />
        </template>
      </div>

      <EmptyState
        v-else
        eyebrow="Busca sem correspondência"
        :title="activeCatalog.emptyTitle"
        :message="activeCatalog.emptyMessage"
        action-label="Limpar filtros"
        @clear="clearFilters"
      />
    </main>

    <footer class="site-footer">
      <span>Klink Hub © {{ new Date().getFullYear() }}</span>
      <span>{{ catalogItems.length }} {{ resourceLabel(catalogItems.length) }} catalogados</span>
      <a :href="activeCatalog.hash" aria-label="Voltar ao topo" @click.prevent="scrollToTop">
        Topo ↑
      </a>
    </footer>
  </div>
</template>
