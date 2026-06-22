<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  activeCategory: {
    type: String,
    default: 'Todos',
  },
})

const emit = defineEmits(['select'])
const strip = ref(null)
const canScroll = ref(false)
const canScrollBack = ref(false)
const canScrollForward = ref(false)
let resizeObserver

function updateScrollState() {
  const element = strip.value
  if (!element) return

  const maxScroll = element.scrollWidth - element.clientWidth
  canScroll.value = maxScroll > 2
  canScrollBack.value = element.scrollLeft > 2
  canScrollForward.value = element.scrollLeft < maxScroll - 2
}

function scrollCategories(direction) {
  const element = strip.value
  if (!element) return

  element.scrollBy({
    left: direction * Math.max(element.clientWidth * 0.72, 260),
    behavior: 'smooth',
  })
}

function handleWheel(event) {
  const element = strip.value
  if (!element || !canScroll.value) return

  const movement =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY

  if (
    (movement < 0 && !canScrollBack.value) ||
    (movement > 0 && !canScrollForward.value)
  ) {
    return
  }

  event.preventDefault()
  element.scrollLeft += movement
}

function selectCategory(category, event) {
  emit('select', category.name)
  event.currentTarget.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  })
}

onMounted(() => {
  resizeObserver = new ResizeObserver(updateScrollState)
  if (strip.value) resizeObserver.observe(strip.value)
  nextTick(updateScrollState)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(
  () => props.categories,
  () => nextTick(updateScrollState),
  { deep: true },
)
</script>

<template>
  <nav class="category-strip" aria-label="Categorias do catálogo">
    <div
      class="category-strip__viewport"
      :class="{ 'has-overflow': canScroll }"
    >
      <button
        v-show="canScroll"
        class="category-strip__control category-strip__control--back"
        type="button"
        :disabled="!canScrollBack"
        aria-label="Ver categorias anteriores"
        @click="scrollCategories(-1)"
      >
        ←
      </button>

      <div
        ref="strip"
        class="category-strip__inner"
        tabindex="0"
        aria-label="Lista horizontal de categorias"
        @scroll="updateScrollState"
        @wheel="handleWheel"
      >
        <button
          v-for="(category, index) in categories"
          :key="category.name"
          class="category-strip__item"
          type="button"
          :class="{ active: activeCategory === category.name }"
          :aria-pressed="activeCategory === category.name"
          @click="selectCategory(category, $event)"
        >
          <span class="category-strip__index">{{ String(index).padStart(2, '0') }}</span>
          <span>{{ category.name }}</span>
          <strong>{{ String(category.count).padStart(2, '0') }}</strong>
        </button>
      </div>

      <button
        v-show="canScroll"
        class="category-strip__control category-strip__control--forward"
        type="button"
        :disabled="!canScrollForward"
        aria-label="Ver próximas categorias"
        @click="scrollCategories(1)"
      >
        →
      </button>
    </div>
  </nav>
</template>

<style scoped>
.category-strip {
  overflow: hidden;
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--paper) 96%, transparent);
}

.category-strip__viewport {
  display: grid;
  max-width: 1440px;
  margin: 0 auto;
  border-inline: 1px solid var(--line);
  grid-template-columns: minmax(0, 1fr);
}

.category-strip__viewport.has-overflow {
  grid-template-columns: 48px minmax(0, 1fr) 48px;
}

.category-strip__inner {
  display: flex;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-behavior: smooth;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.category-strip__inner::-webkit-scrollbar {
  display: none;
}

.category-strip__item {
  display: inline-flex;
  min-height: 58px;
  flex: 0 0 auto;
  cursor: pointer;
  align-items: center;
  gap: 0.55rem;
  border: 0;
  border-right: 1px solid var(--line);
  border-radius: 0;
  background: transparent;
  padding: 0 1rem;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.61rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  scroll-snap-align: center;
  text-transform: uppercase;
  transition: background 200ms ease, color 200ms ease;
}

.category-strip__item:hover {
  background: var(--paper-raised);
  color: var(--ink);
}

.category-strip__item.active {
  background: var(--accent);
  color: white;
}

.category-strip__index {
  color: var(--accent);
}

.category-strip__item.active .category-strip__index {
  color: rgba(255, 255, 255, 0.72);
}

.category-strip__item strong {
  display: grid;
  min-width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid var(--line);
  background: var(--paper-raised);
  color: var(--ink);
  font-size: 0.55rem;
}

.category-strip__item.active strong {
  border-color: rgba(255, 255, 255, 0.45);
  background: transparent;
  color: white;
}

.category-strip__control {
  position: relative;
  z-index: 2;
  display: grid;
  min-width: 0;
  cursor: pointer;
  place-items: center;
  border: 0;
  border-radius: 0;
  background: var(--paper-raised);
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  transition:
    background 180ms ease,
    color 180ms ease,
    opacity 180ms ease;
}

.category-strip__control--back {
  border-right: 1px solid var(--line);
}

.category-strip__control--forward {
  border-left: 1px solid var(--line);
}

.category-strip__control:hover:not(:disabled) {
  background: var(--ink);
  color: var(--paper);
}

.category-strip__control:disabled {
  cursor: default;
  color: var(--muted);
  opacity: 0.3;
}

@media (hover: none) and (pointer: coarse), (max-width: 620px) {
  .category-strip__viewport.has-overflow {
    grid-template-columns: minmax(0, 1fr);
  }

  .category-strip__control {
    display: none;
  }
}
</style>
