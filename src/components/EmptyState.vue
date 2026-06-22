<script setup>
defineProps({
  eyebrow: {
    type: String,
    default: 'Sem resultados',
  },
  title: {
    type: String,
    default: 'Nada encontrado.',
  },
  message: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: 'Limpar filtros',
  },
})

defineEmits(['clear'])
</script>

<template>
  <section class="empty-state">
    <div class="empty-state__graphic" aria-hidden="true">
      <span>0/0</span>
      <svg viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m20 20-4.2-4.2M8.5 11h5" />
      </svg>
    </div>
    <div class="empty-state__copy">
      <p>{{ eyebrow }}</p>
      <h3>{{ title }}</h3>
      <span>{{ message }}</span>
      <button type="button" @click="$emit('clear')">
        {{ actionLabel }}
        <b aria-hidden="true">↺</b>
      </button>
    </div>
  </section>
</template>

<style scoped>
.empty-state {
  display: grid;
  min-height: 360px;
  overflow: hidden;
  border: 1px solid var(--ink);
  background: var(--paper-raised);
  grid-template-columns: minmax(220px, 0.65fr) 1fr;
}

.empty-state__graphic {
  position: relative;
  display: grid;
  place-items: center;
  border-right: 1px solid var(--ink);
  background-color: var(--accent);
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px);
  background-size: 16px 16px;
  color: white;
}

.empty-state__graphic span {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
}

.empty-state__graphic svg {
  width: 82px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1;
}

.empty-state__copy {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  flex-direction: column;
  padding: clamp(2rem, 6vw, 5rem);
}

.empty-state__copy p {
  margin: 0;
  color: var(--accent);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.empty-state__copy h3 {
  max-width: 650px;
  margin: 1rem 0 0;
  font-size: clamp(2rem, 5vw, 4.5rem);
  font-weight: 500;
  letter-spacing: -0.06em;
  line-height: 0.95;
}

.empty-state__copy > span {
  max-width: 560px;
  margin-top: 1.3rem;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.7;
}

button {
  display: inline-flex;
  min-height: 46px;
  cursor: pointer;
  align-items: center;
  gap: 1.8rem;
  margin-top: 1.7rem;
  border: 1px solid var(--ink);
  border-radius: 0;
  background: var(--ink);
  padding: 0 1rem;
  color: var(--paper);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  transition: box-shadow 220ms ease, transform 220ms ease;
}

button:hover {
  box-shadow: 5px 5px 0 var(--accent);
  transform: translate(-3px, -3px);
}

button b {
  color: var(--accent);
  font-size: 1rem;
}

@media (max-width: 680px) {
  .empty-state {
    grid-template-columns: 1fr;
  }

  .empty-state__graphic {
    min-height: 190px;
    border-right: 0;
    border-bottom: 1px solid var(--ink);
  }
}
</style>
