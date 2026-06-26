<script setup>
defineProps({
  placeholder: {
    type: String,
    default: 'Título, tag, URL...',
  },
  ariaLabelText: {
    type: String,
    default: 'Pesquisar links',
  },
})

const model = defineModel({
  type: String,
  default: '',
})

function clearSearch() {
  model.value = ''
}
</script>

<template>
  <label class="search-box">
    <span class="search-box__label">Pesquisar no catálogo</span>
    <span class="search-box__field">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <input
        v-model="model"
        type="search"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-label="ariaLabelText"
      />
      <button
        v-if="model"
        type="button"
        aria-label="Limpar busca"
        title="Limpar busca"
        @click="clearSearch"
      >
        ×
      </button>
    </span>
  </label>
</template>

<style scoped>
.search-box {
  display: grid;
  gap: 0.6rem;
}

.search-box__label {
  width: fit-content;
  border: 1px solid var(--line);
  background: var(--paper-raised);
  box-shadow: 3px 3px 0 color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--ink);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  padding: 0.38rem 0.52rem;
  text-transform: uppercase;
}

.search-box__field {
  display: grid;
  min-height: 58px;
  align-items: center;
  border: 1px solid var(--ink);
  background: var(--paper);
  grid-template-columns: auto 1fr auto;
  transition: box-shadow 220ms ease, transform 220ms ease;
}

.search-box__field:focus-within {
  box-shadow: 5px 5px 0 var(--accent);
  transform: translate(-2px, -2px);
}

svg {
  width: 18px;
  margin-left: 1rem;
  fill: none;
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-width: 1.8;
}

input {
  min-width: 0;
  height: 56px;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 0 0.9rem;
  color: var(--ink);
  font-size: 0.9rem;
}

input::placeholder {
  color: color-mix(in srgb, var(--muted) 72%, transparent);
}

input::-webkit-search-cancel-button {
  display: none;
}

button {
  width: 42px;
  height: 42px;
  margin-right: 0.4rem;
  cursor: pointer;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.25rem;
  transition: color 180ms ease;
}

button:hover {
  color: var(--accent);
}
</style>
