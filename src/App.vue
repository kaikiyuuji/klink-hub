<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import CategoryFilter from './components/CategoryFilter.vue'
import EmptyState from './components/EmptyState.vue'
import LinkCard from './components/LinkCard.vue'
import SearchBar from './components/SearchBar.vue'
import SkeletonCard from './components/SkeletonCard.vue'

const links = ref([])
const isLoading = ref(true)
const loadError = ref('')
const searchQuery = ref('')
const activeCategory = ref('Todos')
const isDark = ref(false)
const headerHidden = ref(false)
const headerElevated = ref(false)
let lastScrollY = 0
let scrollFrame = null

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const categories = computed(() => {
  const counts = links.value.reduce((accumulator, link) => {
    accumulator[link.category] = (accumulator[link.category] || 0) + 1
    return accumulator
  }, {})

  return [
    { name: 'Todos', count: links.value.length },
    ...Object.entries(counts)
      .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
      .map(([name, count]) => ({ name, count })),
  ]
})

const filteredLinks = computed(() => {
  const query = normalizeText(searchQuery.value)

  return links.value.filter((link) => {
    const matchesCategory =
      activeCategory.value === 'Todos' || link.category === activeCategory.value
    const searchableContent = [
      link.title,
      link.description,
      link.url,
      link.category,
      ...(link.tags || []),
    ]
      .map(normalizeText)
      .join(' ')

    return matchesCategory && (!query || searchableContent.includes(query))
  })
})

const resultLabel = computed(() => {
  const shown = filteredLinks.value.length
  const total = links.value.length
  return `Exibindo ${shown} de ${total} ${total === 1 ? 'link' : 'links'}`
})

function applyTheme(dark) {
  isDark.value = dark
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  localStorage.setItem('klink-theme', dark ? 'dark' : 'light')
}

function toggleTheme() {
  applyTheme(!isDark.value)
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

function reloadPage() {
  window.location.reload()
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

onMounted(async () => {
  const savedTheme = localStorage.getItem('klink-theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark)
  lastScrollY = window.scrollY
  window.addEventListener('scroll', handleScroll, { passive: true })

  try {
    const response = await fetch('/links.json')
    if (!response.ok) {
      throw new Error(`Não foi possível carregar o catálogo (${response.status}).`)
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('O arquivo links.json precisa conter uma lista de links.')
    }

    links.value = data
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Erro inesperado ao carregar os links.'
  } finally {
    isLoading.value = false
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
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
        <a class="brand" href="#" aria-label="Voltar ao topo">
          <span class="brand__mark" aria-hidden="true">KH</span>
          <span class="brand__copy">
            <strong>Klink Hub</strong>
            <span>Catálogo digital / 2026</span>
          </span>
        </a>

        <div class="topbar__status">
          <span class="system-status">
            <span class="system-status__dot" aria-hidden="true"></span>
            Base online
          </span>
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
          <p class="technical-label">01 / Home</p>
          <h1>Links que merecem ficar por perto.</h1>
          <p class="hero__description">
            Uma coleção visual de ferramentas, referências e atalhos para criar melhor
            e encontrar mais rápido.
          </p>
        </div>

        <div class="hero__tools">
          <SearchBar v-model="searchQuery" />
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
          <p class="technical-label">02 / Vitrine de links</p>
          <h2>{{ activeCategory }}</h2>
        </div>
        <p>Selecione uma tag para cruzar categorias ou use a busca acima.</p>
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

      <div v-else-if="filteredLinks.length" class="links-grid">
        <LinkCard
          v-for="(link, index) in filteredLinks"
          :key="link.url"
          :link="link"
          :index="index"
          @select-tag="selectTag"
        />
      </div>

      <EmptyState
        v-else
        eyebrow="Busca sem correspondência"
        title="Nenhum link passou por esse filtro."
        message="Tente outro termo, escolha uma categoria diferente ou limpe os filtros para ver o catálogo completo."
        action-label="Limpar filtros"
        @clear="clearFilters"
      />
    </main>

    <footer class="site-footer">
      <span>Klink Hub © {{ new Date().getFullYear() }}</span>
      <span>{{ links.length }} referências catalogadas</span>
      <a href="#" aria-label="Voltar ao topo">Topo ↑</a>
    </footer>
  </div>
</template>
