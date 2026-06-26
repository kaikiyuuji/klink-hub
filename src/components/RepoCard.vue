<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  repository: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
})

defineEmits(['select-tag'])

const imageFailed = ref(false)

const repoPath = computed(() => {
  try {
    const url = new URL(props.repository.url)
    const [, owner = '', repo = ''] = url.pathname.split('/')
    return owner && repo ? `${owner}/${repo}` : url.hostname.replace(/^www\./, '')
  } catch {
    return props.repository.url
  }
})

const githubImage = computed(() => {
  if (props.repository.image) return props.repository.image
  const path = repoPath.value
  return `https://opengraph.githubassets.com/klink-hub-${encodeURIComponent(path)}/${path}`
})

const categoryLabel = computed(() => props.repository.category || 'Sem categoria')

function onImageError() {
  imageFailed.value = true
}
</script>

<template>
  <article class="repo-card">
    <a
      class="repo-card__media"
      :href="repository.url"
      target="_blank"
      rel="noopener noreferrer"
      :aria-label="`Abrir repositório ${repository.title} em uma nova aba`"
    >
      <div class="repo-card__bar" aria-hidden="true">
        <span class="repo-card__mark">GH</span>
        <span>{{ repoPath }}</span>
        <b>&#8599;</b>
      </div>

      <div class="repo-card__image">
        <img
          v-if="!imageFailed"
          :src="githubImage"
          :alt="`Imagem do repositório ${repository.title}`"
          loading="lazy"
          @error="onImageError"
        />
        <div v-else class="repo-card__fallback">
          <span>{{ repoPath }}</span>
        </div>
      </div>
    </a>

    <div class="repo-card__body">
      <div class="repo-card__identity">
        <span>{{ categoryLabel }}</span>
        <strong>{{ repoPath }}</strong>
      </div>

      <a
        class="repo-card__title"
        :href="repository.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <h3>{{ repository.title }}</h3>
        <span aria-hidden="true">&#8599;</span>
      </a>

      <dl class="repo-card__details">
        <div v-if="repository.replaces">
          <dt>Substitui</dt>
          <dd>{{ repository.replaces }}</dd>
        </div>
        <div v-if="repository.useCase">
          <dt>Quando usar</dt>
          <dd>{{ repository.useCase }}</dd>
        </div>
      </dl>

      <div class="tags" aria-label="Tags">
        <button
          v-for="tag in repository.tags"
          :key="tag"
          type="button"
          @click="$emit('select-tag', tag)"
        >
          <span aria-hidden="true">&#9632;</span>
          {{ tag }}
        </button>
      </div>

      <a
        class="repo-card__action"
        :href="repository.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir repositório
        <span aria-hidden="true">&#8599;</span>
      </a>
    </div>
  </article>
</template>

<style scoped>
.repo-card {
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

.repo-card:hover {
  z-index: 2;
  border-color: var(--accent);
  box-shadow: 8px 8px 0 color-mix(in srgb, var(--accent) 88%, transparent);
  transform: translate(-4px, -4px);
}

.repo-card__media {
  display: block;
  overflow: hidden;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}

.repo-card__bar {
  display: grid;
  height: 34px;
  align-items: center;
  border-bottom: 1px solid var(--line);
  background: var(--paper-raised);
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 0 0.65rem;
}

.repo-card__mark {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 1px solid var(--line-strong);
  background: var(--ink);
  color: var(--paper);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.46rem;
  font-weight: 700;
}

.repo-card__bar span:nth-child(2) {
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

.repo-card__bar b {
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  font-weight: 500;
}

.repo-card__image {
  position: relative;
  aspect-ratio: 2 / 1;
  overflow: hidden;
  background: var(--paper);
}

.repo-card__image::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background-image: radial-gradient(circle, var(--paper) 0.55px, transparent 0.65px);
  background-size: 4px 4px;
  mix-blend-mode: screen;
  opacity: 0.2;
}

.repo-card__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: var(--preview-filter);
  transition:
    filter 500ms ease,
    transform 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.repo-card:hover .repo-card__image img {
  filter: saturate(1) contrast(1.02);
  transform: scale(1.025);
}

.repo-card__fallback {
  display: grid;
  height: 100%;
  place-items: center;
  background-color: var(--paper);
  background-image:
    linear-gradient(color-mix(in srgb, var(--accent) 16%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--accent) 16%, transparent) 1px, transparent 1px);
  background-size: 16px 16px;
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
}



.repo-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.2rem;
}

.repo-card__identity {
  display: grid;
  gap: 0.28rem;
  margin-bottom: 1rem;
  font-family: 'IBM Plex Mono', monospace;
}

.repo-card__identity span,
.repo-card__identity strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.repo-card__identity span {
  color: var(--accent);
  font-size: 0.53rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.repo-card__identity strong {
  color: var(--muted);
  font-size: 0.52rem;
  font-weight: 600;
}

.repo-card__title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.repo-card__title h3 {
  margin: 0;
  font-size: clamp(1.35rem, 2vw, 1.75rem);
  font-weight: 600;
  line-height: 1;
  transition: color 220ms ease;
}

.repo-card__title > span {
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  transition: transform 220ms ease;
}

.repo-card:hover .repo-card__title h3 {
  color: var(--accent);
}

.repo-card:hover .repo-card__title > span {
  transform: translate(2px, -2px);
}

.repo-card__details {
  display: grid;
  gap: 0.75rem;
  margin: 1rem 0 0;
}

.repo-card__details div {
  display: grid;
  gap: 0.32rem;
  border-top: 1px solid var(--line);
  padding-top: 0.75rem;
}

.repo-card__details dt {
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.repo-card__details dd {
  margin: 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.55;
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
  transition:
    background 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
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

.repo-card__action {
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

.repo-card__action span {
  color: var(--accent);
  font-size: 0.9rem;
  transition: transform 220ms ease;
}

.repo-card__action:hover span {
  transform: translate(3px, -3px);
}
</style>
