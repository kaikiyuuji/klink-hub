<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  link: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
})

defineEmits(['select-tag'])

const previewLoaded = ref(false)
const previewFailed = ref(false)
const descriptionOpen = ref(false)
const descriptionHoverOpen = ref(false)
let descriptionTimer = null

const domain = computed(() => {
  try {
    return new URL(props.link.url).hostname.replace(/^www\./, '')
  } catch {
    return props.link.url
  }
})

const faviconUrl = computed(
  () => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain.value)}&sz=64`,
)

function onPreviewLoad() {
  previewLoaded.value = true
}

function onPreviewError() {
  previewFailed.value = true
}

function toggleDescription() {
  descriptionOpen.value = !descriptionOpen.value
}

function closeDescription() {
  descriptionOpen.value = false
}

function scheduleDescription() {
  window.clearTimeout(descriptionTimer)
  descriptionTimer = window.setTimeout(() => {
    descriptionHoverOpen.value = true
  }, 650)
}

function cancelDescription() {
  window.clearTimeout(descriptionTimer)
  descriptionHoverOpen.value = false
}

onBeforeUnmount(() => {
  window.clearTimeout(descriptionTimer)
})
</script>

<template>
  <article
    class="link-card"
    :class="{ 'description-is-open': descriptionOpen || descriptionHoverOpen }"
  >
    <a
      class="preview"
      :href="link.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`Abrir ${link.title} em uma nova aba`"
    >
      <div class="browser-bar" aria-hidden="true">
        <span class="browser-dots"><i></i><i></i><i></i></span>
        <span class="browser-domain">{{ domain }}</span>
        <span class="browser-arrow">↗</span>
      </div>

      <div class="preview__viewport">
        <div
          v-if="link.preview && !previewLoaded && !previewFailed"
          class="preview__skeleton"
        >
          <span></span>
        </div>
        <img
          v-if="link.preview && !previewFailed"
          :src="link.preview"
          :alt="`Preview do site ${link.title}`"
          loading="lazy"
          @load="onPreviewLoad"
          @error="onPreviewError"
        />
        <div v-if="!link.preview || previewFailed" class="preview__fallback">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="0" />
            <path d="m7 15 3-3 2.5 2.5L15 12l3 3M8 8.5h.01" />
          </svg>
          <span v-if="link.previewStatus === 'unavailable'">
            Não foi possível carregar o preview
          </span>
          <span v-else>Preview local ainda não gerado</span>
        </div>
        <span class="figure-label">Fig. {{ String(index + 1).padStart(2, '0') }}</span>
      </div>
    </a>

    <div class="link-card__body">
      <div class="link-card__identity">
        <img :src="faviconUrl" :alt="`Favicon de ${link.title}`" width="32" height="32" />
        <div>
          <p>{{ link.category }}</p>
          <span>{{ domain }}</span>
        </div>
      </div>

      <a class="link-card__title" :href="link.url" target="_blank" rel="noopener noreferrer">
        <h3>{{ link.title }}</h3>
        <span aria-hidden="true">↗</span>
      </a>

      <div
        class="description-shell"
        :class="{ 'is-open': descriptionOpen || descriptionHoverOpen }"
        tabindex="0"
        @mouseenter="scheduleDescription"
        @mouseleave="cancelDescription"
        @keydown.esc="closeDescription"
      >
        <p class="link-card__description">{{ link.description }}</p>
        <button
          class="description-toggle"
          type="button"
          :aria-expanded="descriptionOpen"
          @click="toggleDescription"
        >
          {{ descriptionOpen ? 'Fechar descrição' : 'Ler descrição completa' }}
          <span aria-hidden="true">{{ descriptionOpen ? '×' : '+' }}</span>
        </button>

        <div class="description-popover" role="tooltip">
          <div class="description-popover__header">
            <span>Descrição completa</span>
            <button
              type="button"
              aria-label="Fechar descrição"
              @click="closeDescription"
            >
              ×
            </button>
          </div>
          <p>{{ link.description }}</p>
        </div>
      </div>

      <div class="tags" aria-label="Tags">
        <button
          v-for="tag in link.tags"
          :key="tag"
          type="button"
          @click="$emit('select-tag', tag)"
        >
          <span aria-hidden="true">■</span>
          {{ tag }}
        </button>
      </div>

      <a class="link-card__action" :href="link.url" target="_blank" rel="noopener noreferrer">
        Abrir recurso
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  </article>
</template>

<style scoped>
.link-card {
  display: flex;
  min-width: 0;
  height: 100%;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 2px;
  background: var(--paper-raised);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--ink) 7%, transparent);
  transition:
    border-color 300ms ease,
    box-shadow 300ms ease,
    transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.link-card:hover {
  z-index: 2;
  border-color: var(--accent);
  box-shadow: 8px 8px 0 color-mix(in srgb, var(--accent) 88%, transparent);
  transform: translate(-4px, -4px);
}

.preview {
  display: block;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}

.browser-bar {
  display: grid;
  height: 34px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  background: var(--paper-raised);
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 0 0.65rem;
}

.browser-dots {
  display: flex;
  gap: 4px;
}

.browser-dots i {
  width: 5px;
  height: 5px;
  border: 1px solid var(--line-strong);
  background: transparent;
}

.browser-dots i:first-child {
  background: var(--accent);
  border-color: var(--accent);
}

.browser-domain {
  overflow: hidden;
  padding-inline: 0.6rem;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.5rem;
  letter-spacing: 0.05em;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.browser-arrow {
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
}

.preview__viewport {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
}

.preview__viewport::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image: radial-gradient(circle, var(--paper) 0.55px, transparent 0.65px);
  background-size: 4px 4px;
  mix-blend-mode: screen;
  opacity: 0.2;
}

.preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  filter: var(--preview-filter);
  transition: filter 500ms ease, transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.link-card:hover .preview img {
  filter: saturate(1) contrast(1.02);
  transform: scale(1.025);
}

.preview__skeleton {
  position: absolute;
  z-index: 2;
  inset: 0;
  overflow: hidden;
  background:
    linear-gradient(var(--skeleton) 0 0) 12% 20% / 54% 10% no-repeat,
    linear-gradient(var(--skeleton) 0 0) 12% 37% / 76% 7% no-repeat,
    linear-gradient(var(--skeleton) 0 0) 12% 50% / 64% 7% no-repeat,
    var(--paper);
}

.preview__skeleton span {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 35%,
    color-mix(in srgb, var(--paper-raised) 76%, transparent) 50%,
    transparent 65%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

.preview__fallback {
  display: grid;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 0.7rem;
  background-color: var(--paper);
  background-image: radial-gradient(circle, var(--line) 1px, transparent 1.1px);
  background-size: 8px 8px;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.55rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.preview__fallback svg {
  width: 42px;
  fill: var(--paper-raised);
  stroke: var(--accent);
  stroke-width: 1.25;
}

.figure-label {
  position: absolute;
  z-index: 3;
  top: 0.55rem;
  left: 0.55rem;
  border: 1px solid var(--ink);
  background: var(--paper-raised);
  padding: 0.27rem 0.38rem;
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}

.link-card__body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.2rem;
}

.link-card__identity {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1.1rem;
}

.link-card__identity img {
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  background: white;
  padding: 5px;
}

.link-card__identity div {
  min-width: 0;
}

.link-card__identity p,
.link-card__identity span {
  overflow: hidden;
  margin: 0;
  font-family: 'IBM Plex Mono', monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-card__identity p {
  color: var(--accent);
  font-size: 0.53rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.link-card__identity span {
  display: block;
  margin-top: 0.28rem;
  color: var(--muted);
  font-size: 0.52rem;
}

.link-card__title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.link-card__title h3 {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.75rem);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1;
  transition: color 220ms ease;
}

.link-card__title > span {
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  transition: transform 220ms ease;
}

.link-card:hover .link-card__title h3 {
  color: var(--accent);
}

.link-card:hover .link-card__title > span {
  transform: translate(2px, -2px);
}

.description-shell {
  position: relative;
  margin-top: 1rem;
  outline: none;
}

.link-card__description {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--muted);
  font-size: 0.8rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.description-toggle {
  display: none;
}

.description-popover {
  position: absolute;
  z-index: 12;
  top: -0.65rem;
  right: -0.65rem;
  left: -0.65rem;
  max-height: min(300px, 55vh);
  overflow-y: auto;
  visibility: hidden;
  border: 1px solid var(--accent);
  background: var(--paper-raised);
  box-shadow: 8px 8px 0 color-mix(in srgb, var(--accent) 84%, transparent);
  opacity: 0;
  padding: 1rem;
  pointer-events: none;
  transform: translateY(5px);
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    visibility 180ms ease;
}

.description-popover__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid var(--line);
  padding-bottom: 0.65rem;
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.description-popover__header button {
  display: none;
  width: 30px;
  height: 30px;
  cursor: pointer;
  border: 1px solid var(--line);
  border-radius: 0;
  background: var(--paper);
  color: var(--ink);
  font-size: 1rem;
}

.description-popover p {
  margin: 0;
  color: var(--ink);
  font-size: 0.82rem;
  line-height: 1.72;
}

.description-shell:focus .description-popover,
.description-shell:focus-within .description-popover,
.description-shell.is-open .description-popover {
  visibility: visible;
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.link-card:has(.description-shell:focus-within),
.link-card.description-is-open {
  z-index: 20;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  margin-top: 1.2rem;
}

.tags button {
  display: inline-flex;
  min-height: 26px;
  cursor: pointer;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--line);
  border-radius: 0;
  background: var(--paper);
  padding: 0.3rem 0.45rem;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.48rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
}

.tags button span {
  color: var(--accent);
  font-size: 0.38rem;
}

.tags button:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 7%, var(--paper));
  color: var(--ink);
}

.link-card__action {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  border-top: 1px solid var(--line);
  padding-top: 1rem;
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.link-card__action span {
  color: var(--accent);
  font-size: 0.9rem;
  transition: transform 220ms ease;
}

.link-card__action:hover span {
  transform: translate(3px, -3px);
}

@keyframes shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

@media (hover: none) and (pointer: coarse), (max-width: 620px) {
  .description-shell {
    padding-bottom: 0.15rem;
  }

  .description-toggle {
    display: flex;
    min-height: 36px;
    width: 100%;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.65rem;
    border: 1px solid var(--line);
    border-radius: 0;
    background: var(--paper);
    padding: 0.45rem 0.6rem;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.53rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .description-toggle span {
    color: var(--accent);
    font-size: 0.9rem;
  }

  .description-popover {
    top: -0.5rem;
    right: -0.35rem;
    left: -0.35rem;
    max-height: min(360px, 62vh);
    box-shadow: 6px 6px 0 var(--accent);
  }

  .description-popover__header button {
    display: grid;
    place-items: center;
  }

  .description-shell:focus:not(.is-open) .description-popover,
  .description-shell:focus-within:not(.is-open) .description-popover {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
    transform: translateY(5px);
  }
}
</style>
